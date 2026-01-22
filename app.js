/**
 * Major Project - Wanderlust
 * Main Application File
 */

// Load environment variables in development mode
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// ------------------- MODULE IMPORTS -------------------
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

// Import Models
const User = require("./models/user.js");

// Import Routes
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// ------------------- DATABASE CONNECTION -------------------
const dbUrl = process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("Connected to MongoDB Atlas");
    })
    .catch((err) => {
        console.error("Database connection error:", err);
    });

// ------------------- VIEW ENGINE & MIDDLEWARE -------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ------------------- SESSION & FLASH -------------------
// Configure Mongo Session Store
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600, // Time period in seconds
});

store.on("error", (err) => {
    console.error("ERROR in MONGO SESSION STORE:", err);
});

// Configure Session Options
const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

// ------------------- PASSPORT AUTHENTICATION -------------------
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ------------------- GLOBAL LOCALS -------------------
app.use((req, res, next) => {
    res.locals.currUser = req.user || null;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

// ------------------- ROUTES -------------------
app.get("/", (req, res) => {
    res.redirect("/listings");
});
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// ------------------- ERROR HANDLING -------------------
// 404 Route Handler
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// Centralized Error Middleware
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

// ------------------- SERVER CONFIGURATION -------------------
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🚀 Server is listening on port ${port}`);
});
