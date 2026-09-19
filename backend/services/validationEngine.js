// CivicConnect - AI Image Validation Engine
// Matches Vision labels against central category rules, calculates confidence, and enforces decision policies

const config = require('../config');
const { CATEGORIES, normalizeCategory, getCategoryConfig } = require('../categoryRules');
const imageQualityService = require('./imageQualityService');
const storageService = require('./storageService');
const db = require('../database');
const GoogleVisionProvider = require('../providers/googleVisionProvider');
const MockVisionProvider = require('../providers/mockVisionProvider');

class ValidationEngine {
  constructor() {
    this.googleProvider = new GoogleVisionProvider();
    this.mockProvider = new MockVisionProvider();
    this.activeProviderName = config.VISION_PROVIDER;
  }

  setProvider(providerName) {
    this.activeProviderName = providerName;
  }

  getActiveProvider() {
    if (this.activeProviderName === 'mock' || this.activeProviderName === 'mock_vision') {
      return this.mockProvider;
    }
    return this.googleProvider;
  }

  /**
   * Determine if label text matches any concept in the concept list
   * @param {string} labelText
   * @param {string[]} concepts
   * @returns {boolean}
   */
  matchesConcept(labelText, concepts) {
    const cleanLabel = labelText.toLowerCase().trim();
    return concepts.some(concept => {
      const c = concept.toLowerCase().trim();
      return cleanLabel === c || cleanLabel.includes(c);
    });
  }

  /**
   * Check SafeSearch flags for prohibited / unsafe content
   * @param {Object} safeSearch
   * @returns {{ isSafe: boolean, flag: string|null }}
   */
  evaluateSafeSearch(safeSearch) {
    if (!safeSearch) return { isSafe: true, flag: null };

    const prohibitedLevels = ['LIKELY', 'VERY_LIKELY'];
    if (prohibitedLevels.includes(safeSearch.adult)) {
      return { isSafe: false, flag: 'ADULT_CONTENT' };
    }
    if (prohibitedLevels.includes(safeSearch.violence)) {
      return { isSafe: false, flag: 'VIOLENT_CONTENT' };
    }
    if (prohibitedLevels.includes(safeSearch.racy)) {
      return { isSafe: false, flag: 'RACY_CONTENT' };
    }
    return { isSafe: true, flag: null };
  }

  /**
   * Score detected labels against CivicConnect categories
   * @param {Array<{ name: string, score: number }>} labels
   * @param {string} selectedCategoryKey
   * @returns {{
   *   predictedCategory: string,
   *   confidence: number,
   *   categoryScores: Object,
   *   hasStrongIrrelevant: boolean,
   *   hasDirectDamageSignal: boolean
   * }}
   */
  scoreLabels(labels, selectedCategoryKey) {
    const scores = {};
    const relevantKeys = ['road_damage', 'garbage_overflow', 'broken_streetlight', 'water_leakage', 'drainage_problem', 'broken_traffic_light', 'other', 'irrelevant'];
    relevantKeys.forEach(k => { scores[k] = 0.0; });

    let hasStrongIrrelevant = false;
    let hasDirectDamageSignal = false;

    // Check for strong irrelevant labels (food, animal, selfie, meme, indoor)
    const irrelevantConfig = CATEGORIES.irrelevant;
    labels.forEach(label => {
      if (this.matchesConcept(label.name, irrelevantConfig.acceptedConcepts) && label.score >= 0.70) {
        scores.irrelevant += label.score * 0.8;
        hasStrongIrrelevant = true;
      }
    });

    // Score civic categories
    for (const key of relevantKeys) {
      if (key === 'irrelevant') continue;
      const catCfg = CATEGORIES[key];
      if (!catCfg) continue;

      labels.forEach(label => {
        // 1. Direct Accepted Concept (high weight)
        if (this.matchesConcept(label.name, catCfg.acceptedConcepts)) {
          scores[key] += label.score * 0.55;
          if (key === selectedCategoryKey) {
            hasDirectDamageSignal = true;
          }
        }
        // 2. Supporting Concept (moderate weight)
        else if (this.matchesConcept(label.name, catCfg.supportingConcepts)) {
          scores[key] += label.score * 0.20;
        }

        // 3. Rejected Concept (penalty)
        if (this.matchesConcept(label.name, catCfg.rejectedConcepts)) {
          scores[key] -= label.score * 0.40;
        }
      });
    }

    // Determine top predicted category
    let bestKey = 'other';
    let maxScore = -999;
    for (const [k, v] of Object.entries(scores)) {
      if (v > maxScore) {
        maxScore = v;
        bestKey = k;
      }
    }

    // Calculate normalized confidence for selected category
    let selectedScore = scores[selectedCategoryKey] || 0.0;

    // Specific rule for Road Damage:
    // If only generic labels ("road", "asphalt", "street") are present without any
    // specific damage signal ("pothole", "crack", "damage", "sinkhole"),
    // cap confidence at 0.68 so it cleanly triggers MANUAL_REVIEW rather than auto-approval.
    if (selectedCategoryKey === 'road_damage' && !hasDirectDamageSignal) {
      selectedScore = Math.min(selectedScore, 0.68);
    }

    // Normalize confidence between 0.00 and 0.99
    let finalConfidence = Math.max(0.10, Math.min(0.98, selectedScore));
    finalConfidence = Math.round(finalConfidence * 100) / 100;

    return {
      predictedCategory: bestKey,
      confidence: finalConfidence,
      categoryScores: scores,
      hasStrongIrrelevant,
      hasDirectDamageSignal
    };
  }

