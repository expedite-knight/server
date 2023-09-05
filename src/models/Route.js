const mongoose = require("mongoose");

const RouteSchema = new mongoose.Schema({
  creator: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "User",
  },
  routeName: {
    type: mongoose.SchemaTypes.String,
  },
  destination: {
    type: mongoose.SchemaTypes.String,
  },
  quickRoute: {
    type: mongoose.SchemaTypes.Boolean,
    default: true,
  },
  deliveryMode: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  interval: {
    type: mongoose.SchemaTypes.Number,
  },
  subscribers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "VerifiedNumber",
  },
  halfwaySent: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  hourAwaySent: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  warningSent: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  active: {
    type: mongoose.SchemaTypes.Boolean,
  },
  startingDistance: {
    type: mongoose.SchemaTypes.Number,
  },
  startingDuration: {
    type: mongoose.SchemaTypes.Number,
  },
  startingETA: {
    type: mongoose.SchemaTypes.Number,
  },
  activeLocation: {
    type: {
      lat: mongoose.SchemaTypes.String,
      long: mongoose.SchemaTypes.String,
    },
  },
  delivered: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  updatedAt: {
    type: mongoose.SchemaTypes.Number,
    default: new Date().getTime(),
  },
});

module.exports = mongoose.model("Route", RouteSchema);
