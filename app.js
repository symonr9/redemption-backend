const express = require('express');
const routes = require('./routes'); // Automatically picks up the index.js file
const session = require('express-session');
const passport = require('./auth/google-oauth');

const PORT = process.env.PORT || 3000;

const app = express();

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Use the combined routes
app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Gospel Initiative Backend Server is running on http://localhost:${PORT}`);
});
