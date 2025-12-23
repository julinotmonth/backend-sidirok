import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sipedes-legok-secret-key-2024';

// Verify JWT token
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak ditemukan' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([decoded.userId]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      
      // Check if user is inactive
      if (row.status === 'inactive') {
        stmt.free();
        return res.status(403).json({ 
          success: false, 
          message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator desa.',
          code: 'ACCOUNT_INACTIVE'
        });
      }
      
      req.user = {
        id: row.id,
        nik: row.nik,
        nama: row.nama,
        email: row.email,
        noHp: row.no_hp,
        alamat: row.alamat,
        role: row.role,
        status: row.status || 'active',
        avatar: row.avatar,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      stmt.free();
      next();
    } else {
      stmt.free();
      return res.status(401).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Token tidak valid' 
    });
  }
}

// Check if user is admin
export function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Akses ditolak. Hanya admin yang diizinkan.' 
    });
  }
}

// Optional auth - doesn't fail if no token
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      stmt.bind([decoded.userId]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        req.user = {
          id: row.id,
          nik: row.nik,
          nama: row.nama,
          email: row.email,
          role: row.role
        };
      }
      stmt.free();
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}

export default { authMiddleware, adminMiddleware, optionalAuth };