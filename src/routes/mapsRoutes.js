const express = require("express");
const router = express.Router();
require("dotenv").config();
const axios = require("axios");
const { verifyJwt } = require("../service/authService");

router.get("/", (req, res) => {
    res.send({ status: 200, message: "Maps endpoint" });
});

router.get("/calculate", async (req, res) => {
    const { MATRIX_API_KEY } = process.env;
    //remember to format the locations with lat and long EXACLY like this
    const currentLocation = req.body.location || "40.519787%2C-88.999310"; //random default location if none are present
    const destination = req.body.destination || "41.719251%2C-88.203314"; //random default location if none are present

    //in google cloud you should make the api key restricted before you deploy
    //do not have to use a name, lat & long is allowed and preferrable to be honest
    //this returns km so have a util function that converts km to mi
    await axios(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${currentLocation}&destinations=${destination}&key=${MATRIX_API_KEY}`
    ).then((res) => {
        console.log(res.data);
        console.log(res.data.rows[0].elements);
    });
    res.send({ status: 200, body: { message: "calculated distance" } });
});

router.use(verifyJwt);

module.exports = router;
