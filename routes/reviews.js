var express = require("express");
var router = express.Router({mergeParams: true});
var Destination = require("../models/destination");
var Review = require("../models/review");
var middleware = require("../middleware");

// Reviews Index
router.get("/", function (req, res) {
    Destination.findById(req.params.id).populate({
        path: "reviews",
        options: {sort: {createdAt: -1}} // sorting the populated reviews array to show the latest first
    }).exec(function (err, destination) {
        if (err || !destination) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/index", {destination: destination});
    });
});

// Reviews New
router.get("/new", middleware.isLoggedIn, middleware.checkReviewExistence, function (req, res) {
    // middleware.checkReviewExistence checks if a user already reviewed the destination, only one review per user is allowed
    Destination.findById(req.params.id, function (err, destination) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/new", {destination: destination});

    });
});

// Reviews Create
router.post("/", middleware.isLoggedIn, middleware.checkReviewExistence, function (req, res) {
    //lookup destination using ID
    Destination.findById(req.params.id).populate("reviews").exec(function (err, destination) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Review.create(req.body.review, function (err, review) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            //add author username/id and associated destination to the review
            review.author.id = req.user._id;
            review.author.username = req.user.username;
            review.author.headshot = req.user.headshot;
            review.destination = destination;
            
            //save review
            review.save();
            destination.reviews.push(review);
            // calculate the new average review for the destination
            destination.rating = calculateAverage(destination.reviews);
            //save destination
            destination.save();
            req.flash("success", "Your review has been successfully added.");
            res.redirect('/destinations/' + destination._id);
        });
    });
});

// Reviews Edit
router.get("/:review_id/edit", middleware.checkReviewOwnership, function (req, res) {
    Review.findById(req.params.review_id, function (err, foundReview) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/edit", {destination_id: req.params.id, review: foundReview});
    });
});

// Reviews Update
router.put("/:review_id", middleware.checkReviewOwnership, function (req, res) {
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, {new: true}, function (err, updatedReview) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Destination.findById(req.params.id).populate("reviews").exec(function (err, destination) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate destination average
            destination.rating = calculateAverage(destination.reviews);
            //save changes
            destination.save();
            req.flash("success", "Your review was successfully edited.");
            res.redirect('/destinations/' + destination._id);
        });
    });
});

// Reviews Delete
router.delete("/:review_id", middleware.checkReviewOwnership, function (req, res) {
    Review.findByIdAndRemove(req.params.review_id, function (err) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Destination.findByIdAndUpdate(req.params.id, {$pull: {reviews: req.params.review_id}}, {new: true}).populate("reviews").exec(function (err, destination) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate destination average
            destination.rating = calculateAverage(destination.reviews);
            //save changes
            destination.save();
            req.flash("success", "Your review was deleted successfully.");
            res.redirect("/destinations/" + req.params.id);
        });
    });
});

function calculateAverage(reviews) {
    if (reviews.length === 0) {
        return 0;
    }
    var sum = 0;
    reviews.forEach(function (element) {
        sum += element.rating;
    });
    return sum / reviews.length;
}

module.exports = router;