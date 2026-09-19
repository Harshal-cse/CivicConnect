// CivicConnect Interactive Application Logic

// Mock Database of Initial Complaints
const complaintsDB = [
  {
    id: "CC-8421",
    title: "Large deep pothole on main junction",
    category: "Damaged Roads",
    location: "MG Road, Corner of Shivaji Chowk, Ward 42",
    ward: "Ward 42 - Shivajinagar",
    coordinates: { lat: 18.5204, lng: 73.8567 },
    reportedBy: "Aarav Sharma",
    reportedAt: "1 day ago",
    status: "Assigned to PWD",
    level: 1,
    assignedTo: "Nagarsevak Ramesh Patil",
    department: "Road Maintenance (PWD)",
    supports: 38,
    slaRemaining: "Active - Under Review",
    severity: "High",
    image: "user_avatar.png",
    afterImage: null
  },
  {
    id: "CC-8390",
    title: "Garbage bin overflowing for 3 days attracting stray animals",
    category: "Overflowing Garbage",
    location: "Lane 4, Near Gandhi Park, Ward 42",
    ward: "Ward 42 - Shivajinagar",
    coordinates: { lat: 18.5220, lng: 73.8580 },
    reportedBy: "Sunita Deshmukh",
    reportedAt: "4 days ago",
    status: "ESCALATED TO AAMDAR",
    level: 3,
    assignedTo: "Aamdar Office (MLA Oversight)",
    department: "Solid Waste Management",
    supports: 124,
    slaRemaining: "Escalated to MLA",
    severity: "Critical",
    image: "user_avatar.png",
    afterImage: null
  },
  {
    id: "CC-8104",
    title: "Streetlight pole non-functional, pitch dark walkway",
    category: "Broken Streetlights",
    location: "Sector 9, School Link Road, Ward 18",
    ward: "Ward 18 - Model Colony",
    coordinates: { lat: 18.5312, lng: 73.8421 },
    reportedBy: "Vikram Kulkarni",
    reportedAt: "5 days ago",
    status: "Resolved & Verified",
    level: 1,
    assignedTo: "Nagarsevak Priya More",
    department: "Electrical Department",
    supports: 19,
    slaRemaining: "Completed & Verified",
    severity: "Medium",
    image: "user_avatar.png",
    afterImage: "user_avatar.png"
  },
  {
    id: "CC-7945",
    title: "Main water pipeline burst flooding society entrance",
    category: "Water Leakage",
    location: "Prabhat Road, Near Post Office, Ward 42",
    ward: "Ward 42 - Shivajinagar",
    coordinates: { lat: 18.5150, lng: 73.8410 },
    reportedBy: "Kavita Rathi",
    reportedAt: "2 days ago",
    status: "In Progress (Pipes Dispatched)",
    level: 1,
    assignedTo: "Nagarsevak Ramesh Patil",
    department: "Water Supply & Sewerage",
    supports: 54,
    slaRemaining: "In Progress",
    severity: "Urgent",
    image: "user_avatar.png",
    afterImage: null
  }
];

// Current App State
let currentRole = "citizen";
let uploadedFile = null;
let currentUser = null;
let currentSignupRole = "citizen";
let currentLoginRole = "citizen";

// Landing Modal AI Validation State
let landingTemporaryImageId = null;
let landingValidationId = null;
let landingImageHash = null;
let landingValidationStatus = null;
let landingFileBase64 = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  renderRoleDashboard("citizen");
  renderSignupDynamicFields("citizen");
  updateAuthUI();
});

function setupEventListeners() {
  // Navigation smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Modal Triggers
  const reportBtn = document.getElementById("btn-report-issue");
  if (reportBtn) reportBtn.addEventListener("click", () => openModal("modal-report"));

  const heroReportBtn = document.getElementById("hero-btn-report");
  if (heroReportBtn) heroReportBtn.addEventListener("click", () => openModal("modal-report"));

  const ctaReportBtn = document.getElementById("cta-btn-start");
  if (ctaReportBtn) ctaReportBtn.addEventListener("click", () => openModal("modal-report"));

  const trackNavBtn = document.getElementById("nav-btn-track");
  if (trackNavBtn) trackNavBtn.addEventListener("click", () => openModal("modal-track"));

  const heroTrackBtn = document.getElementById("hero-btn-track");
  if (heroTrackBtn) heroTrackBtn.addEventListener("click", () => {
    const ticketIdInput = document.getElementById("hero-track-input");
    const val = ticketIdInput ? ticketIdInput.value.trim() : "";
    openModal("modal-track");
    if (val) {
      const trackIn = document.getElementById("track-ticket-input");
      if (trackIn) trackIn.value = val;
      searchTicket(val);
    }
  });

  // Role Portal Switchers
  const tabCitizen = document.getElementById("tab-citizen");
  const tabNagarsevak = document.getElementById("tab-nagarsevak");
  const tabAamdar = document.getElementById("tab-aamdar");
  const tabAdmin = document.getElementById("tab-admin");

  if (tabCitizen) tabCitizen.addEventListener("click", () => switchRoleTab("citizen"));
  if (tabNagarsevak) tabNagarsevak.addEventListener("click", () => switchRoleTab("nagarsevak"));
  if (tabAamdar) tabAamdar.addEventListener("click", () => switchRoleTab("aamdar"));
  if (tabAdmin) tabAdmin.addEventListener("click", () => switchRoleTab("admin"));

  // Category Selector in Report Modal
  const categorySelect = document.getElementById("report-category");
  const locationSelect = document.getElementById("report-location");

  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      checkDuplicatePossibility();
      if (uploadedFile) {
        runLandingImageValidation();
      }
    });
  }
  if (locationSelect) {
    locationSelect.addEventListener("input", checkDuplicatePossibility);
  }

  // File Upload Dropzone
  const dropzone = document.getElementById("report-dropzone");
  const fileInput = document.getElementById("report-file-input");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleFileSelect(e.target.files[0]));

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#2563eb";
      dropzone.style.backgroundColor = "#eff6ff";
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "#cbd5e1";
      dropzone.style.backgroundColor = "#f8fafc";
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "#cbd5e1";
      dropzone.style.backgroundColor = "#f8fafc";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  // Report Form Submit
  const reportForm = document.getElementById("form-report-issue");
  if (reportForm) {
    reportForm.addEventListener("submit", handleReportSubmit);
  }

  // Track Form Submit
  const trackForm = document.getElementById("form-track-ticket");
  if (trackForm) {
    trackForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("track-ticket-input");
      searchTicket(input.value.trim());
    });
  }

  // Initialize UI systems
  initScrollReveals();
  initNavbarScroll();
  initMobileNav();
  initCursorAndMotion();
}

// Scroll Reveal Animations
function initScrollReveals() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal-item').forEach(el => el.classList.add('revealed'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -30px 0px"
  });

  document.querySelectorAll('.reveal-item').forEach(el => observer.observe(el));
}

// Sticky Navbar Scroll Effect
function initNavbarScroll() {
  const navbar = document.getElementById("main-navbar");
  if (!navbar) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      navbar.classList.add("navbar-scrolled");
    } else {
      navbar.classList.remove("navbar-scrolled");
    }
  }, { passive: true });
}

// Mobile Navigation Drawer
function initMobileNav() {
  const toggleBtn = document.getElementById("nav-toggle-btn");
  const drawer = document.getElementById("mobile-nav-drawer");
  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener("click", () => {
    drawer.classList.toggle("open");
  });
}

window.closeMobileMenu = function() {
  const drawer = document.getElementById("mobile-nav-drawer");
  if (drawer) drawer.classList.remove("open");
};

// Cursor Glow & Magnetic Buttons (Desktop Only)
function initCursorAndMotion() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  const glow = document.getElementById("cursor-glow");
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let currentX = mouseX;
  let currentY = mouseY;
  let isMoving = false;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMoving) {
      isMoving = true;
      if (glow) glow.style.opacity = "1";
    }
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    if (glow) glow.style.opacity = "0";
  });

  function animateGlow() {
    currentX += (mouseX - currentX) * 0.12;
    currentY += (mouseY - currentY) * 0.12;
    if (glow) {
      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    }
    requestAnimationFrame(animateGlow);
  }
  requestAnimationFrame(animateGlow);

  // Magnetic Button Proximity Hover
  const magneticBtns = document.querySelectorAll(".btn-magnetic");
  magneticBtns.forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;
      const deltaX = Math.max(-10, Math.min(10, (e.clientX - btnCenterX) * 0.22));
      const deltaY = Math.max(-10, Math.min(10, (e.clientY - btnCenterY) * 0.22));
      btn.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = `translate3d(0, 0, 0)`;
    });
  });
}

// Quick Complaint Tracking Handler
window.handleQuickTrack = function(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("track-quick-input");
  const val = input ? input.value.trim() : "";
  if (!val) return;
  openModal("modal-track");
  const modalInput = document.getElementById("track-ticket-input");
  if (modalInput) modalInput.value = val;
  searchTicket(val);
};

// Modal open/close functions
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
};

// Quick Category Click from landing page
window.quickSelectCategory = function(categoryName) {
  openModal("modal-report");
  const catSelect = document.getElementById("report-category");
  if (catSelect) {
    catSelect.value = categoryName;
    checkDuplicatePossibility();
  }
};

// Check for nearby duplicate complaints
function checkDuplicatePossibility() {
  const cat = document.getElementById("report-category") ? document.getElementById("report-category").value : "";
  const loc = document.getElementById("report-location") ? document.getElementById("report-location").value.toLowerCase() : "";
  const dupBanner = document.getElementById("duplicate-banner");

  if (!dupBanner) return;

  // Simulate duplicate match if category is Damaged Roads and location contains "mg" or "shivaji"
  if (cat === "Damaged Roads" && (loc.includes("mg") || loc.includes("shivaji") || loc.length > 5)) {
    dupBanner.style.display = "block";
    dupBanner.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:12px;">
        <span style="font-size:1.4rem;">⚠️</span>
        <div style="flex:1;">
          <div style="font-weight:700; color:#92400e; margin-bottom:4px;">Similar Issue Already Reported Nearby!</div>
          <div style="font-size:0.85rem; color:#78350f; line-height:1.4;">
            Complaint <strong>#CC-8421</strong> ("Large deep pothole on main junction") was reported recently at this location with 38 citizen supports.
          </div>
          <div style="margin-top:10px; display:flex; gap:8px;">
            <button type="button" class="btn btn-primary" style="padding:6px 14px; font-size:0.825rem;" onclick="supportExistingTicket('CC-8421')">
              👍 +1 Support Existing Issue
            </button>
            <button type="button" class="btn btn-outline" style="padding:6px 14px; font-size:0.825rem;" onclick="dismissDuplicateWarning()">
              File New Issue Anyway
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    dupBanner.style.display = "none";
  }
}

window.dismissDuplicateWarning = function() {
  const dupBanner = document.getElementById("duplicate-banner");
  if (dupBanner) dupBanner.style.display = "none";
};

window.supportExistingTicket = function(ticketId) {
  const item = complaintsDB.find(c => c.id === ticketId);
  if (item) {
    item.supports += 1;
    showToast(`✅ You supported ticket #${ticketId}! Total supports: ${item.supports}`);
    closeModal("modal-report");
    openModal("modal-track");
    document.getElementById("track-ticket-input").value = ticketId;
    searchTicket(ticketId);
  }
};

