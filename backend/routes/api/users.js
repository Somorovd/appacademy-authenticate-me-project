const express = require("express");
const bcrypt = require("bcryptjs");

const { check } = require("express-validator");
const { handleValidationErrors } = require("../../utils/validation");

const { setTokenCookie, requireAuth } = require("../../utils/auth");
const { User } = require("../../db/models");

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
  handleValidationErrors
];
//#endregion

//#region             GET requests
//#endregion

//#region             POST requests
router.post("/", validateUserSignupInput, async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 12);

  const user = await User.create({ username, email, hashedPassword, firstName, lastName });
  const safeUser = { id: user.id, username, email, firstName, lastName };
  return res.json({ user: safeUser });
});
//#endregion

module.exports = router;