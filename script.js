// Mobile nav toggle
const navToggle = document.querySelector('.nav__toggle');
const nav = document.querySelector('.nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('nav--open');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav--open');
    });
  });
}

// Scroll reveal with staggered delay
const revealElements = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.dataset.revealIndex || 0);
          // Staggered delay: 0.1s * index
          entry.target.style.transitionDelay = `${0.1 * index}s`;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  revealElements.forEach((el, index) => {
    el.dataset.revealIndex = index;
    observer.observe(el);
  });
} else {
  // Fallback: just show everything
  revealElements.forEach(el => el.classList.add('is-visible'));
}

// Dynamic year in footer
const yearSpan = document.getElementById('year');
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

/* ---------------------------
   Car Finder conditional logic
---------------------------- */
const dealTypeSelect = document.getElementById('car-deal-type');
const leaseFields = document.getElementById('lease-fields');
const purchaseFields = document.getElementById('purchase-fields');
const summaryEl = document.getElementById('car-finder-summary');
const conditionSelect = document.getElementById('car-condition');

function updateCarFinderVisibility() {
  if (!dealTypeSelect || !leaseFields || !purchaseFields) return;

  const value = dealTypeSelect.value;
  leaseFields.classList.add('hidden');
  purchaseFields.classList.add('hidden');

  if (value === 'Lease') {
    leaseFields.classList.remove('hidden');
  } else if (value === 'Purchase') {
    purchaseFields.classList.remove('hidden');
  }

  updateCarFinderSummary();
}

function updateCarFinderSummary() {
  if (!summaryEl || !dealTypeSelect || !conditionSelect) return;

  const dealType = dealTypeSelect.value;
  const condition = conditionSelect.value;

  let parts = [];

  if (dealType === 'Lease') {
    parts.push('You’re leaning toward a lease');
  } else if (dealType === 'Purchase') {
    parts.push('You’re leaning toward a purchase');
  } else if (dealType === 'Not sure yet') {
    parts.push('You’re open to either lease or purchase');
  }

  if (condition === 'New') {
    parts.push('on a new vehicle');
  } else if (condition === 'Pre-owned') {
    parts.push('on a pre-owned vehicle');
  } else if (condition === 'Either') {
    parts.push('on either new or pre-owned');
  }

  if (parts.length === 0) {
    summaryEl.textContent = 'Once you select lease/purchase and new/used, we’ll summarize your request here.';
  } else {
    summaryEl.textContent = parts.join(' ') + '. We’ll use this to structure the best options for you.';
  }
}

if (dealTypeSelect) {
  dealTypeSelect.addEventListener('change', updateCarFinderVisibility);
}

if (conditionSelect) {
  conditionSelect.addEventListener('change', updateCarFinderSummary);
}

/* ---------------------------
   Reviews slider
---------------------------- */
const sliderTrack = document.querySelector('.reviews-slider__track');
const sliderSlides = sliderTrack ? sliderTrack.querySelectorAll('.reviews-slider__slide') : [];
const sliderArrows = document.querySelectorAll('.reviews-slider__arrow');

let sliderIndex = 0;

function updateSlider(direction) {
  if (!sliderSlides.length) return;

  sliderSlides[sliderIndex].classList.remove('is-active');

  if (direction === 'next') {
    sliderIndex = (sliderIndex + 1) % sliderSlides.length;
  } else if (direction === 'prev') {
    sliderIndex = (sliderIndex - 1 + sliderSlides.length) % sliderSlides.length;
  }

  sliderSlides[sliderIndex].classList.add('is-active');
}

sliderArrows.forEach(arrow => {
  arrow.addEventListener('click', () => {
    const dir = arrow.getAttribute('data-dir');
    updateSlider(dir);
  });
});
