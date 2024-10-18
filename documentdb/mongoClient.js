// Database Name
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require("dotenv").config();
console.log(dotenv.parsed.MONGO_URI);

const uri = `${dotenv.parsed.MONGO_DRIVER}${dotenv.parsed.MONGO_URI}${dotenv.parsed.MONGO_QUERY_PARAM}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connectToMongoClient() {
    try {
        const database = client.db('lasertags');
        const movies = database.collection('movies');

        // Query for a movie that has the title 'Back to the Future'
        const query = { title: 'Back to the Future' };
        const movie = await movies.findOne(query);
        if (!movie) {
            return null;
        }

        return movie;
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

module.exports = connectToMongoClient;