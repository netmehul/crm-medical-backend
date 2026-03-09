const { unauthorized } = require('../utils/apiResponse');

const requireClinic = (req, res, next) => {
    if (!req.clinicId) {
        return unauthorized(res, 'Please select a clinic/branch to perform this action');
    }
    next();
};

module.exports = requireClinic;
