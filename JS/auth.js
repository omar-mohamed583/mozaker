const API_URL = 'http://localhost:5000/api';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '155810410963-2tgc77b5233st02sb5mcehoip9udmf3l.apps.googleusercontent.com';

// Authentication Manager
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.googleInitialized = false;
    this.initializeGoogleSignIn();
    this.checkAuthStatus();
  }

  // Initialize Google Sign-In
  initializeGoogleSignIn() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google SDK script loaded');
      this.setupGoogleButton();
    };
    script.onerror = () => {
      console.error('❌ Failed to load Google SDK');
    };
    document.head.appendChild(script);
  }

  // Setup Google Sign-In button
  setupGoogleButton() {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        clearInterval(checkGoogle);

        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => this.handleGoogleCallback(response),
            auto_select: false,
            cancel_on_tap_outside: true,
            ux_mode: 'popup',
            context: 'signin'
          });

          this.googleInitialized = true;
          console.log('✅ Google Sign-In initialized');
        } catch (error) {
          console.error('❌ Error initializing Google Sign-In:', error);
        }
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkGoogle);
      if (!this.googleInitialized) {
        console.error('❌ Google Sign-In initialization timeout');
      }
    }, 10000);
  }

  // Handle Google OAuth callback
  async handleGoogleCallback(response) {
    try {
      this.showLoading('Signing in with Google...');

      const decodedToken = this.parseJwt(response.credential);
      console.log('📥 Google user data:', decodedToken);

      const result = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          idToken: response.credential,
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture,
          googleId: decodedToken.sub
        })
      });

      const data = await result.json();

      if (data.success) {
        this.handleSuccessfulLogin(data);
      } else {
        this.showError(data.message || 'Google sign-in failed');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      this.showError('Failed to sign in with Google. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Trigger Google Sign-In
  signInWithGoogle() {
    if (!this.googleInitialized) {
      this.showError('Google Sign-In is still loading. Please wait a moment and try again.');
      return;
    }

    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.top = '-9999px';
        tempDiv.id = 'g_id_signin_temp';
        document.body.appendChild(tempDiv);

        google.accounts.id.renderButton(
          tempDiv,
          {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            width: 250
          }
        );

        setTimeout(() => {
          const button = tempDiv.querySelector('[role="button"]');
          if (button) {
            button.click();
          }
          setTimeout(() => {
            if (tempDiv.parentNode) {
              tempDiv.parentNode.removeChild(tempDiv);
            }
          }, 2000);
        }, 100);

      } catch (error) {
        console.error('Error triggering Google sign-in:', error);
        this.showError('Failed to open Google sign-in. Please try again.');
      }
    } else {
      this.showError('Google Sign-In is not ready. Please refresh the page.');
    }
  }

  // Check email existence
  async checkEmail(email) {
    try {
      const response = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  }

  // Email/Password Login
  async loginWithEmail(email, password) {
    try {
      this.showLoading('Signing in...');

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.handleSuccessfulLogin(data);
      } else {
        this.showError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showError('Failed to sign in. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Register new user
  async registerWithEmail(name, email, password) {
    try {
      this.showLoading('Creating account...');

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.handleSuccessfulLogin(data);
      } else {
        const errorMessage = data.errors
          ? data.errors.map(err => err.msg).join(', ')
          : data.message || 'Registration failed';
        this.showError(errorMessage);
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showError('Failed to create account. Please try again.');
    } finally {
      this.hideLoading();
    }
  }

  // Handle successful login
  handleSuccessfulLogin(data) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    this.token = data.token;
    this.user = data.user;

    this.showSuccess(`Welcome back, ${data.user.name}!`);

    setTimeout(() => {
      window.location.href = 'chatbot.html';
    }, 1000);
  }

  // Check if user is authenticated
  checkAuthStatus() {
    // Redirect handled after successful login
  }

  // Logout
  async logout() {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      this.token = null;
      this.user = null;
      window.location.href = 'signin.html';
    }
  }

  // Get current user info from server
  async getCurrentUser() {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        this.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Get user error:', error);
      this.logout();
    }
  }

  // Utility: Parse JWT token
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // UI Helpers
  showLoading(message = 'Loading...') {
    const loader = document.getElementById('loadingOverlay');
    const loaderText = document.getElementById('loadingText');
    if (loader) {
      if (loaderText) loaderText.textContent = message;
      loader.style.display = 'flex';
    }
  }

  hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    const existing = document.querySelector('.auth-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `auth-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${type === 'success' ? '✓' : '✕'}</span>
        <span class="notification-message">${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Initialize Auth Manager
const auth = new AuthManager();

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {

  const emailInput = document.querySelector('input[type="email"]');
  const googleBtn = document.getElementById('googleBtn');

  // Google Sign-In handler
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🔵 Google button clicked');
      auth.signInWithGoogle();
    });
  }

  // Email form submission
  const form = document.querySelector('form:not(.modal-form)');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();

      if (!email) {
        auth.showError('Please enter your email address');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        auth.showError('Please enter a valid email address');
        return;
      }

      try {
        auth.showLoading('Checking email...');

        const result = await auth.checkEmail(email);

        auth.hideLoading();

        if (result.exists) {
          if (result.authProvider === 'email') {
            showPasswordModal(email, result.name);
          } else if (result.authProvider === 'google') {
            auth.showError('This email is registered with Google. Please use the "Continue with Google" button above.');
          } else {
            auth.showError(`This email is registered with ${result.authProvider}. Please sign in with ${result.authProvider}.`);
          }
        } else {
          showRegistrationModal(email);
        }
      } catch (error) {
        auth.hideLoading();
        auth.showError('Failed to verify email. Please try again.');
      }
    });
  }
});

