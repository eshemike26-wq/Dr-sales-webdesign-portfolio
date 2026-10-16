const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Split [data-split] text into characters for the staggered reveal.
// Screen readers get the original text once; the animated letters are hidden from them.
document.querySelectorAll('[data-split]').forEach((el) => {
  const text = el.textContent.trim();
  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  [...text].forEach((ch, i) => {
    const wrap = document.createElement('span');
    wrap.className = 'char-wrap';
    const c = document.createElement('span');
    c.className = 'char';
    c.style.setProperty('--i', i);
    c.textContent = ch;
    wrap.appendChild(c);
    visual.appendChild(wrap);
  });
  el.append(sr, visual);
});

// Split the about statement into words that light up as you scroll
const fillEl = document.querySelector('[data-fill]');
let fillWords = [];
if (fillEl) {
  const words = fillEl.textContent.trim().split(/\s+/);
  fillEl.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'word';
    s.textContent = w;
    fillEl.append(s, i < words.length - 1 ? ' ' : '');
  });
  fillWords = [...fillEl.querySelectorAll('.word')];
}

// Intro loader: count 0 → 100, slide the panel away, then play the hero
function startPage() {
  document.body.classList.add('is-ready');
}

const preloader = document.querySelector('.preloader');
if (root.classList.contains('is-loading') && preloader) {
  const out = preloader.querySelector('[data-count-out]');
  const bar = preloader.querySelector('.preloader-bar');
  const duration = 1400;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    out.textContent = Math.round(eased * 100);
    bar.style.setProperty('--p', eased);
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }
    preloader.classList.add('is-leaving');
    setTimeout(startPage, 350);
    preloader.addEventListener('transitionend', () => {
      root.classList.remove('is-loading');
      preloader.remove();
    }, { once: true });
  };
  requestAnimationFrame(tick);
  try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* storage blocked */ }
} else {
  requestAnimationFrame(startPage);
}

// Scroll reveals
const revealTargets = document.querySelectorAll('.reveal, .reveal-img, .display, .contact-title');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

// Word fill: words brighten one by one as the statement crosses the viewport
function updateFill() {
  if (!fillWords.length) return;
  if (reduceMotion.matches) {
    fillWords.forEach((w) => w.style.setProperty('--o', 1));
    return;
  }
  const rect = fillEl.getBoundingClientRect();
  const vh = window.innerHeight;
  // 0 when the top reaches 85% of the viewport, 1 when the bottom reaches 45%
  const progress = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.4)));
  const lit = progress * fillWords.length;
  fillWords.forEach((w, i) => {
    const o = 0.18 + 0.82 * Math.min(1, Math.max(0, lit - i));
    w.style.setProperty('--o', o.toFixed(3));
  });
}

// Highlight the nav link for the section on screen
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const navSections = navLinks.map((a) => document.querySelector(a.getAttribute('href')));
function updateNav() {
  const line = window.innerHeight * 0.4;
  let current = -1;
  navSections.forEach((s, i) => {
    if (s && s.getBoundingClientRect().top <= line) current = i;
  });
  navLinks.forEach((a, i) => {
    a.classList.toggle('is-current', i === current);
    if (i === current) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateFill();
    updateNav();
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// Mobile navigation
const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

function setNav(open) {
  navToggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
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

window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
  if (e.matches) setNav(false);
});

// Cursor follower (mouse only): trails the pointer and grows over links
const cursor = document.querySelector('.cursor');
if (cursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
  let x = -100, y = -100, cx = -100, cy = -100;
  let running = false;
  const follow = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) requestAnimationFrame(follow);
    else running = false;
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX;
    y = e.clientY;
    cursor.classList.add('is-visible');
    const labelled = e.target.closest('[data-cursor]');
    cursor.classList.toggle('is-view', !!labelled);
    cursor.dataset.label = labelled ? labelled.dataset.cursor : '';
    cursor.classList.toggle('is-hover', !labelled && !!e.target.closest('a, button, select, input, textarea, label'));
    if (!running) {
      running = true;
      requestAnimationFrame(follow);
    }
  });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
}

// Hero photo: black and white until hovered. On touch screens it shows colour
// while a finger is on it (including while scrolling) and fades back on release.
const heroPhoto = document.querySelector('.hero-photo');
if (heroPhoto) {
  heroPhoto.addEventListener('touchstart', () => heroPhoto.classList.add('is-color'), { passive: true });
  ['touchend', 'touchcancel'].forEach((type) => {
    heroPhoto.addEventListener(type, () => heroPhoto.classList.remove('is-color'), { passive: true });
  });
}

// Live site previews: scale each 1440px-wide homepage to fit its card,
// and scroll through it while the card is hovered
const sitePreviews = document.querySelectorAll('.site-view');
if (sitePreviews.length) {
  const fit = (view) => view.style.setProperty('--s', (view.clientWidth / 1440).toFixed(4));
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target)));
    sitePreviews.forEach((view) => ro.observe(view));
  } else {
    sitePreviews.forEach(fit);
  }

  sitePreviews.forEach((view) => {
    const frame = view.querySelector('iframe');
    const card = view.closest('.work-card');
    let raf = null;

    const scrollFrame = (direction) => {
      cancelAnimationFrame(raf);
      let doc;
      try { doc = frame.contentWindow.document.scrollingElement; } catch (e) { return; }
      if (!doc) return;
      const max = doc.scrollHeight - doc.clientHeight;
      if (reduceMotion.matches) {
        doc.scrollTop = direction > 0 ? max : 0;
        return;
      }
      // Down slowly (about 900px of page per second), back up quickly
      const speed = direction > 0 ? 0.9 : 4;
      let last = performance.now();
      const step = (now) => {
        const dt = now - last;
        last = now;
        doc.scrollTop = Math.max(0, Math.min(max, doc.scrollTop + direction * speed * dt));
        if ((direction > 0 && doc.scrollTop < max) || (direction < 0 && doc.scrollTop > 0)) {
          raf = requestAnimationFrame(step);
        }
      };
      raf = requestAnimationFrame(step);
    };

    card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') scrollFrame(1); });
    card.addEventListener('pointerleave', () => scrollFrame(-1));
    card.addEventListener('focusin', () => scrollFrame(1));
    card.addEventListener('focusout', () => scrollFrame(-1));
  });
}

// Service and pricing links pre-select the matching option in the contact form
const serviceSelect = document.getElementById('cf-service');
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    const match = [...serviceSelect.options].find((o) => o.value === link.dataset.service);
    if (match) serviceSelect.value = match.value;
  });
});

// Footer year
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// Contact form (Formspree)
const form = document.querySelector('.contact-form');
const statusEl = form.querySelector('.form-status');
const submitBtn = form.querySelector('button[type="submit"]');
const submitLabel = submitBtn.querySelector('[data-btn-label]');

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
  submitLabel.textContent = 'Sending…';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(String(res.status));
    form.reset();
    statusEl.classList.add('is-success');
    statusEl.textContent = 'Message sent. I will reply within one working day.';
  } catch {
    statusEl.classList.add('is-error');
    statusEl.textContent = 'Your message could not be sent. Check your connection and try again, or email me directly.';
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = 'Send message';
  }
});
