// #region Utility Functions

/**
 * Debounce function to limit function execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// #endregion

// #region Vanta.js Background Animation
// ----------------------------------------------------------------------------
// Handles the animated background effect using Vanta.js HALO effect
// NOW LOADS ON ALL DEVICES AND CONDITIONS

document.addEventListener("DOMContentLoaded", function() {
  let vantaEffect;
  
  /**
   * Initialize or reinitialize Vanta effect with responsive settings
   */
  function initVanta() {
    // Check if Vanta is loaded
    if (typeof VANTA === 'undefined') {
      console.warn('Vanta.js not loaded yet, retrying...');
      // Retry after a short delay
      setTimeout(initVanta, 500);
      return;
    }

    // Destroy existing instance to prevent memory leaks
    if (vantaEffect) {
      vantaEffect.destroy();
    }
    
    // Detect screen size for responsive configuration
    const width = window.innerWidth;
    const isMobile = width <= 768;
    const isTablet = width <= 1024 && width > 768;
    
    try {
      // Initialize Vanta with device-specific performance settings
      vantaEffect = VANTA.HALO({
        el: "#hero",
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        backgroundColor: 0x050505,
        baseColor: 0x2a4db5,
        // Performance scaling based on device - mobile gets lighter settings
        amplitudeFactor: isMobile ? 1.00 : (isTablet ? 1.25 : 1.50),
        xOffset: 0.00,
        yOffset: 0.00,
        size: isMobile ? 0.80 : (isTablet ? 1.00 : 1.20),
        speed: isMobile ? 0.50 : (isTablet ? 0.75 : 1.00)
      });
      
      console.log('Vanta.js initialized successfully');
    } catch (error) {
      console.error('Vanta.js initialization failed:', error);
    }
  }
  
  // Initialize on page load
  initVanta();
  
  // Debounced resize handler to prevent performance issues
  const debouncedInit = debounce(initVanta, 250);
  window.addEventListener('resize', debouncedInit);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (vantaEffect) {
      vantaEffect.destroy();
    }
  });
});

// #endregion

// #region Theme Switching (Dark/Light Mode)
// ----------------------------------------------------------------------------
// Manages theme toggle between light and dark modes
// Persists user preference in localStorage

document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.querySelector('.theme-switch__checkbox');
  const body = document.body;
  
  if (!themeToggle) return;
  
  // Load saved theme or default to light mode
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  // Apply saved theme
  if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.checked = true;
    themeToggle.setAttribute('aria-checked', 'true');
  }
  
  // Theme toggle event handler
  themeToggle.addEventListener('change', function() {
    const isDark = this.checked;
    
    if (isDark) {
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
      this.setAttribute('aria-checked', 'true');
    } else {
      body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
      this.setAttribute('aria-checked', 'false');
    }
  });
});

// #endregion

// #region Mobile Navigation Menu
// ----------------------------------------------------------------------------
// Handles hamburger menu functionality for mobile devices
// Includes click-outside-to-close and link-click-to-close behaviors

document.addEventListener('DOMContentLoaded', function() {
  const navToggler = document.getElementById('navToggler');
  const navMenu = document.getElementById('navMenu');
  const header = document.querySelector('header');
  
  if (!navToggler || !navMenu) return;
  
  /**
   * Toggle menu open/closed state
   */
  function toggleMenu() {
    const isActive = navMenu.classList.toggle('active');
    navToggler.classList.toggle('active');
    navToggler.setAttribute('aria-expanded', isActive);
    
    // Trap focus when menu is open
    if (isActive) {
      trapFocus(navMenu);
    }
  }
  
  /**
   * Close the menu
   */
  function closeMenu() {
    navMenu.classList.remove('active');
    navToggler.classList.remove('active');
    navToggler.setAttribute('aria-expanded', 'false');
  }
  
  /**
   * Trap focus within an element
   * @param {HTMLElement} element - Element to trap focus within
   */
  function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    // Focus first element
    firstFocusable.focus();
    
    // Handle Tab key
    element.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    });
  }
  
  // Toggle menu on hamburger click
  navToggler.addEventListener('click', toggleMenu);
  
  // Close menu when clicking navigation links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    const isClickInsideNav = header.contains(event.target);
    
    if (!isClickInsideNav && navMenu.classList.contains('active')) {
      closeMenu();
    }
  });
  
  // Close menu on Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && navMenu.classList.contains('active')) {
      closeMenu();
      navToggler.focus();
    }
  });
});

