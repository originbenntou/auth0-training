import * as cdk from 'aws-cdk-lib'
import { type Construct } from 'constructs'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from '@aws-cdk/aws-sns-subscriptions'
import * as ses from 'aws-cdk-lib/aws-ses'
import * as dotenv from 'dotenv'

dotenv.config()
const domain = process.env.DOMAIN ? process.env.DOMAIN : ''

export class SnsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SesProps) {
    super(scope, id, props)
  }

  emailSubscription = new subscriptions.EmailSubscription('originbenntou8973@gmail.com')
  topic = new sns.Topic(this, 'SESNotificationTopic').addSubscription(emailSubscription)
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
  domain,
})

new SesStack(app, 'SesStack', {
  domain,
})

app.synth()
