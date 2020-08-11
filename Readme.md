# POC for infra setup

This project uses [Pulumi](https://www.pulumi.com/) to manage Infrastructure as a Code

## Structure

`index.ts` file declares the using TypeScript the EKS cluster and the services deployed in that cluster

 The `manifests` directory contains the Kubernetes manifests in YAML  represents the services it will be deployed in the cluster. Pulumi doesn't use them. They only exist to guide the people who aren't familiar with Pulumi but know how to read the YAML manifests 

## Experiment in your AWS account

### Prerequisites

1. [Get Started with Kubernetes on Pulumi](https://www.pulumi.com/docs/get-started/kubernetes/)

### Steps

After cloning this repo, from this working directory, run these commands:

1. Install the required Node.js packages:

    ```bash
    $ npm install
    ```

2. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init
    ```

3. Update the stack.

    ```bash
    $ pulumi up
    ```
   
4. Once you've finished experimenting, tear down your stack's resources by destroying and removing it:

    ```bash
    $ pulumi destroy --yes
    $ pulumi stack rm --yes
    ```