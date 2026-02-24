// Translations object
const translations = {
  en: {
    welcome: "Welcome back",
    continueGoogle: "Continue With Google",
    or: "or",
    emailPlaceholder: "Enter email address",
    continue: "Continue",
    agreementText: "By continuing, you agree to Mozaker",
    terms: "Terms of Service",
    and: "and",
    privacy: "Privacy Policy"
  },
  ar: {
    welcome: "مرحباً بعودتك",
    continueGoogle: "المتابعة مع جوجل",
    or: "أو",
    emailPlaceholder: "أدخل البريد الإلكتروني",
    continue: "المتابعة",
    agreementText: "بالمتابعة، أنت توافق على",
    terms: "شروط الخدمة",
    and: "و",
    privacy: "سياسة الخصوصية",
    noAccount: "ليس لديك حساب؟ ادخل الايميل الخاص بك واضغط المتابعة لانشاء حساب"
  }
};

// Current language state
let currentLang = localStorage.getItem('language') || 'en';

// Initialize language on page load
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
});

// Language switcher functionality
const langToggle = document.getElementById('langToggle');
const langText = document.getElementById('langText');

langToggle.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  setLanguage(currentLang);
  localStorage.setItem('language', currentLang);
});

// Function to set language
function setLanguage(lang) {
  const html = document.documentElement;
  const body = document.body;
  const formContainer = document.getElementById('formContainer');
  
  // Update HTML attributes
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  
  // Update body font family
  if (lang === 'ar') {
    body.style.fontFamily = '"Cairo", "Roboto", sans-serif';
  } else {
    body.style.fontFamily = '"Roboto", sans-serif';
  }
  
  // Update form container classes for alignment
  if (lang === 'ar') {
    formContainer.classList.remove('justify-content-xxlg-end', 'pe-xxlg-5');
    formContainer.classList.add('justify-content-xxlg-start', 'ps-xxlg-5');
  } else {
    formContainer.classList.remove('justify-content-xxlg-start', 'ps-xxlg-5');
    formContainer.classList.add('justify-content-xxlg-end', 'pe-xxlg-5');
  }
  
  // Update language button text
  langText.textContent = lang === 'en' ? 'AR' : 'EN';
  langToggle.setAttribute('aria-label', lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية');
  
  // Update all text content
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });
  
  // Update placeholder
  const emailInput = document.querySelector('[data-i18n-placeholder]');
  if (emailInput) {
    emailInput.placeholder = translations[lang].emailPlaceholder;
  }
  
  // Update meta tags
  document.querySelector('meta[property="og:locale"]').content = lang === 'ar' ? 'ar_EG' : 'en_US';
  document.title = lang === 'ar' ? 'مذاكر الـ AI | تسجيل الدخول' : 'Mozaker AI | Sign In';

  // Make Account Paragraph
  const mkAccParagraph = document.querySelector('.mk-acc');
  if (mkAccParagraph) {
    mkAccParagraph.textContent = lang === 'ar' ? 
      'ليس لديك حساب؟ ادخل الايميل الخاص بك واضغط المتابعة لانشاء حساب' : 
      'If You Don\'t Have An Account Insert Your Email Address And Click Continue To Make One.';
  }
  
  // Update canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = lang === 'ar' ? 'https://mozaker.com/ar/signin' : 'https://mozaker.com/en/signin';
  }
}