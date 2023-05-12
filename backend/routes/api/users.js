const express = require("express");
const bcrypt = require("bcryptjs");

const { check } = require("express-validator");
const { handleValidationErrors } = require("../../utils/validation");

const { setTokenCookie, requireAuth } = require("../../utils/auth");
const { User } = require("../../db/models");

const { makeSafeUser } = require("../../utils/helpers");

const router = express.Router();

//#region             Express middleware
const validateUserSignupInput = [
  check("email").exists({ checkFalsy: true }).isEmail()
    .withMessage("Please privide a valid email."),
  check("username").exists({ checkFalsy: true }).isLength({ min: 4 })
    .withMessage("Please provide a username with at least 4 characters"),
  check("username").not().isEmail()
    .withMessage("Username cannot be an email."),
  check("password").exists({ checkFalsy: true }).isLength({ min: 6 })
    .withMessage("Password must be 6 characters or more."),
  check("firstName").exists({ checkFalsy: true })
    .withMessage("Please provide a first name"),
  check("lastName").exists({ checkFalsy: true })
    .withMessage("Please provide a last name"),
  handleValidationErrors
];
//#endregion

//#region             GET requests
//#endregion

//#region             POST requests
router.post("/", validateUserSignupInput, async (req, res, next) => {
  try {
    const safeUser = makeSafeUser(await createNewUser(req));
    buildSuccessfulSignupResponce(res, safeUser);
  }
  catch (e) { buildSignupError(e, next); }
});

//#region             POST responces

function buildSuccessfulSignupResponce(res, safeUser) {
  setTokenCookie(res, safeUser);
  return res.json({ user: safeUser });
}

function buildSignupError(e, next) {
  const errors = {};
  e.errors.forEach(
    (error) => errors[error.path] = error.message
  );

  const err = new Error("User already exists");
  err.errors = errors;
  err.status = 500;
  err.title = "Bad request";
  next(err);
}
//#endregion
//#endregion

async function createNewUser(req) {
  const { username, email, password, firstName, lastName } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 12);
  return await User.create({ username, email, hashedPassword, firstName, lastName });
}

module.exports = router;