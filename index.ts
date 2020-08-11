// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

const projectName = "fogos-pt";
// Create a VPC for our cluster.
const vpc = new awsx.ec2.Vpc(`${projectName}-vpc-cluster`, {
  numberOfAvailabilityZones: 2,
});

// Create the EKS cluster itself and a deployment of the Kubernetes dashboard.
const cluster = new eks.Cluster(`${projectName}-cluster`, {
  vpcId: vpc.id,
  subnetIds: vpc.publicSubnetIds,
  instanceType: "t2.medium",
  desiredCapacity: 2,
  deployDashboard: false,
  version: "1.17",
  minSize: 2,
  maxSize: 3,
  enabledClusterLogTypes: ["api", "audit", "authenticator"],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const clusterAppNamespace = new k8s.core.v1.Namespace(
  projectName,
  {
    metadata: { name: "fogos-pt" },
  },
  { provider: cluster.provider }
);

//Create PVC for mongoDB

const pvcMongoDB = new k8s.core.v1.PersistentVolumeClaim(
  "mongodb-data",
  {
    metadata: {
      annotations: {
        //Skip the await logic for this PersistentVolumeClaim resource.
        "pulumi.com/skipAwait": "true",
      },
      name: "mongodb-data",
      namespace: clusterAppNamespace.metadata.name,
    },
    spec: {
      accessModes: ["ReadWriteOnce"],
      resources: {
        requests: {
          storage: "30Gi",
        },
      },
    },
  },
  { provider: cluster.provider, parent: clusterAppNamespace }
);

//Create MongoDB Deployment
const mongoAppName = "mongodb";
const mongoAppLabels = { app: mongoAppName };
const mongoAppPortName = "http";

const deploymentMongoDB = new k8s.apps.v1.Deployment(
  mongoAppName,
  {
    metadata: {
      labels: mongoAppLabels,
      namespace: clusterAppNamespace.metadata.name,
    },
    spec: {
      selector: {
        matchLabels: mongoAppLabels,
      },
      replicas: 1,
      template: {
        metadata: { labels: mongoAppLabels },
        spec: {
          containers: [
            {
              image: "mongo:4.0",
              name: "mongodb",
              volumeMounts: [{ name: "mongo-data", mountPath: "/data/db" }],
              ports: [
                {
                  name: mongoAppPortName,
                  containerPort: 27017,
                },
              ],
            },
          ],
          volumes: [
            {
              name: "mongo-data",
              persistentVolumeClaim: {
                claimName: pvcMongoDB.metadata.name,
              },
            },
          ],
        },
      },
    },
  },
  { parent: clusterAppNamespace, provider: cluster.provider }
);

//Create Service for MongoDB
const serviceMongoDB = new k8s.core.v1.Service(
  "mongodb",
  {
    metadata: {
      name: "mongodb",
      namespace: clusterAppNamespace.metadata.name,
    },
    spec: {
      type: "LoadBalancer",
      selector: mongoAppLabels,
      ports: [
        {
          name: "http",
          port: 27017,
          targetPort: mongoAppPortName,
        },
      ],
    },
  },
  {
    dependsOn: deploymentMongoDB,
    provider: cluster.provider,
    parent: clusterAppNamespace,
  }
);