// Show password modal for existing users
function showPasswordModal(email, name) {
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      <h2>Welcome back${name ? ', ' + name : ''}!</h2>
      <p class="modal-email">${email}</p>
      <form id="passwordForm" class="modal-form">
        <input 
          type="password" 
          id="passwordInput" 
          placeholder="Enter your password" 
          required 
          minlength="6"
          class="modal-input"
          autocomplete="current-password"
        >
        <button type="submit" class="modal-btn">Sign In</button>
        <a href="#" class="forgot-password" id="forgotPasswordLink">Forgot password?</a>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const passwordForm = modal.querySelector('#passwordForm');
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = modal.querySelector('#passwordInput').value;
    await auth.loginWithEmail(email, password);
    modal.remove();
  });

  const forgotPasswordLink = modal.querySelector('#forgotPasswordLink');
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    modal.remove();
    showForgotPasswordModal(email);
  });

  setTimeout(() => {
    modal.querySelector('#passwordInput').focus();
  }, 100);
}

// Show registration modal for new users
function showRegistrationModal(email) {
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      <h2>Create your account</h2>
      <p class="modal-email">${email}</p>
      <form id="registrationForm" class="modal-form">
        <input 
          type="text" 
          id="nameInput" 
          placeholder="Enter your full name" 
          required 
          minlength="2"
          class="modal-input"
          autocomplete="name"
        >
        <input 
          type="password" 
          id="newPasswordInput" 
          placeholder="Create a password (min. 6 characters)" 
          required 
          minlength="6"
          class="modal-input"
          autocomplete="new-password"
        >
        <button type="submit" class="modal-btn">Create Account</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const registrationForm = modal.querySelector('#registrationForm');
  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = modal.querySelector('#nameInput').value.trim();
    const password = modal.querySelector('#newPasswordInput').value;
    await auth.registerWithEmail(name, email, password);
    modal.remove();
  });

  setTimeout(() => {
    modal.querySelector('#nameInput').focus();
  }, 100);
}

// Forgot Password Modal
function showForgotPasswordModal(email = '') {
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      <h2>Reset Password</h2>
      <p class="modal-description">Enter your email address and we'll send you a verification code.</p>
      <form id="forgotPasswordForm" class="modal-form">
        <input 
          type="email" 
          id="forgotEmailInput" 
          placeholder="Enter your email" 
          required
          value="${email}"
          class="modal-input"
          autocomplete="email"
        >
        <button type="submit" class="modal-btn">Send Verification Code</button>
        <a href="#" class="back-to-signin" id="backToSignIn">Back to Sign In</a>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#backToSignIn').addEventListener('click', (e) => {
    e.preventDefault();
    modal.remove();
  });

  const forgotPasswordForm = modal.querySelector('#forgotPasswordForm');
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailValue = modal.querySelector('#forgotEmailInput').value.trim();

    try {
      auth.showLoading('Sending verification code...');

      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailValue })
      });

      const data = await response.json();
      auth.hideLoading();

      if (data.success) {
        modal.remove();
        showOTPVerificationModal(emailValue);
      } else {
        auth.showError(data.message || 'Failed to send verification code');
      }
    } catch (error) {
      auth.hideLoading();
      console.error('Forgot password error:', error);
      auth.showError('Failed to send verification code. Please try again.');
    }
  });

  setTimeout(() => {
    modal.querySelector('#forgotEmailInput').focus();
  }, 100);
}

