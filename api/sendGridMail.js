const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SEND_GRID_MAIL);

async function sendMail(to = '', from = 'laser@new-collar.space', subject = '', text = '', html = null) {
 try {
   const msg = {
     to: 'ericryanbowser@gmail.com', // Change to your recipient
     from: 'laser@new-collar.space', // Change to your verified sender
     subject: 'Sending with SendGrid is Fun',
     text: 'and easy to do anywhere, even with Node.js',
     html: '<strong>and easy to do anywhere, even with Node.js</strong>',
   }
   const response = await sgMail.send(msg)
   if (response) {
     console.log(response);
     return response;
   }
   
   return null;
 } catch(err) {
   console.error(err);
   throw err;
 }
}

module.exports = sendMail;