  /**
   * Main validation execution method
   * @param {Object} params
   * @param {string} params.selectedCategory - Category selected by user
   * @param {string} params.imageId - Temporary image ID in private storage
   * @param {string} params.userId - Authenticated citizen ID
   * @param {Object} [params.metadata] - Optional mock or client metadata
   */
  async validateImage({ selectedCategory, imageId, userId, metadata = {} }) {
    const canonicalCategory = normalizeCategory(selectedCategory);
    const categoryCfg = getCategoryConfig(canonicalCategory);
    const validationId = `VAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + config.VISION_VALIDATION_EXPIRY_MINUTES * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    // 1. Retrieve Image from Private Storage and Verify Ownership
    let imageData;
    try {
      imageData = storageService.getTemporaryImage(imageId, userId);
    } catch (err) {
      return {
        accepted: false,
        status: 'rejected',
        validationId,
        selectedCategory: canonicalCategory,
        predictedCategory: 'unknown',
        confidence: 0.0,
        labels: [],
        reasonCode: err.code || 'IMAGE_ACCESS_ERROR',
        message: err.message,
        suggestion: 'Please capture and upload a new photo.'
      };
    }

    const { buffer, meta } = imageData;

    // 2. Perform Image Quality & Technical Integrity Analysis
    const qualityResult = imageQualityService.inspectImage(buffer, meta ? meta.mimeType : '');
    if (!qualityResult.valid) {
      const record = {
        validationId,
        userId,
        imageId,
        imageHash: meta ? meta.imageHash : storageService.computeHash(buffer),
        selectedCategory: canonicalCategory,
        predictedCategory: 'unusable',
        status: 'rejected',
        accepted: false,
        confidence: 0.0,
        labels: [],
        safeSearchResult: {},
        imageQuality: qualityResult.details || {
          width: 0, height: 0, isBlurry: false, isDark: false, isBlank: false, isCorrupted: true
        },
        provider: this.activeProviderName,
        providerFeatures: ['quality_inspection'],
        rulesVersion: 'civicconnect-rules-v1',
        modelVersion: 'vision-rules-v1',
        reasonCode: qualityResult.reasonCode,
        message: qualityResult.error,
        suggestion: qualityResult.suggestion,
        createdAt,
        expiresAt
      };
      db.saveValidation(record);

      return {
        accepted: false,
        status: 'rejected',
        validationId,
        selectedCategory: canonicalCategory,
        predictedCategory: 'unusable',
        confidence: 0.0,
        labels: [],
        reasonCode: qualityResult.reasonCode,
        message: qualityResult.error,
        suggestion: qualityResult.suggestion
      };
    }

    // 3. Invoke Vision Provider (Google Cloud Vision or Mock)
    const provider = this.getActiveProvider();
    let classification;
    try {
      classification = await provider.classify({
        imageBuffer: buffer,
        mimeType: qualityResult.details.mimeType,
        metadata
      });
    } catch (err) {
      // If credentials missing or provider unconfigured -> safe 503 error
      if (err.code === 'PROVIDER_UNCONFIGURED') {
        const errorResponse = new Error('AI Image-Validation is temporarily unavailable due to server configuration.');
        errorResponse.statusCode = 503;
        errorResponse.code = 'PROVIDER_UNCONFIGURED';
        throw errorResponse;
      }

      // Timeout or Vision API error -> Safe error response
      const record = {
        validationId,
        userId,
        imageId,
        imageHash: meta ? meta.imageHash : storageService.computeHash(buffer),
        selectedCategory: canonicalCategory,
        predictedCategory: 'unknown',
        status: 'rejected',
        accepted: false,
        confidence: 0.0,
        labels: [],
        safeSearchResult: {},
        imageQuality: qualityResult.details,
        provider: provider.name,
        providerFeatures: ['label_detection', 'safe_search_detection'],
        rulesVersion: 'civicconnect-rules-v1',
        modelVersion: 'vision-rules-v1',
        reasonCode: err.code || 'VISION_SERVICE_ERROR',
        message: 'Unable to analyze image at this moment. Please try again shortly.',
        suggestion: 'Please try again in a few moments.',
        createdAt,
        expiresAt
      };
      db.saveValidation(record);

      return {
        accepted: false,
        status: 'rejected',
        validationId,
        selectedCategory: canonicalCategory,
        predictedCategory: 'unknown',
        confidence: 0.0,
        labels: [],
        reasonCode: err.code || 'VISION_SERVICE_ERROR',
        message: 'Unable to analyze photo at this moment. Please try again shortly.',
        suggestion: 'Please try again in a few moments.'
      };
    }

    const { labels, safeSearch } = classification;

    // 4. SafeSearch Policy Check
    const safeEvaluation = this.evaluateSafeSearch(safeSearch);
    if (!safeEvaluation.isSafe) {
      const record = {
        validationId,
        userId,
        imageId,
        imageHash: meta ? meta.imageHash : storageService.computeHash(buffer),
        selectedCategory: canonicalCategory,
        predictedCategory: 'inappropriate',
        status: 'rejected',
        accepted: false,
        confidence: 0.0,
        labels,
        safeSearchResult: safeSearch,
        imageQuality: qualityResult.details,
        provider: provider.name,
        providerFeatures: ['label_detection', 'safe_search_detection'],
        rulesVersion: 'civicconnect-rules-v1',
        modelVersion: classification.modelVersion,
        reasonCode: 'UNSAFE_CONTENT',
        createdAt,
        expiresAt
      };
      db.saveValidation(record);

      // Delete unsafe image from storage immediately
      storageService.deleteTemporaryImage(imageId);

      return {
        accepted: false,
        status: 'rejected',
        validationId,
        selectedCategory: canonicalCategory,
        predictedCategory: 'inappropriate',
        confidence: 0.0,
        labels: [],
        reasonCode: 'UNSAFE_CONTENT',
        message: 'The uploaded photo was flagged as inappropriate and cannot be submitted.',
        suggestion: 'Please upload an appropriate photo showing the public civic issue.'
      };
    }

    // 5. Score Labels and Match Against Civic Rules
    const scoring = this.scoreLabels(labels, canonicalCategory);
    const { predictedCategory, confidence, hasStrongIrrelevant } = scoring;

    let finalStatus = 'rejected';
    let accepted = false;
    let reasonCode = 'LOW_CONFIDENCE';
    let message = categoryCfg.guidance;
    let suggestion = null;

    // DECISION MATRIX
    // A. Clear Match & High Confidence (>= 0.80)
    if (predictedCategory === canonicalCategory && confidence >= config.VISION_MIN_CONFIDENCE && !hasStrongIrrelevant) {
      finalStatus = 'approved';
      accepted = true;
      reasonCode = 'CATEGORY_MATCH';
      message = 'Image verified. You can submit the complaint.';
      suggestion = null;
    }
    // B. Category Mismatch (Predicted clearly differs)
    else if (predictedCategory !== canonicalCategory && (hasStrongIrrelevant || scoring.categoryScores[predictedCategory] > 0.70)) {
      finalStatus = 'rejected';
      accepted = false;
      reasonCode = 'CATEGORY_MISMATCH';
      const predictedTitle = CATEGORIES[predictedCategory] ? CATEGORIES[predictedCategory].displayName : predictedCategory;
      message = `This photo does not appear to show ${categoryCfg.displayName}. It appears to show ${predictedTitle}.`;
      suggestion = categoryCfg.guidance;
    }
    // C. Ambiguous / Mixed / Medium Confidence (0.60 to 0.79)
    else if (confidence >= config.VISION_REVIEW_CONFIDENCE && confidence < config.VISION_MIN_CONFIDENCE) {
      finalStatus = 'manual_review';
      accepted = false;
      reasonCode = 'LOW_CONFIDENCE';
      message = 'We could not confidently verify this photo automatically. Please upload another clear image.';
      suggestion = categoryCfg.guidance;
    }
    // D. Low Confidence / Irrelevant (< 0.60)
    else {
      finalStatus = 'rejected';
      accepted = false;
      reasonCode = 'CATEGORY_MISMATCH';
      message = `This photo does not appear to show ${categoryCfg.displayName}.`;
      suggestion = categoryCfg.guidance;
    }

    // 6. Save Validation Record in Database
    const validationRecord = {
      validationId,
      userId,
      imageId,
      imageHash: meta ? meta.imageHash : storageService.computeHash(buffer),
      selectedCategory: canonicalCategory,
      predictedCategory,
      status: finalStatus,
      accepted,
      confidence,
      labels: labels.slice(0, 8),
      safeSearchResult: safeSearch,
      imageQuality: qualityResult.details,
      provider: provider.name,
      providerFeatures: ['label_detection', 'safe_search_detection'],
      rulesVersion: 'civicconnect-rules-v1',
      modelVersion: classification.modelVersion,
      reasonCode,
      message,
      suggestion,
      createdAt,
      expiresAt
    };
    db.saveValidation(validationRecord);

    // 7. Return Structured Response
    return {
      accepted,
      status: finalStatus,
      validationId,
      selectedCategory: canonicalCategory,
      predictedCategory,
      confidence,
      labels: labels.slice(0, 6),
      reasonCode,
      message,
      suggestion
    };
  }
}

module.exports = new ValidationEngine();
