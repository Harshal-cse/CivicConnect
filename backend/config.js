// CivicConnect - Backend Configuration & Environment Variables
// Configured for Kopargaon, Maharashtra Civic Reporting Platform

const path = require('path');
const fs = require('fs');

// Load .env file if present
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const config = {
  // Server Port & Host
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Google Cloud Vision Configuration
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || '',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  
  // Vision Confidence Thresholds
  VISION_MIN_CONFIDENCE: parseFloat(process.env.VISION_MIN_CONFIDENCE || '0.80'),
  VISION_REVIEW_CONFIDENCE: parseFloat(process.env.VISION_REVIEW_CONFIDENCE || '0.60'),
  VISION_VALIDATION_EXPIRY_MINUTES: parseInt(process.env.VISION_VALIDATION_EXPIRY_MINUTES || '30', 10),

  // Image File Constraints
  MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),
  MIN_IMAGE_WIDTH: parseInt(process.env.MIN_IMAGE_WIDTH || '640', 10),
  MIN_IMAGE_HEIGHT: parseInt(process.env.MIN_IMAGE_HEIGHT || '480', 10),
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],

  // Storage Paths (Outside public root)
  STORAGE_TEMP_DIR: path.resolve(__dirname, '../storage/temp_images'),
  STORAGE_COMPLAINT_DIR: path.resolve(__dirname, '../storage/complaint_images'),
  DATA_DIR: path.resolve(__dirname, '../data'),

  // Primary Municipality / City Information (Kopargaon, Maharashtra)
  PRIMARY_CITY: {
    name: 'Kopargaon',
    state: 'Maharashtra',
    district: 'Ahmednagar (Ahilyanagar)',
    corporation: 'Kopargaon Municipal Council (KMC)',
    // Bounding box for Kopargaon municipality geofencing
    geofence: {
      minLat: 19.8500,
      maxLat: 19.9300,
      minLng: 74.4400,
      maxLng: 74.5200,
      centerLat: 19.8864,
      centerLng: 74.4789,
      radiusKm: 7.5
    },
    wards: [
      'Ward 1 - Shivaji Chowk',
      'Ward 2 - Godavari Ghat & Temple Area',
      'Ward 3 - Station Road',
      'Ward 4 - Gandhi Nagar',
      'Ward 5 - Bazar Peth',
      'Ward 6 - Subhash Nagar',
      'Ward 7 - Bet Kopargaon',
      'Ward 8 - Tilak Road',
      'Ward 9 - Ambedkar Colony',
      'Ward 10 - Shirdi Link Road'
    ]
  },

  // Legacy demo cities support (for existing demo presets)
  SUPPORTED_CITIES: ['Kopargaon', 'Pune', 'Mumbai', 'Nagpur'],

  // Active Provider Selection ('google_cloud_vision', 'mock', 'custom_model')
  VISION_PROVIDER: process.env.VISION_PROVIDER || (process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'google_cloud_vision' : 'mock'),

  // Rate Limiting (validations per IP per minute)
  RATE_LIMIT_VALIDATIONS_PER_MIN: parseInt(process.env.RATE_LIMIT_VALIDATIONS_PER_MIN || '30', 10),

  // Google Vision Request Timeout (ms)
  VISION_REQUEST_TIMEOUT_MS: parseInt(process.env.VISION_REQUEST_TIMEOUT_MS || '10000', 10),

  // Supabase Cloud Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'complaint-images',
  get isSupabaseConfigured() {
    return Boolean(this.SUPABASE_URL && (this.SUPABASE_SERVICE_ROLE_KEY || this.SUPABASE_ANON_KEY));
  }
};

module.exports = config;
