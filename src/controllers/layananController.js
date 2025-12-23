import { getDatabase, saveDatabase } from '../config/database.js';

// Get all layanan
export async function getAllLayanan(req, res) {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM layanan ORDER BY id ASC');
    
    const layanan = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      layanan.push({
        id: row.id,
        nama: row.nama,
        slug: row.slug,
        deskripsi: row.deskripsi,
        icon: row.icon,
        persyaratan: row.persyaratan ? JSON.parse(row.persyaratan) : [],
        estimasiHari: row.estimasi_hari,
        biaya: row.biaya,
        kategori: row.kategori
      });
    }
    stmt.free();

    res.json({
      success: true,
      data: layanan
    });
  } catch (error) {
    console.error('Get all layanan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get layanan by slug
export async function getLayananBySlug(req, res) {
  try {
    const { slug } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM layanan WHERE slug = ?');
    stmt.bind([slug]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }

    const row = stmt.getAsObject();
    stmt.free();

    res.json({
      success: true,
      data: {
        id: row.id,
        nama: row.nama,
        slug: row.slug,
        deskripsi: row.deskripsi,
        icon: row.icon,
        persyaratan: row.persyaratan ? JSON.parse(row.persyaratan) : [],
        estimasiHari: row.estimasi_hari,
        biaya: row.biaya,
        kategori: row.kategori
      }
    });
  } catch (error) {
    console.error('Get layanan by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Create layanan (admin)
export async function createLayanan(req, res) {
  try {
    const { nama, slug, deskripsi, icon, persyaratan, estimasiHari, biaya, kategori } = req.body;

    if (!nama || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan slug wajib diisi'
      });
    }

    const db = getDatabase();

    // Check if slug exists
    const checkStmt = db.prepare('SELECT id FROM layanan WHERE slug = ?');
    checkStmt.bind([slug]);
    if (checkStmt.step()) {
      checkStmt.free();
      return res.status(400).json({
        success: false,
        message: 'Slug sudah digunakan'
      });
    }
    checkStmt.free();

    db.run(`
      INSERT INTO layanan (nama, slug, deskripsi, icon, persyaratan, estimasi_hari, biaya, kategori)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nama, slug, deskripsi || null, icon || null,
      persyaratan ? JSON.stringify(persyaratan) : null,
      estimasiHari || 3, biaya || 'Gratis', kategori || null
    ]);

    saveDatabase();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];

    res.status(201).json({
      success: true,
      message: 'Layanan berhasil ditambahkan',
      data: { id, nama, slug }
    });
  } catch (error) {
    console.error('Create layanan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Update layanan (admin)
export async function updateLayanan(req, res) {
  try {
    const { id } = req.params;
    const { nama, deskripsi, icon, persyaratan, estimasiHari, biaya, kategori } = req.body;
    const db = getDatabase();

    // Check if layanan exists
    const checkStmt = db.prepare('SELECT id FROM layanan WHERE id = ?');
    checkStmt.bind([parseInt(id)]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }
    checkStmt.free();

    db.run(`
      UPDATE layanan SET
        nama = COALESCE(?, nama),
        deskripsi = COALESCE(?, deskripsi),
        icon = COALESCE(?, icon),
        persyaratan = COALESCE(?, persyaratan),
        estimasi_hari = COALESCE(?, estimasi_hari),
        biaya = COALESCE(?, biaya),
        kategori = COALESCE(?, kategori)
      WHERE id = ?
    `, [
      nama, deskripsi, icon,
      persyaratan ? JSON.stringify(persyaratan) : null,
      estimasiHari, biaya, kategori, parseInt(id)
    ]);

    saveDatabase();

    res.json({
      success: true,
      message: 'Layanan berhasil diperbarui'
    });
  } catch (error) {
    console.error('Update layanan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Delete layanan (admin)
export async function deleteLayanan(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if layanan exists
    const checkStmt = db.prepare('SELECT id FROM layanan WHERE id = ?');
    checkStmt.bind([parseInt(id)]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }
    checkStmt.free();

    // Check if layanan is used in permohonan
    const usedStmt = db.prepare('SELECT COUNT(*) as count FROM permohonan WHERE layanan_id = ?');
    usedStmt.bind([parseInt(id)]);
    usedStmt.step();
    const { count } = usedStmt.getAsObject();
    usedStmt.free();

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Layanan tidak dapat dihapus karena sudah digunakan dalam permohonan'
      });
    }

    db.run('DELETE FROM layanan WHERE id = ?', [parseInt(id)]);
    saveDatabase();

    res.json({
      success: true,
      message: 'Layanan berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete layanan error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default { getAllLayanan, getLayananBySlug, createLayanan, updateLayanan, deleteLayanan };
