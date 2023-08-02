const express = require("express");
const router = express.Router();
const Route = require("../models/Route");
require("dotenv").config();
const { verifyJwt } = require("../service/authService");

//no direct email route used in prod
router.post("/handle", (res, res) => {
    res.send({ status: 200, body: { message: "Email sent" } });
});
