// netlify/functions/saveLead.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const ALERT_TO_PHONE = process.env.ALERT_TO_PHONE;

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase env vars are missing");
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Supabase configuration missing" }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("Error parsing JSON body:", err);
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  console.log("New lead from Direct Auto Brokerage wizard:", data);

  // ---------- AI CLASSIFICATION ----------
  let aiHeat = null;
  let aiTimelineBucket = null;
  let aiVehicleIntent = null;
  let aiSummary = null;

  if (OPENAI_API_KEY) {
    try {
      const prompt = `
You are helping classify an auto broker lead.

Lead answers:
- Goal: ${data.goal || "n/a"}
- Timeline: ${data.timeline || "n/a"}
- New or used: ${data.newOrUsed || "n/a"}
- Vehicle type: ${data.vehicleType || "n/a"}
- Model preferences: ${data.modelPreferences || "n/a"}
- Payment range: ${data.paymentRange || "n/a"}
- Down payment: ${data.downPayment || "n/a"}
- Credit: ${data.credit || "n/a"}

Return STRICT JSON with this shape:
{
  "heat": "HOT" | "WARM" | "BROWSING",
  "timeline_bucket": "ASAP" | "30_days" | "60_plus_days" | "just_looking",
  "vehicle_intent": "SUV" | "sedan" | "truck" | "coupe" | "ev_hybrid" | "van" | "unknown",
  "summary": "short one or two sentence summary aimed at the broker, no fluff"
}
No extra text, no markdown, just JSON.
      `.trim();

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a precise JSON-only classifier for auto broker leads.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        }),
      });

      if (!aiRes.ok) {
        const txt = await aiRes.text();
        console.error("OpenAI API error:", aiRes.status, txt);
      } else {
        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content || "{}";

        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          console.error("Error parsing AI JSON content:", parseErr, content);
          parsed = {};
        }

        aiHeat = parsed.heat || null;
        aiTimelineBucket = parsed.timeline_bucket || null;
        aiVehicleIntent = parsed.vehicle_intent || null;
        aiSummary = parsed.summary || null;

        console.log("AI classification:", parsed);
      }
    } catch (err) {
      console.error("Error calling OpenAI:", err);
    }
  } else {
    console.log("OPENAI_API_KEY not set; skipping AI classification.");
  }

  // ---------- BUILD LEAD OBJECT ----------
  const lead = {
    goal: data.goal || null,
    timeline: data.timeline || null,
    new_or_used: data.newOrUsed || null,
    vehicle_type: data.vehicleType || null,
    model_preferences: data.modelPreferences || null,
    payment_range: data.paymentRange || null,
    down_payment: data.downPayment || null,
    credit: data.credit || null,

    first_name: data.firstName || null,
    last_name: data.lastName || null,
    phone: data.phone || null,
    email: data.email || null,
    contact_method: data.contactMethod || null,

    heat: aiHeat,
    timeline_bucket: aiTimelineBucket,
    vehicle_intent: aiVehicleIntent,
    ai_summary: aiSummary,

    raw_json: data || null,
  };

  try {
    // Insert into Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify([lead]),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Supabase insert error:", response.status, text);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: "Failed to save lead in Supabase",
          status: response.status,
        }),
      };
    }

    console.log("Lead saved to Supabase successfully");

    // ---------- SMS ALERT VIA TWILIO ----------
    if (
      TWILIO_ACCOUNT_SID &&
      TWILIO_AUTH_TOKEN &&
      TWILIO_FROM_NUMBER &&
      ALERT_TO_PHONE
    ) {
      try {
        const smsBody =
          `New ${aiHeat || ""} lead: ` +
          `${lead.first_name || ""} ${lead.last_name || ""} ` +
          `(${lead.phone || ""}). ` +
          (aiSummary || "").trim();

        const authString = Buffer.from(
          `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
        ).toString("base64");

        const params = new URLSearchParams({
          From: TWILIO_FROM_NUMBER,
          To: ALERT_TO_PHONE,
          Body: smsBody,
        });

        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          }
        );

        if (!smsRes.ok) {
          const txt = await smsRes.text();
          console.error("Twilio SMS error:", smsRes.status, txt);
        } else {
          console.log("Alert SMS sent via Twilio");
        }
      } catch (err) {
        console.error("Error sending alert SMS via Twilio:", err);
      }
    } else {
      console.log("Twilio not fully configured; skipping SMS alert.");
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message:
          "Lead received, classified, stored, and SMS notification attempted.",
      }),
    };
  } catch (err) {
    console.error("Error calling Supabase:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Unexpected error while saving lead",
      }),
    };
  }
};
