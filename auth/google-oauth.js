// auth.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('../misc/prisma-client');

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await prisma.user.upsert({
          where: { oauthId: profile.id },
          update: {
            oauthProvider: 'google',
            name: profile.displayName,
            email: profile.emails[0].value,
          },
          create: {
            oauthId: profile.id,
            oauthProvider: 'google',
            name: profile.displayName,
            email: profile.emails[0].value,
            passwordHash: '', // OAuth users don’t need a password
            role: 1, // Default role
          },
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
