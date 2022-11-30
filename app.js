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
    try {
        const response = await axios({
            url,
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${process.env.FLUTTERWAVE_TEST_SECRET_KEY}`,
            },
        });
        const response_data = response.data.data
        
            if(!response_data){
                res.status(404).json({ status: "fail" })
                return next()
            }
            res.status(200).json({ status: "success", data: response_data })
            return next();
        } catch (error) {
            res.status(500).json({ status: "error" })
        }
});
module.exports = app;
