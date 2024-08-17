// routes/index.js
const express = require('express');

const router = express.Router();

router.use('/users', require('./users'));
router.use('/auth', require('./auth'));

module.exports = router;