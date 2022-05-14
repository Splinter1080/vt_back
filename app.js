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

const app = express()
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json())
const PORT = 5000
const cors = require("cors");

//----------------------
const User = require('./models/users');
const Asset = require('./models/asset');
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
        origin: "http://localhost:3000", // <-- location of the react app were connecting to
        credentials: true,
    })
);

const sessionConfig = {
    secret: 'thisshouldbeabettersecret!', //change this later ..
    resave: true,
    saveUninitialized: true,
    // cookie: {
    //     httpOnly: true,
    //     expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    //     maxAge: 1000 * 60 * 60 * 24 * 7
    // }
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

//------------------auth------------------
app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) throw err;
        if (!user) res.send("No User Exists");
        else {
            req.logIn(user, (err) => {
                if (err) throw err;
                res.send("Successfully Authenticated");
                console.log(req.user);
            });
        }
    })(req, res, next);
});
app.post("/register", (req, res) => {
    User.findOne({ username: req.body.username }, async (err, doc) => {
        if (err) throw err;
        if (doc) res.send("User Already Exists");
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
            res.send("User Created");
        }
    });
});
app.get("/user", (req, res) => {
    res.send(req.user); // The req.user stores the entire user that has been authenticated inside of it.
});
app.get('/logout', (req, res) => {
    req.logout(); //passport function
    res.redirect('http://localhost:3000/login');
})
//------------buy and sell----------------
app.post("/buy", async (req, res) => {
    console.log(req.user, req.body);
    if (req.user) {
        const user = await User.findOne({ username: req.user.username }).populate('assets');;
        if (parseFloat(req.body.investedValue) <= parseFloat(user.balance)) {
            console.log("enough money");
            for (let i = 0; i < user.assets.length; i++) {
                console.log(user.assets[i].coinName);
                if (user.assets[i].coinName === req.body.coinName) {
                    console.log("already have this coin");
                    const asset = await Asset.findOne({ coinName: req.body.coinName });
                    asset.avgPrice = ((parseFloat(asset.avgPrice * asset.amount) + parseFloat(req.body.investedValue)) / (req.body.amount + asset.amount));
                    asset.amount += parseFloat(req.body.amount);
                    await asset.save();
                    res.send("Asset Added");
                    return;
                }
            }
            console.log("hey");
            const asset = new Asset({
                coinName: req.body.coinName,
                amount: parseFloat(req.body.amount),
                avgPrice: parseFloat(req.body.price),
            });
            asset.users.push(req.user._id);
            user.assets.push(asset);
            await asset.save();
            user.balance -= parseFloat(req.body.investedValue);
            await user.save();
        }

    }
});
app.post("/sell", async (req, res) => {
    if (req.user) {
        const user = await User.findOne({ username: req.user.username }).populate('assets');;
        for (let i = 0; i < user.assets.length; i++) {
            if (user.assets[i].coinName === req.body.coinName) {
                const asset = await Asset.findOne({ coinName: req.body.coinName });
                if (parseFloat(req.body.sellMoney) <= parseFloat(asset.amount * req.body.price)) {
                    asset.amount -= parseFloat(req.body.sellMoney / req.body.price);
                    asset.avgPrice = ((parseFloat(asset.avgPrice * asset.amount) - parseFloat(req.body.sellMoney)) / (asset.amount - req.body.amount));
                    user.balance += parseFloat(req.body.sellMoney);
                    res.send("Asset Sold");
                    return;
                }
                else {
                    res.send("Not enough amount");
                    return;
                }
            }
        }
        res.send("No such asset");
    }
});
app.get("/assets", async (req, res) => {
    if (req.user) {
        const user = await User.findOne({ username: req.user.username }).populate('assets');
        if (!user) {
            res.send("Shit website no one has assets ")
        }
        res.send(user);
    }

})
//------------------routes------------------
app.get('/', (req, res) => {
    res.send("hello world !");
})
app.listen(PORT, () => {
    console.log('Server is running on port 3000');
});