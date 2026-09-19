# CivicConnect — Supabase Cloud Integration Guide

This guide explains how to connect **Supabase** (PostgreSQL Database, Authentication, and Object Storage) to your CivicConnect platform.

---

## Architecture Overview: The Dual-Engine Pattern

CivicConnect employs a **dual-engine persistence architecture**:

```
 ┌────────────────────────────────────────────────────────┐
 │                   CivicConnect Server                  │
 └──────────────────────────┬─────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
   ┌───────────────────────┐ ┌───────────────────────┐
   │  Supabase PostgreSQL  │ │  Local Atomic JSON    │
   │  & Cloud Storage      │ │  Fallback Engine      │
   │                       │ │                       │
   │ • Cloud Persistence   │ │ • Zero-setup offline  │
   │ • Realtime feed       │ │ • Instant test suite  │
   │ • Multi-device sync   │ │ • Local backup cache  │
   └───────────────────────┘ └───────────────────────┘
```

* **When Supabase is configured**: All complaints, image validations, and audit logs are synchronized directly with your Supabase cloud database, and complaint photos are uploaded to the `complaint-images` bucket.
* **When offline or unconfigured**: CivicConnect falls back seamlessly to the local JSON database in `data/`, ensuring local development and all automated tests continue to work without a hitch.

---

## Step-by-Step Setup Instructions

### Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **"New project"**.
3. Fill in your project details:
   - **Name**: `civicconnect-kopargaon` (or your preferred name)
   - **Database Password**: Choose a secure password (save it safely)
   - **Region**: Select a region close to your users (e.g. `ap-south-1 (Mumbai)` for Maharashtra / India)
4. Click **"Create new project"** and wait ~1-2 minutes for provisioning.

---

### Step 2: Run the Database Schema

1. In your Supabase dashboard, click **"SQL Editor"** (terminal icon in the left sidebar).
2. Click **"New query"**.
3. Open the file [`supabase/schema.sql`](supabase/schema.sql) in your project workspace.
4. Copy the entire contents of `supabase/schema.sql` and paste it into the Supabase SQL Editor.
5. Click **"Run"** (or press `Ctrl+Enter`).

This automatically creates:
- `public.profiles` — Citizens, Ward Corporators (Nagarsevak), MLAs, and Admins.
- `public.complaints` — Civic issue reports with GPS coordinates, SLA status, and timeline.
- `public.image_validations` — AI vision verification audits and cryptographic image hashes.
- `public.moderation_audits` — Administrative review logs.
- `complaint-images` Storage Bucket — With public read access for photo evidence.
- Row-Level Security (RLS) policies and performance indexes.

---

### Step 3: Get Your API Credentials

1. In your Supabase dashboard, navigate to **Project Settings** (gear icon at the bottom left) \(\rightarrow\) **API**.
2. Note down the following values:
   - **Project URL**: e.g. `https://xyzcompany.supabase.co`
   - **Project API keys** \(\rightarrow\) `anon` `public`: (Used for safe public client queries)
   - **Project API keys** \(\rightarrow\) `service_role` `secret`: (Used by backend server for secure AI validation pipeline)

> [!CAUTION]
> The `service_role` secret key bypasses Row Level Security. Never expose it in client-side code, git repositories, or frontend HTML/JS. Store it only in your server's private `.env` file.

---

### Step 4: Configure Your `.env` File

Create or edit your `.env` file in the project root:

```env
# Server Port & Mode
PORT=3000
NODE_ENV=development

# Supabase Cloud Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_STORAGE_BUCKET=complaint-images

# AI Vision Configuration
VISION_PROVIDER=mock
VISION_MIN_CONFIDENCE=0.80
VISION_REVIEW_CONFIDENCE=0.60
```

---

### Step 5: Migrate Existing Data to Supabase

Run the automated migration tool to populate your Supabase database with existing complaints, validation audits, and demo user profiles:

```bash
npm run migrate:supabase
```

**Expected output:**
```
======================================================================
 CivicConnect -> Supabase Cloud Migration Tool
======================================================================

📡 Connecting to Supabase: https://your-project-id.supabase.co
✅ Connected successfully! (Latency: 142ms)

👤 Seeding user & official profiles...
  ✓ Successfully upserted 4 role profiles.

📋 Migrating complaints from data/complaints.json...
  ✓ Successfully migrated 3 / 3 complaints.

🛡️ Migrating AI image validations from data/imageValidations.json...
  ✓ Successfully migrated 20 / 20 validation records.

======================================================================
 Migration Summary
======================================================================
  Profiles Created/Synced:   4
  Complaints Migrated:        3
  Validations Migrated:       20
======================================================================
✅ Supabase cloud migration complete! CivicConnect is live with Supabase.
```

---

### Step 6: Verify Connection via Health Endpoint

Start the CivicConnect server:
```bash
npm start
```

Test the live Supabase connectivity endpoint in your browser or terminal:
```bash
curl http://localhost:3000/api/supabase/status
```

**Response:**
```json
{
  "success": true,
  "service": "CivicConnect Supabase Cloud Integration",
  "status": {
    "configured": true,
    "connected": true,
    "latencyMs": 85,
    "complaintsCount": 3,
    "url": "https://your-project-id.supabase.co",
    "storageBucket": "complaint-images"
  }
}
```

You can also check standard health:
```bash
curl http://localhost:3000/api/health
```

---

## Querying Complaints via the REST API

Once Supabase is connected, you can query complaints directly through the server API with ward and status filtering:

| Endpoint | Description |
|---|---|
| `GET /api/complaints` | List all active complaints |
| `GET /api/complaints?ward=Ward+1+-+Shivaji+Chowk` | Filter complaints by municipal ward |
| `GET /api/complaints?status=In+Progress` | Filter complaints by lifecycle status |
| `GET /api/complaints?limit=10` | Limit results |
| `GET /api/supabase/status` | View Supabase connection diagnostics & latency |
