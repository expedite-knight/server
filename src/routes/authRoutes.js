const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");
const { hashPassword } = require("../utils/helper");
const {
  validateUser,
  generateJwt,
  verifyJwt,
  logoutUser,
  generateRefreshToken,
  verifyRefresh,
} = require("../service/authService");
require("dotenv").config();
const {
  validateLogin,
  validateRegistration,
  validateUserUpdate,
} = require("../utils/validator");
const { validationResult } = require("express-validator");
const { RES_TYPES } = require("../utils/helper");

router.post("/login", validateLogin, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();

  if (hasError) {
    res.send({ status: 422, body: { message: error.array() } });
  } else {
    const { email, password } = req.body;
    const user = await validateUser(email, password);

    if (!user) res.send({ status: 400, body: { message: "unauthorized" } });
    else {
      const token = await generateJwt(user);
      const refreshToken = await generateRefreshToken(user);

      res.send({
        status: 200,
        body: { jwtToken: token, refreshToken: refreshToken },
      });
    }
  }
});

router.get("/verify", verifyJwt, async (req, res) => {
  res.send({ status: 200, body: { message: RES_TYPES.AUTHORIZED } });
});

router.get("/verify/refresh", async (req, res) => {
  const result = await verifyRefresh(req, res);
  if (result !== RES_TYPES.UNAUTHORIZED) {
    res.send({ status: 200, body: result });
  } else {
    res.send({ status: 401, bdoy: { error: "Token invalid" } });
  }
});

router.post("/logout", async (req, res, next) => {
  const result = await logoutUser(req, res);
  res.send({
    status: 200,
    body: { message: result },
  });
});

//when someone registers verify their number automatically too
router.post("/register", validateRegistration, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();

  if (hasError) {
    res.send({ status: 422, body: { message: error.array() } });
  } else {
    const { email, firstName, lastName, password, number } = req.body;
    if (!email || !firstName || !lastName || !password || !number)
      res.send({ status: 401, message: "all fields requried" });

    const alreadyExists = await User.findOne({ email: email }).catch((err) =>
      console.log("Email not already taken")
    );

    if (!alreadyExists) {
      const hashedPassword = hashPassword(req.body.password);

      const user = await User.create({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        phoneNumber: number,
      });

      res.send({ status: 200, body: { message: RES_TYPES.CREATED } });
    } else {
      res.send({ status: 409, body: { message: RES_TYPES.ALREADY_ACTIVE } });
    }
  }
});

router.use(verifyJwt);

//all this logic could be in its own mod but who cares lol
router.put("/update", validateUserUpdate, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();
  const { firstName, lastName, password, number } = req.body;

  if (
    (hasError && password.trim() !== "") ||
    firstName.trim() == "" ||
    lastName.trim() == ""
  ) {
    res.send({ status: 422, body: { error: error.array() } });
  } else {
    const currentUser = await User.findById(req.user.user_id).catch((err) =>
      console.log("Could not find user")
    );
    currentUser.firstName = firstName;
    currentUser.lastName = lastName;
    number ? (currentUser.phoneNumber = number) : null;

    //if password is empty then keep the og password
    if (password.trim() !== "") {
      const hashedPassword = hashPassword(password);
      currentUser.password = hashedPassword;
    }

    await currentUser.save();

    res.send({ status: 204, body: { message: RES_TYPES.UPDATED } });
  }
});

router.put("/delete", async (req, res) => {
  const currentUser = await User.findById(req.user.user_id).catch((err) =>
    console.log("Could not find user")
  );

  if (currentUser) {
    //if password is empty then keep the og password
    await User.deleteOne(currentUser);

    res.send({ status: 204, body: { message: RES_TYPES.UPDATED } });
  } else {
    res.send({ status: 204, body: { message: RES_TYPES.UNAUTHORIZED } });
  }
});

module.exports = router;
