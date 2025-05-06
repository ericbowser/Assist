﻿const {OpenAI} = require("openai");
const config = require('dotenv').config();
const logger = require('../assistLog');
const ImageModel = require('../helpers/Types');

let _logger = logger();

let openAiClient = null;
let run = null;
let assistant = null;
let thread = null;

function InitialiseClient() {
  if (!openAiClient) {
    openAiClient = new OpenAI({
      project: config.parsed.OPENAI_PROJECT_ID,
      apiKey: config.parsed.OPENAI_API_KEY,
      model: config.parsed.OPENAI_REASONING_MODEL,
      organization: config.parsed.OPENAI_ORG,
      maxRetries: 3,
      verbose: true,
      max_tokens: 1000,
      timeout: 60000,
    });
    return openAiClient;
  } else {
    return openAiClient;
  }
}

async function AssistImage(question = '', size = '', model = '') {
  try {
    if (!openAiClient) {
      openAiClient = InitialiseClient();
    }
    const params = {
      prompt: question,
      model: model,
      n: model === ImageModel.Dalle_3 ? 1 : 4,
      size: size,
      response_format: 'b64_json',
      style: 'natural',
      quality: model === ImageModel.Dalle_3 ? 'hd' : 'standard',
      user: 'erbows_less__69'
    };
    const imageData = await openAiClient.images.generate(params, {timeout: 60000});
    _logger.info('Generated image for: ', {params, revised_prompt: imageData.data[0].revised_prompt});
    
    const data = {
      created: imageData.created,
      b64_json: imageData.data,
      thread: imageData._request_id,
    }

    return data;
  } catch (err) {
    console.error('error message', err);
    throw err;
  }
}

async function AssistMessage(question = '', history = [], instructions = '') {
  try {
    if (!assistant) {
      console.log('Creating assistant..');
      assistant = await openAiClient.beta.assistants.retrieve(config.parsed.OPENAI_ASSISTANT_ID, {timeout: 6000});
      console.log('Created assistant with id: ', assistant);
    }

    const openAiThreadId = config.parsed.OPENAI_API_THREAD_ID;
    if (!thread) {
      thread = await openAiClient.beta.threads.retrieve(openAiThreadId, {
        messages: [{
          role: 'user',
          content: question,

        }],
        tool_resources: {
          file_search: {
            vector_store_ids: ["vs_ym2nZJtNBInZxLF6oDUaBXD3"]
          }
        }
      });
    }

    if (!run) {
      run = await openAiClient.beta.threads.runs.create(openAiThreadId, {
        stream: false,
        assistant_id: assistant.id
      });
    } else {
      run = await openAiClient.beta.threads.runs
        .retrieve(openAiThreadId, run.id)
        .then(result => console.log(result))
        .catch(err => console.log(err));
      console.log('current run: ', run);
    }

  } catch (err) {
    console.error('error message', err);
    throw err;
  }
}

module.exports = {InitialiseClient, AssistMessage, AssistImage};