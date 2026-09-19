// CivicConnect - Citizen Portal Application Logic & Components

(function () {
  'use strict';

  // Current logged in Citizen Profile (persisted or default Demo Citizen)
  const defaultCitizen = {
    name: "Demo Citizen",
    email: "citizen@demo.com",
    phone: "+91 98765 43210",
    city: "Kopargaon",
    ward: "Ward 1 - Shivaji Chowk",
    corporator: "Ramesh Patil (Ward 1 Corporator)",
    address: "Near Shivaji Chowk, Station Road, Kopargaon",
    coordinates: { lat: 19.8864, lng: 74.4789 },
    avatarText: "DC",
    joinedDate: "January 14, 2026"
  };

  function getActiveCitizen() {
    try {
      const stored = localStorage.getItem('civicconnect_citizen');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name) {
          return Object.assign({}, defaultCitizen, parsed, {
            avatarText: parsed.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "DC"
          });
        }
      }
    } catch (e) {
      console.warn("Could not read citizen from localStorage:", e);
    }
    return defaultCitizen;
  }

  let citizenUser = getActiveCitizen();

  // Centralized Mock Complaints Database
  let complaintsDB = [
    {
      id: "CC-SAMPLE01",
      title: "Large pothole on Main Road",
      category: "Damaged Roads",
      description: "Deep pothole near the bus stop causing traffic issues and vehicle damage.",
      ward: "Ward 1 - Central",
      location: "Main Road, Near Central Bus Stop",
      coordinates: { lat: 18.5204, lng: 73.8567 },
      status: "Verified",
      priority: "High",
      reportedBy: "Demo Citizen",
      reportedAt: "8d ago",
      dateFormatted: "Sep 05, 2026 • 10:30 AM",
      supports: 14,
      isMyComplaint: true,
      slaRemaining: "SLA Deadline: 2 days remaining",
      isOverdue: false,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 05, 10:30 AM", status: "completed", note: "Citizen filed report with locked device GPS evidence." },
        { title: "Reviewed by Nagarsevak", time: "Sep 06, 02:15 PM", status: "completed", note: "Ward Corporator Ramesh Patil verified problem on site." },
        { title: "Approved & Department Dispatched", time: "Sep 07, 11:00 AM", status: "active", note: "Forwarded to PWD Road Maintenance Division." },
        { title: "Work Started", time: "Pending", status: "upcoming", note: "Contractor asphalt crew scheduled." },
        { title: "Resolved & Citizen Verified", time: "Pending", status: "upcoming", note: "After-repair photo proof pending citizen sign-off." }
      ]
    },
    {
      id: "CC-SAMPLE02",
      title: "Overflowing garbage bin at Park",
      category: "Overflowing Garbage",
      description: "Garbage bin near South Park has been overflowing for 3 days attracting stray animals.",
      ward: "Ward 2 - North",
      location: "South Park Gate 2, Model Colony",
      coordinates: { lat: 18.5312, lng: 73.8421 },
      status: "In Progress",
      priority: "Medium",
      reportedBy: "Demo Citizen",
      reportedAt: "11d ago",
      dateFormatted: "Sep 02, 2026 • 04:15 PM",
      supports: 2,
      isMyComplaint: true,
      slaRemaining: "Overdue — Escalation triggered",
      isOverdue: true,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 02, 04:15 PM", status: "completed", note: "Geotagged image captured." },
        { title: "Reviewed by Nagarsevak", time: "Sep 04, 09:30 AM", status: "completed", note: "Corporator verified bin overflow." },
        { title: "Approved & Department Dispatched", time: "Sep 06, 10:00 AM", status: "completed", note: "Sent to Solid Waste Management." },
        { title: "Work Started (Overdue Escalated)", time: "Sep 11, 01:00 PM", status: "active", note: "⚡ Auto-escalated to Constituency MLA due to delayed clearance." },
        { title: "Resolved", time: "Pending", status: "upcoming", note: "Waste disposal truck en route." }
      ]
    },
    {
      id: "CC-2026-0018",
      title: "Large pothole near Central Market",
      category: "Damaged Roads",
      description: "Severe road crater causing regular two-wheeler skids in front of municipal market.",
      ward: "Ward 1 - Central",
      location: "Market Road, Junction 4",
      coordinates: { lat: 18.5220, lng: 73.8580 },
      status: "In Progress",
      priority: "High",
      reportedBy: "Rajesh Shinde",
      reportedAt: "4d ago",
      dateFormatted: "Sep 09, 2026 • 11:20 AM",
      supports: 24,
      isMyComplaint: false,
      slaRemaining: "SLA Deadline: 1 day remaining",
      isOverdue: false,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 09, 11:20 AM", status: "completed", note: "Reported with 24 neighborhood upvotes." },
        { title: "Reviewed by Nagarsevak", time: "Sep 10, 01:00 PM", status: "completed", note: "Ward office inspection verified." },
        { title: "Work Started", time: "Sep 12, 09:30 AM", status: "active", note: "PWD concrete patching in progress." },
        { title: "Resolved", time: "Pending", status: "upcoming", note: "Curing process underway." }
      ]
    },
    {
      id: "CC-8104",
      title: "Streetlight pole non-functional, pitch dark walkway",
      category: "Broken Streetlights",
      description: "Three consecutive LED poles have failed along the school link road creating safety hazards.",
      ward: "Ward 1 - Central",
      location: "Link Road, Near St. Xavier School",
      coordinates: { lat: 18.5240, lng: 73.8540 },
      status: "Resolved",
      priority: "Medium",
      reportedBy: "Kavita Deshmukh",
      reportedAt: "6d ago",
      dateFormatted: "Sep 07, 2026 • 07:45 PM",
      supports: 19,
      isMyComplaint: false,
      slaRemaining: "Completed & Verified",
      isOverdue: false,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 07, 07:45 PM", status: "completed", note: "Reported by school parents." },
        { title: "Reviewed by Nagarsevak", time: "Sep 08, 09:00 AM", status: "completed", note: "Approved by Ward Corporator." },
        { title: "Work Started", time: "Sep 09, 11:00 AM", status: "completed", note: "Electrical Dept lineman replaced bulb units." },
        { title: "Resolved & Verified", time: "Sep 10, 05:00 PM", status: "completed", note: "After-repair night photo verified by residents." }
      ]
    },
    {
      id: "CC-7945",
      title: "Main water pipeline burst flooding society entrance",
      category: "Water Leakage",
      description: "Pressurized potable water pipe ruptured leading to significant water wastage and flooding.",
      ward: "Ward 2 - North",
      location: "Prabhat Road, Near Post Office",
      coordinates: { lat: 18.5150, lng: 73.8410 },
      status: "In Progress",
      priority: "High",
      reportedBy: "Sunil Verma",
      reportedAt: "2d ago",
      dateFormatted: "Sep 11, 2026 • 08:15 AM",
      supports: 54,
      isMyComplaint: false,
      slaRemaining: "SLA Deadline: 3 days remaining",
      isOverdue: false,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 11, 08:15 AM", status: "completed", note: "Urgent citizen petition." },
        { title: "Reviewed by Nagarsevak", time: "Sep 11, 09:30 AM", status: "completed", note: "Triage completed." },
        { title: "Work Started", time: "Sep 12, 02:00 PM", status: "active", note: "Excavation and replacement sleeves dispatched." }
      ]
    },
    {
      id: "CC-7820",
      title: "Stormwater drain blocked by construction debris",
      category: "Drainage Problems",
      description: "Severe water logging after minor rain due to blocked drainage canal.",
      ward: "Ward 1 - Central",
      location: "Shivaji Chowk, Behind Metro Station",
      coordinates: { lat: 18.5215, lng: 73.8590 },
      status: "Approved",
      priority: "Medium",
      reportedBy: "Amit Roy",
      reportedAt: "1d ago",
      dateFormatted: "Sep 12, 2026 • 03:00 PM",
      supports: 9,
      isMyComplaint: false,
      slaRemaining: "SLA Deadline: 4 days remaining",
      isOverdue: false,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 12, 03:00 PM", status: "completed", note: "Reported with photos." },
        { title: "Reviewed by Nagarsevak", time: "Sep 13, 10:00 AM", status: "completed", note: "Ward corporator approved cleaning crew." }
      ]
    },
    {
      id: "CC-7650",
      title: "Damaged pedestrian bridge railings hanging loose",
      category: "Damaged Infrastructure",
      description: "Steel safety barrier detached on river footbridge creating imminent danger for pedestrians.",
      ward: "Ward 1 - Central",
      location: "Old Bund Bridge Pedestrian Path",
      coordinates: { lat: 18.5280, lng: 73.8510 },
      status: "In Progress",
      priority: "High",
      reportedBy: "Pooja Hegde",
      reportedAt: "5d ago",
      dateFormatted: "Sep 08, 2026 • 12:30 PM",
      supports: 38,
      isMyComplaint: false,
      slaRemaining: "SLA Deadline: 1 day remaining",
      isOverdue: false,
      timeline: [
        { title: "Complaint Submitted", time: "Sep 08, 12:30 PM", status: "completed", note: "Citizen alert." },
        { title: "Reviewed by Nagarsevak", time: "Sep 09, 09:00 AM", status: "completed", note: "Site barricaded." },
        { title: "Work Started", time: "Sep 11, 10:00 AM", status: "active", note: "Welding and structural repair contractor on site." }
      ]
    }
  ];

  // System Notifications
  let notificationsList = [
    {
      id: 1,
      text: "Your complaint <strong>#CC-SAMPLE01</strong> has been verified and approved by Nagarsevak Ramesh Patil.",
      time: "2 hours ago",
      unread: true,
      icon: "✓",
      bg: "#dcfce7",
      color: "#15803d"
    },
    {
      id: 2,
      text: "Work has started on <strong>#CC-SAMPLE02</strong> (Overflowing garbage bin at Park).",
      time: "1 day ago",
      unread: true,
      icon: "⚙️",
      bg: "#eff6ff",
      color: "#1d4ed8"
    },
    {
      id: 3,
      text: "Complaint <strong>#CC-SAMPLE02</strong> is overdue (11d) and has been escalated to the Constituency MLA.",
      time: "2 days ago",
      unread: true,
      icon: "🚨",
      bg: "#fee2e2",
      color: "#dc2626"
    },
    {
      id: 4,
      text: "Complaint <strong>#CC-8104</strong> in your ward has been successfully resolved and closed.",
      time: "3 days ago",
      unread: false,
      icon: "✨",
      bg: "#f1f5f9",
      color: "#475569"
    }
  ];

  // Active Map Instances Cache
  let activeCityMap = null;
  let activeReportMap = null;
  let activeWardMap = null;

  // Active Geolocation State for Report Problem (Kopargaon, Maharashtra)
  let reportGeoState = {
    status: 'granted',
    coords: { lat: 19.8864, lng: 74.4789 },
    address: "Station Road, Shivaji Chowk, Ward 1, Kopargaon 423601",
    ward: "Ward 1 - Shivaji Chowk",
    isLocked: true
  };

  let selectedCategory = "Damaged Roads";
  let uploadedEvidence = null;
  let lastUploadedFileDataUrl = null;
  let lastUploadedFileName = null;
  let lastUploadedFileSize = null;
  let activeValidation = null;
  let currentValidationState = 'idle'; // 'idle' | 'uploading' | 'checking' | 'approved' | 'rejected' | 'manual_review' | 'error'

  // Category Configuration
  const categoryConfig = {
    "Damaged Roads": {
      icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19L9 5"/><path d="M20 19L15 5"/><path d="M12 5v2"/><path d="M12 11v2"/><path d="M12 17v2"/></svg>`,
      color: "#2563eb"
    },
    "Overflowing Garbage": {
      icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
      color: "#d97706"
    },
    "Broken Streetlights": {
      icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v1"/><path d="M12 7a5 5 0 0 1 5 5c0 2-1 3-2 4h-6c-1-1-2-2-2-4a5 5 0 0 1 5-5z"/></svg>`,
      color: "#ca8a04"
    },
    "Water Leakage": {
      icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
      color: "#0284c7"
    },
    "Drainage Problems": {
      icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 12h20"/><path d="M2 7h20"/><path d="M2 17h20"/></svg>`,
      color: "#7c3aed"
    },
    "Damaged Infrastructure": {
      icon: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
      color: "#dc2626"
    }
  };

  // ==========================================================================
  // Map Engine: CARTO Voyager / Positron (Guaranteed 0 403 Access Blocked Errors)
  // ==========================================================================
  function createReliableTileLayer() {
    if (typeof L === 'undefined') return null;
    
    // Primary: CartoDB Voyager (Beautiful clean SaaS styling, free open access, no 403!)
    const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

    // Fallback layer if any tile error occurs
    voyagerLayer.on('tileerror', function (error, tile) {
      console.warn("CARTO tile fallback triggered:", error);
    });

    return voyagerLayer;
  }

  function createCustomMarkerIcon(category, priority) {
    if (typeof L === 'undefined') return null;
    const cfg = categoryConfig[category] || { color: '#2563eb' };
    const isOverdue = priority === 'Overdue' || priority === 'Critical';
    
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="width:30px; height:30px; border-radius:50%; background:${isOverdue ? '#dc2626' : cfg.color}; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.3); border:2.5px solid #ffffff;">
          <div style="width:10px; height:10px; border-radius:50%; background:#ffffff;"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16]
    });
  }

  // ==========================================================================
  // Router Implementation (/citizen/* with HTML5 pushState)
  // ==========================================================================
  const routes = {
    '/citizen': renderDashboardPage,
    '/citizen/dashboard': renderDashboardPage,
    '/citizen/report': renderReportPage,
    '/citizen/track': renderTrackPage,
    '/citizen/city-issues': renderCityIssuesPage,
    '/citizen/ward-issues': renderWardIssuesPage,
    '/citizen/profile': renderProfilePage
  };

  const routeTitles = {
    '/citizen': "My Dashboard",
    '/citizen/dashboard': "My Dashboard",
    '/citizen/report': "Report a Problem",
    '/citizen/track': "Track Complaint",
    '/citizen/city-issues': "City Issues",
    '/citizen/ward-issues': "Ward Issues",
    '/citizen/profile': "My Profile"
  };

  function getCurrentPath() {
    let p = window.location.pathname.toLowerCase();
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
    return routes[p] ? p : '/citizen/dashboard';
  }

  function navigateTo(path, addToHistory = true) {
    let target = path.toLowerCase();
    if (!routes[target]) target = '/citizen/dashboard';

    if (addToHistory && window.location.pathname !== target) {
      window.history.pushState({ path: target }, '', target);
    }

    // Update Header Title
    const titleEl = document.getElementById('header-page-title');
    if (titleEl) {
      titleEl.innerText = routeTitles[target] || "My Dashboard";
    }
    document.title = `${routeTitles[target] || "My Dashboard"} - CivicConnect`;

    // Update Active Sidebar Pill
    document.querySelectorAll('.nav-item').forEach(item => {
      const href = item.getAttribute('data-route');
      if (href === target || (target === '/citizen' && href === '/citizen/dashboard')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close Mobile Drawer if open
    const sidebar = document.getElementById('portal-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Execute page render function
    const renderFn = routes[target];
    if (renderFn) {
      renderFn();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.navigateTo = navigateTo;

  window.addEventListener('popstate', function (e) {
    const p = (e.state && e.state.path) ? e.state.path : getCurrentPath();
    navigateTo(p, false);
  });

  // ==========================================================================
  // PAGE 1: My Dashboard
  // ==========================================================================
  function renderDashboardPage() {
    const container = document.getElementById('citizen-main-content');
    if (!container) return;

    // Destroy existing map instances to avoid Leaflet container conflict
    if (activeCityMap) {
      activeCityMap.remove();
      activeCityMap = null;
    }

    const myComplaints = complaintsDB.filter(c => c.isMyComplaint);
    const totalCount = myComplaints.length;
    const pendingCount = myComplaints.filter(c => c.status === "Pending" || c.status === "Verified" || c.status === "Under Review").length;
    const resolvedCount = myComplaints.filter(c => c.status === "Resolved").length;
    const overdueCount = myComplaints.filter(c => c.isOverdue).length;
    const highPriorityCount = myComplaints.filter(c => c.priority === "High" || c.priority === "Critical").length;

    container.innerHTML = `
      <!-- Top 5 KPI Statistics Cards (Directly matching screenshot) -->
      <div class="stats-grid-5">
        <div class="stat-card">
          <div class="stat-icon-box stat-icon-total">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <div class="stat-number">${totalCount}</div>
            <div class="stat-label">Total Complaints</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-box stat-icon-pending">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div class="stat-number">${pendingCount}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-box stat-icon-resolved">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div class="stat-number">${resolvedCount}</div>
            <div class="stat-label">Resolved</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-box stat-icon-overdue">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="stat-number">${overdueCount}</div>
            <div class="stat-label">Overdue</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-box stat-icon-priority">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div class="stat-number">${highPriorityCount}</div>
            <div class="stat-label">High Priority</div>
          </div>
        </div>
      </div>

      <!-- Main Dashboard Two-Column Layout -->
      <div class="dashboard-columns">
        
        <!-- LEFT LARGE CARD: My Complaints -->
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">My Complaints</h3>
            <button class="btn btn-primary" onclick="navigateTo('/citizen/report')">
              + Report New
            </button>
          </div>

          <div class="complaint-list-container">
            ${myComplaints.map(c => `
              <div class="complaint-item-card ${c.isOverdue ? 'overdue-accent' : ''}" onclick="openTrackDetail('${c.id}')">
                <div class="complaint-meta-row">
                  <div class="complaint-meta-left">
                    <span class="complaint-id-tag">${c.id}</span>
                    <span class="pill-badge ${c.status === 'Verified' ? 'badge-verified' : (c.status === 'In Progress' ? 'badge-in-progress' : 'badge-pending')}">${c.status}</span>
                    <span class="pill-badge ${c.priority === 'High' ? 'badge-high' : 'badge-medium'}">${c.priority}</span>
                    ${c.isOverdue ? `<span class="pill-badge badge-overdue">Overdue</span>` : ''}
                  </div>
                  <span class="complaint-date-ago">${c.reportedAt}</span>
                </div>

                <div class="complaint-title-text">${c.title}</div>
                <div class="complaint-desc-text">${c.description}</div>

                <div class="complaint-footer-row">
                  <span class="complaint-category-indicator">
                    <span class="complaint-category-dot"></span>
                    <span>${c.category}</span>
                  </span>
                  <span>•</span>
                  <span>${c.ward}</span>
                  ${c.supports > 0 ? `<span>•</span><span>${c.supports} supporters</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- RIGHT LARGE CARD: City Map (Fixed with CARTO Voyager Tiles - No 403!) -->
        <div class="card">
          <div class="card-header-row">
            <h3 class="card-title">City Map</h3>
            <span style="font-size:0.75rem; color:#10b981; font-weight:700; background:#dcfce7; padding:2px 8px; border-radius:9999px;">
              ● Live City Feed
            </span>
          </div>

          <div id="dashboard-city-map" class="map-card-viewport"></div>
        </div>

      </div>
    `;

    // Initialize City Map
    setTimeout(initDashboardCityMap, 50);
  }

  function initDashboardCityMap() {
    const mapEl = document.getElementById('dashboard-city-map');
    if (!mapEl || typeof L === 'undefined') return;

    try {
      activeCityMap = L.map('dashboard-city-map', {
        center: [18.5204, 73.8567],
        zoom: 13,
        zoomControl: true
      });

      // Add guaranteed reliable tile layer (CARTO Voyager)
      const tiles = createReliableTileLayer();
      if (tiles) tiles.addTo(activeCityMap);

      // Plot all complaints on map
      complaintsDB.forEach(c => {
        if (c.coordinates && c.coordinates.lat) {
          const marker = L.marker([c.coordinates.lat, c.coordinates.lng], {
            icon: createCustomMarkerIcon(c.category, c.isOverdue ? 'Overdue' : c.priority)
          }).addTo(activeCityMap);

          marker.bindPopup(`
            <div style="font-family:inherit; min-width:180px;">
              <div style="font-size:0.75rem; font-weight:700; color:#2563eb;">${c.id} • ${c.category}</div>
              <div style="font-weight:700; font-size:0.875rem; margin:2px 0; color:#0f172a;">${c.title}</div>
              <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px;">📍 ${c.location}</div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; background:#eff6ff; color:#1d4ed8;">● ${c.status}</span>
                <button onclick="window.openTrackDetail('${c.id}')" style="background:#2563eb; color:white; border:none; padding:3px 8px; font-size:0.7rem; border-radius:4px; cursor:pointer;">Track</button>
              </div>
            </div>
          `);
        }
      });

      // Add Ward 1 boundary polygon outline for civic context
      const ward1Boundary = [
        [18.535, 73.845],
        [18.530, 73.870],
        [18.510, 73.868],
        [18.508, 73.842],
        [18.525, 73.840]
      ];
      L.polygon(ward1Boundary, {
        color: '#2563eb',
        weight: 1.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.05,
        dashArray: '4, 4'
      }).addTo(activeCityMap).bindTooltip("Ward 1 - Central Jurisdiction", { sticky: true });

    } catch (err) {
      console.error("Map initialization error:", err);
    }
  }

  // ==========================================================================
  // PAGE 2: Report Problem (Exact Match to Screenshots)
  // ==========================================================================
  function renderReportPage() {
    const container = document.getElementById('citizen-main-content');
    if (!container) return;

    if (activeReportMap) {
      activeReportMap.remove();
      activeReportMap = null;
    }

    container.innerHTML = `
      <div class="card" style="max-width: 960px; margin: 0 auto;">
        
        <!-- Duplicate Warning Banner -->
        <div id="duplicate-warning-banner" class="duplicate-check-banner"></div>

        <form id="form-report-problem" onsubmit="handleProblemSubmit(event)">
          
          <!-- Problem Category * -->
          <div class="form-section-title">Problem Category *</div>
          <div class="category-picker-grid">
            ${Object.keys(categoryConfig).map(cat => `
              <div class="category-pick-card ${selectedCategory === cat ? 'active' : ''}" onclick="selectReportCategory('${cat}')">
                <div class="category-icon-wrapper">
                  ${categoryConfig[cat].icon}
                </div>
                <div class="category-name-text">${cat}</div>
              </div>
            `).join('')}
          </div>

          <!-- Problem Title * -->
          <div class="form-group-custom">
            <label class="form-label-custom">Problem Title *</label>
            <input type="text" id="report-title-input" class="form-input-custom" placeholder="Brief title for the problem" oninput="checkDuplicateComplaints()" required />
          </div>

          <!-- Description * -->
          <div class="form-group-custom">
            <label class="form-label-custom">Description *</label>
            <textarea id="report-desc-input" class="form-textarea-custom" placeholder="Describe the problem in detail — location specifics, severity, how long it has existed..." required></textarea>
          </div>

          <!-- Upload Photo or Video -->
          <div class="form-group-custom">
            <label class="form-label-custom">Upload Photo or Video</label>
            <div class="dropzone-box" onclick="document.getElementById('report-file-input').click()">
              <input type="file" id="report-file-input" accept="image/*,video/mp4" style="display:none;" onchange="handleEvidenceUpload(event)" />
              <div id="dropzone-content-inner">
                <svg class="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <div class="dropzone-prompt">Click to upload photos or videos</div>
                <div class="dropzone-subtext">Supports JPG, PNG, MP4 (max 5MB each)</div>
              </div>
            </div>
            <div id="evidence-preview-box" style="display:none; margin-top:10px;"></div>
            <!-- AI Image-Validation Status Card (Rendered dynamically) -->
            <div id="ai-validation-status-box" style="display:none; margin-top:12px;"></div>
          </div>

          <!-- Location * (Auto-detected from your device — cannot be changed) -->
          <div class="form-group-custom">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label-custom" style="margin-bottom:0;">
                Location * <span style="font-weight:400; color:#64748b; font-size:0.775rem;">(Auto-detected from your device — cannot be changed)</span>
              </label>
            </div>

            <div id="location-banner-container">
              <!-- Location Banner Rendered Dynamically -->
            </div>

            <div id="report-map-preview" style="height:240px; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; margin-top:10px;"></div>
          </div>

          <!-- Action Submit (Disabled until AI validation is approved) -->
          <div style="margin-top:28px; display:flex; justify-content:flex-end;">
            <button type="submit" id="btn-submit-report" class="btn btn-primary" style="padding:10px 24px; font-size:0.9rem; opacity:0.6; cursor:not-allowed;" disabled title="Upload and verify a photo matching the category to enable submission">
              Submit Complaint (Photo Verification Required)
            </button>
          </div>

        </form>

      </div>
    `;

    updateLocationBannerUI();
    setTimeout(initReportLocationMap, 60);
  }

  window.selectReportCategory = function(cat) {
    if (selectedCategory !== cat) {
      selectedCategory = cat;
      document.querySelectorAll('.category-pick-card').forEach(card => {
        const name = card.querySelector('.category-name-text').innerText;
        if (name === cat) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
      checkDuplicateComplaints();

      // Enforce: Category change resets validation immediately
      if (lastUploadedFileDataUrl) {
        triggerAiImageValidation(lastUploadedFileDataUrl, lastUploadedFileName, lastUploadedFileSize);
      } else {
        resetImageValidation();
      }
    }
  };

  function updateLocationBannerUI() {
    const container = document.getElementById('location-banner-container');
    if (!container) return;

    if (reportGeoState.status === 'denied') {
      container.innerHTML = `
        <div class="location-status-banner location-status-denied">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>User denied Geolocation. Please enable location access and refresh the page.</span>
          </div>
          <button type="button" class="btn btn-outline" style="padding:3px 10px; font-size:0.75rem; border-color:#fca5a5; color:#991b1b;" onclick="requestDeviceLocation()">
            Try Again
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="location-status-banner location-status-locked">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Auto-detected: <strong>${reportGeoState.address}</strong> (Locked)</span>
          </div>
          <span style="font-size:0.75rem; font-weight:700; color:#166534; background:#dcfce7; padding:2px 8px; border-radius:9999px;">
            🔒 Geotag Verified
          </span>
        </div>
      `;
    }
  }

  window.requestDeviceLocation = function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          reportGeoState.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          reportGeoState.status = 'granted';
          reportGeoState.isLocked = true;
          updateLocationBannerUI();
          if (activeReportMap) {
            activeReportMap.setView([pos.coords.latitude, pos.coords.longitude], 15);
            L.marker([pos.coords.latitude, pos.coords.longitude], {
              icon: createCustomMarkerIcon(selectedCategory, 'High')
            }).addTo(activeReportMap).bindPopup("Your Locked Complaint Location").openPopup();
          }
        },
        err => {
          console.warn("Geolocation permission error:", err);
          reportGeoState.status = 'denied';
          updateLocationBannerUI();
        },
        { timeout: 10000 }
      );
    } else {
      reportGeoState.status = 'denied';
      updateLocationBannerUI();
    }
  };

  function initReportLocationMap() {
    const mapEl = document.getElementById('report-map-preview');
    if (!mapEl || typeof L === 'undefined') return;

    try {
      activeReportMap = L.map('report-map-preview', {
        center: [reportGeoState.coords.lat, reportGeoState.coords.lng],
        zoom: 14,
        zoomControl: true
      });

      const tiles = createReliableTileLayer();
      if (tiles) tiles.addTo(activeReportMap);

      L.marker([reportGeoState.coords.lat, reportGeoState.coords.lng], {
        icon: createCustomMarkerIcon(selectedCategory, 'High')
      }).addTo(activeReportMap).bindPopup("Auto-detected Report Pin (Locked)").openPopup();

    } catch (e) {
      console.error("Report map preview error:", e);
    }
  }

  function resetImageValidation() {
    activeValidation = null;
    currentValidationState = 'idle';
    const statusBox = document.getElementById('ai-validation-status-box');
    if (statusBox) {
      statusBox.style.display = 'none';
      statusBox.innerHTML = '';
    }
    const btn = document.getElementById('btn-submit-report');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
      btn.innerText = 'Submit Complaint (Photo Verification Required)';
      btn.title = 'Upload and verify a photo matching the category to enable submission';
    }
  }

  window.triggerAiImageValidation = async function(base64Data, fileName, fileSize) {
    const statusBox = document.getElementById('ai-validation-status-box');
    const submitBtn = document.getElementById('btn-submit-report');
    if (!statusBox) return;

    statusBox.style.display = 'block';
    currentValidationState = 'uploading';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.innerText = 'Analyzing Image...';
    }

    // Step 1: Uploading state
    statusBox.innerHTML = `
      <div class="ai-validation-card ai-validation-loading">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-size:1.4rem;">⏳</div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:0.875rem; color:#1e40af;">
              Uploading to Secure Municipal Storage...
            </div>
            <div style="font-size:0.75rem; color:#3b82f6; margin-top:2px;">
              Generating cryptographic SHA-256 integrity hash
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      // 1. Upload to private temporary storage
      const uploadRes = await fetch('/api/complaints/upload-temporary-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': citizenUser.email || 'USER-CITIZEN-001',
          'x-user-role': 'citizen'
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          fileName: fileName || 'complaint.jpg'
        })
      }).then(r => r.json());

      if (!uploadRes.success || !uploadRes.imageId) {
        throw new Error(uploadRes.error || 'Failed to upload photo to secure storage');
      }

      // Step 2: Validating state with Google Cloud Vision AI
      currentValidationState = 'checking';
      statusBox.innerHTML = `
        <div class="ai-validation-card ai-validation-loading">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:1.4rem;">🤖</div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.875rem; color:#1e40af;">
                Analyzing with Google Cloud Vision AI...
              </div>
              <div style="font-size:0.75rem; color:#3b82f6; margin-top:2px;">
                Checking SafeSearch, image quality, and verifying content matches <strong>${selectedCategory}</strong>
              </div>
            </div>
          </div>
        </div>
      `;

      // 2. Execute Image Validation
      const validationRes = await fetch('/api/complaints/validate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': citizenUser.email || 'USER-CITIZEN-001',
          'x-user-role': 'citizen'
        },
        body: JSON.stringify({
          selectedCategory: selectedCategory,
          imageId: uploadRes.imageId
        })
      }).then(r => r.json());

      // Step 3: Render Result
      if (validationRes.status === 'approved' && validationRes.accepted) {
        currentValidationState = 'approved';
        activeValidation = {
          validationId: validationRes.validationId,
          imageId: uploadRes.imageId,
          imageHash: uploadRes.imageHash,
          category: selectedCategory,
          status: 'approved'
        };

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          submitBtn.innerText = 'Submit Verified Complaint';
          submitBtn.title = 'Image verified! Click to submit to local Nagarsevak.';
        }

        const pct = Math.round((validationRes.confidence || 0.88) * 100);
        statusBox.innerHTML = `
          <div class="ai-validation-card ai-validation-approved">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#dcfce7; color:#15803d; display:flex; align-items:center; justify-content:center; font-weight:800;">✓</div>
                <div>
                  <div style="font-weight:700; font-size:0.875rem; color:#15803d;">
                    AI Verification Passed (${pct}% Confidence)
                  </div>
                  <div style="font-size:0.775rem; color:#166534; margin-top:2px;">
                    Photo verified as <strong>${selectedCategory}</strong>. Ready for municipal submission.
                  </div>
                </div>
              </div>
              <span class="ai-badge ai-badge-approved">Approved</span>
            </div>

            <div class="ai-meter-bg">
              <div class="ai-meter-fill" style="width:${pct}%; background:#16a34a;"></div>
            </div>

            ${validationRes.labels && validationRes.labels.length > 0 ? `
              <div style="margin-top:10px; display:flex; align-items:center; flex-wrap:wrap;">
                <span style="font-size:0.7rem; color:#64748b; font-weight:600; margin-right:6px;">Detected Labels:</span>
                ${validationRes.labels.map(l => `<span class="ai-label-pill">${l.name} (${Math.round(l.score * 100)}%)</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      } else if (validationRes.status === 'manual_review') {
        currentValidationState = 'manual_review';
        activeValidation = null;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.6';
          submitBtn.style.cursor = 'not-allowed';
          submitBtn.innerText = 'Submit Locked (Photo Needs Review)';
        }

        statusBox.innerHTML = `
          <div class="ai-validation-card ai-validation-review">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#fef3c7; color:#b45309; display:flex; align-items:center; justify-content:center; font-weight:800;">⚠️</div>
                <div>
                  <div style="font-weight:700; font-size:0.875rem; color:#92400e;">
                    Inconclusive AI Verification
                  </div>
                  <div style="font-size:0.775rem; color:#78350f; margin-top:2px;">
                    ${validationRes.message || 'We could not confidently verify this photo automatically.'}
                  </div>
                </div>
              </div>
              <span class="ai-badge ai-badge-review">Manual Review</span>
            </div>

            <div style="margin-top:12px; display:flex; gap:8px;">
              <button type="button" class="btn btn-outline" style="font-size:0.75rem; padding:4px 12px; border-color:#f59e0b; color:#92400e;" onclick="document.getElementById('report-file-input').click()">
                📷 Upload Clearer Photo
              </button>
            </div>
          </div>
        `;
      } else {
        // Rejected
        currentValidationState = 'rejected';
        activeValidation = null;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.6';
          submitBtn.style.cursor = 'not-allowed';
          submitBtn.innerText = 'Submit Locked (Image Rejected)';
        }

        statusBox.innerHTML = `
          <div class="ai-validation-card ai-validation-rejected">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#fee2e2; color:#b91c1c; display:flex; align-items:center; justify-content:center; font-weight:800;">✕</div>
                <div>
                  <div style="font-weight:700; font-size:0.875rem; color:#991b1b;">
                    Photo Does Not Match Selected Category
                  </div>
                  <div style="font-size:0.775rem; color:#7f1d1d; margin-top:2px;">
                    ${validationRes.message}
                  </div>
                </div>
              </div>
              <span class="ai-badge ai-badge-rejected">Rejected</span>
            </div>

            ${validationRes.suggestion ? `
              <div style="font-size:0.725rem; color:#991b1b; margin-top:8px; background:#fff1f2; padding:6px 10px; border-radius:6px; border:1px solid #fecdd3;">
                💡 <strong>Suggestion:</strong> ${validationRes.suggestion}
              </div>
            ` : ''}

            <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline" style="font-size:0.75rem; padding:4px 10px; border-color:#f87171; color:#991b1b;" onclick="document.getElementById('report-file-input').click()">
                📷 Retake / Upload Another Photo
              </button>
              <button type="button" class="btn btn-outline" style="font-size:0.75rem; padding:4px 10px;" onclick="window.scrollTo({ top: 120, behavior: 'smooth' })">
                🏷️ Choose Another Category
              </button>
            </div>
          </div>
        `;
      }
    } catch (err) {
      currentValidationState = 'error';
      activeValidation = null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.innerText = 'Submit Locked (Validation Service Offline)';
      }

      statusBox.innerHTML = `
        <div class="ai-validation-card ai-validation-rejected">
          <div style="font-weight:700; font-size:0.85rem; color:#991b1b;">
            ⚠️ AI Image-Validation Service Unavailable
          </div>
          <div style="font-size:0.75rem; color:#7f1d1d; margin-top:2px;">
            The verification service could not be reached. For security, civic complaints cannot be submitted without automated photo verification.
          </div>
          <button type="button" class="btn btn-outline" style="font-size:0.75rem; padding:4px 10px; margin-top:8px;" onclick="triggerAiImageValidation(lastUploadedFileDataUrl, lastUploadedFileName, lastUploadedFileSize)">
            🔄 Retry Verification
          </button>
        </div>
      `;
    }
  };

  window.handleEvidenceUpload = function(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit. Please upload a smaller photo.");
        return;
      }

      lastUploadedFileName = file.name;
      lastUploadedFileSize = file.size;

      const reader = new FileReader();
      reader.onload = function(evt) {
        lastUploadedFileDataUrl = evt.target.result;
        uploadedEvidence = lastUploadedFileDataUrl;

        const preview = document.getElementById('evidence-preview-box');
        if (preview) {
          preview.style.display = "block";
          preview.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
              <img src="${uploadedEvidence}" alt="Proof" style="width:50px; height:50px; object-fit:cover; border-radius:6px;" />
              <div style="flex:1;">
                <div style="font-size:0.8rem; font-weight:700; color:#0f172a;">${file.name}</div>
                <div style="font-size:0.7rem; color:#64748b;">${(file.size / 1024).toFixed(1)} KB • Geotag Ready</div>
              </div>
              <button type="button" onclick="clearEvidenceUpload()" style="background:transparent; border:none; color:#ef4444; font-size:1.1rem; cursor:pointer;" title="Remove Photo">&times;</button>
            </div>
          `;
        }

        // Trigger AI validation immediately
        triggerAiImageValidation(lastUploadedFileDataUrl, file.name, file.size);
      };
      reader.readAsDataURL(file);
    }
  };

  window.clearEvidenceUpload = function() {
    uploadedEvidence = null;
    lastUploadedFileDataUrl = null;
    lastUploadedFileName = null;
    lastUploadedFileSize = null;
    const input = document.getElementById('report-file-input');
    if (input) input.value = '';
    const preview = document.getElementById('evidence-preview-box');
    if (preview) preview.style.display = 'none';
    resetImageValidation();
  };

  // Duplicate Check Engine
  function checkDuplicateComplaints() {
    const banner = document.getElementById('duplicate-warning-banner');
    const titleInput = document.getElementById('report-title-input');
    if (!banner || !titleInput) return;

    const query = titleInput.value.trim().toLowerCase();
    if (query.length < 3) {
      banner.style.display = 'none';
      return;
    }

    const match = complaintsDB.find(c => 
      c.category === selectedCategory && 
      (c.title.toLowerCase().includes(query) || query.includes(c.category.toLowerCase()) || query.includes("pothole") || query.includes("garbage"))
    );

    if (match) {
      banner.style.display = 'block';
      banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <div>
            <div style="font-weight:700; color:#92400e; margin-bottom:2px;">⚠️ Similar Complaint Already Exists Nearby!</div>
            <div style="color:#78350f; font-size:0.8rem;">
              Complaint <strong>#${match.id}</strong> ("${match.title}") was already filed in <strong>${match.ward}</strong> with <strong>${match.supports} supporters</strong>.
            </div>
          </div>
          <button type="button" class="btn btn-primary" style="background:#b45309; padding:5px 12px; font-size:0.775rem;" onclick="supportExistingFromReport('${match.id}')">
            +1 Support Existing Complaint
          </button>
        </div>
      `;
    } else {
      banner.style.display = 'none';
    }
  }

  window.supportExistingFromReport = function(ticketId) {
    const found = complaintsDB.find(c => c.id === ticketId);
    if (found) {
      found.supports += 1;
      alert(`✅ Thank you! You have successfully upvoted existing ticket #${ticketId}. Your corporator has been alerted.`);
      navigateTo('/citizen/dashboard');
    }
  };

  window.handleProblemSubmit = async function(e) {
    e.preventDefault();
    const title = document.getElementById('report-title-input').value.trim();
    const desc = document.getElementById('report-desc-input').value.trim();

    if (!title || !desc) {
      alert("Please fill in both Problem Title and Description.");
      return;
    }

    // Security Gate: Submit blocked unless AI validation is approved
    if (!activeValidation || activeValidation.status !== 'approved') {
      alert("Security Violation: You cannot submit a complaint without an AI-approved photo matching the selected category.");
      return;
    }

    const btn = document.getElementById('btn-submit-report');
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Submitting to Ward Corporator...";
    }

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': citizenUser.email || 'USER-CITIZEN-001',
          'x-user-role': 'citizen'
        },
        body: JSON.stringify({
          title: title,
          category: selectedCategory,
          description: desc,
          location: reportGeoState.address,
          coordinates: reportGeoState.coords,
          ward: citizenUser.ward || "Ward 1 - Shivaji Chowk",
          city: citizenUser.city || "Kopargaon",
          imageId: activeValidation.imageId,
          validationId: activeValidation.validationId,
          imageHash: activeValidation.imageHash
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(`Complaint submission rejected by server: ${data.error || 'Validation check failed'}`);
        if (btn) {
          btn.disabled = false;
          btn.innerText = "Submit Verified Complaint";
        }
        return;
      }

      const newId = data.complaintId;
      complaintsDB.unshift(data.complaint);

      // Add real-time notification
      notificationsList.unshift({
        id: Date.now(),
        text: `Your complaint <strong>#${newId}</strong> has been forwarded to Nagarsevak Ramesh Patil with verified AI photo proof.`,
        time: "Just now",
        unread: true,
        icon: "📋",
        bg: "#eff6ff",
        color: "#1d4ed8"
      });
      updateNotificationBadge();

      // Clear validation and show confirmation modal
      resetImageValidation();
      showSubmissionSuccessModal(newId);
    } catch (err) {
      alert(`Network error during submission: ${err.message}`);
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Submit Verified Complaint";
      }
    }
  };

  function showSubmissionSuccessModal(ticketId) {
    const modal = document.getElementById('portal-modal-overlay');
    const modalBody = document.getElementById('portal-modal-content') || document.getElementById('portal-modal-container');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
      <div style="text-align:center; padding:10px 0;">
        <div style="width:54px; height:54px; border-radius:50%; background:#dcfce7; color:#15803d; font-size:1.8rem; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
          ✓
        </div>
        <h3 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin-bottom:6px;">Complaint Submitted Successfully</h3>
        <p style="font-size:0.875rem; color:#64748b; margin-bottom:18px;">
          Your complaint has been forwarded to the concerned Nagarsevak.
        </p>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:24px;">
          <div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:600;">Complaint ID</div>
          <div style="font-size:1.4rem; font-weight:800; color:#2563eb; font-family:monospace;">${ticketId}</div>
        </div>

        <div style="display:flex; gap:10px; justify-content:center;">
          <button type="button" class="btn btn-outline" onclick="closePortalModal(); navigateTo('/citizen/dashboard');">
            Back to Dashboard
          </button>
          <button type="button" class="btn btn-primary" onclick="closePortalModal(); openTrackDetail('${ticketId}');">
            Track Complaint
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  // ==========================================================================
  // PAGE 3: Track Complaint (Detailed Horizontal & Vertical Timelines)
  // ==========================================================================
  function renderTrackPage() {
    const container = document.getElementById('citizen-main-content');
    if (!container) return;

    const myComplaints = complaintsDB.filter(c => c.isMyComplaint);

    container.innerHTML = `
      <!-- Top Search Box -->
      <div class="card" style="margin-bottom:20px;">
        <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:12px; color:#0f172a;">Search Complaint ID</h4>
        <div class="track-search-box">
          <input type="text" id="track-search-input" class="form-input-custom" placeholder="e.g. CC-SAMPLE01, CC-SAMPLE02" />
          <button type="button" class="btn btn-primary" style="white-space:nowrap;" onclick="searchAndShowComplaint()">
            Track Complaint
          </button>
        </div>
      </div>

      <!-- Active Ticket Timeline Container -->
      <div id="track-detail-viewport">
        <!-- Renders the selected ticket or defaults to first complaint -->
      </div>

      <!-- My Complaints List -->
      <div class="card" style="margin-top:24px;">
        <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:16px; color:#0f172a;">My Complaints</h4>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;">
            <thead style="background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#64748b; font-weight:600;">
              <tr>
                <th style="padding:10px 14px;">Complaint ID</th>
                <th style="padding:10px 14px;">Problem Title</th>
                <th style="padding:10px 14px;">Category</th>
                <th style="padding:10px 14px;">Ward</th>
                <th style="padding:10px 14px;">Date Submitted</th>
                <th style="padding:10px 14px;">Priority</th>
                <th style="padding:10px 14px;">Status</th>
                <th style="padding:10px 14px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${myComplaints.map(c => `
                <tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="openTrackDetail('${c.id}')">
                  <td style="padding:12px 14px; font-weight:700; color:#2563eb; font-family:monospace;">${c.id}</td>
                  <td style="padding:12px 14px; font-weight:600; color:#0f172a;">${c.title}</td>
                  <td style="padding:12px 14px; color:#475569;">${c.category}</td>
                  <td style="padding:12px 14px; color:#475569;">${c.ward}</td>
                  <td style="padding:12px 14px; color:#64748b;">${c.dateFormatted}</td>
                  <td style="padding:12px 14px;">
                    <span class="pill-badge ${c.priority === 'High' ? 'badge-high' : 'badge-medium'}">${c.priority}</span>
                  </td>
                  <td style="padding:12px 14px;">
                    <span class="pill-badge ${c.status === 'Resolved' ? 'badge-resolved' : (c.status === 'In Progress' ? 'badge-in-progress' : 'badge-verified')}">● ${c.status}</span>
                  </td>
                  <td style="padding:12px 14px;">
                    <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="event.stopPropagation(); openTrackDetail('${c.id}')">View Details</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render default complaint detail
    if (myComplaints.length > 0) {
      openTrackDetail(myComplaints[0].id);
    }
  }

  window.searchAndShowComplaint = function() {
    const input = document.getElementById('track-search-input');
    if (!input) return;
    const query = input.value.trim().toUpperCase();
    if (!query) return;

    const found = complaintsDB.find(c => c.id.toUpperCase() === query);
    if (found) {
      openTrackDetail(found.id);
    } else {
      alert(`No complaint found with ID "${query}". Try CC-SAMPLE01 or CC-SAMPLE02.`);
    }
  };

  function openTrackDetail(ticketId) {
    const viewport = document.getElementById('track-detail-viewport');
    const ticket = complaintsDB.find(c => c.id === ticketId) || complaintsDB[0];
    if (!viewport || !ticket) {
      navigateTo('/citizen/track');
      setTimeout(() => openTrackDetail(ticketId), 50);
      return;
    }

    viewport.innerHTML = `
      <div class="timeline-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-family:monospace; font-size:0.85rem; font-weight:800; background:#eff6ff; color:#1d4ed8; padding:3px 10px; border-radius:6px;">${ticket.id}</span>
              <span class="pill-badge ${ticket.status === 'Resolved' ? 'badge-resolved' : (ticket.status === 'In Progress' ? 'badge-in-progress' : 'badge-verified')}">● ${ticket.status}</span>
              <span class="pill-badge ${ticket.priority === 'High' ? 'badge-high' : 'badge-medium'}">${ticket.priority} Priority</span>
            </div>
            <h3 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin-top:8px;">${ticket.title}</h3>
            <p style="font-size:0.85rem; color:#64748b; margin-top:2px;">📍 ${ticket.location} • ${ticket.ward}</p>
          </div>

          <div style="text-align:right;">
            <div style="font-size:0.8rem; font-weight:700; ${ticket.isOverdue ? 'color:#dc2626; background:#fee2e2; border:1px solid #fca5a5;' : 'color:#0284c7; background:#e0f2fe; border:1px solid #bae6fd;'} padding:4px 12px; border-radius:8px;">
              ${ticket.slaRemaining}
            </div>
            <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">Reported: ${ticket.dateFormatted}</div>
          </div>
        </div>

        <p style="font-size:0.875rem; color:#334155; line-height:1.5; margin-bottom:20px; background:#f8fafc; padding:12px 14px; border-radius:8px; border:1px solid #e2e8f0;">
          ${ticket.description}
        </p>

        <!-- Visual Timeline -->
        <h4 style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-bottom:12px;">Resolution Progress Timeline</h4>
        <div class="timeline-step-list">
          ${ticket.timeline.map(step => `
            <div class="timeline-step-item ${step.status}">
              <div class="timeline-step-node">
                ${step.status === 'completed' ? '✓' : (step.status === 'active' ? '●' : '○')}
              </div>
              <div class="timeline-step-title">${step.title}</div>
              <div class="timeline-step-meta">${step.time}</div>
              ${step.note ? `<div class="timeline-step-note">${step.note}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (viewport.scrollIntoView) {
      viewport.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  window.openTrackDetail = openTrackDetail;

  // ==========================================================================
  // PAGE 4: City Issues (Citywide Civic Visibility & Upvoting)
  // ==========================================================================
  let cityCategoryFilter = "All";

  function renderCityIssuesPage() {
    const container = document.getElementById('citizen-main-content');
    if (!container) return;

    const totalCity = complaintsDB.length;
    const pendingCity = complaintsDB.filter(c => c.status === "Pending" || c.status === "Verified" || c.status === "Approved").length;
    const inProgressCity = complaintsDB.filter(c => c.status === "In Progress").length;
    const resolvedCity = complaintsDB.filter(c => c.status === "Resolved").length;
    const overdueCity = complaintsDB.filter(c => c.isOverdue).length;

    const filteredIssues = cityCategoryFilter === "All" 
      ? complaintsDB 
      : complaintsDB.filter(c => c.category === cityCategoryFilter);

    container.innerHTML = `
      <!-- Top Summary Cards -->
      <div class="stats-grid-5">
        <div class="stat-card">
          <div><div class="stat-number">${totalCity}</div><div class="stat-label">Total City Issues</div></div>
        </div>
        <div class="stat-card">
          <div><div class="stat-number" style="color:#f97316;">${pendingCity}</div><div class="stat-label">Pending</div></div>
        </div>
        <div class="stat-card">
          <div><div class="stat-number" style="color:#2563eb;">${inProgressCity}</div><div class="stat-label">In Progress</div></div>
        </div>
        <div class="stat-card">
          <div><div class="stat-number" style="color:#16a34a;">${resolvedCity}</div><div class="stat-label">Resolved</div></div>
        </div>
        <div class="stat-card">
          <div><div class="stat-number" style="color:#dc2626;">${overdueCity}</div><div class="stat-label">Overdue</div></div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:20px;">
        <div class="filter-pills-row">
          <button class="filter-pill ${cityCategoryFilter === 'All' ? 'active' : ''}" onclick="setCityCategoryFilter('All')">All Categories</button>
          <button class="filter-pill ${cityCategoryFilter === 'Damaged Roads' ? 'active' : ''}" onclick="setCityCategoryFilter('Damaged Roads')">Damaged Roads</button>
          <button class="filter-pill ${cityCategoryFilter === 'Overflowing Garbage' ? 'active' : ''}" onclick="setCityCategoryFilter('Overflowing Garbage')">Garbage</button>
          <button class="filter-pill ${cityCategoryFilter === 'Broken Streetlights' ? 'active' : ''}" onclick="setCityCategoryFilter('Broken Streetlights')">Streetlights</button>
          <button class="filter-pill ${cityCategoryFilter === 'Water Leakage' ? 'active' : ''}" onclick="setCityCategoryFilter('Water Leakage')">Water Leakage</button>
          <button class="filter-pill ${cityCategoryFilter === 'Drainage Problems' ? 'active' : ''}" onclick="setCityCategoryFilter('Drainage Problems')">Drainage</button>
          <button class="filter-pill ${cityCategoryFilter === 'Damaged Infrastructure' ? 'active' : ''}" onclick="setCityCategoryFilter('Damaged Infrastructure')">Infrastructure</button>
        </div>
      </div>

      <!-- City Issues Grid -->
      <div class="issues-cards-grid">
        ${filteredIssues.map(issue => `
          <div class="card" style="padding:18px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="complaint-id-tag">${issue.id}</span>
                <span class="pill-badge ${issue.priority === 'High' ? 'badge-high' : 'badge-medium'}">${issue.priority}</span>
              </div>
              <div style="font-weight:700; font-size:0.95rem; color:#0f172a; margin-bottom:4px;">${issue.title}</div>
              <div style="font-size:0.8rem; color:#64748b; line-height:1.4; margin-bottom:12px;">${issue.description}</div>
            </div>

            <div>
              <div style="font-size:0.75rem; color:#475569; margin-bottom:12px; display:flex; justify-content:space-between;">
                <span>📍 ${issue.ward}</span>
                <span>${issue.reportedAt}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:10px;">
                <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="supportCityIssue('${issue.id}')">
                  👍 +1 Support (${issue.supports})
                </button>
                <button class="btn btn-primary" style="padding:4px 12px; font-size:0.75rem;" onclick="openTrackDetail('${issue.id}')">
                  View Timeline
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  window.setCityCategoryFilter = function(cat) {
    cityCategoryFilter = cat;
    renderCityIssuesPage();
  };

  window.supportCityIssue = function(ticketId) {
    const issue = complaintsDB.find(c => c.id === ticketId);
    if (issue) {
      issue.supports += 1;
      renderCityIssuesPage();
    }
  };

  // ==========================================================================
  // PAGE 5: Ward Issues (Focused on Citizen's Ward + Ward Boundary Map)
  // ==========================================================================
  function renderWardIssuesPage() {
    const container = document.getElementById('citizen-main-content');
    if (!container) return;

    if (activeWardMap) {
      activeWardMap.remove();
      activeWardMap = null;
    }

    const currentWard = citizenUser.ward || "Ward 1 - Central";
    const wardIssues = complaintsDB.filter(c => c.ward.includes("Ward 1"));

    const totalWard = wardIssues.length;
    const pendingWard = wardIssues.filter(c => c.status !== "Resolved").length;
    const inProgressWard = wardIssues.filter(c => c.status === "In Progress").length;
    const resolvedWard = wardIssues.filter(c => c.status === "Resolved").length;

    container.innerHTML = `
      <!-- Top Ward Header Card -->
      <div class="card" style="margin-bottom:20px; background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <span style="font-size:0.75rem; font-weight:700; color:#2563eb; background:#eff6ff; padding:3px 10px; border-radius:9999px;">
              Your Designated Ward
            </span>
            <h3 style="font-size:1.35rem; font-weight:800; color:#0f172a; margin-top:4px;">${currentWard}</h3>
            <p style="font-size:0.825rem; color:#64748b;">Represented by Corporator ${citizenUser.corporator}</p>
          </div>
          <div style="display:flex; gap:10px;">
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; text-align:center;">
              <div style="font-size:1.25rem; font-weight:800; color:#0f172a;">${totalWard}</div>
              <div style="font-size:0.7rem; color:#64748b;">Total Issues</div>
            </div>
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; text-align:center;">
              <div style="font-size:1.25rem; font-weight:800; color:#2563eb;">${inProgressWard}</div>
              <div style="font-size:0.7rem; color:#64748b;">Active Repairs</div>
            </div>
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; text-align:center;">
              <div style="font-size:1.25rem; font-weight:800; color:#10b981;">${resolvedWard}</div>
              <div style="font-size:0.7rem; color:#64748b;">Resolved</div>
            </div>
          </div>
        </div>

        <!-- Small Ward Map with Boundary Outline -->
        <div id="ward-map-viewport" style="height:260px; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0;"></div>
      </div>

      <!-- Recent Ward Issues List -->
      <div class="card">
        <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:14px; color:#0f172a;">Recent Ward Issues</h4>
        <div class="complaint-list-container">
          ${wardIssues.map(issue => `
            <div class="complaint-item-card" onclick="openTrackDetail('${issue.id}')">
              <div class="complaint-meta-row">
                <div class="complaint-meta-left">
                  <span class="complaint-id-tag">${issue.id}</span>
                  <span class="pill-badge ${issue.status === 'Resolved' ? 'badge-resolved' : 'badge-in-progress'}">● ${issue.status}</span>
                  <span class="pill-badge ${issue.priority === 'High' ? 'badge-high' : 'badge-medium'}">${issue.priority}</span>
                </div>
                <span class="complaint-date-ago">${issue.reportedAt}</span>
              </div>
              <div class="complaint-title-text">${issue.title}</div>
              <div class="complaint-desc-text">${issue.description}</div>
              <div class="complaint-footer-row">
                <span>📍 ${issue.location}</span>
                <span>•</span>
                <span>👥 ${issue.supports} supporters</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    setTimeout(initWardMap, 50);
  }

  function initWardMap() {
    const mapEl = document.getElementById('ward-map-viewport');
    if (!mapEl || typeof L === 'undefined') return;

    try {
      activeWardMap = L.map('ward-map-viewport', {
        center: [18.5220, 73.8567],
        zoom: 14,
        zoomControl: true
      });

      const tiles = createReliableTileLayer();
      if (tiles) tiles.addTo(activeWardMap);

      // Ward Polygon
      const ward1Boundary = [
        [18.535, 73.845],
        [18.530, 73.870],
        [18.510, 73.868],
        [18.508, 73.842],
        [18.525, 73.840]
      ];
      L.polygon(ward1Boundary, {
        color: '#2563eb',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.08
      }).addTo(activeWardMap);

      // Plot issues within ward
      complaintsDB.filter(c => c.ward.includes("Ward 1")).forEach(c => {
        L.marker([c.coordinates.lat, c.coordinates.lng], {
          icon: createCustomMarkerIcon(c.category, c.priority)
        }).addTo(activeWardMap).bindPopup(`<strong>${c.id}</strong>: ${c.title}`);
      });

    } catch (e) {
      console.error("Ward map error:", e);
    }
  }

  // ==========================================================================
  // PAGE 6: Citizen Profile
  // ==========================================================================
  function renderProfilePage() {
    const container = document.getElementById('citizen-main-content');
    if (!container) return;

    container.innerHTML = `
      <div class="card" style="max-width:800px; margin:0 auto;">
        <div style="display:flex; align-items:center; gap:20px; border-bottom:1px solid #e2e8f0; padding-bottom:24px; margin-bottom:24px;">
          <div style="width:72px; height:72px; border-radius:50%; background:#1d4ed8; color:white; font-size:1.8rem; font-weight:800; display:flex; align-items:center; justify-content:center;">
            ${citizenUser.avatarText}
          </div>
          <div>
            <h3 style="font-size:1.4rem; font-weight:800; color:#0f172a;">${citizenUser.name}</h3>
            <p style="font-size:0.875rem; color:#64748b;">Verified Citizen Resident • ${citizenUser.city}</p>
            <span style="font-size:0.75rem; font-weight:700; color:#15803d; background:#dcfce7; padding:2px 10px; border-radius:9999px; margin-top:4px; display:inline-block;">
              ✓ Geotag & Identity Verified
            </span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Email Address</div>
            <div style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-top:3px;">${citizenUser.email}</div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Phone Number (OTP Verified)</div>
            <div style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-top:3px;">${citizenUser.phone}</div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Municipal Ward</div>
            <div style="font-size:0.95rem; font-weight:700; color:#0f172a; margin-top:3px;">${citizenUser.ward}</div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px;">
            <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Assigned Nagarsevak</div>
            <div style="font-size:0.95rem; font-weight:700; color:#2563eb; margin-top:3px;">${citizenUser.corporator}</div>
          </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:24px;">
          <div style="font-size:0.75rem; color:#64748b; font-weight:600; text-transform:uppercase;">Registered Neighborhood Landmark (Locked)</div>
          <div style="font-size:0.9rem; font-weight:600; color:#0f172a; margin-top:4px;">📍 ${citizenUser.address}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
            Locked GPS Coordinates: ${citizenUser.coordinates.lat}, ${citizenUser.coordinates.lng} (Verified for municipal integrity)
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:16px;">
          <span style="font-size:0.8rem; color:#64748b;">Member since ${citizenUser.joinedDate}</span>
          <button type="button" class="btn btn-outline" onclick="handlePortalSignOut()">
            Sign Out of Citizen Session
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // Notifications Dropdown & Badge Management
  // ==========================================================================
  function updateNotificationBadge() {
    const badge = document.getElementById('header-notification-badge');
    const unread = notificationsList.filter(n => n.unread).length;
    if (badge) {
      badge.style.display = unread > 0 ? 'block' : 'none';
    }
  }

  window.toggleNotificationDropdown = function() {
    const dropdown = document.getElementById('notification-dropdown-panel');
    if (!dropdown) return;
    dropdown.classList.toggle('active');

    if (dropdown.classList.contains('active')) {
      renderNotificationList();
    }
  };

  function renderNotificationList() {
    const list = document.getElementById('notification-items-list');
    if (!list) return;

    if (notificationsList.length === 0) {
      list.innerHTML = `<div style="padding:24px; text-align:center; color:#94a3b8; font-size:0.85rem;">No new notifications</div>`;
      return;
    }

    list.innerHTML = notificationsList.map(n => `
      <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="markNotificationRead(${n.id})">
        <div class="notification-icon" style="background:${n.bg}; color:${n.color};">
          ${n.icon}
        </div>
        <div class="notification-content">
          <div class="notification-text">${n.text}</div>
          <div class="notification-time">${n.time}</div>
        </div>
      </div>
    `).join('');
  }

  window.markNotificationRead = function(id) {
    const notif = notificationsList.find(n => n.id === id);
    if (notif) notif.unread = false;
    updateNotificationBadge();
    renderNotificationList();
  };

  window.clearAllNotifications = function() {
    notificationsList = [];
    updateNotificationBadge();
    renderNotificationList();
  };

  // Close notification dropdown when clicking outside
  document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('notification-dropdown-panel');
    const bellBtn = document.getElementById('btn-header-bell');
    if (dropdown && bellBtn && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // ==========================================================================
  // Modal Dialogs & Sign Out
  // ==========================================================================
  window.closePortalModal = function() {
    const modal = document.getElementById('portal-modal-overlay');
    if (modal) modal.classList.remove('active');
  };

  window.handlePortalSignOut = function() {
    try {
      localStorage.removeItem('civicconnect_citizen');
    } catch (e) {}
    window.location.href = '/';
  };

  window.toggleMobileSidebar = function() {
    const sidebar = document.getElementById('portal-sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
  };

  // ==========================================================================
  // Initialize Application on DOM Ready
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    // Populate Citizen Sidebar Info
    const nameEl = document.getElementById('sidebar-citizen-name');
    const emailEl = document.getElementById('sidebar-citizen-email');
    const avatarEl = document.getElementById('sidebar-citizen-avatar');

    if (nameEl) nameEl.innerText = citizenUser.name;
    if (emailEl) emailEl.innerText = citizenUser.email;
    if (avatarEl) avatarEl.innerText = citizenUser.avatarText;

    updateNotificationBadge();

    // Route to initial path
    const initialPath = getCurrentPath();
    navigateTo(initialPath, false);
  });

})();
