const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.post('/create', async (req, res) => {
  const { notes, meetingAt, oneId, tag, userId } = req.body;
  try {
    const meeting = await prisma.meeting.create({
      data: { notes, meetingAt, oneId, tag, userId }
    });
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany();
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const meetings = await prisma.meeting.findMany({
      where: { userId }
    });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/one/:oneId', async (req, res) => {
  const { oneId } = req.params;
  try {
    const meetings = await prisma.meeting.findMany({
      where: { oneId }
    });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/meeting/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id }
    });
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { notes, meetingAt, oneId, tag } = req.body;
  try {
    const meeting = await prisma.meeting.update({
      where: { id },
      data: { notes, meetingAt, oneId, tag }
    });
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.meeting.delete({
      where: { id }
    });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});