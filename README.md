# AWS setup for shopware environment using cdk

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Structure repository
* Stack is created in lib/stack/ 
* Constructs are defined in lib/constructs/
* Configurations (application version and runtime) are stored in lib/config/

## Execution
* The deployment can be triggered manually by gh action once the code is pushed .github/workflows/cdk.yml.
* For now, the configuration is set that it creates a dev environemnt. By changing the prefix in the gh action ((and run it) you could create automatically a new environment.

##  Infrastructure architecture diagram
![Screenshot](./docs/cdk%20ps.jpg)

## TODOs
* - hostname. Nothing defined so far. depends on client.
* - Email server (SES) depends on hostname/domain if it exsist alread or should be handled by aws route 53
* - Cloudfront. Is it needed? good for performance and good in case there is external cdn to get static content
