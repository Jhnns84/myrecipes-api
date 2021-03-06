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
let allowedOrigins = ['http://localhost:8080', 'http://localhost:1234', 'https://myrecipes-app-jhnns84.netlify.app/'];
app.use(cors());

// imports auth-file
require('./auth')(app);

// imports passport-file
const passport = require('passport');
require('./passport');



// imports validator
const { check, validationResult } = require('express-validator');

/**
 * This connects to the mongo atlas database
 */
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// enables morgan logger
app.use(morgan('common'));

// Generic welcome message
app.get('/', (req, res) => {
  res.send('Welcome to the recipe API. Please refer to the documentation for instructions: https://jm-myrecipes-api.herokuapp.com/documentation.html');
});

/**
 * This gets the data of all recipes
 * @param {string} endpoint to fetch all recipes
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback queries database for all recipes
 * @returns {object} returns array of all recipe objects
 */
app.get('/recipes', passport.authenticate('jwt', { session: false}), (req, res) => {
Recipes.find()
  .then((recipes) => {
    res.status(200).json(recipes);
  }) 
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' +  err);
  });
});

/**
 * This gets the data about a single recipe, by name
 * @param {string} endpoint to fetch recipe details
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback queries database for recipe by name
 * @returns {object} returns one recipe object
 */
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

/**
 * This gets information about a cuisine by name
 * @param {string} endpoint to fetch a cuisine
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback queries database for cuisine
 * @returns {object} returns cuisine object
 */
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

/**
 * Gets information about a meal type by name
 * @param {string} endpoint to fetch a meal type
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback queries database for meal type
 * @returns {object} returns meal type object
 */
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


/**
 * This gets all users
 * @param {string} endpoint to fetch all users
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback queries database for users
 * @returns {object} returns user array
 */
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

/**
 * This gets a user by username
 * @param {string} endpoint to fetch one user
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback queries database for user by username
 * @returns {object} returns user object
 */
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

/**
 * This adds a new user
 * @param {string} endpoint to register a new user
 * @param {func} expressValidator validates form input
 * @param {func} Callback registers user
 * @returns {object} returns new user object
 */
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

/**
 * This updates a user by username
 * @param {string} endpoint to edit a users info
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback updates users info
 * @returns {object} returns updated user object
 */
app.put('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
  let hashedPassword = Users.hashPassword(req.body.Password);
  Users.findOneAndUpdate({ Username: req.params.Username }, { $set: 
    {
      Username: req.body.Username,
      Password: hashedPassword,
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

/**
 * This adds a recipe to a users favorites
 * @param {string} endpoint to add a recipe to favorites
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback finds user and adds recipe to favorites
 * @returns {object} returns updated user object
 */
app.put('/users/:Username/recipes/:RecipeID', passport.authenticate('jwt', { session: false}), (req, res) => {
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

/**
 * This removes a recipe from a users favorites
 * @param {string} endpoint to remove a recipe from favorites
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback finds user and removes recipe to favorites
 * @returns {object} returns updated user object
 */
app.put('/removefavorites/users/:Username/recipes/:RecipeID', passport.authenticate('jwt', { session: false}), (req, res) => {
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

/**
 * This deletes a user by username
 * @param {string} endpoint to delete a user profile
 * @param {func} passport.authenticate for authentication
 * @param {func} Callback finds user deletes profile
 */
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

/**
 * This serves the documentation file from the public folder
 */
app.use(express.static('public'));

/**
 * This listens for requests
 */
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0',() => {
 console.log('Listening on Port ' + port);
});

/**
 * This handles errors
 */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});