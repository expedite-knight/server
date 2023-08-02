const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    firstName: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    lastName: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    password: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    phoneNumber: {
        type: mongoose.SchemaTypes.String,
    },
    routes: {
        type: [mongoose.SchemaTypes.ObjectId],
        ref: "Route",
    },
    clientLocation: {
        type: {
            lat: {
                type: mongoose.SchemaTypes.String,
            },
            long: {
                type: mongoose.SchemaTypes.String,
            },
            updatedAt: {
                type: mongoose.SchemaTypes.Date,
            },
        },
    },
    stripeId: {
        type: mongoose.SchemaTypes.String,
    },
    enabled: {
        type: mongoose.SchemaTypes.Boolean,
        default: true,
    },
    createdAt: {
        type: mongoose.SchemaTypes.Date,
        required: true,
        default: new Date().getTime(),
    },
});

module.exports = mongoose.model("User", UserSchema);
