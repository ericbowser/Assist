const { CoinMClient } = require('binance');
const { MainClient } = require('binance');
const { Spot } = require('@binance/connector')


const keys = {
    apiKey: 'uLAS2pF0mI2LhAaGEvAhS9rvjOpi1Gzv2sJX1kNRyiJBrTMdOuHvKKLU6MYOFNw7',
    secretKey: 'iIUVQPWElnY5Fcu1lfQXAqFdzP2g83P1LzPcuGG6bS1MWk1378byxg2n3lxc6izx',
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