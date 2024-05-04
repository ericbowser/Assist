const { CoinMClient } = require('binance');
const { MainClient } = require('binance');
const { Spot } = require('@binance/connector')


const keys = {
    apiKey: process.env.BINANCE_TEST_API_KEY,
    secretKey: process.env.BINANCE_TEST_API_SECRET_KEY
}

// Get account information
async function getAccount() {
    try {
     /*   const mainClient = new MainClient({
            api_key: keys.apiKey,
            api_secret: keys.secretKey,
            baseUrl: 'https://testnet.binance.vision/api'
        })*/
        const spot = new Spot(keys.apiKey, keys.secretKey, {Timeout: 1000, baseURL: 'https://testnet.binance.vision/api'});
        
        console.log(spot)
    } catch(err) {
        console.log('error ', err)
    }
}

module.exports = {getAccount};