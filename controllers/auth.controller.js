const User = require('../models/user.model');
const RefreshToken = require('../models/refreshToken.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bulkImportService = require('../services/bulkImport.service');


// @desc    Register a single new user
// @route   POST /api/auth/register
// @access  Private (Admin)
const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'User', // Default to 'User' if not provided
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error)
 {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Authenticate user & get tokens
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // --- Create Tokens ---
    // Access Token
    const accessTokenPayload = {
      user: {
        id: user.id,
        role: user.role,
        manager: user.manager,
        avatar: user.avatar,
      },
    };
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' } 
    );

    // Refresh Token
    const refreshTokenPayload = { user: { id: user.id } };
    // Use a separate, stronger secret for refresh tokens
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_longer_and_more_complex';
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      refreshSecret,
      { expiresIn: '7d' } // Long-lived
    );

    // Store refresh token in database
    await RefreshToken.create({
      token: refreshToken,
      user: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send tokens in secure, HttpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh', // Only send to refresh endpoint
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private (User)
const logout = async (req, res) => {
  const { refreshToken } = req.cookies;

  try {
    if (refreshToken) {
      // Delete the refresh token from the database
      await RefreshToken.deleteOne({ token: refreshToken });
    }
  } catch (error) {
    console.error("Error during token deletion:", error);
  }

  // Clear both cookies regardless of whether the token was in the DB
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Private (User)
const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).send('Access denied. No refresh token provided.');
  }

  try {
    // Find token in database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      // If token is not in DB, it's invalid or was logged out
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return res.status(403).send('Invalid refresh token.');
    }

    // Verify the token
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_longer_and_more_complex';
    const decoded = jwt.verify(refreshToken, refreshSecret);

    // Get user details
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Issue a new access token
    const accessTokenPayload = {
      user: {
        id: user.id,
        role: user.role,
        manager: user.manager,
        avatar: user.avatar,
      },
    };
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Send the new access token as a cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error(error);
    // Clear cookies on any error (e.g., token expired, bad signature)
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.status(403).send('Invalid refresh token.');
  }
};

// @desc    Get current user details
// @route   GET /api/auth/me
// @access  Private (User)
const getMe = async (req, res) => {
  try {
    // req.user is attached by the authenticationMiddleware
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).send('User not found.');
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};


// --- UPDATED FUNCTION ---

// @desc    Bulk register users from a CSV file
// @route   POST /api/auth/bulk-register
// @access  Private (Admin)
const bulkRegisterUsers = async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No CSV file uploaded.');
  }

  try {
    // 1. Call the service to do all the work
    const report = await bulkImportService.processCsvImport(req.file.path);

    // 2. Send the report from the service as the response
    res.status(200).json({
      message: 'Bulk import processed.',
      ...report
    });

  } catch (error) {
    // This catches errors in the service layer (e.g., file read error)
    console.error('[BulkRegister Error]', error);
    res.status(500).send('An error occurred during the bulk import process.');
  }
};


module.exports = {
  register,
  login,
  logout,
  refresh,
  getMe,
  bulkRegisterUsers, 
};
