const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

// Get all
router.get('/', async (req, res) => {
    try {
        const items = await prisma.one.findMany();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});