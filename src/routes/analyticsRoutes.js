const express = require("express");
const router = express.Router();
require("dotenv").config();
const { validateAnalytics } = require("../utils/validator");
const { validationResult } = require("express-validator");
const { processPageView } = require("../service/analyticsService");

router.post("/view", validateAnalytics, async (req, res) => {
    const error = validationResult(req).formatWith(({ msg }) => msg);
    const hasError = !error.isEmpty();

    if (hasError) {
        res.send({ status: 422, body: { message: error.array() } });
    } else {
        const result = await processPageView(req.body.page);
        res.send({ status: 200, body: { message: result } });
    }
});

module.exports = router;
