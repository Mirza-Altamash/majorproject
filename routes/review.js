const express = require("express");
// mergeParams: true is required to access the :id from the parent router (app.js)
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Review = require("../models/review.js");
const Listing = require("../models/listing.js");
const { isloggedin, validateReview, isReviewAuthor} = require("../middleware.js");
const reviewController=require("../controllers/review.js");
const review=require("../models/review.js");



// POST REVIEW ROUTE: Add a new review to a listing
router.post(
    "/",
    isloggedin, // Must be logged in to leave a review
    validateReview,
    wrapAsync(reviewController.createReview));

// DELETE REVIEW ROUTE: Remove a review from a listing
router.delete(
    "/:reviewId",
    isloggedin,
    isReviewAuthor,
     // Must be logged in to delete a review (should also check authorization)
    wrapAsync(reviewController.deleteReview));

module.exports = router;