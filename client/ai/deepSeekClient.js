// server.js
const axios = require('axios');

// Deepseek Text Generation Endpoint
async function deepSeekChat(prompt = '', max_tokens = 1000) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions', // Verify endpoint from docs
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Image Generation Endpoint (if supported)
async function deepSeekImage(prompt, size = "1024x1024") {
  try {
    const response = await axios.post(process.env.DEEPSEEK_IMAGE_URL, // Verify endpoint
      { prompt, size },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

module.exports = { deepSeekChat, deepSeekImage };