// netlify/functions/track.js
exports.handler = async function(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { phone } = JSON.parse(event.body || '{}');
    const clientIP = event.headers['x-forwarded-for'] || 
                     event.headers['client-ip'] || 
                     event.headers['x-real-ip'] || 
                     '8.8.8.8';

    const API_KEY = '6A9FBF39974DDDB583B73EB85C1A2882';
    const API_URL = `https://api.ip2location.io/?key=${API_KEY}&ip=${clientIP}`;

    // Fetch IP info
    const ipResponse = await fetch(API_URL);
    const ipData = await ipResponse.json();

    // Process phone
    const phoneData = processPhone(phone);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phoneData,
        ip: {
          current: clientIP,
          info: ipData
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      })
    };
  }
};

function processPhone(phone) {
  const cleaned = phone.replace(/[\s\-+()]/g, '');
  
  const operators = {
    '017': { name: 'Grameenphone', code: 'GP', type: 'GSM' },
    '013': { name: 'Grameenphone', code: 'GP', type: 'GSM' },
    '018': { name: 'Robi', code: 'ROBI', type: 'GSM' },
    '016': { name: 'Airtel', code: 'AIRTEL', type: 'GSM' },
    '019': { name: 'Banglalink', code: 'BL', type: 'GSM' },
    '014': { name: 'Banglalink', code: 'BL', type: 'GSM' },
    '015': { name: 'Teletalk', code: 'TT', type: 'CDMA' }
  };

  if (!phone || !/^01[3-9]\d{8}$/.test(cleaned)) {
    return {
      number: phone || '',
      valid: false,
      error: phone ? 'Invalid Bangladesh phone number' : 'No phone number provided'
    };
  }

  const prefix = cleaned.substring(0, 3);
  const operator = operators[prefix] || { name: 'Unknown', code: 'UNK', type: 'Unknown' };
  const hash = hashCode(cleaned);
  const divisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'];
  const division = divisions[Math.abs(hash) % divisions.length];

  return {
    number: cleaned,
    valid: true,
    operator: operator,
    location: {
      division: division,
      district: `${division} District`,
      country: 'Bangladesh',
      country_code: 'BD'
    }
  };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
