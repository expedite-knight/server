const Route = require("../models/Route");
const User = require("../models/User");
const { comparePassword } = require("../utils/helper");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { JWT_SECRET, REFRESH_SECRET } = process.env;
const { RES_TYPES } = require("../utils/helper");

//do better user validation
const validateUser = async (email, password) => {
  try {
    if (password.trim() === "") throw new Error("Please enter your password");
    if (email.trim() === "") throw new Error("Please enter your email");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new Error("User not found.");

    if (!comparePassword(password, user.password))
      throw new Error("Incorrect password.");

    return user;
  } catch (err) {
    console.log(err);
    return null;
  }
};

//try changing to 15m
const generateJwt = async (user) => {
  return jwt.sign({ user_id: user._id }, JWT_SECRET, { expiresIn: "1h" });
};

const generateRefreshToken = async (user) => {
  return jwt.sign({ user_id: user._id }, REFRESH_SECRET, { expiresIn: "48h" });
};

//throw an error here maybe?
const verifyJwt = async (req, res, next) => {
  const token =
    req.body.token ||
    req.query.token ||
    req.headers["x-access-token"] ||
    req.headers["authorization"];

  if (!token) {
    console.log("no token presented");
    return res.send({
      status: 403,
      body: { error: RES_TYPES.UNAUTHORIZED },
    });
  } else {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      return next();
    } catch (err) {
      console.log("Invalid token: ", token);
      return res.send({
        status: 401,
        body: { error: RES_TYPES.UNAUTHORIZED },
      });
      //should we also clear the headers too?
    }
  }
};

const verifyRefresh = async (req, res) => {
  const token =
    req.body.token ||
    req.query.token ||
    req.headers["x-access-token"] ||
    req.headers["authorization"];

  if (!token) {
    console.log("no refresh token presented");
    return RES_TYPES.UNAUTHORIZED;
  }
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    req.user = decoded;

    //------error is thrown here----------
    const jwtToken = await generateJwt({ _id: decoded.user_id });
    //yeah there is no req.user so we need to extract req.user from the
    //refresh token, take the id from the decoded var i think
    const refreshToken = await generateRefreshToken({ _id: decoded.user_id });
    //------------------------------------

    return { jwtToken: jwtToken, refreshToken: refreshToken };
  } catch (err) {
    console.log("Invalid refresh token.");
    return RES_TYPES.UNAUTHORIZED;
  }
};

const logoutUser = async (req, res) => {
  //not good enough, we need to destroy the token(expire it?)
  return RES_TYPES.SUCCESS;
};

const handleUserUpdate = async (req, res) => {
  return null;
};

module.exports = {
  validateUser,
  generateJwt,
  verifyJwt,
  verifyRefresh,
  logoutUser,
  generateRefreshToken,
};
