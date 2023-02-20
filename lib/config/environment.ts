import * as dotenv from 'dotenv';
import * as rds from 'aws-cdk-lib/aws-rds'
import * as cdk from 'aws-cdk-lib';

import {
    Account,
    EnvironmentConfig,
    Region,
    Stage,
} from './types';

dotenv.config();

export const environments: Record<Stage, EnvironmentConfig> = {
    // allow developers to spin up a quick branch for a given PR they are working on e.g. pr-124
    // this is done with an npm run develop, not through the pipeline, and uses the values in .env
    [Stage.featureDev]: {
        env: {
            account:
                process.env.ACCOUNT || (process.env.CDK_DEFAULT_ACCOUNT as string),
            region: process.env.REGION || (process.env.CDK_DEFAULT_REGION as string),
        },
        dbName: `${process.env.PR_NUMBER}_dbName`.toLowerCase(),
        dbInstanceId:  `${process.env.PR_NUMBER}-db-instance`,
        redisName: `${process.env.PR_NUMBER}-redis-customerName`.toLowerCase(),
        stageName: process.env.PR_NUMBER || Stage.featureDev,
        cidr: '10.0.0.0/16',
        ec2InstanceType: 't2.micro',
        cacheNodeType: 'cache.t2.micro',
        dbInstanceType : 't2.micro',
        dbRemovalPolicy: cdk.RemovalPolicy.DESTROY,
        searchInstanceType: 't3.small.search'
    },
    [Stage.dev]: {
        env: {
            account: Account.development,
            region: Region.frankfurt,
        },
        dbName: 'dev_db_customerName',
        dbInstanceId:  'dev-db-instance',
        redisName: 'dev-redis-customerName',
        stageName: Stage.dev,
        cidr: '11.0.0.0/16',
        ec2InstanceType: 't2.micro',
        cacheNodeType: 'cache.t2.micro',
        dbInstanceType : 't2.micro',
        dbRemovalPolicy: cdk.RemovalPolicy.DESTROY,
        searchInstanceType: 't3.small.search'
    },
    [Stage.staging]: {
        env: {
            account: Account.development,
            region: Region.frankfurt,
        },
        dbName: 'staging_db_customerName',
        dbInstanceId:  'staging-db-instance',
        redisName: 'staging-redis-customerName',
        stageName: Stage.staging,
        cidr: '12.0.0.0/16',
         //these should change
        ec2InstanceType: 't2.micro',
        cacheNodeType: 'cache.t2.micro',
        dbInstanceType : 't2.micro',
        dbRemovalPolicy: cdk.RemovalPolicy.DESTROY,
        searchInstanceType: 't3.small.search'
    },
    [Stage.prod]: {
        env: {
            account: Account.prod,
            region: Region.frankfurt,
        },
        dbName: 'prod_db_customerName',
        dbInstanceId:  'prod-db-instance',
        redisName: 'prod-redis-customerName',
        stageName: Stage.prod,
        cidr: '13.0.0.0/16',
        dbRemovalPolicy: cdk.RemovalPolicy.RETAIN,
        //these should change
        ec2InstanceType: 't2.micro',
        cacheNodeType: 'cache.t2.micro',
        dbInstanceType : 'm6i.xlarge',
        searchInstanceType: 't3.small.search',
    },
};
