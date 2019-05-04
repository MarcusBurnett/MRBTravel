var mongoose = require('mongoose');

var destinationSchema = new mongoose.Schema({
    name: String,
    image: String,
    imageId: String,
    location: String,
    hotel1: String,
    hotel2: String,
    hotel3: String,
    toDo1: String,
    toDo2: String,
    toDo3: String,
    lat: Number,
    lng: Number,
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String,
        headshot: String
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review"
    }],
    rating: {
        type: Number,
        default: 0
    }
})

module.exports = mongoose.model("Destination", destinationSchema);