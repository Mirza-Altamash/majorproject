// Import the User model
const User = require("../models/user");

// ------------------- RENDER SIGNUP FORM -------------------
module.exports.renderSignupForm = (req, res) => {
    // Render the signup page
    res.render("users/signup");
};

// ------------------- SIGNUP: Register a New User -------------------
module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        // Create a new user instance
        const newUser = new User({ username, email });
        // Register the user using Passport-Local-Mongoose's register method
        const registeredUser = await User.register(newUser, password);
        
        // Auto-login the user after a successful signup
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash("success", "Welcome to Wanderlust!");
            res.redirect("/listings");
        });
    } catch (e) {
        // If signup fails (e.g., username already taken), show error and redirect
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

// ------------------- RENDER LOGIN FORM -------------------
module.exports.renderLoginForm = (req, res) => {
    // Render the login page
    res.render("users/login");
};

// ------------------- LOGIN: Authenticate User -------------------
module.exports.login = async (req, res) => {
    // Show a welcome message upon successful login
    req.flash("success", "Welcome back to Wanderlust!");
    // Redirect the user to the page they were trying to access, or to listings by default
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

// ------------------- LOGOUT: End User Session -------------------
module.exports.logout = (req, res, next) => {
    // Log out the user using Passport's logout method
    req.logout(err => {
        if (err) return next(err);
        req.flash("success", "You have logged out successfully.");
        res.redirect("/listings");
    });
};
