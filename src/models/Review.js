const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  rating: {
    type: mongoose.SchemaTypes.Number,
  },
  body: {
    type: mongoose.SchemaTypes.String,
    required: false,
  },
  name: {
    type: mongoose.SchemaTypes.String,
  },
  anon: {
    type: mongoose.SchemaTypes.Boolean,
    default: true,
  },
  favorite: {
    type: mongoose.SchemaTypes.Boolean,
    default: false,
  },
  updatedAt: {
    type: mongoose.SchemaTypes.Number,
    default: new Date().getTime(),
  },
});

module.exports = mongoose.model("Review", ReviewSchema);
