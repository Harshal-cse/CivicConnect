// CivicConnect - Supabase Client & Cloud Integration Service
// Connects to Supabase PostgreSQL, Storage, and Realtime

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

class SupabaseClientService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    if (!config.isSupabaseConfigured) {
      this.isConfigured = false;
      this.client = null;
      return;
    }

    try {
      // Use Service Role Key for backend operations (bypasses RLS for validation gateway),
      // falling back to Anon Key if Service Role is not provided.
      const key = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
      this.client = createClient(config.SUPABASE_URL, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      this.isConfigured = true;
    } catch (err) {
      console.warn('[Supabase] Failed to initialize client:', err.message);
      this.isConfigured = false;
      this.client = null;
    }
  }

  /**
   * Test connection to Supabase cloud
   * @returns {Promise<Object>} Connection test diagnostic details
   */
  async testConnection() {
    if (!this.isConfigured || !this.client) {
      return {
        configured: false,
        connected: false,
        error: 'SUPABASE_URL or API keys are not configured in .env',
        provider: 'local_json_fallback'
      };
    }

    const start = Date.now();
    try {
      const { count, error } = await this.client
        .from('complaints')
        .select('*', { count: 'exact', head: true });

      const latencyMs = Date.now() - start;

      if (error) {
        return {
          configured: true,
          connected: false,
          latencyMs,
          error: error.message,
          hint: 'Ensure supabase/schema.sql has been executed in the Supabase SQL Editor.'
        };
      }

      return {
        configured: true,
        connected: true,
        latencyMs,
        complaintsCount: count || 0,
        url: config.SUPABASE_URL,
        storageBucket: config.SUPABASE_STORAGE_BUCKET
      };
    } catch (err) {
      return {
        configured: true,
        connected: false,
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  }

  // ==========================================================================
  // Complaints Operations
  // ==========================================================================

  async saveComplaint(complaint) {
    if (!this.isConfigured || !this.client) return null;

    const row = {
      id: complaint.id,
      title: complaint.title,
      category: complaint.category,
      category_display: complaint.categoryDisplay || complaint.category,
      description: complaint.description || '',
      location: complaint.location || '',
      coordinates: complaint.coordinates || null,
      ward: complaint.ward || '',
      city: complaint.city || config.PRIMARY_CITY.name,
      reported_by_user_id: complaint.reportedByUserId || complaint.reportedBy || 'CITIZEN-001',
      reported_by_name: complaint.reportedByName || complaint.reportedBy || 'Demo Citizen',
      status: complaint.status || 'Submitted',
      priority: complaint.priority || 'High',
      supports: complaint.supports || 1,
      validation_id: complaint.validationId || null,
      image_url: complaint.image || null,
      sla_remaining: complaint.slaRemaining || 'SLA Deadline: 2 days remaining',
      is_overdue: Boolean(complaint.isOverdue),
      timeline: complaint.timeline || [],
      created_at: complaint.reportedAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('complaints')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error saving complaint:', error.message);
      throw error;
    }
    return this._formatComplaintFromRow(data);
  }

  async getComplaintById(id) {
    if (!this.isConfigured || !this.client || !id) return null;

    const { data, error } = await this.client
      .from('complaints')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this._formatComplaintFromRow(data);
  }

  async listComplaints(filter = {}) {
    if (!this.isConfigured || !this.client) return null;

    let query = this.client.from('complaints').select('*').order('created_at', { ascending: false });

    if (filter.ward) query = query.eq('ward', filter.ward);
    if (filter.city) query = query.eq('city', filter.city);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.userId) query = query.eq('reported_by_user_id', filter.userId);
    if (filter.limit) query = query.limit(parseInt(filter.limit, 10));

    const { data, error } = await query;
    if (error) {
      console.error('[Supabase] Error listing complaints:', error.message);
      return null;
    }
    return data.map(r => this._formatComplaintFromRow(r));
  }

  _formatComplaintFromRow(r) {
    if (!r) return null;
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      categoryDisplay: r.category_display || r.category,
      description: r.description,
      location: r.location,
      coordinates: r.coordinates,
      ward: r.ward,
      city: r.city,
      reportedByUserId: r.reported_by_user_id,
      reportedByName: r.reported_by_name,
      reportedAt: r.created_at,
      dateFormatted: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: r.status,
      priority: r.priority,
      supports: r.supports,
      validationId: r.validation_id,
      image: r.image_url,
      slaRemaining: r.sla_remaining,
      isOverdue: r.is_overdue,
      timeline: r.timeline
    };
  }

  // ==========================================================================
  // Image Validation Operations
  // ==========================================================================

  async saveValidation(validation) {
    if (!this.isConfigured || !this.client) return null;

    const row = {
      validation_id: validation.validationId,
      image_id: validation.imageId,
      user_id: validation.userId,
      image_hash: validation.imageHash || null,
      selected_category: validation.selectedCategory,
      detected_labels: validation.detectedLabels || [],
      confidence: validation.confidence || 0,
      status: validation.status,
      rejection_reason: validation.rejectionReason || null,
      suggestion: validation.suggestion || null,
      provider: validation.provider || 'mock',
      metadata: validation.metadata || {},
      expires_at: validation.expiresAt,
      created_at: validation.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('image_validations')
      .upsert(row, { onConflict: 'validation_id' })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error saving validation:', error.message);
      throw error;
    }
    return this._formatValidationFromRow(data);
  }

  async getValidationById(validationId) {
    if (!this.isConfigured || !this.client || !validationId) return null;

    const { data, error } = await this.client
      .from('image_validations')
      .select('*')
      .eq('validation_id', validationId)
      .maybeSingle();

    if (error || !data) return null;
    return this._formatValidationFromRow(data);
  }

  async listValidations(filter = {}) {
    if (!this.isConfigured || !this.client) return null;

    let query = this.client.from('image_validations').select('*').order('created_at', { ascending: false });
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.category) query = query.eq('selected_category', filter.category);

    const { data, error } = await query;
    if (error) return null;
    return data.map(r => this._formatValidationFromRow(r));
  }

  async updateValidationStatus(validationId, updateData) {
    if (!this.isConfigured || !this.client || !validationId) return null;

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (updateData.status) updates.status = updateData.status;
    if (updateData.selectedCategory) updates.selected_category = updateData.selectedCategory;
    if (updateData.adminReview) updates.metadata = { adminReview: updateData.adminReview };

    const { data, error } = await this.client
      .from('image_validations')
      .update(updates)
      .eq('validation_id', validationId)
      .select()
      .single();

    if (error) return null;
    return this._formatValidationFromRow(data);
  }

  _formatValidationFromRow(r) {
    if (!r) return null;
    return {
      validationId: r.validation_id,
      imageId: r.image_id,
      userId: r.user_id,
      imageHash: r.image_hash,
      selectedCategory: r.selected_category,
      detectedLabels: r.detected_labels,
      confidence: parseFloat(r.confidence || 0),
      status: r.status,
      rejectionReason: r.rejection_reason,
      suggestion: r.suggestion,
      provider: r.provider,
      metadata: r.metadata,
      expiresAt: r.expires_at,
      createdAt: r.created_at
    };
  }

  // ==========================================================================
  // Moderation Audit Trail
  // ==========================================================================

  async logModerationAction(entry) {
    if (!this.isConfigured || !this.client) return null;

    const row = {
      audit_id: entry.auditId || `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      validation_id: entry.validationId,
      admin_user_id: entry.adminUserId,
      action: entry.action,
      previous_status: entry.previousStatus || null,
      new_status: entry.newStatus,
      reason: entry.reason || null,
      created_at: entry.timestamp || new Date().toISOString()
    };

    const { data, error } = await this.client
      .from('moderation_audits')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Error logging audit action:', error.message);
      return null;
    }
    return data;
  }

  async listAuditLogs() {
    if (!this.isConfigured || !this.client) return null;

    const { data, error } = await this.client
      .from('moderation_audits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return null;
    return data;
  }

  // ==========================================================================
  // Storage Bucket Operations
  // ==========================================================================

  /**
   * Upload an image to Supabase Storage
   * @param {string} fileName Destination file name in bucket
   * @param {Buffer} buffer File content
   * @param {string} mimeType MIME content type
   * @returns {Promise<string|null>} Public URL of uploaded image, or null on failure
   */
  async uploadStorageFile(fileName, buffer, mimeType = 'image/jpeg') {
    if (!this.isConfigured || !this.client) return null;

    const bucket = config.SUPABASE_STORAGE_BUCKET;
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        console.warn(`[Supabase Storage] Upload error to bucket "${bucket}":`, error.message);
        return null;
      }

      const { data: publicData } = this.client.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicData?.publicUrl || null;
    } catch (err) {
      console.warn('[Supabase Storage] Upload exception:', err.message);
      return null;
    }
  }
}

module.exports = new SupabaseClientService();
