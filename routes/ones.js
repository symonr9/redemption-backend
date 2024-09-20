const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.post('/create', async (req, res) => {
  const { name, icon, stage, nextMeetingAt, prayingSince, userId, hidden } = req.body;
  try {
    const one = await prisma.one.create({
      data: { name, icon, stage, nextMeetingAt, prayingSince, userId, hidden }
    });
    res.status(201).json(one);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const ones = await prisma.one.findMany();
    res.json(ones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const ones = await prisma.one.findMany({
      where: { userId },
      include: { meetings: true, prayers: true, actionSteps: true, facts: true }
    });
    res.json(ones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const one = await prisma.one.findUnique({
      where: { id },
      include: { meetings: true, prayers: true, actionSteps: true, facts: true }
    });
    res.json(one);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { name, icon, stage, nextMeetingAt, prayingSince, hidden } = req.body;
  try {
    const one = await prisma.one.update({
      where: { id },
      data: { name, icon, stage, nextMeetingAt, prayingSince, hidden }
    });
    res.json(one);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.one.delete({
      where: { id }
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;