import * as cdk from 'aws-cdk-lib'
import { type Construct } from 'constructs'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk/aws-sns-subscriptions'
import * as ses from 'aws-cdk-lib/aws-ses'
import * as dotenv from 'dotenv'

dotenv.config()
const snsToEmail = process.env.SNS_TO_EMAIL ? process.env.SNS_TO_EMAIL : ''
const domain = process.env.DOMAIN ? process.env.DOMAIN : ''

interface SnsProps extends cdk.StackProps {
  to: string
}

export class SnsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SnsProps) {
    super(scope, id, props)

    const emailSubscription = new subscriptions.EmailSubscription(props.to)
    new sns.Topic(this, 'SESNotificationTopic').addSubscription(emailSubscription)
  }
}

interface SesProps extends cdk.StackProps {
  domain: string
}

export class SesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SesProps) {
    super(scope, id, props)

    new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.domain(props.domain),
    })
  }
}

const app = new cdk.App()

new SnsStack(app, 'SnsStack', {
  to: snsToEmail,
})

new SesStack(app, 'SesStack', {
  domain,
})

app.synth()
