const crypto = require('crypto');
const User = require('../models/user');
const { sendTokenResponse } = require('../middleware/authMiddleware');
const { validationResult } = require('express-validator');

// Store OTPs temporarily (in production, use Redis or database)
// Format: { email: { otp, expiresAt, attempts } }
const otpStore = new Map();

// Helper function to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send OTP email
async function sendOTPEmail(email, otp) {
  // TODO: Implement actual email sending using nodemailer or your email service
  console.log(`📧 OTP for ${email}: ${otp}`);
  console.log(`⏰ This code will expire in 10 minutes`);
  
  // For development, just log it. In production, send via email service
  // Example with nodemailer:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: '"Mozaker Support" <noreply@mozaker.com>',
    to: email,
    subject: 'Password Reset Verification Code',
    html: `
      <h2>Password Reset Request</h2>
      <p>Your verification code is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
  */
  
  return true;
}

// @desc    Register user with email/password
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      authProvider: 'email'
    });

    // Update last login
    await user.updateLastLogin();

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user account',
      error: error.message
    });
  }
};

// @desc    Login user with email/password
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user registered with social auth
    if (user.authProvider !== 'email') {
      return res.status(400).json({
        success: false,
        message: `This email is registered with ${user.authProvider}. Please sign in with ${user.authProvider}.`
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Check if email exists (for continuing to password page)
// @route   POST /api/auth/check-email
// @access  Public
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Email doesn't exist - needs to register
      return res.json({
        success: true,
        exists: false,
        requiresRegistration: true,
        message: 'Email not found. Please create an account.'
      });
    }

    // Email exists - check auth provider
    return res.json({
      success: true,
      exists: true,
      requiresRegistration: false,
      authProvider: user.authProvider,
      name: user.name
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email',
      error: error.message
    });
  }
};

// @desc    Google OAuth callback
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, email, name, picture, googleId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists - check if it's google auth
      if (user.authProvider !== 'google' && user.providerId !== googleId) {
        return res.status(400).json({
          success: false,
          message: `This email is already registered with ${user.authProvider}. Please sign in with ${user.authProvider}.`
        });
      }
      
      // Update last login
      await user.updateLastLogin();
    } else {
      // Create new user
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        authProvider: 'google',
        providerId: googleId,
        profilePicture: picture,
        isVerified: true
      });
      
      await user.updateLastLogin();
    }

    // Send token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Error with Google authentication',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a verification code.'
      });
    }

    // Check if user registered with social auth (can't reset password)
    if (user.authProvider !== 'email') {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.authProvider} authentication. Please sign in with ${user.authProvider}.`
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email, {
      otp,
      expiresAt,
      attempts: 0,
      maxAttempts: 5
    });

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp);
      
      console.log(`✅ OTP sent to ${email}: ${otp} (expires in 10 min)`);
      
      res.json({
        success: true,
        message: 'Verification code sent to your email'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Clean up OTP
      otpStore.delete(email);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send verification code. Please try again.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request',
      error: error.message
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and verification code'
      });
    }

    // Check if OTP exists
    const storedOTP = otpStore.get(email);

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired or invalid. Please request a new one.'
      });
    }

    // Check if OTP expired
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Please request a new one.'
      });
    }

    // Check attempts
    if (storedOTP.attempts >= storedOTP.maxAttempts) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.'
      });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      storedOTP.attempts++;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${storedOTP.maxAttempts - storedOTP.attempts} attempts remaining.`
      });
    }

    // OTP verified successfully
    // Generate a reset token (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    // Store reset token (replace OTP data)
    otpStore.set(email, {
      resetToken,
      resetTokenExpiry,
      verified: true
    });

    console.log(`✅ OTP verified for ${email}`);

    res.json({
      success: true,
      message: 'Verification successful',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying code',
      error: error.message
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if reset token exists and is valid
    const storedData = otpStore.get(email);

    if (!storedData || !storedData.verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset request. Please start over.'
      });
    }

    // Check if token expired
    if (Date.now() > storedData.resetTokenExpiry) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Reset session expired. Please start over.'
      });
    }

    // Verify reset token
    if (storedData.resetToken !== resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      otpStore.delete(email);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clean up reset token
    otpStore.delete(email);

    console.log(`✅ Password reset successful for ${email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

// Cleanup expired OTPs (run periodically)
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt && now > data.expiresAt) {
      otpStore.delete(email);
      console.log(`🧹 Cleaned up expired OTP for ${email}`);
    } else if (data.resetTokenExpiry && now > data.resetTokenExpiry) {
      otpStore.delete(email);
      console.log(`🧹 Cleaned up expired reset token for ${email}`);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes