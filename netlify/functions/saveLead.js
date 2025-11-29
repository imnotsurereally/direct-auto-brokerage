// netlify/functions/saveLead.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // For now we just log it in Netlify logs.
    // This is where we'll later:
    //  - write to a database (Supabase)
    //  - call real AI to summarize and score the lead
    console.log("New lead from website:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Error parsing lead payload:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
    };
  }
};
