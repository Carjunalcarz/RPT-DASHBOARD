const payorService = require('../../../services/payorService');
const logger = require('../../../utils/logger');
const { supabase } = require('../database/supabase');
const { AppError } = require('../../../middleware/errorHandler');

const ID_IMAGE_BUCKET = 'PASSO';
const ID_IMAGE_FOLDER = 'valid_id';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

exports.search = async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const data = await payorService.searchPayors({ q, limit });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error searching payors:', error);
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const created = await payorService.createPayor({ user: req.user, payload: req.body });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error('Error creating payor:', error);
    return next(error);
  }
};

// Uploads a valid-ID proof image to Supabase storage using the service-role
// client (bypasses storage RLS — the browser anon client cannot write here).
exports.uploadIdImage = async (req, res, next) => {
  try {
    const { fileBase64, fileName, contentType } = req.body || {};
    if (!fileBase64) throw new AppError('No image provided', 400);

    const type = ALLOWED_IMAGE_TYPES.includes(contentType) ? contentType : 'image/jpeg';
    const base64 = String(fileBase64).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) throw new AppError('Invalid image data', 400);
    if (buffer.length > MAX_IMAGE_BYTES) throw new AppError('Image too large (max 5MB)', 400);

    const ext = (fileName && fileName.includes('.') ? fileName.split('.').pop() : (type.split('/')[1] || 'jpg'))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${ID_IMAGE_FOLDER}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(ID_IMAGE_BUCKET)
      .upload(path, buffer, { contentType: type, upsert: true });
    if (error) throw new AppError(error.message || 'Upload failed', 500);

    const { data: pub } = supabase.storage.from(ID_IMAGE_BUCKET).getPublicUrl(data.path);
    return res.status(201).json({ success: true, url: pub?.publicUrl || null, path: data.path });
  } catch (error) {
    logger.error('Error uploading ID image:', error);
    return next(error);
  }
};

// Returns a short-lived signed URL for a stored ID image so private buckets can
// be viewed without exposing them publicly.
exports.getIdImageSignedUrl = async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) throw new AppError('path is required', 400);
    const { data, error } = await supabase.storage
      .from(ID_IMAGE_BUCKET)
      .createSignedUrl(String(path), 60 * 60); // 1 hour
    if (error) {
      // Missing/unreadable object — respond cleanly so the UI shows a placeholder
      // instead of surfacing a 500.
      logger.warn(`ID image signed-url unavailable for "${path}": ${error.message}`);
      return res.status(200).json({ success: false, url: null });
    }
    return res.status(200).json({ success: true, url: data.signedUrl });
  } catch (error) {
    logger.error('Error signing ID image URL:', error);
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updated = await payorService.updatePayor({ id: req.params.id, payload: req.body });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating payor:', error);
    return next(error);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { rows } = req.body || {};
    const result = await payorService.bulkCreatePayors({ user: req.user, rows });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error('Error bulk creating payors:', error);
    return next(error);
  }
};

