import * as rds from 'aws-cdk-lib/aws-rds'

//should not change per environemnt
export const dbEngineVersion = rds.MariaDbEngineVersion.VER_10_6_8
export const cacheEngineVersion = '7.0'
export const searchEngineVersion = '2.3'