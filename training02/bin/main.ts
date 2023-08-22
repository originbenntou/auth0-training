import * as cdk from 'aws-cdk-lib'
import {
  aws_logs as logs,
  aws_sns as sns,
  aws_sns_subscriptions as subscription,
  aws_ses as ses,
  aws_lambda as lambda,
  aws_iam as iam,
} from 'aws-cdk-lib'
import * as dotenv from 'dotenv'

dotenv.config()
const snsToEmail = process.env.SNS_TO_EMAIL ? process.env.SNS_TO_EMAIL : ''
const domain = process.env.DOMAIN ? process.env.DOMAIN : ''

interface MessagingProps extends cdk.StackProps {
  domain: string
  to: string
}

export class MessagingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: MessagingProps) {
    super(scope, id, props)

    // CloudWatchLogs

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: 'SESNotification',
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    const logStream = new logs.LogStream(this, 'LogStream', {
      logGroup: logGroup,
      logStreamName: 'SESNotificationStream',
    })

    // Lambda
    const logFunction = new lambda.Function(this, 'LogFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      functionName: cdk.PhysicalName.GENERATE_IF_NEEDED,
    })
    logFunction.addToRolePolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      }),
    )

    // SNS
    // const emailSubscription = new subscription.EmailSubscription(props.to)
    const lambdaSubscription = new subscription.LambdaSubscription(logFunction)
    const topic = new sns.Topic(this, 'Topic')
    // topic.addSubscription(emailSubscription)
    topic.addSubscription(lambdaSubscription)

    // SES
    const configurationSet = new ses.ConfigurationSet(this, 'ConfigurationSet', {})
    configurationSet.addEventDestination('EventDestination', {
      destination: ses.EventDestination.snsTopic(topic),
      enabled: true,
      events: [
        ses.EmailSendingEvent.DELIVERY,
        ses.EmailSendingEvent.BOUNCE,
        ses.EmailSendingEvent.COMPLAINT,
        ses.EmailSendingEvent.OPEN,
      ],
    })
    new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.domain(props.domain),
      configurationSet,
    })
  }
}

const app = new cdk.App()

new MessagingStack(app, 'MessagingStack', {
  domain: domain,
  to: snsToEmail,
})

app.synth()
