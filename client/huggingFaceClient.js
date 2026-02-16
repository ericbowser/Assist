const { InferenceClient } = require('@huggingface/inference');
const ImageModel = require('../helpers/Types');

const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN || (typeof HF_TOKEN === 'string' && !HF_TOKEN.startsWith('hf_'))) {
  throw new Error('HF_TOKEN must be set in .env and be a valid Hugging Face token (see https://huggingface.co/settings/tokens)');
}
const client = new InferenceClient(HF_TOKEN);

/**
 * Single text-to-image API. Provider is always "auto".
 * @param {string} inputs - Prompt text
 * @param {object} parameters - e.g. { num_inference_steps, width, height }
 * @param {string} model - Model id (use ImageModel.Flux, ImageModel.Flux2Turbo, ImageModel.Hunyan, etc.)
 * @returns {Promise<Blob>} Generated image
 */
async function textToImage(inputs, parameters = {}, model) {
  const x = new InferenceClient(HF_TOKEN, { model: model });
  const image = await x.textToImage({
    provider: 'auto',
    model: model || ImageModel.Hunyan,
    inference_steps: 5,
    width: parameters.width || 1280,
    height: parameters.height || 1280,
    inputs
  });
  return image;
}

module.exports = { textToImage, ImageModel };
