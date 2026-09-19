# CivicConnect: Google Cloud Vision API Setup Guide

This guide provides step-by-step instructions for provisioning, securing, and connecting the production Google Cloud Vision API to CivicConnect for municipal complaint image validation.

---

## 1. Google Cloud Project Provisioning

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select an existing project or click **New Project**:
   - **Project Name**: `civicconnect-kopargaon`
   - **Organization**: Select your municipal IT organization or leaving unorganized.
3. Enable Billing on the project (Cloud Vision API offers 1,000 free requests per month, followed by standard tier pricing).

---

## 2. Enable Cloud Vision API

1. Navigate to **APIs & Services > Library** in Google Cloud Console.
2. Search for **Cloud Vision API** (`vision.googleapis.com`).
3. Click **Enable**.

---

## 3. Create Service Account & Private Key

To ensure the principle of least privilege, create a dedicated service account:

1. Navigate to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**:
   - **Service account name**: `civicconnect-vision-agent`
   - **Service account ID**: `civicconnect-vision-agent`
   - **Description**: `Automated image classifier service account for CivicConnect municipal complaint verification`
3. Click **Create and Continue**.
4. Grant the following role:
   - **Cloud Vision Service Agent** (`roles/serviceusage.serviceUsageConsumer`) or **Viewer** (`roles/viewer`).
   > [!IMPORTANT]
   > Do NOT assign Project Editor or Owner roles to this service account.
5. Click **Done**.
6. Select the newly created service account from the list.
7. Switch to the **Keys** tab, click **Add Key > Create new key**.
8. Choose **JSON** format and click **Create**.
9. The JSON credentials file will download to your local machine.

---

## 4. Deploying Credentials to CivicConnect

### Option A: Local / Development Environment (Key File)

1. Save the downloaded JSON file in a secure location outside public directories or in a `credentials/` subfolder:
   ```bash
   # Linux / macOS
   mkdir -p credentials
   mv ~/Downloads/civicconnect-vision-agent-key.json credentials/google-vision-key.json
   chmod 600 credentials/google-vision-key.json

   # Windows PowerShell
   New-Item -ItemType Directory -Force -Path credentials
   Move-Item -Path "$HOME/Downloads/civicconnect-vision-agent-key.json" -Destination "credentials/google-vision-key.json"
   ```

2. Update your `.env` file:
   ```env
   VISION_PROVIDER=google_cloud_vision
   GOOGLE_APPLICATION_CREDENTIALS=credentials/google-vision-key.json
   VISION_MIN_CONFIDENCE=0.80
   VISION_REVIEW_CONFIDENCE=0.60
   ```

### Option B: Production / Containerized Environments (Environment Secret)

In Kubernetes, Docker, Cloud Run, or AWS ECS, avoid mounting physical key files by passing the key content via environment variable:

```env
VISION_PROVIDER=google_cloud_vision
GOOGLE_CLOUD_VISION_KEY_JSON='{"type":"service_account","project_id":"civicconnect-kopargaon",...}'
```

---

## 5. Security & Secret Protection Checklist

- [x] **Zero Frontend Leakage**: The Google Cloud Vision API is invoked exclusively on the Node.js backend. The client browser NEVER communicates with Google Cloud directly.
- [x] **Git Protection**: Ensure `credentials/` and `*.json` (except `package.json`) are listed in `.gitignore`.
- [x] **Private Storage**: Citizens' uploaded images are held in private temporary directories (`storage/temp_images/`) accessible only to the backend validator and never exposed through public web server paths.
- [x] **Automated Cleanup**: Temporary images expire after 30 minutes and are deleted automatically.

---

## 6. Verification & Health Check

After configuring your credentials and restarting the server:

1. Query the health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Confirm the response reflects active Google Cloud Vision provider:
   ```json
   {
     "status": "healthy",
     "service": "CivicConnect AI Image-Validation System",
     "municipality": "Kopargaon",
     "state": "Maharashtra",
     "activeProvider": "google_cloud_vision",
     "providerHealth": {
       "healthy": true,
       "provider": "google_cloud_vision",
       "message": "Google Cloud Vision API connection verified"
     }
   }
   ```

3. Run the automated verification test suite:
   ```bash
   node tests/ai_image_validation.test.js
   ```
