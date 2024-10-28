const {
    FunctionDeclarationSchemaType,
    HarmBlockThreshold,
    HarmCategory,
    VertexAI
} = require('@google-cloud/vertexai');
const {GoogleGenerativeAi} = require('@google/generative-ai');

const project = 'google-cloud';
const location = 'us-west3';
const textModel =  'gemini-1.0-pro';
const visionModel = 'gemini-1.0-pro-vision';

const vertexAI = new VertexAI({project: project, location: location});

// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
    model: textModel,
    // The following parameters are optional
    // They can also be passed to individual content generation requests
    safetySettings: [{category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE}],
    generationConfig: {maxOutputTokens: 256},
    systemInstruction: {
        role: 'system',
        parts: [{"text": `For example, you are a helpful customer service agent.`}]
    },
});

const generativeVisionModel = vertexAI.getGenerativeModel({
    model: visionModel,
});

const generativeModelPreview = vertexAI.preview.getGenerativeModel({
    model: textModel,
});