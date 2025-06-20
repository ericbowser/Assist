const nodemailer = require('nodemailer');
const config = require('dotenv').config();
const KEY_FILE_PATH = require('../auth/google_service_account.json');
const USER_EMAIL = 'laser@new-collar.space';
const GMAIL_API_VERSION = 'v1';
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
AIzaSyBEkiaGEeJk_DbOYZd1QUY32Judg-C0bIE
const auth = new GoogleAuth({
    apiKey: 'AIzaSyBEkiaGEeJk_DbOYZd1QUY32Judg-C0bIE',
    scopes: ['https://mail.google.com/'],
});
async function sendEmailWithAttachment(from, subject, message) {
    const gmail = google.gmail({ version: GMAIL_API_VERSION, auth });
    // Construct the email message (as a raw string)
    const rawMessage = createRawEmail(from, 'ericryanbowser@gmail.com', subject, message);

    // const info = await transporter.sendMail({
    //     from: from,
    //     to: 'ericryanbowser@gmail.com',
    //     subject: subject,
    //     text: message,
    //     html: `<p>${message}</p>`
    // });

    // Send the email
    const response = await gmail.users.messages.send({userId: 'ericryanbowser@gmail.com'}, 
      {
        requestBody: {
            raw: rawMessage,
        },
    });

    console.log('Email sent:', response.data);
    // const transporter = await nodemailer.createTransport({
    //     host: 'smtp.gmail.com',
    //     port: 587,
    //     auth: auth
    // });
 
    // console.log("Message sent: %s", info.messageId);
    // return info.messageId;
}
// Helper function to create the raw email message (Base64 encoded)
function createRawEmail(from, to, subject, message) {
    const emailText = `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `\r\n` + // Important: Add a blank line to separate headers from the body
      `${message}\r\n`;

    const encodedMessage = Buffer.from(emailText)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // Remove trailing equal signs

    return encodedMessage;
}
module.exports = sendEmailWithAttachment;
