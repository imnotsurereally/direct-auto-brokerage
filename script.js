// =============================
// Direct Auto Brokerage – Frontend logic
// =============================

// Supabase Edge Function endpoint (save-lead)
const SAVE_LEAD_ENDPOINT =
  "https://vccajljhxoujfggbhxdm.supabase.co/functions/v1/save-lead";

// Optional: UTM & referrer tracking
function getAdSource() {
  try {
    const url = new URL(window.location.href);
    return {
      utm_source: url.searchParams.get("utm_source") || null,
      utm_campaign: url.searchParams.get("utm_campaign") || null,
      utm_medium: url.searchParams.get("utm_medium") || null,
      referrer: document.referrer || null,
    };
  } catch (e) {
    return {
      utm_source: null,
      utm_campaign: null,
      utm_medium: null,
      referrer: document.referrer || null,
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupScrollReveal();
  setupWizard();
  setupPaymentCalculator();
  setupReferralForm();
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
// Wizard / lead capture
// -----------------------------
function setupWizard() {
  const form = document.querySelector("#dab-wizard-form");
  const stepPanels = Array.from(
    document.querySelectorAll(".wizard-step-panel")
  );
  const chips = Array.from(document.querySelectorAll(".wizard-chip"));
  const nextButtons = Array.from(
    document.querySelectorAll("[data-action='next']")
  );
  const backButtons = Array.from(
    document.querySelectorAll("[data-action='back']")
  );
  const statusBox = document.querySelector("#wizard-status");
  const submitButton = document.querySelector("#wizardSubmitButton");

  if (!form || !stepPanels.length) {
    // Not on this page
    return;
  }

  let currentStep = 1;

  function goToStep(step) {
    currentStep = step;
    stepPanels.forEach((panel) => {
      const s = Number(panel.getAttribute("data-step"));
      panel.hidden = s !== currentStep;
    });
    chips.forEach((chip) => {
      const s = Number(chip.getAttribute("data-step"));
      chip.classList.toggle("active", s === currentStep);
    });

    const wizard = document.querySelector("#dab-wizard");
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
    };

    data.adSource = getAdSource();
    return data;
  }

  // Initial state
  goToStep(currentStep);
  clearStatus();

  // Next buttons
  nextButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep < stepPanels.length) {
        goToStep(currentStep + 1);
      }
    });
  });

  // Back buttons
  backButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep > 1) {
        goToStep(currentStep - 1);
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

    // Mild validation for contact preference
    if (!payload.contactMethod) {
      setStatus("How do you prefer I reach out — text, call, or WhatsApp?", "error");
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
      goToStep(5);
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
// Finance calculator
// -----------------------------
function setupPaymentCalculator() {
  const priceInput = document.querySelector("#calcPrice");
  const downInput = document.querySelector("#calcDown");
  const rateInput = document.querySelector("#calcRate");
  const termInput = document.querySelector("#calcTerm");
  const paymentDisplay = document.querySelector("#calcPayment");

  if (
    !priceInput ||
    !downInput ||
    !rateInput ||
    !termInput ||
    !paymentDisplay
  ) {
    return;
  }

  function formatMoney(num) {
    if (!isFinite(num)) return "$0 / mo";
    const rounded = Math.round(num);
    return `$${rounded.toLocaleString()} / mo`;
  }

  function updatePayment() {
    const price = Number(priceInput.value) || 0;
    const down = Number(downInput.value) || 0;
    const rate = Number(rateInput.value) || 0;
    const term = Number(termInput.value) || 0;

    const principal = Math.max(price - down, 0);

    if (principal <= 0 || term <= 0) {
      paymentDisplay.textContent = "$0 / mo";
      return;
    }

    const monthlyRate = rate > 0 ? rate / 100 / 12 : 0;
    let payment;

    if (monthlyRate === 0) {
      payment = principal / term;
    } else {
      const factor =
        (monthlyRate * Math.pow(1 + monthlyRate, term)) /
        (Math.pow(1 + monthlyRate, term) - 1);
      payment = principal * factor;
    }

    paymentDisplay.textContent = formatMoney(payment);
  }

  [priceInput, downInput, rateInput, termInput].forEach((input) => {
    input.addEventListener("input", updatePayment);
  });

  updatePayment();
}

// -----------------------------
// Referral form (simple front-end only)
// -----------------------------
function setupReferralForm() {
  const referralForm = document.querySelector("#referral-form");
  const statusBox = document.querySelector("#referral-status");

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
