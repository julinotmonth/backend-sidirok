import { Router } from 'express';
import {
  createPermohonan,
  getAllPermohonan,
  getUserPermohonan,
  getPermohonanDetail,
  updateStatus,
  checkStatus,
  getStatistics
} from '../controllers/permohonanController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { uploadDocument, uploadResult, handleUploadError } from '../middleware/upload.js';

const router = Router();

// Public route - check status
router.get('/check/:noRegistrasi', checkStatus);

// Admin routes (harus di atas route dengan parameter :id)
router.get('/stats/summary', authMiddleware, adminMiddleware, getStatistics);
router.get('/all', authMiddleware, adminMiddleware, getAllPermohonan);
router.put('/:id/status', authMiddleware, adminMiddleware, uploadResult.single('dokumenHasil'), handleUploadError, updateStatus);

// User routes
router.post('/', authMiddleware, uploadDocument.array('dokumen', 5), handleUploadError, createPermohonan);
router.get('/user', authMiddleware, getUserPermohonan);
router.get('/:id', authMiddleware, getPermohonanDetail);

export default router;