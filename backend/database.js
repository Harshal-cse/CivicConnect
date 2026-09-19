// CivicConnect - Dual-Engine Database (Local Atomic JSON + Supabase PostgreSQL)
// Provides instant synchronous local persistence with seamless cloud synchronization

const fs = require('fs');
const path = require('path');
const config = require('./config');
const supabaseClient = require('./supabaseClient');

class Database {
  constructor() {
    this.dataDir = config.DATA_DIR;
    this.ensureDataDir();
    this.validationsFile = path.join(this.dataDir, 'imageValidations.json');
    this.complaintsFile = path.join(this.dataDir, 'complaints.json');
    this.auditFile = path.join(this.dataDir, 'moderationAudit.json');
    this.initFiles();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  initFiles() {
    if (!fs.existsSync(this.validationsFile)) {
      fs.writeFileSync(this.validationsFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.complaintsFile)) {
      fs.writeFileSync(this.complaintsFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.auditFile)) {
      fs.writeFileSync(this.auditFile, JSON.stringify([], null, 2));
    }
  }

  readFile(filePath) {
    try {
      this.ensureDataDir();
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content || '[]');
    } catch (e) {
      return [];
    }
  }

  writeFile(filePath, data) {
    this.ensureDataDir();
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, filePath);
  }

  // ==========================================================================
  // Image Validations Collection
  // ==========================================================================

  saveValidation(record) {
    const list = this.readFile(this.validationsFile);
    const existingIdx = list.findIndex(v => v.validationId === record.validationId);
    if (existingIdx >= 0) {
      list[existingIdx] = Object.assign({}, list[existingIdx], record, { updatedAt: new Date().toISOString() });
    } else {
      list.unshift(record);
    }
    this.writeFile(this.validationsFile, list);

    // Sync to Supabase in background when configured
    if (supabaseClient.isConfigured) {
      supabaseClient.saveValidation(record).catch(err => {
        console.warn('[Supabase Sync] Warning: could not sync validation to cloud:', err.message);
      });
    }

    return record;
  }

  getValidationById(validationId) {
    if (!validationId) return null;
    const list = this.readFile(this.validationsFile);
    return list.find(v => v.validationId === validationId) || null;
  }

  getValidationsByUser(userId) {
    const list = this.readFile(this.validationsFile);
    return list.filter(v => v.userId === userId);
  }

  listValidations(filter = {}) {
    let list = this.readFile(this.validationsFile);
    if (filter.status) {
      list = list.filter(v => v.status === filter.status);
    }
    if (filter.userId) {
      list = list.filter(v => v.userId === filter.userId);
    }
    if (filter.category) {
      list = list.filter(v => v.selectedCategory === filter.category);
    }
    return list;
  }

  async listValidationsAsync(filter = {}) {
    if (supabaseClient.isConfigured) {
      try {
        const cloudData = await supabaseClient.listValidations(filter);
        if (cloudData) return cloudData;
      } catch (_) {}
    }
    return this.listValidations(filter);
  }

  updateValidationStatus(validationId, updateData) {
    const list = this.readFile(this.validationsFile);
    const item = list.find(v => v.validationId === validationId);
    if (!item) return null;

    Object.assign(item, updateData, { updatedAt: new Date().toISOString() });
    this.writeFile(this.validationsFile, list);

    // Sync update to Supabase
    if (supabaseClient.isConfigured) {
      supabaseClient.updateValidationStatus(validationId, updateData).catch(err => {
        console.warn('[Supabase Sync] Warning: could not sync validation status update to cloud:', err.message);
      });
    }

    return item;
  }

  // ==========================================================================
  // Complaints Collection
  // ==========================================================================

  saveComplaint(complaint) {
    const list = this.readFile(this.complaintsFile);
    list.unshift(complaint);
    this.writeFile(this.complaintsFile, list);

    // Sync to Supabase in background when configured
    if (supabaseClient.isConfigured) {
      supabaseClient.saveComplaint(complaint).catch(err => {
        console.warn('[Supabase Sync] Warning: could not sync complaint to cloud:', err.message);
      });
    }

    return complaint;
  }

  getComplaintById(id) {
    const list = this.readFile(this.complaintsFile);
    return list.find(c => c.id === id) || null;
  }

  async getComplaintByIdAsync(id) {
    if (supabaseClient.isConfigured) {
      try {
        const cloudItem = await supabaseClient.getComplaintById(id);
        if (cloudItem) return cloudItem;
      } catch (_) {}
    }
    return this.getComplaintById(id);
  }

  listComplaints(filter = {}) {
    let list = this.readFile(this.complaintsFile);
    if (filter.ward) {
      list = list.filter(c => c.ward === filter.ward);
    }
    if (filter.city) {
      list = list.filter(c => c.city === filter.city);
    }
    if (filter.status) {
      list = list.filter(c => c.status === filter.status);
    }
    if (filter.userId) {
      list = list.filter(c => c.reportedByUserId === filter.userId);
    }
    return list;
  }

  async listComplaintsAsync(filter = {}) {
    if (supabaseClient.isConfigured) {
      try {
        const cloudList = await supabaseClient.listComplaints(filter);
        if (cloudList && cloudList.length > 0) return cloudList;
      } catch (_) {}
    }
    return this.listComplaints(filter);
  }

  // ==========================================================================
  // Moderation Audit Trail
  // ==========================================================================

  logModerationAction(auditEntry) {
    const list = this.readFile(this.auditFile);
    const entry = Object.assign({
      auditId: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    }, auditEntry);
    list.unshift(entry);
    this.writeFile(this.auditFile, list);

    // Sync to Supabase audit log
    if (supabaseClient.isConfigured) {
      supabaseClient.logModerationAction(entry).catch(err => {
        console.warn('[Supabase Sync] Warning: could not sync audit log to cloud:', err.message);
      });
    }

    return entry;
  }

  listAuditLogs() {
    return this.readFile(this.auditFile);
  }

  async listAuditLogsAsync() {
    if (supabaseClient.isConfigured) {
      try {
        const cloudLogs = await supabaseClient.listAuditLogs();
        if (cloudLogs) return cloudLogs;
      } catch (_) {}
    }
    return this.listAuditLogs();
  }
}

module.exports = new Database();
