const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.post('/one/create', authenticateJwt, async (req, res) => {
  const user = req.user;
  const { one } = req.body;
  try {
    const result = await prisma.one.create({
      data: {
        name: one.name,
        icon: one.icon,
        stage: one.stage,
        category: one.category,
        knownSince: one.knownSince,
        userId: user.id,
      }
    });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/one/update', authenticateJwt, async (req, res) => {
  const { one } = req.body;
  try {
    const result = await prisma.one.update({
      where: { id: one.id },
      data: {
        name: one.name,
        icon: one.icon,
        stage: one.stage,
        knownSince: one.knownSince,
        category: one.category,
        gospelChecklist: one.gospelChecklist ? one.gospelChecklist.join('∫') : null,
      }
    });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/checklist', authenticateJwt, async (req, res) => {
  const { one } = req.body;
  try {
    const result = await prisma.one.update({
      where: { id: one.id },
      data: {
        gospelChecklist: one.gospelChecklist ? one.gospelChecklist.join('∫') : null,
      }
    });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/gospelStep/create', authenticateJwt, async (req, res) => {
  try {
    const { gospelStep } = req.body;
    let newGospelStep = null;

    await prisma.$transaction(async (tx) => {
      newGospelStep = await tx.gospelStep.create({
        data: {
          date: gospelStep.date || null, // Defaults to now()
          type: gospelStep.type,
          layoutType: gospelStep.layoutType,
          notes: gospelStep.notes || null,
          nextSteps: gospelStep.nextSteps || null,
          oneId: gospelStep.oneId
        }
      });
    });

    if (!newGospelStep) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }
    res.status(200).json(newGospelStep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/gospelStep/update', authenticateJwt, async (req, res) => {
  try {
    const { gospelStep } = req.body;
    let updatedGospelStep = null;

    await prisma.$transaction(async (tx) => {
      const existingGospelStep = await tx.gospelStep.findFirst({
        where: { id: gospelStep.id }
      });
      if (!existingGospelStep) {
        res.status(500).json({ error: `Gospel Step does not exist` });
        return;
      }

      updatedGospelStep = await tx.gospelStep.update({
        where: {
          id: gospelStep.id,
        },
        data: {
          date: gospelStep.date,
          type: gospelStep.type,
          layoutType: gospelStep.layoutType,
          notes: gospelStep.notes || null,
          nextSteps: gospelStep.nextSteps || null,
          oneId: gospelStep.oneId
        }
      });
    });

    if (!updatedGospelStep) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }
    res.status(200).json(updatedGospelStep);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/gospelStep/delete', authenticateJwt, async (req, res) => {
  try {
    const { gospelStep } = req.body;

    const existingGospelStep = await prisma.gospelStep.findFirst({
      where: { id: gospelStep.id }
    });
    if (!existingGospelStep) {
      res.status(500).json({ error: `Gospel Step does not exist` });
      return;
    }

    await prisma.gospelStep.delete({
      where: { id: gospelStep.id },
    });
    
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/oneNote/create', authenticateJwt, async (req, res) => {
  try {
    const { oneNote } = req.body;
    let newOneNote = null;

    await prisma.$transaction(async (tx) => {
      newOneNote = await tx.oneNote.create({
        data: {
          date: oneNote.date || null, // Defaults to now()
          type: oneNote.type,
          notes: oneNote.notes || "",
          oneId: oneNote.oneId
        }
      });
    });

    if (!newOneNote) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }
    res.status(200).json(newOneNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/oneNote/update', authenticateJwt, async (req, res) => {
  try {
    const { oneNote } = req.body;
    let updatedOneNote = null;

    await prisma.$transaction(async (tx) => {
      const existingOneNote = await tx.oneNote.findFirst({
        where: { id: oneNote.id }
      });
      if (!existingOneNote) {
        res.status(500).json({ error: `One Note does not exist` });
        return;
      }

      updatedOneNote = await tx.oneNote.update({
        where: {
          id: oneNote.id
        },
        data: {
          date: oneNote.date || null, // Defaults to now()
          type: oneNote.type,
          notes: oneNote.notes || "",
          oneId: oneNote.oneId
        }
      });
    });

    if (!updatedOneNote) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }
    res.status(200).json(updatedOneNote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/oneNote/delete', authenticateJwt, async (req, res) => {
  try {
    const { oneNote } = req.body;

    const existingOneNote = await prisma.oneNote.findFirst({
      where: { id: oneNote.id }
    });
    if (!existingOneNote) {
      res.status(500).json({ error: `One Note does not exist` });
      return;
    }

    await prisma.oneNote.delete({
      where: { id: oneNote.id },
    });
    
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/christian/create', authenticateJwt, async (req, res) => {
  try {
    const { christian } = req.body;
    let newChristian = null;

    await prisma.$transaction(async (tx) => {
      newChristian = await tx.christian.create({
        data: {
          name: christian.name,
          oneCategory: christian.oneCategory,
          category: christian.category,
          icon: christian.icon,
          oneKnownSince: christian.oneKnownSince,
          knownSince: christian.knownSince,
          notes: christian.notes,
          mutualInterests: christian.mutualInterests,
          lastPrayedFor: christian.lastPrayedFor,
          lastReachedOutTo: christian.lastReachedOutTo,
          timesPrayed: christian.timesPrayed || 0, // Default to 0 if not provided
          timesReachedOut: christian.timesReachedOut || 0, // Default to 0 if not provided
          oneId: christian.oneId,
        },
      });
    });

    if (!newChristian) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }
    res.status(200).json(newChristian);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/christian/update', authenticateJwt, async (req, res) => {
  try {
    const { christian } = req.body;
    let updatedChristian = null;

    await prisma.$transaction(async (tx) => {
      const existingChristian = await tx.christian.findFirst({
        where: { id: christian.id }
      });
      if (!existingChristian) {
        res.status(500).json({ error: `Christian does not exist` });
        return;
      }

      updatedChristian = await tx.christian.update({
        where: {
          id: christian.id,
        },
        data: {
          name: christian.name,
          oneCategory: christian.oneCategory,
          category: christian.category,
          icon: christian.icon,
          oneKnownSince: christian.oneKnownSince,
          knownSince: christian.knownSince,
          notes: christian.notes,
          mutualInterests: christian.mutualInterests,
          lastPrayedFor: christian.lastPrayedFor,
          lastReachedOutTo: christian.lastReachedOutTo,
          timesPrayed: christian.timesPrayed || 0, // Default to 0 if not provided
          timesReachedOut: christian.timesReachedOut || 0, // Default to 0 if not provided
          oneId: christian.oneId,
        },
      });
    });

    if (!updatedChristian) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }
    res.status(200).json(updatedChristian);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/christian/delete', authenticateJwt, async (req, res) => {
  try {
    const { christian } = req.body;

    const existingChristian = await prisma.christian.findFirst({
      where: { id: christian.id }
    });
    if (!existingChristian) {
      res.status(500).json({ error: `Christian does not exist` });
      return;
    }

    await prisma.christian.delete({
      where: { id: christian.id },
    });
    
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
  }
});

router.post('/actionSteps/update', authenticateJwt, async (req, res) => {
  const { actionSteps, oneId } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      const existingActionSteps = await tx.actionStep.findMany({
        where: { oneId }
      });

      const idsToProcess = new Set(existingActionSteps.map(step => step.id));

      for (const actionStep of actionSteps) {
        if (actionStep.id && idsToProcess.has(actionStep.id)) { // Update
          await tx.actionStep.update({
            where: { id: actionStep.id },
            data: {
              notes: actionStep.notes ? actionStep.notes : null,
              isComplete: actionStep.isComplete,
              targetDate: actionStep.targetDate ? actionStep.targetDate : null,
              type: actionStep.type
            }
          });
          idsToProcess.delete(actionStep.id);
        }
        else {
          await tx.actionStep.create({
            data: {
              notes: actionStep.notes ? actionStep.notes : null,
              isComplete: actionStep.isComplete,
              targetDate: actionStep.targetDate ? actionStep.targetDate : null,
              type: actionStep.type,
              oneId: oneId
            }
          });
        }
      }

      // Delete any action steps that were not included in the new list
      for (const id of idsToProcess) {
        await tx.actionStep.delete({
          where: { id }
        });
      }
    });

    const newActionSteps = await prisma.actionStep.findMany({
      where: { oneId }
    });

    res.status(200).json(newActionSteps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing action steps: ${error.message}` });
  }
});

module.exports = router;