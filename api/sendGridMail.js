const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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')
// sgMail.setDataResidency('eu'); 
// uncomment the above line if you are sending mail using a regional EU subuser

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