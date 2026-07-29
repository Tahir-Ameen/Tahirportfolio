// ===================================
//   PORTFOLIO - script.js
//   Animations & Interactions
// ===================================


// --- 1. NAVBAR: Active link highlight on scroll ---
const sections   = document.querySelectorAll('section');
const navLinks   = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.style.color = '';  // reset
    if (link.getAttribute('href') === '#' + current) {
      link.style.color = '#2563eb';  // accent color
    }
  });
});


// --- 2. SKILL BARS: Animate when visible ---
// Jab user Skills section pe scroll kare, bars fill ho jayein
const skillFills = document.querySelectorAll('.skill-fill');

const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // HTML mein jo width set ki thi (jaise style="width: 80%"), woh apply ho
      const el = entry.target;
      const targetWidth = el.style.width;  // e.g. "80%"
      el.style.width = '0%';               // pehle 0 karo
      setTimeout(() => {
        el.style.width = targetWidth;       // phir animate karo
      }, 100);
      skillObserver.unobserve(el);          // sirf ek baar
    }
  });
}, { threshold: 0.3 });

skillFills.forEach(fill => {
  const original = fill.style.width;    // save original
  fill.style.width = '0%';             // start from 0
  fill.dataset.target = original;      // store in data attribute
  skillObserver.observe(fill);
});


// --- 3. FADE-IN: Sections smoothly appear on scroll ---
const fadeElements = document.querySelectorAll(
  '.skill-card, .project-card, .contact-card, .about-content, .hero-content'
);

// CSS se pehle invisible set karo
fadeElements.forEach(el => {
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
});

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Thoda delay dalo taake ek ek karke aayein
      setTimeout(() => {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
      }, i * 80);
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

fadeElements.forEach(el => fadeObserver.observe(el));


// --- 4. SMOOTH SCROLL for nav links ---
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    const target   = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


// --- 5. HERO: Simple typing effect for role text ---
const roleEl = document.querySelector('.hero-role');
if (roleEl) {
  const text     = roleEl.textContent;
  roleEl.textContent = '';
  let i = 0;

  setTimeout(() => {
    const typing = setInterval(() => {
      roleEl.textContent += text[i];
      i++;
      if (i >= text.length) clearInterval(typing);
    }, 60);
  }, 500); // 0.5 second baad start hoga
}


// ===================================
//   KHATAM - Ab sab kuch kaam karega!
// ===================================