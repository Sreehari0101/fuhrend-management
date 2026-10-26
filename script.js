const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.main-nav');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.site-header')) closeMenu();
});

document.getElementById('year').textContent = String(new Date().getFullYear());

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
