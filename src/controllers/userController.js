import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database.js';

// Get all users (admin)
export async function getAllUsers(req, res) {
  try {
    const { role, status, search, page = 1, limit = 100 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (nama LIKE ? OR email LIKE ? OR nik LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const users = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      
      // Get user's permohonan count
      const permohonanResult = db.exec(`SELECT COUNT(*) as count FROM permohonan WHERE user_id = '${row.id}'`);
      const permohonanCount = permohonanResult[0]?.values[0]?.[0] || 0;
      
      users.push({
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
        updatedAt: row.updated_at,
        totalPermohonan: permohonanCount
      });
    }
    stmt.free();

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    if (role) countSql += ` AND role = '${role}'`;
    if (status) countSql += ` AND status = '${status}'`;
    const countResult = db.exec(countSql);
    const total = countResult[0]?.values[0]?.[0] || 0;

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get user by ID (admin)
export async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    const row = stmt.getAsObject();
    stmt.free();

    // Get user's permohonan count
    const permohonanResult = db.exec(`SELECT COUNT(*) as count FROM permohonan WHERE user_id = '${id}'`);
    const permohonanCount = permohonanResult[0]?.values[0]?.[0] || 0;

    res.json({
      success: true,
      data: {
        id: row.id,
        nik: row.nik,
        nama: row.nama,
        email: row.email,
        noHp: row.no_hp,
        alamat: row.alamat,
        role: row.role,
        avatar: row.avatar,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        totalPermohonan: permohonanCount
      }
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Create user (admin)
export async function createUser(req, res) {
  try {
    const { nik, nama, email, password, noHp, alamat, role } = req.body;

    if (!nik || !nama || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIK, nama, email, dan password wajib diisi'
      });
    }

    if (nik.length !== 16) {
      return res.status(400).json({
        success: false,
        message: 'NIK harus 16 digit'
      });
    }

    const db = getDatabase();

    // Check if NIK exists
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

    // Check if email exists
    stmt = db.prepare('SELECT id FROM users WHERE email = ?');
    stmt.bind([email]);
    if (stmt.step()) {
      stmt.free();
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar'
      });
    }
    stmt.free();

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO users (id, nik, nama, email, password, no_hp, alamat, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, nik, nama, email, hashedPassword, noHp || null, alamat || null, role || 'user', now, now]);

    saveDatabase();

    res.status(201).json({
      success: true,
      message: 'User berhasil ditambahkan',
      data: { id: userId, nik, nama, email, role: role || 'user' }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Update user (admin)
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { nama, email, noHp, alamat, role, password } = req.body;
    const db = getDatabase();

    // Check if user exists
    const checkStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    checkStmt.bind([id]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    const existing = checkStmt.getAsObject();
    checkStmt.free();

    // Check email uniqueness
    if (email && email !== existing.email) {
      const emailCheck = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?');
      emailCheck.bind([email, id]);
      if (emailCheck.step()) {
        emailCheck.free();
        return res.status(400).json({
          success: false,
          message: 'Email sudah digunakan'
        });
      }
      emailCheck.free();
    }

    const now = new Date().toISOString();

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(`
        UPDATE users SET
          nama = COALESCE(?, nama),
          email = COALESCE(?, email),
          password = ?,
          no_hp = COALESCE(?, no_hp),
          alamat = COALESCE(?, alamat),
          role = COALESCE(?, role),
          updated_at = ?
        WHERE id = ?
      `, [nama, email, hashedPassword, noHp, alamat, role, now, id]);
    } else {
      db.run(`
        UPDATE users SET
          nama = COALESCE(?, nama),
          email = COALESCE(?, email),
          no_hp = COALESCE(?, no_hp),
          alamat = COALESCE(?, alamat),
          role = COALESCE(?, role),
          updated_at = ?
        WHERE id = ?
      `, [nama, email, noHp, alamat, role, now, id]);
    }

    saveDatabase();

    res.json({
      success: true,
      message: 'User berhasil diperbarui'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Delete user (admin)
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if user exists
    const checkStmt = db.prepare('SELECT id, role FROM users WHERE id = ?');
    checkStmt.bind([id]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    const user = checkStmt.getAsObject();
    checkStmt.free();

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun sendiri'
      });
    }

    // Delete user's permohonan first (cascade)
    db.run('DELETE FROM permohonan WHERE user_id = ?', [id]);
    db.run('DELETE FROM notifications WHERE user_id = ?', [id]);
    db.run('DELETE FROM users WHERE id = ?', [id]);
    
    saveDatabase();

    res.json({
      success: true,
      message: 'User berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get user statistics
export async function getUserStats(req, res) {
  try {
    const db = getDatabase();

    const stats = {
      totalUsers: 0,
      totalAdmin: 0,
      totalWarga: 0,
      totalActive: 0,
      totalInactive: 0,
      newThisMonth: 0
    };

    // Total users
    let result = db.exec('SELECT COUNT(*) FROM users');
    stats.totalUsers = result[0]?.values[0]?.[0] || 0;

    // Total admin
    result = db.exec("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    stats.totalAdmin = result[0]?.values[0]?.[0] || 0;

    // Total warga
    result = db.exec("SELECT COUNT(*) FROM users WHERE role = 'user'");
    stats.totalWarga = result[0]?.values[0]?.[0] || 0;

    // Total active (including null which means active by default)
    result = db.exec("SELECT COUNT(*) FROM users WHERE status = 'active' OR status IS NULL");
    stats.totalActive = result[0]?.values[0]?.[0] || 0;

    // Total inactive
    result = db.exec("SELECT COUNT(*) FROM users WHERE status = 'inactive'");
    stats.totalInactive = result[0]?.values[0]?.[0] || 0;

    // New this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    result = db.exec(`SELECT COUNT(*) FROM users WHERE created_at >= '${firstOfMonth.toISOString()}'`);
    stats.newThisMonth = result[0]?.values[0]?.[0] || 0;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Toggle user status (active/inactive)
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if user exists
    const checkStmt = db.prepare('SELECT id, status, role FROM users WHERE id = ?');
    checkStmt.bind([id]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    const user = checkStmt.getAsObject();
    checkStmt.free();

    // Prevent deactivating yourself
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat mengubah status akun sendiri'
      });
    }

    const currentStatus = user.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const now = new Date().toISOString();

    db.run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);
    saveDatabase();

    res.json({
      success: true,
      message: `Status pengguna berhasil diubah menjadi ${newStatus === 'active' ? 'aktif' : 'nonaktif'}`,
      data: { status: newStatus }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default { getAllUsers, getUserById, createUser, updateUser, deleteUser, getUserStats, toggleUserStatus };