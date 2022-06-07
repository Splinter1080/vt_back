const express = require('express')
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const passport = require('passport')
const passportLocal = require("passport-local").Strategy;
const session = require('express-session');
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const axios = require("axios");
require('dotenv').config();
const app = express()
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json())

const cors = require("cors");

//----------------------
const User = require('./models/users');
const Asset = require('./models/Asset');
const Order = require('./models/orders');

//------db connection-----
const dbUrl = 'mongodb+srv://botstest1080:splinter1234@cluster0.aapex.mongodb.net/virtual_trader?retryWrites=true&w=majority';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


//------session config--------
app.use(
    cors({
        origin:
            ['https://main--virtual-crypto-trader.netlify.app', "http://localhost:3000", 'https://virtual-crypto-trader.netlify.app',],

        //origin: "http://localhost:3000", // <-- location of the react app were connecting to
        credentials: true,
    })
);

const sessionConfig = {
    secret: 'thisshouldbeabettersecret!', //change this later ..
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(cookieParser("thisshouldbeabettersecret"));
app.use(passport.initialize());
app.use(passport.session());
require("./passportConfig")(passport);
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})
//-----router config--------
const tradesRouter = require('./routes/trades');
const usersRouter = require('./routes/users');
//-----routes--------
app.use('/', usersRouter);
app.use('/trade', tradesRouter);
app.get('/', (req, res) => {
    res.send("hello world !");
})
const port = process.env.PORT || 5000
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});