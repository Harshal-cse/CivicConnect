// CivicConnect - Comprehensive AI Image-Validation Test Suite
// Verifies all 20 test scenarios specified in requirements

const assert = require('assert');
const http = require('http');
const db = require('../backend/database');

const BASE_URL = 'http://localhost:3000';

// Helper to create synthetic test PNG buffers
function createSyntheticPng(fillFn, size = 16384) {
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x02, 0x80, // 640
    0x00, 0x00, 0x01, 0xE0, // 480
    0x08, 0x02, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);
  const payload = Buffer.alloc(size);
  for (let i = 0; i < payload.length; i++) payload[i] = fillFn(i);
  return Buffer.concat([header, payload]);
}

// HTTP request helper
async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Helper to upload temporary image
async function uploadTempImage(buffer, mime = 'image/png', userId = 'CITIZEN-001') {
  const base64 = buffer.toString('base64');
  const res = await request('/api/complaints/upload-temporary-image', {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: { imageBase64: base64, mimeType: mime }
  });
  return res.data;
}

const colors = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`
};

let passedCount = 0;
let failedCount = 0;

async function runScenario(id, title, testFn) {
  try {
    await testFn();
    passedCount++;
    console.log(`  ${colors.green('✓')} ${colors.bold(`Test ${id}`)}: ${title}`);
  } catch (err) {
    failedCount++;
    console.log(`  ${colors.red('✗')} ${colors.bold(`Test ${id}`)}: ${title}`);
    console.error(`    ${colors.red('Error:')} ${err.message}`);
  }
}

async function runTestSuite() {
  console.log(colors.cyan('\n======================================================================'));
  console.log(colors.bold(' CivicConnect AI Image-Validation & Security Test Suite'));
  console.log(colors.cyan('======================================================================\n'));

  const validPng = createSyntheticPng(i => ((i * 37) % 200) + 30);
  const darkPng = createSyntheticPng(i => (i % 5) + 2);
  const blankPng = createSyntheticPng(i => 128);
  const blurryPng = createSyntheticPng(i => Math.floor(100 + (i / 16384) * 40));

  // Scenario 1: Pothole selected as road_damage -> approved (>=0.80) -> submit succeeds
  await runScenario(1, 'Pothole selected as "Damaged Roads" -> approved (≥0.80) -> submit complaint succeeds', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    assert(up.success, 'Upload failed');

    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    assert.strictEqual(val.status, 200);
    assert.strictEqual(val.data.status, 'approved');
    assert.strictEqual(val.data.accepted, true);
    assert(val.data.confidence >= 0.80, `Expected confidence >= 0.80, got ${val.data.confidence}`);

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Deep pothole on Shivaji Road',
        category: 'road_damage',
        description: '2ft wide pothole near market square',
        location: 'Shivaji Chowk, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 201);
    assert.strictEqual(comp.data.success, true);
    assert(comp.data.complaintId.startsWith('CC-'), 'Expected CC- complaint ID');
  });

  // Scenario 2: Garbage selected as road_damage -> rejected with CATEGORY_MISMATCH
  await runScenario(2, 'Garbage image selected as "Damaged Roads" -> rejected with CATEGORY_MISMATCH', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'garbage_clear' }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.accepted, false);
    assert.strictEqual(val.data.reasonCode, 'CATEGORY_MISMATCH');
  });

  // Scenario 3: Streetlight selected as road_damage -> rejected, suggests broken_streetlight
  await runScenario(3, 'Streetlight selected as "Damaged Roads" -> rejected, suggests "Broken Streetlights"', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'streetlight_clear' }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.predictedCategory, 'broken_streetlight');
  });

  // Scenario 4: Garbage selected as garbage_overflow -> approved -> submit succeeds
  await runScenario(4, 'Garbage selected as "Overflowing Garbage" -> approved -> submit succeeds', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'garbage_overflow', imageId: up.imageId, mockScenario: 'garbage_clear' }
    });

    assert.strictEqual(val.data.status, 'approved');
    assert.strictEqual(val.data.accepted, true);

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Overflowing dump bin near market',
        category: 'garbage_overflow',
        description: 'Bins overflowing for two days',
        location: 'Vegetable Market, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8870, lng: 74.4795 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 201);
  });

  // Scenario 5: Normal road selected as road_damage -> manual_review (capped <= 0.68)
  await runScenario(5, 'Normal road without defects selected as "Damaged Roads" -> manual_review (confidence capped at 0.68)', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'normal_road' }
    });

    assert.strictEqual(val.data.status, 'manual_review');
    assert(val.data.confidence <= 0.68, `Expected confidence <= 0.68, got ${val.data.confidence}`);

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Smooth road reported',
        category: 'road_damage',
        description: 'Road without potholes',
        location: 'Kopargaon Bypass',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'VALIDATION_NOT_APPROVED');
  });

  // Scenario 6: Blurry image -> rejected with IMAGE_BLURRY
  await runScenario(6, 'Blurry image -> rejected with IMAGE_BLURRY, prompt citizen to retake', async () => {
    const up = await uploadTempImage(blurryPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.reasonCode, 'IMAGE_BLURRY');
  });

  // Scenario 7: Completely dark image -> rejected with IMAGE_TOO_DARK
  await runScenario(7, 'Completely dark image -> rejected with IMAGE_TOO_DARK', async () => {
    const up = await uploadTempImage(darkPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.reasonCode, 'IMAGE_TOO_DARK');
  });

  // Scenario 8: Blank / uniform image -> rejected with IMAGE_BLANK
  await runScenario(8, 'Blank / uniform image -> rejected with IMAGE_BLANK', async () => {
    const up = await uploadTempImage(blankPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.reasonCode, 'IMAGE_BLANK');
  });

  // Scenario 9: Unsupported format (.txt) -> rejected with UNSUPPORTED_FORMAT
  await runScenario(9, 'Unsupported file format (.txt / text payload) -> rejected with UNSUPPORTED_FORMAT', async () => {
    const textBuffer = Buffer.from('Plain text file content simulating unsupported document format.');
    const up = await uploadTempImage(textBuffer, 'text/plain', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.reasonCode, 'UNSUPPORTED_FORMAT');
  });

  // Scenario 10: Corrupted image buffer -> rejected with FILE_CORRUPTED
  await runScenario(10, 'Corrupted image buffer -> decode fails -> rejected with FILE_CORRUPTED', async () => {
    const corruptBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48]);
    const up = await uploadTempImage(corruptBuffer, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.reasonCode, 'FILE_CORRUPTED');
  });

  // Scenario 11: Unsafe image -> rejected with UNSAFE_CONTENT
  await runScenario(11, 'Unsafe image (SafeSearch flagged adult/violence) -> rejected immediately', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'unsafe_content' }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert(val.data.reasonCode === 'UNSAFE_CONTENT' || val.data.reasonCode === 'UNSAFE_CONTENT_FLAGGED', 'Expected UNSAFE_CONTENT');
  });

  // Scenario 12: Missing credentials -> safe 503 error, server survives
  await runScenario(12, 'Missing Google credentials -> handled gracefully with 503 error, server does not crash', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'simulate_credentials_error' }
    });

    assert.strictEqual(val.status, 503);
    assert.strictEqual(val.data.code || val.data.reasonCode, 'PROVIDER_UNCONFIGURED');

    const health = await request('/api/health');
    assert.strictEqual(health.status, 200);
  });

  // Scenario 13: Expired validation token (>30 min) -> rejected with VALIDATION_EXPIRED
  await runScenario(13, 'Expired validation token (>30 min) -> final complaint submission fails with VALIDATION_EXPIRED', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    const rec = db.getValidationById(val.data.validationId);
    rec.expiresAt = new Date(Date.now() - 60000).toISOString();
    db.saveValidation(rec);

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Road issue with expired token',
        category: 'road_damage',
        description: 'Pothole issue with expired token',
        location: 'Shivaji Chowk, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'VALIDATION_EXPIRED');
  });

  // Scenario 14: Tampered hash -> rejected with IMAGE_HASH_MISMATCH
  await runScenario(14, 'Validated image replaced with different image (hash mismatch) -> rejected with IMAGE_HASH_MISMATCH', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Tampered image submission',
        category: 'road_damage',
        description: 'Tampered hash test',
        location: 'Shivaji Chowk, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: '0000000000000000000000000000000000000000000000000000000000000000',
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'IMAGE_HASH_MISMATCH');
  });

  // Scenario 15: Category changed after validation -> rejected with CATEGORY_CHANGED
  await runScenario(15, 'Validated for "Damaged Roads", but citizen submits with "Water Leakage" -> rejected with CATEGORY_CHANGED', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Category swapped after check',
        category: 'water_leakage',
        description: 'Swapped category test',
        location: 'Shivaji Chowk, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'CATEGORY_CHANGED');
  });

  // Scenario 16: Different citizen attempts reuse -> 403 FORBIDDEN_USER
  await runScenario(16, 'Validation token belonging to Citizen A used by Citizen B -> rejected with 403 FORBIDDEN_USER', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-AARAV');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-AARAV' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-IMPOSTOR' },
      body: {
        title: 'Hijacked token attempt',
        category: 'road_damage',
        description: 'Different user token reuse test',
        location: 'Shivaji Chowk, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 403);
    assert.strictEqual(comp.data.code, 'FORBIDDEN_USER');
  });

  // Scenario 17: Direct submission without validation ID -> 400 VALIDATION_REQUIRED
  await runScenario(17, 'Direct submission without validation ID -> rejected with 400 VALIDATION_REQUIRED', async () => {
    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Bypass validation attempt',
        category: 'road_damage',
        description: 'Direct submission without validation',
        location: 'Shivaji Chowk, Kopargaon',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 }
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'VALIDATION_REQUIRED');
  });

  // Scenario 18: Coordinates outside Kopargaon geofence -> GEOFENCE_VIOLATION
  await runScenario(18, 'Coordinates outside Kopargaon geofence -> rejected with GEOFENCE_VIOLATION', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: {
        title: 'Geofence breach test',
        category: 'road_damage',
        description: 'Reporting from New Delhi',
        location: 'Out of town',
        ward: 'Ward 1 - Shivaji Chowk',
        city: 'Kopargaon',
        coordinates: { lat: 28.6139, lng: 77.2090 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'GEOFENCE_VIOLATION');
  });

  // Scenario 19: Citizen submitting to unauthorized ward -> UNAUTHORIZED_WARD
  await runScenario(19, 'Citizen submitting to unauthorized or invalid ward -> rejected with UNAUTHORIZED_WARD', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'pothole_clear' }
    });

    const comp = await request('/api/complaints', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001', 'x-user-ward': 'Ward 1 - Shivaji Chowk' },
      body: {
        title: 'Unauthorized ward complaint',
        category: 'road_damage',
        description: 'Filing in Ward 99 when registered in Ward 1',
        location: 'Far Away Ward',
        ward: 'Ward 99 - Outland Sector',
        city: 'Kopargaon',
        coordinates: { lat: 19.8864, lng: 74.4789 },
        imageId: up.imageId,
        imageHash: up.imageHash,
        validationId: val.data.validationId
      }
    });

    assert.strictEqual(comp.status, 400);
    assert.strictEqual(comp.data.code, 'UNAUTHORIZED_WARD');
  });

  // Scenario 20: Vision API timeout simulation -> rejected with VISION_TIMEOUT, never approved
  await runScenario(20, 'Vision API timeout simulation -> rejected with VISION_TIMEOUT, never automatically approved', async () => {
    const up = await uploadTempImage(validPng, 'image/png', 'CITIZEN-001');
    const val = await request('/api/complaints/validate-image', {
      method: 'POST',
      headers: { 'x-user-id': 'CITIZEN-001' },
      body: { selectedCategory: 'road_damage', imageId: up.imageId, mockScenario: 'simulate_timeout' }
    });

    assert.strictEqual(val.data.status, 'rejected');
    assert.strictEqual(val.data.accepted, false);
    assert.strictEqual(val.data.reasonCode, 'VISION_TIMEOUT');
  });

  console.log(colors.cyan('\n----------------------------------------------------------------------'));
  console.log(colors.bold(` Test Results: ${colors.green(`${passedCount} Passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} Failed`) : '0 Failed'} (Total: 20 Scenarios)`));
  console.log(colors.cyan('----------------------------------------------------------------------\n'));

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
