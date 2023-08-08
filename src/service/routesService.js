const Route = require("../models/Route");
const User = require("../models/User");
const VerifiedNumber = require("../models/VerifiedNumber");
const { RES_TYPES } = require("../utils/helper");
const { calculateETA } = require("./mapsService");
const {
  sendActivationMessage,
  sendDeactivationMessage,
  sendCancellationMessage,
} = require("./smsService");
require("dotenv").config();

const getRouteDetails = async (routeId) => {
  const route = await Route.findById(routeId)
    .populate("activeLocation")
    .populate("creator")
    .populate("subscribers")
    .catch((err) => console.log(`Could not find route with id: ${routeId}`));

  return route;
};

const getRouteLocation = async (routeId) => {
  const route = await Route.findById(routeId)
    .populate("activeLocation")
    .catch((err) => console.log(`Could not find route with id: ${routeId}`));

  if (route?.active) {
    return route;
  } else {
    return null;
  }
};

const createRoute = async (
  routeName,
  destination,
  subscribers,
  interval,
  quickRoute,
  deliveryMode,
  client
) => {
  const currentUser = await User.findById(client.user_id).catch((err) =>
    console.log("Could not find user")
  );
  if (!currentUser) {
    return RES_TYPES.UNAUTHORIZED;
  } else {
    const formattedDestination = destination.replace(",", "");

    const formattedSubscribers = subscribers.map((subscriber) => {
      subscriber = JSON.parse(subscriber);
      subscriber.number = formatSubscriber(subscriber.number);
      return subscriber;
    });

    const formattedInterval = () => {
      if (interval.indexOf("m") !== -1) {
        return Number(interval.replace("m", ""));
      } else {
        return 60;
      }
    };

    const verifiedSubscribers = await Promise.all(
      formattedSubscribers.map(async (subscriber) => {
        //removing special chars and putting a 0
        subscriber.number = subscriber.number.replace(/[^0-9+]/g, 0);
        const alreadyExists = await VerifiedNumber.findOne({
          number: subscriber.number,
        }).catch((err) => console.log("Subscriber does not exist yet."));

        if (alreadyExists) {
          return alreadyExists;
        }

        const verifiedNumber = await VerifiedNumber.create({
          number: subscriber.number,
        });

        return verifiedNumber;
      })
    );

    const route = await Route.create({
      routeName,
      interval: formattedInterval(),
      destination: formattedDestination,
      subscribers: verifiedSubscribers,
      creator: currentUser,
      quickRoute: quickRoute,
      active: quickRoute,
      deliveryMode: deliveryMode,
    }).catch((err) => console.log("Error creating route: ", err));

    currentUser.routes.push(route);
    await currentUser.save();

    return RES_TYPES.CREATED;
  }
};

const activateRoute = async (
  routeId,
  currentLocation,
  user,
  offset,
  override
) => {
  const client = await User.findById(user.user_id)
    .populate("routes")
    .catch((err) => {
      console.log("Could not find user.");
    });

  if (!client) return RES_TYPES.UNAUTHORIZED;

  const alreadyActive = client.routes.filter((route) => route.active);

  //with the override it shouldnt matter if a route is active because it will deactivate it
  if (alreadyActive.length <= 0 || override) {
    const route = await Route.findById(routeId)
      .populate("creator")
      .populate("subscribers")
      .catch((res) => console.log("No already active routes"));

    const formattedLocation = JSON.stringify(currentLocation.lat)
      .concat("%2C")
      .concat(JSON.stringify(currentLocation.long));

    const eta = await calculateETA(route, formattedLocation, offset);

    route.startingDistance = eta.mi;
    route.startingDistance = eta.min;
    route.updatedAt = new Date().getTime();
    route.active = true;
    route.warningSent = false;
    route.halfwaySent = false;
    route.hourAwaySent = false;

    await route.save();

    route.subscribers.forEach(
      async (subscriber) => await sendActivationMessage(subscriber, route, eta)
    );

    return RES_TYPES.SUCCESS;
  } else {
    return RES_TYPES.ALREADY_ACTIVE;
  }
};

const activateRouteOverride = async (
  routeId,
  currentLocation,
  user,
  offset
) => {
  const client = await User.findById(user.user_id)
    .populate("routes")
    .catch((err) => {
      console.log("Could not find user.");
    });

  if (!client) return RES_TYPES.UNAUTHORIZED;

  const alreadyActiveArray = client.routes.filter((route) => route.active);

  //deactivating the active route
  const deactivateRes = await deactivateRoute(
    alreadyActiveArray[0]._id,
    currentLocation,
    offset
  );

  //activating the overriding route
  const overrideRes = await activateRoute(
    routeId,
    currentLocation,
    user,
    offset,
    true
  );

  if (!deactivateRes || overrideRes !== RES_TYPES.SUCCESS) {
    return RES_TYPES.ERROR;
  } else {
    return RES_TYPES.SUCCESS;
  }
};

const deactivateRoute = async (routeId, currentLocation, offset) => {
  const route = await Route.findById(routeId)
    .populate("creator")
    .catch((res) => console.log("Could not find route"));

  if (!route) RES_TYPES.NOT_FOUND;

  const formattedLocation = JSON.stringify(currentLocation.lat)
    .concat("%2C")
    .concat(JSON.stringify(currentLocation.long));

  const eta = await calculateETA(route, formattedLocation, offset);

  route.subscribers.forEach(
    async (subscriber) => await sendDeactivationMessage(subscriber, route, eta)
  );

  route.active = false;
  route.warningSent = false;
  route.halfwaySent = false;
  route.hourAwaySent = false;
  route.startingDistance = 0;
  route.startingDuration = 0;
  route.activeLocation = {
    lat: "0",
    long: "0",
  };

  await route.save();

  return RES_TYPES.SUCCESS;
};

//we dont need to wait for this because this function should only be used
//when logging out
const deactivateCurrentActiveRoute = async (userId) => {
  const activeRoute = await Route.findOne({
    creator: userId.user_id,
    active: true,
  })
    .populate("creator")
    .catch((err) => console.log("No active routes"));

  if (!activeRoute) return RES_TYPES.NOT_FOUND;
  activeRoute.active = false;
  await activeRoute.save();

  //do not need to wait here so do not need to wrap in Promise.all syntax
  activeRoute.subscribers.forEach(async (subscriber) => {
    const subscriberDb = await VerifiedNumber.findById(subscriber);
    sendCancellationMessage(subscriberDb, activeRoute);
  });

  return RES_TYPES.SUCCESS;
};

//this one takes the string
const formatSubscriber = (subscriber) => {
  let formatted = subscriber;

  if (subscriber.length === 10) {
    formatted = "+1".concat(subscriber);
  } else if (subscriber.length === 11 && subscriber.indexOf(0)) {
    formatted = "+".concat(subscriber);
  }
  return formatted;
};

module.exports = {
  activateRoute,
  activateRouteOverride,
  deactivateRoute,
  deactivateCurrentActiveRoute,
  createRoute,
  getRouteDetails,
  getRouteLocation,
};
