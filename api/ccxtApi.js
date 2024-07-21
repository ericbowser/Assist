//cjs
const ccxt = require ('ccxt')

async function getExchanges() {
    const exchanges = await ccxt.exchanges;
    console.log (exchanges) // print all available exchanges
    return exchanges;
}

module.exports = getExchanges;