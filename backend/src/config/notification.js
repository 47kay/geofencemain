module.exports = {
    email: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      from: process.env.EMAIL_FROM
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        username: process.env.TWILIO_USERNAME
      },
    firebase: {
      serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    },
    pusher: {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL
    },
    sms: {
      provider: process.env.SMS_PROVIDER,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
      nexmoApiKey: process.env.NEXMO_API_KEY,
      nexmoApiSecret: process.env.NEXMO_API_SECRET,
      nexmoPhoneNumber: process.env.NEXMO_PHONE_NUMBER
    },
    push: {
      fcmServerKey: process.env.FCM_SERVER_KEY,
      apnKeyId: process.env.APN_KEY_ID,
      apnTeamId: process.env.APN_TEAM_ID,
      apnTopicArn: process.env.APN_TOPIC_ARN,
      apnPrivateKey: process.env.APN_PRIVATE_KEY
    },
    webhook: {
      url: process.env.WEBHOOK_URL,
      authToken: process.env.WEBHOOK_AUTH_TOKEN
    }
  };