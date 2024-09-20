// routes/index.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Read all files in the current directory
const routeFiles = fs.readdirSync(__dirname).filter(file => {
    return file !== 'index.js' && file.endsWith('.js');
});

routeFiles.forEach(file => {
    const route = require(path.join(__dirname, file));
    const routeName = file.replace('.js', '');

    console.log("route name: ", routeName, " route - ", route);
    router.use(`/${routeName}`, route);
});

module.exports = router;