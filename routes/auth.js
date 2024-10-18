const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const passport = require('../auth/google-oauth');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/refresh', (req, res) => {
  const { userId } = req.user;

  // Generate a JWT
  const newToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.cookie('token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000, // 1 hour
  });

  res.json({ token: newToken });
});

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
