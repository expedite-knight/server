const express = require("express");
const router = express.Router();
require("dotenv").config();
const client = require("twilio")(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const { MessagingResponse } = require("twilio").twiml;
const { verifyJwt } = require("../service/authService");
const { handleReceiveMessage } = require("../service/smsService");

router.get("/", async (req, res) => {
    res.send({ status: 200, message: "SMS endpoint" });
});

router.post("/receive", async (req, res) => {
    const { Body, From } = req.body;

    const message = await handleReceiveMessage(Body, From);

    const twiml = new MessagingResponse();

    twiml.message(message);

    res.type("text/xml").send(twiml.toString());
});

router.use(verifyJwt);

router.use((req, res, next) => {
    if (req.user) next();
    else res.send(401);
});

//this is mostly for testing purposes
router.post("/send", async (req, res) => {
    const { message, subscribers } = req.body;
    if (!message)
        res.send({ status: 401, message: "cannot send empty message." });

    await client.messages
        .create({
            body: message,
            to: "+16309010336",
            from: "+17046868257",
        })
        .then((message) => console.log(message.sid))
        .catch((err) => console.log(err));

    res.send({ status: 200, message: "message sent successfully" });
});

module.exports = router;
