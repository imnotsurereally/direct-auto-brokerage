// =============================
// Direct Auto Brokerage – Frontend logic
// =============================

// Supabase Edge Function endpoint (save-lead)
const SAVE_LEAD_ENDPOINT =
  "https://vccajijhxuofjgqbhxdm.supabase.co/functions/v1/save-lead";

// Optional: UTM & referrer tracking
function getAdSource() {
  try {
    const url = new URL(window.location.href);
    return {
      utm_source: url.searchParams.get("utm_source") || null,
      utm_campaign: url.searchParams.get("utm_campaign") || null,
      utm_medium: url.searchParams.get("utm_medium") || null,
      utm_content: url.searchParams.get("utm_content") || null,
      referrer: document.referrer || null,
      path: window.location.pathname,
    };
  } catch (e) {
    return {
      utm_source: null,
      utm_campaign: null,
      utm_medium: null,
      utm_content: null,
      referrer: document.referrer || null,
      path: window.location.pathname,
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupScrollReveal();
  setupWizard();
  setupUnlockForms();
  setupReferralForm(); // safe even if form not on page
});

// -----------------------------
// Scroll reveal animations
// -----------------------------
function setupScrollReveal() {
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if (!revealEls.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
    }
  );

  revealEls.forEach((el) => observer.observe(el));
}

// -----------------------------
// Wizard / lead capture (main brief on homepage)
// -----------------------------
function setupWizard() {
  const form = document.querySelector("#leadWizardForm");
  if (!form) return; // Not on this page

  const stepPanels = Array.from(
    document.querySelectorAll(".wizard-step-panel")
  );
  const steps = Array.from(document.querySelectorAll(".wizard-step"));
  const nextButtons = Array.from(
    document.querySelectorAll("[data-action='next']")
  );
  const backButtons = Array.from(
    document.querySelectorAll("[data-action='back']")
  );
  const statusBox = document.querySelector("#wizardStatus");
  const submitButton = document.querySelector("#wizardSubmitButton");

  let currentStep = 1;

  function goToStep(step, { scroll = true } = {}) {
    currentStep = step;
    stepPanels.forEach((panel) => {
      const s = Number(panel.getAttribute("data-step"));
      panel.hidden = s !== currentStep;
    });
    steps.forEach((chip) => {
      const s = Number(chip.getAttribute("data-step"));
      chip.classList.toggle("active", s === currentStep);
    });

    if (!scroll) return;

    const wizard = document.querySelector("#wizard");
    if (wizard) {
      wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.classList.remove("status-error", "status-success");
    if (type === "error") {
      statusBox.classList.add("status-error");
      statusBox.style.display = "block";
    } else if (type === "success") {
      statusBox.classList.add("status-success");
      statusBox.style.display = "block";
    } else {
      statusBox.style.display = "none";
    }
  }

  function clearStatus() {
    setStatus("", null);
  }

  function lockSubmit(locked) {
    if (!submitButton) return;
    submitButton.disabled = locked;
    submitButton.textContent = locked ? "Sending..." : "Submit my search";
  }

  function collectFormData(formEl) {
    const formData = new FormData(formEl);

    const data = {
      goal: formData.get("goal") || null,
      timeline: formData.get("timeline") || null,
      newOrUsed: formData.get("newOrUsed") || null,
      vehicleType: formData.get("vehicleType") || null,
      modelPreferences: formData.get("modelPreferences") || null,
      paymentRange: formData.get("paymentRange") || null,
      downPayment: formData.get("downPayment") || null,
      credit: formData.get("credit") || null,

      firstName: formData.get("firstName") || null,
      lastName: formData.get("lastName") || null,
      phone: (formData.get("phone") || "").trim(),
      email: (formData.get("email") || "").trim() || null,
      contactMethod: formData.get("contactMethod") || null,

      source: "wizard",
    };

    data.adSource = getAdSource();
    return data;
  }

  // Initial state – DO NOT SCROLL ON LOAD
  goToStep(currentStep, { scroll: false });
  clearStatus();

  // Next buttons
  nextButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep < stepPanels.length) {
        goToStep(currentStep + 1, { scroll: true });
      }
    });
  });

  // Back buttons
  backButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep > 1) {
        goToStep(currentStep - 1, { scroll: true });
      }
    });
  });

  // Form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const payload = collectFormData(form);

    if (!payload.phone) {
      setStatus(
        "Please add a phone number so I know where to follow up.",
        "error"
      );
      return;
    }

    if (!payload.contactMethod) {
      setStatus(
        "How do you prefer I reach out — text, call, or WhatsApp?",
        "error"
      );
      return;
    }

    lockSubmit(true);

    try {
      const response = await fetch(SAVE_LEAD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("save-lead response not OK:", response.status);
        const text = await response.text().catch(() => "");
        console.error("Response body:", text);
        throw new Error("Server error while saving your info.");
      }

      setStatus(
        "Got it. I’ll review your info and reach out with real options shortly.",
        "success"
      );

      form.reset();
      goToStep(5, { scroll: true });
    } catch (err) {
      console.error("Error submitting lead:", err);
      setStatus(
        "Something went wrong sending your info. Please try again in a moment or text me directly.",
        "error"
      );
    } finally {
      lockSubmit(false);
    }
  });
}

// -----------------------------
// Locked deals unlock forms
// -----------------------------
function setupUnlockForms() {
  const forms = Array.from(document.querySelectorAll(".unlock-offer-form"));
  if (!forms.length) return;

  forms.forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const statusBox = form.querySelector(".unlock-status");
      const formData = new FormData(form);

      const firstName = (formData.get("firstName") || "").trim();
      const phone = (formData.get("phone") || "").trim();
      const offerCode = form.getAttribute("data-offer") || null;

      if (statusBox) {
        statusBox.textContent = "";
        statusBox.classList.remove("status-error", "status-success");
      }

      if (!phone) {
        if (statusBox) {
          statusBox.textContent =
            "Add a cell number so I can text you this lane.";
          statusBox.classList.add("status-error");
        }
        return;
      }

      const payload = {
        firstName: firstName || null,
        phone,
        offerCode,
        source: "locked_deals_page",
        contactMethod: "Text",
        adSource: getAdSource(),
      };

      if (statusBox) {
        statusBox.textContent = "Unlocking this lane...";
        statusBox.classList.remove("status-error", "status-success");
      }

      try {
        const response = await fetch(SAVE_LEAD_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error("save-lead unlock response not OK:", response.status);
          const text = await response.text().catch(() => "");
          console.error("Response body:", text);
          throw new Error("Server error while saving your info.");
        }

        form.reset();
        if (statusBox) {
          statusBox.textContent =
            "Got it. I’ll text you shortly with how this lane looks for you.";
          statusBox.classList.add("status-success");
        }
      } catch (err) {
        console.error("Error submitting unlock lead:", err);
        if (statusBox) {
          statusBox.textContent =
            "Something went wrong unlocking this lane. You can also text me directly.";
          statusBox.classList.add("status-error");
        }
      }
    });
  });
}

// -----------------------------
// Referral form (simple front-end only)
// -----------------------------
function setupReferralForm() {
  const referralForm = document.querySelector("#referral-form");
  const statusBox = document.querySelector("#referralStatus");

  if (!referralForm) return;

  referralForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (statusBox) {
      statusBox.textContent =
        "Got it. I’ll note this referral. When their deal closes, I’ll reach out to send your $100.";
    }
    referralForm.reset();
  });
}