// OTP Verification Modal
function showOTPVerificationModal(email) {
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      <h2>Verify Code</h2>
      <p class="modal-description">We sent a 6-digit code to <strong>${email}</strong></p>
      <form id="otpVerificationForm" class="modal-form">
        <div class="otp-inputs">
          <input type="text" maxlength="1" class="otp-input" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" maxlength="1" class="otp-input" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" maxlength="1" class="otp-input" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" maxlength="1" class="otp-input" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" maxlength="1" class="otp-input" pattern="[0-9]" inputmode="numeric" required>
          <input type="text" maxlength="1" class="otp-input" pattern="[0-9]" inputmode="numeric" required>
        </div>
        <button type="submit" class="modal-btn">Verify Code</button>
        <a href="#" class="resend-code" id="resendCode">Resend code</a>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const otpInputs = modal.querySelectorAll('.otp-input');
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!/^\d*$/.test(value)) {
        e.target.value = '';
        return;
      }
      if (value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        otpInputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      pastedData.split('').forEach((char, i) => {
        if (otpInputs[i]) otpInputs[i].value = char;
      });
      const lastFilledIndex = Math.min(pastedData.length - 1, otpInputs.length - 1);
      otpInputs[lastFilledIndex].focus();
    });
  });

  modal.querySelector('#resendCode').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      auth.showLoading('Resending code...');
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      auth.hideLoading();
      if (data.success) {
        auth.showSuccess('Verification code sent!');
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
      } else {
        auth.showError(data.message || 'Failed to resend code');
      }
    } catch (error) {
      auth.hideLoading();
      auth.showError('Failed to resend code. Please try again.');
    }
  });

  const otpForm = modal.querySelector('#otpVerificationForm');
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = Array.from(otpInputs).map(input => input.value).join('');

    if (otp.length !== 6) {
      auth.showError('Please enter the complete 6-digit code');
      return;
    }

    try {
      auth.showLoading('Verifying code...');
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      auth.hideLoading();

      if (data.success) {
        modal.remove();
        showResetPasswordModal(email, data.resetToken);
      } else {
        auth.showError(data.message || 'Invalid verification code');
        otpInputs.forEach(input => input.value = '');
        otpInputs[0].focus();
      }
    } catch (error) {
      auth.hideLoading();
      auth.showError('Failed to verify code. Please try again.');
    }
  });

  setTimeout(() => {
    otpInputs[0].focus();
  }, 100);
}

// Reset Password Modal
function showResetPasswordModal(email, resetToken) {
  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      <h2>Set New Password</h2>
      <p class="modal-description">Enter your new password for <strong>${email}</strong></p>
      <form id="resetPasswordForm" class="modal-form">
        <input 
          type="password" 
          id="newPasswordInput" 
          placeholder="New password (min. 6 characters)" 
          required 
          minlength="6"
          class="modal-input"
          autocomplete="new-password"
        >
        <input 
          type="password" 
          id="confirmPasswordInput" 
          placeholder="Confirm new password" 
          required 
          minlength="6"
          class="modal-input"
          autocomplete="new-password"
        >
        <button type="submit" class="modal-btn">Reset Password</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const resetForm = modal.querySelector('#resetPasswordForm');
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = modal.querySelector('#newPasswordInput').value;
    const confirmPassword = modal.querySelector('#confirmPasswordInput').value;

    if (newPassword !== confirmPassword) {
      auth.showError('Passwords do not match');
      return;
    }

    try {
      auth.showLoading('Resetting password...');
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, resetToken, newPassword })
      });
      const data = await response.json();
      auth.hideLoading();

      if (data.success) {
        modal.remove();
        auth.showSuccess('Password reset successfully! Please sign in with your new password.');
      } else {
        auth.showError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      auth.hideLoading();
      auth.showError('Failed to reset password. Please try again.');
    }
  });

  setTimeout(() => {
    modal.querySelector('#newPasswordInput').focus();
  }, 100);
}

// Export auth for use in other files
window.authManager = auth;

console.log('✅ Auth.js loaded successfully');