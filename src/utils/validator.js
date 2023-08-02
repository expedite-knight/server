const { check } = require("express-validator");

const validateLogin = [
  check("email", "Email Must Be a Valid Email Address")
    .notEmpty()
    .isEmail()
    .trim()
    .escape()
    .normalizeEmail(),
  check("password")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Password Must be Atleast 8 Characters Long")
    .trim()
    .escape(),
];

const validateRegistration = [
  check("email", "Email Must Be a Valid Email Address")
    .notEmpty()
    .isEmail()
    .trim()
    .escape()
    .normalizeEmail(),
  check("password")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Password Must Be at Least 8 Characters")
    .matches("[0-9]")
    .withMessage("Password Must Contain a Number")
    .matches("[A-Z]")
    .withMessage("Password Must Contain an Uppercase Letter")
    .trim()
    .escape(),
  check("firstName", "first name cannot be empty").notEmpty().trim().escape(),
  check("lastName", "last name cannot be empty").notEmpty().trim().escape(),
  check("number", "number cannot be empty").optional().trim().escape(),
];

const validateContactForm = [
  check("item", "item name cannot be empty").notEmpty().trim().escape(),
  check("length", "length cannot be empty")
    .notEmpty()
    .isNumeric()
    .trim()
    .escape(),
  check("width", "width cannot be empty")
    .notEmpty()
    .isNumeric()
    .trim()
    .escape(),
  check("height", "height cannot be empty")
    .notEmpty()
    .isNumeric()
    .trim()
    .escape(),
  check("weight", "weight cannot be empty")
    .notEmpty()
    .isNumeric()
    .trim()
    .escape(),
  check("pickup", "pickup cannot be empty").notEmpty().trim().escape(),
  check("dropoff", "dropoff cannot be empty").notEmpty().trim().escape(),
  check("name", "name cannot be empty").notEmpty().trim().escape(),
  check("email", "email cannot be empty").notEmpty().isEmail().trim().escape(),
  check("number", "item cannot be empty")
    .notEmpty()
    .isNumeric()
    .trim()
    .escape(),
  check("liftgate", "liftgate cannot be empty").notEmpty().trim().escape(),
  check("onPallet", "On pallet cannot be empty").notEmpty().trim().escape(),
];

const validateAnalytics = [
  check("page", "page must be provided").notEmpty().trim().escape(),
];

const validateUserUpdate = [
  check("password")
    .notEmpty()
    .isLength({ min: 8 })
    .withMessage("Password Must Be at Least 8 Characters")
    .matches("[0-9]")
    .withMessage("Password Must Contain a Number")
    .matches("[A-Z]")
    .withMessage("Password Must Contain an Uppercase Letter")
    .trim()
    .escape(),
  check("firstName", "first name cannot be empty").notEmpty().trim().escape(),
  check("lastName", "first name cannot be empty").notEmpty().trim().escape(),
  check("number", "number cannot be empty").optional().trim().escape(),
];

const validateRouteUpdate = [
  check("name", "name cannot be empty").notEmpty().trim().escape(),
  check("interval", "name cannot be empty").notEmpty().trim().escape(),
  check("subscribers", "name cannot be empty").optional().trim(),
];

const validateRouteCreation = [
  check("routeName", "Route name cannot be empty").notEmpty().trim().escape(),
  check("destination", "Destination cannot be empty")
    .notEmpty()
    .escape()
    .replace(",", ""),
  check("interval", "Please select an interval").notEmpty().trim().escape(),
  check("subscribers", "Subscribers need to be in right format ")
    .optional()
    .trim(),
];

const validateLocateRoute = [
  check("routeId", "Not a valid input").notEmpty().trim().escape(),
];

module.exports = {
  validateLogin,
  validateRegistration,
  validateContactForm,
  validateAnalytics,
  validateUserUpdate,
  validateRouteUpdate,
  validateLocateRoute,
  validateRouteCreation,
};
