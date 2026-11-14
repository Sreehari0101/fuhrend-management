const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.main-nav');
const languageButton = document.querySelector('.language-trigger');
const languageMenu = document.querySelector('.language-menu');
const languageOptions = document.querySelectorAll('.language-option');
const languageKey = 'fuhrend-language';
const languageSeenKey = 'fuhrend-language-menu-seen';
const localeCodes = { en: 'en-GB', cs: 'cs-CZ', ru: 'ru-RU', de: 'de-DE' };
let enquiryStatusKey = null;
let enquirySubmitting = false;

function hasWeb3FormsKey() {
  return Boolean(document.querySelector('#enquiry-form [name="access_key"]')?.value.trim());
}

function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Browsing still works without storage. */ }
}

function browserLocale() {
  const browserLanguage = navigator.languages?.[0] || navigator.language || '';
  return localeCodes[browserLanguage.toLowerCase().split('-')[0]] || 'en-GB';
}

function closeLanguageMenu(returnFocus = false) {
  languageMenu.hidden = true;
  languageButton.setAttribute('aria-expanded', 'false');
  if (returnFocus) languageButton.focus();
}

function openLanguageMenu() {
  closeMenu();
  languageMenu.hidden = false;
  languageButton.setAttribute('aria-expanded', 'true');
  savePreference(languageSeenKey, '1');
}

function applyLanguage(locale, remember = false) {
  const copy = translations[locale] || translations['en-GB'];
  document.documentElement.lang = locale;
  document.title = copy.pageTitle;
  document.querySelector('meta[name="description"]').content = copy.pageDescription;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = copy[element.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', copy[element.dataset.i18nAria]);
  });
  document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
    element.alt = copy[element.dataset.i18nAlt];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = copy[element.dataset.i18nPlaceholder];
  });
  document.querySelectorAll('[data-mail-subject]').forEach((element) => {
    element.href = `mailto:fuhrand@xyz.com?subject=${encodeURIComponent(copy[element.dataset.mailSubject])}`;
  });

  document.querySelector('.language-current').textContent = copy.languageCurrent;
  document.querySelector('.language-code').textContent = { 'en-GB': 'EN', 'cs-CZ': 'CZ', 'ru-RU': 'RU', 'de-DE': 'DE' }[locale];
  languageButton.setAttribute('aria-label', `${copy.languageTitle}: ${copy.languageCurrent}`);
  languageOptions.forEach((option) => {
    const selected = option.dataset.language === locale;
    option.setAttribute('aria-pressed', String(selected));
    option.classList.toggle('is-selected', selected);
  });
  const online = hasWeb3FormsKey();
  document.querySelector('.enquiry-submit [data-i18n]').textContent = copy[online ? (enquirySubmitting ? 'enquirySending' : 'enquirySend') : 'enquirySubmit'];
  document.querySelector('.form-note').textContent = copy[online ? 'enquiryOnlineNote' : 'enquiryNote'];
  const enquiryStatus = document.getElementById('enquiry-status');
  if (enquiryStatusKey) enquiryStatus.textContent = copy[enquiryStatusKey];
  if (remember) savePreference(languageKey, locale);
}

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

