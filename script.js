// Mobile nav toggle
const navToggle = document.querySelector(".nav__toggle");
const nav = document.querySelector(".nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("nav--open");
  });

  nav.addEventListener("click", (e) => {
    if (e.target.matches(".nav__link")) {
      nav.classList.remove("nav--open");
    }
  });
}

// Respect reduced motion for all enhanced effects
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reveal on scroll – faster, almost no delay
const revealEls = document.querySelectorAll(".reveal");

if (!prefersReducedMotion && "IntersectionObserver" in window && revealEls.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      });
    },
    {
      threshold: 0.15, // shows a bit earlier when scrolling fast
    }
  );

  revealEls.forEach((el) => {
    // Minimal or no stagger for snappier feel
    el.style.transitionDelay = "0s";
    observer.observe(el);
  });
} else {
  // Fallback or reduced motion: just show everything
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Scroll progress indicator
const docEl = document.documentElement;
let ticking = false;

const setScrollProgress = () => {
  const scrollable = docEl.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  docEl.style.setProperty("--scroll-progress", `${progress}%`);
  ticking = false;
};

const handleScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(setScrollProgress);
    ticking = true;
  }
};

window.addEventListener("scroll", handleScroll, { passive: true });
setScrollProgress();

// Dynamic year in footer
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
