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

// Create a new "one" for a given user
router.post('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  try {
    const one = await prisma.one.create({
      data: {
        name,
        user: { connect: { id: userId } },
      },
    });
    res.status(201).json(one);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create one' });
  }
});

// Edit a "one's" name
router.put('/:oneId/name', async (req, res) => {
  const { oneId } = req.params;
  const { name } = req.body;

  try {
    const one = await prisma.one.update({
      where: { id: oneId },
      data: { name },
    });
    res.json(one);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update one\'s name' });
  }
});

// Update next meeting date and update meeting history if needed
router.put('/:oneId/nextMeetingDate', async (req, res) => {
  const { oneId } = req.params;
  const { nextMeetingDate } = req.body;

  try {
    // Find the existing one
    const one = await prisma.one.findUnique({
      where: { id: oneId },
      include: { meetingHistory: true },
    });

    if (one.nextMeetingDate) {
      // Update the meeting history with the previous next meeting date
      await prisma.meetingHistory.create({
        data: {
          oneId,
          meetingDate: one.nextMeetingDate,
        },
      });
    }

    // Update the next meeting date
    const updatedOne = await prisma.one.update({
      where: { id: oneId },
      data: { nextMeetingDate },
    });

    res.json(updatedOne);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update next meeting date' });
  }
});


// Add a prayer for a specific "one"
router.post('/:oneId/prayer', async (req, res) => {
  const { oneId } = req.params;
  const { prayerText } = req.body;

  try {
    // Create a new prayer associated with the one
    const prayer = await prisma.prayer.create({
      data: {
        text: prayerText,
        one: { connect: { id: oneId } },
      },
    });
    res.status(201).json(prayer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add prayer' });
  }
});


// Get status information for a specific "one"
router.get('/:oneId/status', async (req, res) => {
  const { oneId } = req.params;

  try {
    const one = await prisma.one.findUnique({
      where: { id: oneId },
      include: {
        user: true,
        meetingHistory: true,
        prayers: true,
      },
    });

    if (!one) {
      return res.status(404).json({ error: 'One not found' });
    }

    const totalMeetings = one.meetingHistory.length;
    const nextMeetingDate = one.nextMeetingDate;
    const hasMeetingOccurred = nextMeetingDate && new Date(nextMeetingDate) <= new Date();
    const numberOfPrayers = one.prayers.length;

    res.json({
      name: one.name,
      totalMeetings,
      nextMeetingDate: nextMeetingDate || null,
      meetingOccurred: hasMeetingOccurred,
      user: one.user,
      numberOfPrayers,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get one status' });
  }
});