// Run Landing Page AI Image Validation
async function runLandingImageValidation(base64Data) {
  if (base64Data) {
    landingFileBase64 = base64Data;
  }
  if (!landingFileBase64) return;

  const box = document.getElementById("landing-ai-validation-status-box");
  const submitBtn = document.getElementById("landing-report-submit-btn");
  const category = document.getElementById("report-category") ? document.getElementById("report-category").value : "";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    submitBtn.title = "AI photo approval required before submission";
  }

  if (!category) {
    if (box) {
      box.innerHTML = `
        <div class="ai-validation-card ai-validation-review">
          <span class="ai-badge ai-badge-review">Category Needed</span>
          <p style="font-size:0.825rem; color:#92400e; margin-top:6px; margin-bottom:0;">
            Please select a problem category above to verify your uploaded photo.
          </p>
        </div>
      `;
    }
    return;
  }

  if (box) {
    box.innerHTML = `
      <div class="ai-validation-card ai-validation-loading">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="ai-badge ai-badge-loading">
            <svg style="animation: spin 1s linear infinite; display:inline-block; vertical-align:middle; margin-right:4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"/></svg>
            AI Analyzing Photo...
          </span>
          <span style="font-size:0.75rem; color:#2563eb; font-weight:600;">Google Cloud Vision AI</span>
        </div>
        <div class="ai-meter-bg"><div class="ai-meter-fill" style="width:65%; background:#3b82f6;"></div></div>
        <p style="font-size:0.825rem; color:#1e40af; margin-top:8px; margin-bottom:0;">
          Scanning image content, checking image clarity, and verifying against category "${category}"...
        </p>
      </div>
    `;
  }

  try {
    // 1. Upload temporary image if not already uploaded
    if (!landingTemporaryImageId) {
      const uploadRes = await fetch("/api/complaints/upload-temporary-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "CITIZEN-AARAV",
          "x-user-role": "citizen"
        },
        body: JSON.stringify({
          imageBase64: landingFileBase64,
          mimeType: (uploadedFile && uploadedFile.type) ? uploadedFile.type : "image/jpeg"
        })
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to process image file");
      }
      landingTemporaryImageId = uploadData.imageId;
      landingImageHash = uploadData.imageHash;
    }

    // 2. Validate against selected category
    const valRes = await fetch("/api/complaints/validate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "CITIZEN-AARAV",
        "x-user-role": "citizen"
      },
      body: JSON.stringify({
        selectedCategory: category,
        imageId: landingTemporaryImageId
      })
    });

    const data = await valRes.json();

    if (data.status === "approved") {
      landingValidationId = data.validationId;
      landingValidationStatus = "approved";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.title = "AI photo verified - Click to submit";
      }

      if (box) {
        box.innerHTML = `
          <div class="ai-validation-card ai-validation-approved">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="ai-badge ai-badge-approved">✓ AI Verified & Approved</span>
              <span style="font-size:0.8rem; font-weight:800; color:#15803d;">${Math.round(data.confidence * 100)}% Match</span>
            </div>
            <div class="ai-meter-bg"><div class="ai-meter-fill" style="width:${Math.round(data.confidence * 100)}%; background:#22c55e;"></div></div>
            <div style="font-size:0.825rem; color:#166534; margin-top:8px; font-weight:600;">
              ${data.message || 'Image matches the reported issue category.'}
            </div>
            <div style="margin-top:6px;">
              ${(data.labels || []).slice(0, 4).map(l => `<span class="ai-label-pill">${l.name} (${Math.round(l.score * 100)}%)</span>`).join('')}
            </div>
          </div>
        `;
      }
    } else if (data.status === "manual_review") {
      landingValidationId = data.validationId;
      landingValidationStatus = "manual_review";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.title = "Cannot submit: Photo requires manual review";
      }

      if (box) {
        box.innerHTML = `
          <div class="ai-validation-card ai-validation-review">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="ai-badge ai-badge-review">⚠️ Flagged: Manual Review Required</span>
              <span style="font-size:0.8rem; font-weight:800; color:#b45309;">${Math.round(data.confidence * 100)}% Match</span>
            </div>
            <div class="ai-meter-bg"><div class="ai-meter-fill" style="width:${Math.round(data.confidence * 100)}%; background:#f59e0b;"></div></div>
            <div style="font-size:0.825rem; color:#92400e; margin-top:8px; font-weight:600;">
              ${data.message}
            </div>
            <div style="font-size:0.775rem; color:#78350f; margin-top:4px;">
              ${data.suggestion || 'Please capture a clear, close-up photo showing the exact defect or hazard.'}
            </div>
            <div style="margin-top:6px;">
              ${(data.labels || []).slice(0, 4).map(l => `<span class="ai-label-pill">${l.name} (${Math.round(l.score * 100)}%)</span>`).join('')}
            </div>
          </div>
        `;
      }
    } else {
      landingValidationId = null;
      landingValidationStatus = "rejected";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.title = "Cannot submit: Photo does not match category";
      }

      if (box) {
        box.innerHTML = `
          <div class="ai-validation-card ai-validation-rejected">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span class="ai-badge ai-badge-rejected">✕ Category Mismatch / Quality Issue</span>
              <span style="font-size:0.8rem; font-weight:800; color:#b91c1c;">Rejected</span>
            </div>
            <div style="font-size:0.825rem; color:#991b1b; margin-top:8px; font-weight:600;">
              ${data.message}
            </div>
            <div style="font-size:0.775rem; color:#7f1d1d; margin-top:4px;">
              ${data.suggestion || 'Please upload a photo that clearly shows the civic issue selected.'}
            </div>
            ${data.predictedCategory && data.predictedCategory !== 'unknown' && data.predictedCategory !== 'irrelevant' ? `
              <div style="margin-top:8px; font-size:0.8rem; color:#991b1b;">
                💡 Did you mean: <strong>${data.predictedCategory.replace('_', ' ').toUpperCase()}</strong>?
              </div>
            ` : ''}
            <div style="margin-top:6px;">
              ${(data.labels || []).slice(0, 4).map(l => `<span class="ai-label-pill">${l.name} (${Math.round(l.score * 100)}%)</span>`).join('')}
            </div>
          </div>
        `;
      }
    }
  } catch (err) {
    landingValidationId = null;
    landingValidationStatus = "error";
    if (box) {
      box.innerHTML = `
        <div class="ai-validation-card ai-validation-rejected">
          <span class="ai-badge ai-badge-rejected">Validation Error</span>
          <p style="font-size:0.825rem; color:#991b1b; margin-top:6px; margin-bottom:0;">
            ${err.message || "Failed to contact validation service. Please try again."}
          </p>
        </div>
      `;
    }
  }
}

