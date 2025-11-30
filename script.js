// =============================
// Direct Auto Brokerage Wizard
// New script.js
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
  const steps = Array.from(document.querySelectorAll(".wizard-step"));
  const nextButtons = Array.from(
    document.querySelectorAll("[data-action='next']")
  );
  const backButtons = Array.from(
    document.querySelectorAll("[data-action='back']")
  );
  const form = document.querySelector("#leadWizardForm");
  const submitButton = document.querySelector("#wizardSubmitButton");
  const statusBox = document.querySelector("#wizardStatus");

  let currentStep = 0;

  if (!form) {
    console.error("leadWizardForm not found in HTML.");
    return;
  }

  // Initialize steps
  function showStep(index) {
    steps.forEach((step, i) => {
      step.style.display = i === index ? "block" : "none";
    });

    // Scroll to top of wizard on step change (helpful on mobile)
    const wizard = document.querySelector(".wizard-container");
    if (wizard) wizard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  showStep(currentStep);

  // Handle Next
  nextButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep < steps.length - 1) {
        currentStep += 1;
        showStep(currentStep);
      }
    });
  });

  // Handle Back
  backButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep > 0) {
        currentStep -= 1;
        showStep(currentStep);
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
      form.reset();
      currentStep = 0;
      showStep(currentStep);
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
    submitButton.textContent = locked ? "Sending..." : "Submit";
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