menuButton.addEventListener('click', () => {
  closeLanguageMenu();
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

languageButton.addEventListener('click', () => {
  if (languageMenu.hidden) openLanguageMenu();
  else closeLanguageMenu();
});

languageOptions.forEach((option) => {
  option.addEventListener('click', () => {
    applyLanguage(option.dataset.language, true);
    closeLanguageMenu();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!languageMenu.hidden) closeLanguageMenu(true);
    closeMenu();
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) closeMenu();
  if (!event.target.closest('.language-switcher')) closeLanguageMenu();
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 8) {
    closeMenu();
    closeLanguageMenu();
  }
}, { passive: true });

document.getElementById('year').textContent = String(new Date().getFullYear());

const enquiryForm = document.getElementById('enquiry-form');
const enquiryTopic = document.getElementById('enquiry-topic');
const enquiryStatus = document.getElementById('enquiry-status');
const enquirySubmit = enquiryForm.querySelector('.enquiry-submit');
const enquirySubjectKeys = {
  business: 'businessSubject', marketing: 'marketingSubject',
  expat: 'expatSubject', accommodation: 'accommodationSubject',
  software: 'softwareSubject', general: 'generalSubject'
};

document.querySelectorAll('a[data-topic]').forEach((link) => {
  link.addEventListener('click', () => {
    enquiryTopic.value = link.dataset.topic;
  });
});

function buildEnquiryMailto(formData, locale) {
  const copy = translations[locale] || translations['en-GB'];
  const topic = formData.get('topic');
  const subject = copy[enquirySubjectKeys[topic] || 'generalSubject'];
  const topicLabel = enquiryTopic.querySelector(`option[value="${topic}"]`)?.textContent || copy.topicGeneral;
  const body = [
    `${copy.fieldName}: ${formData.get('name')}`,
    `${copy.fieldEmail}: ${formData.get('email')}`,
    `${copy.fieldTopic}: ${topicLabel}`,
    formData.get('phone') ? `${copy.fieldPhone}: ${formData.get('phone')}` : null,
    '', `${copy.fieldMessage}:`, formData.get('message')
  ].filter((line) => line !== null).join('\r\n');
  return `mailto:fuhrand@xyz.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function showEnquiryStatus(key, state) {
  enquiryStatusKey = key;
  enquiryStatus.textContent = translations[document.documentElement.lang][key];
  enquiryStatus.dataset.state = state;
  enquiryStatus.setAttribute('role', state === 'error' ? 'alert' : 'status');
  enquiryStatus.hidden = false;
}

enquiryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (enquirySubmitting || !enquiryForm.reportValidity()) return;
  const locale = document.documentElement.lang;
  if (!hasWeb3FormsKey()) {
    showEnquiryStatus('enquiryStatus', 'info');
    window.location.href = buildEnquiryMailto(new FormData(enquiryForm), locale);
    return;
  }

  const data = Object.fromEntries(new FormData(enquiryForm));
  data.subject = translations[locale][enquirySubjectKeys[data.topic] || 'generalSubject'];
  data.topic = enquiryTopic.selectedOptions[0].textContent;
  enquirySubmitting = true;
  enquirySubmit.disabled = true;
  enquiryForm.setAttribute('aria-busy', 'true');
  showEnquiryStatus('enquirySending', 'info');
  applyLanguage(locale);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    const result = await response.json();
    if (response.ok && result.success === true) {
      enquiryForm.reset();
      showEnquiryStatus('enquirySuccess', 'success');
    } else {
      showEnquiryStatus(response.status === 429 ? 'enquiryRateLimit' : 'enquiryError', 'error');
    }
  } catch {
    showEnquiryStatus('enquiryError', 'error');
  } finally {
    clearTimeout(timeout);
    enquirySubmitting = false;
    enquirySubmit.disabled = false;
    enquiryForm.removeAttribute('aria-busy');
    applyLanguage(document.documentElement.lang);
  }
});

const savedLocale = readPreference(languageKey);
const validSavedLocale = Object.values(localeCodes).includes(savedLocale) ? savedLocale : null;
applyLanguage(validSavedLocale || browserLocale());
if (!validSavedLocale && !readPreference(languageSeenKey)) {
  requestAnimationFrame(openLanguageMenu);
}

const motionPreference = window.matchMedia('(prefers-reduced-motion: no-preference)');

if ('IntersectionObserver' in window && motionPreference.matches) {
  const revealTargets = document.querySelectorAll('[data-reveal]');
  document.documentElement.classList.add('motion-ready');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      revealTargets.forEach((target) => revealObserver.observe(target));
    });
  });

  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) return;
    revealObserver.disconnect();
    document.documentElement.classList.remove('motion-ready');
  });
}
