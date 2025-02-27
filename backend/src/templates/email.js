// geofencing-app/backend/src/templates/email.js

const welcomeEmail = (name) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Welcome to Geofencing App</title>
    </head>
    <body>
      <h1>Welcome, ${name}!</h1>
      <p>Thank you for signing up for Geofencing App. We're excited to have you on board.</p>
      <p>You can now start using our app to create geofences, manage employees, and track their attendance.</p>
      <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
      <br>
      <p>Best regards,</p>
      <p>The Geofencing App Team</p>
    </body>
  </html>
`;

const resetPasswordEmail = (name, resetLink) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>Reset Your Password</title>
    </head>
    <body>
      <h1>Password Reset Request</h1>
      <p>Dear ${name},</p>
      <p>We received a request to reset your password for Geofencing App. To reset your password, please click the link below:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <br>
      <p>Best regards,</p>
      <p>The Geofencing App Team</p>
    </body>
  </html>
`;

module.exports = {
  welcomeEmail,
  resetPasswordEmail,
};