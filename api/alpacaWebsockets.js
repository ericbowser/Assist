const WebSocket = require('ws');
const Path = require("path");
console.log('Alpaca Sandbox URL: ', process.env.ALPACA_WEB_SOCKET_SANDBOX_URL);

const webSockeyApiKey = process.env.ALPACA_PAPER_API_KEY;
const secret = process.env.ALPACA_PAPER_API_SECRET;
const baseUrl = process.env.ALPACA_WEB_SOCKET_SANDBOX_URL;
console.log(baseUrl)

// Create a new WebSocket client
const ws = new WebSocket(baseUrl);

// Function to authenticate to the WebSocket
function authenticate() {
    const authMessage = {
        action: 'auth',
        key: webSockeyApiKey,
        secret: secret
    };
    
    ws.send(JSON.stringify(authMessage));
}

// Handle WebSocket connection open event
ws.on('open', function open() {
    console.log('Connected to WebSocket');

    // Authenticate the connection
    authenticate();

    // Subscribe to a specific channel (for example, BTC/USD trades)
    const subscriptionMessage = {
        action: 'subscribe',
        trades: ['BTC/USD'],
        quotes: ["BTC/USD"],
        dailyBars: ["BTC/USD"],
        updatedBars: ["BTC/USD"],
        bars: ["BTC/USD"]
    };
    ws.send(JSON.stringify(subscriptionMessage));
});

// Handle messages received over the WebSocket
ws.on('message', function message(data) {
    console.log('Received: %s', data);
});

// Handle WebSocket connection close event
ws.on('close', function close() {
    console.log('Disconnected from WebSocket');
});

// Handle WebSocket error event
ws.on('error', function error(err) {
    console.error('WebSocket error: ', err);
});

module.exports = {authenticate, ws};
