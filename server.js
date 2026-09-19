// CivicConnect - Web Server & AI Image-Validation REST API
// Municipal Issue Reporting Platform for Kopargaon, Maharashtra

const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./backend/config');
const db = require('./backend/database');
const storageService = require('./backend/services/storageService');
const validationEngine = require('./backend/services/validationEngine');
const { normalizeCategory } = require('./backend/categoryRules');
const supabaseClient = require('./backend/supabaseClient');

const PORT = config.PORT;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Simple in-memory rate limiter for validation requests
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const history = rateLimitMap.get(ip) || [];
  const validHistory = history.filter(ts => now - ts < windowMs);
  if (validHistory.length >= config.RATE_LIMIT_VALIDATIONS_PER_MIN) {
    return false;
  }
  validHistory.push(now);
  rateLimitMap.set(ip, validHistory);
  return true;
}

// Extract Authenticated User from Request Headers
function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const customUserHeader = req.headers['x-user-id'];
  const customRoleHeader = req.headers['x-user-role'];

  let userId = 'USER-CITIZEN-001';
  let role = 'citizen';
  let name = 'Demo Citizen';
  let ward = 'Ward 1 - Shivaji Chowk';
  let city = 'Kopargaon';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token.includes('admin')) {
      userId = 'USER-ADMIN-001';
      role = 'admin';
      name = 'Municipal Administrator';
    } else if (token.includes('nagarsevak')) {
      userId = 'USER-CORP-001';
      role = 'nagarsevak';
      name = 'Ramesh Patil (Corporator)';
    } else {
      userId = token.startsWith('USER-') ? token : `USER-${token}`;
    }
  }

  if (customUserHeader) userId = customUserHeader;
  if (customRoleHeader) role = customRoleHeader;
  if (req.headers['x-user-ward']) ward = req.headers['x-user-ward'];

  return { userId, role, name, ward, city };
}

