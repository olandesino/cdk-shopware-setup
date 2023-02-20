import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface RedisProps {

    readonly sgEc2: any;
    readonly vpc: ec2.Vpc;
    readonly stageName: string
    readonly cacheNodeType: string
    readonly cacheEngineVersion: string
    readonly redisName: string

}

export class RedisCluster extends Construct {
    constructor(scope: Construct, id: string, props: RedisProps) {
        super(scope, id);

        const targetVpc = props.vpc;

        const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
            description: 'redis subnet group description',
            subnetIds: targetVpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,

            // the properties below are optional
            cacheSubnetGroupName: `${props.stageName}-RedisSubnetGroupName`,
        });

        // The security group that defines network level access to the cluster
        const sgRedis = new ec2.SecurityGroup(this, `redis-security-group`, {
            vpc: targetVpc,
            allowAllOutbound: true,
            description: "Security group for the redis cluster",
            securityGroupName: `${props.stageName}-sgRedis`
        });
        sgRedis.connections.allowFrom(props.sgEc2, ec2.Port.tcp(6379), 'allow from ec2 sg')


        // LOG stuff
       const redisLog = new logs.LogGroup(this, "RedisLogs", 
       {
        logGroupName:  `${props.stageName}/aws/redis/slow-logs`,
        removalPolicy: RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY
       });

        // The cluster resource itself.
        const redisCluster = new elasticache.CfnCacheCluster(this, props.redisName, {
            cacheNodeType: props.cacheNodeType,
            engine: 'redis',
            numCacheNodes: 1,
            cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName,
            vpcSecurityGroupIds: [
                sgRedis.securityGroupId
            ],
            engineVersion: props.cacheEngineVersion,
            logDeliveryConfigurations: [{
                destinationDetails: {
                  cloudWatchLogsDetails: {
                    logGroup:  redisLog.logGroupName,
                  },
                },
                destinationType: 'cloudwatch-logs',
                logFormat: 'json',
                logType: 'slow-log',
              }],
        });
        redisCluster.addDependency(redisSubnetGroup)


        // OUTPUTS
        new cdk.CfnOutput(this, `${props.stageName}-redisCacheEndpointUrl`, {
            value: redisCluster.attrRedisEndpointAddress,
        });
        new cdk.CfnOutput(this, `${props.stageName}-redisCachePort`, {
            value: redisCluster.attrRedisEndpointPort,
        });
        cdk.Tags.of(redisCluster).add('env',props.stageName, {
            priority: 300,
        });
        //   const redisReplication = new CfnReplicationGroup(
        //     this,
        //     `RedisReplicaGroup`,
        //     {
        //       engine: "redis",
        //       cacheNodeType: "cache.m5.xlarge",
        //       replicasPerNodeGroup: 1,
        //       numNodeGroups: 3,
        //       automaticFailoverEnabled: true,
        //       autoMinorVersionUpgrade: true,
        //       replicationGroupDescription: "cluster redis di produzione",
        //       cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName
        //     }
        //   );
        //   redisReplication.addDependsOn(redisSubnetGroup);

    }
}