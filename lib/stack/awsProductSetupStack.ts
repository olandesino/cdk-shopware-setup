import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Ec2Cluster } from '../constructs/ec2Cluster';
import { CustomVpc } from '../constructs/vpc'
import { RedisCluster } from '../constructs/redis'
import { OpenSearchNode } from '../constructs/opensearch';
import { MariaDB } from '../constructs/mariaDB';
import { ContainerCluster } from '../constructs/containerCluster';

export interface CustomStackProps extends cdk.StackProps {
  readonly stageName : string
  readonly dbEngineVersion : any
  readonly cidr: string
  readonly ec2InstanceType: string
  readonly cacheNodeType: string
  readonly redisName: string
  readonly cacheEngineVersion: string
  readonly dbName: string
  readonly dbInstanceId: string
  readonly dbRemovalPolicy: cdk.RemovalPolicy
  readonly dbInstanceType: string
  readonly searchEngineVersion: string
  readonly searchInstanceType: string
}


export class AwsProductSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CustomStackProps) {
    super(scope, id, props);

    const newVpc = new CustomVpc(this, 'VpcConstruct', {
      cidr : props.cidr,
      stageName : props.stageName
    })

    const ec2Cluster = new Ec2Cluster(this, 'Ec2ClusterConstruct', { 
      vpc: newVpc.vpc,
      stageName: props.stageName,
      ec2InstanceType: props.ec2InstanceType
    })

    new RedisCluster(this, 'RedisConstruct', {
      vpc: newVpc.vpc,
      sgEc2: ec2Cluster.sgEc2,
      redisName: props.redisName,
      stageName: props.stageName,
      cacheNodeType: props.cacheNodeType,
      cacheEngineVersion: props.cacheEngineVersion
    })

    new MariaDB(this, 'MariaConstruct', {
      vpc: newVpc.vpc,
      dbName: props.dbName,
      dbInstanceId: props.dbInstanceId,
      sgEc2: ec2Cluster.sgEc2,
      engineVersion: props.dbEngineVersion,
      stageName: props.stageName,
      dbInstanceType: props.dbInstanceType,
      dbRemovalPolicy: props.dbRemovalPolicy
    })

    // // testing purposes save costs comment opensearch
    new OpenSearchNode(this, 'OpenSearchConstruct', {
      vpc: newVpc.vpc,
      sgEc2: ec2Cluster.sgEc2,
      asgRoleArn: ec2Cluster.asg.role.roleArn,
      stageName: props.stageName,
      searchEngineVersion: props.searchEngineVersion,
      searchInstanceType: props.searchInstanceType
    })

    new ContainerCluster(this, 'EcsConstruct', {
      vpc: newVpc.vpc,
      sgEc2: ec2Cluster.sgEc2,
      asg: ec2Cluster.asg,
      lb: ec2Cluster.lb,
      stageName: props.stageName,
    })
  }
}
