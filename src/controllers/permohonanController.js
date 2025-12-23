import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database.js';
import { createNotification, notifyAdmin } from './Notificationcontroller.js';

// Generate registration number
function generateNoRegistrasi() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REG-${year}${month}-${random}`;
}

// Create new permohonan
export async function createPermohonan(req, res) {
  try {
    const { layananId, keperluan, namaPemohon, nikPemohon, emailPemohon, noHpPemohon, alamatPemohon } = req.body;
    const userId = req.user.id;

    if (!layananId) {
      return res.status(400).json({
        success: false,
        message: 'Layanan harus dipilih'
      });
    }

    const db = getDatabase();

    // Check if layanan exists
    let stmt = db.prepare('SELECT * FROM layanan WHERE id = ?');
    stmt.bind([layananId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }
    const layanan = stmt.getAsObject();
    stmt.free();

    const permohonanId = uuidv4();
    const noRegistrasi = generateNoRegistrasi();
    const now = new Date().toISOString();

    // Create permohonan
    db.run(`
      INSERT INTO permohonan (
        id, no_registrasi, user_id, layanan_id, nama_pemohon, nik_pemohon,
        email_pemohon, no_hp_pemohon, alamat_pemohon, keperluan, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'diajukan', ?, ?)
    `, [
      permohonanId, noRegistrasi, userId, layananId,
      namaPemohon || req.user.nama,
      nikPemohon || req.user.nik,
      emailPemohon || req.user.email,
      noHpPemohon || req.user.noHp,
      alamatPemohon || req.user.alamat,
      keperluan || null,
      now, now
    ]);

    // Create initial timeline
    db.run(`
      INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
      VALUES (?, 'diajukan', 'Permohonan berhasil diajukan', ?, ?)
    `, [permohonanId, req.user.nama, now]);

    // Handle uploaded documents
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const docId = uuidv4();
        // Get the folder name and filename for relative path
        // file.path could be like "D:\...\uploads\documents\uuid.pdf" or "/path/to/uploads/documents/uuid.pdf"
        const pathParts = file.path.replace(/\\/g, '/').split('/');
        const uploadsIndex = pathParts.findIndex(p => p === 'uploads');
        const relativePath = uploadsIndex >= 0 
          ? pathParts.slice(uploadsIndex + 1).join('/') 
          : `documents/${file.filename}`;
        
        db.run(`
          INSERT INTO dokumen_permohonan (id, permohonan_id, nama, file_path, file_type, file_size, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [docId, permohonanId, file.originalname, relativePath, file.mimetype, file.size, now]);
      }
    }

    saveDatabase();

    // Create notification for admin
    notifyAdmin(
      'Permohonan Baru',
      `${namaPemohon || req.user.nama} mengajukan ${layanan.nama} (${noRegistrasi})`,
      'info',
      `/admin/permohonan/${permohonanId}`
    );

    res.status(201).json({
      success: true,
      message: 'Permohonan berhasil diajukan',
      data: {
        id: permohonanId,
        noRegistrasi,
        layanan: layanan.nama,
        status: 'diajukan',
        createdAt: now
      }
    });
  } catch (error) {
    console.error('Create permohonan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get all permohonan (admin)
export async function getAllPermohonan(req, res) {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const db = getDatabase();

    let sql = `
      SELECT p.*, l.nama as layanan_nama, l.slug as layanan_slug,
             u.nama as user_nama, u.email as user_email
      FROM permohonan p
      LEFT JOIN layanan l ON p.layanan_id = l.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (p.no_registrasi LIKE ? OR p.nama_pemohon LIKE ? OR p.nik_pemohon LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY p.created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const permohonan = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      permohonan.push({
        id: row.id,
        noRegistrasi: row.no_registrasi,
        layanan: {
          id: row.layanan_id,
          nama: row.layanan_nama,
          slug: row.layanan_slug
        },
        pemohon: {
          userId: row.user_id,
          nama: row.nama_pemohon,
          nik: row.nik_pemohon,
          email: row.email_pemohon,
          noHp: row.no_hp_pemohon,
          alamat: row.alamat_pemohon
        },
        keperluan: row.keperluan,
        status: row.status,
        catatan: row.catatan,
        dokumenHasil: row.dokumen_hasil,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }
    stmt.free();

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM permohonan WHERE 1=1';
    if (status) countSql += ` AND status = '${status}'`;
    const countResult = db.exec(countSql);
    const total = countResult[0]?.values[0]?.[0] || 0;

    res.json({
      success: true,
      data: permohonan,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all permohonan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get user's permohonan
export async function getUserPermohonan(req, res) {
  try {
    const userId = req.user.id;
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT p.*, l.nama as layanan_nama, l.slug as layanan_slug, l.icon as layanan_icon
      FROM permohonan p
      LEFT JOIN layanan l ON p.layanan_id = l.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `);
    stmt.bind([userId]);

    const permohonan = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      permohonan.push({
        id: row.id,
        noRegistrasi: row.no_registrasi,
        layanan: {
          id: row.layanan_id,
          nama: row.layanan_nama,
          slug: row.layanan_slug,
          icon: row.layanan_icon
        },
        namaPemohon: row.nama_pemohon,
        status: row.status,
        catatan: row.catatan,
        dokumenHasil: row.dokumen_hasil,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }
    stmt.free();

    res.json({
      success: true,
      data: permohonan
    });
  } catch (error) {
    console.error('Get user permohonan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get permohonan detail
export async function getPermohonanDetail(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Get permohonan
    let stmt = db.prepare(`
      SELECT p.*, l.nama as layanan_nama, l.slug as layanan_slug, l.icon as layanan_icon,
             l.persyaratan as layanan_persyaratan, l.estimasi_hari
      FROM permohonan p
      LEFT JOIN layanan l ON p.layanan_id = l.id
      WHERE p.id = ?
    `);
    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Permohonan tidak ditemukan'
      });
    }

    const row = stmt.getAsObject();
    stmt.free();

    // Check authorization (user can only see their own, admin can see all)
    if (req.user.role !== 'admin' && row.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    // Get documents
    stmt = db.prepare('SELECT * FROM dokumen_permohonan WHERE permohonan_id = ?');
    stmt.bind([id]);
    const documents = [];
    while (stmt.step()) {
      const doc = stmt.getAsObject();
      // file_path already stores relative path like "documents/filename.pdf"
      documents.push({
        id: doc.id,
        nama: doc.nama,
        url: `/uploads/${doc.file_path}`,
        type: doc.file_type,
        size: doc.file_size,
        uploadedAt: doc.created_at
      });
    }
    stmt.free();

    // Get timeline
    stmt = db.prepare('SELECT * FROM timeline_permohonan WHERE permohonan_id = ? ORDER BY created_at ASC');
    stmt.bind([id]);
    const timeline = [];
    while (stmt.step()) {
      const t = stmt.getAsObject();
      timeline.push({
        status: t.status,
        tanggal: t.created_at,
        catatan: t.catatan,
        petugas: t.petugas
      });
    }
    stmt.free();

    res.json({
      success: true,
      data: {
        id: row.id,
        noRegistrasi: row.no_registrasi,
        userId: row.user_id,
        layanan: {
          id: row.layanan_id,
          nama: row.layanan_nama,
          slug: row.layanan_slug,
          icon: row.layanan_icon,
          persyaratan: row.layanan_persyaratan ? JSON.parse(row.layanan_persyaratan) : [],
          estimasiHari: row.estimasi_hari
        },
        pemohon: {
          nama: row.nama_pemohon,
          nik: row.nik_pemohon,
          email: row.email_pemohon,
          noHp: row.no_hp_pemohon,
          alamat: row.alamat_pemohon
        },
        keperluan: row.keperluan,
        status: row.status,
        catatan: row.catatan,
        dokumenHasil: row.dokumen_hasil ? {
          nama: 'Dokumen Hasil',
          url: row.dokumen_hasil,
          type: row.dokumen_hasil.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
        } : null,
        dokumen: documents,
        timeline,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Get permohonan detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Update permohonan status (admin)
export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, catatan } = req.body;
    const db = getDatabase();

    const validStatuses = ['diajukan', 'diverifikasi', 'diproses', 'selesai', 'ditolak'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }

    // Check if permohonan exists and get user_id
    let stmt = db.prepare(`
      SELECT p.*, l.nama as layanan_nama 
      FROM permohonan p 
      LEFT JOIN layanan l ON p.layanan_id = l.id 
      WHERE p.id = ?
    `);
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Permohonan tidak ditemukan'
      });
    }
    const permohonan = stmt.getAsObject();
    stmt.free();

    const now = new Date().toISOString();

    // Handle document upload for 'selesai' status
    let dokumenHasil = null;
    if (status === 'selesai' && req.file) {
      dokumenHasil = `/uploads/results/${req.file.filename}`;
    }

    // Update permohonan
    if (dokumenHasil) {
      db.run(`
        UPDATE permohonan 
        SET status = ?, catatan = ?, dokumen_hasil = ?, updated_at = ?
        WHERE id = ?
      `, [status, catatan || null, dokumenHasil, now, id]);
    } else {
      db.run(`
        UPDATE permohonan 
        SET status = ?, catatan = ?, updated_at = ?
        WHERE id = ?
      `, [status, catatan || null, now, id]);
    }

    // Add timeline entry
    db.run(`
      INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, status, catatan || null, req.user.nama, now]);

    saveDatabase();

    // Send notification to user
    const statusLabels = {
      'diajukan': 'Diajukan',
      'diverifikasi': 'Diverifikasi',
      'diproses': 'Sedang Diproses',
      'selesai': 'Selesai',
      'ditolak': 'Ditolak'
    };
    
    const notifType = status === 'selesai' ? 'success' : (status === 'ditolak' ? 'error' : 'info');
    const notifTitle = `Permohonan ${statusLabels[status]}`;
    const notifMessage = `Permohonan ${permohonan.layanan_nama} (${permohonan.no_registrasi}) telah ${statusLabels[status].toLowerCase()}${catatan ? `. Catatan: ${catatan}` : ''}`;
    
    createNotification(
      permohonan.user_id,
      notifTitle,
      notifMessage,
      notifType,
      `/user/riwayat/${id}`
    );

    res.json({
      success: true,
      message: `Status berhasil diubah menjadi ${status}`,
      data: { status, dokumenHasil }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Check status by registration number (public)
export async function checkStatus(req, res) {
  try {
    const { noRegistrasi } = req.params;
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT p.*, l.nama as layanan_nama
      FROM permohonan p
      LEFT JOIN layanan l ON p.layanan_id = l.id
      WHERE p.no_registrasi = ?
    `);
    stmt.bind([noRegistrasi]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Permohonan tidak ditemukan'
      });
    }

    const row = stmt.getAsObject();
    stmt.free();

    // Get timeline
    const timelineStmt = db.prepare('SELECT * FROM timeline_permohonan WHERE permohonan_id = ? ORDER BY created_at ASC');
    timelineStmt.bind([row.id]);
    const timeline = [];
    while (timelineStmt.step()) {
      const t = timelineStmt.getAsObject();
      timeline.push({
        status: t.status,
        tanggal: t.created_at,
        catatan: t.catatan,
        petugas: t.petugas
      });
    }
    timelineStmt.free();

    res.json({
      success: true,
      data: {
        noRegistrasi: row.no_registrasi,
        layanan: row.layanan_nama,
        namaPemohon: row.nama_pemohon,
        status: row.status,
        catatan: row.catatan,
        dokumenHasil: row.dokumen_hasil ? {
          nama: 'Dokumen Hasil',
          url: row.dokumen_hasil
        } : null,
        timeline,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get statistics
export async function getStatistics(req, res) {
  try {
    const db = getDatabase();

    const stats = {
      total: 0,
      diajukan: 0,
      diverifikasi: 0,
      diproses: 0,
      selesai: 0,
      ditolak: 0
    };

    const result = db.exec(`
      SELECT status, COUNT(*) as count FROM permohonan GROUP BY status
    `);

    if (result[0]) {
      result[0].values.forEach(([status, count]) => {
        stats[status] = count;
        stats.total += count;
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default {
  createPermohonan,
  getAllPermohonan,
  getUserPermohonan,
  getPermohonanDetail,
  updateStatus,
  checkStatus,
  getStatistics
};