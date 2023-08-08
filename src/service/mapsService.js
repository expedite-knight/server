const express = require("express");
const router = express.Router();
require("dotenv").config();
const axios = require("axios");
const { verifyJwt } = require("../service/authService");
const moment = require("moment/moment");
const { RES_TYPES } = require("../utils/helper");

const calculateETA = async (route, currentLocation, offset) => {
  const { MATRIX_API_KEY } = process.env;

  const formattedDestination = route.destination.replaceAll(" ", "%20");

  try {
    const eta = await axios(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${currentLocation}&destinations=${formattedDestination}&key=${MATRIX_API_KEY}`
    ).then(async (res) => {
      const fullDistance = res.data.rows[0].elements[0].distance.text;
      const indexOfDistance = fullDistance.indexOf(" ");
      const distanceString = fullDistance.substr(0, indexOfDistance);
      const distanceNum = Number(distanceString);

      const fullDuration =
        res.data.rows[0].elements[0].duration_in_traffic.text;
      const indexOfDuration = fullDuration.indexOf(" ");
      const durationString = fullDuration.substr(0, indexOfDuration);
      const durationNum = Number(durationString);

      if (convertKmToMi(distanceNum) <= 0.05 || durationNum <= 1) {
        return {
          mi: 0,
          min: 0,
          time: formatArrivalTime(durationNum, offset),
        };
      } else {
        return {
          mi: convertKmToMi(distanceNum),
          min: durationNum,
          time: formatArrivalTime(durationNum, offset),
        };
      }
    });
    return eta;
  } catch (err) {
    console.log("Err generating ETA: ", err);
    return RES_TYPES.ERROR;
  }
};

const convertKmToMi = (distanceKm) => {
  return (distanceKm * 0.62137119).toFixed(2);
};

const formatArrivalTime = (duration, offset) => {
  const arrivalTimeInMS = new Date().getTime() + duration * 60000;
  const arrivalTime = moment(arrivalTimeInMS).utcOffset(-offset).format("LT");
  return arrivalTime;
};

module.exports = {
  calculateETA,
};
