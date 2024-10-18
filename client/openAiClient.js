const {OpenAI, ChatCompletionAssistantMessageParam} = require("openai");
const config = require('dotenv').config();

let openAiClient = null;

function initialiseClient() {
    return new OpenAI({
        apiVersion: "v2",
        project: config.parsed.OPENAI_PROJECT_ID,
        apiKey: config.parsed.OPENAI_API_KEY,
        organization: config.parsed.OPENAI_ORG,
        maxRetries: 3,
        verbose: true,
        timeout: 60000,
    });
}

async function InitialiseChat() {
    try {
        if (!openAiClient) {
            openAiClient = initialiseClient();
            return openAiClient;
        } else {
            console.log('client already initialized so just returning the one');
            return openAiClient;
        }
    } catch (err) {
        console.log('error: ', err);
        return err;
    }
}

async function InitialiseAssist(question = '', instructions = '') {
    try {
        if (!openAiClient) {
            openAiClient = initialiseClient();

            const assistant = await openAiClient.beta.assistants.retrieve(config.parsed.OPENAI_ASSISTANT_ID, {timeout: 6000});
            console.log('assistant tools', assistant.tools);

            const thread = await openAiClient.beta.threads.create({
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

            console.log('assistant thread', thread);
            const threadId = thread.id;

            let run = await openAiClient.beta.threads.runs.create(threadId, {
                stream: false,
                assistant_id: assistant.id
            });
            const runId = run.id;
            console.log('run status', run.status);
            if (run.status !== "completed") {
                if (run.status === "queued" || run.status === "in_progress") {
                    for (let i = 0; i < 13; i++) {
                        run = await openAiClient.beta.threads.runs.retrieve(threadId, runId);
                        if (run.status === 'queued' || run.status === 'in_progress') {
                            console.log('queued state, waiting..');
                            // Wait for retryInterval milliseconds before the next attempt
                            await new Promise(r => setTimeout(r, 1000));
                        } else if (run.status === 'completed') {
                            console.log('completed state', {status: run.status});
                            const threadMessages = await openAiClient.beta.threads.messages.list(
                                threadId, {
                                    run_id: runId
                                }
                            );
                            for (const message in threadMessages.data) {
                                console.log(message.content);
                            }
                            console.log(threadMessages.data[0].content[0].text.value)
                            const data = {
                                thread: run.id,
                                answer: threadMessages.data[0].content[0].text.value,

                            };

                            return data;
                        }
                    }
                }
            }

        }
    } catch
        (error) {
        console.error(error);
        throw error;
    }
}

module.exports = {InitialiseAssist, InitialiseChat};