const mongoose = require("mongoose");

//change subscribers to be verified numbers
//when creating a new route if a number is not verified just
//create a new verified number but have it as !verified
//on the app show an icon on the route to display someones
//number is not verified, when you click on details it will
//show you exactly which numbers are verified and which are not
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
  interval: {
    type: mongoose.SchemaTypes.Number,
  },
  subscribers: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "VerifiedNumber",
  },
  warningSent: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  active: {
    type: mongoose.SchemaTypes.Boolean,
  },
  activeLocation: {
    type: {
      lat: mongoose.SchemaTypes.String,
      long: mongoose.SchemaTypes.String,
    },
  },
  updatedAt: {
    type: mongoose.SchemaTypes.Number,
    default: new Date().getTime(),
  },
});

module.exports = mongoose.model("Route", RouteSchema);
