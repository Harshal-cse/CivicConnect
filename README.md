# CivicConnect - Citizen-First Civic Problem Reporting Platform

CivicConnect is an urban governance web application designed to connect citizens directly with their local ward representatives (**Nagarsevak / Corporator**) and provide transparent accountability through automated time-bound escalation to MLAs (**Aamdar**) and state ministers.

---

## 🌟 Key Features

### 1. Geo-Tagged Problem Reporting
- File complaints across 6 core urban categories:
  1. **Damaged Roads** (potholes, broken asphalt)
  2. **Overflowing Garbage** (uncollected dumpsters, blackspots)
  3. **Broken Streetlights** (dark corridors, damaged poles)
  4. **Water Leakage** (burst municipal pipelines)
  5. **Drainage Problems** (choked gutters, monsoon waterlogging)
  6. **Damaged Infrastructure** (cracked footpaths, broken railings)
- Mandatory geotagging via browser GPS coordinates or interactive map pin.
- Photo/video upload with EXIF camera metadata verification to prevent fraudulent reports.

### 2. Smart Duplicate Prevention & "+1 Support" Mechanism
- **Spatial & Semantic Clustering**: Checks for existing open tickets within a 50–100m radius of the user's selected location.
- **"+1 Upvote / Support"**: Instead of erroring or rejecting user submissions, prompts the citizen to back the existing complaint. Every upvote increases ticket severity, ensuring municipal crews address high-impact issues first.

### 3. Multi-Tier SLA Auto-Escalation Engine
- **Level 1 (0 to 48 hours)**: Assigned to local **Nagarsevak** and Ward Junior Engineer.
- **Level 2 (48 to 96 hours)**: Automatically escalated to **Ward Assistant Municipal Commissioner**.
- **Level 3 (4 to 7 days)**: Auto-escalated to **Aamdar (MLA)** constituency oversight portal and Municipal Commissioner.
- **Level 4 (7+ days)**: Red-flagged on the **Urban Development Minister** dashboard and public transparency ledger.

### 4. Role-Based Access Control (RBAC)
- **Citizen**: File issues, track live status, upvote neighborhood issues, review after-repair photos, confirm satisfactory resolution.
- **Nagarsevak (Corporator)**: Ward console, verify citizen tickets, assign municipal departments (PWD, Solid Waste, Electrical, Water), monitor ward resolution metrics.
- **Aamdar (MLA)**: Constituency-wide oversight, track overdue red-flagged tickets, compare inter-ward performance metrics, issue executive summons.

---

## 🚀 Getting Started

The platform runs out of the box with zero dependencies.

### Option 1: Direct Browser
Double-click `index.html` in your file explorer to open it in Chrome, Edge, Firefox, or Safari.

### Option 2: Local HTTP Server (Node.js)
```bash
npx serve .
# or
npx http-server -p 8080
```
Open `http://localhost:8080` in your browser.

---

## 📐 Database Schema Architecture (Recommended for Backend)

```sql
-- Users & Roles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('citizen', 'nagarsevak', 'aamdar', 'engineer', 'admin')),
    ward_id INT REFERENCES wards(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints
CREATE TABLE complaints (
    id VARCHAR(16) PRIMARY KEY, -- e.g. CC-8421
    citizen_id UUID REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    address_text TEXT NOT NULL,
    ward_id INT REFERENCES wards(id),
    status VARCHAR(30) DEFAULT 'reported',
    escalation_level INT DEFAULT 1,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    media_before_url TEXT NOT NULL,
    media_after_url TEXT,
    support_count INT DEFAULT 1
);

-- Upvotes / Supporters
CREATE TABLE complaint_supporters (
    complaint_id VARCHAR(16) REFERENCES complaints(id),
    user_id UUID REFERENCES users(id),
    supported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (complaint_id, user_id)
);
```

---

## 📜 License
MIT License. Built for transparent citizen-first civic governance.