// #endregion

// #region Keyboard Navigation for Partners
// ----------------------------------------------------------------------------
// Adds keyboard support for partner logos

document.addEventListener('DOMContentLoaded', function() {
  const partnerFigures = document.querySelectorAll('.partners figure[tabindex="0"]');
  
  partnerFigures.forEach(figure => {
    figure.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        console.log('Partner selected:', this.querySelector('figcaption').textContent);
      }
    });
  });
});

// #endregion

// #region Language Switching (Arabic/English)
// ----------------------------------------------------------------------------
// Manages bilingual interface with RTL/LTR support
// Handles all text content, HTML attributes, and layout adjustments
// Persists language preference in localStorage

(function() {
  'use strict';

  // Translation data structure
  const translations = {
    ar: {
      // HTML attributes
      htmlLang: 'ar',
      htmlDir: 'rtl',
      
      // Meta tags
      title: 'مذاكر الـ AI | تعلم باستخدام الذكاء الاصطناعي ببساطة',
      
      // Navigation
      navBrand: 'مُذاكِر',
      aboutLink: 'عن مُذاكِر',
      contactLink: 'راسلنا',
      signinLink: 'تسجيل الدخول',
      
      // Hero section
      heroText: 'مذاكر الـ AI هو مكانك للتعلم باستخدام الذكاء الاصطناعي بأسلوب بسيط وعملي، من الأساسيات حتى التطبيق، خطوة بخطوة وباللغة التي تفهمها.',
      heroButton: 'ابدأ الأن',
      
      // Partners section
      partnersTitle: 'شركاؤنا',
      partnerGoogle: 'جوجل',
      partnerMeta: 'ميتا',
      partnerMicrosoft: 'مايكروسوفت',
      partnerLinkedIn: 'لينكد إن',
      partnerGitHub: 'جيت هاب',
      partnerApple: 'أبل',
      partnerAmazon: 'أمازون',
      partnerYouTube: 'يوتيوب',
      
      // Contact form
      contactTitle: 'راسلنا',
      nameLabel: 'الاسم',
      namePlaceholder: 'اسمك',
      emailLabel: 'الايميل',
      emailPlaceholder: 'example@gmail.com',
      messageLabel: 'الرسالة',
      messagePlaceholder: 'اترك رسالتك هنا',
      submitButton: 'إرسال',
      
      // Footer
      footerDescription: 'تنظيم مذاكرتك باستخدام الذكاء الاصطناعي, لرفع إنتاجيتك و تحسين أدائك و مستواك الدراسي.',
      footerCopyright: 'جميع الحقوق محفوظة لفريق مذاكر 2026 ©',
      
      // Accessibility
      skipLink: 'انتقل إلى المحتوى الرئيسي',
      navToggleLabel: 'فتح قائمة التنقل',
      themeToggleLabel: 'تبديل الوضع الداكن'
    },
    en: {
      // HTML attributes
      htmlLang: 'en',
      htmlDir: 'ltr',
      
      // Meta tags
      title: 'Mozaker AI | Learn Using Artificial Intelligence Simply',
      
      // Navigation
      navBrand: 'Mozaker',
      aboutLink: 'About Mozaker',
      contactLink: 'Contact Us',
      signinLink: 'Sign In',
      
      // Hero section
      heroText: 'Mozaker AI is your place to learn using artificial intelligence in a simple and practical way, from basics to application, step by step in the language you understand.',
      heroButton: 'Start Now',
      
      // Partners section
      partnersTitle: 'Our Partners',
      partnerGoogle: 'Google',
      partnerMeta: 'Meta',
      partnerMicrosoft: 'Microsoft',
      partnerLinkedIn: 'LinkedIn',
      partnerGitHub: 'GitHub',
      partnerApple: 'Apple',
      partnerAmazon: 'Amazon',
      partnerYouTube: 'YouTube',
      
      // Contact form
      contactTitle: 'Contact Us',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'example@gmail.com',
      messageLabel: 'Message',
      messagePlaceholder: 'Leave your message here',
      submitButton: 'Send',
      
      // Footer
      footerDescription: 'Organize your studies using artificial intelligence to increase your productivity and improve your academic performance and level.',
      footerCopyright: '© 2026 All rights reserved to Mozaker Team',
      
      // Accessibility
      skipLink: 'Skip to main content',
      navToggleLabel: 'Toggle navigation menu',
      themeToggleLabel: 'Toggle dark mode'
    }
  };

  // Get current language from localStorage or default to Arabic
  let currentLang = localStorage.getItem('language') || 'ar';

  /**
   * Update all page content based on selected language
   * @param {string} lang - Language code ('ar' or 'en')
   */
  function updateContent(lang) {
    const content = translations[lang];
    
    // Update HTML root attributes
    document.documentElement.lang = content.htmlLang;
    document.documentElement.dir = content.htmlDir;
    
    // Update page title
    document.title = content.title;
    
    // Update skip link
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) skipLink.textContent = content.skipLink;
    
    // Update navigation elements
    const navBrand = document.querySelector('.nav-brand');
    if (navBrand) navBrand.textContent = content.navBrand;
    
    const navToggler = document.getElementById('navToggler');
    if (navToggler) navToggler.setAttribute('aria-label', content.navToggleLabel);
    
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks[0]) navLinks[0].textContent = content.aboutLink;
    if (navLinks[1]) navLinks[1].textContent = content.contactLink;
    if (navLinks[2]) navLinks[2].textContent = content.signinLink;
    
    // Update theme toggle
    const themeToggle = document.querySelector('.theme-switch');
    if (themeToggle) themeToggle.setAttribute('aria-label', content.themeToggleLabel);
    
    // Update hero section
    const heroText = document.querySelector('.hero h2');
    if (heroText) {
      const strongText = lang === 'ar' ? 'مذاكر' : 'Mozaker';
      const aiPrefix = lang === 'ar' ? ' الـ' : '';
      const mainText = content.heroText.replace(lang === 'ar' ? 'مذاكر الـ AI ' : 'Mozaker AI ', '');
      heroText.innerHTML = `<strong>${strongText}</strong>${aiPrefix} <bdi>AI</bdi> ${mainText}`;
    }
    
    const heroButton = document.querySelector('.hero .btn-primary');
    if (heroButton) {
      const svgElement = heroButton.querySelector('svg');
      heroButton.innerHTML = `${content.heroButton} `;
      if (svgElement) {
        heroButton.appendChild(svgElement);
      }
    }
    
    // Update partners section
    const partnersTitle = document.querySelector('.partners h2');
    if (partnersTitle) partnersTitle.textContent = content.partnersTitle;
    
    // Update partner company names - optimized batch update
    const partnerMapping = {
      'google': content.partnerGoogle,
      'meta': content.partnerMeta,
      'microsoft': content.partnerMicrosoft,
      'linkedin': content.partnerLinkedIn,
      'github': content.partnerGitHub,
      'apple': content.partnerApple,
      'amazon': content.partnerAmazon,
      'youtube': content.partnerYouTube
    };
    
    // Batch update all captions
    const allCaptions = document.querySelectorAll('figcaption[data-partner]');
    allCaptions.forEach(caption => {
      const partner = caption.dataset.partner;
      if (partnerMapping[partner]) {
        caption.textContent = partnerMapping[partner];
      }
    });
    
    // Update contact form
    const contactLegend = document.querySelector('.contact legend');
    if (contactLegend) contactLegend.textContent = content.contactTitle;
    
    const nameLabel = document.querySelector('label[for="name"]');
    if (nameLabel) {
      nameLabel.innerHTML = `${content.nameLabel} <span class="required-indicator" aria-label="required">*</span>`;
    }
    
    const nameInput = document.querySelector('#name');
    if (nameInput) nameInput.placeholder = content.namePlaceholder;
    
    const emailLabel = document.querySelector('label[for="email"]');
    if (emailLabel) {
      emailLabel.innerHTML = `${content.emailLabel} <span class="required-indicator" aria-label="required">*</span>`;
    }
    
    const emailInput = document.querySelector('#email');
    if (emailInput) emailInput.placeholder = content.emailPlaceholder;
    
    const messageLabel = document.querySelector('label[for="text"]');
    if (messageLabel) {
      messageLabel.innerHTML = `${content.messageLabel} <span class="required-indicator" aria-label="required">*</span>`;
    }
    
    const messageTextarea = document.querySelector('#text');
    if (messageTextarea) messageTextarea.placeholder = content.messagePlaceholder;
    
    const submitButton = document.querySelector('form button[type="submit"]');
    if (submitButton) submitButton.textContent = content.submitButton;
    
    // Update footer
    const footerBrand = document.querySelector('footer h2');
    if (footerBrand) footerBrand.textContent = content.navBrand;
    
    const footerDesc = document.querySelector('footer h2 + p');
    if (footerDesc) footerDesc.textContent = content.footerDescription;
    
    const footerCopyright = document.querySelector('footer p:last-child');
    if (footerCopyright) {
      footerCopyright.innerHTML = content.footerCopyright.replace('2026', '<bdi>2026</bdi>');
    }
    
    // Save language preference
    localStorage.setItem('language', lang);
    currentLang = lang;
  }

  /**
   * Initialize language system on page load
   */
  function initLanguage() {
    // Set correct radio button as checked
    const radioButtons = document.querySelectorAll('input[name="value-radio"]');
    radioButtons.forEach(radio => {
      radio.checked = (radio.value === currentLang);
    });
    
    // Apply current language
    updateContent(currentLang);
    
    // Add event listeners to radio buttons
    radioButtons.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.checked) {
          updateContent(this.value);
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
  } else {
    initLanguage();
  }
})();

