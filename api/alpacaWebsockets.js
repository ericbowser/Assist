const websocket = alpaca.data_stream_v2;
websocket.onConnect(() => {
    websocket.subscribeForTrades(["AAPL"]);
});
websocket.onStateChange((status) => {
    console.log("Status:", status);
});
websocket.onError((err) => {
    console.log("Error:", err);
});
websocket.onStockTrade((trade) => {
    console.log("Trade:", trade);
});
websocket.connect();