/*const {
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
});*/
// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START generativeaionvertexai_gemini_generate_from_text_input]
const {VertexAI} = require('@google-cloud/vertexai');

/**
 * TODO(developer): Update these variables before running the sample.
 */
async function generate_from_text_input(projectId = 'PROJECT_ID') {
    const vertexAI = new VertexAI({project: projectId, location: 'us-central1'});

    const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-1.5-flash-001',
    });

    const prompt =
      "What's a good name for a flower shop that specializes in selling bouquets of dried flowers?";

    const resp = await generativeModel.generateContent(prompt);
    const contentResponse = await resp.response;
    console.log(JSON.stringify(contentResponse));
}
// [END generativeaionvertexai_gemini_generate_from_text_input]

generate_from_text_input(...process.argv.slice(2)).catch(err => {
    console.error(err.message);
    process.exitCode = 1;
});