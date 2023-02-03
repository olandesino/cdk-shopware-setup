import * as cdk from 'aws-cdk-lib';
import {
  aws_iam as iam,
  aws_autoscaling as autoscaling,
  aws_ec2 as ec2,
  aws_logs as logs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_ecs as ecs
} from 'aws-cdk-lib';

import { RedisCluster } from '../lib/redis'
import { MariaDB } from '../lib/mariaDB';
import { OpenSearchNode } from '../lib/opensearch';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'Stack-vpc-ecs');

const envVar = new cdk.CfnParameter(stack, 'environment', {
  type: 'String',
  description: 'for tagging the environment'
});


// log stuff
const vpc_log_group = new logs.LogGroup(stack, 'log-vpc', {
  logGroupName: "/aws/vpc/flowlogs",
  retention: logs.RetentionDays.ONE_DAY
})

//VPC STUFF -----------------
const vpc = new ec2.Vpc(stack, 'AndreaVpc', {
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
  enableDnsHostnames: true,
  enableDnsSupport: true,
  defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
  maxAzs: 2,
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
  natGateways: 1,
  flowLogs: {
    'VPCFlowLog': {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(vpc_log_group),
      trafficType: ec2.FlowLogTrafficType.ALL,
    }
  }
})

// crate security groups
const sgLB = new ec2.SecurityGroup(stack, 'LBsg', { vpc, securityGroupName: 'lb-sg-name', description: 'description for lb sg' });
sgLB.connections.allowFromAnyIpv4(ec2.Port.tcp(8080), 'custom allow traffic from internet to port 80')

const sgEc2 = new ec2.SecurityGroup(stack, 'sgEc2', { vpc, securityGroupName: 'ec2-sg-name', description: 'description for ec2 sg' });
sgEc2.connections.allowFrom(sgLB, ec2.Port.tcp(8080), 'custom Allow traffic from LB')



// ECS STUFF -----------------
// Create a cluster and ec2
const cluster = new ecs.Cluster(stack, 'Shopware-cluster', { vpc });

cluster.connections.addSecurityGroup(sgEc2)

const asg = new autoscaling.AutoScalingGroup(stack, 'ASG', {
  vpc,
  instanceType: new ec2.InstanceType('t2.micro'),
  machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
  securityGroup: sgEc2,
});

// to login ssh from system manager - not needed later
asg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))

const capacityProvider = new ecs.AsgCapacityProvider(stack, 'ec2-AsgCapacityProvider', {
  autoScalingGroup: asg,
});

cluster.addAsgCapacityProvider(capacityProvider)

// log stuff
const ecsLogs = new ecs.AwsLogDriver(
  {
    streamPrefix: "ecs-prefix",
    logGroup: new logs.LogGroup(stack, 'log-ecs', {
      logGroupName: "/aws/ecs/log",
      retention: logs.RetentionDays.ONE_DAY
    })
  }
)



const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'Shopware-backend-task', {
  //required apparently to add specific custom sg
  networkMode: ecs.NetworkMode.AWS_VPC,
});
const container = taskDefinition.addContainer('container-sw', {
  image: ecs.ContainerImage.fromRegistry("httpd"),
  memoryLimitMiB: 256,
  logging: ecsLogs
});

container.addPortMappings({
  containerPort: 80,
});

var ecsSg = []
ecsSg.push(sgEc2)
// Create Service
const service = new ecs.Ec2Service(stack, "SW-service", {
  cluster,
  taskDefinition,
  securityGroups: ecsSg
});


// LOAD BALANCER -----------
// Create ALB
const lb = new elbv2.ApplicationLoadBalancer(stack, 'ALB', {
  vpc,
  internetFacing: true,
  securityGroup: sgLB
});

const listener = lb.addListener('PublicListener', { port: 80, open: true });

// Attach ALB to ECS Service
listener.addTargets('ECS', {
  port: 8080,
  targets: [service.loadBalancerTarget({
    containerName: 'container-sw',
    containerPort: 80
  })],
  // include health check (default is none)
  healthCheck: {
    interval: cdk.Duration.seconds(60),
    path: "/health",
    timeout: cdk.Duration.seconds(5),
  }
});


// CALLING COMPONENTS

// MARIADB
new MariaDB(app, 'Stack-mariaDB', {
  env: { region: "eu-central-1" }, description: "Big Stack and mysql",
  vpc: vpc,
  dbName: "sampledb",
  sgEc2: sgEc2,
  envVar: envVar.valueAsString
});

// REDIS
new RedisCluster(app, 'Redis', {
  vpc: vpc,
  sgEc2: sgEc2
});

// OPENSEARCH 
new OpenSearchNode(app, 'opensearch-stack', {
  vpc: vpc,
  sgEc2: sgEc2,
  asgRoleArn: asg.role.grantPrincipal
});



new cdk.CfnOutput(stack, 'LoadBalancerDNS', { value: lb.loadBalancerDnsName, });
new cdk.CfnOutput(stack, 'asg.role.roleArn', { value: asg.role.roleArn, });
// TAGGING
cdk.Tags.of(vpc).add('env', envVar.valueAsString)
cdk.Tags.of(cluster).add('env', envVar.valueAsString)
cdk.Tags.of(taskDefinition).add('env', envVar.valueAsString)
cdk.Tags.of(service).add('env', envVar.valueAsString)
cdk.Tags.of(lb).add('env', envVar.valueAsString)
app.synth();