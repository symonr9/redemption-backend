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



module.exports = router;