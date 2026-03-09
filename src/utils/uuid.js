const crypto = require('crypto');

/**
 * Generates a professional 12-character alphanumeric ID.
 * Safer and much cleaner for URLs and UI than full UUIDs.
 */
const generateId = () => {
    return crypto.randomBytes(9).toString('base64')
        .replace(/\+/g, '0')
        .replace(/\//g, '1')
        .slice(0, 12);
};

module.exports = { generateId };
