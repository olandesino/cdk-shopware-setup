import * as cdk from 'aws-cdk-lib';
import {
    dbEngineVersion,
    cacheEngineVersion,
    searchEngineVersion
} from '../lib/config/app-versions'
import { environments } from '../lib/config/environment';
import { AwsProductSetupStack } from '../lib/stack/awsProductSetupStack'


const app = new cdk.App();
new AwsProductSetupStack(app, 'dev-AwsProductSetupStack', {
    terminationProtection: false,
    stageName: environments.dev.stageName,
    cidr: environments.dev.cidr,
    ec2InstanceType: environments.dev.ec2InstanceType,
    cacheNodeType: environments.dev.cacheNodeType,
    cacheEngineVersion: cacheEngineVersion,
    redisName: environments.dev.redisName,
    dbEngineVersion: dbEngineVersion,
    dbName: environments.dev.dbName,
    dbInstanceId: environments.dev.dbInstanceId,
    dbInstanceType: environments.dev.dbInstanceType,
    dbRemovalPolicy: environments.dev.dbRemovalPolicy,
    searchEngineVersion: searchEngineVersion,
    searchInstanceType: environments.dev.searchInstanceType
})
