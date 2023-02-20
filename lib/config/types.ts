export interface EnvironmentConfig {
  env: {
    account: string;
    region: string;
  };
  stageName: string;
  dbName: string;
  dbInstanceId: string,
  redisName: string;
  cidr: string;
  ec2InstanceType: string
  cacheNodeType: string
  dbInstanceType: string
  dbRemovalPolicy: any
  searchInstanceType: string
}

export const enum Region {
  frankfurt = 'eu-central-1',
}

export const enum Stage {
  featureDev = 'featureDev',
  dev = 'dev',
  staging = 'staging',
  prod = 'prod',
}

export const enum Account {
  development = '11111111111',
  prod = '33333333333',
}