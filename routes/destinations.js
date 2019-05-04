let express = require('express'),
    router = express.Router(),
    Destination = require("../models/destination"),
    middleware = require("../middleware"),
    Review = require("../models/review")

var NodeGeocoder = require('node-geocoder');

var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);

var multer = require('multer');
var storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({
    storage: storage,
    fileFilter: imageFilter
})

var cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: 'marcusburnett8',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/", function (req, res) {
    var perPage = 9;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Destination.find({
            name: regex
        }).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allDestinations) {
            Destination.count({
                name: regex
            }).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if (allDestinations.length < 1) {
                        noMatch = "No destinations match that query, please try again.";
                    }
                    res.render("destinations/index", {
                        destinations: allDestinations,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all destinations from DB
        Destination.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allDestinations) {
            Destination.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("destinations/index", {
                        destinations: allDestinations,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false
                    });
                }
            });
        });
    }
});


//CREATE - add new destination to DB

router.post("/", middleware.isLoggedIn, upload.single('image'), function (req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function (err, result) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        geocoder.geocode(req.body.location, function (err, data) {
            if (err || !data.length) {
                req.flash('error', 'Invalid address');
                return res.redirect('back');
            }
            req.body.destination.lat = data[0].latitude;
            req.body.destination.lng = data[0].longitude;
            req.body.destination.location = data[0].formattedAddress;

            // add cloudinary url for the image to the destination object under image property
            req.body.destination.image = result.secure_url;
            // add image's public_id to destination object
            req.body.destination.imageId = result.public_id;
            // add author to destination
            req.body.destination.author = {
                id: req.user._id,
                username: req.user.username,
                headshot: req.user.headshot
            }
            Destination.create(req.body.destination, function (err, destination) {
                if (err) {
                    req.flash('error', err.message);
                    return res.redirect('back');
                }
                res.redirect('/destinations/' + destination.id);
            });
        });

    });
});


router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("destinations/new")
})

// SHOW - shows more info about one destination
router.get("/:id", function (req, res) {
    //find the destination with provided ID
    Destination.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: {
            sort: {
                createdAt: -1
            }
        }
    }).exec(function (err, foundDestination) {
        if (err) {
            console.log(err);
        } else {
            //render show template with that destination
            res.render("destinations/show", {
                destination: foundDestination
            });
        }
    });
});

router.get("/:id/edit", middleware.checkDestinationOwnership, (req, res) => {
    Destination.findById(req.params.id, (err, foundDestination) => {
        res.render("destinations/edit", {
            destination: foundDestination
        });
    })
})


// UPDATE DESTINATION ROUTE
router.put("/:id", middleware.checkDestinationOwnership, upload.single("image"), function (req, res) {
    geocoder.geocode(req.body.location, function (err, data) {
        if (err || !data.length) {
            req.flash('error', 'Invalid address');
            return res.redirect('back');
        }
        req.body.destination.lat = data[0].latitude;
        req.body.destination.lng = data[0].longitude;
        req.body.destination.location = data[0].formattedAddress;

        Destination.findById(req.params.id, async function (err, destination) {
            if (err) {
                req.flash("error", err.message);
                res.redirect("back");
            } else {
                if (req.file) {
                    try {
                        await cloudinary.v2.uploader.destroy(destination.imageId);
                        let result = await cloudinary.v2.uploader.upload(req.file.path);
                        destination.imageId = result.public_id;
                        destination.image = result.secure_url;

                    } catch (err) {
                        req.flash("error", err.message);
                        return res.redirect("back");
                    }

                }

                destination.lat = req.body.destination.lat;
	    		destination.lng = req.body.destination.lng;
	    		destination.location = req.body.destination.location;
	    		destination.name = req.body.destination.name;
	    		destination.description = req.body.destination.description;
	    		destination.price = req.body.destination.price;
                destination.save();

                req.flash("success", "Successfully Updated!");
                res.redirect("/destinations/" + destination._id);
            }
        });
    });
});

// DESTROY DESTINATION ROUTE
router.delete("/:id", middleware.checkDestinationOwnership, function (req, res) {
    Destination.findById(req.params.id, async function (err, destination) {
        if (err) {
            res.redirect("/destinations");
        } else {
            try {
                if(destination.imageId != null) {
                    await cloudinary.v2.uploader.destroy(destination.imageId);
                }

            } catch(err) {
                req.flash("error", err.message);
                return res.redirect("back");	
            }	
            // deletes all comments associated with the destination
            Comment.remove({
                "_id": {
                    $in: destination.comments
                }
            }, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/destinations");
                }
                // deletes all reviews associated with the destination
                Review.remove({
                    "_id": {
                        $in: destination.reviews
                    }
                }, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/destinations");
                    }
                    //  delete the destination
                    destination.remove();
                    req.flash("success", "Destination deleted successfully!");
                    res.redirect("/destinations");
                });
            });
        }
    });
});


const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;