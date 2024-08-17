// routes.js
const express = require('express');
const passport = require('../auth/google-oauth');

const router = express.Router();

// Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Handle Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    // Successful authentication
    try {
        // Check if the user already exists in your database
        let user = await prisma.user.findUnique({
          where: { email: req.user.email },
        });
  
        // If the user doesn't exist, create a new one
        if (!user) {
          user = await prisma.user.create({
            data: {
              oauthId: req.user.id,
              oauthProvider: 'google',
              name: req.user.displayName,
              email: req.user.emails[0].value,
              passwordHash: '', // No password required for OAuth users
              role: 1, // Default role (e.g., Normal user)
            },
          });
        }
  
        // After user creation or if they already exist, redirect to the dashboard or homepage
        res.redirect('/');
      } catch (err) {
        console.error('Error during OAuth callback:', err);
        res.redirect('/login');
      }
    }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
