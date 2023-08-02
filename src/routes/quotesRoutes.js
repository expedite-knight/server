const express = require("express");
const router = express.Router();
const Route = require("../models/Route");
require("dotenv").config();
const { verifyJwt } = require("../service/authService");
const { handleQuote } = require("../service/quotesService");
const { validateContactForm } = require("../utils/validator");
const { validationResult } = require("express-validator");

router.post("/process", validateContactForm, async (req, res) => {
    const error = validationResult(req).formatWith(({ msg }) => msg);
    const hasError = !error.isEmpty();

    if (hasError) {
        res.send({ status: 422, body: { message: error.array() } });
    } else {
        const result = handleQuote(req.body);

        if (result === "error") {
            res.send({
                status: 500,
                body: { message: "Unable to process quote" },
            });
        } else {
            res.send({
                status: 200,
                body: { message: "Quote processed successfully" },
            });
        }
    }
});

module.exports = router;
