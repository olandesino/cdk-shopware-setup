import * as cdk from 'aws-cdk-lib';
import { EbsDeviceVolumeType, SecurityGroup, Port } from 'aws-cdk-lib/aws-ec2'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';

export interface OsProps extends cdk.StackProps {

    readonly sgEc2: any;
    readonly vpc: any;
    readonly asgRoleArn: string;

}

export class OpenSearchNode extends Construct {
    constructor(scope: Construct, id: string, props: OsProps) {
        super(scope, id);
        const sgOS = new SecurityGroup(this, `os-security-group`, {
            vpc: props.vpc,
            description: "Security group for the open search",
            securityGroupName: 'sgOS' + id,
            allowAllOutbound: true
        });
        sgOS.connections.allowFrom(props.sgEc2, Port.allTcp(), 'custom request traffic from shopware')

        //add opensearch only in first private subnet (save costs)
        const onlyPrivateSubnet = []
        onlyPrivateSubnet.push(props.vpc.privateSubnets[0])

        // LOG stuff
        const { searchAppLog, slowSearchLog, slowIndexLog } = this.createLogGroups();



        const domain = new Domain(this, "OS-Domain", {
            version: EngineVersion.openSearch("2.3"),
            ebs: {
                enabled: true,
                volumeSize: 10,
                volumeType: EbsDeviceVolumeType.GP2
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            vpc: props.vpc,
            securityGroups: [sgOS],
            vpcSubnets: [{ subnets: onlyPrivateSubnet }],
            domainName: 'dev-search-node',
            enforceHttps: true,
            enableVersionUpgrade: true,
            logging: {
                appLogEnabled: true,
                appLogGroup: searchAppLog,
                slowSearchLogEnabled: true,
                slowSearchLogGroup: slowSearchLog,
                // perhaps this is not needed
                slowIndexLogEnabled: true,
                slowIndexLogGroup: slowIndexLog
            },
            capacity: {
                dataNodeInstanceType: "t3.small.search",
                dataNodes: 1,
                // masterNodeInstanceType: "c6g.large.elasticsearch",
                // masterNodes: 3
            },
            encryptionAtRest: {
                enabled: true,
            },
            nodeToNodeEncryption: true,
            // TODO:
            /* WHY EC2 CAN NOT ACCESS OS ? IT DOES REACH IT BUT THERE AREN'T ENOUGH PERMISSION TO LOGIN 
            (SHOULD NOT NEED CREDENTIALS AS I M USING EC2 ROLE ARN) ---- GIASSAAANTTAAAAAAA!!!!! */
            fineGrainedAccessControl: {
                masterUserArn: props.asgRoleArn
            }

            // zoneAwareness: {
            //     enabled: true
            // },
            // fineGrainedAccessControl: {
            //     masterUserName: 'master-andrea',
            //     masterUserPassword: cdk.SecretValue.unsafePlainText('Yo123456789!'),
            // },
            // accessPolicies: accessPolicies,


        });

        new cdk.CfnOutput(this, 'OS-endpoint', { value: domain.domainEndpoint })

    }

    private createLogGroups() {
        const searchAppLog = new logs.LogGroup(this, "searchAppLog",
            {
                logGroupName: "/aws/search/app-logs",
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: logs.RetentionDays.ONE_DAY
            });
        const slowSearchLog = new logs.LogGroup(this, "slowSearchLog",
            {
                logGroupName: "/aws/search/slow-logs",
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: logs.RetentionDays.ONE_DAY
            });
        const slowIndexLog = new logs.LogGroup(this, "slowIndexLog",
            {
                logGroupName: "/aws/search/slowIndex-logs",
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: logs.RetentionDays.ONE_DAY
            });
        return { searchAppLog, slowSearchLog, slowIndexLog };
    }
}