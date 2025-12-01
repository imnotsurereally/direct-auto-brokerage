// =============================
// Direct Auto Brokerage – Frontend logic (updated)
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
  const revealEls = Array.from(
    document.querySelectorAll("[data-reveal], .reveal")
  );
  if (!revealEls.length || !("IntersectionObserver" in window)) return;

  revealEls.forEach((el) => {
    if (!el.classList.contains("reveal")) {
      el.classList.add("reveal");
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => observer.observe(el));
}

// -----------------------------
// Wizard / lead capture
// -----------------------------
function setupWizard() {
  const form = document.querySelector("#leadWizardForm");
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

  if (!form || !stepPanels.length) return;

  let currentStep = 1;

  function goToStep(step) {
    currentStep = step;

    stepPanels.forEach((panel) => {
      const s = Number(panel.getAttribute("data-step"));
      panel.hidden = s !== currentStep;
    });

    steps.forEach((stepEl) => {
      const s = Number(stepEl.getAttribute("data-step"));
      stepEl.classList.toggle("active", s === currentStep);
    });

    const wizard = document.querySelector("#wizard");
    if (wizard) {
      wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    statusBox.textContent = message || "";
    statusBox.classList.remove("status-error", "status-success");

    if (!message) {
      statusBox.style.display = "none";
      return;
    }

    if (type === "error") {
      statusBox.classList.add("status-error");
    } else if (type === "success") {
      statusBox.classList.add("status-success");
    }
    statusBox.style.display = "block";
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("save-lead response not OK:", response.status, text);
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
// Finance calculator (with sliders + negative trade support)
// -----------------------------
function setupPaymentCalculator() {
  const form = document.querySelector("#finance-calculator");
  const priceInput = document.querySelector("#calcPrice");
  const downInput = document.querySelector("#calcDown");
  const tradeInput = document.querySelector("#calcTrade");
  const termInput = document.querySelector("#calcTerm");
  const aprInput = document.querySelector("#calcAPR");
  const taxInput = document.querySelector("#calcTax");
  const paymentDisplay = document.querySelector("#calcPaymentDisplay");
  const resultMeta = document.querySelector("#calcResultMeta");

  const priceSlider = document.querySelector("#calcPriceSlider");
  const downSlider = document.querySelector("#calcDownSlider");
  const tradeSlider = document.querySelector("#calcTradeSlider");
  const termSlider = document.querySelector("#calcTermSlider");
  const aprSlider = document.querySelector("#calcAPRSlider");
  const taxSlider = document.querySelector("#calcTaxSlider");

  if (
    !form ||
    !priceInput ||
    !downInput ||
    !tradeInput ||
    !termInput ||
    !aprInput ||
    !paymentDisplay
  ) {
    return;
  }

  function formatCurrency(value) {
    if (isNaN(value) || !isFinite(value)) return "—";
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }

  function calculatePayment() {
    const price = parseFloat(priceInput.value) || 0;
    const down = parseFloat(downInput.value) || 0;
    const trade = parseFloat(tradeInput.value) || 0; // can be negative (upside down)
    let term = parseInt(termInput.value, 10) || 0;
    const apr = parseFloat(aprInput.value) || 0;
    const taxRate = parseFloat(taxInput.value) || 0;

    if (term < 0) term = 0;
    if (term > 72) term = 72;
    if (termInput.value && termInput.value !== String(term)) {
      termInput.value = term;
    }

    const taxAmount = taxRate > 0 ? price * (taxRate / 100) : 0;
    const gross = price + taxAmount;
    const financed = Math.max(gross - down - trade, 0); // negative trade increases financed

    let monthly = 0;

    if (financed > 0 && term > 0) {
      const monthlyRate = apr > 0 ? apr / 100 / 12 : 0;
      if (monthlyRate === 0) {
        monthly = financed / term;
      } else {
        const factor = Math.pow(1 + monthlyRate, term);
        monthly = (financed * monthlyRate * factor) / (factor - 1);
      }
    }

    paymentDisplay.textContent =
      financed > 0 && term > 0 ? `${formatCurrency(monthly)}/mo` : "—";

    if (resultMeta) {
      const parts = [];
      parts.push(
        `Est. amount financed: ${formatCurrency(financed)} (after down & trade).`
      );
      if (taxRate > 0) {
        parts.push(
          `Includes approx. ${formatCurrency(
            taxAmount
          )} in tax at ${taxRate.toFixed(2)}%.`
        );
      }
      if (term > 0 && apr >= 0) {
        parts.push(
          `Based on ${term} months at ~${apr.toFixed(2)}% APR (very rough).`
        );
      }
      resultMeta.textContent = parts.join(" ");
    }
  }

  function bindSlider(input, slider, config) {
    if (!slider || !input) return;
    const { min, max, step, defaultValue } = config;

    slider.min = min;
    slider.max = max;
    slider.step = step;

    const initial =
      input.value && !isNaN(parseFloat(input.value))
        ? parseFloat(input.value)
        : defaultValue;

    slider.value = initial;
    input.value = initial;

    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) {
        const clamped = Math.max(min, Math.min(max, v));
        if (clamped !== v) {
          input.value = clamped;
        }
        slider.value = clamped;
      }
      calculatePayment();
    });

    slider.addEventListener("input", () => {
      input.value = slider.value;
      calculatePayment();
    });
  }

  // Bind sliders with sensible ranges
  bindSlider(priceInput, priceSlider, {
    min: 5000,
    max: 120000,
    step: 500,
    defaultValue: 38000,
  });

  bindSlider(downInput, downSlider, {
    min: 0,
    max: 30000,
    step: 500,
    defaultValue: 4000,
  });

  // Trade can be negative for negative equity
  bindSlider(tradeInput, tradeSlider, {
    min: -20000,
    max: 20000,
    step: 500,
    defaultValue: 0,
  });

  bindSlider(termInput, termSlider, {
    min: 12,
    max: 84,
    step: 6,
    defaultValue: 60,
  });

  bindSlider(aprInput, aprSlider, {
    min: 0,
    max: 20,
    step: 0.25,
    defaultValue: 6.9,
  });

  bindSlider(taxInput, taxSlider, {
    min: 0,
    max: 12,
    step: 0.25,
    defaultValue: 7.75,
  });

  // Submit just recalculates; user can also play live with sliders
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculatePayment();
  });

  // Initial calculation
  calculatePayment();
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
