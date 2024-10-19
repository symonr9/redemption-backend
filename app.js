const express = require('express');
const cors = require('cors');
const routes = require('./routes'); // Automatically picks up the index.js file
const session = require('express-session');
const passport = require('./auth/google-oauth');
const prisma = require('./misc/prisma-client')

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

app.use((req, res, next) => {
    if (req.headers.fixed_auth_token !== process.env.FIXED_AUTH_TOKEN) {
        return res.status(400).json({ error: 'Invalid fixed_auth_token' });
    }
    next();
});

app.use(async (req, res, next) => {
    // White-listed
    if (['/users/create'].includes(req.path)) {
        next();
        return;
    }

    const userId = req.headers.user_id;
    if (!userId) {
        return res.status(400).json({ error: 'user_id header is required' });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    };

    req.user = user;

    console.log(`[Gosp.Init.] User (${user.name}) is accessing ${req.path}`);

    next();
});

app.use(async (req, res, next) => {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const requestTime = new Date().toISOString();
    console.log(`[Gosp.Init.] Access Logged: [IP Address = ${ipAddress}}] [Request Time = ${requestTime}]`);    
    next();
});

// Use the combined routes
app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Gospel Initiative Backend Server is running on http://localhost:${PORT}`);
});
