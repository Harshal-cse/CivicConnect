# CivicConnect: AI Image-Validation Architecture & Security Specification

This document details the architectural design, security policies, scoring algorithms, and extensibility patterns of the CivicConnect AI Image-Validation system.

---

## 1. System Overview

CivicConnect enforces a strict **Zero-Trust Backend Validation** policy. Citizens reporting public infrastructure issues in Kopargaon, Maharashtra must provide real photographic evidence that objectively matches their selected complaint category before submission can proceed.

```
+-----------------------------------------------------------------------------------+
|                                 CITIZEN PORTAL                                    |
|   1. Select Category -> 2. Capture / Upload Photo -> 3. Lock Submit -> 4. Submit |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v (POST /api/complaints/upload-temporary-image)
+-----------------------------------------------------------------------------------+
|                        BACKEND INGESTION & QUALITY ENGINE                         |
|   - Magic Bytes Check (JPG, PNG, WebP)                                            |
|   - Binary Dimension Extraction (>= 640x480)                                      |
|   - Pixel Variance Analysis (Blur, Dark, Blank, Corruption detection)             |
|   - Private Encrypted Temp Storage (SHA-256 Content Hash, 30-Min TTL)             |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v (POST /api/complaints/validate-image)
+-----------------------------------------------------------------------------------+
|                     PLUGGABLE VISION CLASSIFIER PROVIDER                          |
|   - GoogleCloudVisionProvider (SafeSearch + Label Detection via JWT)              |
|   - MockVisionProvider (Deterministic, 20 test scenarios, zero-cost unit testing)|
|   - Future: Custom Local YOLOv8 / Edge Model                                      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                    CATEGORY SCORING & DECISION POLICY ENGINE                      |
|   - Concept Matching (Accepted, Supporting, Rejected, Uncertain)                  |
|   - Generic Label Dampening (e.g. "road" alone capped at 0.68)                    |
|   - Thresholds:                                                                   |
|       * Score >= 0.80 -> APPROVED (Submit unlocked)                               |
|       * 0.60 <= Score < 0.80 -> MANUAL_REVIEW (Flagged for Admin Triage)          |
|       * Score < 0.60 or Quality Failure or Unsafe -> REJECTED                     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v (POST /api/complaints)
+-----------------------------------------------------------------------------------+
|                       13-POINT BACKEND SECURITY GATEWAY                           |
|   1. Auth Token & User ID Check        8. Validation Status MUST be 'approved'    |
|   2. Title & Category Present          9. Validation Not Expired (<30 min)        |
|   3. Kopargaon Geofence Validation    10. Submitted Image ID == Validated ID      |
|   4. User Ward Jurisdiction Match     11. SHA-256 Hash Unchanged (No tampering)   |
|   5. Validation Record Exists         12. Category Unchanged Post-Validation      |
|   6. Temporary Image Exists           13. Permanent Storage Promotion & Routing   |
|   7. User Owns Validation Record                                                  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Pluggable Provider Interface

The classification pipeline is decoupled via the `ImageClassifierProvider` abstract base class:

```javascript
class ImageClassifierProvider {
  constructor(name) { this.name = name; }
  async classify({ imageBuffer, mimeType, metadata }) { throw new Error('Must implement'); }
  async healthCheck() { throw new Error('Must implement'); }
}
```

### Registered Providers:
1. **`GoogleVisionProvider`**:
   - Authenticates via Service Account JWT (RS256) directly against Google Cloud token endpoint.
   - Dispatches parallel `LABEL_DETECTION` and `SAFE_SEARCH_DETECTION` requests.
   - 10-second timeout with fail-safe error handling (never crashes node server).
2. **`MockVisionProvider`**:
   - Deterministic test harness supporting all 20 edge-case scenarios (potholes, garbage, streetlights, food, animals, selfies, dark, blank, blurry, timeouts, credential outages).
   - Zero external network dependencies.
3. **Future Extensibility**:
   - Custom self-hosted models (YOLOv8, EfficientNet) can be added simply by subclassing `ImageClassifierProvider` and registering in `backend/services/validationEngine.js`.

---

## 3. Image Quality Analysis Service

Before invoking cloud vision APIs (which incur network latency and API costs), images pass through binary quality inspection:
- **Magic Bytes Verification**: Inspects leading header bytes (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WebP). Spoofed file extensions (e.g. `.txt` renamed to `.jpg`) are instantly rejected.
- **Resolution & Corruption**: Dimensions are extracted directly from binary headers without native external dependencies. Photos under 640x480 are rejected (`IMAGE_TOO_SMALL`). Truncated or corrupt streams are flagged (`FILE_CORRUPTED`).
- **Statistical Pixel Analysis**:
  - *Darkness*: Average luminance < 16 (on 0-255 scale) -> `IMAGE_TOO_DARK`.
  - *Blankness*: Standard deviation < 3.0 across payload -> `IMAGE_BLANK`.
  - *Blur*: Edge gradient < 4.2 across compressed stream -> `IMAGE_BLURRY`.

---

## 4. Scoring Algorithm & Generic Label Handling

One of the most critical requirements is preventing generic photos (e.g. a smooth road or empty sidewalk) from falsely approving for damage categories:

```javascript
// Concept Matching Weights:
// 1. Direct Accepted Concept (e.g. 'pothole', 'crack', 'sinkhole') -> +0.55 * label.score
// 2. Supporting Concept (e.g. 'road', 'asphalt', 'street')         -> +0.20 * label.score
// 3. Rejected Concept (e.g. 'garbage', 'selfie', 'food')           -> -0.40 * label.score

// Specific Road Damage Defect Rule:
if (selectedCategoryKey === 'road_damage' && !hasDirectDamageSignal) {
  // If only generic labels ('road', 'asphalt', 'street') exist without any direct damage label:
  selectedScore = Math.min(selectedScore, 0.68); // Strictly capped at 0.68 (triggers manual_review)
}
```

---

## 5. Decision Policy

| Confidence Score | Conditions | System Decision | Frontend Action |
| :--- | :--- | :--- | :--- |
| **≥ 0.80** | Matches category, passes SafeSearch, passes Quality | `approved` | Enables complaint submit button; displays green verification badge |
| **0.60 – 0.79** | Ambiguous features or generic background without defect proof | `manual_review` | Disables submit button; queues record for Admin Moderation |
| **< 0.60** | Category mismatch, irrelevant image, or quality failure | `rejected` | Disables submit button; suggests correct category or retake prompt |

---

## 6. Kopargaon Municipal Geofencing

Complaints are bound to Kopargaon municipal territory in Maharashtra:
- **Primary Geofence Coordinates**: Latitude: `19.85° N` to `19.93° N`, Longitude: `74.44° E` to `74.52° E`.
- Submissions outside this bounding box are rejected with `GEOFENCE_VIOLATION` unless originating from supported legacy demo jurisdictions (Pune, Mumbai, Nagpur).

---

## 7. Limitations & Recommendations for Future Iterations

1. **Edge-Case Weather Conditions**: Dense fog or heavy monsoon rain may lower image contrast. The manual review console allows ward administrators to override legitimate weather-affected complaints.
2. **Offline Mode**: For citizens in areas with low mobile data, client-side thumbnail generation and quality pre-checks can reduce upload retries.
3. **Custom Model Training**: As Kopargaon accumulates verified civic photos, fine-tuning a custom YOLOv8 model on Maharashtra municipal infrastructure will improve localization of specific regional assets (e.g., specific MSEDCL utility pole models, local gutter styles).
