const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle the result of express-validator validations.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Validation rules for the user registration endpoint.
 */
const registerValidationRules = [
  // username: must not be empty, must be at least 3 chars
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long.')
    .escape(),

  // email: must be a valid email
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  // password: must be at least 8 chars, contain one number, one uppercase, one lowercase, one special char
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character.'),
];

/**
 * Validation rules for the user login endpoint.
 */
const loginValidationRules = [
  // email: must be a valid email
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  // password: must not be empty
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

module.exports = {
  handleValidationErrors,
  registerValidationRules,
  loginValidationRules,
};