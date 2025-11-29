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

// Reveal on scroll – faster, almost no delay
const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealEls.length) {
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
  // Fallback: just show everything
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Dynamic year in footer
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
