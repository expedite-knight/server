const express = require("express");
const router = express.Router();
require("dotenv").config();
const { validateReview } = require("../utils/validator");
const { validationResult } = require("express-validator");
const Review = require("../models/Review");
const { createReview } = require("../service/reviewService");

//this will create a new review
router.post("/", validateReview, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();

  if (hasError) {
    res.send({ status: 422, body: { message: error.array() } });
  } else {
    const { name, rating, anon, body } = req.body;

    const res = await createReview({ rating, anon, name, body });
    res.send({ status: 200, body: { message: res } });
  }
});

router.get("/", async (req, res) => {
  const reviews = await Review.find({}).catch((err) =>
    console.log("No reviews found")
  );

  res.send({ status: 200, body: { reviews: reviews } });
});

router.get("/:reviewId", async (req, res) => {
  console.log("param: ", req.params);
  const review = await Review.findById(req.params.reviewId).catch((err) =>
    console.log("could not find review with that id")
  );

  if (review) {
    res.send({ status: 200, body: review });
  } else {
    res.send({ status: 404, body: { error: "review not found" } });
  }
});

module.exports = router;
