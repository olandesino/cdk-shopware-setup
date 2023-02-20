import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import {
    aws_logs as logs,
    aws_ecs as ecs,
    RemovalPolicy,
    aws_ec2 as ec2,
} from 'aws-cdk-lib';

export interface EcsProps {

    /**
     * VPC
     * @type {*}
     * @memberof ContainerCluster
     */
    readonly vpc: any;

    /**
     * sgEc2
     * @type {*}
     * @memberof EcsCluster
     */
    readonly sgEc2: any;
    /**
    * asg
    * @type {*}
    * @memberof ContainerCluster
    */
    readonly asg: any;

    /**
     * listener
     * @type {*}
     * @memberof ContainerCluster
     */
    readonly lb: any;

    readonly stageName: string
}

export class ContainerCluster extends Construct {
    constructor(scope: Construct, id: string, props: EcsProps) {
        super(scope, id);

        const cluster = new ecs.Cluster(this, 'shopware-cluster', { vpc: props.vpc });
        cluster.connections.addSecurityGroup(props.sgEc2)

        const capacityProvider = new ecs.AsgCapacityProvider(this, 'asgCapacityProvider', {
            autoScalingGroup: props.asg,
            capacityProviderName: 'cluster-capacity-provider'
        });
        cluster.addAsgCapacityProvider(capacityProvider)

        // logs
        const ecsLogs = new ecs.AwsLogDriver(
            {
                streamPrefix: props.stageName,
                logGroup: new logs.LogGroup(this, 'log-ecs', {
                    logGroupName: "/aws/ecs/log" + id,
                    retention: logs.RetentionDays.ONE_DAY,
                    removalPolicy: RemovalPolicy.DESTROY
                })
            }
        )

        const taskDefinition = new ecs.Ec2TaskDefinition(this, 'shopware-backend-task', {
            //required apparently to add specific custom sg
            networkMode: ecs.NetworkMode.AWS_VPC,
        });
        const container = taskDefinition.addContainer('container-sw', {
            image: ecs.ContainerImage.fromRegistry("dockware/play:latest"),
            memoryLimitMiB: 256,
            logging: ecsLogs
        });
        container.addPortMappings({
            containerPort: 80,
        });
        // Create Service
        const service = new ecs.Ec2Service(this, `${props.stageName}-shopware-service`, {
            cluster,
            taskDefinition,
            securityGroups: [props.sgEc2]
        });

        props.lb.addListener('PublicListener', { port: 80, open: true }).
            addTargets(`${props.stageName}-ecsTarget`, {
                port: 8080,
                targets: [service.loadBalancerTarget({
                    containerName: container.containerName,
                    containerPort: 80
                })],
                // include health check (default is none)
                healthCheck: {
                    interval: cdk.Duration.seconds(60),
                    path: "/",
                    timeout: cdk.Duration.seconds(5),
                }
            });

        cdk.Tags.of(service).add('stage', props.stageName)
        cdk.Tags.of(cluster).add('stage', props.stageName)
        cdk.Tags.of(container).add('stage', props.stageName)
    }
}