import * as ec2 from 'aws-cdk-lib/aws-ec2';
// import { Policy } from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs'
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CustomVpc extends Construct {
    public vpc: ec2.Vpc
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const vpcLoggroup = new logs.LogGroup(this, 'log-vpc', {
            logGroupName: "/aws/vpc/flowlogs_" + id,
            retention: logs.RetentionDays.ONE_DAY,
            removalPolicy: RemovalPolicy.DESTROY
        })

        this.vpc = new ec2.Vpc(this, 'AndreaVpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            enableDnsHostnames: true,
            enableDnsSupport: true,
            defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
            maxAzs: 2,
            // to save costs during developement - but still need to understand if it ok to create EIP
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'PublicSub',
                    subnetType: ec2.SubnetType.PUBLIC
                },
                {
                    cidrMask: 24,
                    name: 'PrivateSub - Application + DB',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
                }
            ],
            flowLogs: {
                'VPCFlowLog': {
                    destination: ec2.FlowLogDestination.toCloudWatchLogs(vpcLoggroup),
                    trafficType: ec2.FlowLogTrafficType.ALL,
                }
            }
        })

    }

}