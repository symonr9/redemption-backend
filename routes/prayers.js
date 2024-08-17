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

module.exports = router;
