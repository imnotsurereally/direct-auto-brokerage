// netlify/functions/saveLead.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase env vars are missing');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Supabase configuration missing' }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    console.error('Error parsing JSON body:', err);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }

  // Log raw lead for debugging
  console.log('New lead from Direct Auto Brokerage wizard:', data);

  // Map incoming fields to table columns
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

    raw_json: data || null,
  };

  try {
    // Use Supabase REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([lead]), // Supabase REST expects an array for bulk insert
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Supabase insert error:', response.status, text);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Failed to save lead in Supabase',
          status: response.status,
        }),
      };
    }

    console.log('Lead saved to Supabase successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Lead received and stored in Supabase.',
      }),
    };
  } catch (err) {
    console.error('Error calling Supabase:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Unexpected error while saving lead' }),
    };
  }
};
