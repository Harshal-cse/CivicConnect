// CivicConnect - Google Cloud Vision API Provider
// Performs Label Detection & SafeSearch Detection securely on the backend only

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const ImageClassifierProvider = require('./providerInterface');
const config = require('../config');

class GoogleVisionProvider extends ImageClassifierProvider {
  constructor() {
    super('google_cloud_vision');
    this.modelVersion = 'builtin-v1';
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Check if credentials file exists and is readable
   */
  hasCredentials() {
    if (!config.GOOGLE_APPLICATION_CREDENTIALS) return false;
    const resolvedPath = path.resolve(process.cwd(), config.GOOGLE_APPLICATION_CREDENTIALS);
    return fs.existsSync(resolvedPath);
  }

  /**
   * Read credentials JSON securely
   */
  getCredentials() {
    if (!this.hasCredentials()) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured or file not found');
    }
    const resolvedPath = path.resolve(process.cwd(), config.GOOGLE_APPLICATION_CREDENTIALS);
    try {
      const data = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      throw new Error(`Failed to parse Google Cloud credentials: ${err.message}`);
    }
  }

  /**
   * Generate an OAuth2 access token for Google Cloud APIs using service account JWT
   */
  async getAccessToken() {
    // If cached token valid for at least 5 more minutes, reuse
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 300000) {
      return this.cachedAccessToken;
    }

    const creds = this.getCredentials();
    const now = Math.floor(Date.now() / 1000);

    // Standard Google Service Account JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-vision',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Claim = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
    const signatureInput = `${b64Header}.${b64Claim}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(creds.private_key, 'base64url');
    const jwt = `${signatureInput}.${signature}`;

    const postBody = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString();

    return new Promise((resolve, reject) => {
      const req = https.request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postBody)
        },
        timeout: config.VISION_REQUEST_TIMEOUT_MS
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.access_token) {
              this.cachedAccessToken = parsed.access_token;
              this.tokenExpiresAt = Date.now() + (parsed.expires_in || 3600) * 1000;
              resolve(this.cachedAccessToken);
            } else {
              reject(new Error(`Google token error: ${parsed.error_description || raw}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON token response: ${raw}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google Auth Token request timed out'));
      });

      req.write(postBody);
      req.end();
    });
  }

  /**
   * Execute Google Cloud Vision annotate request
   * @param {Object} params
   * @param {Buffer} params.imageBuffer
   */
  async classify({ imageBuffer }) {
    if (!this.hasCredentials()) {
      const err = new Error('Google Cloud Vision credentials are not configured on this server');
      err.code = 'PROVIDER_UNCONFIGURED';
      throw err;
    }

    const token = await this.getAccessToken();
    const base64Image = imageBuffer.toString('base64');

    const requestPayload = JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 25 },
            { type: 'SAFE_SEARCH_DETECTION' }
          ]
        }
      ]
    });

    return new Promise((resolve, reject) => {
      const req = https.request('https://vision.googleapis.com/v1/images:annotate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestPayload)
        },
        timeout: config.VISION_REQUEST_TIMEOUT_MS
      }, (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            const err = new Error(`Google Cloud Vision API returned HTTP ${res.statusCode}: ${raw}`);
            err.code = 'VISION_API_ERROR';
            return reject(err);
          }

          try {
            const data = JSON.parse(raw);
            const responseItem = data.requests ? data.requests[0] : (data.responses ? data.responses[0] : null);

            if (!responseItem) {
              return reject(new Error('Empty response from Google Cloud Vision'));
            }

            if (responseItem.error) {
              const err = new Error(`Vision Error: ${responseItem.error.message}`);
              err.code = 'VISION_API_ERROR';
              return reject(err);
            }

            // Normalize Labels
            const rawLabels = responseItem.labelAnnotations || [];
            const normalizedLabels = rawLabels.map(l => ({
              name: l.description.toLowerCase().trim(),
              score: Math.round((l.score || 0) * 100) / 100,
              topicality: Math.round((l.topicality || 0) * 100) / 100
            }));

            // Normalize SafeSearch
            const ss = responseItem.safeSearchAnnotation || {};
            const safeSearch = {
              adult: ss.adult || 'UNKNOWN',
              spoof: ss.spoof || 'UNKNOWN',
              medical: ss.medical || 'UNKNOWN',
              violence: ss.violence || 'UNKNOWN',
              racy: ss.racy || 'UNKNOWN'
            };

            resolve({
              labels: normalizedLabels,
              safeSearch: safeSearch,
              provider: 'google_cloud_vision',
              modelVersion: this.modelVersion
            });
          } catch (parseErr) {
            reject(new Error(`Failed to parse Vision API response: ${parseErr.message}`));
          }
        });
      });

      req.on('error', err => {
        const wrapErr = new Error(`Google Vision request failed: ${err.message}`);
        wrapErr.code = 'NETWORK_ERROR';
        reject(wrapErr);
      });

      req.on('timeout', () => {
        req.destroy();
        const timeoutErr = new Error(`Google Vision request timed out after ${config.VISION_REQUEST_TIMEOUT_MS}ms`);
        timeoutErr.code = 'VISION_TIMEOUT';
        reject(timeoutErr);
      });

      req.write(requestPayload);
      req.end();
    });
  }

  async healthCheck() {
    try {
      if (!this.hasCredentials()) {
        return { healthy: false, provider: this.name, message: 'Google Cloud Vision credentials missing' };
      }
      await this.getAccessToken();
      return { healthy: true, provider: this.name, message: 'Google Cloud Vision connected and authorized' };
    } catch (err) {
      return { healthy: false, provider: this.name, message: err.message };
    }
  }
}

module.exports = GoogleVisionProvider;
