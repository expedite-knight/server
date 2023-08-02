const mongoose = require("mongoose");

//will have one for each page and just add to it 
const AnalyticScema = new mongoose.Schema({
    page: {
        type: mongoose.SchemaTypes.String,
    },
    numOfViews: {
        type: mongoose.SchemaTypes.Number,
        default: 0,
    },
    updatedAt: {
        type: mongoose.SchemaTypes.Number,
        default: new Date().getTime(),
    },
});

module.exports = mongoose.model("Analytic", AnalyticScema);
