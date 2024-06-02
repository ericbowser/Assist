"use strict";

/**
 * This example shows how to use the Alpaca Data V2 websocket to subscribe to events.
 * The socket is available under the `data_steam_v2` property on an Alpaca instance.
 * There are separate functions for subscribing (and unsubscribing) to trades, quotes and bars as seen below.
 */

const Alpaca = require("@alpacahq/alpaca-trade-api");
const API_KEY = process.env.ALPACA_API_KEY;
const API_SECRET = process.env.ALPACA_API_SECRET;

const RestApi = () => {
    const options = {method: 'GET', headers: {accept: 'application/json'}};
    const start = '2024-04-29';
    const end = '2024-03-29';
    const symbols = ['BTC', 'ETH', 'SOL'].join('&');
    const fullUrl = `${process.env.ALPACA_PAPER_URL}&${start}&${end}}` + symbols;
    
    fetch(process.env.ALPACA_BASE_URL, options)
        .then(response => response.json())
        .then(response => console.log(response))
        .catch(err => console.error(err));
}

export default class AlpacaDataStream {
    constructor({apiKey, secretKey, feed}) {
        this.alpaca = new Alpaca({
            keyId: apiKey,
            secretKey,
            feed,
        });

        const socket = this.alpaca.data_stream_v2;

        socket.onConnect(function () {
            console.log("Connected");
            socket.subscribeForDailyBars();
        });

        socket.onError((err) => {
            console.log(err);
        });

        socket.onStockTrade((trade) => {
            console.log(trade);
        });

        socket.onStockQuote((quote) => {
            console.log(quote);
        });

        socket.onStockBar((bar) => {
            console.log(bar);
        });

        socket.onStatuses((s) => {
            console.log(s);
        });

        socket.onStateChange((state) => {
            console.log(state);
        });

        socket.onDisconnect(() => {
            console.log("Disconnected");
        });

        socket.connect();

        // unsubscribe from FB after a second
        setTimeout(() => {
            socket.unsubscribeFromTrades(["FB"]);
        }, 1000);
    }
}

let stream = new AlpacaDataStream({
    apiKey: API_KEY,
    secretKey: API_SECRET,
    feed: "sip",
    paper: true,
});