let express = require('express'),
    router = express.Router({mergeParams: true}),
    Destination = require("../models/destination"),
    Comment = require("../models/comment"),
    middleware = require("../middleware")


//COMMENTS ROUTES

router.get("/new", middleware.isLoggedIn, (req, res) => {
    Destination.findById(req.params.id, (err, destination) => {
        if (err) {
            console.log(err);
        } else {
            res.render("comments/new", {
                destination: destination
            })
        }
    })
})

router.post("/", middleware.isLoggedIn, (req, res) => {
    Destination.findById(req.params.id, (err, destination) => {
        if (err) {
            console.log(err);
            res.redirect("/destinations")
        } else {
            Comment.create(req.body.comment, (err, comment) => {
                if (err) {
                    console.log(err);
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.author.headshot = req.user.headshot;
                    comment.save()
                    destination.comments.push(comment);
                    destination.save();
                    req.flash("success", "Comment Added")
                    res.redirect("/destinations/" + destination._id)
                }
            })
        }
    })
})

router.get("/:comment_id/edit", middleware.checkCommentOwnership, (req, res) => {
    Destination.findById(req.params.id, (err, foundDestination) => {
        if(err || !foundDestination){
            req.flash("error", "No Destination Found");
            return res.redirect("back");
        }
        Comment.findById(req.params.comment_id, (err, foundComment) => {
            if(err || !foundComment){
                req.flash("error", "Comment not found");
                res.redirect("back");
            } else {
                res.render("comments/edit", {destination_id: req.params.id, comment: foundComment});
            }
        })
    })
})

router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComments) => {
        if(err){
            res.redirect("back")
        } else {
            res.redirect("/destinations/" + req.params.id);
        }
    })
})

router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndRemove(req.params.comment_id, (err) => {
        if(err){
            res.redirect("back");
        } else {
            req.flash("success", "Comment Deleted")
            res.redirect("/destinations/" + req.params.id)
        }
    })
})
module.exports = router;