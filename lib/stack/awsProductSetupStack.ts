import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds'
import { Construct } from 'constructs';
import { Ec2Cluster } from '../constructs/ec2Cluster';
import { CustomVpc } from '../constructs/vpc'
import { RedisCluster } from '../constructs/redis'
import { MariaDB } from '../constructs/mariaDB';
import { OpenSearchNode } from '../constructs/opensearch';
import { ContainerCluster } from '../constructs/containerCluster';

export class AwsProductSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const newVpc = new CustomVpc(this, 'VpcConstruct')

    const ec2Cluster = new Ec2Cluster(this, 'Ec2ClusterConstruct', { vpc: newVpc.vpc })

    new RedisCluster(this, 'RedisConstruct', {
      vpc: newVpc.vpc,
      sgEc2: ec2Cluster.sgEc2
    })

    new MariaDB(this, 'MariaConstruct', {
      vpc: newVpc.vpc,
      dbName: this.node.tryGetContext('dbName'),
      sgEc2: ec2Cluster.sgEc2,
      engineVersion: rds.MariaDbEngineVersion.VER_10_6_8,
    })

    // testing purposes save costs comment opensearch
    new OpenSearchNode(this, 'OpenSearchConstruct', {
      vpc: newVpc.vpc,
      sgEc2: ec2Cluster.sgEc2,
      asgRoleArn: ec2Cluster.asg.role.roleArn
    })

    new ContainerCluster(this, 'EcsConstruct', {
      vpc: newVpc.vpc,
      sgEc2: ec2Cluster.sgEc2,
      asg: ec2Cluster.asg,
      lb: ec2Cluster.lb
    })
  }
}
