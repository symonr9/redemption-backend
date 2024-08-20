const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.post('/create', async (req, res) => {
    const { notes, oneId, isComplete, targetDate, type, userId } = req.body;
    try {
      const actionStep = await prisma.actionStep.create({
        data: { notes, oneId, isComplete, targetDate, type, userId }
      });
      res.status(201).json(actionStep);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/', async (req, res) => {
    try {
      const actionSteps = await prisma.actionStep.findMany();
      res.json(actionSteps);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const actionSteps = await prisma.actionStep.findMany({
        where: { userId }
      });
      res.json(actionSteps);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/one/:oneId', async (req, res) => {
    const { oneId } = req.params;
    try {
      const actionSteps = await prisma.actionStep.findMany({
        where: { oneId }
      });
      res.json(actionSteps);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const actionStep = await prisma.actionStep.findUnique({
        where: { id }
      });
      res.json(actionStep);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { notes, oneId, isComplete, targetDate, type } = req.body;
    try {
      const actionStep = await prisma.actionStep.update({
        where: { id },
        data: { notes, oneId, isComplete, targetDate, type }
      });
      res.json(actionStep);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.actionStep.delete({
        where: { id }
      });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });