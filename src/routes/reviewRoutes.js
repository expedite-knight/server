const express = require("express");
const router = express.Router();
require("dotenv").config();
const { validateReview } = require("../utils/validator");
const { validationResult } = require("express-validator");
const Review = require("../models/Review");
const {
  createReview,
  getAllReviews,
  calculateAverage,
} = require("../service/reviewService");
const { RES_TYPES } = require("../utils/helper");

//this will create a new review
router.post("/", validateReview, async (req, res) => {
  const error = validationResult(req).formatWith(({ msg }) => msg);
  const hasError = !error.isEmpty();

  if (hasError && !req.body.anon && req.body.name?.trim() === "") {
    res.send({ status: 422, body: { message: error.array() } });
  } else {
    const { name, rating, anon, body } = req.body;

    const result = await createReview({ rating, anon, name, body });
    res.send({ status: 200, body: { message: result } });
  }
});

//this will get all reviews
router.get("/", async (req, res) => {
  const { filter, page } = req.query;

  if (page) {
    const reviews = await getAllReviews(JSON.parse(page), JSON.parse(filter));
    const { averageRating, total } = await calculateAverage();
    res.send({ status: 200, body: { reviews, averageRating, total } });
  } else {
    res.send({ status: 404, body: { error: RES_TYPES.NOT_FOUND } });
  }
});

router.get("/favorites", async (req, res) => {
  const reviews = await Review.find({ rating: 5 })
    .limit(3)
    .catch((err) => console.log("Could not find any reviews of that rating"));
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
