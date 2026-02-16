const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');

const project = 'google-cloud';
const location = 'us-west3';
const textModel = 'gemini-1.0-pro';
const visionModel = 'gemini-1.0-pro-vision';

let vertAI = null;
let genModel = null;

async function GenerateFromTextInput(content) {
  try {
    if (!vertAI) {
      vertAI = new VertexAI({
        googleAuthOptions: {
          projectId: 'gmail-send-426819',
          location: location,
        /*  credentials: {
            client_email: 'erb-gmail@gmail-send-426819.iam.gserviceaccount.com',
            private_key: '00b91c7fe7a65a99a42cf55931bf853a1093d4bf'
          }*/
        }
      });
      if (!genModel) {
        genModel = vertAI.getGenerativeModel({
          projectId: '',
          model: textModel,
          // The following parameters are optional
          // They can also be passed to individual content generation requests
          safetySettings: [{
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }],
          generationConfig: {maxOutputTokens: 256},
          systemInstruction: {
            role: 'system',
            parts: [{text: 'You are a helpful all round assistant on a variety of topics, mostly relating to development'}]
          },
        });
      }
      const resp = await genModel.generateContent(content);
      const contentResponse = await resp.response;
      return contentResponse;
    }
  } catch (exception) {
    console.error(exception);
    throw new Error(exception);
  }
}

module.exports = {GenerateFromTextInput}