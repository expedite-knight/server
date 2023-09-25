const Route = require("../models/Route");
const User = require("../models/User");
const VerifiedNumber = require("../models/VerifiedNumber");
const { RES_TYPES } = require("../utils/helper");
const { calculateETA } = require("./mapsService");
const {
  sendActivationMessage,
  sendDeactivationMessage,
  sendCancellationMessage,
  sendPausedMessage,
  sendUnpausedMessage,
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

//we are changing to return the route no matter what even if it is inactive
//change it on the frotnend to show if the route is active or not
const getRouteLocation = async (routeId) => {
  const route = await Route.findById(routeId)
    .populate("activeLocation")
    .catch((err) => console.log(`Could not find route with id: ${routeId}`));

  if (!route) return RES_TYPES.NOT_FOUND;

  return route;
};

const createRoute = async (
  routeName,
  destination,
  subscribers,
  interval,
  quickRoute,
  deliveryMode,
  currentLocation,
  offset,
  client,
  timezone
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

    //work on this, quick routes do not get activated right away
    //we need to send our current locale with this for it to work
    if (route.quickRoute) {
      await activateRoute(route._id, currentLocation, client, offset, timezone);
    }

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
  timezone,
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

    const rawETA = await calculateETA(route, formattedLocation, offset);

    const eta = { ...rawETA, timezone: timezone };

    //storing the starting location may not be required
    //all we need to know on the details page online
    //is what time the driver left, where he is going to
    //and an eta
    route.startingLocation = {
      lat: currentLocation.lat,
      long: currentLocation.long,
    };
    route.startingDistance = eta.mi;
    route.startingDuration = eta.min;
    route.startingOffset = offset;
    route.startingETA = new Date().getTime() + eta.min * 60000;
    route.lastActivatedAt = new Date().getTime();
    route.updatedAt = new Date().getTime();
    route.active = true;
    route.warningSent = false;
    route.halfwaySent = false;
    route.hourAwaySent = false;

    try {
      await route.save();
    } catch (err) {
      console.log("could not save route");
      return RES_TYPES.ERROR;
    }

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
  offset,
  timezone
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
    timezone,
    true
  );

  if (!deactivateRes || overrideRes !== RES_TYPES.SUCCESS) {
    return RES_TYPES.ERROR;
  } else {
    return RES_TYPES.SUCCESS;
  }
};

const deactivateRoute = async (routeId, currentLocation, offset, timezone) => {
  const route = await Route.findById(routeId)
    .populate("creator")
    .catch((res) => console.log("Could not find route"));

  if (!route) RES_TYPES.NOT_FOUND;

  const formattedLocation = JSON.stringify(currentLocation.lat)
    .concat("%2C")
    .concat(JSON.stringify(currentLocation.long));

  const rawETA = await calculateETA(route, formattedLocation, offset);

  const eta = { ...rawETA, timezone: timezone };

  route.subscribers.forEach(
    async (subscriber) => await sendDeactivationMessage(subscriber, route, eta)
  );

  //this might need to be changed
  //to accommodate more stuff
  route.active = false;
  route.warningSent = false;
  route.halfwaySent = false;
  route.hourAwaySent = false;
  route.startingDistance = 0;
  route.startingDuration = 0;
  route.paused = false;
  route.activeLocation = {
    lat: "0",
    long: "0",
  };

  if (route.quickRoute) route.disabled = true;

  await route.save();

  return RES_TYPES.SUCCESS;
};

//we dont need to wait for this because this function should only be used
//when logging out
const deactivateCurrentActiveRoute = async (userId) => {
  const currentUser = await User.findById(userId.user_id)
    .populate("routes")
    .catch(() => console.log("no user found"));

  if (!currentUser) return RES_TYPES.NOT_FOUND;

  const rawActiveRoute = currentUser.routes.filter((route) => route.active);

  const activeRoute = await Route.findById(rawActiveRoute[0]?._id);

  if (!activeRoute) return RES_TYPES.NOT_FOUND;

  activeRoute.active = false;
  activeRoute.warningSent = false;
  activeRoute.halfwaySent = false;
  activeRoute.hourAwaySent = false;
  activeRoute.paused = false;
  activeRoute.startingDistance = 0;
  activeRoute.startingDuration = 0;
  activeRoute.activeLocation = {
    lat: "0",
    long: "0",
  };

  if (activeRoute.quickRoute) activeRoute.disabled = true;

  await activeRoute.save();
  await currentUser.save();

  //do not need to wait here so do not need to wrap in Promise.all syntax
  activeRoute.subscribers.forEach(async (subscriber) => {
    const subscriberDb = await VerifiedNumber.findById(subscriber);
    sendCancellationMessage(subscriberDb, activeRoute);
  });

  return RES_TYPES.SUCCESS;
};

const pauseRoute = async (
  routeId,
  currentLocation,
  client,
  offset,
  timezone
) => {
  const route = await Route.findById(routeId)
    .populate("creator")
    .catch((res) => console.log("Could not find route"));

  if (!route) RES_TYPES.NOT_FOUND;

  const formattedLocation = JSON.stringify(currentLocation.lat)
    .concat("%2C")
    .concat(JSON.stringify(currentLocation.long));

  const rawETA = await calculateETA(route, formattedLocation, offset);

  const eta = { ...rawETA, timezone: timezone };

  route.startingLocation = {
    lat: currentLocation.lat,
    long: currentLocation.long,
  };

  route.paused = true;

  await route.save();

  route.subscribers.forEach(
    async (subscriber) => await sendPausedMessage(subscriber, route, eta)
  );

  return RES_TYPES.SUCCESS;
};

const unpauseRoute = async (
  routeId,
  currentLocation,
  client,
  offset,
  timezone
) => {
  const route = await Route.findById(routeId)
    .populate("creator")
    .catch((res) => console.log("Could not find route"));

  if (!route) RES_TYPES.NOT_FOUND;

  const formattedLocation = JSON.stringify(currentLocation.lat)
    .concat("%2C")
    .concat(JSON.stringify(currentLocation.long));

  const rawETA = await calculateETA(route, formattedLocation, offset);

  const eta = { ...rawETA, timezone: timezone };

  route.startingLocation = {
    lat: currentLocation.lat,
    long: currentLocation.long,
  };
  // route.startingDistance = eta.mi;
  // route.startingDuration = eta.min;
  route.startingETA = new Date().getTime() + eta.min * 60000;
  // route.lastActivatedAt = new Date().getTime();
  route.updatedAt = new Date().getTime();
  route.paused = false;

  await route.save();

  route.subscribers.forEach(
    async (subscriber) => await sendUnpausedMessage(subscriber, route, eta)
  );

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
  pauseRoute,
  unpauseRoute,
  createRoute,
  getRouteDetails,
  getRouteLocation,
};
