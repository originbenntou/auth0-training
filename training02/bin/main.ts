import {
  App,
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  aws_logs as logs,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cloudwatch_action,
  aws_chatbot as chatbot,
  aws_sns as sns,
  aws_sns_subscriptions as subscription,
  aws_ses as ses,
  aws_lambda as lambda,
  aws_iam as iam,
} from 'aws-cdk-lib'
import * as dotenv from 'dotenv'

dotenv.config()
const accountId = process.env.AWS_ACCOUNT_ID ? process.env.AWS_ACCOUNT_ID : ''
const domain = process.env.FROM_DOMAIN ? process.env.FROM_DOMAIN : ''
const workspace = process.env.SLACK_WORKSPACE ? process.env.SLACK_WORKSPACE : ''
const channel = process.env.SLACK_CHANNEL ? process.env.SLACK_CHANNEL : ''

interface SESMonitorProps extends StackProps {
  domain: string
  accountId: string
  workspace: string
  channel: string
}

export class SESMonitorStack extends Stack {
  constructor(scope: App, id: string, props: SESMonitorProps) {
    super(scope, id, props)

    /**********************
     * Lambda
     **********************/
    // CloudWatchLogsへログをPutするLambdaFunction
    const emailDeliveryLambda = new lambda.Function(this, 'EmailDeliveryLambda', {
      functionName: 'EmailDeliveryLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
    })
    emailDeliveryLambda.addToRolePolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      }),
    )

    /**********************
     * SNS
     **********************/
    // メール配信イベントの送信先SNS
    const emailDeliveryTopic = new sns.Topic(this, 'EmailDeliveryTopic', {
      topicName: 'EmailDeliveryTopic',
    })
    emailDeliveryTopic.addSubscription(new subscription.LambdaSubscription(emailDeliveryLambda))

    // メトリクスアラームの送信先SNS
    const metricsAlarmTopic = new sns.Topic(this, 'MetricsAlarmTopic', {
      topicName: 'MetricsAlarmTopic',
    })
    // CloudWatchからSNSへPublishする許可
    metricsAlarmTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchSNSPublishingPermissions',
        actions: ['SNS:Publish'],
        resources: [metricsAlarmTopic.topicArn],
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudwatch.amazonaws.com')],
      }),
    )
    // ResourceOwnerがPublishする許可
    metricsAlarmTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'OwnerPublishPermission',
        actions: [
          'SNS:GetTopicAttributes',
          'SNS:SetTopicAttributes',
          'SNS:AddPermission',
          'SNS:RemovePermission',
          'SNS:DeleteTopic',
          'SNS:Subscribe',
          'SNS:ListSubscriptionsByTopic',
          'SNS:Publish',
          'SNS:Receive',
        ],
        resources: [metricsAlarmTopic.topicArn],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        conditions: {
          StringEquals: {
            'AWS:SourceOwner': props.accountId,
          },
        },
      }),
    )

    /**********************
     * Chatbot
     **********************/
    // Chatbotのロール
    const chatbotRole = new iam.Role(this, 'ChatbotRole', {
      roleName: 'ChatbotRole',
      assumedBy: new iam.ServicePrincipal('chatbot.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsReadOnlyAccess')],
    })
    chatbotRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['cloudwatch:Describe*', 'cloudwatch:Get*', 'cloudwatch:List*'],
      }),
    )

    // メトリクスアラームの送信先Chatbot
    new chatbot.SlackChannelConfiguration(this, 'EmailDeliverySlackChannelConfig', {
      slackChannelConfigurationName: 'EmailDeliverySlackChannelConfig',
      slackWorkspaceId: props.workspace,
      slackChannelId: props.channel,
      notificationTopics: [metricsAlarmTopic],
      guardrailPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsReadOnlyAccess'),
      ],
      role: chatbotRole,
    })

    /**********************
     * SES
     **********************/
    // メール配信イベント設定
    const emailDeliveryConfigurationSet = new ses.ConfigurationSet(
      this,
      'EmailDeliveryConfigurationSet',
      {
        configurationSetName: 'EmailDeliveryConfigurationSet',
      },
    )
    emailDeliveryConfigurationSet.addEventDestination('EmailDeliveryEventDestination', {
      configurationSetEventDestinationName: 'EmailDeliveryEventDestination',
      destination: ses.EventDestination.snsTopic(emailDeliveryTopic),
      enabled: true,
      events: [
        ses.EmailSendingEvent.DELIVERY, // 配信
        ses.EmailSendingEvent.OPEN, // 開封
        ses.EmailSendingEvent.BOUNCE, // バウンス
        ses.EmailSendingEvent.COMPLAINT, // 苦情
      ],
    })

    // SESのドメイン登録とメール配信イベント設定の紐づけ
    new ses.EmailIdentity(this, 'EmailDeliveryIdentity', {
      identity: ses.Identity.domain(props.domain),
      configurationSet: emailDeliveryConfigurationSet,
    })

    /**********************
     * CloudWatch Logs
     **********************/
    // ロググループ・ログストリーム作成
    const emailDeliveryLogGroup = new logs.LogGroup(this, 'EmailDeliveryLogGroup', {
      logGroupName: '/aws/lambda/emailDeliveryLogGroup', // LogGroup
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    new logs.LogStream(this, 'EmailDeliveryLogStream', {
      logGroup: emailDeliveryLogGroup,
      logStreamName: 'emailDeliveryLogStream', // LogStream
    })

    /**********************
     * CloudWatch Metrics Filter
     **********************/
    // バウンスのメトリクスフィルタ
    const bounceMetricFilter = new logs.MetricFilter(this, 'BounceMetricFilter', {
      logGroup: emailDeliveryLogGroup,
      metricNamespace: 'EmailDelivery',
      metricName: 'BounceCount',
      filterPattern: logs.FilterPattern.literal('Bounce'),
      metricValue: '1',
    })

    // 苦情のメトリクスフィルタ
    const complaintMetricFilter = new logs.MetricFilter(this, 'ComplaintMetricFilter', {
      logGroup: emailDeliveryLogGroup,
      metricNamespace: 'EmailDelivery',
      metricName: 'ComplaintCount',
      filterPattern: logs.FilterPattern.literal('Complaint'),
      metricValue: '1',
    })

    /**********************
     * CloudWatch Metrics Alarm
     **********************/
    // バウンスのアラーム
    const bounceAlarm = new cloudwatch.Alarm(this, 'BounceAlarm', {
      metric: bounceMetricFilter.metric({ period: Duration.minutes(5), statistic: 'Sum' }),
      evaluationPeriods: 1,
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      actionsEnabled: true,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    bounceAlarm.addAlarmAction(new cloudwatch_action.SnsAction(metricsAlarmTopic))

    // 苦情のアラーム
    const complaintAlarm = new cloudwatch.Alarm(this, 'ComplaintAlarm', {
      metric: complaintMetricFilter.metric({ period: Duration.minutes(5), statistic: 'Sum' }),
      evaluationPeriods: 1,
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      actionsEnabled: true,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    complaintAlarm.addAlarmAction(new cloudwatch_action.SnsAction(metricsAlarmTopic))
  }
}

const app = new App()

new SESMonitorStack(app, 'SESMonitorStack', {
  domain,
  accountId,
  workspace,
  channel,
})

app.synth()
