const express = require("express");
const router = express.Router();
const users = require("../controllers/users");

router.route("/register").post(users.register);

router.route("/login").post(users.login);

router.route("/user").get(users.user);

router.route("/logout").get(users.logout);

module.exports = router;