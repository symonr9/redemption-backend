const prisma = require('../misc/prisma-client');
var express = require("express");

var router = express.Router();

/**********************************************************************
 * URI: Get All Users
 * Notes: None
 **********************************************************************/
router.get("/", async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
        console.error(error);
    }
});

router.post("/create", async (req, res) => {
    const { name, email } = req.body;
    try {
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
            },
        });
        res.json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
        console.error(error);
    }
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
        });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Update an existing user
router.put('/:id', async (req, res) => {
    try {
        const { name, email, role, description } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, email, role, description },
        });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});


// Delete a user
router.delete('/:id', async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: req.params.id },
        });
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;