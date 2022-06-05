const User = require('../models/users');
const Asset = require('../models/Asset');
const Order = require('../models/orders');

module.exports.buy = async (req, res) => {
    try {
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
                        res.status(200).send("Asset Added");
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
                res.status(400).send("Not enough money");
            }

        }
    }
    catch (err) {
        console.log(err);
    }
}

module.exports.limitOrders = async (req, res) => {
    try {
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
            console.log("Sorted Orders Sent");
            res.status(200).send(sortedOrders);
        }
    } catch (error) {
        console.log(error);
    }

}

module.exports.limit = async (req, res) => {
    try {
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
                    res.status(200).send("Limit Order Added");
                }
                else {
                    res.status(400).send("Not enough money");
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
                            res.status(200).send("Limit Order Added");
                        }
                        else {
                            res.status(400).send("Not enough amount");
                        }
                    }
                }
            }
        }
        else {
            res.status(400).send("Not logged in");
        }
    } catch (error) {
        console.log(error);
    }

}

module.exports.sell = async (req, res) => {
    try {
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
    } catch (error) {
        console.log(error);
    }

}

module.exports.leaderboard = async (req, res) => {
    try {
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
    } catch (error) {
        console.log(error);
    }

}

module.exports.assets = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findOne({ username: req.user.username }).populate('assets');
            if (!user) {
                res.send("Shit website no one has assets ")
            }
            res.status(200).send(user);
        }
    } catch (error) {
        console.log(error);
    }
}
