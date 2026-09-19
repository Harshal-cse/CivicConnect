// CivicConnect - ImageClassifierProvider Interface
// Common abstraction layer supporting Google Cloud Vision, Custom Models, Vertex AI, and Mocks

class ImageClassifierProvider {
  constructor(name = 'base_provider') {
    this.name = name;
  }

  /**
   * Classify an image and extract label annotations & safe search results
   * @param {Object} params
   * @param {Buffer} params.imageBuffer - Image raw binary buffer
   * @param {string} params.mimeType - Image MIME type (e.g. 'image/jpeg')
   * @param {string} [params.imagePath] - Absolute path if stored on disk
   * @returns {Promise<{
   *   labels: Array<{ name: string, score: number }>,
   *   safeSearch: { adult: string, violence: string, racy: string, spoof: string, medical: string },
   *   provider: string,
   *   modelVersion: string
   * }>}
   */
  async classify(params) {
    throw new Error(`classify() not implemented in provider "${this.name}"`);
  }

  /**
   * Health check to confirm provider connectivity & valid credentials
   * @returns {Promise<{ healthy: boolean, provider: string, message: string }>}
   */
  async healthCheck() {
    return { healthy: true, provider: this.name, message: 'Provider ready' };
  }
}

module.exports = ImageClassifierProvider;
