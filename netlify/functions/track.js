// netlify/functions/track.js
exports.handler = async function(event, context) {
  // CORS Preflight
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
    
    // ইউজারের IP ঠিক করে নিন (শুধু প্রথমটা)
    let clientIP = event.headers['x-forwarded-for'] || 
                   event.headers['client-ip'] || 
                   event.headers['x-real-ip'] || 
                   '8.8.8.8';
    
    if (clientIP.includes(',')) {
      clientIP = clientIP.split(',')[0].trim();
    }

    // IP2Location API Key
    const API_KEY = '6A9FBF39974DDDB583B73EB85C1A2882';
    const API_URL = `https://api.ip2location.io/?key=${API_KEY}&ip=${clientIP}`;

    // IP তথ্য নিন
    const ipResponse = await fetch(API_URL);
    const ipData = await ipResponse.json();

    // ফোন নম্বর প্রসেস করুন
    const phoneData = processPhone(phone);

    // ফোনের ডিটেইলস লোকেশন (সিমুলেটেড)
    const phoneLocation = getDetailedLocation(phone);

    // লোকেশন ডিটেইলস তৈরি করুন
    const locationDetails = {
      current: {
        ip: clientIP,
        status: ipData.error ? 'offline' : 'online',
        last_seen: new Date().toISOString(),
        location: ipData.error ? null : {
          country: ipData.country_name || 'Unknown',
          country_code: ipData.country_code || 'Unknown',
          region: ipData.region_name || 'Unknown',
          city: ipData.city_name || 'Unknown',
          latitude: ipData.latitude || null,
          longitude: ipData.longitude || null,
          zip_code: ipData.zip_code || null,
          time_zone: ipData.time_zone || null,
          isp: ipData.as || null,
          asn: ipData.asn || null,
          is_proxy: ipData.is_proxy || false
        }
      },
      phone: phoneLocation
    };

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
        location: locationDetails,
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

// ফোন নম্বর প্রসেস করুন
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

  return {
    number: cleaned,
    valid: true,
    operator: operator,
    status: 'active'
  };
}

// ডিটেইলস লোকেশন জেনারেট করুন (Division → District → Thana → Village)
function getDetailedLocation(phone) {
  // Bangladesh এর ডিটেইলস ডাটাবেস
  const locations = [
    // Dhaka Division
    { 
      division: 'Dhaka', 
      district: 'Dhaka', 
      thana: 'Gulshan', 
      village: 'Bashundhara',
      lat: 23.8103, 
      lon: 90.4125 
    },
    { 
      division: 'Dhaka', 
      district: 'Dhaka', 
      thana: 'Mirpur', 
      village: 'Pallabi',
      lat: 23.8069, 
      lon: 90.3654 
    },
    { 
      division: 'Dhaka', 
      district: 'Gazipur', 
      thana: 'Tongi', 
      village: 'Board Bazar',
      lat: 23.9996, 
      lon: 90.4202 
    },
    { 
      division: 'Dhaka', 
      district: 'Narayanganj', 
      thana: 'Sadar', 
      village: 'Chashara',
      lat: 23.6333, 
      lon: 90.5000 
    },
    // Chittagong Division
    { 
      division: 'Chittagong', 
      district: 'Chittagong', 
      thana: 'Panchlaish', 
      village: 'Nasirabad',
      lat: 22.3569, 
      lon: 91.7832 
    },
    { 
      division: 'Chittagong', 
      district: "Cox's Bazar", 
      thana: 'Sadar', 
      village: 'Kolatoli',
      lat: 21.4272, 
      lon: 92.0058 
    },
    { 
      division: 'Chittagong', 
      district: 'Comilla', 
      thana: 'Sadar', 
      village: 'Kandirpar',
      lat: 23.4576, 
      lon: 91.1870 
    },
    // Rajshahi Division
    { 
      division: 'Rajshahi', 
      district: 'Rajshahi', 
      thana: 'Boalia', 
      village: 'Shaheb Bazar',
      lat: 24.3745, 
      lon: 88.6042 
    },
    { 
      division: 'Rajshahi', 
      district: 'Bogura', 
      thana: 'Sadar', 
      village: 'Shahidul Islam Hall',
      lat: 24.8461, 
      lon: 89.3773 
    },
    // Khulna Division
    { 
      division: 'Khulna', 
      district: 'Khulna', 
      thana: 'Sonadanga', 
      village: 'Mojidpur',
      lat: 22.8456, 
      lon: 89.5403 
    },
    { 
      division: 'Khulna', 
      district: 'Satkhira', 
      thana: 'Sadar', 
      village: 'Alipur',
      lat: 22.7044, 
      lon: 89.0725 
    },
    // Barisal Division
    { 
      division: 'Barisal', 
      district: 'Barisal', 
      thana: 'Kotwali', 
      village: 'Amtala',
      lat: 22.7010, 
      lon: 90.3535 
    },
    // Sylhet Division
    { 
      division: 'Sylhet', 
      district: 'Sylhet', 
      thana: 'Shahbag', 
      village: 'Uposhohor',
      lat: 24.8993, 
      lon: 91.8711 
    },
    // Rangpur Division
    { 
      division: 'Rangpur', 
      district: 'Rangpur', 
      thana: 'Gangachara', 
      village: 'Shibganj',
      lat: 25.7552, 
      lon: 89.2446 
    },
    // Mymensingh Division
    { 
      division: 'Mymensingh', 
      district: 'Mymensingh', 
      thana: 'Sadar', 
      village: 'Kewatkhali',
      lat: 24.7539, 
      lon: 90.4073 
    }
  ];

  // ফোন নম্বর দিয়ে হ্যাশ তৈরি করুন (সবসময় একই লোকেশন)
  const hash = hashCode(phone);
  const index = Math.abs(hash) % locations.length;
  const location = locations[index];

  // এলোমেলোভাবে ২-৩টা ভিন্ন লোকেশন দেখান (অতিরিক্ত তথ্য)
  const additionalLocations = [];
  for (let i = 1; i <= 2; i++) {
    const idx = (index + i) % locations.length;
    additionalLocations.push(locations[idx]);
  }

  return {
    primary: {
      division: location.division,
      district: location.district,
      thana: location.thana,
      village: location.village,
      latitude: location.lat,
      longitude: location.lon
    },
    nearby: additionalLocations.map(loc => ({
      division: loc.division,
      district: loc.district,
      thana: loc.thana,
      village: loc.village
    })),
    country: 'Bangladesh',
    country_code: 'BD'
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
