const express = require('express');
const prisma = require('../misc/prisma-client');

const router = express.Router();

router.post('/create', async (req, res) => {
  const user = req.user;
  const { one } = req.body;
  try {
    const result = await prisma.one.create({
      data: {
        name: one.name,
        icon: one.iconKey,
        stage: one.stage,
        category: one.category,
        userId: user.id
      }
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update', async (req, res) => {
  const { one } = req.body;
  try {
    const result = await prisma.one.update({
      where: { id: one.id },
      data: {
        name: one.name,
        icon: one.iconKey,
        stage: one.stage,
        category: one.category,
        gospelChecklist: one.gospelChecklist ? one.gospelChecklist.join(',') : null,
      }
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/checklist', async (req, res) => {
  const { one } = req.body;
  try {
    const result = await prisma.one.update({
      where: { id: one.id },
      data: {
        gospelChecklist: one.gospelChecklist ? one.gospelChecklist.join(',') : null,
      }
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/action-steps/update', async (req, res) => {
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