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
  console.log("DAB script loaded");
  try {
    setupScrollReveal();
  } catch (e) {
    console.error("Error in setupScrollReveal:", e);
  }
  try {
    setupWizard();
  } catch (e) {
    console.error("Error in setupWizard:", e);
  }
  try {
    setupDealUnlock();
  } catch (e) {
    console.error("Error in setupDealUnlock:", e);
  }
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
// Wizard / lead capture (homepage)
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

  if (!form || !stepPanels.length) {
    console.log("Wizard not found on this page. Skipping wizard setup.");
    return;
  }

  let currentStep = 1;

  function goToStep(step) {
    currentStep = step;
    stepPanels.forEach((panel) => {
      const s = Number(panel.getAttribute("data-step"));
      panel.hidden = s !== currentStep;
    });
    steps.forEach((chip) => {
      const s = Number(chip.getAttribute("data-step"));
      chip.classList.toggle("active", s === currentStep);
    });

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

  function collectWizardData(formEl) {
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

    data.leadType = "wizard";
    data.dealName = null;
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

    const payload = collectWizardData(form);

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
// Locked deals – inline unlock forms (deals.html)
// -----------------------------
function setupDealUnlock() {
  const toggleButtons = Array.from(
    document.querySelectorAll(".deal-unlock-toggle")
  );
  const unlockPanels = Array.from(
    document.querySelectorAll(".deal-unlock-panel")
  );
  const forms = Array.from(document.querySelectorAll(".deal-unlock-form"));

  if (!toggleButtons.length && !forms.length) {
    console.log("No locked-deal elements found. Skipping deal unlock setup.");
    return; // not on deals page
  }

  console.log(
    `Deal unlock setup: ${toggleButtons.length} buttons, ${unlockPanels.length} panels, ${forms.length} forms`
  );

  // Toggle open/close of unlock panels
  toggleButtons.forEach((btn) => {
    const targetSelector = btn.getAttribute("data-target");
    const panel = targetSelector
      ? document.querySelector(targetSelector)
      : null;

    if (!panel) {
      console.warn("No panel found for deal-unlock-toggle:", targetSelector);
      return;
    }

    btn.addEventListener("click", () => {
      const shouldOpen = panel.hasAttribute("hidden");

      // Close all panels first
      unlockPanels.forEach((p) => p.setAttribute("hidden", "true"));

      if (shouldOpen) {
        panel.removeAttribute("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });

  // Handle form submit for each deal
  forms.forEach((form) => {
    const statusBox = form.querySelector(".deal-unlock-status");
    const submitBtn = form.querySelector("button[type='submit']");
    const dealAttr = form.getAttribute("data-deal");
    const dealNameDefault =
      dealAttr || form.querySelector("input[name='dealName']")?.value || null;

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

    function lockSubmit(locked) {
      if (!submitBtn) return;
      submitBtn.disabled = locked;
      submitBtn.textContent = locked
        ? "Sending..."
        : submitBtn.dataset.originalText || "Unlock this deal";
    }

    // Store original button text
    if (submitBtn && !submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.textContent;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("", null);

      const formData = new FormData(form);

      const payload = {
        goal: null,
        timeline: null,
        newOrUsed: null,
        vehicleType: null,
        modelPreferences: `Unlock request for ${
          dealNameDefault || "locked deal"
        }`,
        paymentRange: null,
        downPayment: null,
        credit: null,

        firstName: formData.get("firstName") || null,
        lastName: null,
        phone: (formData.get("phone") || "").trim(),
        email: null,
        contactMethod: formData.get("contactMethod") || null,

        leadType: formData.get("leadType") || "deal_unlock",
        dealName:
          formData.get("dealName") || dealNameDefault || "Locked deal request",
        adSource: getAdSource(),
      };

      if (!payload.phone || payload.phone.length < 7) {
        setStatus(
          "Please add a valid phone number so I can follow up.",
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
          console.error("save-lead (deal unlock) not OK:", response.status);
          const text = await response.text().catch(() => "");
          console.error("Response body:", text);
          throw new Error("Server error while saving your info.");
        }

        setStatus(
          "Got it. I’ll personally go over this lane and reach out with what makes sense.",
          "success"
        );
        form.reset();
      } catch (err) {
        console.error("Error submitting deal unlock:", err);
        setStatus(
          "Something went wrong sending this unlock request. Please try again or text me directly.",
          "error"
        );
      } finally {
        lockSubmit(false);
      }
    });
  });
}
