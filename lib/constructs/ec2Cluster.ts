import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
  aws_autoscaling as autoscaling,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_elasticloadbalancingv2 as elbv2,
  aws_ecs as ecs,
} from 'aws-cdk-lib';

export interface Ec2Props {

    /**
     * VPC
     * @type {*}
     * @memberof Ec2Cluster
     */
    readonly vpc: any;

}

export class Ec2Cluster extends Construct {
    public asg : autoscaling.AutoScalingGroup
    public sgEc2: ec2.SecurityGroup
    public lb : elbv2.ApplicationLoadBalancer
    
    constructor(scope: Construct, id: string, props: Ec2Props) {
        super(scope, id);
       
        // SECURITY GROUPS
        const sgLB = new ec2.SecurityGroup(this, 'sgLB', { 
            vpc: props.vpc , 
            securityGroupName: 'lb-sg', 
        });
        this.sgEc2 = new ec2.SecurityGroup(this, 'sgEc2', { 
            vpc: props.vpc, 
            securityGroupName: 'ec2-sg', 
        });
        
        // AUTOSCALINGGROUP -----------
        this.asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
            vpc: props.vpc,
            instanceType: new ec2.InstanceType ('t2.micro'),
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            securityGroup: this.sgEc2,
        });
        this.asg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))


        // LOAD BALANCER -----------
        this.lb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc: props.vpc,
            internetFacing: true,
            securityGroup: sgLB,
        });
        new cdk.CfnOutput(this, 'loadBalancer dns', { value: this.lb.loadBalancerDnsName, });
    }
}