// #endregion

// #region Form Validation
// ----------------------------------------------------------------------------
// Client-side form validation with accessibility

document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  
  if (!form) return;
  
  // Add real-time validation
  const inputs = form.querySelectorAll('input, textarea');
  
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      validateInput(this);
    });
    
    input.addEventListener('input', function() {
      if (this.classList.contains('invalid')) {
        validateInput(this);
      }
    });
  });
  
  /**
   * Validate a single input
   * @param {HTMLElement} input - Input element to validate
   */
  function validateInput(input) {
    const errorElement = document.getElementById(input.id + '-error');
    
    if (!input.validity.valid) {
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      
      if (errorElement) {
        if (input.validity.valueMissing) {
          errorElement.textContent = 'هذا الحقل مطلوب / This field is required';
        } else if (input.validity.typeMismatch) {
          errorElement.textContent = 'الرجاء إدخال بريد إلكتروني صحيح / Please enter a valid email';
        } else if (input.validity.tooShort) {
          errorElement.textContent = 'النص قصير جداً / Text is too short';
        }
        errorElement.classList.add('active');
      }
    } else {
      input.classList.remove('invalid');
      input.setAttribute('aria-invalid', 'false');
      
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('active');
      }
    }
  }
  
  // Form submission
  form.addEventListener('submit', function(e) {
    let isValid = true;
    
    inputs.forEach(input => {
      validateInput(input);
      if (!input.validity.valid) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      e.preventDefault();
      // Focus first invalid input
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) {
        firstInvalid.focus();
      }
    }
  });
});

// #endregion

// #region Performance Monitoring (Optional)
// ----------------------------------------------------------------------------
// Log performance metrics for debugging

if ('performance' in window) {
  window.addEventListener('load', function() {
    setTimeout(function() {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      
      console.log('Performance Metrics:');
      console.log('Page Load Time:', pageLoadTime + 'ms');
      console.log('Connect Time:', connectTime + 'ms');
      console.log('Render Time:', renderTime + 'ms');
    }, 0);
  });
}

// #endregion