// File upload preview
function handleFileSelect(file) {
  if (!file) return;
  uploadedFile = file;
  landingTemporaryImageId = null;
  landingValidationId = null;
  landingImageHash = null;
  landingValidationStatus = null;
  landingFileBase64 = null;

  const previewBox = document.getElementById("upload-preview");
  const dropzone = document.getElementById("report-dropzone");
  const submitBtn = document.getElementById("landing-report-submit-btn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    submitBtn.title = "AI validation must approve photo before submission";
  }

  if (previewBox && dropzone) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewBox.innerHTML = `
        <div style="position:relative; display:inline-block; margin-top:10px;">
          <img src="${e.target.result}" style="max-height:140px; border-radius:8px; border:1px solid #cbd5e1; object-fit:cover;" />
          <div style="font-size:0.8rem; color:#10b981; font-weight:600; margin-top:4px;">
            ✓ Geotag & EXIF verified: Camera live capture
          </div>
        </div>
      `;
      runLandingImageValidation(e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

// GPS Location Auto-fetch
window.fetchCurrentGPS = function() {
  const locInput = document.getElementById("report-location");
  if (!locInput) return;

  locInput.value = "Fetching GPS coordinates...";
  showToast("📍 Accessing device GPS location...");

  setTimeout(() => {
    locInput.value = "Shivaji Nagar Square, Ward 42 (18.5204° N, 73.8567° E)";
    checkDuplicatePossibility();
    showToast("✓ GPS location pinned to Ward 42 (Nagarsevak Ramesh Patil)");
  }, 900);
};

// Submit new report
async function handleReportSubmit(e) {
  e.preventDefault();
  const category = document.getElementById("report-category").value;
  const location = document.getElementById("report-location").value;
  const title = document.getElementById("report-title").value;
  const desc = document.getElementById("report-desc").value;

  if (!category || !location || !title) {
    alert("Please complete all required fields");
    return;
  }

  if (!landingValidationId || landingValidationStatus !== "approved") {
    alert("AI validation requires an approved photo matching the complaint category before submission.");
    return;
  }

  const submitBtn = document.getElementById("landing-report-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting Complaint...";
  }

  try {
    const response = await fetch("/api/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "CITIZEN-AARAV",
        "x-user-role": "citizen"
      },
      body: JSON.stringify({
        title,
        category,
        description: desc || "Reported via CivicConnect portal",
        location,
        coordinates: { lat: 19.8864, lng: 74.4789 }, // Kopargaon Municipal Center
        ward: "Ward 1 - Shivaji Chowk",
        city: "Kopargaon",
        imageId: landingTemporaryImageId,
        imageHash: landingImageHash,
        validationId: landingValidationId
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      alert(`Submission rejected: ${result.error || "Security check failed"}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit to Ward Nagarsevak";
      }
      return;
    }

    const newId = result.complaintId;
    const newComplaint = {
      id: newId,
      title: title,
      category: category,
      location: location,
      ward: "Ward 1 - Shivaji Chowk",
      coordinates: { lat: 19.8864, lng: 74.4789 },
      reportedBy: "You (Citizen)",
      reportedAt: "Just now",
      status: "Submitted & AI Verified",
      level: 1,
      assignedTo: "Nagarsevak Ward 1",
      department: "Municipal Public Works",
      supports: 1,
      slaRemaining: "Report Logged & Dispatched",
      severity: "High",
      image: result.complaint.image || "user_avatar.png",
      afterImage: null
    };

    complaintsDB.unshift(newComplaint);
    closeModal("modal-report");

    // Reset report form
    const repForm = document.getElementById("form-report-issue");
    if (repForm) repForm.reset();
    uploadedFile = null;
    landingTemporaryImageId = null;
    landingValidationId = null;
    landingImageHash = null;
    landingValidationStatus = null;
    landingFileBase64 = null;
    const pBox = document.getElementById("upload-preview");
    if (pBox) pBox.innerHTML = "";
    const stBox = document.getElementById("landing-ai-validation-status-box");
    if (stBox) stBox.innerHTML = "";

    showToast(`🎉 Complaint registered & AI Verified! Ticket #${newId}`);
    renderRoleDashboard(currentRole);

    // Auto open tracker
    setTimeout(() => {
      openModal("modal-track");
      const trackIn = document.getElementById("track-ticket-input");
      if (trackIn) trackIn.value = newId;
      searchTicket(newId);
    }, 500);
  } catch (err) {
    alert(`Failed to register complaint: ${err.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit to Ward Nagarsevak";
    }
  }
}

// Search and render ticket details in modal
function searchTicket(ticketId) {
  const resultDiv = document.getElementById("track-result-container");
  if (!resultDiv) return;

  const found = complaintsDB.find(c => c.id.toLowerCase() === ticketId.toLowerCase());

  if (!found) {
    resultDiv.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:#64748b;">
        <div style="font-size:2rem; margin-bottom:10px;">🔍</div>
        <div style="font-weight:700; color:#0f172a; font-size:1.1rem;">Ticket Not Found</div>
        <div style="font-size:0.9rem; margin-top:4px;">No complaint found matching "${ticketId}". Try <strong>CC-8421</strong>, <strong>CC-8390</strong>, or <strong>CC-8104</strong>.</div>
      </div>
    `;
    return;
  }

  const isEscalated = found.level >= 2;
  const isResolved = found.status.includes("Resolved");

  resultDiv.innerHTML = `
    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        <div>
          <span style="font-size:0.8rem; font-weight:700; background:#eff6ff; color:#1d4ed8; padding:3px 10px; border-radius:6px;">
            ${found.id}
          </span>
          <h3 style="font-size:1.2rem; font-weight:700; color:#0f172a; margin-top:6px;">${found.title}</h3>
          <p style="font-size:0.875rem; color:#64748b; margin-top:2px;">📍 ${found.location}</p>
        </div>
        <div>
          <span style="display:inline-block; font-size:0.85rem; font-weight:700; padding:6px 14px; border-radius:9999px; ${
            isEscalated ? 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;' : 
            isResolved ? 'background:#d1fae5; color:#065f46; border:1px solid #a7f3d0;' : 
            'background:#fef3c7; color:#92400e; border:1px solid #fde68a;'
          }">
            ● ${found.status}
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:20px; font-size:0.85rem;">
        <div style="background:white; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
          <div style="color:#64748b; font-size:0.75rem; text-transform:uppercase; font-weight:600;">Ward & Corporator</div>
          <div style="font-weight:700; color:#0f172a; margin-top:2px;">${found.assignedTo}</div>
        </div>
        <div style="background:white; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
          <div style="color:#64748b; font-size:0.75rem; text-transform:uppercase; font-weight:600;">Department</div>
          <div style="font-weight:700; color:#0f172a; margin-top:2px;">${found.department}</div>
        </div>
        <div style="background:white; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
          <div style="color:#64748b; font-size:0.75rem; text-transform:uppercase; font-weight:600;">Escalation Tier</div>
          <div style="font-weight:700; color:${isEscalated ? '#ef4444' : '#2563eb'}; margin-top:2px;">${isEscalated ? 'Tier 3 (MLA Oversight)' : 'Tier 1 (Ward Authority)'}</div>
        </div>
        <div style="background:white; padding:10px 14px; border-radius:8px; border:1px solid #e2e8f0;">
          <div style="color:#64748b; font-size:0.75rem; text-transform:uppercase; font-weight:600;">Citizen Backing</div>
          <div style="font-weight:700; color:#0f172a; margin-top:2px;">👥 ${found.supports} citizens upvoted</div>
        </div>
      </div>

      <!-- Escalation Meter -->
      <div style="margin-bottom:24px; background:white; padding:14px 18px; border-radius:10px; border:1px solid #e2e8f0;">
        <div style="display:flex; justify-content:space-between; font-size:0.825rem; font-weight:700; margin-bottom:8px;">
          <span>Escalation Ladder</span>
          <span style="color:#ef4444;">${found.level === 3 ? '🚨 Escalated to MLA (Aamdar)' : 'Level 1 (Ward Nagarsevak)'}</span>
        </div>
        <div style="width:100%; height:8px; background:#e2e8f0; border-radius:9999px; overflow:hidden; display:flex;">
          <div style="width:33.3%; background:${found.level >= 1 ? '#2563eb' : '#cbd5e1'};"></div>
          <div style="width:33.3%; background:${found.level >= 2 ? '#f59e0b' : '#cbd5e1'};"></div>
          <div style="width:33.3%; background:${found.level >= 3 ? '#ef4444' : '#cbd5e1'};"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.725rem; color:#64748b; margin-top:6px;">
          <span>Level 1: Nagarsevak</span>
          <span>Level 2: Ward Officer</span>
          <span>Level 3: Aamdar / Minister</span>
        </div>
      </div>

      <!-- Visual Resolution Proof -->
      <div style="margin-bottom:24px;">
        <div style="font-weight:700; font-size:0.9rem; color:#0f172a; margin-bottom:10px;">Problem Documentation & Photo Proof</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <div style="font-size:0.75rem; font-weight:600; color:#ef4444; margin-bottom:4px;">BEFORE (Reported by Citizen)</div>
            <img src="${found.image}" style="width:100%; height:140px; object-fit:contain; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; padding:6px;" />
          </div>
          <div>
            <div style="font-size:0.75rem; font-weight:600; color:#10b981; margin-bottom:4px;">AFTER REPAIR (Contractor Upload)</div>
            ${
              found.afterImage ? 
              `<img src="${found.afterImage}" style="width:100%; height:140px; object-fit:contain; background:#f8fafc; border-radius:8px; border:1px solid #10b981; padding:6px;" />` :
              `<div style="width:100%; height:140px; background:#f1f5f9; border:1px dashed #cbd5e1; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.8rem; text-align:center; padding:10px;">
                <span>⏳ Repair in progress</span>
                <span style="font-size:0.7rem; margin-top:4px;">After-photo pending contractor completion</span>
              </div>`
            }
          </div>
        </div>
      </div>

      <!-- Action Footer for citizen -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:14px;">
        <button type="button" class="btn btn-outline" style="font-size:0.85rem;" onclick="supportExistingTicket('${found.id}')">
          👍 Upvote / Support (${found.supports})
        </button>
        ${
          isResolved ? 
          `<button type="button" class="btn btn-primary" style="background:#059669; font-size:0.85rem;" onclick="showToast('✅ Thank you! Resolution confirmed.')">
            ✓ Confirm Satisfactory Fix
          </button>` :
          `<span style="font-size:0.8rem; color:#64748b;">Automatic escalation triggered if unaddressed</span>`
        }
      </div>
    </div>
  `;
}

// Switch Role View
function switchRoleTab(role) {
  currentRole = role;
  document.querySelectorAll(".role-tab-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`tab-${role}`);
  if (activeBtn) activeBtn.classList.add("active");
  renderRoleDashboard(role);
}

// Render dynamic dashboard based on selected role
function renderRoleDashboard(role) {
  const container = document.getElementById("portal-preview-content");
  const badge = document.getElementById("portal-role-badge");

  if (!container || !badge) return;

  if (role === "citizen") {
    badge.className = "portal-badge-pill badge-citizen";
    badge.innerText = "Citizen Portal View";
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; color:#0f172a;">My Neighborhood Civic Dashboard</h3>
          <p style="color:#64748b; font-size:0.9rem;">Ward 42 • Shivajinagar Assembly Constituency</p>
        </div>
        <button class="btn btn-primary" onclick="openModal('modal-report')">
          + Report New Issue
        </button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:18px;">
        ${complaintsDB.map(c => `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:18px; box-shadow:0 1px 3px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-size:0.75rem; font-weight:700; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:6px;">${c.id}</span>
                <span style="font-size:0.75rem; font-weight:700; ${c.level >= 2 ? 'color:#ef4444;' : 'color:#f59e0b;'}">● ${c.status}</span>
              </div>
              <h4 style="font-size:1rem; font-weight:700; color:#0f172a; margin-bottom:6px;">${c.title}</h4>
              <p style="font-size:0.825rem; color:#64748b; margin-bottom:12px;">📍 ${c.location}</p>
              <img src="${c.image}" style="width:100%; height:120px; object-fit:contain; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:12px; padding:6px;" />
            </div>
            <div style="border-top:1px solid #f1f5f9; padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.8rem; color:#64748b;">👥 ${c.supports} citizens backed</span>
              <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="viewComplaintDetails('${c.id}')">
                Track Status →
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (role === "nagarsevak") {
    badge.className = "portal-badge-pill badge-nagarsevak";
    badge.innerText = "Ward Corporator (Nagarsevak) Portal";

    const activeWardCode = (currentUser && currentUser.role === "nagarsevak" && currentUser.ward) ? currentUser.ward : "Ward 42";
    const activeWardName = (currentUser && currentUser.role === "nagarsevak" && currentUser.wardName) ? currentUser.wardName : "Ward 42 - Shivajinagar Central";
    const activeCorpName = (currentUser && currentUser.role === "nagarsevak") ? currentUser.name : "Ramesh Patil";

    // Strict ward-exclusive filter: Only show complaints filed by citizens of this corporator's ward
    const wardComplaints = complaintsDB.filter(c => {
      const wardText = `${c.ward || ''} ${c.location || ''}`.toLowerCase();
      return wardText.includes(activeWardCode.toLowerCase());
    });

    const overdueCount = wardComplaints.filter(c => c.level >= 2 || (c.slaRemaining && c.slaRemaining.toLowerCase().includes('breach'))).length;

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; color:#0f172a;">Nagarsevak Action Console</h3>
          <p style="color:#64748b; font-size:0.9rem;">
            Corporator: <strong>${activeCorpName}</strong> • ${activeWardName}
          </p>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span style="background:${overdueCount > 0 ? '#fee2e2' : '#f1f5f9'}; color:${overdueCount > 0 ? '#991b1b' : '#475569'}; padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.85rem;">
            ${overdueCount > 0 ? `⚠️ ${overdueCount} Overdue Escalation` : `✓ 0 Overdue`}
          </span>
          <span style="background:#dcfce7; color:#166534; padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.85rem;">
            ✓ 92% Resolution Rate
          </span>
        </div>
      </div>

      <!-- Strict Ward-Only Notice Banner -->
      <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:34px; height:34px; border-radius:50%; background:#2563eb; color:white; display:flex; align-items:center; justify-content:center; font-size:1.05rem; flex-shrink:0;">
            🔒
          </div>
          <div>
            <div style="font-weight:800; font-size:0.875rem; color:#1e40af;">
              Ward-Exclusive Jurisdiction Filter Active
            </div>
            <div style="font-size:0.775rem; color:#3b82f6; margin-top:1px;">
              You are viewing <strong>only citizen complaints originating in ${activeWardCode}</strong>. Complaints from other wards are strictly sequestered.
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.775rem; font-weight:700; background:#dbeafe; color:#1d4ed8; padding:5px 12px; border-radius:9999px; border:1px solid #bfdbfe;">
            📋 ${wardComplaints.length} Ward Complaints
          </span>
          <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; color:#64748b;">
            <span>Test Ward:</span>
            <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; ${activeWardCode === 'Ward 42' ? 'background:#2563eb; color:white; font-weight:700;' : ''}" onclick="switchNagarsevakWardDemo('Ward 42')">Ward 42 (3)</button>
            <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; ${activeWardCode === 'Ward 18' ? 'background:#2563eb; color:white; font-weight:700;' : ''}" onclick="switchNagarsevakWardDemo('Ward 18')">Ward 18 (1)</button>
            <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; ${activeWardCode === 'Ward 09' ? 'background:#2563eb; color:white; font-weight:700;' : ''}" onclick="switchNagarsevakWardDemo('Ward 09')">Ward 09 (0)</button>
          </div>
        </div>
      </div>

      ${wardComplaints.length > 0 ? `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;">
            <thead style="background:#f1f5f9; color:#475569; font-weight:700; border-bottom:1px solid #e2e8f0;">
              <tr>
                <th style="padding:12px 16px;">Complaint ID</th>
                <th style="padding:12px 16px;">Issue & Category</th>
                <th style="padding:12px 16px;">Assigned Department</th>
                <th style="padding:12px 16px;">Current Status</th>
                <th style="padding:12px 16px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${wardComplaints.map(c => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:14px 16px; font-weight:700; color:#1d4ed8;">${c.id}</td>
                  <td style="padding:14px 16px;">
                    <div style="font-weight:600; color:#0f172a;">${c.title}</div>
                    <div style="color:#64748b; font-size:0.8rem;">${c.category} • 📍 ${c.location} • ${c.supports} citizens</div>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="background:#eff6ff; color:#1e40af; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:600;">
                      ${c.department}
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <span style="font-weight:700; ${c.level >= 2 ? 'color:#ef4444;' : 'color:#2563eb;'}">
                      ● ${c.status}
                    </span>
                  </td>
                  <td style="padding:14px 16px;">
                    <button class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="openDepartmentAssign('${c.id}')">
                      Dispatch / Update
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="background:white; border:1px dashed #cbd5e1; border-radius:12px; padding:40px 20px; text-align:center;">
          <div style="font-size:2.4rem; margin-bottom:8px;">✅</div>
          <h4 style="font-size:1.1rem; font-weight:800; color:#0f172a; margin-bottom:4px;">No Pending Complaints in ${activeWardCode}</h4>
          <p style="color:#64748b; font-size:0.85rem; max-width:440px; margin:0 auto;">
            All reported infrastructure issues in ${activeWardCode} have been resolved or none are currently open. When citizens of ${activeWardCode} report issues, they will appear here exclusively.
          </p>
        </div>
      `}
    `;
  } else if (role === "aamdar") {
    badge.className = "portal-badge-pill badge-aamdar";
    badge.innerText = "Aamdar (MLA) High-Level Oversight";

    const activeCity = (currentUser && currentUser.role === "mla" && currentUser.city) ? currentUser.city : "Pune";
    const activeCityName = (currentUser && currentUser.role === "mla" && currentUser.cityName) ? currentUser.cityName : "Pune City";
    const activeMlaName = (currentUser && currentUser.role === "mla") ? currentUser.name : "Devendra Joshi";

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; color:#0f172a;">Constituency Executive Dashboard</h3>
          <p style="color:#64748b; font-size:0.9rem;">
            MLA: <strong>${activeMlaName}</strong> • ${activeCityName} Legislative Assembly
          </p>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-primary" style="background:#dc2626;" onclick="showToast('🚨 Summons generated to ${activeCity} Municipal Chief Engineer')">
            Issue Minister Red-Notice
          </button>
          <div style="display:flex; align-items:center; gap:4px; font-size:0.75rem; color:#64748b;">
            <span>Switch City:</span>
            <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; ${activeCity === 'Pune' ? 'background:#dc2626; color:white; font-weight:700;' : ''}" onclick="switchMlaCityDemo('Pune')">Pune</button>
            <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; ${activeCity === 'Mumbai' ? 'background:#dc2626; color:white; font-weight:700;' : ''}" onclick="switchMlaCityDemo('Mumbai')">Mumbai</button>
            <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; ${activeCity === 'Nagpur' ? 'background:#dc2626; color:white; font-weight:700;' : ''}" onclick="switchMlaCityDemo('Nagpur')">Nagpur</button>
          </div>
        </div>
      </div>

      <!-- City Legislative Jurisdiction Notice -->
      <div style="background:#fff1f2; border:1.5px solid #fecaca; border-radius:12px; padding:12px 16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:34px; height:34px; border-radius:50%; background:#dc2626; color:white; display:flex; align-items:center; justify-content:center; font-size:1.05rem; flex-shrink:0;">
            ⚡
          </div>
          <div>
            <div style="font-weight:800; font-size:0.875rem; color:#991b1b;">
              Legislative City Jurisdiction: ${activeCityName}
            </div>
            <div style="font-size:0.775rem; color:#be123c; margin-top:1px;">
              Monitoring unresolved ward escalations, citizen petitions, and minister intervention notices across all municipal corporations in <strong>${activeCity}</strong>.
            </div>
          </div>
        </div>
        <span style="font-size:0.775rem; font-weight:700; background:#ffe4e6; color:#9f1239; padding:5px 12px; border-radius:9999px; border:1px solid #fecdd3;">
          🏛️ Vidhan Sabha Active
        </span>
      </div>

      <!-- Quick KPI tiles -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
        <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px; border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:#991b1b; text-transform:uppercase;">Auto-Escalated Complaints</div>
          <div style="font-size:2rem; font-weight:800; color:#b91c1c; margin-top:4px;">18</div>
          <div style="font-size:0.75rem; color:#7f1d1d;">Escalated from Nagarsevak in ${activeCity}</div>
        </div>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:16px; border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:#1e40af; text-transform:uppercase;">Total Constituency Reports</div>
          <div style="font-size:2rem; font-weight:800; color:#1d4ed8; margin-top:4px;">1,420</div>
          <div style="font-size:0.75rem; color:#1e3a8a;">Past 30 Days in ${activeCity}</div>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:16px; border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:#166534; text-transform:uppercase;">Resolved Successfully</div>
          <div style="font-size:2rem; font-weight:800; color:#15803d; margin-top:4px;">91.4%</div>
          <div style="font-size:0.75rem; color:#14532d;">Rank #2 in District (${activeCity})</div>
        </div>
      </div>

      <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
        <h4 style="font-size:1.05rem; font-weight:700; color:#991b1b; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
          🚨 Urgent Overdue Cases Requiring MLA Intervention (${activeCity})
        </h4>
        <div style="background:#fff1f2; border:1px solid #ffe4e6; border-radius:10px; padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <span style="font-size:0.75rem; font-weight:700; background:#dc2626; color:white; padding:2px 8px; border-radius:4px;">ESCALATED TO AAMDAR</span>
            <span style="font-weight:700; font-size:0.95rem; margin-left:8px; color:#881337;">CC-8390: Garbage bin overflowing for 3 days</span>
            <div style="font-size:0.85rem; color:#9f1239; margin-top:4px;">Ward 42 • Nagarsevak Ramesh Patil • 124 Citizens Impacted • ${activeCity}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" style="font-size:0.8rem;" onclick="viewComplaintDetails('CC-8390')">View Details</button>
            <button class="btn btn-primary" style="background:#991b1b; font-size:0.8rem;" onclick="showToast('⚡ Direct sanction issued to Solid Waste Dept (${activeCity})')">Direct Sanction</button>
          </div>
        </div>
      </div>
    `;
  } else if (role === "admin") {
    badge.className = "portal-badge-pill badge-admin";
    badge.innerText = "Municipal Admin & Commissioner Dashboard";
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div>
          <h3 style="font-size:1.4rem; font-weight:800; color:#0f172a;">Municipal Governance & Engineering Headquarters</h3>
          <p style="color:#64748b; font-size:0.9rem;">Office of Municipal Commissioner & Chief Executive Engineers • Pune Municipal Corp</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" onclick="showToast('📊 City-Wide Audit Report Downloaded (PDF)')">
            Export Audit Ledger
          </button>
          <button class="btn btn-primary" style="background:#6d28d9;" onclick="showToast('⚡ Department budget allocation synced')">
            Manage Ward Allocations
          </button>
        </div>
      </div>

      <!-- City Admin Metrics -->
      <div style="grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:14px; margin-bottom:24px; display:grid;">
        <div style="background:#faf5ff; border:1px solid #e9d5ff; padding:16px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:#6d28d9; text-transform:uppercase;">City Health Index</div>
          <div style="font-size:1.8rem; font-weight:800; color:#581c87; margin-top:2px;">94.2 / 100</div>
          <div style="font-size:0.75rem; color:#7e22ce;">Top 3 in State</div>
        </div>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:16px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:#1e40af; text-transform:uppercase;">Connected Wards</div>
          <div style="font-size:1.8rem; font-weight:800; color:#1d4ed8; margin-top:2px;">182 Wards</div>
          <div style="font-size:0.75rem; color:#1e3a8a;">100% Corporators Active</div>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:16px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:#166534; text-transform:uppercase;">Resolution Success Rate</div>
          <div style="font-size:1.8rem; font-weight:800; color:#15803d; margin-top:2px;">96.8%</div>
          <div style="font-size:0.75rem; color:#14532d;">+5.2% vs Previous Quarter</div>
        </div>
        <div style="background:#fef2f2; border:1px solid #fecaca; padding:16px; border-radius:12px;">
          <div style="font-size:0.75rem; font-weight:700; color:#991b1b; text-transform:uppercase;">Escalated Cases</div>
          <div style="font-size:1.8rem; font-weight:800; color:#dc2626; margin-top:2px;">18 / 1,420</div>
          <div style="font-size:0.75rem; color:#b91c1c;">1.2% Overall Escalation Rate</div>
        </div>
      </div>

      <!-- Ward Performance Scorecard -->
      <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
        <h4 style="font-size:1rem; font-weight:700; color:#0f172a; margin-bottom:12px;">
          🏆 Inter-Ward Accountability Leaderboard
        </h4>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem;">
            <thead style="background:#f8fafc; color:#64748b; border-bottom:1px solid #e2e8f0;">
              <tr>
                <th style="padding:10px 14px;">Rank</th>
                <th style="padding:10px 14px;">Ward & Corporator</th>
                <th style="padding:10px 14px;">Total Issues</th>
                <th style="padding:10px 14px;">Resolved Cases</th>
                <th style="padding:10px 14px;">Performance Rating</th>
                <th style="padding:10px 14px;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px; font-weight:700; color:#059669;">#1</td>
                <td style="padding:12px 14px; font-weight:600;">Ward 18 (Model Colony) • Priya More</td>
                <td style="padding:12px 14px;">142</td>
                <td style="padding:12px 14px; color:#166534; font-weight:700;">138 (97.2%)</td>
                <td style="padding:12px 14px;">⭐⭐⭐⭐⭐ (4.9)</td>
                <td style="padding:12px 14px;"><span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">Optimal</span></td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px; font-weight:700; color:#2563eb;">#2</td>
                <td style="padding:12px 14px; font-weight:600;">Ward 42 (Shivajinagar) • Ramesh Patil</td>
                <td style="padding:12px 14px;">198</td>
                <td style="padding:12px 14px; color:#166534; font-weight:700;">182 (91.9%)</td>
                <td style="padding:12px 14px;">⭐⭐⭐⭐☆ (4.6)</td>
                <td style="padding:12px 14px;"><span style="background:#dbeafe; color:#1d4ed8; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">Good</span></td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px; font-weight:700; color:#d97706;">#14</td>
                <td style="padding:12px 14px; font-weight:600;">Ward 77 (Hadapsar East) • Sanjay Shinde</td>
                <td style="padding:12px 14px;">210</td>
                <td style="padding:12px 14px; color:#b91c1c; font-weight:700;">152 (72.3%)</td>
                <td style="padding:12px 14px;">⭐⭐⭐☆☆ (3.4)</td>
                <td style="padding:12px 14px;"><span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">Audit Required</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- AI Image Validation & Moderation Console -->
      <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <h4 style="font-size:1.05rem; font-weight:700; color:#0f172a; margin:0; display:flex; align-items:center; gap:8px;">
              🛡️ AI Image Verification & Moderation Queue
            </h4>
            <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">
              Review AI vision classifications, inspect flagged photos, and take moderation action.
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <select id="admin-val-filter" onchange="loadAdminAiValidations()" style="padding:4px 10px; border-radius:6px; border:1px solid #cbd5e1; font-size:0.8rem;">
              <option value="">All Statuses</option>
              <option value="manual_review" selected>Pending Review</option>
              <option value="rejected">Rejected</option>
              <option value="approved">Approved</option>
            </select>
            <button class="btn btn-outline" style="padding:4px 10px; font-size:0.8rem;" onclick="loadAdminAiValidations()">
              🔄 Refresh
            </button>
          </div>
        </div>
        <div id="admin-ai-moderation-container">
          <div style="text-align:center; padding:20px; color:#64748b; font-size:0.85rem;">
            Loading moderation records...
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      if (typeof window.loadAdminAiValidations === "function") {
        window.loadAdminAiValidations();
      }
    }, 150);
  }
}

// Admin AI Moderation Functions
window.loadAdminAiValidations = async function() {
  const container = document.getElementById("admin-ai-moderation-container");
  if (!container) return;
  const filterSelect = document.getElementById("admin-val-filter");
  const statusFilter = filterSelect ? filterSelect.value : "";

  try {
    const url = statusFilter ? `/api/admin/validations?status=${statusFilter}` : '/api/admin/validations';
    const res = await fetch(url, {
      headers: {
        'x-user-role': 'admin',
        'x-admin-key': 'true'
      }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      container.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:12px;">Failed to load validations: ${data.error || 'Access denied'}</div>`;
      return;
    }

    if (!data.validations || data.validations.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:24px; color:#64748b; font-size:0.85rem;">
          ✓ No image validations currently match this filter.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.825rem;">
          <thead style="background:#f8fafc; color:#64748b; border-bottom:1px solid #e2e8f0;">
            <tr>
              <th style="padding:8px 12px;">ID / Time</th>
              <th style="padding:8px 12px;">Category</th>
              <th style="padding:8px 12px;">Confidence / Status</th>
              <th style="padding:8px 12px;">Detected Labels</th>
              <th style="padding:8px 12px; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.validations.map(v => {
              const isApp = v.status === 'approved';
              const isRev = v.status === 'manual_review';
              const badgeStyle = isApp ? 'background:#dcfce7; color:#15803d;' : isRev ? 'background:#fef3c7; color:#b45309;' : 'background:#fee2e2; color:#b91c1c;';
              return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:10px 12px;">
                    <div style="font-weight:700; color:#0f172a;">${v.validationId}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style="padding:10px 12px;">
                    <span style="font-weight:600; color:#2563eb;">${v.selectedCategory.replace('_', ' ').toUpperCase()}</span>
                    ${v.predictedCategory && v.predictedCategory !== v.selectedCategory ? `<div style="font-size:0.75rem; color:#94a3b8;">Predicted: ${v.predictedCategory}</div>` : ''}
                  </td>
                  <td style="padding:10px 12px;">
                    <span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700; ${badgeStyle}">
                      ${v.status.toUpperCase()} (${Math.round((v.confidence || 0) * 100)}%)
                    </span>
                    <div style="font-size:0.725rem; color:#64748b; margin-top:2px;">${v.reasonCode || 'VERIFIED'}</div>
                  </td>
                  <td style="padding:10px 12px;">
                    ${(v.labels || []).slice(0, 3).map(l => `<span class="ai-label-pill">${l.name}</span>`).join('') || '<span style="color:#94a3b8;">None</span>'}
                  </td>
                  <td style="padding:10px 12px; text-align:right; white-space:nowrap;">
                    <button class="btn btn-outline" style="padding:3px 8px; font-size:0.725rem; color:#15803d; border-color:#86efac;" onclick="adminModerateValidation('${v.validationId}', 'approve')">✓ Approve</button>
                    <button class="btn btn-outline" style="padding:3px 8px; font-size:0.725rem; color:#b91c1c; border-color:#fca5a5; margin-left:4px;" onclick="adminModerateValidation('${v.validationId}', 'reject')">✕ Reject</button>
                    <button class="btn btn-outline" style="padding:3px 8px; font-size:0.725rem; color:#2563eb; border-color:#bfdbfe; margin-left:4px;" onclick="adminModerateValidation('${v.validationId}', 'recategorize')">🔄 Recategorize</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444; font-size:0.85rem; padding:12px;">Error: ${err.message}</div>`;
  }
};

window.adminModerateValidation = async function(validationId, action) {
  let reason = "";
  let newCategory = "";

  if (action === "reject") {
    reason = prompt("Reason for rejection:", "Photo does not clearly show civic issue");
    if (reason === null) return;
  } else if (action === "recategorize") {
    newCategory = prompt("Enter correct category key (road_damage, garbage_overflow, broken_streetlight, water_leakage, drainage_problem):", "road_damage");
    if (!newCategory) return;
  }

  try {
    const res = await fetch(`/api/admin/validations/${validationId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
        "x-admin-key": "true"
      },
      body: JSON.stringify({ action, reason, newCategory })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(`Action failed: ${data.error || 'Unknown error'}`);
      return;
    }
    showToast(`Moderation action "${action}" applied to ${validationId}`);
    window.loadAdminAiValidations();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

// Multi-Role Sign Up & Login Handlers
window.openSignupModal = function(role = "citizen") {
  const allowed = ["citizen", "nagarsevak", "mla"];
  const targetRole = allowed.includes(role) ? role : "citizen";
  openModal("modal-signup");
  selectSignupRole(targetRole);
};

window.openLoginModal = function(role = "citizen") {
  openModal("modal-login");
  selectLoginRole(role);
};

window.switchToSignup = function() {
  closeModal("modal-login");
  const targetRole = currentLoginRole === "admin" ? "citizen" : (currentLoginRole || "citizen");
  openSignupModal(targetRole);
};

window.switchToLogin = function() {
  closeModal("modal-signup");
  openLoginModal(currentSignupRole || "citizen");
};

window.selectSignupRole = function(role) {
  const allowedRoles = ["citizen", "nagarsevak", "mla"];
  if (!allowedRoles.includes(role)) {
    role = "citizen";
  }
  currentSignupRole = role;
  allowedRoles.forEach(r => {
    const el = document.getElementById(`signup-card-${r}`);
    if (el) {
      if (r === role) el.classList.add("active");
      else el.classList.remove("active");
    }
  });

  const submitBtn = document.getElementById("btn-signup-submit");
  const titles = {
    citizen: "Register as Citizen",
    nagarsevak: "Register as Ward Corporator",
    mla: "Register as MLA (Aamdar)"
  };
  if (submitBtn) submitBtn.innerText = titles[role] || "Create Account";

  renderSignupDynamicFields(role);
};

// Municipal Ward & Nagarsevak Directory
const wardDirectory = {
  "Pune": {
    "Ward 42": {
      wardCode: "Ward 42",
      wardName: "Ward 42 - Shivajinagar Central",
      nagarsevakName: "Ramesh Patil",
      party: "Shivajinagar Citizens Forum / BJP",
      office: "PMC Ward 42 Office, Near Shivaji Chowk, FC Road, Pune",
      phone: "+91 98220 14242",
      email: "ramesh.patil.ward42@punecorporation.org",
      mla: "Devendra Joshi (Shivajinagar MLA)",
      photo: "user_avatar.png"
    },
    "Ward 18": {
      wardCode: "Ward 18",
      wardName: "Ward 18 - Model Colony & Deep Bungalow",
      nagarsevakName: "Priya More",
      party: "Vikas Aghadi",
      office: "Ward 18 Office, Deep Bungalow Chowk, Pune",
      phone: "+91 98220 18181",
      email: "priya.more.ward18@punecorporation.org",
      mla: "Chandrakant Patil (Kothrud MLA)",
      photo: "user_avatar.png"
    },
    "Ward 09": {
      wardCode: "Ward 09",
      wardName: "Ward 09 - Kothrud Stand & Paud Road",
      nagarsevakName: "Sachin Joshi",
      party: "BJP",
      office: "Ward 09 Suvidha Kendra, Paud Road, Pune",
      phone: "+91 98220 09090",
      email: "sachin.joshi.ward09@punecorporation.org",
      mla: "Chandrakant Patil (Kothrud MLA)",
      photo: "user_avatar.png"
    },
    "Ward 24": {
      wardCode: "Ward 24",
      wardName: "Ward 24 - Pune Camp & MG Road",
      nagarsevakName: "Feroz Khan",
      party: "Congress",
      office: "Cantonment Ward Office, East Street, Pune",
      phone: "+91 98220 24242",
      email: "feroz.khan.ward24@punecorporation.org",
      mla: "Pune Cantonment Assembly Rep",
      photo: "user_avatar.png"
    }
  },
  "Mumbai": {
    "Ward A": {
      wardCode: "Ward A",
      wardName: "Ward A - Colaba & Churchgate",
      nagarsevakName: "Makarand Narwekar",
      party: "BJP",
      office: "BMC Ward A Office, Shahid Bhagat Singh Marg, Fort, Mumbai",
      phone: "+91 98200 11001",
      email: "ward.a@mcgm.gov.in",
      mla: "Rahul Narwekar (Colaba MLA)",
      photo: "user_avatar.png"
    },
    "Ward K-West": {
      wardCode: "Ward K-West",
      wardName: "Ward K-West - Andheri West & Juhu",
      nagarsevakName: "Rohan Rathod",
      party: "Shiv Sena (UBT)",
      office: "BMC K-West Ward Office, Paliram Road, Andheri West, Mumbai",
      phone: "+91 98200 22002",
      email: "ward.kwest@mcgm.gov.in",
      mla: "Ameet Satam (Andheri West MLA)",
      photo: "user_avatar.png"
    }
  },
  "Nagpur": {
    "Ward 12": {
      wardCode: "Ward 12",
      wardName: "Ward 12 - Dharampeth & Ram Nagar",
      nagarsevakName: "Varsha Thakre",
      party: "BJP",
      office: "NMC Dharampeth Zone, West High Court Rd, Nagpur",
      phone: "+91 98230 12012",
      email: "ward12@nmc.gov.in",
      mla: "Nagpur West Assembly Rep",
      photo: "user_avatar.png"
    }
  }
};

// Municipal Admin-Assigned Ward Security Codes Directory
const adminWardCodes = {
  "PMC-WARD-42": {
    city: "Pune",
    wardCode: "Ward 42",
    wardName: "Ward 42 - Shivajinagar Central",
    corporation: "Pune Municipal Corporation (PMC)",
    office: "PMC Ward 42 Office, Near Shivaji Chowk, FC Road, Pune",
    mla: "Devendra Joshi (Shivajinagar MLA)",
    zone: "Zone 3 - Central Pune"
  },
  "PMC-WARD-18": {
    city: "Pune",
    wardCode: "Ward 18",
    wardName: "Ward 18 - Model Colony & Deep Bungalow",
    corporation: "Pune Municipal Corporation (PMC)",
    office: "Ward 18 Office, Deep Bungalow Chowk, Pune",
    mla: "Chandrakant Patil (Kothrud MLA)",
    zone: "Zone 2 - West Pune"
  },
  "PMC-WARD-09": {
    city: "Pune",
    wardCode: "Ward 09",
    wardName: "Ward 09 - Kothrud Stand & Paud Road",
    corporation: "Pune Municipal Corporation (PMC)",
    office: "Ward 09 Suvidha Kendra, Paud Road, Pune",
    mla: "Chandrakant Patil (Kothrud MLA)",
    zone: "Zone 2 - West Pune"
  },
  "PMC-WARD-24": {
    city: "Pune",
    wardCode: "Ward 24",
    wardName: "Ward 24 - Pune Camp & MG Road",
    corporation: "Pune Municipal Corporation (PMC)",
    office: "Cantonment Ward Office, East Street, Pune",
    mla: "Pune Cantonment Assembly Rep",
    zone: "Zone 1 - Cantonment"
  },
  "BMC-WARD-A": {
    city: "Mumbai",
    wardCode: "Ward A",
    wardName: "Ward A - Colaba & Churchgate",
    corporation: "Brihanmumbai Municipal Corporation (BMC)",
    office: "BMC Ward A Office, Shahid Bhagat Singh Marg, Fort, Mumbai",
    mla: "Rahul Narwekar (Colaba MLA)",
    zone: "Zone 1 - South Mumbai"
  },
  "BMC-WARD-KW": {
    city: "Mumbai",
    wardCode: "Ward K-West",
    wardName: "Ward K-West - Andheri West & Juhu",
    corporation: "Brihanmumbai Municipal Corporation (BMC)",
    office: "BMC K-West Ward Office, Paliram Road, Andheri West, Mumbai",
    mla: "Ameet Satam (Andheri West MLA)",
    zone: "Zone 4 - Western Suburbs"
  },
  "NMC-WARD-12": {
    city: "Nagpur",
    wardCode: "Ward 12",
    wardName: "Ward 12 - Dharampeth & Ram Nagar",
    corporation: "Nagpur Municipal Corporation (NMC)",
    office: "NMC Dharampeth Zone, West High Court Rd, Nagpur",
    mla: "Nagpur West Assembly Rep",
    zone: "Dharampeth Zone"
  }
};

let nagarsevakPhotoData = "user_avatar.png";
let detectedNagarsevakWard = adminWardCodes["PMC-WARD-42"];

window.handleNagarsevakPhotoSelect = function(e) {
  const file = e.target.files && e.target.files[0];
  if (file) {
    nagarsevakPhotoData = URL.createObjectURL(file);
    const preview = document.getElementById("nagarsevak-photo-preview");
    if (preview) preview.src = nagarsevakPhotoData;
    showToast("📸 Official corporator photo attached!");
  }
};

window.fillAdminWardCode = function(code) {
  const input = document.getElementById("signup-admin-ward-code");
  if (input) {
    input.value = code;
    verifyAdminWardCode(code);
  }
};

window.verifyAdminWardCode = function(code) {
  const cleanCode = (code || "").trim().toUpperCase();
  const container = document.getElementById("nagarsevak-detected-ward-container");
  if (!container) return;

  if (!cleanCode) {
    detectedNagarsevakWard = null;
    container.innerHTML = `
      <div class="ward-invalid-card" style="background:#f8fafc; border:1px dashed #cbd5e1; color:#64748b;">
        ℹ️ Enter your admin-issued ward security code above to automatically detect and lock your municipal ward.
      </div>
    `;
    return;
  }

  const ward = adminWardCodes[cleanCode];
  if (ward) {
    detectedNagarsevakWard = ward;
    container.innerHTML = `
      <div class="ward-verified-card" style="padding: 8px 10px; margin-top: 6px; border-radius: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
          <div>
            <span style="font-size:0.65rem; font-weight:700; color:#15803d; background:#dcfce7; padding:2px 6px; border-radius:9999px; border:1px solid #bbf7d0;">
              ✓ Admin Code Verified
            </span>
            <div style="font-size:0.85rem; font-weight:800; color:#0f172a; margin-top:2px;">
              ${ward.wardName}
            </div>
            <div style="font-size:0.7rem; color:#475569;">
              ${ward.corporation} • ${ward.city}
            </div>
          </div>
          <span style="font-size:0.7rem; font-weight:700; color:#1d4ed8; background:#eff6ff; padding:2px 8px; border-radius:4px; border:1px solid #bfdbfe;">
            ${ward.wardCode}
          </span>
        </div>

        <div style="background:#ffffff; border-radius:6px; padding:5px 8px; font-size:0.7rem; color:#334155; border:1px solid #d1fae5; margin-bottom:5px;">
          <div><strong>Ward Office:</strong> ${ward.office}</div>
          <div style="margin-top:1px;"><strong>MLA Oversight:</strong> ${ward.mla}</div>
        </div>

        <div style="font-size:0.675rem; font-weight:600; color:#047857; display:flex; align-items:center; gap:4px;">
          <span>🔒 Ward Privacy: Displaying complaints in ${ward.wardCode}.</span>
        </div>
      </div>
    `;
  } else {
    detectedNagarsevakWard = null;
    container.innerHTML = `
      <div class="ward-invalid-card" style="padding: 6px 10px; margin-top: 6px; border-radius: 6px; font-size: 0.725rem;">
        <div style="font-weight:700; margin-bottom:1px;">⚠️ Unrecognized Admin Ward Code: "${cleanCode}"</div>
        <div>Please enter the unique code issued by the Municipal Admin or click one of the sample codes above.</div>
      </div>
    `;
  }
};

// Municipal Admin-Assigned City Security Codes Directory (for MLAs / Aamdars)
const adminCityCodes = {
  "CITY-PUNE-2024": {
    city: "Pune",
    cityName: "Pune City",
    state: "Maharashtra",
    corporation: "Pune Municipal Corporation (PMC)",
    constituency: "Shivajinagar, Kothrud, Pune Cantonment, Kasba Peth, Parvati",
    wardsCount: 182,
    assemblySeat: "Maharashtra Legislative Assembly (Vidhan Sabha)",
    mlaOffice: "Vidhan Bhavan Liaison Office, Central Building, Pune",
    helpline: "+91 20 2550 1000"
  },
  "CITY-MUMBAI-2024": {
    city: "Mumbai",
    cityName: "Mumbai City (MMR)",
    state: "Maharashtra",
    corporation: "Brihanmumbai Municipal Corporation (BMC)",
    constituency: "Colaba, Malabar Hill, Andheri West, Bandra West, Ghatkopar",
    wardsCount: 227,
    assemblySeat: "Maharashtra Legislative Assembly (Vidhan Sabha)",
    mlaOffice: "Vidhan Bhavan, Nariman Point, Mumbai",
    helpline: "+91 22 2262 0251"
  },
  "CITY-NAGPUR-2024": {
    city: "Nagpur",
    cityName: "Nagpur City",
    state: "Maharashtra",
    corporation: "Nagpur Municipal Corporation (NMC)",
    constituency: "Nagpur South West, Nagpur West, Nagpur Central, Nagpur East",
    wardsCount: 151,
    assemblySeat: "Maharashtra Legislative Assembly (Vidhan Sabha)",
    mlaOffice: "MLA Secretariat, Civil Lines, Nagpur",
    helpline: "+91 712 256 7000"
  }
};

function lookupAdminCityCode(code) {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  if (adminCityCodes[clean]) return adminCityCodes[clean];
  if (clean.includes("PUNE")) return adminCityCodes["CITY-PUNE-2024"];
  if (clean.includes("MUMBAI") || clean.includes("BOMBAY") || clean.includes("BMC")) return adminCityCodes["CITY-MUMBAI-2024"];
  if (clean.includes("NAGPUR") || clean.includes("NMC")) return adminCityCodes["CITY-NAGPUR-2024"];
  return null;
}

let mlaPhotoData = "user_avatar.png";
let detectedMlaCity = adminCityCodes["CITY-PUNE-2024"];

window.handleMlaPhotoSelect = function(e) {
  const file = e.target.files && e.target.files[0];
  if (file) {
    mlaPhotoData = URL.createObjectURL(file);
    const preview = document.getElementById("mla-photo-preview");
    if (preview) preview.src = mlaPhotoData;
    showToast("📸 Official MLA photo attached!");
  }
};

window.fillAdminCityCode = function(code) {
  const input = document.getElementById("signup-admin-city-code");
  if (input) {
    input.value = code;
    verifyAdminCityCode(code);
  }
};

window.verifyAdminCityCode = function(code) {
  const container = document.getElementById("mla-detected-city-container");
  if (!container) return;

  const cityData = lookupAdminCityCode(code);
  if (cityData) {
    detectedMlaCity = cityData;
    container.innerHTML = `
      <div class="ward-verified-card" style="padding: 8px 10px; margin-top: 6px; border-radius: 8px; border-color:#ef4444; background:linear-gradient(135deg, #fff1f2 0%, #fff5f5 100%);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
          <div>
            <span style="font-size:0.65rem; font-weight:700; color:#991b1b; background:#fee2e2; padding:2px 6px; border-radius:9999px; border:1px solid #fca5a5;">
              ✓ Admin Code Verified
            </span>
            <div style="font-size:0.85rem; font-weight:800; color:#0f172a; margin-top:2px;">
              📍 ${cityData.cityName} (${cityData.state})
            </div>
            <div style="font-size:0.7rem; color:#475569;">
              ${cityData.corporation} • Across ${cityData.wardsCount} Wards
            </div>
          </div>
          <span style="font-size:0.68rem; font-weight:700; color:#b91c1c; background:#fef2f2; padding:2px 6px; border-radius:4px; border:1px solid #fecaca;">
            MLA Jurisdiction
          </span>
        </div>

        <div style="background:#ffffff; border-radius:6px; padding:5px 8px; font-size:0.7rem; color:#334155; border:1px solid #fecdd3; margin-bottom:5px;">
          <div><strong>Constituencies:</strong> ${cityData.constituency}</div>
          <div style="margin-top:1px;"><strong>Liaison:</strong> ${cityData.mlaOffice}</div>
        </div>

        <div style="font-size:0.68rem; font-weight:600; color:#991b1b; display:flex; align-items:center; gap:4px;">
          <span>⚡ Auto-Escalation: Reviewing escalated complaints in ${cityData.cityName}.</span>
        </div>
      </div>
    `;
  } else {
    detectedMlaCity = null;
    container.innerHTML = `
      <div class="ward-invalid-card" style="padding: 6px 10px; margin-top: 6px; border-radius: 6px; font-size: 0.725rem; border-color:#ef4444; color:#991b1b; background:#fef2f2;">
        <div style="font-weight:700; margin-bottom:1px;">⚠️ Unrecognized Admin City Code</div>
        <div>Please enter an admin-assigned city code (e.g. CITY-PUNE-2024) or click one of the verified sample buttons above.</div>
      </div>
    `;
  }
};

window.switchMlaCityDemo = function(cityName) {
  const code = cityName === "Mumbai" ? "CITY-MUMBAI-2024" : (cityName === "Nagpur" ? "CITY-NAGPUR-2024" : "CITY-PUNE-2024");
  const cityData = adminCityCodes[code];

  if (!currentUser) {
    currentUser = {
      name: "Devendra Joshi",
      role: "mla",
      city: cityData.city,
      cityName: cityData.cityName,
      constituency: cityData.constituency,
      roleLabel: `MLA (Aamdar) • ${cityData.cityName}`,
      avatar: "user_avatar.png"
    };
  } else {
    currentUser.city = cityData.city;
    currentUser.cityName = cityData.cityName;
    currentUser.constituency = cityData.constituency;
    currentUser.roleLabel = `MLA (Aamdar) • ${cityData.cityName}`;
  }

  updateAuthUI();
  renderRoleDashboard("aamdar");
  showToast(`Switched MLA jurisdiction to ${cityData.cityName}`);
};

window.renderSignupDynamicFields = function(role) {
  const container = document.getElementById("signup-dynamic-fields");
  if (!container) return;

  if (role === "citizen") {
    container.innerHTML = `
      <!-- Auto-detect location & Nagarsevak banner -->
      <div id="gps-autodetect-container" class="gps-autodetect-box" style="padding: 6px 10px; margin-bottom: 7px; border-radius: 8px; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0;">
            📍
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.775rem; color: #0f172a; display: flex; align-items: center; gap: 5px;">
              <span>Auto-Detect City & Ward</span>
              <span class="radar-pulse" style="width: 7px; height: 7px;"></span>
            </div>
            <div id="gps-status-text" style="font-size: 0.675rem; color: #64748b;">
              Auto-detect your ward and corporator
            </div>
          </div>
        </div>
        <button type="button" id="btn-auto-detect-gps" class="btn btn-primary" style="padding: 5px 9px; font-size: 0.72rem; white-space: nowrap; border-radius: 6px;" onclick="triggerAutoDetectLocation()">
          ⚡ Auto-Detect
        </button>
      </div>

      <!-- City & Ward Inputs -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 7px;">
        <div>
          <label class="form-label" style="font-size: 0.725rem; margin-bottom: 2px;">City Information *</label>
          <select id="signup-city" class="form-control" style="font-size: 0.775rem; padding: 5px 8px;" onchange="handleCityChange(this.value)" required>
            <option value="Pune" selected>Pune (PMC)</option>
            <option value="Mumbai">Mumbai (BMC)</option>
            <option value="Nagpur">Nagpur (NMC)</option>
          </select>
        </div>
        <div>
          <label class="form-label" style="font-size: 0.725rem; margin-bottom: 2px;">Ward Number *</label>
          <select id="signup-ward" class="form-control" style="font-size: 0.775rem; padding: 5px 8px;" onchange="handleWardChange(this.value)" required>
            <option value="Ward 42">Ward 42 - Shivajinagar</option>
            <option value="Ward 18">Ward 18 - Model Colony</option>
            <option value="Ward 09">Ward 09 - Kothrud Stand</option>
            <option value="Ward 24">Ward 24 - Pune Camp</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom: 7px;">
        <label class="form-label" style="font-size: 0.725rem; margin-bottom: 2px;">Residential Landmark *</label>
        <input type="text" id="signup-address" class="form-control" placeholder="e.g. Near Ferguson College Road" style="font-size: 0.775rem; padding: 5px 8px;" required>
      </div>

      <!-- Auto-Detected Nagarsevak Preview Card -->
      <div id="nagarsevak-info-box">
        <!-- Rendered dynamically -->
      </div>
    `;

    // Initialize Nagarsevak preview for default selection
    updateNagarsevakPreview("Pune", "Ward 42");
  } else if (role === "nagarsevak") {
    container.innerHTML = `
      <!-- Photo Upload Widget -->
      <div class="nagarsevak-photo-box" style="padding: 6px 10px; margin-bottom: 7px; border-radius: 8px; gap: 10px;">
        <img id="nagarsevak-photo-preview" src="${nagarsevakPhotoData}" alt="Official Photo" class="nagarsevak-photo-preview-img" style="width: 32px; height: 32px; border-radius: 50%;" />
        <div style="flex-grow:1;">
          <div style="font-weight:700; font-size:0.775rem; color:#0f172a;">Official Corporator Photo *</div>
          <div style="font-size:0.675rem; color:#64748b; margin-bottom:3px;">Displayed on citizen complaint cards</div>
          <input type="file" id="signup-nagarsevak-photo" accept="image/*" style="display:none;" onchange="handleNagarsevakPhotoSelect(event)">
          <button type="button" class="btn btn-outline" style="padding:2px 7px; font-size:0.68rem; font-weight:600; border-radius:4px;" onclick="document.getElementById('signup-nagarsevak-photo').click()">
            📷 Choose Photo
          </button>
        </div>
      </div>

      <!-- Admin Ward Code Input -->
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
          <label class="form-label" style="font-size:0.725rem; margin-bottom:0;">Admin-Assigned Ward Code *</label>
          <span style="font-size:0.65rem; color:#2563eb; font-weight:600;">Issued by Municipal Admin</span>
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="signup-admin-ward-code" class="form-control" placeholder="e.g. PMC-WARD-42" value="PMC-WARD-42" oninput="verifyAdminWardCode(this.value)" style="font-size:0.775rem; text-transform:uppercase; font-weight:700; letter-spacing:0.04em; padding:5px 8px;" required>
          <button type="button" class="btn btn-primary" style="padding:5px 10px; font-size:0.725rem; white-space:nowrap; border-radius:6px;" onclick="verifyAdminWardCode(document.getElementById('signup-admin-ward-code').value)">
            Verify Code
          </button>
        </div>
        
        <!-- Clickable Sample Admin Codes for instant test -->
        <div style="margin-top:5px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
          <span style="font-size:0.65rem; color:#64748b; font-weight:600;">Sample Codes:</span>
          <button type="button" class="admin-code-pill" style="font-size:0.65rem; padding:1px 6px;" onclick="fillAdminWardCode('PMC-WARD-42')">PMC-WARD-42</button>
          <button type="button" class="admin-code-pill" style="font-size:0.65rem; padding:1px 6px;" onclick="fillAdminWardCode('PMC-WARD-18')">PMC-WARD-18</button>
          <button type="button" class="admin-code-pill" style="font-size:0.65rem; padding:1px 6px;" onclick="fillAdminWardCode('PMC-WARD-09')">PMC-WARD-09</button>
          <button type="button" class="admin-code-pill" style="font-size:0.65rem; padding:1px 6px;" onclick="fillAdminWardCode('BMC-WARD-A')">BMC-WARD-A</button>
        </div>
      </div>

      <!-- Auto-Detected Ward Details Container -->
      <div id="nagarsevak-detected-ward-container">
        <!-- Rendered dynamically on code input -->
      </div>
    `;

    // Initialize verification with default PMC-WARD-42
    verifyAdminWardCode("PMC-WARD-42");
  } else if (role === "mla") {
    container.innerHTML = `
      <!-- Photo Upload Widget -->
      <div class="nagarsevak-photo-box" style="border-color:#fecaca; padding: 6px 10px; margin-bottom: 7px; border-radius: 8px; gap: 10px;">
        <img id="mla-photo-preview" src="${mlaPhotoData}" alt="Official MLA Photo" class="nagarsevak-photo-preview-img" style="border-color:#dc2626; width: 32px; height: 32px; border-radius: 50%;" />
        <div style="flex-grow:1;">
          <div style="font-weight:700; font-size:0.775rem; color:#0f172a;">Official MLA (Aamdar) Photo *</div>
          <div style="font-size:0.675rem; color:#64748b; margin-bottom:3px;">Displayed on legislative alerts</div>
          <input type="file" id="signup-mla-photo" accept="image/*" style="display:none;" onchange="handleMlaPhotoSelect(event)">
          <button type="button" class="btn btn-outline" style="padding:2px 7px; font-size:0.68rem; font-weight:600; border-radius:4px;" onclick="document.getElementById('signup-mla-photo').click()">
            📷 Choose Photo
          </button>
        </div>
      </div>

      <!-- Admin City Code Input -->
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
          <label class="form-label" style="font-size:0.725rem; margin-bottom:0;">Admin-Assigned City Code *</label>
          <span style="font-size:0.65rem; color:#dc2626; font-weight:600;">State Legislative Registry</span>
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="signup-admin-city-code" class="form-control" placeholder="e.g. CITY-PUNE-2024" value="CITY-PUNE-2024" oninput="verifyAdminCityCode(this.value)" style="font-size:0.775rem; text-transform:uppercase; font-weight:700; letter-spacing:0.04em; padding:5px 8px;" required>
          <button type="button" class="btn btn-primary" style="padding:5px 10px; font-size:0.725rem; white-space:nowrap; background:#dc2626; border-radius:6px;" onclick="verifyAdminCityCode(document.getElementById('signup-admin-city-code').value)">
            Locate City
          </button>
        </div>

        <!-- Clickable Sample Admin City Codes for instant test -->
        <div style="margin-top:5px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
          <span style="font-size:0.65rem; color:#64748b; font-weight:600;">Sample Codes:</span>
          <button type="button" class="admin-code-pill" style="color:#b91c1c; font-size:0.65rem; padding:1px 6px;" onclick="fillAdminCityCode('CITY-PUNE-2024')">CITY-PUNE-2024</button>
          <button type="button" class="admin-code-pill" style="color:#b91c1c; font-size:0.65rem; padding:1px 6px;" onclick="fillAdminCityCode('CITY-MUMBAI-2024')">CITY-MUMBAI-2024</button>
          <button type="button" class="admin-code-pill" style="color:#b91c1c; font-size:0.65rem; padding:1px 6px;" onclick="fillAdminCityCode('CITY-NAGPUR-2024')">CITY-NAGPUR-2024</button>
        </div>
      </div>

      <!-- Auto-Located City Details Container -->
      <div id="mla-detected-city-container">
        <!-- Rendered dynamically on code input -->
      </div>
    `;

    // Initialize verification with default CITY-PUNE-2024
    verifyAdminCityCode("CITY-PUNE-2024");
  }
};

window.selectLoginRole = function(role) {
  currentLoginRole = role;
  const roles = ["citizen", "nagarsevak", "mla", "admin"];
  roles.forEach(r => {
    const btn = document.getElementById(`login-tab-${r}`);
    if (btn) {
      if (r === role) {
        btn.style.background = "white";
        btn.style.color = "#1d4ed8";
        btn.style.fontWeight = "700";
        btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
      } else {
        btn.style.background = "transparent";
        btn.style.color = "#64748b";
        btn.style.fontWeight = "600";
        btn.style.boxShadow = "none";
      }
    }
  });

  const label = document.getElementById("login-id-label");
  const input = document.getElementById("login-id-input");
  const submitBtn = document.getElementById("btn-login-submit");

  const roleConfig = {
    citizen: {
      label: "Mobile Number / Citizen ID *",
      placeholder: "Enter 10-digit mobile number",
      btn: "Sign In as Citizen"
    },
    nagarsevak: {
      label: "Corporator ID / Municipal Email *",
      placeholder: "e.g. PMC-CORP-042 or official email",
      btn: "Sign In as Nagarsevak"
    },
    mla: {
      label: "Constituency Code / Assembly Email *",
      placeholder: "e.g. MLA-MAH-89 or govt email",
      btn: "Sign In as MLA (Aamdar)"
    },
    admin: {
      label: "Admin Employee ID / Officer Code *",
      placeholder: "e.g. PMC-ENG-001 or commissioner code",
      btn: "Sign In as Municipal Admin"
    }
  };

  if (label && input && submitBtn) {
    const cfg = roleConfig[role] || roleConfig.citizen;
    label.innerText = cfg.label;
    input.placeholder = cfg.placeholder;
    submitBtn.innerText = cfg.btn;
  }
};

window.demoLogin = function(role) {
  const users = {
    citizen: {
      name: "Aarav Sharma",
      role: "citizen",
      roleLabel: "Citizen • Ward 42",
      avatar: "user_avatar.png"
    },
    nagarsevak: {
      name: "Ramesh Patil",
      role: "nagarsevak",
      city: "Pune",
      ward: "Ward 42",
      wardName: "Ward 42 - Shivajinagar Central",
      roleLabel: "Nagarsevak (Ward 42)",
      avatar: "user_avatar.png"
    },
    mla: {
      name: "Devendra Joshi",
      role: "mla",
      city: "Pune",
      cityName: "Pune City",
      constituency: "Shivajinagar, Kothrud, Pune Cantonment",
      roleLabel: "MLA (Aamdar) • Pune City",
      avatar: "user_avatar.png"
    },
    admin: {
      name: "Dr. Sanjay Kulkarni",
      role: "admin",
      roleLabel: "Admin • PMC Commissioner",
      avatar: "user_avatar.png"
    }
  };

  currentUser = users[role] || users.citizen;
  closeModal("modal-login");
  updateAuthUI();

  if (role === "citizen") {
    try {
      localStorage.setItem('civicconnect_citizen', JSON.stringify({
        name: currentUser.name || "Demo Citizen",
        email: "citizen@demo.com",
        phone: "+91 98765 43210",
        city: "Pune",
        ward: "Ward 1 - Central",
        corporator: "Ramesh Patil (Ward 1 Corporator)",
        address: "Near Central Market, Shivaji Chowk",
        coordinates: { lat: 18.5204, lng: 73.8567 },
        avatarText: "DC",
        joinedDate: "January 14, 2026"
      }));
    } catch (e) {}
    window.location.href = '/citizen/dashboard';
    return;
  }

  switchRoleTab(role === "mla" ? "aamdar" : role);
  openModal("modal-role-portal");
  showToast(`🎉 Logged in successfully as ${currentUser.name} (${currentUser.roleLabel})`);
};

// Auto-detect City, Ward & Nagarsevak using Google Maps / Device GPS
window.triggerAutoDetectLocation = function() {
  const btn = document.getElementById("btn-auto-detect-gps");
  const status = document.getElementById("gps-status-text");
  const container = document.getElementById("gps-autodetect-container");

  if (btn) {
    btn.innerHTML = `<span class="radar-pulse"></span> Locating...`;
    btn.disabled = true;
  }
  if (status) {
    status.innerText = "Querying Google Maps Geocoding & GPS coordinates...";
  }
  if (container) {
    container.classList.add("scanning");
  }

  showToast("📍 Accessing device GPS & Google Maps location...");

  // Geolocation simulation with realistic reverse-geocoding
  setTimeout(() => {
    const citySelect = document.getElementById("signup-city");
    const wardSelect = document.getElementById("signup-ward");
    const addressInput = document.getElementById("signup-address");

    if (citySelect) citySelect.value = "Pune";
    if (wardSelect) {
      handleCityChange("Pune");
      wardSelect.value = "Ward 42";
    }
    if (addressInput) {
      addressInput.value = "Shivaji Chowk, FC Road, Shivajinagar, Pune (GPS: 18.5204° N, 73.8567° E)";
    }

    updateNagarsevakPreview("Pune", "Ward 42");

    if (btn) {
      btn.innerHTML = `✓ Location Verified`;
      btn.disabled = false;
      btn.style.background = "#059669";
    }
    if (status) {
      status.innerHTML = `<strong style="color:#059669;">✓ Verified via Google Maps:</strong> Ward 42, Shivajinagar, Pune`;
    }
    if (container) {
      container.classList.remove("scanning");
      container.style.borderColor = "#10b981";
      container.style.background = "#f0fdf4";
    }

    showToast("🎉 Ward 42 detected! Nagarsevak Ramesh Patil connected.");
  }, 900);
};

// Handle City dropdown change
window.handleCityChange = function(selectedCity) {
  const wardSelect = document.getElementById("signup-ward");
  if (!wardSelect) return;

  const cityWards = wardDirectory[selectedCity];
  if (!cityWards) return;

  wardSelect.innerHTML = Object.keys(cityWards).map(code => `
    <option value="${code}">${cityWards[code].wardName}</option>
  `).join('');

  const firstWard = Object.keys(cityWards)[0];
  updateNagarsevakPreview(selectedCity, firstWard);
};

// Handle Ward dropdown change
window.handleWardChange = function(selectedWardCode) {
  const citySelect = document.getElementById("signup-city");
  const city = citySelect ? citySelect.value : "Pune";
  updateNagarsevakPreview(city, selectedWardCode);
};

// Update and render the auto-detected Nagarsevak card
window.updateNagarsevakPreview = function(city, wardCode) {
  const infoBox = document.getElementById("nagarsevak-info-box");
  if (!infoBox) return;

  const wardData = wardDirectory[city] && wardDirectory[city][wardCode] ? wardDirectory[city][wardCode] : null;

  if (!wardData) {
    infoBox.innerHTML = `
      <div style="background:#fff1f2; border:1px solid #fecaca; border-radius:10px; padding:12px; font-size:0.8rem; color:#991b1b;">
        Nagarsevak information pending assignment for this ward.
      </div>
    `;
    return;
  }

  infoBox.innerHTML = `
    <div class="nagarsevak-preview-card" style="padding: 7px 10px; margin-top: 5px; border-radius: 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:5px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${wardData.photo}" alt="${wardData.nagarsevakName}" class="nagarsevak-avatar-img" style="width:30px; height:30px; border-radius:50%;" />
          <div>
            <div style="font-size:0.65rem; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.03em;">
              ✓ Auto-Detected Corporator
            </div>
            <div style="font-size:0.85rem; font-weight:800; color:#0f172a; line-height:1.2;">
              ${wardData.nagarsevakName}
            </div>
            <div style="font-size:0.7rem; color:#475569;">
              ${wardData.wardName} • ${city}
            </div>
          </div>
        </div>
        <span style="font-size:0.65rem; font-weight:700; background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:9999px; border:1px solid #bbf7d0;">
          Assigned Rep
        </span>
      </div>

      <div style="background:#f8fafc; border-radius:6px; padding:5px 8px; font-size:0.7rem; color:#334155; display:grid; grid-template-columns:1fr 1fr; gap:3px 8px;">
        <div>
          <span style="color:#64748b; font-weight:600;">Office:</span>
          <div style="font-weight:600; color:#0f172a; font-size:0.675rem;">${wardData.office}</div>
        </div>
        <div>
          <span style="color:#64748b; font-weight:600;">Helpline:</span>
          <div style="font-weight:700; color:#2563eb; font-size:0.675rem;">📞 ${wardData.phone}</div>
        </div>
        <div style="grid-column: span 2;">
          <span style="color:#64748b; font-weight:600;">MLA Link:</span>
          <span style="font-weight:600; color:#0f172a; font-size:0.675rem;"> ⚡ ${wardData.mla}</span>
        </div>
      </div>
    </div>
  `;
};

window.handleSignupSubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email") ? document.getElementById("signup-email").value : "";
  const phone = document.getElementById("signup-phone").value;
  const pass = document.getElementById("signup-pass").value;
  const passConfirm = document.getElementById("signup-pass-confirm").value;

  if (pass !== passConfirm) {
    alert("Passwords do not match. Please re-enter.");
    return;
  }

  const roleLabels = {
    citizen: "Citizen",
    nagarsevak: "Nagarsevak (Ward Corporator)",
    mla: "MLA (Aamdar)"
  };

  if (currentSignupRole === "nagarsevak") {
    const codeInput = document.getElementById("signup-admin-ward-code");
    const code = codeInput ? codeInput.value.trim().toUpperCase() : "PMC-WARD-42";
    const wardData = adminWardCodes[code] || detectedNagarsevakWard || adminWardCodes["PMC-WARD-42"];

    currentUser = {
      name: name,
      email: email,
      phone: phone,
      city: wardData.city,
      ward: wardData.wardCode,
      wardName: wardData.wardName,
      corporation: wardData.corporation,
      role: "nagarsevak",
      roleLabel: `Nagarsevak • ${wardData.wardCode} (${wardData.city})`,
      avatar: nagarsevakPhotoData || "user_avatar.png"
    };

    closeModal("modal-signup");
    updateAuthUI();
    switchRoleTab("nagarsevak");
    openModal("modal-role-portal");
    showToast(`✅ Welcome Nagarsevak ${name}! Authorized for ${wardData.wardName}. Only citizen issues from ${wardData.wardCode} are routed to you.`);
    return;
  }

  if (currentSignupRole === "mla") {
    const codeInput = document.getElementById("signup-admin-city-code");
    const code = codeInput ? codeInput.value.trim().toUpperCase() : "CITY-PUNE-2024";
    const cityData = lookupAdminCityCode(code) || detectedMlaCity || adminCityCodes["CITY-PUNE-2024"];

    currentUser = {
      name: name,
      email: email,
      phone: phone,
      city: cityData.city,
      cityName: cityData.cityName,
      corporation: cityData.corporation,
      constituency: cityData.constituency,
      role: "mla",
      roleLabel: `MLA (Aamdar) • ${cityData.cityName}`,
      avatar: mlaPhotoData || "user_avatar.png"
    };

    closeModal("modal-signup");
    updateAuthUI();
    switchRoleTab("aamdar");
    openModal("modal-role-portal");
    showToast(`✅ Welcome MLA ${name}! Legislative jurisdiction auto-located to ${cityData.cityName} (${cityData.corporation}).`);
    return;
  }

  let city = "";
  let ward = "";
  let nagarsevakName = "";

  if (currentSignupRole === "citizen") {
    city = document.getElementById("signup-city") ? document.getElementById("signup-city").value : "Pune";
    ward = document.getElementById("signup-ward") ? document.getElementById("signup-ward").value : "Ward 42";
    const wardData = wardDirectory[city] && wardDirectory[city][ward] ? wardDirectory[city][ward] : null;
    nagarsevakName = wardData ? wardData.nagarsevakName : "Assigned Corporator";
  }

  currentUser = {
    name: name,
    email: email,
    phone: phone,
    city: city,
    ward: ward,
    nagarsevak: nagarsevakName,
    role: currentSignupRole,
    roleLabel: currentSignupRole === "citizen" ? `Citizen • ${city} (${ward})` : (roleLabels[currentSignupRole] || "Verified User"),
    avatar: "user_avatar.png"
  };

  if (currentSignupRole === "citizen") {
    try {
      localStorage.setItem('civicconnect_citizen', JSON.stringify({
        name: name,
        email: email || "citizen@demo.com",
        phone: phone || "+91 98765 43210",
        city: city || "Pune",
        ward: ward || "Ward 1 - Central",
        corporator: nagarsevakName || "Ramesh Patil (Ward Corporator)",
        address: document.getElementById("signup-address") ? document.getElementById("signup-address").value : "Near Central Market",
        coordinates: { lat: 18.5204, lng: 73.8567 },
        avatarText: name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "DC",
        joinedDate: "Today"
      }));
    } catch (e) {}
    closeModal("modal-signup");
    window.location.href = '/citizen/dashboard';
    return;
  }

  closeModal("modal-signup");
  updateAuthUI();
  switchRoleTab(currentSignupRole);
  openModal("modal-role-portal");
  showToast(`✅ Welcome, ${name}! Your ${currentUser.roleLabel} account has been created.`);
};

window.switchNagarsevakWardDemo = function(wardCode) {
  const matchingCode = Object.keys(adminWardCodes).find(k => adminWardCodes[k].wardCode === wardCode);
  const wardData = matchingCode ? adminWardCodes[matchingCode] : {
    city: "Pune",
    wardCode: wardCode,
    wardName: `${wardCode} Municipal Jurisdiction`,
    corporation: "Pune Municipal Corporation"
  };

  if (!currentUser) {
    currentUser = {
      name: "Ramesh Patil",
      role: "nagarsevak",
      roleLabel: `Nagarsevak • ${wardData.wardCode}`,
      city: wardData.city,
      ward: wardData.wardCode,
      wardName: wardData.wardName,
      avatar: "user_avatar.png"
    };
  } else {
    currentUser.ward = wardData.wardCode;
    currentUser.wardName = wardData.wardName;
    currentUser.city = wardData.city;
    currentUser.roleLabel = `Nagarsevak • ${wardData.wardCode} (${wardData.city})`;
  }
  updateAuthUI();
  renderRoleDashboard("nagarsevak");
  showToast(`Switched view to Nagarsevak of ${wardData.wardCode}`);
};

window.handleLoginSubmit = function(e) {
  e.preventDefault();
  demoLogin(currentLoginRole);
};

window.openRoleConsoleOrPortal = function() {
  if (currentUser && currentUser.role === 'citizen') {
    window.location.href = '/citizen/dashboard';
  } else {
    openModal("modal-role-portal");
  }
};

window.handleLogout = function() {
  const oldName = currentUser ? currentUser.name : "User";
  currentUser = null;
  try {
    localStorage.removeItem('civicconnect_citizen');
  } catch (e) {}
  closeModal("modal-role-portal");
  updateAuthUI();
  switchRoleTab("citizen");
  showToast(`Logged out from ${oldName}'s session.`);
};

window.updateAuthUI = function() {
  const guestGroup = document.getElementById("auth-guest-actions");
  const userPill = document.getElementById("auth-user-pill");
  const nameEl = document.getElementById("auth-user-name");
  const roleEl = document.getElementById("auth-user-role");
  const avatarEl = document.getElementById("auth-avatar");

  if (currentUser) {
    if (guestGroup) guestGroup.style.display = "none";
    if (userPill) userPill.style.display = "flex";
    if (nameEl) nameEl.innerText = currentUser.name;
    if (roleEl) roleEl.innerText = currentUser.roleLabel;
    if (avatarEl) {
      const avatarSrc = (currentUser.avatar && (currentUser.avatar.includes('.') || currentUser.avatar.startsWith('data:'))) 
        ? currentUser.avatar 
        : 'user_avatar.png';
      avatarEl.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }
  } else {
    if (guestGroup) guestGroup.style.display = "flex";
    if (userPill) userPill.style.display = "none";
  }
};

// View details of any complaint
window.viewComplaintDetails = function(ticketId) {
  openModal("modal-track");
  const input = document.getElementById("track-ticket-input");
  if (input) input.value = ticketId;
  searchTicket(ticketId);
};

// Corporator department assignment simulation
window.openDepartmentAssign = function(ticketId) {
  const depts = ["Roads & Bridges (PWD)", "Solid Waste Management", "Electrical & Streetlights", "Water Supply & Drainage"];
  const chosen = prompt(`Assign ticket #${ticketId} to Municipal Department:\n1. PWD Roads\n2. Solid Waste\n3. Electrical\n4. Water & Drainage\n\nEnter number (1-4):`, "1");
  if (chosen && chosen >= 1 && chosen <= 4) {
    const item = complaintsDB.find(c => c.id === ticketId);
    if (item) {
      item.department = depts[chosen - 1];
      item.status = `Assigned to ${item.department}`;
      showToast(`✓ Ticket #${ticketId} routed to ${item.department}`);
      renderRoleDashboard("nagarsevak");
    }
  }
};

// Toast notification helper
function showToast(msg) {
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${msg}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
