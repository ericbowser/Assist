const axios = require('axios');
const config = require('dotenv').config();

async function alphaSquaredAssets() {
  try {

  } catch (error) {
    console.error(error);
    return null;
  }
}

async function alphaSquaredStrategies() {
  const strategiesUrl =  config.parsed.ALPHA_SQUARED_STRATEGIES;
  try {
    const request = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Authorization': ` ${config.parsed.ALPHA_SQUARED_API_KEY}`
      }
    }
    const response = await axios.get(strategiesUrl, request);
    console.log('response: ', response);

    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function alphaSquaredHypotheticals() {
  try {

  } catch (error) {
    console.error(error);
    return null;
  }
}


module.exports = {alphaSquaredAssets, alphaSquaredStrategies, alphaSquaredHypotheticals};