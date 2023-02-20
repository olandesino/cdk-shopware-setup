import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface MysqlProps {

  readonly vpc: any;
  readonly sgEc2?: any;
  readonly dbName: string;
  readonly dbInstanceId: string;
  readonly envVar?: string;
  readonly preferredMaintenanceWindow?: string;
  readonly engineVersion: any;
  readonly stageName: string
  readonly mysqlUsername?: string;
  readonly backupRetentionDays?: number;
  readonly backupWindow?: string;
  readonly ingressSources?: any[];
  readonly dbInstanceType: string
  readonly dbRemovalPolicy: cdk.RemovalPolicy
}


export class MariaDB extends Construct {
  constructor(scope: Construct, id: string, props: MysqlProps) {
    super(scope, id);

    // default database username
    var mysqlUsername = "dbadmin";
    if (typeof props.mysqlUsername !== 'undefined') {
      mysqlUsername = props.mysqlUsername;
    }
    var ingressSources = [];
    if (typeof props.ingressSources !== 'undefined') {
      ingressSources = props.ingressSources;
    }
    const privateSubnets = props.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnets;

    // const allAll = ec2.Port.allTraffic();
    const tcp3306 = ec2.Port.tcpRange(3306, 3306);

    //sg for db
    const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: 'SG-Database',
      securityGroupName: `${props.stageName}-sgDB`,
    });

    //inbound rules
    // dbsg.addIngressRule(dbsg, allAll, 'all from self');  
    dbsg.connections.allowFrom(props.sgEc2, ec2.Port.tcp(3306), 'only custom Allow traffic from ec2')

    const mysqlConnectionPorts = [{
      port: tcp3306,
      description: 'tcp3306 Mysql'
    }];

    for (let ingressSource of ingressSources!) {
      for (let c of mysqlConnectionPorts) {
        dbsg.addIngressRule(ingressSource, c.port, c.description);
      }
    }

    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: props.vpc,
      description: `db subnet group ${id}`,
      vpcSubnets: privateSubnets,
      subnetGroupName: `${props.stageName}-db-subnet-group`,
    });

    const mysqlSecret = new secretsmanager.Secret(this, 'MysqlCredentials', {
      secretName: props.dbName + 'MysqlCredentials',
      description: props.dbName + 'Mysql Database Crendetials',

      generateSecretString: {
        excludeCharacters: "\"@/\\ '",
        generateStringKey: 'password',
        passwordLength: 30,
        secretStringTemplate: JSON.stringify({ username: mysqlUsername })
      },
    });


    const mysqlCredentials = rds.Credentials.fromSecret(
      mysqlSecret,
      mysqlUsername,
    );

    const dbParameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.mariaDb({
        version: props.engineVersion,
      }),
    });

    console.log("props.dbName " + props.dbName)
    const mysqlInstance = new rds.DatabaseInstance(this, 'MariaDatabase', {
      databaseName: props.dbName,
      instanceIdentifier: props.dbInstanceId,
      credentials: mysqlCredentials,
      engine: rds.DatabaseInstanceEngine.mariaDb({
        version: props.engineVersion,
      }),
      backupRetention: cdk.Duration.days(7),
      //this could be different per envs
      allocatedStorage: 20,
      securityGroups: [dbsg],
      allowMajorVersionUpgrade: true,
      autoMinorVersionUpgrade: true,
      instanceType: new ec2.InstanceType(props.dbInstanceType),
      vpcSubnets: privateSubnets,
      vpc: props.vpc,
      removalPolicy: props.dbRemovalPolicy,
      // set encryption false for free tier
      storageEncrypted: false,
      monitoringInterval: cdk.Duration.seconds(60),
      enablePerformanceInsights: false,
      parameterGroup: dbParameterGroup,
      subnetGroup: dbSubnetGroup,
      preferredBackupWindow: props.backupWindow,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      publiclyAccessible: false,
      cloudwatchLogsExports: ["audit", "error", "general", "slowquery"]
    });

    mysqlInstance.addRotationSingleUser();
    // Tags
    
    
    new cdk.CfnOutput(this, 'MysqlEndpoint', {
      exportName: 'MysqlEndPoint',
      value: mysqlInstance.dbInstanceEndpointAddress,
    });
    
    new cdk.CfnOutput(this, 'MysqlUserName', {
      exportName: 'MysqlUserName',
      value: mysqlUsername,
    });
    
    new cdk.CfnOutput(this, 'MysqlDbName', {
      exportName: 'MysqlDbName',
      value: props.dbName!,
    });

    cdk.Tags.of(mysqlInstance).add('stage', props.stageName)

  }

}