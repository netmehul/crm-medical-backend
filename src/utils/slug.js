/**
 * Generates a URL-friendly slug from a string.
 */
function slugify(text) {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

module.exports = { slugify };
