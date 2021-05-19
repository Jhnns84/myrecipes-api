const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

let recipeSchema = mongoose.Schema({
    Name: {type: String, required: true},
    Description: {type: String, required: true},
    Cuisine: {
        Name: String,
        Description: String
    },
    MealType: {
        Name: String,
        Description: String
    },
    Difficulty: {type: String, required: true},
    Time: {type: String, required: true},
    ImagePath: String,
    KeyIngredients: [String],
    Featured: Boolean
});

let userSchema = mongoose.Schema({
    Username: {type: String, required: true},
    Password: {type: String, required: true},
    Email: {type: String, required: true},
    Birthday: Date,
    FavoriteRecipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }]
});

userSchema.statics.hashPassword = (password) => {
    return bcrypt.hashSync(password, 10);
};

userSchema.methods.validatePassword = function(password) {
    return bcrypt.compareSync(password, this.Password);
};

let Recipe = mongoose.model('Recipe', recipeSchema);
let User = mongoose.model('User', userSchema);

module.exports.Recipe = Recipe;
module.exports.User = User;