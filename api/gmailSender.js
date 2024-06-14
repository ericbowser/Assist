import { GmailMailer } from 'gmail-node-mailer';

async function sendEmailWithAttachment() {
    const mailer = new GmailMailer();
    await mailer.initializeClient({
        gmailSenderEmail:'ericryanbowser@gmail.com',
/*
        gmailServiceAccountPath: './path/to/your-service-account.json',
*/
    });
   /* const attachments = [{
        filename: 'Invoice.pdf',
        mimeType: 'application/pdf',
        content: 'base64_encoded_content_here'
    }];*/

    await mailer.sendEmail({
        recipientEmail: 'customer@example.com',
        subject: 'Your Invoice',
        message: 'Please find attached your invoice.',
    });
}


