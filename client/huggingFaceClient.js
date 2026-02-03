const { InferenceClient } = require('@huggingface/inference');
const ImageModel = require('../helpers/Types');

const client = new InferenceClient(process.env.HF_TOKEN);

async function textToImage(inputs, parameters = { num_inference_steps: 8 }) {
  const image = await client.textToImage({
    provider: 'auto',
    model: ImageModel.Flux,
    outputType: 'url',
    inputs,
    parameters,
  });
  return image;
}

async function textToImageFlux(inputs, parameters = { num_inference_steps: 10 }) {
  const image = await client.textToImage({
    provider: 'auto',
    model: ImageModel.Flux,
    outputType: 'url',
    inputs,
    parameters,
  });
  return image;
}

async function textToImageFlux2Turbo(inputs, parameters = { num_inference_steps: 8 }) {
  const image = await client.textToImage({
    provider: 'auto',
    model: ImageModel.Flux2Turbo,
    outputType: 'url',
    inputs,
    parameters,
  });
  return image;
}

module.exports = { textToImage, textToImageFlux, textToImageFlux2Turbo };
