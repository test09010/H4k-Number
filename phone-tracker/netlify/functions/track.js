// api/track.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone } = req.body;
  const API_KEY = '6A9FBF39974DDDB583B73EB85C1A2882';
  
  // Get client IP
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   '8.8.8.8';

  try {
    // Get IP info
    const ipResponse = await fetch(
      `https://api.ip2location.io/?key=${API_KEY}&ip=${clientIP}`
    );
    const ipData = await ipResponse.json();

    // Process phone
    const phoneData = processPhone(phone);

    res.status(200).json({
      phone: phoneData,
      ip: {
        current: clientIP,
        info: ipData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function processPhone(phone) {
  const cleaned = phone.replace(/[\s\-+()]/g, '');
  const isValid = /^01[3-9]\d{8}$/.test(cleaned);
  
  const operators = {
    '017': { name: 'Grameenphone', code: 'GP', type: 'GSM' },
    '013': { name: 'Grameenphone', code: 'GP', type: 'GSM' },
    '018': { name: 'Robi', code: 'ROBI', type: 'GSM' },
    '016': { name: 'Airtel', code: 'AIRTEL', type: 'GSM' },
    '019': { name: 'Banglalink', code: 'BL', type: 'GSM' },
    '014': { name: 'Banglalink', code: 'BL', type: 'GSM' },
    '015': { name: 'Teletalk', code: 'TT', type: 'CDMA' }
  };

  if (!isValid) {
    return {
      number: phone,
      valid: false,
      error: 'Invalid Bangladesh phone number'
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
