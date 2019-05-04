let middlewareObject = {},
    Destination = require("../models/destination"),
    Comment = require("../models/comment"),
    Review = require("../models/review")

middlewareObject.checkDestinationOwnership = (req, res, next) => {
    if (req.isAuthenticated()) {
        Destination.findById(req.params.id, (err, foundDestination) => {
            if (err || !foundDestination) {
                req.flash("error", "Destination not found");
                res.redirect("back")
            } else {
                if(foundDestination.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();
                } else {
                    req.flash("error", "You do not have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You must be logged in to do that");
        res.redirect("back");
    }
}

middlewareObject.checkCommentOwnership = (req, res, next) => {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, (err, foundComment) => {
            if (err) {
                req.flash("error", "You need to be logged in")
                res.redirect("back")
            } else {
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();
                } else {
                    req.flash("You do not have permission to do that")
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
};

middlewareObject.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Please Login First")
    res.redirect("/login");
}

middlewareObject.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObject.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Destination.findById(req.params.id).populate("reviews").exec(function (err, foundDestination) {
            if (err || !foundDestination) {
                req.flash("error", "Destination not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundDestination.reviews
                var foundUserReview = foundDestination.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/destinations/" + foundDestination._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};



module.exports = middlewareObject