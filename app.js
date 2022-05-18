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
const Asset = require('./models/asset');
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
            '*',

        //origin: "http://localhost:3000", // <-- location of the react app were connecting to
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
                res.send({
                    success: true,
                    username: user.username,
                });
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
app.get("/user", async (req, res) => {
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
        res.send({
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
    // The req.user stores the entire user that has been authenticated inside of it.
});
app.get('/logout', (req, res) => {
    req.logout(); //passport function
    res.redirect('https://main--virtual-crypto-trader.netlify.app/');
    //res.redirect('http://localhost:3000/'); //"https://main--iridescent-basbousa-14f4a4.netlify.app",

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
                    user.balance -= parseFloat(req.body.investedValue);
                    await asset.save();
                    const order = new Order({
                        coinName: req.body.coinName,
                        amount: req.body.amount,
                        investedValue: req.body.investedValue,
                        orderCompleted: true,
                        type: "Buy",
                        timePlaced: req.body.timePlaced,
                        timeExecuted: new Date(),
                        user: req.user._id,
                    });
                    user.orders.push(order._id);
                    await user.save();
                    res.send("Asset Added");
                    return;
                }
            }
            console.log("Don't have this coin");
            const asset = new Asset({
                coinName: req.body.coinName,
                amount: parseFloat(req.body.amount),
                avgPrice: parseFloat(req.body.price),
            });
            asset.users.push(req.user._id);
            user.orders.push(order._id);
            user.assets.push(asset);
            user.balance -= parseFloat(req.body.investedValue);
            await asset.save();
            await user.save();
        }
        else {
            res.send("Not enough money");
        }

    }
});
app.get("/limit/:coinName", async (req, res) => {
    if (req.user) {
        const orders = await Order.find({ user: req.user._id });
        const sendOrders = [];
        for (let i = 0; i < orders.length; i++) {
            if (orders[i].coinName === req.params.coinName) {
                sendOrders.push(orders[i]);
            }
        }
        const sortedOrders = sendOrders.sort((a, b) => {
            return b.price - a.price;
        });
        //console.log(sendOrders);
        console.log("Sorted Orders Sent");
        res.send(sortedOrders);
    }
})
app.post("/limit", async (req, res) => {

    if (req.user) {
        const user = await User.findOne({ username: req.user.username }).populate('assets');
        if (req.body.type === "Buy") {
            if (parseFloat(req.body.investedValue) <= parseFloat(user.balance)) {
                const order = new Order({
                    coinName: req.body.coinName,
                    price: parseFloat(req.body.price),
                    amount: parseFloat(req.body.amount),
                    investedValue: parseFloat(req.body.investedValue),
                    type: req.body.type,
                    timePlaced: req.body.timePlaced,
                    timeExecuted: req.body.timeExecuted,
                    orderCompleted: req.body.orderCompleted,
                    user: req.user._id,
                });
                await order.save();
            }
            else {
                res.send("Not enough money");
            }
        }
        else if (req.body.type === "Sell") {
            for (let i = 0; i < user.assets.length; i++) {
                if (user.assets[i].coinName === req.body.coinName) {
                    const asset = await Asset.findOne({ coinName: req.body.coinName });
                    if (parseFloat(req.body.sellMoney) <= parseFloat(asset.amount * req.body.investedValue)) {
                        const order = new Order({
                            coinName: req.body.coinName,
                            amount: parseFloat(req.body.amount),
                            price: parseFloat(req.body.price),
                            investedValue: parseFloat(req.body.investedValue),
                            type: req.body.type,
                            timePlaced: req.body.timePlaced,
                            timeExecuted: req.body.timeExecuted,
                            orderCompleted: req.body.orderCompleted,
                            user: req.user._id,
                        });
                        await order.save();
                    }
                    else {
                        res.send("Not enough amount");
                        return;
                    }
                }
            }
        }
    }
    else {
        res.send("Not logged in");
    }
})
app.post("/sell", async (req, res) => {
    if (req.user) {
        const user = await User.findOne({ username: req.user.username }).populate('assets');;
        for (let i = 0; i < user.assets.length; i++) {
            if (user.assets[i].coinName === req.body.coinName) {
                const asset = await Asset.findOne({ coinName: req.body.coinName });
                if (parseFloat(req.body.sellMoney) <= parseFloat(asset.amount * req.body.price)) {
                    //average prie doesn't change when you sell
                    asset.amount -= parseFloat(req.body.sellMoney / req.body.price);
                    user.balance += parseFloat(req.body.sellMoney);
                    await asset.save();
                    const order = new Order({
                        coinName: req.body.coinName,
                        amount: req.body.amount,
                        investedValue: req.body.investedValue,
                        orderCompleted: true,
                        type: "Buy",
                        timePlaced: req.body.timePlaced,
                        timeExecuted: new Date(),
                        user: req.user._id,
                    });
                    user.orders.push(order._id);
                    await user.save();
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
app.get('/leaderboard', async (req, res) => {
    const users = await User.find().populate('assets');
    for (let i = 0; i < users.length; i++) {
        users[i].currentValue = users[i].balance;
        for (let j = 0; j < users[i].assets.length; j++) {
            users[i].currentValue += users[i].assets[j].amount * users[i].assets[j].avgPrice;
        }

        await users[i].save();
    }
    const sortedUsers = users.sort((a, b) => {
        return b.currentValue - a.currentValue;
    });
    res.send(sortedUsers);
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

//---------------limit orders-----------------
// const LimitOrderExecute = async (order) => {
//     if (order.type == "Buy") {
//         const user = await User.findOne({ _id: order.user }).populate('assets');;
//         if (parseFloat(order.investedValue) <= parseFloat(user.balance)) {
//             console.log("enough money");
//             for (let i = 0; i < user.assets.length; i++) {
//                 console.log(user.assets[i].coinName);
//                 if (user.assets[i].coinName === order.coinName) {
//                     console.log("already have this coin");
//                     const asset = await Asset.findOne({ coinName: order.coinName });
//                     asset.avgPrice = ((parseFloat(asset.avgPrice * asset.amount) + parseFloat(order.investedValue)) / (order.amount + asset.amount));
//                     asset.amount += parseFloat(order.amount);
//                     user.balance -= parseFloat(order.investedValue);
//                     await asset.save();
//                     order.orderCompleted = true,
//                         order.timeExecuted = new Date(),
//                         user.orders.push(order._id);
//                     await order.save();
//                     await user.save();
//                     console.log("Asset Added");
//                     return;
//                 }
//             }
//             console.log("Don't have this coin");
//             const asset = new Asset({
//                 coinName: req.body.coinName,
//                 amount: parseFloat(req.body.amount),
//                 avgPrice: parseFloat(req.body.price),
//             });
//             asset.users.push(req.user._id);
//             user.orders.push(order._id);
//             user.assets.push(asset);
//             user.balance -= parseFloat(req.body.investedValue);
//             await asset.save();
//             await user.save();
//         }
//         else {
//             console.log(order.coinName);
//             console.log("Not enough Money")
//             return;
//         }


//     }
// }
// const LimitOrderCheck = async () => {
//     const orders = Order.find({ orderCompleted: false });
//     const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=${"USD"}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
//         .catch((err) => {
//             console.log(err);
//         });
//     for (let i = 0; i < data.length; ++i) {
//         const coin = data[i];
//         const coinName = data[i].id;
//         const ordersCheck = (await orders).filter((order) => {
//             return order.coinName.toLowerCase().includes(coinName)
//         });
//         for (let j = 0; j < ordersCheck.length; ++j) {
//             if (ordersCheck[j].type == "Buy") {
//                 if (ordersCheck[i].price <= coin.current_price) {
//                     LimitOrderExecute(ordersCheck[i]);
//                 }
//             }
//             else if (ordersCheck[j].type == "Sell") {
//                 if (ordersCheck[i].price >= coin.current_price) {
//                     LimitOrderExecute(ordersCheck[i]);
//                 }
//             }
//         }
//     }
// }

// LimitOrderCheck();


//------------------routes------------------
app.get('/', (req, res) => {
    res.send("hello world !");
})
const port = process.env.PORT || 5000
app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});

