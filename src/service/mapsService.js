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
      `https://maps.googleapis.com/maps/api/distancematrix/json?departure_time=now&traffic_model=best_guess&origins=${currentLocation}&destinations=${formattedDestination}&key=${MATRIX_API_KEY}`
    ).then(async (res) => {
      console.log("MATRIX RES: ", res);
      const fullDistance = res.data.rows[0].elements[0].distance.text;

      const convertedDistance = () => {
        //if the unit is in km then return the proper conversion
        if (fullDistance.indexOf("km") != -1) {
          const indexOfDistance = fullDistance.indexOf(" ");
          let distanceString = fullDistance.substr(0, indexOfDistance);
          distanceString = distanceString.replaceAll(",", "");
          const distanceNum = Number(distanceString);

          return convertKmToMi(distanceNum);
        } else {
          //if the unit is in m then the user is basically there so trigger
          //the activation procedure
          return 0;
        }
      };

      const fullDuration =
        res.data.rows[0].elements[0].duration_in_traffic.text;
      const indexOfDuration = fullDuration.indexOf(" ");
      const durationString = fullDuration.substr(0, indexOfDuration);
      let durationNum = Number(durationString);

      //if the duration is longer than an hour then it will account for that
      if (fullDuration.indexOf("days") != -1) {
        const days = fullDuration.substring(0, fullDuration.indexOf("days"));
        const hours = fullDuration.substring(
          fullDuration.indexOf("days") + "days".length,
          fullDuration.indexOf("hours")
        );
        const totalInMins = Number(days) * 1440 + Number(hours) * 60;
        durationNum = Number(totalInMins);
      } else if (fullDuration.indexOf("day") != -1) {
        const days = fullDuration.substring(0, fullDuration.indexOf("day"));
        const hours = fullDuration.substring(
          fullDuration.indexOf("day") + "day".length,
          fullDuration.indexOf("hours")
        );
        const totalInMins = Number(days) * 1440 + Number(hours) * 60;
        durationNum = Number(totalInMins);
      } else if (fullDuration.indexOf("hours") != -1) {
        const hours = fullDuration.substring(0, fullDuration.indexOf("hours"));
        const mins = fullDuration.substring(
          fullDuration.indexOf("hours") + "hours".length,
          fullDuration.indexOf("mins")
        );
        const totalInMins = Number(hours) * 60 + Number(mins);
        durationNum = Number(totalInMins);
      } else if (fullDuration.indexOf("hour") != -1) {
        const hours = fullDuration.substring(0, fullDuration.indexOf("hour"));
        const mins = fullDuration.substring(
          fullDuration.indexOf("hour") + "hour".length,
          fullDuration.indexOf("mins")
        );
        const totalInMins = Number(hours) * 60 + Number(mins);
        durationNum = Number(totalInMins);
      }

      //returning that the user has arrived by sending 0 eta which triggers
      //an arrival sequence
      console.log("distance: ", convertedDistance());
      console.log("duration: ", durationNum);
      if (convertedDistance() <= 0.1 || durationNum < 1) {
        return {
          mi: 0,
          min: 0,
          time: formatArrivalTime(durationNum, offset),
        };
      } else {
        return {
          mi: convertedDistance(),
          min: durationNum,
          time: formatArrivalTime(durationNum, offset),
        };
      }
    });
    return eta;
  } catch (err) {
    console.log("Error generating eta: ", err);
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

const formatCurrentDuration = (min) => {
  let etaDurationString = "";

  if (min >= 60) {
    const hours = Math.floor(min / 60);
    const mins = min - hours * 60;
    etaDurationString = hours + " hrs. and " + mins + " mins.";
  } else {
    etaDurationString = min + " mins.";
  }

  return etaDurationString;
};

module.exports = {
  calculateETA,
  formatCurrentDuration,
};
