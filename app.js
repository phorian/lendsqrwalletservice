require('dotenv').config()
const connectDB = require('./demo-wallet-with-flutterwave/config/database');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./demo-wallet-with-flutterwave/model/user');
const path = require('path');
const axios = require('axios');
const app = express();
const http = require('http')
const Wallet = require('./demo-wallet-with-flutterwave/model/wallet');
const WalletTxn = require('./demo-wallet-with-flutterwave/model/wallet_transact');
const Txn = require('./demo-wallet-with-flutterwave/model/transaction');
const wallet_transact = require('./demo-wallet-with-flutterwave/model/wallet_transact');
const transaction = require('./demo-wallet-with-flutterwave/model/transaction');
const { id } = require('date-fns/locale');

app.use(express.json()); //builtin middleware

/*******************
    ROUTES
*******************/
app.post('/register', async (req,res) => {
    try {
        //Get user input here
        const { first_name, last_name, email, password} = req.body

        //validate user input
        if(!(email && password && first_name && last_name)) {
            res.status(400).send("Please Input Details");
        }

        //Check if user exist and if user exist in our database
        const oldUser = await User.findOne({email});

        if(oldUser){
            return res.status(409).send("User Already Exist. Please Login");
        }

        //encrypt user password

        encryptedPassword = await bcrypt.hash(password, 10);

        //Create and save user in our database

        const user = await User.create({
            first_name,
            last_name,
            email: email.toLowerCase(),
            password: encryptedPassword,
        });

        //create user token
        const token = jwt.sign(
            { user_id: user.id, email },
            process.env.TOKEN_KEY,
            {
                expiresIn: "2h",
            }
        );

        //save user token
        user.token = token;

        //return new user

    res.status(201).json(user);
    } catch(err) {
        console.log(err);
    }
})
app.post('/login', async (req,res) => {
    try{
        //get user input
        const{ email, password } = req.body;
        
        //validate user input
        if(!(email && password)) {
            res.status(400).send("Please input details")
        }

        //validate if user exist in database
        const user = await User.findOne({email})

        if(user && (await bcrypt.compare(password, user.password))) {
            //create user token
            const token = jwt.sign(
                {
                    userid: user._id, email
                },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "2h",
                }
            );

            //save user token
            user.token = token;

            //user
            res.status(200).json(user)
        }
        res.status(400).send("Invalid Credentials");
    } catch(err){
        console.log(err);
    };
})
app.get('/pay', (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"))
})

app.get('/response', async (req, res, next) => {
    const { transaction_id } = req.query;
    //URL with txn id to confirm txn status
    const url = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;

    //Network call to confirm txn status
    const response = await axios({
            url,
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${process.env.FLUTTERWAVE_TEST_SECRET_KEY}`,
            },
    });

    const {status, currency, id, amount, customer } = response.data.data

       //check if customer exists in dB
    const user = await User.findOne({email: customer.email})

       //check if user have wallet, else create one
    const wallet = await validateUserWallet(user._id);

       //create wallet txn
    await createWalletTxn(user._id, status, currency, amount);

       //create txn
    await createtxn(user._id, id, status, currency, amount, customer);

    await updateWallet(user._id, amount)

    //check if txn id exists already
    const txnExist = await transaction.findOne({ transactionId: id});

    if(txnExist) {
        return res.status(409).send("Transaction Already Exists");
    }

    return res.status(200).json({
        response: "wallet funded successfully",
        data: wallet,
        });
});

app.get("/wallet/:userId/balance", async (req,res) => {
    try {
        const { userId } = req.params;

        const wallet = await Wallet.findOne({userId});
        //user
        res.status(200).json(wallet.balance);
    } catch(error) {
        console.log(error);
    }
})

const validateUserWallet = async(userId) => {
    try{
        //check if user have a wallet, else create wallet
        const userWallet = await Wallet.findOne({userId});

        //if user wallet doesn't exist, create new one
        if(!userWallet) {
            const wallet = await Wallet.create({
                userId,
            });
            return wallet;
        }
        return userWallet;
    } catch (error){
        console.log(error);
    }
};

//create wallet Transaction
const createWalletTxn = async (userId, status, currency, amount) => {
    try {
        //create wallet txn
        const walletTxn = await wallet_transact.create({
            amount,
            userId,
            isInflow: true,
            currency,
            status,
        });
        return walletTxn;
    } catch (error) {
        console.log(error)
    }
};

//create txn
const createtxn = async (userId, id, status, currency, amount, customer) => {
    try {
        //create transaction
        const txn = await transaction.create({
            userId,
            transactionId: id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            amount,
            currency,
            paymentStatus: status,
            paymentGateway: "flutterwave",
        });
        return txn;
    } catch (error) {
        console.log(error);
    }
};

//update wallet
const updateWallet = async(userId, amount) => {
    try {
        const wallet = await Wallet.findOneAndUpdate(
            { userId },
            {$inc: { balance: amount }},
            {new: true }
        );
        return wallet
    }catch (error) {
        console.log(error);
    }
};




module.exports = app;