// Geofence Validator for Kopargaon, Maharashtra (+ supported demo cities)
function validateGeofence(coordinates, city = 'Kopargaon') {
  if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
    return { valid: false, reason: 'Invalid or missing geographical coordinates' };
  }

  const { lat, lng } = coordinates;

  // 1. Kopargaon Municipality Geofence Check (lat: 19.85 to 19.93, lng: 74.44 to 74.52)
  if (city.toLowerCase() === 'kopargaon') {
    const geo = config.PRIMARY_CITY.geofence;
    if (lat >= geo.minLat && lat <= geo.maxLat && lng >= geo.minLng && lng <= geo.maxLng) {
      return { valid: true, city: 'Kopargaon' };
    }
    return {
      valid: false,
      reason: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) fall outside Kopargaon municipal jurisdiction boundary.`
    };
  }

  // 2. Legacy Demo City Check (Pune, Mumbai, Nagpur)
  if (config.SUPPORTED_CITIES.map(c => c.toLowerCase()).includes(city.toLowerCase())) {
    // Valid for demo purposes
    return { valid: true, city };
  }

  return { valid: false, reason: `Reporting is not enabled for region "${city}".` };
}

// Helper to send structured JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role'
  });
  res.end(JSON.stringify(data));
}

// Helper to read JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Max 15MB to prevent memory exhaustion
      if (body.length > 15 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// Periodic cleanup of expired temporary images every 10 minutes
setInterval(() => {
  storageService.cleanupExpiredImages();
}, 10 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = decodeURI(parsedUrl.pathname);
  const method = req.method.toUpperCase();

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role'
    });
    res.end();
    return;
  }

  // ==========================================================================
  // API ROUTE 1: GET /api/health
  // ==========================================================================
  if (pathname === '/api/health' && method === 'GET') {
    const provider = validationEngine.getActiveProvider();
    const health = await provider.healthCheck();
    return sendJSON(res, 200, {
      status: 'healthy',
      service: 'CivicConnect AI Image-Validation System',
      municipality: config.PRIMARY_CITY.name,
      state: config.PRIMARY_CITY.state,
      activeProvider: validationEngine.activeProviderName,
      providerHealth: health,
      minConfidence: config.VISION_MIN_CONFIDENCE,
      reviewConfidence: config.VISION_REVIEW_CONFIDENCE,
      supabase: {
        configured: config.isSupabaseConfigured,
        provider: config.isSupabaseConfigured ? 'supabase_cloud' : 'local_json_fallback'
      },
      timestamp: new Date().toISOString()
    });
  }

  // ==========================================================================
  // API ROUTE: GET /api/supabase/status (Supabase Cloud Health & Diagnostics)
  // ==========================================================================
  if (pathname === '/api/supabase/status' && method === 'GET') {
    const status = await supabaseClient.testConnection();
    return sendJSON(res, 200, {
      success: true,
      service: 'CivicConnect Supabase Cloud Integration',
      status
    });
  }

  // ==========================================================================
  // API ROUTE: GET /api/complaints (List Complaints with Cloud & Ward Filtering)
  // ==========================================================================
  if (pathname === '/api/complaints' && method === 'GET') {
    const ward = parsedUrl.searchParams.get('ward');
    const city = parsedUrl.searchParams.get('city');
    const status = parsedUrl.searchParams.get('status');
    const userId = parsedUrl.searchParams.get('userId');
    const limit = parsedUrl.searchParams.get('limit');

    const complaints = await db.listComplaintsAsync({ ward, city, status, userId, limit });
    return sendJSON(res, 200, {
      success: true,
      count: complaints.length,
      complaints
    });
  }

  // ==========================================================================
  // API ROUTE 2: POST /api/complaints/upload-temporary-image
  // ==========================================================================
  if (pathname === '/api/complaints/upload-temporary-image' && method === 'POST') {
    try {
      const user = getAuthenticatedUser(req);
      const body = await parseRequestBody(req);

      if (!body.imageBase64) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Missing imageBase64 data in payload.'
        });
      }

      // Parse data URL or raw base64
      let rawBase64 = body.imageBase64;
      let claimedMime = body.mimeType || 'image/jpeg';
      if (rawBase64.includes(';base64,')) {
        const parts = rawBase64.split(';base64,');
        claimedMime = parts[0].replace('data:', '');
        rawBase64 = parts[1];
      }

      const buffer = Buffer.from(rawBase64, 'base64');
      const saved = storageService.saveTemporaryImage({
        buffer,
        mimeType: claimedMime,
        userId: user.userId
      });

      return sendJSON(res, 200, {
        success: true,
        imageId: saved.imageId,
        imageHash: saved.imageHash,
        sizeBytes: saved.sizeBytes,
        message: 'Image uploaded to private temporary storage.'
      });
    } catch (err) {
      return sendJSON(res, 500, {
        success: false,
        error: err.message
      });
    }
  }

  // ==========================================================================
  // API ROUTE 3: POST /api/complaints/validate-image
  // ==========================================================================
  if (pathname === '/api/complaints/validate-image' && method === 'POST') {
    // Check Rate Limit
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return sendJSON(res, 429, {
        accepted: false,
        status: 'rejected',
        reasonCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many image validation requests. Please wait a minute and try again.'
      });
    }

    try {
      const user = getAuthenticatedUser(req);
      const body = await parseRequestBody(req);

      if (!body.selectedCategory || !body.imageId) {
        return sendJSON(res, 400, {
          accepted: false,
          status: 'rejected',
          reasonCode: 'INVALID_REQUEST',
          message: 'Both selectedCategory and imageId are required.'
        });
      }

      // Execute AI validation flow
      const result = await validationEngine.validateImage({
        selectedCategory: body.selectedCategory,
        imageId: body.imageId,
        userId: user.userId,
        metadata: {
          mockScenario: body.mockScenario
        }
      });

      return sendJSON(res, 200, result);
    } catch (err) {
      if (err.statusCode === 503 || err.code === 'PROVIDER_UNCONFIGURED') {
        return sendJSON(res, 503, {
          accepted: false,
          status: 'rejected',
          code: 'PROVIDER_UNCONFIGURED',
          reasonCode: 'PROVIDER_UNCONFIGURED',
          message: 'AI Image-Validation is temporarily unavailable due to server configuration. Complaint submission is paused.',
          suggestion: 'Please contact municipal administrator or try again later.'
        });
      }

      return sendJSON(res, 500, {
        accepted: false,
        status: 'rejected',
        reasonCode: 'SERVER_ERROR',
        message: 'An internal error occurred during image validation.',
        suggestion: 'Please try again in a few moments.'
      });
    }
  }

  // ==========================================================================
  // API ROUTE 4: POST /api/complaints (Final Complaint Protection)
  // ==========================================================================
  if (pathname === '/api/complaints' && method === 'POST') {
    try {
      const user = getAuthenticatedUser(req);
      const body = await parseRequestBody(req);

      // Check 1: User authentication & permissions
      if (!user || !user.userId) {
        return sendJSON(res, 401, { success: false, code: 'AUTH_REQUIRED', error: 'Authentication required to file complaints.' });
      }

      // Check 2: Mandatory complaint fields
      if (!body.title || !body.category) {
        return sendJSON(res, 400, { success: false, code: 'MISSING_FIELDS', error: 'Missing required complaint fields (title, category).' });
      }

      // Check 3: Geofence validation (Kopargaon boundary check)
      const targetCity = body.city || config.PRIMARY_CITY.name;
      const geofenceResult = validateGeofence(body.coordinates, targetCity);
      if (!geofenceResult.valid) {
        return sendJSON(res, 400, {
          success: false,
          code: 'GEOFENCE_VIOLATION',
          error: geofenceResult.reason
        });
      }

      // Check 4: Ward jurisdiction check
      if (user.role === 'citizen' && user.ward && body.ward && user.ward !== body.ward) {
        // If user is locked to a specific ward and attempts to file in an unauthorized ward
        return sendJSON(res, 400, {
          success: false,
          code: 'UNAUTHORIZED_WARD',
          error: `You are registered in ${user.ward}. You cannot report complaints for ${body.ward}.`
        });
      }

      // Check 5 & 6: Validation Record Exists
      if (!body.validationId || !body.imageId) {
        return sendJSON(res, 400, {
          success: false,
          code: 'VALIDATION_REQUIRED',
          error: 'Missing AI image validation. Every complaint requires an approved image validation record.'
        });
      }

      const validation = db.getValidationById(body.validationId);
      if (!validation) {
        return sendJSON(res, 404, {
          success: false,
          code: 'VALIDATION_NOT_FOUND',
          error: 'The provided image validation record was not found.'
        });
      }

      // Check 7: Validation belongs to authenticated user
      if (validation.userId !== user.userId) {
        return sendJSON(res, 403, {
          success: false,
          code: 'FORBIDDEN_USER',
          error: 'Security violation: Image validation belongs to another user.'
        });
      }

      // Check 8: Validation status MUST be 'approved'
      if (validation.status !== 'approved') {
        return sendJSON(res, 400, {
          success: false,
          code: 'VALIDATION_NOT_APPROVED',
          error: `Image validation status is "${validation.status}". Only approved images can be submitted.`
        });
      }

      // Check 9: Validation has not expired
      const nowTime = Date.now();
      const expiresTime = new Date(validation.expiresAt).getTime();
      if (nowTime > expiresTime) {
        return sendJSON(res, 400, {
          success: false,
          code: 'VALIDATION_EXPIRED',
          error: 'Image validation has expired. Please re-validate the photo before submitting.'
        });
      }

      // Check 10: Submitted image ID matches validated image ID
      if (validation.imageId !== body.imageId) {
        return sendJSON(res, 400, {
          success: false,
          code: 'IMAGE_MISMATCH',
          error: 'The submitted image ID does not match the validated image ID.'
        });
      }

      // Check 11: Image hash unchanged
      if (body.imageHash && validation.imageHash !== body.imageHash) {
        return sendJSON(res, 400, {
          success: false,
          code: 'IMAGE_HASH_MISMATCH',
          error: 'Security violation: The image content was modified after validation.'
        });
      }

      // Check 12: Category unchanged after validation
      const submittedCatCanonical = normalizeCategory(body.category);
      if (submittedCatCanonical !== validation.selectedCategory) {
        return sendJSON(res, 400, {
          success: false,
          code: 'CATEGORY_CHANGED',
          error: `Category was changed after validation (validated for "${validation.selectedCategory}", but submitted "${submittedCatCanonical}"). Please re-validate.`
        });
      }

      // All 13 Checks Passed: Create Complaint & Promote Image
      const complaintId = `CC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
      const permanentImageUrl = storageService.promoteToComplaintStorage(body.imageId, complaintId);

      const complaintRecord = {
        id: complaintId,
        title: body.title,
        category: submittedCatCanonical,
        categoryDisplay: body.category,
        description: body.description,
        location: body.location || 'Kopargaon',
        coordinates: body.coordinates,
        ward: body.ward || user.ward,
        city: targetCity,
        reportedByUserId: user.userId,
        reportedByName: user.name,
        reportedAt: new Date().toISOString(),
        dateFormatted: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: 'Submitted',
        priority: body.priority || 'High',
        supports: 1,
        validationId: validation.validationId,
        image: permanentImageUrl,
        slaRemaining: 'SLA Deadline: 2 days remaining',
        isOverdue: false,
        timeline: [
          {
            title: 'Complaint Submitted',
            time: 'Just now',
            status: 'completed',
            note: 'Verified with AI Vision & Geotag evidence.'
          },
          {
            title: 'Reviewed by Nagarsevak',
            time: 'Pending',
            status: 'upcoming',
            note: 'Assigned to Ward Corporator triage.'
          },
          {
            title: 'Approved & Department Dispatched',
            time: 'Pending',
            status: 'upcoming',
            note: 'Pending municipal department dispatch.'
          },
          {
            title: 'Work Started',
            time: 'Pending',
            status: 'upcoming',
            note: 'Contractor crew repair work.'
          },
          {
            title: 'Resolved & Citizen Verified',
            time: 'Pending',
            status: 'upcoming',
            note: 'After-repair photo proof pending citizen sign-off.'
          }
        ]
      };

      db.saveComplaint(complaintRecord);

      return sendJSON(res, 201, {
        success: true,
        complaintId,
        complaint: complaintRecord,
        message: 'Complaint created and routed successfully to local Nagarsevak.'
      });
    } catch (err) {
      return sendJSON(res, 500, {
        success: false,
        error: err.message
      });
    }
  }

  // ==========================================================================
  // API ROUTE 5: GET /api/admin/validations (Admin Moderation)
  // ==========================================================================
  if (pathname === '/api/admin/validations' && method === 'GET') {
    const user = getAuthenticatedUser(req);
    if (user.role !== 'admin' && !req.headers['x-admin-key']) {
      return sendJSON(res, 403, { success: false, error: 'Administrator access required.' });
    }

    const status = parsedUrl.searchParams.get('status');
    const category = parsedUrl.searchParams.get('category');
    const validations = db.listValidations({ status, category });
    return sendJSON(res, 200, { success: true, count: validations.length, validations });
  }

  // ==========================================================================
  // API ROUTE 6: POST /api/admin/validations/:id/action (Admin Moderation Decision)
  // ==========================================================================
  if (pathname.startsWith('/api/admin/validations/') && pathname.endsWith('/action') && method === 'POST') {
    const user = getAuthenticatedUser(req);
    if (user.role !== 'admin' && !req.headers['x-admin-key']) {
      return sendJSON(res, 403, { success: false, error: 'Administrator access required.' });
    }

    const validationId = pathname.replace('/api/admin/validations/', '').replace('/action', '');
    const body = await parseRequestBody(req);
    const validation = db.getValidationById(validationId);

    if (!validation) {
      return sendJSON(res, 404, { success: false, error: 'Validation not found.' });
    }

    const validActions = ['approve', 'reject', 'recategorize', 'request_photo'];
    if (!validActions.includes(body.action)) {
      return sendJSON(res, 400, { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }

    let newStatus = validation.status;
    let newCategory = validation.selectedCategory;

    if (body.action === 'approve') {
      newStatus = 'approved';
    } else if (body.action === 'reject') {
      newStatus = 'rejected';
    } else if (body.action === 'recategorize') {
      if (!body.newCategory) {
        return sendJSON(res, 400, { success: false, error: 'newCategory is required for recategorize action.' });
      }
      newCategory = normalizeCategory(body.newCategory);
      newStatus = 'approved'; // Approved under corrected category
    }

    const updated = db.updateValidationStatus(validationId, {
      status: newStatus,
      selectedCategory: newCategory,
      adminReview: {
        adminUserId: user.userId,
        action: body.action,
        reason: body.reason || 'Admin manual review action',
        reviewedAt: new Date().toISOString()
      }
    });

    db.logModerationAction({
      validationId,
      adminUserId: user.userId,
      action: body.action,
      previousStatus: validation.status,
      newStatus,
      reason: body.reason || 'Manual review override'
    });

    return sendJSON(res, 200, {
      success: true,
      message: `Validation ${validationId} updated to ${newStatus}.`,
      validation: updated
    });
  }

  // ==========================================================================
  // API ROUTE 7: GET /api/storage/complaints/:fileName (Serve Promoted Image)
  // ==========================================================================
  if (pathname.startsWith('/api/storage/complaints/') && method === 'GET') {
    const fileName = pathname.replace('/api/storage/complaints/', '');
    try {
      const filePath = storageService.resolveSecurePath(config.STORAGE_COMPLAINT_DIR, fileName);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'image/jpeg' });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (e) {}
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Complaint image not found');
    return;
  }

  // ==========================================================================
  // STATIC FILES SERVING (index.html, citizen.html, CSS, JS, Assets)
  // ==========================================================================
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'index.html');
  } else if (pathname === '/citizen' || pathname.startsWith('/citizen/')) {
    filePath = path.join(__dirname, 'citizen.html');
  } else {
    filePath = path.join(__dirname, pathname);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`CivicConnect server live at http://localhost:${PORT}`);
  console.log(`AI Vision validation provider: "${validationEngine.activeProviderName}"`);
});

module.exports = server;
