// =============================
// Direct Auto Brokerage Wizard
// script.js
// =============================

// ------ CONFIG ------

// Supabase Edge Function endpoint
const SAVE_LEAD_ENDPOINT =
  "https://vccajljhxoujfggbhxdm.supabase.co/functions/v1/save-lead";

// Optional: update this if you add UTM or ad tracking later
function getAdSource() {
  const url = new URL(window.location.href);
  return {
    utm_source: url.searchParams.get("utm_source") || null,
    utm_campaign: url.searchParams.get("utm_campaign") || null,
    utm_medium: url.searchParams.get("utm_medium") || null,
    referrer: document.referrer || null,
  };
}

// ------ WIZARD SETUP ------

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#dab-wizard-form");
  const wizardContainer = document.querySelector("#dab-wizard");

  // Each step panel is one screen of the wizard
  const stepPanels = Array.from(
    document.querySelectorAll(".wizard-step-panel")
  );

  // Top step indicators (Basics / Vehicle / Budget / Contact / Done)
  const stepIndicators = Array.from(
    document.querySelectorAll(".wizard-steps-indicator .wizard-step")
  );

  const nextButtons = Array.from(
    document.querySelectorAll("[data-action='next']")
  );
  const backButtons = Array.from(
    document.querySelectorAll("[data-action='back']")
  );
  const submitButton = form
    ? form.querySelector("button[type='submit']")
    : null;

  // Create / locate status box
  let statusBox = document.querySelector("#wizardStatus");
  if (!statusBox && form) {
    statusBox = document.createElement("div");
    statusBox.id = "wizardStatus";
    statusBox.className = "wizard-status";
    statusBox.style.display = "none";
    form.appendChild(statusBox);
  }

  if (!form || stepPanels.length === 0) {
    console.error("Wizard form or step panels not found in HTML.");
    return;
  }

  let currentStepIndex = 0;

  // Show a given step by index (0-based)
  function showStep(index) {
    stepPanels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });

    // Update step indicators (if present)
    stepIndicators.forEach((indicator) => {
      const stepNumber = parseInt(indicator.dataset.step || "0", 10) - 1;
      indicator.classList.toggle("active", stepNumber === index);
    });

    if (wizardContainer) {
      wizardContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Initial step
  showStep(currentStepIndex);

  // Handle "Next" buttons
  nextButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStepIndex < stepPanels.length - 1) {
        currentStepIndex += 1;
        showStep(currentStepIndex);
      }
    });
  });

  // Handle "Back" buttons
  backButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStepIndex > 0) {
        currentStepIndex -= 1;
        showStep(currentStepIndex);
      }
    });
  });

  // ------ FORM SUBMIT ------

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

      // Optional: read JSON response
      // const result = await response.json().catch(() => ({}));

      setStatus(
        "Got it. I’ll review your info and reach out with real options shortly.",
        "success"
      );

      // Reset form and move to the "Done" step (step 5)
      form.reset();
      currentStepIndex = stepPanels.length - 1; // last panel (data-step="5")
      showStep(currentStepIndex);
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

  // ------ HELPERS ------

  function collectFormData(formEl) {
    const formData = new FormData(formEl);

    // Base fields expected by save-lead function
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

    // Attach ad/source metadata
    data.adSource = getAdSource();

    return data;
  }

  function lockSubmit(locked) {
    if (!submitButton) return;
    submitButton.disabled = locked;
    submitButton.textContent = locked ? "Sending..." : "Submit my search";
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.style.display = "block";
    statusBox.classList.remove("status-error", "status-success");
    if (type === "error") {
      statusBox.classList.add("status-error");
    } else if (type === "success") {
      statusBox.classList.add("status-success");
    }
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.textContent = "";
    statusBox.style.display = "none";
    statusBox.classList.remove("status-error", "status-success");
  }
});
