const authenticateJwt = require('../auth/jwtMiddleware');
const express = require('express');
const prisma = require('../misc/prisma-client');
const { isWithinPast24Hours, formatDateTime, cleanForProfanity, hasValidTextLength } = require('../utils/serverUtils');
const { LogType } = require('../enums/enums');
const { MAX_NAME_LENGTH, MAX_NORMAL_TEXT_LENGTH, MAX_LONG_TEXT_LENGTH } = require('../constants/constants');

const router = express.Router();

router.post('/one/create', authenticateJwt, async (req, res) => {
  const user = req.user;
  const { one } = req.body;
  try {
    const cleanName = cleanForProfanity(one.name);
    if (!hasValidTextLength(cleanName, 1, MAX_NAME_LENGTH)) {
        res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
        return;
    }

    const result = await prisma.one.create({
      data: {
        name: cleanName,
        icon: one.icon,
        stage: one.stage,
        category: one.category,
        knownSince: one.knownSince,
        userId: user.id,
      }
    });

    await prisma.log.create({
      data: {
        type: LogType.CreateOne,
        userId: user.id,
        details: `[One ID: ${result.id}] [One Name: ${result.name}]`
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
    const cleanName = cleanForProfanity(one.name);
    if (!hasValidTextLength(cleanName, 1, MAX_NAME_LENGTH)) {
        res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
        return;
    }

    const result = await prisma.one.update({
      where: { id: one.id },
      data: {
        name: cleanName,
        icon: one.icon,
        stage: one.stage,
        knownSince: one.knownSince,
        category: one.category,
        gospelChecklist: one.gospelChecklist ? one.gospelChecklist.join('∫') : null,
      }
    });

    await prisma.log.create({
      data: {
        type: LogType.UpdateOne,
        userId: req.user.id,
        details: `[One ID: ${result.id}] [One Name: ${result.name}]`
      }
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/one/delete', authenticateJwt, async (req, res) => {
  try {
    const { one } = req.body;

    const existingOne = await prisma.one.findFirst({
      where: { id: one.id }
    });
    if (!existingOne) {
      res.status(500).json({ error: `One does not exist` });
      return;
    }

    const result = await prisma.one.delete({
      where: { id: one.id },
    });

    await prisma.log.create({
      data: {
        type: LogType.DeleteOne,
        userId: req.user.id,
        details: `[One ID: ${one.id}] [Name: ${one.name}]`
      }
    });

    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing your request: ${error.message}` });
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

// Creates and updates
router.post('/gospelStep/update', authenticateJwt, async (req, res) => {
  try {
    const { gospelStep } = req.body;
    let updatedGospelStep = null;

    const cleanNotes = gospelStep.notes ? cleanForProfanity(gospelStep.notes) : null;
    if (cleanNotes && !hasValidTextLength(cleanNotes, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Note must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

    const cleanNextSteps = gospelStep.nextSteps ? cleanForProfanity(gospelStep.nextSteps) : null;
    if (cleanNextSteps && !hasValidTextLength(cleanNextSteps, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Next Steps must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

    await prisma.$transaction(async (tx) => {
      const existingGospelStep = await tx.gospelStep.findFirst({
        where: { id: gospelStep.id }
      });

      if (!existingGospelStep) { // Create
        updatedGospelStep = await tx.gospelStep.create({
          data: {
            type: gospelStep.type,
            layoutType: gospelStep.layoutType,
            notes: cleanNotes,
            nextSteps: cleanNextSteps,
            rating: gospelStep.rating,
            oneId: gospelStep.oneId,
            date: new Date()
          }
        });

        await tx.log.create({
          data: {
            type: LogType.CreateGospelStep,
            userId: req.user.id,
            details: `[Step ID: ${updatedGospelStep.id}] [One ID: ${updatedGospelStep.oneId}] [Type: ${updatedGospelStep.type}]`
          }
        });
      } else { // Update
        updatedGospelStep = await tx.gospelStep.update({
          where: {
            id: gospelStep.id,
          },
          data: {
            date: new Date(),
            layoutType: gospelStep.layoutType,
            notes: cleanNotes,
            nextSteps: cleanNextSteps,
            rating: gospelStep.rating,
            oneId: gospelStep.oneId
          }
        });

        await tx.log.create({
          data: {
            type: LogType.UpdateGospelStep,
            userId: req.user.id,
            details: `[Step ID: ${updatedGospelStep.id}] [One ID: ${updatedGospelStep.oneId}] [Type: ${updatedGospelStep.type}]`
          }
        });
      }
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

    const result = await prisma.gospelStep.delete({
      where: { id: gospelStep.id },
    });

    await prisma.log.create({
      data: {
        type: LogType.DeleteGospelStep,
        userId: req.user.id,
        details: `[Step ID: ${result.id}] [One ID: ${result.oneId}] [Type: ${result.type}]`
      }
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

    const cleanNotes = oneNote.notes ? cleanForProfanity(oneNote.notes) : "";
    if (cleanNotes && !hasValidTextLength(cleanNotes, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Notes must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

    await prisma.$transaction(async (tx) => {
      const result = newOneNote = await tx.oneNote.create({
        data: {
          date: oneNote.date || null, // Defaults to now()
          type: oneNote.type,
          notes: cleanNotes,
          oneId: oneNote.oneId
        }
      });

      await tx.log.create({
        data: {
          type: LogType.CreateOneNote,
          userId: req.user.id,
          details: `[Note ID: ${result.id}] [One ID: ${result.oneId}] [Notes: ${result.notes}]`
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

    const cleanNotes = oneNote.notes ? cleanForProfanity(oneNote.notes) : "";
    if (cleanNotes && !hasValidTextLength(cleanNotes, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Notes must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

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
          notes: cleanNotes,
          oneId: oneNote.oneId
        }
      });

      await tx.log.create({
        data: {
          type: LogType.UpdateOneNote,
          userId: req.user.id,
          details: `[Note ID: ${updatedOneNote.id}] [One ID: ${updatedOneNote.oneId}] [Prev Notes: ${oneNote.notes || ""}] [New Notes: ${updatedOneNote.notes}]`
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

    await prisma.log.create({
      data: {
        type: LogType.DeleteOneNote,
        userId: req.user.id,
        details: `[Note ID: ${oneNote.id}] [One ID: ${oneNote.oneId}]`
      }
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

    const cleanName = christian.name ? cleanForProfanity(christian.name) : "";
    if (!hasValidTextLength(cleanName, 1, MAX_NAME_LENGTH)) {
        res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
        return;
    }

    const cleanNotes = christian.notes ? cleanForProfanity(christian.notes) : "";
    if (cleanNotes && !hasValidTextLength(cleanNotes, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Notes must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

    const cleanMutualInterests = christian.mutualInterests ? cleanForProfanity(christian.mutualInterests) : "";
    if (cleanMutualInterests && !hasValidTextLength(cleanMutualInterests, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Mutual interests must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

    await prisma.$transaction(async (tx) => {
      newChristian = await tx.christian.create({
        data: {
          name: cleanName,
          oneCategory: christian.oneCategory,
          category: christian.category,
          icon: christian.icon,
          oneKnownSince: christian.oneKnownSince,
          knownSince: christian.knownSince,
          notes: cleanNotes,
          mutualInterests: cleanMutualInterests,
          lastPrayedFor: christian.lastPrayedFor,
          lastReachedOutTo: christian.lastReachedOutTo,
          timesPrayed: christian.timesPrayed || 0, // Default to 0 if not provided
          timesReachedOut: christian.timesReachedOut || 0, // Default to 0 if not provided
          oneId: christian.oneId,
        },
      });

      await tx.log.create({
        data: {
          type: LogType.CreateChristian,
          userId: req.user.id,
          details: `[ID: ${newChristian.id}] [One ID: ${newChristian.oneId}] [Christian Name: ${newChristian.name}]`
        }
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

    const cleanName = christian.name ? cleanForProfanity(christian.name) : "";
    if (cleanName && !hasValidTextLength(cleanName, 1, MAX_NAME_LENGTH)) {
        res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters.` });
        return;
    }

    const cleanNotes = christian.notes ? cleanForProfanity(christian.notes) : "";
    if (cleanNotes && !hasValidTextLength(cleanNotes, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Notes must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

    const cleanMutualInterests = christian.mutualInterests ? cleanForProfanity(christian.mutualInterests) : "";
    if (cleanMutualInterests && !hasValidTextLength(cleanMutualInterests, 1, MAX_LONG_TEXT_LENGTH)) {
        res.status(400).json({ error: `Mutual interests must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
        return;
    }

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
          name: cleanName,
          oneCategory: christian.oneCategory,
          category: christian.category,
          icon: christian.icon,
          oneKnownSince: christian.oneKnownSince,
          knownSince: christian.knownSince,
          notes: cleanNotes,
          mutualInterests: cleanMutualInterests,
          lastPrayedFor: christian.lastPrayedFor,
          lastReachedOutTo: christian.lastReachedOutTo,
          timesPrayed: christian.timesPrayed || 0, // Default to 0 if not provided
          timesReachedOut: christian.timesReachedOut || 0, // Default to 0 if not provided
          oneId: christian.oneId,
        },
      });

      await tx.log.create({
        data: {
          type: LogType.UpdateChristian,
          userId: req.user.id,
          details: `[ID: ${updatedChristian.id}] [One ID: ${updatedChristian.oneId}] [Christian Name: ${updatedChristian.name}]`
        }
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

    await prisma.log.create({
      data: {
        type: LogType.DeleteChristian,
        userId: req.user.id,
        details: `[ID: ${christian.id}] [One ID: ${christian.oneId}] [Christian Name: ${christian.name}]`
      }
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
        const cleanNotes = actionStep.notes ? cleanForProfanity(actionStep.notes) : null;
        if (cleanNotes && !hasValidTextLength(cleanNotes, 1, MAX_LONG_TEXT_LENGTH)) {
            res.status(400).json({ error: `Notes must be between 1 and ${MAX_LONG_TEXT_LENGTH} characters.` });
            return;
        }

        if (actionStep.id && idsToProcess.has(actionStep.id)) { // Update
          await tx.actionStep.update({
            where: { id: actionStep.id },
            data: {
              notes: cleanNotes,
              isComplete: actionStep.isComplete,
              targetDate: actionStep.targetDate ? actionStep.targetDate : null,
              type: actionStep.type,
              lastModified: new Date()
            }
          });
          idsToProcess.delete(actionStep.id);
        }
        else {
          await tx.actionStep.create({
            data: {
              notes: cleanNotes,
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

    await prisma.log.create({
      data: {
        type: LogType.UpdateActionSteps,
        userId: req.user.id,
        details: `[New Action Steps: ${newActionSteps.length}]`
      }
    });

    res.status(200).json(newActionSteps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `An error occurred while processing action steps: ${error.message}` });
  }
});

module.exports = router;