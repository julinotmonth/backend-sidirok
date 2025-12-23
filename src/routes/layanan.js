import { Router } from 'express';
import {
  getAllLayanan,
  getLayananBySlug,
  createLayanan,
  updateLayanan,
  deleteLayanan
} from '../controllers/layananController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getAllLayanan);
router.get('/:slug', getLayananBySlug);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, createLayanan);
router.put('/:id', authMiddleware, adminMiddleware, updateLayanan);
router.delete('/:id', authMiddleware, adminMiddleware, deleteLayanan);

export default router;
