const bcrypt = require("bcryptjs");

function hashPassword(password) {
    const salt = bcrypt.genSaltSync();
    return bcrypt.hashSync(password, salt);
}

function comparePassword(raw, hash) {
    return bcrypt.compareSync(raw, hash);
}

const RES_TYPES = Object.freeze({
    SUCCESS: "success",
    FAILURE: "failure",
    ERROR: "error",
    UNAUTHORIZED: "unauthorized",
    AUTHORIZED: "authorized",
    NOT_FOUND: "not_found",
    CREATED: "created",
    UPDATED: "updated",
    DELETED: "deleted",
    ALREADY_ACTIVE: "already_active",
});

module.exports = {
    hashPassword,
    comparePassword,
    RES_TYPES,
};
