// =============================
// Direct Auto Brokerage Wizard
// script.js – clean version
// =============================

// ---- CONFIG ----

// ✅ Supabase Edge Function endpoint (from save-lead Details tab)
const SAVE_LEAD_ENDPOINT =
  "https://vccajijhxuofjgqbhxdm.supabase.co/functions/v1/save-lead";

// Optional: UTM / ad tracking helper
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

// ---- WIZARD LOGIC ----

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("dab-wizard-form");
  if (!form) {
    console.error("dab-wizard-form not found in HTML.");
    return;
  }

  const panels = Array.from(
    document.querySelectorAll(".wizard-step-panel")
  );
  const indicators = Array.from(
    document.querySelectorAll(".wizard-step-indicator .wizard-step, .wizard-steps-indicator .wizard-step")
  );

  // In your HTML, the step indicators are inside .wizard-steps-indicator
  // This selector just makes sure we catch them either way.

  let currentStepIndex = 0;

  // Status message box under the form
  let statusBox = document.getElementById("wizardStatus");
  if (!statusBox) {
    statusBox = document.createElement("div");
    statusBox.id = "wizardStatus";
    statusBox.style.display = "none";
    statusBox.style.marginTop = "1rem";
    statusBox.style.fontSize = "0.95rem";
    form.parentNode.appendChild(statusBox);
  }

  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.style.display = "block";
    statusBox.style.color = type === "error" ? "#b00020" : "#0a7a2a";
  }

  function clearStatus() {
    statusBox.textContent = "";
    statusBox.style.display = "none";
  }

  function scrollWizardIntoView() {
    const wizard = document.getElementById("dab-wizard");
    if (wizard) {
      wizard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function showStep(index) {
    if (!panels.length) return;

    // Clamp index
    if (index < 0) index = 0;
    if (index >= panels.length) index = panels.length - 1;
    currentStepIndex = index;

    panels.forEach((panel, i) => {
      const isActive = i === currentStepIndex;
      panel.hidden = !isActive;
      panel.style.display = isActive ? "block" : "none";
    });

    indicators.forEach((ind, i) => {
      if (i === currentStepIndex) {
        ind.classList.add("active");
      } else {
        ind.classList.remove("active");
      }
    });

    scrollWizardIntoView();
  }

  // Initial state
  showStep(0);

  // Next / Back buttons
  const nextButtons = Array.from(
    document.querySelectorAll("[data-action='next']")
  );
  const backButtons = Array.from(
    document.querySelectorAll("[data-action='back']")
  );

  nextButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      clearStatus();
      if (currentStepIndex < panels.length - 1) {
        showStep(currentStepIndex + 1);
      }
    });
  });

  backButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      clearStatus();
      if (currentStepIndex > 0) {
        showStep(currentStepIndex - 1);
      }
    });
  });

  // ---- FORM SUBMIT ----

  const submitButton = form.querySelector("button[type='submit']");

  function lockSubmit(locked) {
    if (!submitButton) return;
    submitButton.disabled = locked;
    submitButton.textContent = locked ? "Sending..." : "Submit my search";
  }

  function collectFormData() {
    const formData = new FormData(form);

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

      adSource: getAdSource(),
    };

    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();

    const payload = collectFormData();

    if (!payload.phone) {
      setStatus(
        "Please add a phone number so I know where to follow up.",
        "error"
      );
      return;
    }

    try {
      lockSubmit(true);

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

      // If we get here, Supabase saved the lead
      setStatus(
        "Got it. I’ll review your info and reach out with real options shortly.",
        "success"
      );

      // Reset form and jump to Done step (step index 4 if 5 steps total)
      form.reset();
      showStep(panels.length - 1);
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
});
