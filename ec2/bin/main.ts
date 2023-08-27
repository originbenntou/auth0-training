import {
  App,
  Stack,
  StackProps,
  aws_ec2 as ec2,
  aws_iam as iam,
} from 'aws-cdk-lib'


interface EC2CreateProps extends StackProps {
}

export class EC2CreateStack extends Stack {
  constructor(scope: App, id: string, props: EC2CreateProps) {
    super(scope, id, props)

    /* ****************
    * VPC
    **************** */
    const vpc = new ec2.Vpc(this, 'EC2CreateVpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      availabilityZones: ['ap-northeast-1a'],
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolate',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
    })

    const securityGroup = new ec2.SecurityGroup(this, 'EC2CreateSecurityGroup', {
      vpc: vpc,
    })

    const instanceRole = new iam.Role(this, 'EC2CreateInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore"
        ),
      ],
      description: 'cdk-vpc-ec2-instance-role',
    })

    /* ****************
    * EC2
    **************** */
    // new ec2.Instance(this, 'EC2CreatePublicInstance', {
    //   vpc,
    //   vpcSubnets: vpc.selectSubnets({
    //     subnetType: ec2.SubnetType.PUBLIC
    //   }),
    //   instanceType: new ec2.InstanceType('t2.micro'),
    //   machineImage: ec2.MachineImage.latestAmazonLinux2(),
    //   securityGroup: securityGroup,
    //   role: instanceRole,
    //   instanceName: 'EC2CreatePublic'
    // })

    new ec2.Instance(this, 'EC2CreatePrivateInstance', {
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }),
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: securityGroup,
      role: instanceRole,
      instanceName: 'EC2CreatePrivate'
    })

  }
}

const app = new App()

new EC2CreateStack(app, 'EC2CreateStack', {})

app.synth()
