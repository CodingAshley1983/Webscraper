// Dependencies
var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

//Scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

//Requiring the models:
var db = require("./models");

var PORT = process.env.PORT || 3000;
// Initialize Express
var app = express();


//Configure middleware:

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));


//Connecting to the Database

// mongoose.connect("mongodb://localhost/mongoHeadlines", {
//   useNewUrlParser: true
// })

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines"; 

mongoose.connect(MONGODB_URI, { useNewUrlParser: true}).catch(err => {console.log(err)});


// Main route- rendering the index html page
app.get("/", function (req, res) {
  res.sendFile("/public/index.html");
});

// Retrieve data from the db
app.get("/all", function (req, res) {
  // Find all results from the scrapedData collection in the db
  db.scrapedData.find({}, function (error, found) {
    // Throw any errors to the console
    if (error) {
      console.log(error);
    }
    // If there are no errors, send the data to the browser as json
    else {
      res.json(found);
    }
  });
});

// Scrape data from one site and place it into the mongodb db
app.get("/scrape", function (req, res) {

  // Make a request via axios for the music articles on Westword
  axios.get("https://www.westword.com/news").then(function (response) {
    // Load the html body from axios into cheerio
   
    var $ = cheerio.load(response.data);
    // For each element with a "title" class
    $("a.headline").each(function (i, element) {
      var result = {};
      
      result.title = $(this) .text();
      result.link = $(this).attr("href");

      // create a new article with the result object
      db.Article.create(result)
      .then(function(dbArticle){
        //view the added result in the console:
        console.log(dbArticle);
      })
      .catch(function(err){
        console.log(err);
      });
      console.log(result)
    });

    // Send a "Scrape Complete" message to the browser
    res.send(result);

  });
});


// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({
      _id: req.params.id
    })
    // ..and populate all of the notes associated with it
    .populate("Note")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({
        _id: req.params.id
      }, {
        note: dbNote._id
      }, {
        new: true
      });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Listen on port 3000
app.listen(PORT, function () {
  console.log("App running on port 3000!");
});