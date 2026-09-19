// CivicConnect - Secure Private Storage Service
// Handles temporary upload storage, SHA-256 cryptographic hashing, path traversal protection, and cleanup

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

class StorageService {
  constructor() {
    this.tempDir = config.STORAGE_TEMP_DIR;
    this.complaintDir = config.STORAGE_COMPLAINT_DIR;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    if (!fs.existsSync(this.complaintDir)) {
      fs.mkdirSync(this.complaintDir, { recursive: true });
    }
  }

  /**
   * Compute SHA-256 hash of image buffer
   * @param {Buffer} buffer
   * @returns {string} Hex SHA-256 hash
   */
  computeHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate secure imageId
   */
  generateImageId() {
    return `IMG-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  }

  /**
   * Resolve secure path inside directory preventing path traversal
   * @param {string} baseDir
   * @param {string} fileName
   * @returns {string}
   */
  resolveSecurePath(baseDir, fileName) {
    // Strip illegal characters and directory traversal markers
    const sanitized = path.basename(fileName).replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const targetPath = path.resolve(baseDir, sanitized);
    if (!targetPath.startsWith(path.resolve(baseDir))) {
      throw new Error('Access denied: Path traversal attempt detected');
    }
    return targetPath;
  }

  /**
   * Save temporary image payload
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.mimeType
   * @param {string} params.userId
   * @returns {{ imageId: string, imageHash: string, filePath: string, sizeBytes: number, createdAt: number }}
   */
  saveTemporaryImage({ buffer, mimeType, userId }) {
    this.ensureDirectories();
    const imageId = this.generateImageId();
    const ext = mimeType === 'image/png' ? '.png' : (mimeType === 'image/webp' ? '.webp' : '.jpg');
    const fileName = `${imageId}${ext}`;
    const filePath = this.resolveSecurePath(this.tempDir, fileName);

    fs.writeFileSync(filePath, buffer);
    const hash = this.computeHash(buffer);

    // Also write small JSON metadata alongside for private ownership tracking
    const metaPath = `${filePath}.meta.json`;
    const meta = {
      imageId,
      userId,
      mimeType,
      imageHash: hash,
      sizeBytes: buffer.length,
      createdAt: Date.now(),
      fileName
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    return {
      imageId,
      imageHash: hash,
      filePath,
      sizeBytes: buffer.length,
      createdAt: meta.createdAt
    };
  }

  /**
   * Read temporary image and verify ownership
   * @param {string} imageId
   * @param {string} [userId]
   * @returns {{ buffer: Buffer, meta: Object, filePath: string }}
   */
  getTemporaryImage(imageId, userId = null) {
    this.ensureDirectories();
    // Search for matching file with any allowed extension
    const files = fs.readdirSync(this.tempDir);
    const matchingFile = files.find(f => f.startsWith(imageId) && !f.endsWith('.meta.json'));

    if (!matchingFile) {
      const err = new Error(`Image "${imageId}" not found or has expired`);
      err.code = 'IMAGE_NOT_FOUND';
      throw err;
    }

    const filePath = this.resolveSecurePath(this.tempDir, matchingFile);
    const metaPath = `${filePath}.meta.json`;

    let meta = null;
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {}
    }

    // Ownership check
    if (userId && meta && meta.userId && meta.userId !== userId) {
      const err = new Error('Access denied: Image belongs to another user');
      err.code = 'FORBIDDEN_IMAGE_ACCESS';
      throw err;
    }

    const buffer = fs.readFileSync(filePath);
    return { buffer, meta, filePath };
  }

  /**
   * Move temporary image to permanent complaint storage
   * @param {string} imageId
   * @param {string} complaintId
   * @returns {string} Permanent file relative or absolute path
   */
  promoteToComplaintStorage(imageId, complaintId) {
    const { buffer, meta, filePath } = this.getTemporaryImage(imageId);
    const ext = path.extname(filePath);
    const permFileName = `${complaintId}_${imageId}${ext}`;
    const permPath = this.resolveSecurePath(this.complaintDir, permFileName);

    fs.writeFileSync(permPath, buffer);

    // Save metadata in complaint storage
    const permMeta = Object.assign({}, meta, { complaintId, promotedAt: Date.now() });
    fs.writeFileSync(`${permPath}.meta.json`, JSON.stringify(permMeta, null, 2));

    // Sync to Supabase Storage bucket if configured
    try {
      const supabaseClient = require('../supabaseClient');
      if (supabaseClient.isConfigured) {
        supabaseClient.uploadStorageFile(permFileName, buffer, meta.mimeType || 'image/jpeg')
          .then(publicUrl => {
            if (publicUrl) {
              permMeta.supabaseUrl = publicUrl;
              fs.writeFileSync(`${permPath}.meta.json`, JSON.stringify(permMeta, null, 2));
            }
          })
          .catch(err => console.warn('[Supabase Storage Sync] Warning:', err.message));
      }
    } catch (_) {}

    // Cleanup temp
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const metaPath = `${filePath}.meta.json`;
      if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    } catch (e) {}

    return `/api/storage/complaints/${permFileName}`;
  }

  /**
   * Delete temporary image on rejection or cleanup
   * @param {string} imageId
   */
  deleteTemporaryImage(imageId) {
    try {
      const files = fs.readdirSync(this.tempDir);
      files.forEach(f => {
        if (f.startsWith(imageId)) {
          const p = path.join(this.tempDir, f);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      });
    } catch (e) {}
  }

  /**
   * Clean up expired temporary images (> config.VISION_VALIDATION_EXPIRY_MINUTES)
   */
  cleanupExpiredImages() {
    try {
      this.ensureDirectories();
      const expiryMs = config.VISION_VALIDATION_EXPIRY_MINUTES * 60 * 1000;
      const now = Date.now();
      const files = fs.readdirSync(this.tempDir);

      files.forEach(file => {
        if (file.endsWith('.meta.json')) {
          const metaPath = path.join(this.tempDir, file);
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            if (now - (meta.createdAt || 0) > expiryMs) {
              const baseName = file.replace('.meta.json', '');
              const imagePath = path.join(this.tempDir, baseName);
              if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
              fs.unlinkSync(metaPath);
            }
          } catch (e) {}
        }
      });
    } catch (err) {
      console.warn('Temporary image cleanup warning:', err.message);
    }
  }
}

module.exports = new StorageService();
