require("dotenv").config();
const { handleSendEmail } = require("./emailService");
const { sendQuoteMessage } = require("./smsService");

const handleQuote = (quote) => {
    const estimate = calculateQuote(quote); //WIP
    const emailRes = handleSendEmail(quote);
    // const SMSRes = sendQuoteMessage(quote);
    const SMSRes = "success";

    if (emailRes === "error" || SMSRes === "error") return "error";
    else return "success";
};

const calculateQuote = (quote) => {
    //put code here to calculate quote
};

module.exports = {
    calculateQuote,
    handleQuote,
};
