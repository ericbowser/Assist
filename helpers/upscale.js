const sharp = require('sharp');

/** Min width/height below which we upscale. Target is 2x when upscaling. */
const MIN_DIMENSION = 1280;
const SCALE_FACTOR = 2;

/**
 * Upscale image buffer if dimensions are below MIN_DIMENSION.
 * Uses Lanczos3 for high-quality interpolation.
 * @param {Buffer} buffer - PNG/JPEG image buffer
 * @returns {Promise<Buffer>} Possibly upscaled image
 */
async function upscaleIfNeeded(buffer) {
  const meta = await sharp(buffer).metadata();
  const { width, height } = meta;
  if (width >= MIN_DIMENSION && height >= MIN_DIMENSION) return buffer;
  const newWidth = Math.round(width * SCALE_FACTOR);
  const newHeight = Math.round(height * SCALE_FACTOR);
  return sharp(buffer)
    .resize(newWidth, newHeight, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

module.exports = { upscaleIfNeeded };
