const User = require("../models/User");
const Route = require("../models/Route");
const {
  sendUpdateMessage,
  sendWarningMessage,
  sendArrivalMessage,
  sendHalfwayMessage,
  sendHourAwayMessage,
  sendHourLateMessage,
} = require("../service/smsService");
const { calculateETA } = require("../service/mapsService");
const { RES_TYPES } = require("../utils/helper");
require("dotenv").config();

const updateLocation = async (req, res) => {
  const client = await User.findById(req?.user?.user_id)
    .populate("routes")
    .catch((err) => {
      console.log("Could not find user.");
    });

  if (!client) return RES_TYPES.UNAUTHORIZED;

  const clientRoutes = client.routes.filter((route) => route.active);

  if (clientRoutes.length >= 1) {
    const activeRoute = await Route.findById(clientRoutes[0]._id)
      .populate("creator")
      .catch((err) => console.log("Could not find route."));

    activeRoute.activeLocation = {
      lat: req.body.lat,
      long: req.body.long,
    };

    await activeRoute.save();

    const formattedLocation = JSON.stringify(req.body.lat)
      .concat("%2C")
      .concat(JSON.stringify(req.body.long));

    const eta = await calculateETA(
      activeRoute,
      formattedLocation,
      req.body.offset
    );

    //if client has arrived(happens in delivery mode or not)
    if (eta.min === 0 || eta.mi === 0) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendArrivalMessage(subscriber, activeRoute, eta)
      );

      //if the route was quick it will be deleted
      if (activeRoute.quickRoute) {
        await Route.deleteOne(activeRoute._id).catch((err) =>
          console.log("ERROR DELETING: ", err)
        );
      } else {
        activeRoute.activeLocation = {
          lat: "0",
          long: "0",
        };

        activeRoute.active = false;
        activeRoute.warningSent = false;
        activeRoute.halfwaySent = false;
        activeRoute.hourAwaySent = false;
        activeRoute.startingDistance = 0;
        activeRoute.startingDuration = 0;

        await activeRoute.save();
      }

      const updatedRoutes = client.routes.map((route) => {
        route.active = false;
        return route;
      });
      return updatedRoutes;

      //if client is 10 mins out(happens in delivery mode or not)
    } else if (eta.min <= 10 && !activeRoute.warningSent) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendWarningMessage(subscriber, activeRoute, eta)
      );

      activeRoute.warningSent = true;
      activeRoute.updatedAt = new Date().getTime();
      await activeRoute.save();

      //normal update message if interval is met and NOT in delivery mode
    } else if (
      activeRoute.updatedAt + 1000 * 60 * activeRoute.interval <
        new Date().getTime() &&
      !activeRoute.deliveryMode
    ) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendUpdateMessage(subscriber, activeRoute, eta)
      );

      activeRoute.updatedAt = new Date().getTime();
      await activeRoute.save();

      //Delivery Mode: hour away message, ignore if the route is under an hour though
    } else if (
      activeRoute.deliveryMode &&
      eta.min <= 60 &&
      !activeRoute.hourAwaySent &&
      activeRoute.startingDuration > 60
    ) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendHourAwayMessage(subscriber, activeRoute, eta)
      );

      activeRoute.hourAwaySent = true;
      activeRoute.updatedAt = new Date().getTime();
      await activeRoute.save();

      //Delivery Mode: if client is halfway there and halfway message has not been sent yet
    } else if (
      activeRoute.deliveryMode &&
      activeRoute.startingDistance / 2 >= eta.mi &&
      !activeRoute.halfwaySent
    ) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendHalfwayMessage(subscriber, activeRoute, eta)
      );

      activeRoute.halfwaySent = true;
      activeRoute.updatedAt = new Date().getTime();
      await activeRoute.save();

      //Delivery Mode: if client is over halfway and eta changes by over an hour
    } else if (
      activeRoute.deliveryMode &&
      activeRoute.halfwaySent &&
      activeRoute.startingETA + 60 * 60000 <=
        new Date().getTime() + eta.min * 60000
    ) {
      activeRoute.subscribers.forEach(async (subsriber) => {
        await sendHourLateMessage(subsriber, activeRoute, eta);
      });
      //dont know if this is the right way to do it or if it works so TEST
      activeRoute.startingETA = new Date().getTime() + eta.min * 60000;

      await activeRoute.save();
    } else {
      console.log("No relevant intervals have been met.");
      return RES_TYPES.SUCCESS;
    }
  } else {
    console.log("Client has no active routes");
    return RES_TYPES.SUCCESS;
  }

  return RES_TYPES.SUCCESS;
};

module.exports = {
  updateLocation,
};
