const User = require('../models/users');
const Asset = require('../models/Asset');
const Order = require('../models/orders');
const passport = require('passport')
const passportLocal = require("passport-local").Strategy;
const session = require('express-session');

module.exports.register = async (req, res) => {
    try {
        console.log(req.body.username, req.body.password, req.body.email);
        const { username, password, email } = req.body;
        if (!(email && password && username)) {
            res.status(400).send("All input is required");
        }

        // check if user already exist

        const oldUser = await User.findOne({ email });
        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }
        // create new user
        User.findOne({ username: req.body.username }, async (err, doc) => {
            if (err) throw err;
            if (doc) res.status(409).send("User Already Exists");
            if (!doc) {
                const hashedPassword = await bcrypt.hash(req.body.password, 10);

                const newUser = new User({
                    username: req.body.username,
                    password: hashedPassword,
                    email: req.body.email,
                    balance: 100000,
                    currentValue: 100000,
                });
                await newUser.save();
                res.status(201).send("User Created");
            }
        });
    }
    catch (err) {
        console.log(err);
    }

}

module.exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!(username && password)) {
            res.status(400).send("All input is required");
        }
        passport.authenticate("local", (err, user, info) => {
            if (err) res.status(400).send("Invalid Creds");;
            if (!user) res.status(400).send("No User Exists");
            else {
                req.logIn(user, (err) => {
                    if (err) throw err;
                    res.send({
                        success: true,
                        username: user.username,
                    });
                    console.log(req.user);
                });
            }
        })(req, res, next);
    }
    catch (err) {
        console.log(err);
    }
}

module.exports.user = async (req, res, next) => {
    try {
        if (req.user) {
            const user = await User.findOne({ _id: req.user._id }).populate('assets');
            for (let i = 0; i < user.length; i++) {
                user[i].currentValue = user[i].balance;
                for (let j = 0; j < user[i].assets.length; j++) {
                    user[i].currentValue += user[i].assets[j].amount * user[i].assets[j].avgPrice;
                }
                await user[i].save();
            }
            console.log(user);
            res.status(200).send({
                loggedIn: true,
                username: user.username,
                assets: user.assets,
                orders: user.orders,
                balance: user.balance,
                currentValue: user.currentValue,
            })
        }
        else {
            res.send({
                loggedIn: false,
            })
        }
    }
    catch (err) {
        console.log(err);
    }
    // The req.user stores the entire user that has been authenticated inside of it.
}

module.exports.logout = async (req, res, next) => {
    try {
        req.logout(); //passport function
        res.redirect('http://localhost:3000/');
    } catch (error) {
        console.log(error);
    }

    //https://virtual-crypto-trader.netlify.app/
    //res.redirect('http://localhost:3000/');

}
