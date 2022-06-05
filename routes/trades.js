const express = require("express");
const router = express.Router();
const trades = require("../controllers/trades");

router.route("/buy").post(trades.buy);

router.route("/limit/:coinName").get(trades.limitOrders);

router.route("/limit").post(trades.limit);

router.route("/sell").post(trades.sell);

router.route("/leaderboard").post(trades.leaderboard);

router.route("/assets").get(trades.assets);

module.exports = router;