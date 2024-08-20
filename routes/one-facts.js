const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.post('/create', async (req, res) => {
    const { notes, icon, priority, type, oneId, userId } = req.body;
    try {
      const oneFact = await prisma.oneFact.create({
        data: { notes, icon, priority, type, oneId, userId }
      });
      res.status(201).json(oneFact);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/', async (req, res) => {
    try {
      const oneFacts = await prisma.oneFact.findMany();
      res.json(oneFacts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const oneFacts = await prisma.oneFact.findMany({
        where: { userId }
      });
      res.json(oneFacts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/one/:oneId', async (req, res) => {
    const { oneId } = req.params;
    try {
      const oneFacts = await prisma.oneFact.findMany({
        where: { oneId }
      });
      res.json(oneFacts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const oneFact = await prisma.oneFact.findUnique({
        where: { id }
      });
      res.json(oneFact);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { notes, icon, priority, type } = req.body;
    try {
      const oneFact = await prisma.oneFact.update({
        where: { id },
        data: { notes, icon, priority, type }
      });
      res.json(oneFact);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.oneFact.delete({
        where: { id }
      });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });