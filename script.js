// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const targetId = link.getAttribute('href').slice(1);
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Wizard logic
(function () {
  const form = document.getElementById('dab-wizard-form');
  if (!form) return;

  const stepPanels = Array.from(form.querySelectorAll('.wizard-step-panel'));
  const stepIndicators = Array.from(
    document.querySelectorAll('.wizard-step')
  );

  let currentStep = 1;

  function showStep(step) {
    currentStep = step;

    stepPanels.forEach(panel => {
      const panelStep = Number(panel.dataset.step);
      panel.hidden = panelStep !== currentStep;
    });

    stepIndicators.forEach(indicator => {
      const s = Number(indicator.dataset.step);
      indicator.classList.toggle('active', s === currentStep);
    });
  }

  function goNext() {
    if (currentStep < 5) {
      showStep(currentStep + 1);
    }
  }

  function goBack() {
    if (currentStep > 1) {
      showStep(currentStep - 1);
    }
  }

  // Attach click handlers for wizard nav buttons
  form.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'next') {
      e.preventDefault();
      goNext();
    } else if (action === 'back') {
      e.preventDefault();
      goBack();
    }
  });

  // Handle submit: send data to Netlify function + show confirmation
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    console.log('Wizard submission payload:', payload);

    // Call Netlify function (backend)
    try {
      const res = await fetch('/.netlify/functions/saveLead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        // ignore JSON parse errors, not critical
      }

      console.log('Netlify saveLead response:', data);

      if (!res.ok) {
        console.error('saveLead returned non-OK status:', res.status);
      }
    } catch (err) {
      console.error('Error calling saveLead function:', err);
      alert(
        "Your info was captured in the browser, but there was an issue talking to the server.\n\nIf this keeps happening, please text me directly at 949-444-3388."
      );
    }

    // Show confirmation step regardless so user flow stays smooth
    showStep(5);
  });

  // Start at step 1
  showStep(1);
})();

// Handle referral form (prevent page reload for now)
(function () {
  const referralForm = document.getElementById('referral-form');
  if (!referralForm) return;

  referralForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(referralForm);
    const payload = {};
    data.forEach((value, key) => {
      payload[key] = value;
    });
    console.log('Referral submitted:', payload);
    alert('Thanks for the referral — I’ll reach out once they connect with me.');
    referralForm.reset();
  });
})();
