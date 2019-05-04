require("dotenv").config();

let express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    flash = require("connect-flash")
    passport = require('passport'),
    localStrategy = require('passport-local'),
    methodOverride = require("method-override"),
    Destination = require('./models/destination'),
    Comment = require('./models/comment'),
    User = require("./models/user"),
    reviewRoutes = require("./routes/reviews"),
    seedDB = require("./seeds")

let commentRoutes = require("./routes/comments");
let destinationRoutes = require("./routes/destinations");
let indexRoutes = require("./routes/index");

mongoose.connect("mongodb://localhost:27017/mrb_travel", {
    useNewUrlParser: true
});

app.use(bodyParser.urlencoded({
    extended: true
}));
app.locals.moment = require("moment");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"))
app.use(methodOverride("_method"));
app.use(flash());

// seedDB();

//PASSPORT CONFIGURATION

app.use(require("express-session")({
    secret: "How much wood could a woodchuck chuck if a woodchuck could chuck wood",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
})

app.use("/", indexRoutes);
app.use("/destinations/:id/comments", commentRoutes);
app.use("/destinations", destinationRoutes);
app.use("/destinations/:id/reviews", reviewRoutes);


app.listen(3000, function () {
    console.log("MRB Travel server has started");
})