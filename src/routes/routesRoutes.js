const express = require("express");
const router = express.Router();
const Route = require("../models/Route");
require("dotenv").config();
const {
  createRoute,
  activateRoute,
  deactivateRoute,
  getRouteDetails,
  getRouteLocation,
  activateRouteOverride,
  deactivateCurrentActiveRoute,
} = require("../service/routesService");
const { verifyJwt } = require("../service/authService");
const { RES_TYPES } = require("../utils/helper");
const {
  validateRouteUpdate,
  validateLocateRoute,
  validateRouteCreation,
} = require("../utils/validator");
const { validationResult } = require("express-validator");
const { formatSubscriber } = require("../service/smsService");
const VerifiedNumber = require("../models/VerifiedNumber");

router.get("/", (req, res) => {
  res.send({ status: 200, message: "Routes endpoint" });
});

router.post("/location", validateLocateRoute, async (req, res) => {
  const { routeId } = req.body;

  const route = await getRouteLocation(routeId);

  if (route) {
    res.send({
      status: 200,
      body: { route: route },
    });
  } else {
    res.send({
      status: 404,
      body: {
        error: RES_TYPES.NOT_FOUND,
      },
    });
  }
});

router.use(verifyJwt);

router.use((req, res, next) => {
  if (!req.user)
    res.send({ status: 401, body: { error: RES_TYPES.UNAUTHORIZED } });
  else next();
});

//refactor to account for subscriber objects
//create and add validator middleware + validator check(use route update route as ref)
router.post("/create", validateRouteCreation, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();

  if (hasError) {
    res.send({ status: 422, body: { message: error.array() } });
  } else {
    const {
      destination,
      subscribers,
      interval,
      routeName,
      active,
      quickRoute,
      deliveryMode,
    } = req.body;

    const result = await createRoute(
      routeName,
      destination,
      subscribers,
      interval,
      quickRoute,
      deliveryMode,
      req.user
    );
    res.send({ status: 201, body: { message: RES_TYPES.CREATED } });
  }
});

router.post("/activate", async (req, res) => {
  const { route, currentLocation, offset } = req.body;

  const result = await activateRoute(route, currentLocation, req.user, offset);

  res.send({
    status: result === RES_TYPES.SUCCESS ? 200 : 409,
    message: result,
  });
});

router.post("/activate/override", async (req, res) => {
  const { route, currentLocation, offset } = req.body;

  const result = await activateRouteOverride(
    route,
    currentLocation,
    req.user,
    offset
  );

  res.send({
    status: result === RES_TYPES.SUCCESS ? 200 : 409,
    message: result,
  });
});

router.post("/deactivate", async (req, res) => {
  const { route, currentLocation, offset } = req.body;

  const result = await deactivateRoute(route, currentLocation, offset);

  if (result === RES_TYPES.SUCCESS) {
    res.send({ status: 200, body: { message: result } });
  } else {
    res.send({ status: 404, body: { message: result } });
  }
});

router.post("/deactivate/current", async (req, res) => {
  const result = await deactivateCurrentActiveRoute(req.user);

  if (result === RES_TYPES.SUCCESS) {
    res.send({ status: 200, body: { message: result } });
  } else {
    res.send({ status: 404, body: { message: result } });
  }
});

router.post("/details", async (req, res) => {
  const { route } = req.body;
  const routeDetails = await getRouteDetails(route);

  if (routeDetails) res.send({ status: 200, body: { message: routeDetails } });
  else res.send({ status: 404, body: { error: RES_TYPES.NOT_FOUND } });
});

//should be put into its own module
router.post("/update", validateRouteUpdate, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();

  if (hasError) {
    res.send({ status: 422, body: { message: error.array() } });
  } else {
    const { name, interval, subscribers, route } = req.body;
    const routeDb = await Route.findById(route).catch((err) =>
      console.log("Could not find route")
    );

    const formattedSubscribers = await Promise.all(
      subscribers.map(async (subscriber) => {
        subscriber = JSON.parse(subscriber);
        //removing special chars and putting 0
        subscriber.number = subscriber.number.replace(/[^0-9+]/g, 0);
        const alreadyExists = await VerifiedNumber.findOne({
          number: subscriber.number,
        }).catch((err) => console.log("Could not find subscriber"));

        if (alreadyExists) {
          alreadyExists.number = formatSubscriber(subscriber);
          await alreadyExists.save();

          return alreadyExists;
        } else {
          return await VerifiedNumber.create({
            number: formatSubscriber(subscriber),
          });
        }
      })
    );

    const formattedInterval = () => {
      if (interval.indexOf("m") !== -1) {
        return Number(interval.replace("m", ""));
      } else {
        return 60;
      }
    };

    if (routeDb) {
      if (routeDb.active) {
        res.send({ status: 409, body: { message: RES_TYPES.ALREADY_ACTIVE } });
      } else {
        routeDb.routeName = name;
        routeDb.interval = formattedInterval();
        routeDb.subscribers = formattedSubscribers;
        await routeDb.save();

        res.send({ status: 204, body: { message: RES_TYPES.UPDATED } });
      }
    } else {
      res.send({ status: 404, body: { message: RES_TYPES.NOT_FOUND } });
    }
  }
});

router.post("/delete", async (req, res) => {
  const { route } = req.body;
  const routeDb = await Route.findById(route).catch((err) =>
    console.log("Could not find route")
  );

  if (routeDb) {
    await Route.deleteOne(routeDb);
    res.send({ status: 204, body: { message: RES_TYPES.DELETED } });
  } else {
    res.send({ status: 404, body: { message: RES_TYPES.NOT_FOUND } });
  }
});

module.exports = router;
