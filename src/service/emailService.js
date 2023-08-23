require("dotenv").config();
const nodemailer = require("nodemailer");
const { QUOTES_EMAIL, QUOTES_EMAIL_PASS } = process.env;

//only sends a quote to terry
const handleSendEmail = (quote) => {
  const {
    email,
    item,
    dropoff,
    pickup,
    name,
    number,
    length,
    width,
    height,
    weight,
    onPallet,
    liftgate,
  } = quote;
  let res = "";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: QUOTES_EMAIL,
      pass: QUOTES_EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: QUOTES_EMAIL,
    to: "terryt@expediteknight.net",
    subject: "A customer has requested a Quote!",
    html: `<div>
                    <h1>Quote details:</h1>
                    <p>Item: ${item}</p>
                    <p>Dimensions: L=${length}in. W=${width}in. H=${height}in.</p>
                    <p>Weight: ${weight}lbs.</p>
                    <p>Pickup address: ${pickup}</p>
                    <p>Dropoff address: ${dropoff}</p>
                    <p>Liftgate required: ${
                      JSON.parse(liftgate) ? "yes" : "no"
                    }</p>
                    <p>On pallet: ${JSON.parse(onPallet) ? "yes" : "no"}</p>
                    <p>Client Name: ${name}</p>
                    <p>Client Number: ${number}</p>
                    <p>Client Email: ${email}</p>
                </div>`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error sending email: ", error);
      res = "error";
    } else {
      console.log("Email sent successfully...");
      res = "success";
    }
  });

  return res;
};

//make sure to change the email to a different email for
//sending emails specifically
const handleSendUpdateEmail = (route) => {
  let res = "";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: QUOTES_EMAIL,
      pass: QUOTES_EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: QUOTES_EMAIL,
    to: "terryt@expediteknight.net",
    subject: "A customer has requested a Quote!",
    html: `<div>
                    <h1>Quote details:</h1>
                    <p>Item: ${item}</p>
                    <p>Dimensions: L=${length}in. W=${width}in. H=${height}in.</p>
                    <p>Weight: ${weight}lbs.</p>
                    <p>Pickup address: ${pickup}</p>
                    <p>Dropoff address: ${dropoff}</p>
                    <p>Liftgate required: ${
                      JSON.parse(liftgate) ? "yes" : "no"
                    }</p>
                    <p>On pallet: ${JSON.parse(onPallet) ? "yes" : "no"}</p>
                    <p>Client Name: ${name}</p>
                    <p>Client Number: ${number}</p>
                    <p>Client Email: ${email}</p>
                </div>`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error sending email: ", error);
      res = "error";
    } else {
      console.log("Email sent successfully...");
      res = "success";
    }
  });

  return res;
};

module.exports = {
  handleSendEmail,
  handleSendUpdateEmail,
};
