const http = require ('http');
const app = require('./app');
const server = http.createServer(app)
const mongoose = require('mongoose');
const connectDB = require('./demo-wallet-with-flutterwave/config/database');

const {API_PORT} = process.env
const PORT = process.env.PORT || API_PORT;

connectDB()

mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
    server.listen(PORT, () => console.log(`server running on port ${PORT}`));
})