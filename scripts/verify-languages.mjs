import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const root = new URL('../', import.meta.url);
const profile = `/tmp/fuhrend-i18n-${process.pid}`;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });

async function getPort() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (existsSync(`${profile}/DevToolsActivePort`)) {
      return Number((await readFile(`${profile}/DevToolsActivePort`, 'utf8')).split('\n')[0]);
    }
    await delay(100);
  }
  throw new Error('Chrome debugging port did not open');
}

let socket;
try {
  const port = await getPort();
  const pageUrl = new URL('index.html', root).href;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await delay(1700);

  const unboundText = await evaluate(`(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const values = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const value = node.textContent.trim();
      if (value && !node.parentElement.closest('[data-i18n]')) values.push(value);
    }
    return [...new Set(values)];
  })()`);
  console.log('unbound text', JSON.stringify(unboundText));

  const missingCopy = await evaluate(`(() => {
    const keys = [...document.querySelectorAll('[data-i18n], [data-i18n-alt], [data-i18n-aria], [data-i18n-placeholder]')]
      .flatMap((element) => [element.dataset.i18n, element.dataset.i18nAlt, element.dataset.i18nAria, element.dataset.i18nPlaceholder].filter(Boolean));
    return Object.entries(translations).flatMap(([locale, copy]) => keys.filter((key) => !copy[key]).map((key) => locale + ':' + key));
  })()`);
  if (missingCopy.length) throw new Error(`Missing translations: ${missingCopy.join(', ')}`);
  const hasConfiguredKey = await evaluate('hasWeb3FormsKey()');

  for (const width of [1440, 1101, 1100, 1001, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 500 });
    await delay(150);
    const layout = await evaluate(`(() => {
      const bounds = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
      };
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, brand: bounds('.brand'), language: bounds('.language-trigger'), menuButton: bounds('.menu-button'), menu: bounds('.language-menu'), menuVisible: !document.querySelector('.language-menu').hidden, whatsapp: bounds('.whatsapp-float'), whatsappHref: document.querySelector('.whatsapp-float').href, whatsappIconLoaded: document.querySelector('.whatsapp-float img').naturalWidth > 0 };
    })()`);
    console.log(width, JSON.stringify(layout));
    if (layout.scrollWidth > layout.viewport + 1) throw new Error(`${width}px horizontal overflow`);
    if (layout.language.right > layout.viewport || layout.brand.left < 0) throw new Error(`${width}px header overflow`);
    if (layout.whatsapp.left < 0 || layout.whatsapp.right > layout.viewport || layout.whatsappHref !== 'https://wa.me/420776759252' || !layout.whatsappIconLoaded) throw new Error(`${width}px WhatsApp button failed`);
    if (width < 500 && layout.menuButton.right > layout.viewport) throw new Error(`${width}px menu button overflow`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`/tmp/fuhrend-${width}-language.png`, Buffer.from(screenshot.data, 'base64'));
    if (width === 1440 || width === 320) {
      await evaluate("window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");
      await delay(100);
      const footerOverlap = await evaluate(`(() => {
        const link = document.querySelector('.footer-bottom a').getBoundingClientRect();
        const button = document.querySelector('.whatsapp-float').getBoundingClientRect();
        return link.left < button.right && link.right > button.left && link.top < button.bottom && link.bottom > button.top;
      })()`);
      if (footerOverlap) throw new Error(`${width}px WhatsApp button covers footer link`);
      const footerShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(`/tmp/fuhrend-footer-${width}.png`, Buffer.from(footerShot.data, 'base64'));
      await evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
    }
    if (width === 1440 || width === 768 || width === 390) {
      await evaluate("document.querySelector('#software').scrollIntoView({ behavior: 'instant' })");
      await delay(1000);
      const softwareShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(`/tmp/fuhrend-software-${width}.png`, Buffer.from(softwareShot.data, 'base64'));
      await evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
    }
    if (width === 768) {
      await evaluate("document.querySelector('#contact').scrollIntoView({ behavior: 'instant' })");
      await delay(150);
      const tabletShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile('/tmp/fuhrend-contact-768.png', Buffer.from(tabletShot.data, 'base64'));
      await evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
    }
  }

  for (const locale of ['cs-CZ', 'ru-RU', 'de-DE', 'en-GB']) {
    const state = await evaluate(`(() => {
      document.querySelector('[data-language="${locale}"]').click();
      const products = [...document.querySelectorAll('.software-product')];
      products.forEach((product) => product.querySelector('summary').click());
      return { lang: document.documentElement.lang, title: document.title, headline: document.querySelector('.hero-statement').innerText, service: document.querySelector('#business-title').innerText, software: document.querySelector('#software-title').innerText, wayfinders: document.querySelectorAll('.wayfinder-item').length, cards: document.querySelectorAll('.service-card').length, productOpen: products.every((product) => product.open), productText: products.map((product) => product.querySelector('p').textContent), choice: document.querySelector('.language-current').innerText, stored: localStorage.getItem('fuhrend-language'), formHeading: document.querySelector('#enquiry-title').innerText, namePlaceholder: document.querySelector('#enquiry-name').placeholder, topicOptions: [...document.querySelector('#enquiry-topic').options].map((option) => option.textContent), formNote: document.querySelector('.form-note').innerText, whatsappLabel: document.querySelector('.whatsapp-float').getAttribute('aria-label') };
    })()`);
    console.log(locale, JSON.stringify(state));
    if (state.lang !== locale || state.stored !== locale) throw new Error(`${locale} selection failed`);
    const copy = await evaluate(`translations['${locale}']`);
    if (state.whatsappLabel !== copy.whatsappChat) throw new Error(`${locale} WhatsApp label failed`);
    if (state.formHeading !== copy.enquiryTitle || state.namePlaceholder !== copy.placeholderName || state.topicOptions[1] !== copy.serviceBusiness || state.formNote !== copy[hasConfiguredKey ? 'enquiryOnlineNote' : 'enquiryNote']) throw new Error(`${locale} form translation failed`);
    if (state.software !== copy.serviceSoftware || state.wayfinders !== 5 || state.cards !== 5 || !state.productOpen || state.productText.some((value) => value !== copy.softwareSoon) || !state.topicOptions.includes(copy.topicSoftware)) throw new Error(`${locale} software service failed`);
    await evaluate("document.querySelectorAll('.software-product').forEach((product) => { product.open = false; })");
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
    await delay(100);
    const mobileLayout = await evaluate(`(() => ({
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      heroBottom: Math.round(document.querySelector('.hero').getBoundingClientRect().bottom),
      actionsBottom: Math.round(document.querySelector('.hero-actions').getBoundingClientRect().bottom)
    }))()`);
    console.log(`${locale} mobile`, JSON.stringify(mobileLayout));
    if (mobileLayout.scrollWidth > mobileLayout.viewport + 1 || mobileLayout.actionsBottom > mobileLayout.heroBottom) throw new Error(`${locale} mobile overflow`);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`/tmp/fuhrend-320-${locale}.png`, Buffer.from(screenshot.data, 'base64'));
    await evaluate("document.querySelector('#contact').scrollIntoView({ behavior: 'instant' })");
    await delay(150);
    const formLayout = await evaluate(`(() => {
      const form = document.querySelector('.enquiry-form').getBoundingClientRect();
      const field = document.querySelector('#enquiry-name').getBoundingClientRect();
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, formLeft: Math.round(form.left), formRight: Math.round(form.right), fieldLeft: Math.round(field.left), fieldRight: Math.round(field.right) };
    })()`);
    console.log(`${locale} contact mobile`, JSON.stringify(formLayout));
    if (formLayout.scrollWidth > formLayout.viewport + 1 || formLayout.formLeft < 0 || formLayout.formRight > formLayout.viewport || formLayout.fieldRight > formLayout.formRight) throw new Error(`${locale} contact mobile overflow`);
    const contactShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(`/tmp/fuhrend-contact-320-${locale}.png`, Buffer.from(contactShot.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 1101, height: 844, deviceScaleFactor: 1, mobile: false });
    await delay(100);
    const headerLayout = await evaluate(`(() => ({
      navRight: Math.round(document.querySelector('.main-nav').getBoundingClientRect().right),
      languageLeft: Math.round(document.querySelector('.language-trigger').getBoundingClientRect().left),
      ctaWidth: document.querySelector('.header-cta').clientWidth,
      ctaScrollWidth: document.querySelector('.header-cta').scrollWidth
    }))()`);
    console.log(`${locale} desktop header`, JSON.stringify(headerLayout));
    if (headerLayout.navRight + 10 > headerLayout.languageLeft || headerLayout.ctaScrollWidth > headerLayout.ctaWidth) throw new Error(`${locale} desktop header collision`);
    await evaluate("document.querySelector('.language-trigger').click()");
  }

  const formFlow = await evaluate(`(() => {
    document.querySelector('a[data-topic="expat"]').click();
    const selected = document.querySelector('#enquiry-topic').value;
    const form = document.querySelector('#enquiry-form');
    const invalid = form.checkValidity();
    form.elements.name.value = 'Test Visitor';
    form.elements.email.value = 'visitor@example.com';
    form.elements.message.value = 'Please tell me about the process.';
    const valid = form.checkValidity();
    const href = buildEnquiryMailto(new FormData(form), document.documentElement.lang);
    return { selected, invalid, valid, href };
  })()`);
  if (formFlow.selected !== 'expat' || formFlow.invalid || !formFlow.valid || !formFlow.href.startsWith('mailto:office@fuhrend.eu?')) throw new Error('Enquiry form flow failed');
  const decodedMailto = decodeURIComponent(formFlow.href);
  if (!decodedMailto.includes('Test Visitor') || !decodedMailto.includes('Please tell me about the process.') || !decodedMailto.includes('Expat services')) throw new Error('Enquiry draft is incomplete');
  console.log('enquiry validation and draft', 'OK');
  const softwareMailto = await evaluate(`(() => {
    document.querySelector('a[data-topic="software"]').click();
    return { selected: document.querySelector('#enquiry-topic').value, href: buildEnquiryMailto(new FormData(document.querySelector('#enquiry-form')), document.documentElement.lang) };
  })()`);
  if (softwareMailto.selected !== 'software' || !decodeURIComponent(softwareMailto.href).includes('Software solutions enquiry')) throw new Error('Software enquiry route failed');

  const onlineFlow = await evaluate(`(async () => {
    const form = document.querySelector('#enquiry-form');
    form.elements.access_key.value = 'test-access-key';
    form.elements.name.value = 'Test Visitor';
    form.elements.email.value = 'visitor@example.com';
    form.elements.topic.value = 'software';
    form.elements.message.value = 'Please let me know when it is available.';
    applyLanguage('en-GB');
    let request;
    window.fetch = async (url, options) => {
      request = { url, method: options.method, headers: options.headers, data: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    };
    const buttonBefore = form.querySelector('.enquiry-submit [data-i18n]').textContent;
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const dialog = document.querySelector('#enquiry-dialog');
    return { request, buttonBefore, status: document.querySelector('#enquiry-status').textContent, state: document.querySelector('#enquiry-status').dataset.state, cleared: !form.elements.name.value, note: document.querySelector('.form-note').textContent, dialogOpen: dialog.open, dialogState: dialog.dataset.state, dialogTitle: dialog.querySelector('h2').textContent, emailHidden: dialog.querySelector('.enquiry-dialog-email').hidden };
  })()`);
  if (onlineFlow.buttonBefore !== 'Send enquiry' || onlineFlow.request?.url !== 'https://api.web3forms.com/submit' || onlineFlow.request.method !== 'POST' || onlineFlow.request.data.access_key !== 'test-access-key' || onlineFlow.request.data.subject !== 'Software solutions enquiry' || onlineFlow.request.data.name !== 'Test Visitor' || onlineFlow.status !== 'Thank you. Your enquiry has been sent. We will reply by email.' || onlineFlow.state !== 'success' || !onlineFlow.cleared || !onlineFlow.note.includes('Web3Forms') || !onlineFlow.dialogOpen || onlineFlow.dialogState !== 'success' || onlineFlow.dialogTitle !== 'Thank you for getting in touch.' || !onlineFlow.emailHidden) throw new Error('Web3Forms success flow failed');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(300);
  const successShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/fuhrend-enquiry-success-mobile.png', Buffer.from(successShot.data, 'base64'));

  const failedFlow = await evaluate(`(async () => {
    document.querySelector('#enquiry-dialog').close();
    const form = document.querySelector('#enquiry-form');
    form.elements.name.value = 'Retry Visitor';
    form.elements.email.value = 'retry@example.com';
    form.elements.topic.value = 'general';
    form.elements.message.value = 'Please contact me.';
    window.fetch = async () => ({ ok: false, status: 429, json: async () => ({ success: false }) });
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const dialog = document.querySelector('#enquiry-dialog');
    const limited = { state: document.querySelector('#enquiry-status').dataset.state, text: document.querySelector('#enquiry-status').textContent, retained: form.elements.name.value === 'Retry Visitor', open: dialog.open, title: dialog.querySelector('h2').textContent, body: dialog.querySelector('.enquiry-dialog-body').textContent, emailHref: dialog.querySelector('.enquiry-dialog-email').href, emailVisible: !dialog.querySelector('.enquiry-dialog-email').hidden };
    dialog.close();
    window.fetch = async () => { throw new TypeError('Network unavailable'); };
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { limited, network: document.querySelector('#enquiry-status').textContent, enabled: !form.querySelector('.enquiry-submit').disabled, retained: form.elements.name.value === 'Retry Visitor', dialogOpen: dialog.open, dialogBody: dialog.querySelector('.enquiry-dialog-body').textContent };
  })()`);
  if (failedFlow.limited.state !== 'error' || !failedFlow.limited.text.includes('Too many requests') || !failedFlow.limited.retained || !failedFlow.limited.open || !failedFlow.limited.title.includes("couldn't send") || !failedFlow.limited.body.includes('request limit') || !failedFlow.limited.emailVisible || !decodeURIComponent(failedFlow.limited.emailHref).includes('Retry Visitor') || !failedFlow.network.includes('could not be sent') || !failedFlow.enabled || !failedFlow.retained || !failedFlow.dialogOpen || !failedFlow.dialogBody.includes('trouble sending')) throw new Error('Web3Forms failure flow failed');
  await delay(300);
  const errorShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/fuhrend-enquiry-error-mobile.png', Buffer.from(errorShot.data, 'base64'));
  for (const locale of ['cs-CZ', 'ru-RU', 'de-DE', 'en-GB']) {
    await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true });
    const translatedOnline = await evaluate(`(() => {
      applyLanguage('${locale}');
      const button = document.querySelector('.enquiry-submit');
      const dialog = document.querySelector('#enquiry-dialog');
      const bounds = dialog.getBoundingClientRect();
      return { button: button.querySelector('[data-i18n]').textContent, note: document.querySelector('.form-note').textContent, status: document.querySelector('#enquiry-status').textContent, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth, buttonWidth: button.clientWidth, buttonContentWidth: button.scrollWidth, dialogTitle: dialog.querySelector('h2').textContent, dialogBody: dialog.querySelector('.enquiry-dialog-body').textContent, dialogLeft: bounds.left, dialogRight: bounds.right, dialogScrollWidth: dialog.scrollWidth, dialogWidth: dialog.clientWidth };
    })()`);
    const copy = await evaluate(`translations['${locale}']`);
    if (translatedOnline.button !== copy.enquirySend || translatedOnline.note !== copy.enquiryOnlineNote || translatedOnline.status !== copy.enquiryError || translatedOnline.dialogTitle !== copy.enquiryDialogErrorTitle || translatedOnline.dialogBody !== copy.enquiryDialogErrorBody || translatedOnline.scrollWidth > translatedOnline.viewport + 1 || translatedOnline.buttonContentWidth > translatedOnline.buttonWidth || translatedOnline.dialogLeft < 0 || translatedOnline.dialogRight > translatedOnline.viewport || translatedOnline.dialogScrollWidth > translatedOnline.dialogWidth + 1) throw new Error(`${locale} Web3Forms translation or mobile layout failed`);
  }
  for (const width of [768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    const dialogLayout = await evaluate(`(() => {
      const dialog = document.querySelector('#enquiry-dialog');
      const rect = dialog.getBoundingClientRect();
      return { viewport: innerWidth, left: rect.left, right: rect.right, scrollWidth: dialog.scrollWidth, width: dialog.clientWidth };
    })()`);
    if (dialogLayout.left < 0 || dialogLayout.right > dialogLayout.viewport || dialogLayout.scrollWidth > dialogLayout.width + 1) throw new Error(`${width}px enquiry dialog overflow`);
  }
  const errorDesktopShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/fuhrend-enquiry-error-desktop.png', Buffer.from(errorDesktopShot.data, 'base64'));
  const dialogClosed = await evaluate(`(async () => {
    document.querySelector('.enquiry-dialog-dismiss').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { closed: !document.querySelector('#enquiry-dialog').open, focusReturned: document.activeElement === document.querySelector('.enquiry-submit'), focusTag: document.activeElement?.tagName, focusClass: document.activeElement?.className };
  })()`);
  if (!dialogClosed.closed || !dialogClosed.focusReturned) throw new Error(`Enquiry dialog dismissal failed: ${JSON.stringify(dialogClosed)}`);
  console.log('Web3Forms success, rate limit and network failure', 'OK');

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('#contact').scrollIntoView({ behavior: 'instant' })");
  await delay(200);
  const desktopShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/fuhrend-contact-desktop.png', Buffer.from(desktopShot.data, 'base64'));
  await evaluate("history.replaceState(null, '', location.pathname); window.scrollTo({ top: 0, behavior: 'instant' })");
  await delay(100);

  await send('Page.reload', { ignoreCache: true });
  await delay(500);
  const persisted = await evaluate("({ lang: document.documentElement.lang, menuVisible: !document.querySelector('.language-menu').hidden })");
  console.log('reload', JSON.stringify(persisted));
  if (persisted.lang !== 'en-GB' || persisted.menuVisible) throw new Error('Preference did not persist');

  await evaluate("localStorage.removeItem('fuhrend-language'); localStorage.removeItem('fuhrend-language-menu-seen')");
  const override = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: "Object.defineProperty(navigator, 'languages', { get: () => ['cs-CZ'] }); Object.defineProperty(navigator, 'language', { get: () => 'cs-CZ' });"
  });
  await send('Page.reload', { ignoreCache: true });
  await delay(400);
  const detected = await evaluate("({ lang: document.documentElement.lang, menuVisible: !document.querySelector('.language-menu').hidden })");
  console.log('browser language', JSON.stringify(detected));
  if (detected.lang !== 'cs-CZ' || !detected.menuVisible) throw new Error('Browser language detection failed');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: override.identifier });

  await evaluate("localStorage.removeItem('fuhrend-language'); localStorage.removeItem('fuhrend-language-menu-seen')");
  const noLanguage = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: "Object.defineProperty(navigator, 'languages', { get: () => [] }); Object.defineProperty(navigator, 'language', { get: () => '' });"
  });
  await send('Page.reload', { ignoreCache: true });
  await delay(400);
  const fallback = await evaluate("document.documentElement.lang");
  console.log('no browser language', fallback);
  if (fallback !== 'en-GB') throw new Error('English fallback failed');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: noLanguage.identifier });

  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('.menu-button').click()");
  const mobileMenu = await evaluate("({ navOpen: document.querySelector('.main-nav').classList.contains('is-open'), languageOpen: !document.querySelector('.language-menu').hidden })");
  if (!mobileMenu.navOpen || mobileMenu.languageOpen) throw new Error('Mobile menu did not close language chooser');
  await evaluate("document.querySelector('.language-trigger').click()");
  const languageReopened = await evaluate("({ navOpen: document.querySelector('.main-nav').classList.contains('is-open'), languageOpen: !document.querySelector('.language-menu').hidden })");
  if (languageReopened.navOpen || !languageReopened.languageOpen) throw new Error('Language chooser did not close mobile menu');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  const escaped = await evaluate("document.querySelector('.language-menu').hidden");
  if (!escaped) throw new Error('Escape did not close language chooser');
  console.log('mobile menu and Escape', 'OK');

  await evaluate("document.querySelector('#services').scrollIntoView({ behavior: 'instant' })");
  await delay(100);
  const sticky = await evaluate("({ headerTop: Math.round(document.querySelector('.site-header').getBoundingClientRect().top), servicesTop: Math.round(document.querySelector('#services').getBoundingClientRect().top) })");
  console.log('sticky header', JSON.stringify(sticky));
  if (sticky.headerTop !== 0 || sticky.servicesTop < 70) throw new Error('Sticky header covers anchored section');
} finally {
  socket?.close();
  chrome.kill('SIGTERM');
}
