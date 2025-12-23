import { Router } from 'express';
import {
  getAllBerita,
  getPublishedBerita,
  getBeritaBySlug,
  getBeritaById,
  createBerita,
  updateBerita,
  deleteBerita
} from '../controllers/beritaController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { uploadImage, handleUploadError } from '../middleware/upload.js';

const router = Router();

// Public routes
router.get('/published', getPublishedBerita);
router.get('/slug/:slug', getBeritaBySlug);

// Admin routes - specific routes before :id
router.get('/', authMiddleware, adminMiddleware, getAllBerita);
router.post('/', authMiddleware, adminMiddleware, createBerita);

// Admin routes with :id param
router.get('/:id', authMiddleware, adminMiddleware, getBeritaById);
router.put('/:id', authMiddleware, adminMiddleware, updateBerita);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBerita);

// Upload thumbnail
router.post('/upload-thumbnail', authMiddleware, adminMiddleware, uploadImage.single('thumbnail'), handleUploadError, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
  }
  res.json({
    success: true,
    data: {
      url: `/uploads/images/${req.file.filename}`
    }
  });
});

export default router;