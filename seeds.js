var mongoose = require('mongoose'),
    Destination = require('./models/destination'),
    Comment = require("./models/comment")

var data = [
    {
        name: "Granite Hill",
        image: "https://s3.amazonaws.com/imagescloud/images/medias/reservation/camping/main.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    },
    {
        name: "Desert Mesa",
        image: "https://www.getaway.co.za/wp-content/uploads/2018/07/Berg-en-Dal-Kruger-Camping-MvZ-6.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    },
    {
        name: "Canyon Floor",
        image: "https://media-cdn.tripadvisor.com/media/photo-s/0f/cb/90/dd/family-friendly-camping.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    }
]

const seedDB = () => {
    //Remove all destinations
    Destination.remove({}, function (err) {
        if (err) {
            console.log(err)
        } else {
            console.log("removed destinations");
            //add destinations
            data.forEach(function(seed){
                Destination.create(seed, function(err, destination){
                    if(err){
                        console.log(err);
                    } else {
                        console.log("Added a destination")
                        //create a comment
                        Comment.create(
                            {
                            text:"This place is great but I wish there was internet",
                            author: "Homer"
                        }, function(err, comment){
                            if(err){
                                console.log(err)
                            } else {
                                destination.comments.push(comment);
                                destination.save();
                                console.log("Added new comment")
                            }
                        }
                        )
                    }
                })
            })
        }
    })

}

module.exports = seedDB