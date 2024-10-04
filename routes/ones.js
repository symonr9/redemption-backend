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

module.exports = router;