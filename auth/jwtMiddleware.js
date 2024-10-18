const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'Access denied, token missing' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err)
            return res.status(403).json({ error: 'Invalid token' });
        next();
    });
};