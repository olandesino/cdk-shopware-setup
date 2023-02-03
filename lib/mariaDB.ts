import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface MysqlProps extends cdk.StackProps {

    /**
     * VPC
     * @type {string}
     * @memberof MysqlProps
     */
     readonly vpc?: any;

    /**
     * Security group needed
     * @type {*}
     * @memberof MysqlProps
     */
    readonly sgEc2?: any;
  
  
    /**
     * provide the name of the database
     * @type {string}
     * @memberof MysqlProps
     */
    readonly dbName?: string;
  
    /**
     * provide the version of the database
     * @type {string}}
     * @memberof props
     */
     readonly envVar: string;

    /**
     * provide the version of the database
     * @type {*}
     * @memberof MysqlProps
     * @default rds.MariaDbEngineVersion.VER_10_3
     */
    readonly engineVersion?: any;
  
    /**
     * user name of the database
     * @type {str}
     * @memberof MysqlProps
     * @default dbadmin
     */
    readonly mysqlUsername?: string;
  
    /**
     * backup retention days for example 14
     * @type {number}
     * @memberof MysqlProps
     * @default 14
     */
    readonly backupRetentionDays?: number;
  
    /**
     * backup window time 00:15-01:15
     * @type {string}
     * @memberof MysqlProps
     * @default 00:15-01:15
     */
  
    readonly backupWindow?: string;
  
    /**
     *
     * maintenance time Sun:23:45-Mon:00:15
     * @type {string}
     * @memberof MysqlProps
     * @default Sun:23:45-Mon:00:15
     */
    readonly preferredMaintenanceWindow?: string;
  
    /**
     *
     * list of ingress sources
     * @type {any []}
     * @memberof MysqlProps
     */
    readonly ingressSources?: any[];
  }
  
  
  export class MariaDB extends cdk.Stack {
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
      var engineVersion = rds.MariaDbEngineVersion.VER_10_3;
      if (typeof props.engineVersion !== 'undefined') {
        engineVersion = props.engineVersion;
      }

      const privateSubnets = props.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnets;
  
  
      const allAll = ec2.Port.allTraffic();
      const tcp3306 = ec2.Port.tcpRange(3306, 3306);

      //sg for db
      const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
        vpc: props.vpc,
        allowAllOutbound: true,
        description: 'SG-Database',
        securityGroupName: `SG-DB-${id}`,
      });
  
      //inbound rules
      dbsg.addIngressRule(dbsg, allAll, 'all from self');
      dbsg.connections.allowFrom(props.sgEc2, ec2.Port.tcp(3306), 'only custom Allow traffic from ec2')
      
      const mysqlConnectionPorts = [
        { port: tcp3306, description: 'tcp3306 Mysql' },
      ];
      
      for (let ingressSource of ingressSources!) {
        for (let c of mysqlConnectionPorts) {
          dbsg.addIngressRule(ingressSource, c.port, c.description);
        }
      }
  
      const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
        vpc: props.vpc,
        description: `db subnet group ${id}`,
        vpcSubnets: privateSubnets,
        subnetGroupName: `db-subnet-group-${id}`,
      });
  
      const mysqlSecret = new secretsmanager.Secret(this, 'MysqlCredentials', {
        secretName: props.dbName + 'MysqlCredentials',
        description: props.dbName + 'Mysql Database Crendetials',
        
        generateSecretString: {
          excludeCharacters: "\"@/\\ '",
          generateStringKey: 'password',
          passwordLength: 30, 
          secretStringTemplate: JSON.stringify({ username: mysqlUsername})
        },
      });
  
  
      const mysqlCredentials = rds.Credentials.fromSecret(
        mysqlSecret,
        mysqlUsername,
      );
  
      const dbParameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
        engine: rds.DatabaseInstanceEngine.mariaDb({
          version: engineVersion,
        }),
      });
  

      const mysqlInstance = new rds.DatabaseInstance(this, 'MariaDatabase', {
        databaseName: props.dbName,
        instanceIdentifier: props.dbName,
        credentials: mysqlCredentials,
        engine: rds.DatabaseInstanceEngine.mariaDb({
          version: engineVersion,
        }),
        backupRetention: cdk.Duration.days(7),
        allocatedStorage: 20,
        securityGroups: [dbsg],
        allowMajorVersionUpgrade: true,
        autoMinorVersionUpgrade: true,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        vpcSubnets: privateSubnets,
        vpc: props.vpc,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        // set encryption false for free tier
        storageEncrypted: false,
        monitoringInterval: cdk.Duration.seconds(60),
        enablePerformanceInsights: false,
        parameterGroup: dbParameterGroup,
        subnetGroup: dbSubnetGroup,
        preferredBackupWindow: props.backupWindow,
        preferredMaintenanceWindow: props.preferredMaintenanceWindow,
        publiclyAccessible: false,
        cloudwatchLogsExports : ["audit", "error", "general", "slowquery"]
      });
  
      mysqlInstance.addRotationSingleUser();
      // Tags
      cdk.Tags.of(mysqlInstance).add('Name', 'MysqlMariaTestDatabase', {
        priority: 300,
      });
  
  
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

      cdk.Tags.of(mysqlInstance).add('env', props.envVar)

    }
  
  }