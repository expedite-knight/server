const mongoose = require("mongoose");

//might not even need to save these in a db
const QuoteSchema = new mongoose.Schema({
    item: {
        type: mongoose.SchemaTypes.String,
    },
    pickUpAddress: {
        type: mongoose.SchemaTypes.String,
    },
    dropOffAddress: {
        type: mongoose.SchemaTypes.String,
    },
    clientName: {
        type: mongoose.SchemaTypes.String,
    },
    clientEmail: {
        type: mongoose.SchemaTypes.String,
    },
    clientNumber: {
        type: mongoose.SchemaTypes.String,
    },
    updatedAt: {
        type: mongoose.SchemaTypes.Number,
        default: new Date().getTime(),
    },
});

module.exports = mongoose.model("Quote", QuoteSchema);
