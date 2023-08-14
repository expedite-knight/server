require("dotenv").config();
const client = require("twilio")(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const { MessagingResponse } = require("twilio").twiml;
const Route = require("../models/Route");
const VerifiedNumber = require("../models/VerifiedNumber");
const { RES_TYPES } = require("../utils/helper");
const { SECRET_SMS, SECRET_SMS_KEY } = process.env;

const handleSendMessage = async (subscriber, message) => {
  const subscriberDb = await VerifiedNumber.findById(subscriber).catch((err) =>
    console.log("number does not exist")
  );

  if (!subscriberDb) return "Something went wrong...";

  if (subscriberDb.verified) {
    console.log(`sending: "${message}" to: ${subscriberDb.number}`);
    await client.messages
      .create({
        body: message,
        to: formatSubscriber(subscriberDb),
        from: "+17046868257",
      })
      .then((message) => {
        console.log("Message sent successfully.");
        return "success";
      })
      .catch((err) => console.log("Unable to send message."));
  } else {
    console.log(`${subscriberDb?.number} has not been verified`);
    return `${subscriberDb?.number} has not been verified`;
  }
};

const handleReceiveMessage = async (message, from) => {
  const route = await Route.findById(message)
    .populate("subscribers")
    .catch((err) => console.log("route does not exist"));

  //unsub from route
  if (route) {
    const result = await unsubFromRoute(route, from);
    return result;
  }

  //number has been verified
  if (message.toLowerCase() === "verify") {
    const result = await handleVerifyNumber(from);
    return result;
    //number has been unverified
  } else if (message.toLowerCase() === "unverify") {
    const result = await handleUnVerifyNumber(from);
    return result;
  } else if (message.toLowerCase() === SECRET_SMS_KEY) {
    return SECRET_SMS;
  } else {
    return "The action you have sent was not recognized, please visit our website for more information";
  }
};

const sendActivationMessage = async (subscriber, route, eta) => {
  let etaDurationString = "";
  if (eta.min >= 60) {
    const hours = Math.floor(eta.min / 60);
    const mins = eta.min - hours * 60;
    etaDurationString = hours + " hrs. and " + mins + " mins.";
    console.log("ETA STRING: ", etaDurationString);
  } else {
    etaDurationString = eta.min.concat(" mins.");
  }

  const message = `ACTIVATED: ${route.creator.firstName} ${route.creator.lastName} has started a route to ${route.destination} with id: ${route._id}. ${route.creator.firstName} is currently ${eta.mi} mi. or ${etaDurationString} away with an ETA of ${eta.time}. You can track the route online by clicking this link https://www.expediteknight.com/finder?route=${route._id}. If you no longer want to be apart of this route, respond with the route id.`;

  await handleSendMessage(subscriber, message);
};

const sendUnSubMessage = async (subscriber, route, eta) => {
  const message = `You have successfully unsubscribed from route: ${route._id}`;

  await handleSendMessage(subscriber, message);
};

const sendUpdateMessage = async (subscriber, route, eta) => {
  let etaDurationString = "";
  if (eta.min >= 60) {
    const hours = Math.floor(eta.min / 60);
    const mins = eta.min - hours * 60;
    etaDurationString = hours + " hrs. and " + mins + " mins.";
    console.log("ETA STRING: ", etaDurationString);
  } else {
    etaDurationString = eta.min.concat(" mins.");
  }

  const message = `UPDATE: ${route.creator.firstName} ${route.creator.lastName} is approximately ${eta.mi} mi. or ${etaDurationString} away with an ETA of ${eta.time}`;

  await handleSendMessage(subscriber, message);
};

const sendWarningMessage = async (subscriber, route, eta) => {
  const message = `WARNING: ${route.creator.firstName} ${route.creator.lastName} is approximately 10 mins away and will arrive at ${eta.time}`;

  await handleSendMessage(subscriber, message);
};

const sendArrivalMessage = async (subscriber, route, eta) => {
  const message = `ARRIVED: ${route.creator.firstName} ${route.creator.lastName} has arrived at ${route.destination}. You will no longer receive any messages regarding this route until it is activated again.`;

  await handleSendMessage(subscriber, message);
};

const sendDeactivationMessage = async (subscriber, route, eta) => {
  let etaDurationString = "";
  if (eta.min >= 60) {
    const hours = Math.floor(eta.min / 60);
    const mins = eta.min - hours * 60;
    etaDurationString = hours + " hrs. and " + mins + " mins.";
    console.log("ETA STRING: ", etaDurationString);
  } else {
    etaDurationString = eta.min.concat(" mins.");
  }

  const message = `DEACTIVATED: ${route.creator.firstName} ${route.creator.lastName} has deactivated route: ${route._id} approximately ${eta.mi} mi. or ${etaDurationString} away from ${route.destination}`;

  await handleSendMessage(subscriber, message);
};

//this will only be used for when a user logs out
const sendCancellationMessage = async (subscriber, route, eta) => {
  const message = `CANCELLED: ${route.creator.firstName} ${route.creator.lastName} has cancelled all routes.`;

  await handleSendMessage(subscriber, message);
};

const sendQuoteMessage = async (quote) => {
  const { email, item, dropoff, pickup, name, number } = quote;
  const message = `A new quote has just been submitted to your email.`;

  await handleSendMessage("+18454223301", message);
};

const sendHalfwayMessage = async (subscriber, route, eta) => {
  const message = `HALFWAY: ${route.creator.firstName} ${route.creator.lastName} is approximately halfway to ${route.destination} and will arrive at ${eta.time}`;

  await handleSendMessage(subscriber, message);
};

const sendHourAwayMessage = async (subscriber, route, eta) => {
  const message = `HOUR AWAY: ${route.creator.firstName} ${route.creator.lastName} is approximately 1 hour away and will arrive at ${eta.time}`;

  await handleSendMessage(subscriber, message);
};

const handleVerifyNumber = async (number) => {
  const optionalNumber = await VerifiedNumber.findOne({
    number: number,
  }).catch((err) => console.log("number not yet verified"));

  if (optionalNumber) {
    if (optionalNumber.verified) {
      return "This number is already verified and is able to receive updates from us";
    }
    optionalNumber.verified = true;
    await optionalNumber.save();

    return "Your number has been verified and can now receive SMS updates from us. To unverify, reply UNVERIFY";
  } else {
    await VerifiedNumber.create({ number: number, verified: true });
    return "Your number has been verified and can now receive SMS updates from us. To unverify, reply UNVERIFY";
  }
};

const handleUnVerifyNumber = async (number) => {
  const result = await VerifiedNumber.deleteOne({ number: number }).catch(
    (err) => console.log("number not yet verified")
  );

  if (result.deletedCount > 0) {
    return "You will no longer receive updates from us";
  } else {
    return "This number has not yet been verified";
  }
};

//this seems to work now
const unsubFromRoute = async (route, number) => {
  const startingLength = route.subscribers.length;
  const filteredSubscribers = route.subscribers.filter(
    (subscriber) => subscriber !== number
  );

  if (startingLength === filteredSubscribers.length) {
    return `You are not currently subscribed to route: ${route._id}`;
  } else {
    route.subscribers = filteredSubscribers;
    await route.save();
    return `This number has unsubscribed from route: ${route._id} successfully`;
  }
};

//this one takes the object
const formatSubscriber = (subscriber) => {
  let formatted = subscriber.number;

  if (subscriber.number.length === 10) {
    formatted = "+1".concat(subscriber.number);
  } else if (subscriber.number.length === 11 && subscriber.number.indexOf(0)) {
    formatted = "+".concat(subscriber.number);
  }
  return formatted;
};

module.exports = {
  handleReceiveMessage,
  handleSendMessage,
  sendActivationMessage,
  sendUnSubMessage,
  sendUpdateMessage,
  sendWarningMessage,
  sendArrivalMessage,
  sendDeactivationMessage,
  sendCancellationMessage,
  sendHalfwayMessage,
  sendHourAwayMessage,
  sendQuoteMessage,
  formatSubscriber,
};
