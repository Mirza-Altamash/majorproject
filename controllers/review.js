// Import the Listing and Review models
const Listing = require("../models/listing");
const Review = require("../models/review");

// ------------------- CREATE REVIEW -------------------
module.exports.createReview = async (req, res) => {
    // Find the listing by the ID provided in the URL parameters
    let listing = await Listing.findById(req.params.id);

    // Create a new review object using the data from the request body
    let newReview = new Review(req.body.review);
    // Set the author of the review to the currently logged-in user
    newReview.author = req.user._id;
    
    // Add the new review to the listing's reviews array
    listing.reviews.push(newReview);

    // Save both the new review and the updated listing document
    await newReview.save();
    await listing.save();

    // Show a success flash message and redirect back to the listing page
    req.flash("success", "New review created!");
    res.redirect(`/listings/${listing._id}`);
};

// ------------------- DELETE REVIEW -------------------
module.exports.deleteReview = async (req, res) => {
    let { id, reviewId } = req.params;

    // Use $pull to remove the review ID from the listing's 'reviews' array
    await Listing.findByIdAndUpdate(id, {
        $pull: { reviews: reviewId },
    });

    // Delete the actual review document from the database
    await Review.findByIdAndDelete(reviewId);

    // Show a success flash message and redirect back to the listing page
    req.flash("success", "Review deleted!");
    res.redirect(`/listings/${id}`);
};
