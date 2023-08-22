const Route = require("../models/Route");
const User = require("../models/User");
const { comparePassword } = require("../utils/helper");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { JWT_SECRET } = process.env;
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

//in the example he saves the token to the user but idk why youd do that
//change the expiration time to 1h later
const generateJwt = async (user) => {
  return jwt.sign({ user_id: user._id }, JWT_SECRET, { expiresIn: "24h" });
};

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
  }
  try {
    console.log("decoding token: ", token);
    console.log("secret: ", JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("decoded: ", decoded);
    req.user = decoded;
  } catch (err) {
    console.log("Invalid token.");
    return res.send({
      status: 401,
      body: { error: RES_TYPES.UNAUTHORIZED },
    });
    //should we also clear the headers too?
  }
  return next();
};

const logoutUser = async (req, res) => {
  //not good enough, we need to destroy the token(expire it?)
  return res;
};

const handleUserUpdate = async (req, res) => {
  return null;
};

module.exports = {
  validateUser,
  generateJwt,
  verifyJwt,
  logoutUser,
};
