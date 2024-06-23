﻿const nodemailer = require('nodemailer');
const config = require('dotenv').config();

async function sendEmailWithAttachment(from, subject, message) {
    const transporter = await nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: 'ericryanbowser@gmail.com',
            pass: config.parsed.GMAIL_APP_PASSWORD,
        },
    });
    const info = await transporter.sendMail({
        from: from,
        to: 'ericryanbowser@gmail.com',
        subject: subject,
        text: message,
        html: `<p>${message}</p>` 
    });
    console.log("Message sent: %s", info.messageId);
    return info;
}

module.exports = sendEmailWithAttachment;
