// CivicConnect - Image Quality & Integrity Analysis Service
// Inspects magic bytes, dimensions, corruption, blur, darkness, and blankness

const config = require('../config');

class ImageQualityService {
  /**
   * Detect real MIME type from binary magic bytes
   * @param {Buffer} buffer
   * @returns {string|null} 'image/jpeg', 'image/png', 'image/webp' or null
   */
  detectMimeType(buffer) {
    if (!buffer || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
    ) {
      return 'image/png';
    }

    // WebP: 'RIFF' .... 'WEBP'
    if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  }

  /**
   * Extract image dimensions directly from binary header without external native libraries
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @returns {{ width: number, height: number }|null}
   */
  extractDimensions(buffer, mimeType) {
    try {
      if (mimeType === 'image/png') {
        // IHDR chunk: width at offset 16 (4 bytes BE), height at offset 20 (4 bytes BE)
        if (buffer.length >= 24) {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return { width, height };
        }
      } else if (mimeType === 'image/jpeg') {
        // Scan markers for SOF0 (0xFFC0) or SOF2 (0xFFC2)
        let offset = 2;
        while (offset < buffer.length - 8) {
          if (buffer[offset] !== 0xFF) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          // SOF0 (baseline), SOF1 (extended), SOF2 (progressive)
          if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
            const height = buffer.readUInt16BE(offset + 5);
            const width = buffer.readUInt16BE(offset + 7);
            return { width, height };
          }
          // Skip segment
          const segmentLength = buffer.readUInt16BE(offset + 2);
          offset += 2 + segmentLength;
        }
      } else if (mimeType === 'image/webp') {
        // VP8 (simple lossy)
        if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
          if (buffer.length >= 30) {
            const width = buffer.readUInt16LE(26) & 0x3fff;
            const height = buffer.readUInt16LE(28) & 0x3fff;
            return { width, height };
          }
        }
        // VP8L (lossless)
        if (buffer.toString('ascii', 12, 16) === 'VP8L') {
          if (buffer.length >= 25) {
            const b1 = buffer[21];
            const b2 = buffer[22];
            const b3 = buffer[23];
            const b4 = buffer[24];
            const width = 1 + (((b2 & 0x3f) << 8) | b1);
            const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
            return { width, height };
          }
        }
        // VP8X (extended)
        if (buffer.toString('ascii', 12, 16) === 'VP8X') {
          if (buffer.length >= 30) {
            const width = 1 + buffer.readUIntLE(24, 3);
            const height = 1 + buffer.readUIntLE(27, 3);
            return { width, height };
          }
        }
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  /**
   * Fast statistical analysis of pixel luminance distribution and edge contrast
   * @param {Buffer} buffer
   * @returns {{ isDark: boolean, isBlank: boolean, isBlurry: boolean, avgLuminance: number }}
   */
  analyzePixelStats(buffer) {
    // Sample bytes evenly across image payload, skipping header metadata
    const startOffset = Math.min(32, Math.floor(buffer.length / 4));
    const payloadLength = buffer.length - startOffset;
    const sampleSize = Math.min(payloadLength, 2048);
    const step = Math.max(1, Math.floor(payloadLength / sampleSize));
    let sum = 0;
    const samples = [];

    for (let i = startOffset; i < buffer.length && samples.length < sampleSize; i += step) {
      const val = buffer[i];
      samples.push(val);
      sum += val;
    }

    const avg = samples.length > 0 ? (sum / samples.length) : 0;

    // Calculate variance / standard deviation
    let varianceSum = 0;
    let diffSum = 0;
    for (let i = 0; i < samples.length; i++) {
      const diff = samples[i] - avg;
      varianceSum += diff * diff;
      if (i > 0) {
        diffSum += Math.abs(samples[i] - samples[i - 1]);
      }
    }
    const stdDev = samples.length > 0 ? Math.sqrt(varianceSum / samples.length) : 0;
    const edgeGradient = samples.length > 1 ? (diffSum / (samples.length - 1)) : 0;

    // Darkness threshold: avg luminance under ~16 (scale 0-255)
    const isDark = avg < 16;

    // Blankness threshold: standard deviation < 3.0 (uniform payload)
    const isBlank = stdDev < 3.0;

    // Blur heuristic: very low edge gradient across compressed image stream (< 4.5)
    // and moderate standard deviation
    const isBlurry = edgeGradient < 4.2 && !isBlank;

    return {
      isDark,
      isBlank,
      isBlurry,
      avgLuminance: Math.round(avg),
      stdDev: Math.round(stdDev * 10) / 10
    };
  }

  /**
   * Complete technical and quality audit of uploaded image buffer
   * @param {Buffer} buffer
   * @param {string} claimedMimeType
   * @param {number} declaredSize
   * @returns {{
   *   valid: boolean,
   *   error: string|null,
   *   reasonCode: string|null,
   *   suggestion: string|null,
   *   details: {
   *     mimeType: string,
   *     width: number,
   *     height: number,
   *     isDark: boolean,
   *     isBlank: boolean,
   *     isBlurry: boolean,
   *     isCorrupted: boolean
   *   }
   * }}
   */
  inspectImage(buffer, claimedMimeType = '', declaredSize = 0) {
    // 1. Check size limit
    const maxBytes = config.MAX_IMAGE_SIZE_MB * 1024 * 1024;
    if (!buffer || buffer.length === 0) {
      return {
        valid: false,
        error: 'Empty or missing image payload.',
        reasonCode: 'EMPTY_PAYLOAD',
        suggestion: 'Please capture or select a photo to upload.',
        details: null
      };
    }

    if (buffer.length > maxBytes) {
      return {
        valid: false,
        error: `Image size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed ${config.MAX_IMAGE_SIZE_MB}MB.`,
        reasonCode: 'FILE_TOO_LARGE',
        suggestion: `Please compress or resize the photo to under ${config.MAX_IMAGE_SIZE_MB}MB.`,
        details: null
      };
    }

    // 2. Real MIME Type Detection via magic bytes
    const realMime = this.detectMimeType(buffer);
    if (!realMime || !config.ALLOWED_MIME_TYPES.includes(realMime)) {
      return {
        valid: false,
        error: 'Unsupported file format. Only JPG, PNG, and WebP photos are accepted.',
        reasonCode: 'UNSUPPORTED_FORMAT',
        suggestion: 'Please upload a valid JPG, PNG, or WebP photo.',
        details: null
      };
    }

    // 3. Dimension Extraction & Corruption Check
    const dimensions = this.extractDimensions(buffer, realMime);
    if (!dimensions || !dimensions.width || !dimensions.height) {
      return {
        valid: false,
        error: 'Image file appears to be corrupted or incomplete.',
        reasonCode: 'FILE_CORRUPTED',
        suggestion: 'The image file could not be read. Please retake the photo and try again.',
        details: {
          mimeType: realMime,
          width: 0,
          height: 0,
          isDark: false,
          isBlank: false,
          isBlurry: false,
          isCorrupted: true
        }
      };
    }

    // 4. Minimum Resolution Check
    if (dimensions.width < config.MIN_IMAGE_WIDTH || dimensions.height < config.MIN_IMAGE_HEIGHT) {
      return {
        valid: false,
        error: `Photo resolution (${dimensions.width}x${dimensions.height}) is too small. Minimum required is ${config.MIN_IMAGE_WIDTH}x${config.MIN_IMAGE_HEIGHT}.`,
        reasonCode: 'IMAGE_TOO_SMALL',
        suggestion: 'Please take a higher resolution photo so the civic issue is clearly visible.',
        details: {
          mimeType: realMime,
          width: dimensions.width,
          height: dimensions.height,
          isDark: false,
          isBlank: false,
          isBlurry: false,
          isCorrupted: false
        }
      };
    }

    // 5. Statistical Quality Checks (Dark, Blank, Blurry)
    const stats = this.analyzePixelStats(buffer);

    if (stats.isDark) {
      return {
        valid: false,
        error: 'The photo is too dark. Please upload a brighter photo.',
        reasonCode: 'IMAGE_TOO_DARK',
        suggestion: 'Please turn on your camera flash or capture the photo in adequate street lighting.',
        details: {
          mimeType: realMime,
          width: dimensions.width,
          height: dimensions.height,
          isDark: true,
          isBlank: stats.isBlank,
          isBlurry: false,
          isCorrupted: false
        }
      };
    }

    if (stats.isBlank) {
      return {
        valid: false,
        error: 'The photo is completely blank or uniform.',
        reasonCode: 'IMAGE_BLANK',
        suggestion: 'Please capture a real photo of the civic problem on the street.',
        details: {
          mimeType: realMime,
          width: dimensions.width,
          height: dimensions.height,
          isDark: false,
          isBlank: true,
          isBlurry: false,
          isCorrupted: false
        }
      };
    }

    if (stats.isBlurry) {
      return {
        valid: false,
        error: 'The photo is too blurry to verify. Please take another photo while holding the phone steady.',
        reasonCode: 'IMAGE_BLURRY',
        suggestion: 'Please hold your device steady and tap to focus on the problem before snapping.',
        details: {
          mimeType: realMime,
          width: dimensions.width,
          height: dimensions.height,
          isDark: false,
          isBlank: false,
          isBlurry: true,
          isCorrupted: false
        }
      };
    }

    // Valid quality
    return {
      valid: true,
      error: null,
      reasonCode: null,
      suggestion: null,
      details: {
        mimeType: realMime,
        width: dimensions.width,
        height: dimensions.height,
        isDark: false,
        isBlank: false,
        isBlurry: false,
        isCorrupted: false
      }
    };
  }
}

module.exports = new ImageQualityService();
