//review logic
const { RES_TYPES } = require("../utils/helper");
require("dotenv").config();
const Review = require("../models/Review");

const createReview = async ({ rating, anon, name, body }) => {
  //logic to create a review
  const newReview = await Review.create({
    rating: rating,
    anon: anon,
    name: name,
    body: body,
  }).catch((err) => console.log("unable to create review"));

  if (newReview) return RES_TYPES.CREATED;
  return RES_TYPES.FAILURE;
};

const getReview = async (reviewId) => {
  //logic to create get the review
};

const getAllReviews = async (page) => {
  const limit = 10;
  const reviews = await Review.find({})
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ updatedAt: -1 })
    .catch((err) => console.log("No reviews found"));
  return reviews;
};

const getFavoritedReviews = async () => {
  //logic to get the favorited reviews, not sure if im going to use
  //an algo to determine reviews or if we are going to manually select
  //our favorite reviews to show
};

const calculateAverage = async () => {
  const reviews = await Review.find({});
  let average = 0;
  const total = reviews.length;

  reviews.forEach((review) => (average += review.rating));

  return { averageRating: average / total, total };
};

module.exports = {
  createReview,
  getFavoritedReviews,
  getReview,
  getAllReviews,
  calculateAverage,
};
