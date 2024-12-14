const {OpenAI} = require("openai");
const config = require('dotenv').config();

let openAiClient = null;
let run = null;
let assistant = null;
let thread = null;

function InitialiseClient() {
  if (!openAiClient) {
    openAiClient = new OpenAI({
      version: "v2",
      model: "gpt-4o-mini",
      project: config.parsed.OPENAI_PROJECT_ID,
      apiKey: config.parsed.OPENAI_API_KEY,
      organization: config.parsed.OPENAI_ORG,
      maxRetries: 3,
      verbose: true,
      timeout: 60000,
    });
    return openAiClient;
  } else {
    return openAiClient;
  }
}

async function AssistMessage(question = '', history = [], instructions = '') {
  try {
    if (!assistant) {
      console.log('Creating assistant..');
      assistant = await openAiClient.beta.assistants.retrieve(config.parsed.OPENAI_ASSISTANT_ID, {timeout: 6000});
      console.log('Created assistant with id: ', assistant);
    }

    const messages = history.map((item) => {
      return [
        {
          role: 'assistant',
          content: item.answer
        },
        {
          role: 'user',
          content: item.question
        }
      ]
    });
    console.log('messages: ', messages);
    const openAiThreadId = config.parsed.OPENAI_API_THREAD_ID;
    if (!thread) {
      thread = await openAiClient.beta.threads.retrieve(openAiThreadId, {
        messages: messages,
        tool_resources:
          {
            file_search: {
              vector_store_ids: ["vs_ym2nZJtNBInZxLF6oDUaBXD3"]
            }
          }
      });
    }

    if (!run) {
      console.log(run);
      run = await openAiClient.beta.threads.runs.create(openAiThreadId, {
        stream: false,
        assistant_id: assistant.id
      });
    } else {
      console.log(run);
      run = await openAiClient.beta.threads.runs.retrieve(openAiThreadId, run.id, {
        stream: false,
        assistant_id: assistant.id
      });
      await run.status;
    }

    const status = await openAiClient.beta.runs.
    console.log('poll: ', status);
    if(status.status === 'queued'){
      console.log('queued..')
    }else {
      console.log(status.status);
    }
  } catch
    (err) {
    console.error('error message', err);
  }
}

module.exports = {InitialiseClient, AssistMessage};