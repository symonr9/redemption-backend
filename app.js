const express = require('express');
const cors = require('cors');
const routes = require('./routes'); // Automatically picks up the index.js file
const session = require('express-session');
const passport = require('./auth/google-oauth');

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
    origin: 'http://localhost:8081', // Replace with your Expo app's URL
    credentials: true, // Allow credentials (for session cookies)
}));

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
