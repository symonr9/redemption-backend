// routes/prayer.js
const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

// Get all prayers
router.get('/', async (req, res) => {
    try {
        const prayers = await prisma.prayer.findMany();
        res.json(prayers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prayers' });
    }
});

// Get a single prayer by ID
router.get('/:id', async (req, res) => {
    try {
        const prayer = await prisma.prayer.findUnique({
            where: { id: req.params.id },
        });
        if (prayer) {
            res.json(prayer);
        } else {
            res.status(404).json({ error: 'Prayer not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prayer' });
    }
});

// Create a new prayer
router.post('/', async (req, res) => {
    try {
        const { title, description } = req.body;
        const prayer = await prisma.prayer.create({
            data: { title, description },
        });
        res.status(201).json(prayer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create prayer' });
    }
});

// Update an existing prayer
router.put('/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        const prayer = await prisma.prayer.update({
            where: { id: req.params.id },
            data: { title, description },
        });
        res.json(prayer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update prayer' });
    }
});

// Delete a prayer
router.delete('/:id', async (req, res) => {
    try {
        await prisma.prayer.delete({
            where: { id: req.params.id },
        });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete prayer' });
    }
});

// Create a new prayer for a specific user
router.post('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { title, description } = req.body;

    try {
        // Create a new prayer linked to the user
        const prayer = await prisma.prayer.create({
            data: {
                title,
                description,
                user: { connect: { id: userId } },
            },
        });
        res.status(201).json(prayer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create prayer for user' });
    }
});


// Create a new prayer for a specific user and a specific "one"
router.post('/user/:userId/one/:oneId', async (req, res) => {
    const { userId, oneId } = req.params;
    const { title, description } = req.body;

    try {
        // Create a new prayer linked to the user and the "one"
        const prayer = await prisma.prayer.create({
            data: {
                title,
                description,
                user: { connect: { id: userId } },
                one: { connect: { id: oneId } },
            },
        });
        res.status(201).json(prayer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create prayer for user and one' });
    }
});


// Get all prayer requests associated with a given prayer
router.get('/:prayerId/requests', async (req, res) => {
    const { prayerId } = req.params;

    try {
        // Fetch all requests associated with the given prayer
        const requests = await prisma.prayerRequest.findMany({
            where: { prayerId },
        });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prayer requests' });
    }
});

// Get all prayers in the last X days
router.get('/last/:days', async (req, res) => {
    const { days } = req.params;
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));

    try {
        // Fetch all prayers created in the last X days
        const prayers = await prisma.prayer.findMany({
            where: {
                createdAt: {
                    gte: date,
                },
            },
        });
        res.json(prayers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch prayers' });
    }
});

module.exports = router;
