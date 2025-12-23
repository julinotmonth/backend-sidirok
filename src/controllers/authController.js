import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sipedes-legok-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register new user
export async function register(req, res) {
  try {
    const { nik, nama, email, password, noHp, alamat } = req.body;
    
    // Validation
    if (!nama || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password wajib diisi'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter'
      });
    }

    // Validate NIK only if provided
    if (nik && nik.length !== 16) {
      return res.status(400).json({
        success: false,
        message: 'NIK harus 16 digit'
      });
    }

    const db = getDatabase();

    // Check if NIK already exists (only if NIK is provided)
    if (nik) {
      let stmt = db.prepare('SELECT id FROM users WHERE nik = ?');
      stmt.bind([nik]);
      if (stmt.step()) {
        stmt.free();
        return res.status(400).json({
          success: false,
          message: 'NIK sudah terdaftar'
        });
      }
      stmt.free();
    }

    // Check if email already exists
    let stmt = db.prepare('SELECT id FROM users WHERE email = ?');
    stmt.bind([email]);
    if (stmt.step()) {
      stmt.free();
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }
    stmt.free();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    db.run(`
      INSERT INTO users (id, nik, nama, email, password, no_hp, alamat, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)
    `, [userId, nik || null, nama, email, hashedPassword, noHp || null, alamat || null, now, now]);
    
    saveDatabase();

    // Generate token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: {
        user: {
          id: userId,
          nik: nik || null,
          nama,
          email,
          noHp: noHp || null,
          alamat: alamat || null,
          role: 'user',
          createdAt: now,
          updatedAt: now
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Login user
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    const db = getDatabase();
    
    // Find user by email
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    stmt.bind([email]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    const user = stmt.getAsObject();
    stmt.free();

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Check if user is inactive
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator desa.'
      });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: {
          id: user.id,
          nik: user.nik,
          nama: user.nama,
          email: user.email,
          noHp: user.no_hp,
          alamat: user.alamat,
          role: user.role,
          status: user.status || 'active',
          avatar: user.avatar,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get current user profile
export async function getProfile(req, res) {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Update user profile
export async function updateProfile(req, res) {
  try {
    const { nama, email, noHp, alamat } = req.body;
    const userId = req.user.id;

    const db = getDatabase();

    // Check if email is taken by another user
    if (email && email !== req.user.email) {
      const stmt = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?');
      stmt.bind([email, userId]);
      if (stmt.step()) {
        stmt.free();
        return res.status(400).json({
          success: false,
          message: 'Email sudah digunakan'
        });
      }
      stmt.free();
    }

    const now = new Date().toISOString();
    db.run(`
      UPDATE users 
      SET nama = COALESCE(?, nama),
          email = COALESCE(?, email),
          no_hp = COALESCE(?, no_hp),
          alamat = COALESCE(?, alamat),
          updated_at = ?
      WHERE id = ?
    `, [nama, email, noHp, alamat, now, userId]);

    saveDatabase();

    // Get updated user
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([userId]);
    stmt.step();
    const user = stmt.getAsObject();
    stmt.free();

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: {
        id: user.id,
        nik: user.nik,
        nama: user.nama,
        email: user.email,
        noHp: user.no_hp,
        alamat: user.alamat,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Change password
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini dan password baru wajib diisi'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter'
      });
    }

    const db = getDatabase();

    // Get current password
    const stmt = db.prepare('SELECT password FROM users WHERE id = ?');
    stmt.bind([userId]);
    stmt.step();
    const user = stmt.getAsObject();
    stmt.free();

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password saat ini salah'
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', 
      [hashedPassword, new Date().toISOString(), userId]);
    
    saveDatabase();

    res.json({
      success: true,
      message: 'Password berhasil diubah'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default { register, login, getProfile, updateProfile, changePassword };