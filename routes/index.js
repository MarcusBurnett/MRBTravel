let express = require('express'),
router = express.Router(),
passport = require('passport'),
User = require("../models/user"),
Destination = require("../models/destination"),
async = require("async"),
nodemailer = require("nodemailer"),
crypto = require("crypto")

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


router.get("/", (req, res) => {
    res.redirect("/destinations");
})

//AUTH ROUTES

router.get("/register", (req, res) => {
    res.render("register", {page: "register"})
})

router.post("/register", upload.single('headshot'), async (req, res) => {

    await cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the user object under image property
      req.body.headshot = result.secure_url;
      // add image's public_id to user object
      req.body.headshotId = result.public_id;
    });

    let newUser = new User({
        username: req.body.username,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        headshot: req.body.headshot
    });

    if(req.body.adminCode === "secretcode123"){
        newUser.isAdmin = true;
    }

    User.register(newUser, req.body.password, (err, user) => {
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, () => {
            req.flash("success", "Welcome to MRB Travel, " + user.username);
            res.redirect("/destinations");
        });
    });
})

//SHOW LOGIN FORM

router.get("/login", (req, res) => {
    res.render("login", {page: "login"});
})

router.post("/login", passport.authenticate("local", {
    successRedirect: "/destinations",
    failureRedirect: "/login"
}), (req, res) => {})

//LOGOUT ROUTE

router.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "Logged Out")
    res.redirect("/destinations");
})


router.get("/forgot", (req, res) => {
    res.render("forgot");
})

router.post('/forgot', (req, res, next) => {
    async.waterfall([
      (done) => {
        crypto.randomBytes(20, (err, buf) => {
          let token = buf.toString('hex');
          done(err, token);
        });
      },
      (token, done) => {
        User.findOne({ email: req.body.email }, (err, user) => {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save((err) => {
            done(err, token, user);
          });
        });
      },
      (token, user, done) => {
        let smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'marco95bwfc@gmail.com',
            pass: process.env.GMAILPW
          }
        });
        let mailOptions = {
          to: user.email,
          from: 'marco95bwfc@gmail.com',
          subject: 'MRB Travel Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, (err) => {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], (err) => {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  router.get('/reset/:token', (req, res) => {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', (req, res) => {
    async.waterfall([
      (done) => {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, (err) => {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save((err) => {
                req.logIn(user, (err) => {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      (user, done) => {
        let smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'marco95bwfc@gmail.com',
            pass: process.env.GMAILPW
          }
        });
        let mailOptions = {
          to: user.email,
          from: 'marco95bwfc@mail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, (err) => {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], (err) => {
      res.redirect('/destinations');
    });
});

router.get("/users/:id", (req, res) => {
    User.findById(req.params.id, (err, foundUser) => {
        if(err){
            req.flash("error", "Something went wrong.");
            res.redirect("/")
        }
        Destination.find().where("author.id").equals(foundUser._id).exec((err, destinations) => {
            if(err){
                req.flash("error", "Something went wrong.");
                res.redirect("/")
            }
        res.render("users/show", {user: foundUser, destinations: destinations});

        })
    }) 
})

module.exports = router;
