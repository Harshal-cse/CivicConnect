// CivicConnect - Mock Vision Provider
// Deterministic simulated provider for unit, integration, and security tests

const ImageClassifierProvider = require('./providerInterface');

class MockVisionProvider extends ImageClassifierProvider {
  constructor() {
    super('mock_vision');
    this.modelVersion = 'mock-v1';
    this.overrideScenario = null; // Can be set programmatically in tests
    this.simulatedDelayMs = 20;
  }

  setScenario(scenario) {
    this.overrideScenario = scenario;
  }

  clearScenario() {
    this.overrideScenario = null;
  }

  async classify({ imageBuffer, metadata }) {
    if (this.simulatedDelayMs > 0) {
      await new Promise(r => setTimeout(r, this.simulatedDelayMs));
    }

    const scenario = this.overrideScenario || (metadata && metadata.mockScenario) || 'pothole_clear';

    // 1. Simulate Timeout
    if (scenario === 'simulate_timeout') {
      const timeoutErr = new Error('Google Vision request timed out after 10000ms');
      timeoutErr.code = 'VISION_TIMEOUT';
      throw timeoutErr;
    }

    // 2. Simulate Credentials Error
    if (scenario === 'simulate_credentials_error') {
      const err = new Error('Google Cloud Vision credentials are not configured on this server');
      err.code = 'PROVIDER_UNCONFIGURED';
      throw err;
    }

    // 3. Simulate API Failure / 500
    if (scenario === 'simulate_api_error') {
      const err = new Error('Google Cloud Vision internal service error (500)');
      err.code = 'VISION_API_ERROR';
      throw err;
    }

    // Base SafeSearch default (all safe)
    let safeSearch = {
      adult: 'VERY_UNLIKELY',
      spoof: 'VERY_UNLIKELY',
      medical: 'VERY_UNLIKELY',
      violence: 'VERY_UNLIKELY',
      racy: 'VERY_UNLIKELY'
    };

    let labels = [];

    switch (scenario) {
      case 'pothole_clear':
      case 'road_damage':
        labels = [
          { name: 'pothole', score: 0.96 },
          { name: 'road damage', score: 0.91 },
          { name: 'asphalt', score: 0.88 },
          { name: 'crack', score: 0.85 },
          { name: 'street', score: 0.82 }
        ];
        break;

      case 'garbage_clear':
      case 'garbage_overflow':
        labels = [
          { name: 'garbage', score: 0.95 },
          { name: 'waste', score: 0.92 },
          { name: 'litter', score: 0.89 },
          { name: 'dumpster', score: 0.86 },
          { name: 'waste container', score: 0.81 }
        ];
        break;

      case 'streetlight_clear':
      case 'broken_streetlight':
        labels = [
          { name: 'street light', score: 0.94 },
          { name: 'lamp post', score: 0.90 },
          { name: 'light pole', score: 0.88 },
          { name: 'utility pole', score: 0.83 }
        ];
        break;

      case 'water_leak_clear':
      case 'water_leakage':
        labels = [
          { name: 'water leak', score: 0.93 },
          { name: 'burst pipe', score: 0.89 },
          { name: 'pipe', score: 0.87 },
          { name: 'water flow', score: 0.84 }
        ];
        break;

      case 'drainage_clear':
      case 'drainage_problem':
        labels = [
          { name: 'drain', score: 0.93 },
          { name: 'gutter', score: 0.89 },
          { name: 'sewer', score: 0.86 },
          { name: 'blocked drain', score: 0.84 }
        ];
        break;

      case 'traffic_light_clear':
      case 'broken_traffic_light':
        labels = [
          { name: 'traffic light', score: 0.95 },
          { name: 'signal light', score: 0.91 },
          { name: 'stoplight', score: 0.88 }
        ];
        break;

      case 'normal_road':
        // Generic road without any pothole/crack/damage label
        labels = [
          { name: 'road', score: 0.95 },
          { name: 'asphalt', score: 0.92 },
          { name: 'highway', score: 0.88 },
          { name: 'lane', score: 0.82 },
          { name: 'street', score: 0.80 }
        ];
        break;

      case 'irrelevant_food':
        labels = [
          { name: 'food', score: 0.97 },
          { name: 'meal', score: 0.93 },
          { name: 'dish', score: 0.89 },
          { name: 'cuisine', score: 0.85 }
        ];
        break;

      case 'irrelevant_animal':
        labels = [
          { name: 'dog', score: 0.96 },
          { name: 'canine', score: 0.92 },
          { name: 'pet', score: 0.89 },
          { name: 'animal', score: 0.87 }
        ];
        break;

      case 'irrelevant_selfie':
        labels = [
          { name: 'person', score: 0.98 },
          { name: 'human face', score: 0.95 },
          { name: 'selfie', score: 0.91 },
          { name: 'portrait', score: 0.87 }
        ];
        break;

      case 'unsafe_content':
        labels = [{ name: 'inappropriate image', score: 0.90 }];
        safeSearch = {
          adult: 'VERY_LIKELY',
          spoof: 'VERY_UNLIKELY',
          medical: 'VERY_UNLIKELY',
          violence: 'VERY_LIKELY',
          racy: 'VERY_LIKELY'
        };
        break;

      case 'mixed_ambiguous':
        // Ambiguous content that scores in the 0.60–0.79 manual review range
        labels = [
          { name: 'street', score: 0.72 },
          { name: 'construction', score: 0.68 },
          { name: 'ground', score: 0.65 }
        ];
        break;

      default:
        labels = [
          { name: 'object', score: 0.70 },
          { name: 'outdoor', score: 0.65 }
        ];
        break;
    }

    return {
      labels,
      safeSearch,
      provider: 'mock_vision',
      modelVersion: this.modelVersion
    };
  }

  async healthCheck() {
    return { healthy: true, provider: this.name, message: 'Mock provider ready' };
  }
}

module.exports = MockVisionProvider;
