const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../misc/prisma-client');
const { LogType } = require('../enums/enums');

const router = express.Router();

router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.headers;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh token' });
  }

  const isValid = await bcrypt.compare(refresh_token, req.user.refreshToken);
  if (!isValid) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }

  // Generate a JWT
  const newToken = jwt.sign(
    { userId: req.user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  await prisma.log.create({
    data: {
      type: LogType.RefreshTokens,
      userId: req.user.id,
      details: `Generated new access token`
    }
  });

  res.cookie('accessToken', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000, // 1 hour
  });

  // TODO: Implement logic here to generate new refresh token after X days.

  res.json({ accessToken: newToken });
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
