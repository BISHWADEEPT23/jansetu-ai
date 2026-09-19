import type {
  CitizenRequest,
  DashboardKPIData,
  RequestFilterOptions,
  RequestStatus,
} from '../src/types/citizenRequest.ts';
import { stripUndefined } from './geminiService.ts';
import { serverRequestRepo } from './repositories/requestRepository.ts';
import { clusterStore } from './clusterStore.ts';
import { processRequestClustering } from './clusteringService.ts';

// Pre-seeded benchmark requests for demonstration and Policymaker Dashboard exploration
export const DEMO_BENCHMARK_REQUESTS: CitizenRequest[] = [
  {
    requestId: 'JS-IN-2026-000001',
    publicRequestId: 'JS-IN-2026-000001',
    timestamp: '2026-09-18T10:30:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Village',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: null,
      district: 'Wardha',
      districtCode: null,
      locality: 'Seloo Village',
      latitude: 20.8356,
      longitude: 78.7056,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Marathi',
    originalRequest: 'आमच्या गावात मुख्य रस्त्यावरचा पूल गेल्या पावसाळ्यात वाहून गेला आहे. शाळकरी मुलांचे आणि शेतकऱ्यांचे जाणे-येणे ठप्प झाले आहे. तातडीने दुरुस्ती व्हावी.',
    translatedRequest: 'The bridge on the main road in our village was washed away during the last monsoons. Commuting for school children and farmers has completely halted. Urgent repair is requested.',
    category: 'Transport',
    subcategory: 'Culvert & Rural Bridge Reconstruction',
    requestType: 'Repair',
    urgency: 'Critical',
    summary: 'Culvert bridge washed away halting school and farm transit; urgent reconstruction demanded.',
    confidenceScore: 0.96,
    status: 'Under Analysis',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000002',
    publicRequestId: 'JS-IN-2026-000002',
    timestamp: '2026-09-17T14:15:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    locality: 'Rohania Block',
    latitude: 25.2632,
    longitude: 82.9098,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Uttar Pradesh',
      stateCode: null,
      district: 'Varanasi',
      districtCode: null,
      locality: 'Rohania Block',
      latitude: 25.2632,
      longitude: 82.9098,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'हमारे प्राथमिक स्वास्थ्य केंद्र (PHC) में पिछले 6 महीने से कोई डॉक्टर और एम्बुलेंस सुविधा नहीं है। प्रसव और आपातकाल के लिए 35 किलोमीटर दूर जिला अस्पताल जाना पड़ता है।',
    translatedRequest: 'There has been no doctor or ambulance facility at our Primary Health Centre (PHC) for the last 6 months. For deliveries and emergencies, people have to travel 35 km to the district hospital.',
    category: 'Healthcare',
    subcategory: 'Primary Health Centre & Emergency Response',
    requestType: 'Service Improvement',
    urgency: 'Critical',
    summary: 'PHC lacks staff doctor and ambulance; residents forced to travel 35km for critical healthcare.',
    confidenceScore: 0.98,
    status: 'Submitted',
    distanceMentionedKm: 35,
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000003',
    publicRequestId: 'JS-IN-2026-000003',
    timestamp: '2026-09-16T09:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Bihar',
    district: 'Patna',
    locality: 'Danapur Rural',
    latitude: 25.6297,
    longitude: 85.0444,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Bihar',
      stateCode: null,
      district: 'Patna',
      districtCode: null,
      locality: 'Danapur Rural',
      latitude: 25.6297,
      longitude: 85.0444,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'जल नल योजना के तहत पाइपलाइन तो बिछा दी गई पर पिछले 4 महीने से नलों में पानी नहीं आ रहा है। गांव के 500 घरों को 2 किलोमीटर दूर से पीने का पानी लाना पड़ता है।',
    translatedRequest: 'Under the tap water scheme, pipelines were laid, but no water has flowed for the past 4 months. 500 households in the village must fetch drinking water from 2 km away.',
    category: 'Water',
    subcategory: 'Piped Drinking Water Supply',
    requestType: 'Repair',
    urgency: 'High',
    summary: 'Dry tap water distribution network forces 500 families to travel 2 km for potable water.',
    confidenceScore: 0.95,
    status: 'Clustered',
    householdsMentioned: 500,
    distanceMentionedKm: 2,
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000004',
    publicRequestId: 'JS-IN-2026-000004',
    timestamp: '2026-09-15T11:45:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Karnataka',
    district: 'Mysuru',
    locality: 'Hunsur Taluk',
    latitude: 12.3082,
    longitude: 76.2917,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Karnataka',
      stateCode: null,
      district: 'Mysuru',
      districtCode: null,
      locality: 'Hunsur Taluk',
      latitude: 12.3082,
      longitude: 76.2917,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Kannada',
    originalRequest: 'ನಮ್ಮ ಗ್ರಾಮ ಪಂಚಾಯತ್ ವ್ಯಾಪ್ತಿಯ ಸರ್ಕಾರಿ ಹಿರಿಯ ಪ್ರಾಥಮಿಕ ಶಾಲೆಯಲ್ಲಿ ಹೆಣ್ಣುಮಕ್ಕಳಿಗೆ ಪ್ರತ್ಯೇಕ ಶೌಚಾಲಯವಿಲ್ಲ. ಇದರಿಂದಾಗಿ ವಿದ್ಯಾರ್ಥಿನಿಯರ ಹಾಜರಾತಿ ಕಡಿಮೆಯಾಗುತ್ತಿದೆ.',
    translatedRequest: 'There is no separate toilet for girls in the Government Higher Primary School under our Gram Panchayat. As a result, attendance of female students is declining.',
    category: 'Sanitation',
    subcategory: 'School Sanitation & Hygiene Facilities',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: 'Government school lacks dedicated female sanitation units affecting student attendance.',
    confidenceScore: 0.97,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000005',
    publicRequestId: 'JS-IN-2026-000005',
    timestamp: '2026-09-14T16:20:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Tamil Nadu',
    district: 'Madurai',
    locality: 'Usilampatti',
    latitude: 9.9706,
    longitude: 77.7947,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Tamil Nadu',
      stateCode: null,
      district: 'Madurai',
      districtCode: null,
      locality: 'Usilampatti',
      latitude: 9.9706,
      longitude: 77.7947,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Tamil',
    originalRequest: 'விவசாய விளைபொருட்களை சேமித்து வைக்க எங்கள் பகுதியில் குளிர்சாதன கிடங்கு வசதி இல்லை. தக்காளி, வெங்காயம் அழுகி விவசாயிகள் பெரும் நஷ்டமடைகின்றனர்.',
    translatedRequest: 'There is no cold storage warehouse facility in our area to store agricultural produce. Tomatoes and onions rot, causing severe losses to farmers.',
    category: 'Agriculture',
    subcategory: 'Agri Cold Storage & Warehousing',
    requestType: 'New Infrastructure',
    urgency: 'Medium',
    summary: 'Lack of cold storage infrastructure results in post-harvest losses for local farmers.',
    confidenceScore: 0.94,
    status: 'Under Analysis',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000006',
    publicRequestId: 'JS-IN-2026-000006',
    timestamp: '2026-09-13T08:10:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Rajasthan',
    district: 'Barmer',
    locality: 'Sheo Tehsil',
    latitude: 26.1953,
    longitude: 71.2464,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Rajasthan',
      stateCode: null,
      district: 'Barmer',
      districtCode: null,
      locality: 'Sheo Tehsil',
      latitude: 26.1953,
      longitude: 71.2464,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'हमारे इलाके में मोबाइल नेटवर्क बिल्कुल नहीं आता है। ऑनलाइन पढ़ाई, आपातकालीन 108 एम्बुलेंस और बैंक डिजिटल सेवाओं के लिए 5 किमी दूर पहाड़ी पर जाना पड़ता है।',
    translatedRequest: 'There is no mobile network in our locality. For online schooling, emergency 108 ambulance, and digital banking services, we have to travel 5 km to a hilltop.',
    category: 'Digital Connectivity',
    subcategory: 'Cellular Tower & Broadband Coverage',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: 'Zero telecom coverage isolates village from emergency medical and digital citizen services.',
    confidenceScore: 0.95,
    status: 'Submitted',
    distanceMentionedKm: 5,
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000007',
    publicRequestId: 'JS-IN-2026-000007',
    timestamp: '2026-09-12T13:30:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Assam',
    district: 'Kamrup',
    locality: 'Hajo Block',
    latitude: 26.2467,
    longitude: 91.5239,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Assam',
      stateCode: null,
      district: 'Kamrup',
      districtCode: null,
      locality: 'Hajo Block',
      latitude: 26.2467,
      longitude: 91.5239,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Assamese',
    originalRequest: 'গাঁওৰ মূল পথত বিজুলীৰ খুঁটিবোৰ হালি পৰিছে আৰু সঘনাই তাঁৰ ছিগি পৰে। যিকোনো মুহূৰ্ততে ভয়ংকৰ দুৰ্ঘটনা ঘটিব পাৰে। অতি সোনকালে নতুন তাঁৰ আৰু ট্ৰেন্সফৰ্মাৰ লাগে।',
    translatedRequest: 'Electric poles on the village main path are tilting and high voltage wires snap frequently. A catastrophic accident could happen anytime. New cabling and transformer needed immediately.',
    category: 'Electricity',
    subcategory: 'Power Distribution Line Safety & Transformer',
    requestType: 'Repair',
    urgency: 'Critical',
    summary: 'Hazardous low-hanging electric lines and tilting utility poles pose active electrocution risk.',
    confidenceScore: 0.99,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000008',
    publicRequestId: 'JS-IN-2026-000008',
    timestamp: '2026-09-11T17:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'West Bengal',
    district: 'South 24 Parganas',
    locality: 'Gosaba, Sundarbans',
    latitude: 22.1652,
    longitude: 88.8078,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'West Bengal',
      stateCode: null,
      district: 'South 24 Parganas',
      districtCode: null,
      locality: 'Gosaba, Sundarbans',
      latitude: 22.1652,
      longitude: 88.8078,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Bengali',
    originalRequest: 'নদী বাঁধের মাটি ধসে গেছে। জোয়ারের নোনা জল চাষের জমিতে ঢুকে পড়ছে। বাঁধ দ্রুত কংক্রিট দিয়ে মজবুত না করলে কয়েকশো পরিবার গৃহহীন হয়ে পড়বে।',
    translatedRequest: 'The river embankment has collapsed. Saline tidal water is intruding into arable agricultural land. If embankment is not reinforced with concrete, hundreds of families will be displaced.',
    category: 'Environment',
    subcategory: 'Flood Embankment & Coastal Protection',
    requestType: 'Repair',
    urgency: 'Critical',
    summary: 'Breached river embankment threatens saltwater intrusion and eviction of hundreds of rural families.',
    confidenceScore: 0.97,
    status: 'Under Analysis',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000009',
    publicRequestId: 'JS-IN-2026-000009',
    timestamp: '2026-09-10T15:20:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Odisha',
    district: 'Koraput',
    locality: 'Semiliguda',
    latitude: 18.7058,
    longitude: 82.9098,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Odisha',
      stateCode: null,
      district: 'Koraput',
      districtCode: null,
      locality: 'Semiliguda',
      latitude: 18.7058,
      longitude: 82.9098,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Odia',
    originalRequest: 'ଆମ ପଞ୍ଚାୟତର ଉଚ୍ଚ ବିଦ୍ୟାଳୟରେ ଗଣିତ ଏବଂ ବିଜ୍ଞାନ ଶିକ୍ଷକ ନାହାଁନ୍ତି। ପିଲାମାନଙ୍କ ଭବିଷ୍ୟତ ନଷ୍ଟ ହେଉଛି। ତୁରନ୍ତ ସ୍ଥାୟୀ ଶିକ୍ଷକ ନିଯୁକ୍ତି ଦିଆଯାଉ।',
    translatedRequest: 'There are no mathematics and science teachers in our panchayat high school. The children future is being ruined. Permanent teachers should be appointed immediately.',
    category: 'Education',
    subcategory: 'School Staffing & Academic Infrastructure',
    requestType: 'Service Improvement',
    urgency: 'High',
    summary: 'High school lacks core STEM teaching staff, impacting regional student development.',
    confidenceScore: 0.94,
    status: 'Reviewed',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000010',
    publicRequestId: 'JS-IN-2026-000010',
    timestamp: '2026-09-09T10:05:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Punjab',
    district: 'Ludhiana',
    locality: 'Sahnewal',
    latitude: 30.8447,
    longitude: 75.9863,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Punjab',
      stateCode: null,
      district: 'Ludhiana',
      districtCode: null,
      locality: 'Sahnewal',
      latitude: 30.8447,
      longitude: 75.9863,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Punjabi',
    originalRequest: 'ਬਾਜ਼ਾਰ ਖੇਤਰ ਵਿੱਚ ਜਲ ਨਿਕਾਸੀ ਦਾ ਕੋਈ ਨਾਲਾ ਨਾ ਹੋਣ ਕਾਰਨ ਮੀਂਹ ਵਿੱਚ 2 ਫੁੱਟ ਪਾਣੀ ਭਰ ਜਾਂਦਾ ਹੈ। ਦੁਕਾਨਾਂ ਬੰਦ ਹੋ ਜਾਂਦੀਆਂ ਹਨ ਅਤੇ ਗੰਦਾ ਪਾਣੀ ਘਰਾਂ ਵਿੱਚ ਵੜ ਜਾਂਦਾ ਹੈ।',
    translatedRequest: 'Due to absence of storm drainage in the market area, 2 feet of water logs during rains. Commercial stalls shutter down and wastewater enters residences.',
    category: 'Sanitation',
    subcategory: 'Storm Water Drainage & Flood Outfall',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: 'Commercial hub lacks storm water drain causing 2-foot wastewater waterlogging during monsoon.',
    confidenceScore: 0.96,
    status: 'Under Analysis',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },

  // Additional District Demands to illustrate Clustering & Hotspots in Wardha, Varanasi, and Pune
  {
    requestId: 'JS-IN-2026-000011',
    publicRequestId: 'JS-IN-2026-000011',
    timestamp: '2026-09-18T16:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Deoli Industrial Corridor',
    latitude: 20.6548,
    longitude: 78.4795,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: null,
      district: 'Wardha',
      districtCode: null,
      locality: 'Deoli Industrial Corridor',
      latitude: 20.6548,
      longitude: 78.4795,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Marathi',
    originalRequest: 'एमआयडीसी रस्त्यावरील पथदिवे बंद असल्याने कामगारांना रात्रीच्या वेळी सायकलने जाणे धोकादायक झाले आहे.',
    translatedRequest: 'Street lamps on the MIDC corridor road have failed, posing grave night-transit danger for factory workers.',
    category: 'Electricity',
    subcategory: 'Street Lighting & Industrial Corridor Safety',
    requestType: 'Repair',
    urgency: 'Medium',
    summary: 'Non-functional streetlights on factory access road creating severe safety concerns.',
    confidenceScore: 0.95,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000012',
    publicRequestId: 'JS-IN-2026-000012',
    timestamp: '2026-09-17T11:20:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Arvi Rural Market',
    latitude: 20.9852,
    longitude: 78.2312,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: null,
      district: 'Wardha',
      districtCode: null,
      locality: 'Arvi Rural Market',
      latitude: 20.9852,
      longitude: 78.2312,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Marathi',
    originalRequest: 'आर्वी आठवडी बाजारपेठेत महिला शेतकऱ्यांसाठी सार्वजनिक शौचालयाची कोणतीही सोय नाही.',
    translatedRequest: 'There is zero public sanitation for women farmers in the weekly market yard at Arvi.',
    category: 'Sanitation',
    subcategory: 'Marketplace Public Sanitation Units',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: 'Absence of public sanitation in weekly rural mandi heavily affecting women vendors.',
    confidenceScore: 0.97,
    status: 'Under Analysis',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000013',
    publicRequestId: 'JS-IN-2026-000013',
    timestamp: '2026-09-16T18:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    locality: 'Sewapuri Block',
    latitude: 25.3214,
    longitude: 82.8094,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Uttar Pradesh',
      stateCode: null,
      district: 'Varanasi',
      districtCode: null,
      locality: 'Sewapuri Block',
      latitude: 25.3214,
      longitude: 82.8094,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'सेवापुरी ब्लॉक के 4 परिषदीय विद्यालयों में पेयजल के लिए लगे इंडिया मार्का नल में फ्लोराइड और बालू आ रहा है।',
    translatedRequest: 'Handpumps in 4 government schools in Sewapuri block are pumping fluoride and sandy water.',
    category: 'Water',
    subcategory: 'School Drinking Water Purification',
    requestType: 'Repair',
    urgency: 'Critical',
    summary: 'Contaminated sandy groundwater in rural school handpumps causing health risks to pupils.',
    confidenceScore: 0.98,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000014',
    publicRequestId: 'JS-IN-2026-000014',
    timestamp: '2026-09-15T09:30:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    locality: 'Phoolpur Market',
    latitude: 25.4851,
    longitude: 82.8252,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Uttar Pradesh',
      stateCode: null,
      district: 'Varanasi',
      districtCode: null,
      locality: 'Phoolpur Market',
      latitude: 25.4851,
      longitude: 82.8252,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'फूलपुर चौराहे पर रेलवे क्रॉसिंग के पास ओवरब्रिज न होने से प्रतिदिन 3 घंटे जाम लगता है।',
    translatedRequest: 'Absence of an overbridge near Phoolpur railway crossing causes 3-hour gridlock daily.',
    category: 'Transport',
    subcategory: 'Railway Overbridge (ROB) Construction',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: 'Severe traffic bottleneck at railway crossing requiring Road Overbridge (ROB) construction.',
    confidenceScore: 0.96,
    status: 'Under Analysis',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000015',
    publicRequestId: 'JS-IN-2026-000015',
    timestamp: '2026-09-14T12:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Pune',
    locality: 'Hadapsar Ward',
    latitude: 18.5089,
    longitude: 73.9259,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: null,
      district: 'Pune',
      districtCode: null,
      locality: 'Hadapsar Ward',
      latitude: 18.5089,
      longitude: 73.9259,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hinglish',
    originalRequest: 'Nallah block ho gaya hai aur paani raste pe aa raha hai.',
    translatedRequest: 'The stormwater drainage canal is blocked and wastewater is overflowing onto the street.',
    category: 'Sanitation',
    subcategory: 'Stormwater Drainage Canal Cleaning',
    requestType: 'Repair',
    urgency: 'High',
    summary: 'Blocked drainage canal causing street overflow and pedestrian blockage.',
    confidenceScore: 0.95,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },

  // SECTION 22: Unresolved Geography Records (Demonstrating missing coordinates do not disappear)
  {
    requestId: 'JS-IN-2026-000016',
    publicRequestId: 'JS-IN-2026-000016',
    timestamp: '2026-09-13T10:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Bihar',
    district: 'Darbhanga',
    locality: 'Remote Diara Flood Plain (Unregistered Settlement)',
    latitude: null,
    longitude: null,
    geoStatus: 'UNRESOLVED',
    geoSource: 'UNKNOWN',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Bihar',
      stateCode: null,
      district: 'Darbhanga',
      districtCode: null,
      locality: 'Remote Diara Flood Plain (Unregistered Settlement)',
      latitude: null,
      longitude: null,
      geoStatus: 'UNRESOLVED',
      geoSource: 'UNKNOWN',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'दियारा इलाके में नाव की कोई व्यवस्था नहीं है। बाढ़ के समय राशन और डॉक्टर तक पहुंचना नामुमकिन हो जाता है।',
    translatedRequest: 'There is no municipal boat transport service in the remote riverine island flood plains.',
    category: 'Transport',
    subcategory: 'Riverine Ferry & Boat Transport Service',
    requestType: 'New Infrastructure',
    urgency: 'Critical',
    summary: 'Island flood plain lacks rescue and passenger boats, isolating families during monsoon.',
    confidenceScore: 0.91,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000017',
    publicRequestId: 'JS-IN-2026-000017',
    timestamp: '2026-09-12T09:15:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Himachal Pradesh',
    district: 'Shimla',
    locality: 'Upper Ridge Hamlets',
    latitude: null,
    longitude: null,
    geoStatus: 'UNRESOLVED',
    geoSource: 'UNKNOWN',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Himachal Pradesh',
      stateCode: null,
      district: 'Shimla',
      districtCode: null,
      locality: 'Upper Ridge Hamlets',
      latitude: null,
      longitude: null,
      geoStatus: 'UNRESOLVED',
      geoSource: 'UNKNOWN',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'ऊपरी पहाड़ियों पर बिजली के तार बर्फबारी में गिर गए हैं। 15 दिन से अंधेरा है।',
    translatedRequest: 'Overhead power cables in the upper ridges snapped during early snowfall. No power for 15 days.',
    category: 'Electricity',
    subcategory: 'Mountain Power Line Restoration',
    requestType: 'Repair',
    urgency: 'Critical',
    summary: 'High-altitude hamlet power grid collapsed following snowfall, leaving homes without heating.',
    confidenceScore: 0.94,
    status: 'Submitted',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  // BUILD 06: Multilingual Semantic Clustering Benchmark Dataset (Wardha Healthcare Cluster)
  {
    requestId: 'JS-IN-2026-000018',
    publicRequestId: 'JS-IN-2026-000018',
    timestamp: '2026-09-18T11:20:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Block',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: 'MH',
      district: 'Wardha',
      districtCode: '506',
      locality: 'Seloo Block',
      latitude: 20.8356,
      longitude: 78.7056,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Marathi',
    originalRequest: 'आमच्या गावात प्राथमिक आरोग्य केंद्र नाही. उपचारासाठी ३० किमी जावे लागते. गरोदर महिलांना तालुक्याला घेऊन जाणे अत्यंत धोकादायक ठरते.',
    translatedRequest: 'There is no primary health centre in our village. We have to travel 30 km for medical treatment. Taking pregnant women to the taluka town is extremely risky.',
    category: 'Healthcare',
    subcategory: 'Primary Healthcare Facility Access & Emergency Transport',
    requestType: 'New Infrastructure',
    urgency: 'Critical',
    summary: 'No PHC in village; residents travel 30km for medical care; maternal emergencies high risk.',
    confidenceScore: 0.98,
    status: 'Clustered',
    clusterId: 'CLUSTER-IN-2026-HC01WD',
    distanceMentionedKm: 30,
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000019',
    publicRequestId: 'JS-IN-2026-000019',
    timestamp: '2026-09-18T13:45:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Block',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: 'MH',
      district: 'Wardha',
      districtCode: '506',
      locality: 'Seloo Block',
      latitude: 20.8356,
      longitude: 78.7056,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'हमारे गांव में अस्पताल नहीं है। गंभीर बीमारी या डिलीवरी के लिए 30 किलोमीटर दूर जिला अस्पताल जाना पड़ता है। यहां तुरंत पीएचसी बनाया जाए।',
    translatedRequest: 'There is no hospital in our village. For serious illness or delivery, we have to travel 30 km to the district hospital. A PHC should be built here immediately.',
    category: 'Healthcare',
    subcategory: 'Primary Healthcare Facility Access & Emergency Transport',
    requestType: 'New Infrastructure',
    urgency: 'Critical',
    summary: 'Absence of hospital forces 30km commute for emergencies and maternity care; PHC demanded.',
    confidenceScore: 0.99,
    status: 'Clustered',
    clusterId: 'CLUSTER-IN-2026-HC01WD',
    distanceMentionedKm: 30,
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000020',
    publicRequestId: 'JS-IN-2026-000020',
    timestamp: '2026-09-18T14:10:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Block',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: 'MH',
      district: 'Wardha',
      districtCode: '506',
      locality: 'Seloo Block',
      latitude: 20.8356,
      longitude: 78.7056,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'Hindi',
    originalRequest: 'Treatment ke liye bahut door jana padta hai. Hamare area mein PHC chahiye aur ambulance ki facility honi chahiye.',
    translatedRequest: 'We have to travel very far for medical treatment. We need a PHC in our area along with ambulance facilities.',
    category: 'Healthcare',
    subcategory: 'Primary Healthcare Facility Access & Emergency Transport',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: 'Long distance travel required for treatment; PHC and ambulance facility required in Seloo area.',
    confidenceScore: 0.95,
    status: 'Clustered',
    clusterId: 'CLUSTER-IN-2026-HC01WD',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  {
    requestId: 'JS-IN-2026-000021',
    publicRequestId: 'JS-IN-2026-000021',
    timestamp: '2026-09-18T15:00:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Block',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: 'MH',
      district: 'Wardha',
      districtCode: '506',
      locality: 'Seloo Block',
      latitude: 20.8356,
      longitude: 78.7056,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'English',
    originalRequest: 'We travel 30 kilometres for medical treatment. Pregnant women have to travel to another town for basic healthcare. An operational health centre is desperately needed in Seloo.',
    translatedRequest: 'We travel 30 kilometres for medical treatment. Pregnant women have to travel to another town for basic healthcare. An operational health centre is desperately needed in Seloo.',
    category: 'Healthcare',
    subcategory: 'Primary Healthcare Facility Access & Emergency Transport',
    requestType: 'New Infrastructure',
    urgency: 'High',
    summary: '30km travel for healthcare, high risk for pregnant mothers; operational health centre demanded.',
    confidenceScore: 0.97,
    status: 'Clustered',
    clusterId: 'CLUSTER-IN-2026-HC01WD',
    distanceMentionedKm: 30,
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
  // Negative test: Same locality (Seloo, Wardha) but Transport category (Ensures no cross-category clustering)
  {
    requestId: 'JS-IN-2026-000022',
    publicRequestId: 'JS-IN-2026-000022',
    timestamp: '2026-09-18T16:15:00.000Z',
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    district: 'Wardha',
    locality: 'Seloo Block',
    latitude: 20.8356,
    longitude: 78.7056,
    geoStatus: 'VERIFIED',
    geoSource: 'GEOCODED_LOCATION',
    location: {
      countryCode: 'IN',
      country: 'India',
      state: 'Maharashtra',
      stateCode: 'MH',
      district: 'Wardha',
      districtCode: '506',
      locality: 'Seloo Block',
      latitude: 20.8356,
      longitude: 78.7056,
      geoStatus: 'VERIFIED',
      geoSource: 'GEOCODED_LOCATION',
    },
    originalLanguage: 'English',
    originalRequest: 'The main connecting road between Seloo and the highway has severe potholes and washed out drainage ditches.',
    translatedRequest: 'The main connecting road between Seloo and the highway has severe potholes and washed out drainage ditches.',
    category: 'Transport',
    subcategory: 'Rural Road Reconstruction & Pothole Repair',
    requestType: 'Repair',
    urgency: 'High',
    summary: 'Potholed access corridor between Seloo and highway requires road repaving.',
    confidenceScore: 0.95,
    status: 'Clustered',
    clusterId: 'CLUSTER-IN-2026-TR03WD',
    sourceChannel: 'WEB',
    dataOrigin: 'DEMO_SYNTHETIC',
    schemaVersion: 1,
  },
];

class RequestStore {
  // In-memory cache for ultra-low latency reads and fallback resilience
  private cachedMemoryRequests: CitizenRequest[] = [...DEMO_BENCHMARK_REQUESTS];

  public async getAll(filters?: RequestFilterOptions): Promise<CitizenRequest[]> {
    try {
      // 1. Fetch genuine citizen submissions from Firestore
      const firestoreItems = await serverRequestRepo.getAllRequests(filters);

      // 2. Combine Firestore live records with demo benchmarks if not filtering strictly by PROTOTYPE_USER
      let combined: CitizenRequest[] = [];

      if (filters?.dataOrigin === 'PROTOTYPE_USER') {
        combined = firestoreItems.filter((r) => r.dataOrigin === 'PROTOTYPE_USER');
      } else if (filters?.dataOrigin === 'DEMO_SYNTHETIC') {
        combined = DEMO_BENCHMARK_REQUESTS;
      } else {
        // De-duplicate by requestId
        const map = new Map<string, CitizenRequest>();
        for (const item of firestoreItems) {
          map.set(item.requestId, item);
        }
        for (const demo of DEMO_BENCHMARK_REQUESTS) {
          if (!map.has(demo.requestId)) {
            map.set(demo.requestId, demo);
          }
        }
        combined = Array.from(map.values());
      }

      // Apply standard filters
      let result = combined;
      if (filters?.state && filters.state !== 'All') {
        result = result.filter((r) => r.state?.toLowerCase() === filters.state?.toLowerCase());
      }
      if (filters?.district && filters.district !== 'All') {
        result = result.filter((r) => r.district?.toLowerCase() === filters.district?.toLowerCase());
      }
      if (filters?.category && filters.category !== 'All') {
        result = result.filter((r) => r.category?.toLowerCase() === filters.category?.toLowerCase());
      }
      if (filters?.urgency && filters.urgency !== 'All') {
        result = result.filter((r) => r.urgency?.toLowerCase() === filters.urgency?.toLowerCase());
      }
      if (filters?.status && filters.status !== 'All') {
        result = result.filter((r) => r.status?.toLowerCase() === filters.status?.toLowerCase());
      }
      if (filters?.geoStatus && filters.geoStatus !== 'All') {
        result = result.filter((r) => r.geoStatus === filters.geoStatus);
      }
      if (filters?.timeRange && filters.timeRange !== 'all') {
        const now = Date.now();
        const days = filters.timeRange === '7d' ? 7 : filters.timeRange === '30d' ? 30 : 90;
        const threshold = now - days * 24 * 60 * 60 * 1000;
        result = result.filter((r) => new Date(r.timestamp).getTime() >= threshold);
      }
      if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        result = result.filter(
          (r) =>
            r.requestId.toLowerCase().includes(q) ||
            r.originalRequest?.toLowerCase().includes(q) ||
            r.translatedRequest?.toLowerCase().includes(q) ||
            r.summary?.toLowerCase().includes(q) ||
            r.locality?.toLowerCase().includes(q) ||
            r.district?.toLowerCase().includes(q) ||
            r.state?.toLowerCase().includes(q) ||
            r.subcategory?.toLowerCase().includes(q)
        );
      }

      return result;
    } catch (err) {
      console.warn('[RequestStore] Falling back to in-memory cache:', err);
      return this.cachedMemoryRequests;
    }
  }

  public async getById(id: string): Promise<CitizenRequest | undefined> {
    const list = await this.getAll();
    return list.find((r) => r.requestId === id || r.publicRequestId === id);
  }

  public async create(payload: any): Promise<CitizenRequest> {
    try {
      const persisted = await serverRequestRepo.saveRequest(payload);
      this.cachedMemoryRequests.unshift(persisted);

      // BUILD 06: Semantic Demand Clustering & Deduplication Pipeline
      try {
        const existingClusters = await clusterStore.getAll();
        const allRequests = await this.getAll();
        const clusterResult = await processRequestClustering(persisted, existingClusters, allRequests);
        await clusterStore.save(clusterResult.cluster);
        await serverRequestRepo.updateCluster(persisted.requestId, clusterResult.cluster.clusterId, 'CLUSTERED');
        persisted.clusterId = clusterResult.cluster.clusterId;
        persisted.status = 'Clustered';

        // Update in-memory item
        const found = this.cachedMemoryRequests.find((r) => r.requestId === persisted.requestId);
        if (found) {
          found.clusterId = clusterResult.cluster.clusterId;
          found.status = 'Clustered';
        }
      } catch (clusterErr) {
        console.warn('[RequestStore] Clustering post-process non-blocking warning:', clusterErr);
      }

      return persisted;
    } catch (err) {
      console.error('[RequestStore] Cloud Firestore persistence error:', err);
      throw err;
    }
  }

  public async updateStatus(id: string, newStatus: RequestStatus): Promise<CitizenRequest | null> {
    await serverRequestRepo.updateStatus(id, newStatus);
    const item = this.cachedMemoryRequests.find((r) => r.requestId === id || r.publicRequestId === id);
    if (item) {
      item.status = newStatus;
    }
    return item || null;
  }

  public async getKPIs(): Promise<DashboardKPIData> {
    const all = await this.getAll();

    const totalRequests = all.length;
    const highPriorityRequests = all.filter((r) => r.urgency === 'High').length;
    const criticalRequests = all.filter((r) => r.urgency === 'Critical').length;

    const districtSet = new Set(all.map((r) => `${r.state} - ${r.district}`));
    const districtsRepresented = districtSet.size;

    // Category distribution
    const catMap: Record<string, number> = {};
    for (const r of all) {
      catMap[r.category] = (catMap[r.category] || 0) + 1;
    }
    const categoryDistribution = Object.entries(catMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Urgency distribution
    const urgMap: Record<string, number> = {};
    for (const r of all) {
      urgMap[r.urgency] = (urgMap[r.urgency] || 0) + 1;
    }
    const urgencyDistribution = ['Critical', 'High', 'Medium', 'Low'].map((name) => ({
      name,
      count: urgMap[name] || 0,
    }));

    // Top Needs
    const subcatMap: Record<string, { count: number; category: string; maxUrgency: string }> = {};
    for (const r of all) {
      const key = `${r.category}:::${r.subcategory}`;
      if (!subcatMap[key]) {
        subcatMap[key] = { count: 0, category: r.category, maxUrgency: r.urgency };
      }
      subcatMap[key].count += 1;
      if (r.urgency === 'Critical') subcatMap[key].maxUrgency = 'Critical';
      else if (r.urgency === 'High' && subcatMap[key].maxUrgency !== 'Critical')
        subcatMap[key].maxUrgency = 'High';
    }

    const topNeeds = Object.entries(subcatMap)
      .map(([key, data]) => {
        const [category, subcategory] = key.split(':::');
        return {
          category,
          subcategory,
          count: data.count,
          topUrgency: data.maxUrgency,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // BUILD 06: Cluster-derived KPIs
    let activeClustersCount = 0;
    let emergingDemandsCount = 0;
    let needsReviewClustersCount = 0;
    let mostReportedCategory = categoryDistribution[0]?.name || 'Healthcare';

    try {
      const clusterKpis = await clusterStore.getClusterKPIs();
      activeClustersCount = clusterKpis.activeClustersCount;
      emergingDemandsCount = clusterKpis.emergingDemandsCount;
      needsReviewClustersCount = clusterKpis.needsReviewClustersCount;
      if (clusterKpis.mostReportedCategory) {
        mostReportedCategory = clusterKpis.mostReportedCategory;
      }
    } catch (e) {
      console.warn('[RequestStore] Error fetching cluster KPIs:', e);
    }

    return {
      totalRequests,
      highPriorityRequests,
      criticalRequests,
      districtsRepresented,
      categoryDistribution,
      urgencyDistribution,
      topNeeds,
      activeClustersCount,
      emergingDemandsCount,
      needsReviewClustersCount,
      mostReportedCategory,
    };
  }
}

export const requestStore = new RequestStore();
