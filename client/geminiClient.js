const {
  VertexAI
} = require('@google-cloud/vertexai');
const {GoogleGenerativeAi} = require('@google/generative-ai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('dotenv').config();

const project = 'google-cloud';
const location = 'us-west3';
const pro = process.env.GEMINI_PRO;
const flash = process.env.GEMINI_PRO;
const visionModel = process.env.GEMINI_VISION;

function geminiFlashModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: flash,
    location,
    maxTokens: 2000,
    generationConfig: {maxOutputTokens: 256},
    systemInstruction: {
      role: 'system',
      parts: [{'text': 'General everyday business and development queries. Oh, and Laser engraving.'}]
    },
  });
  return model;
}


const vertexAI = new VertexAI({project: project, location: location});
vertexAI.getGenerativeModel({
  model: pro,
  maxTokens: 3048,
  generationConfig: {maxOutputTokens: 256},
  systemInstruction: {
    role: 'system',
    parts: [{'text': 'General everyday business and development queries. Oh, and Laser engraving.'}]
  },
});

/*
// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
  model: pro,
  // The following parameters are optional
  // They can also be passed to individual content generation requests
  maxTokens: 3048,
  generationConfig: {maxOutputTokens: 256},
  systemInstruction: {
    role: 'system',
    parts: [{'text': 'General everyday business and development queries. Oh, and Laser engraving.'}]
  },
});

const generativeVisionModel = vertexAI.getGenerativeModel({
  model: visionModel,
});

const generativeModelPreview = vertexAI.preview.getGenerativeModel({
  model: flash,
});
*/

module.exports = geminiFlashModel;