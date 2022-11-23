require('dotenv').config()
const connectDB = require('./demo-wallet-with-flutterwave/config/database');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('./demo-wallet-with-flutterwave/model/user');
const user = require('./demo-wallet-with-flutterwave/model/user');

const app = express();

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
        const oldUser = await user.findOne({email});

        if(oldUser){
            return res.status(409).send("User Already Exist. Please Login");
        }

        //encrypt user password

        encryptedPassword = await bcrypt.hash(password, 10);

        //Create and save user in our database

        const user = await user.create({
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
        const user = await user.findOne({email})

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
    }

    app.get('/pay', (req,res) => {
        res.sendFile(path.join(__dirname + "/index.html"))
    })
})

module.exports = app;
