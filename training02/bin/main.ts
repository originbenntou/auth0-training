import * as cdk from 'aws-cdk-lib'
import { aws_sns as sns, aws_sns_subscriptions as subscription, aws_ses as ses } from 'aws-cdk-lib'
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

    const emailSubscription = new subscription.EmailSubscription(props.to)
    const topic = new sns.Topic(this, 'Topic')
    topic.addSubscription(emailSubscription)

    const configurationSet = new ses.ConfigurationSet(this, 'ConfigurationSet', {})
    configurationSet.addEventDestination('EventDestination', {
      destination: ses.EventDestination.snsTopic(topic),
      enabled: true,
      events: [
        ses.EmailSendingEvent.BOUNCE,
        ses.EmailSendingEvent.COMPLAINT,
        ses.EmailSendingEvent.DELIVERY,
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
