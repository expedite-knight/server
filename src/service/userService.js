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

  //look for client routes that are active
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

    const rawETA = await calculateETA(
      activeRoute,
      formattedLocation,
      req.body.offset
    );

    if (rawETA === RES_TYPES.ERROR) return RES_TYPES.ERROR;

    const eta = { ...rawETA, timezone: req.body.timezone };

    //timezone offsets go from lower number on the right and get to higher
    //numbers on the left so new york is +4 and nashville is +5
    //nashville is +5 but 1pm
    //new york is +4 but 2pm

    //so if the current offset is greater than the starting offset you
    //subtract (an hour)*(difference between current and starting) from the
    //starting eta

    //if the current offset is less than the starting then you add
    //(an hour)*(difference between current and starting) to the starting eta

    //this should now account for timezone changes when detecting if someone is
    //gonna be late now

    if (activeRoute.startingOffset > req.body.offset) {
      activeRoute.startingETA =
        activeRoute.startingETA +
        60 * 60000 * (activeRoute.startingOffset - req.body.offset);
    } else if (activeRoute.startingOffset < req.body.offset) {
      activeRoute.startingETA =
        activeRoute.startingETA -
        60 * 60000 * (activeRoute.startingOffset - req.body.offset);
    }

    //test this, basically if a user is within 1 distance of their
    //target location for 6 ticks/3 mins then they have arrived
    //this can be changed later on
    if (eta.mi <= 1 && activeRoute?.arrivalCounter >= 6) {
      eta.min = 0;
      eta.mi = 0;
    } else if (eta.mi <= 1) {
      console.log("adding to counter");
      //just incase the value is undefined
      activeRoute.arrivalCounter
        ? (activeRoute.arrivalCounter += 1)
        : (activeRoute.arrivalCounter = 1);
      await activeRoute.save();
    }

    //if client has arrived(happens in delivery mode or not or paused)
    if (eta.min === 0 || eta.mi === 0) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendArrivalMessage(subscriber, activeRoute, eta)
      );

      activeRoute.activeLocation = {
        lat: "0",
        long: "0",
      };

      activeRoute.active = false;
      activeRoute.warningSent = false;
      activeRoute.halfwaySent = false;
      activeRoute.hourAwaySent = false;
      activeRoute.paused = false;
      activeRoute.startingDistance = 0;
      activeRoute.startingDuration = 0;
      activeRoute.arrivalTime = new Date().getTime();
      activeRoute.startingLocation.lat = 0;
      activeRoute.startingLocation.long = 0;
      if (activeRoute.deliveryMode) activeRoute.delivered = true;
      if (activeRoute.quickRoute) activeRoute.disabled = true;

      await activeRoute.save();

      const updatedRoutes = client.routes.filter((route) => {
        if (!route.quickRoute) return route;
      });

      return updatedRoutes;

      //if the route is paused skip everything else
    } else if (activeRoute.paused) {
      console.log("User has an active route but it is currently paused");

      //if client is 10 mins out(happens in delivery mode or not) but not if route is shorter than 10 mins
    } else if (
      eta.min <= 10 &&
      !activeRoute.warningSent &&
      activeRoute.startingDuration > 10
    ) {
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

      //Delivery Mode: hour away message, ignore if the route is under 3 hours though
    } else if (
      activeRoute.deliveryMode &&
      eta.min <= 60 &&
      !activeRoute.hourAwaySent &&
      activeRoute.startingDuration >= 180
    ) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendHourAwayMessage(subscriber, activeRoute, eta)
      );

      activeRoute.hourAwaySent = true;
      activeRoute.updatedAt = new Date().getTime();
      await activeRoute.save();

      //Delivery Mode: if client is halfway there and halfway message has not been sent yet but ignore if trip is shorter than 30 mins
    } else if (
      activeRoute.deliveryMode &&
      activeRoute.startingDistance / 2 >= eta.mi &&
      !activeRoute.halfwaySent &&
      eta.min >= 30
    ) {
      activeRoute.subscribers.forEach(
        async (subscriber) =>
          await sendHalfwayMessage(subscriber, activeRoute, eta)
      );

      activeRoute.halfwaySent = true;
      activeRoute.updatedAt = new Date().getTime();
      activeRoute.startingETA = Number(
        new Date().getTime() + (eta.min ? eta.min : 1) * 60000
      );

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
    console.log("Client has no active or unpaused routes");
    return RES_TYPES.SUCCESS;
  }

  return RES_TYPES.SUCCESS;
};

module.exports = {
  updateLocation,
};
