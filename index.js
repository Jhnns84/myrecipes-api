const express = require('express');
const morgan = require('morgan');
const app = express();
const mongoose = require('mongoose');
const Models = require('./models.js');
const Recipes = Models.Recipe;
const Users = Models.User;

app.use(express.json());

// imports CORS module and defines allowed domains
const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://localhost:1234', 'https://jhnns84.github.io/myrecipes-app/', 'https://jm-myrecipes-api.herokuapp.com/'];
app.use(cors({
  origin: (origin, callback) => {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn't found on the list of allowed origins
      let message = 'The CORS policy for this application doesn´t allow access from origin ' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));

// imports auth-file
require('./auth')(app);

// imports passport-file
const passport = require('passport');
require('./passport');



// imports validator
const { check, validationResult } = require('express-validator');

// Connects local database
// mongoose.connect('mongodb://localhost:27017/recipeDB', { useNewUrlParser: true, useUnifiedTopology: true });

// Connects  the mongo atlas db
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// enables morgan logger
app.use(morgan('common'));

// Generic welcome message
app.get('/', (req, res) => {
  res.send('Welcome to the recipe API. Please refer to the documentation for instructions: https://jm-myrecipes-api.herokuapp.com/documentation.html');
});

// Gets the list of data about all recipes

// app.get('/recipes', passport.authenticate('jwt', { session: false}), (req, res) => {
// Recipes.find()
//   .then((recipes) => {
//     res.status(200).json(recipes);
//   }) 
//   .catch((err) => {
//     console.error(err);
//     res.status(500).send('Error: ' +  err);
//   });
// });

app.get('/recipes', function (req, res) {
  Recipes.find()
    .then(function (recipes) {
      res.status(200).json(recipes);
    }) 
    .catch(function (error) {
      console.error(error);
      res.status(500).send('Error: ' +  error);
    });
  });

// Gets the data about a single recipe, by name 
app.get('/recipes/:Name', passport.authenticate('jwt', { session: false}), (req, res) => {
Recipes.findOne({ Name: req.params.Name })
  .then((recipe) => {
    res.json(recipe);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' +  err);
  });
});

// Gets information about a cuisine by name
app.get('/recipes/cuisine/:Name', passport.authenticate('jwt', { session: false}), (req, res) => {
Recipes.findOne({ "Cuisine.Name": req.params.Name })
  .then((recipe) => {
    res.json(recipe.Cuisine);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' +  err);
  });
});

// Gets information about a meal type by name
app.get('/recipes/mealtype/:Name', passport.authenticate('jwt', { session: false}), (req, res) => {
Recipes.findOne({ "MealType.Name": req.params.Name })
  .then((recipe) => {
    res.json(recipe.MealType);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' +  err);
  });
});


// Gets all users
app.get('/users', passport.authenticate('jwt', { session: false}), (req, res) => {
Users.find()
  .then((users) => {
    res.status(200).json(users);
  }) 
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' +  err);
  });
});

// Gets a user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
Users.findOne({ Username: req.params.Username })
  .then((user) => {
    res.json(user);
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' +  err);
  });
});

// Adds a new user
/* We'll expect JSON in this format: 
{
ID: Integer,
Username: String,
Password: String,
Email: String,
Birthday: Date
}*/
app.post('/users', 
[
  check('Username', 'Username is required').isLength({min: 5}),
  check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Email does not appear to be valid').isEmail()
], (req, res) => {

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + ' already exists');
      } else {
        Users
          .create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) => { res.status(201).json(user) })
        .catch((error) => {
          console.error(error);
          res.status(500).send('Error: ' + error);
        });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

// Updates a users username, by username
/* We'll expect JSON in this format
{
Username: String, (required)
Password: String, (required)
Email: String, (required)
Birthday: Date
}*/
app.put('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set: 
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }, // this line makes sure that the updated document is returned
  (err, updatedUser) => {
    if(err) {
      console.error(err);
      res.status(500).send('Error: ' + err);
    } else {
      res.json(updatedUser);
    }
  });
});

// Add a recipe to a users favorites
app.post('/users/:Username/recipes/:RecipeID', passport.authenticate('jwt', { session: false}), (req, res) => {
Users.findOneAndUpdate({ Username: req.params.Username }, {
  $push: { FavoriteRecipes: req.params.RecipeID }
},
{ new: true }, // This line makes sure that the updated document is returned
(err, updatedUser) => {
  if (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  } else {
    res.json(updatedUser);
  }
});
});

// Remove a movie from a users favorites
app.post('/removefavorites/users/:Username/recipes/:RecipeID', passport.authenticate('jwt', { session: false}), (req, res) => {
Users.findOneAndUpdate({ Username: req.params.Username }, {
  $pull: { FavoriteRecipes: req.params.RecipeID }
},
{ new: true }, // This line makes sure that the updated document is returned
(err, updatedUser) => {
  if (err) {
    console.error(err);
    res.status(500).send('Error: ' + err);
  } else {
    res.json(updatedUser);
  }
});
});

// Deletes a user by username
app.delete('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
Users.findOneAndRemove({ Username: req.params.Username })
  .then((user) => {
    if (!user) {
      res.status(400).send(req.params.Username + ' was not found');
    } else {
      res.status(200).send(req.params.Username + ' was deleted.');
    }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });
});

// serves documentation-file from public folder
app.use(express.static('public'));

// listen for requests
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});

// error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});