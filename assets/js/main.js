// Mobile navigation
const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

function setNav(open) {
  navToggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
}

navToggle.addEventListener('click', () => {
  setNav(navToggle.getAttribute('aria-expanded') !== 'true');
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) setNav(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('is-open')) {
    setNav(false);
    navToggle.focus();
  }
});

// Experience slider: native swipe/scroll, plus arrow buttons and a counter
const xpTrack = document.querySelector('.xp-track');
if (xpTrack) {
  const slides = [...xpTrack.querySelectorAll('.xp-slide')];
  const prevBtn = document.querySelector('[data-xp-prev]');
  const nextBtn = document.querySelector('[data-xp-next]');
  const currentEl = document.querySelector('[data-xp-current]');
  const progress = document.querySelector('.xp-progress');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad = (n) => String(n).padStart(2, '0');
  let index = 0;

  document.querySelector('[data-xp-total]').textContent = pad(slides.length);

  function render() {
    currentEl.textContent = pad(index + 1);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    progress.style.setProperty('--xp-index', index);
  }

  // While an arrow-triggered scroll is animating, ignore scroll events so the
  // counter doesn't flick through the slides in between
  let targetIndex = null;

  function goTo(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    targetIndex = index;
    render();
    const left = slides[index].offsetLeft - slides[0].offsetLeft;
    xpTrack.scrollTo({ left, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  // Track which slide is snapped in place as the visitor swipes or scrolls
  xpTrack.addEventListener('scroll', () => {
    const step = slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : 1;
    const atEnd = xpTrack.scrollLeft + xpTrack.clientWidth >= xpTrack.scrollWidth - 4;
    const visible = atEnd ? slides.length - 1 : Math.round(xpTrack.scrollLeft / step);
    if (targetIndex !== null) {
      if (visible !== targetIndex) return;
      targetIndex = null;
    }
    if (visible !== index) {
      index = visible;
      render();
    }
  }, { passive: true });

  // A swipe or wheel takes over from any arrow-triggered scroll
  ['pointerdown', 'wheel', 'touchstart'].forEach((type) => {
    xpTrack.addEventListener(type, () => { targetIndex = null; }, { passive: true });
  });

  prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn.addEventListener('click', () => goTo(index + 1));

  xpTrack.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
  });

  render();
}

// Recent projects: tabs that replay each dashboard's animation
const projTabs = [...document.querySelectorAll('.proj-tab')];
if (projTabs.length) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let countRun = 0;

  function formatCount(el, value) {
    const decimals = Number(el.dataset.decimals || 0);
    const num = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${el.dataset.prefix || ''}${num}${el.dataset.suffix || ''}`;
  }

  function countUp(panel) {
    const run = ++countRun;
    panel.querySelectorAll('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      if (reduceMotion.matches) {
        el.textContent = formatCount(el, target);
        return;
      }
      const duration = 1300;
      const delay = 250;
      const start = performance.now() + delay;
      el.textContent = formatCount(el, 0);
      const tick = (now) => {
        if (run !== countRun) return; // a newer tab took over
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = formatCount(el, target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function play(panel) {
    panel.classList.remove('is-animating');
    void panel.offsetWidth; // restart CSS animations
    panel.classList.add('is-animating');
    countUp(panel);
  }

  function selectTab(tab, { focus = false } = {}) {
    projTabs.forEach((t) => {
      const selected = t === tab;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
      panel.classList.toggle('is-active', selected);
      if (!selected) panel.classList.remove('is-animating');
    });
    if (focus) tab.focus();
    play(document.getElementById(tab.getAttribute('aria-controls')));
  }

  projTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = projTabs[(i + 1) % projTabs.length];
      if (e.key === 'ArrowLeft') next = projTabs[(i - 1 + projTabs.length) % projTabs.length];
      if (e.key === 'Home') next = projTabs[0];
      if (e.key === 'End') next = projTabs[projTabs.length - 1];
      if (next) {
        e.preventDefault();
        selectTab(next, { focus: true });
      }
    });
  });

  // Links like #panel-crm open that project directly
  const linked = projTabs.find((t) => `#${t.getAttribute('aria-controls')}` === location.hash);
  if (linked) {
    selectTab(linked);
    document.getElementById('work').scrollIntoView();
  }

  // Play the first dashboard when the section scrolls into view
  const firstPanel = document.querySelector('.proj-panel.is-active');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        play(document.querySelector('.proj-panel.is-active'));
        io.disconnect();
      }
    });
    io.observe(firstPanel);
  }
}

// Floating "Get in touch" button: show once the hero is passed,
// hide again while the contact section is on screen
const floatCta = document.querySelector('[data-float-cta]');
if (floatCta) {
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  const update = () => {
    const pastHero = hero.getBoundingClientRect().bottom < window.innerHeight * 0.4;
    const atContact = contact.getBoundingClientRect().top < window.innerHeight * 0.85;
    floatCta.classList.toggle('is-visible', pastHero && !atContact);
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// Footer year
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Contact form (Formspree)
const form = document.querySelector('.contact-form');
const statusEl = form.querySelector('.form-status');
const submitBtn = form.querySelector('button[type="submit"]');

const messages = {
  name: 'Enter your name.',
  email: 'Enter an email address like name@example.com.',
  message: 'Tell me a little about your project.',
};

function validateField(input) {
  const errorEl = document.getElementById(`${input.id}-error`);
  const valid = input.checkValidity() && input.value.trim() !== '';
  input.setAttribute('aria-invalid', String(!valid));
  if (valid) {
    errorEl.hidden = true;
    input.removeAttribute('aria-describedby');
  } else {
    errorEl.textContent = messages[input.name];
    errorEl.hidden = false;
    input.setAttribute('aria-describedby', errorEl.id);
  }
  return valid;
}

const requiredFields = [...form.querySelectorAll('[required]')];
requiredFields.forEach((input) => {
  input.addEventListener('blur', () => {
    if (input.value !== '' || input.hasAttribute('aria-invalid')) validateField(input);
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'form-status';
  statusEl.textContent = '';

  const invalid = requiredFields.filter((input) => !validateField(input));
  if (invalid.length) {
    invalid[0].focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(String(res.status));
    form.reset();
    statusEl.classList.add('is-success');
    statusEl.textContent = 'Message sent. I will reply within two working days.';
  } catch {
    statusEl.classList.add('is-error');
    statusEl.textContent = 'Your message could not be sent. Check your connection and try again, or email me directly.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send message';
  }
});
