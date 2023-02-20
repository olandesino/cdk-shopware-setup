# Welcome a CDK TypeScript project for Shopware env setup

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands --- maybe not needed

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template


## AWS setup for shopware environment using cdk

![Screenshot](./docs/cdk%20ps.jpg)


## Structure:
* Stack is created in lib/stack/ 
* Constructs are defined in lib/constructs/
* Configuration (application version and runtime) are stored in lib/config/

## TODOs
* - hostname. Nothing defined so far. depends on client.
* - Email server (SES) depends on hostname/domain if it exsist alread or should be handled by aws route 53
* - Cloudfront. Is it needed? good for performance and good in case there is external cdn to get static content
