const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Route = require("../models/Route");
const { verifyJwt } = require("../service/authService");
const { updateLocation } = require("../service/userService");
const { RES_TYPES } = require("../utils/helper");
require("dotenv").config();

router.get("/", (req, res) => {
  res.send({ status: 200, message: "Users endpoint" });
});

router.use(verifyJwt);

router.get("/details", async (req, res) => {
  const currentUser = await User.findById(req.user.user_id);
  res.send({ status: 200, user: currentUser });
});

router.post("/location/update", async (req, res) => {
  const result = await updateLocation(req, res);

  if (result === RES_TYPES.SUCCESS) {
    res.send({ status: 204, body: { message: result } });
  } else if (result === RES_TYPES.UNAUTHORIZED) {
    res.send({ status: 403, body: { error: result } });
  } else {
    res.send({ status: 200, body: { routes: result } });
  }
});

router.get("/routes", async (req, res) => {
  //this is not working for some reason, look into it tomorrow
  const nonDisabledRoutes = await Route.find({
    creator: req.user.user_id,
    disabled: false,
  }).catch(() => console.log("Could not find any user routes"));

  if (currentUser) {
    res.send({ status: 200, routes: nonDisabledRoutes });
  } else {
    res.send({ status: 404, body: { error: RES_TYPES.NOT_FOUND } });
  }
});

module.exports = router;
