import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database.js';

// Generate slug from title
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Get all berita (admin)
export async function getAllBerita(req, res) {
  try {
    const { status, kategori, search, page = 1, limit = 10 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM berita WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (kategori) {
      sql += ' AND kategori = ?';
      params.push(kategori);
    }

    if (search) {
      sql += ' AND (judul LIKE ? OR ringkasan LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const berita = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      berita.push({
        id: row.id,
        judul: row.judul,
        slug: row.slug,
        ringkasan: row.ringkasan,
        konten: row.konten,
        thumbnail: row.thumbnail,
        kategori: row.kategori,
        status: row.status,
        penulis: row.penulis,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }
    stmt.free();

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM berita WHERE 1=1';
    if (status) countSql += ` AND status = '${status}'`;
    const countResult = db.exec(countSql);
    const total = countResult[0]?.values[0]?.[0] || 0;

    res.json({
      success: true,
      data: berita,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all berita error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get published berita (public)
export async function getPublishedBerita(req, res) {
  try {
    const { kategori, search, page = 1, limit = 10 } = req.query;
    const db = getDatabase();

    let sql = "SELECT * FROM berita WHERE status = 'published'";
    const params = [];

    if (kategori && kategori !== 'Semua') {
      sql += ' AND kategori = ?';
      params.push(kategori);
    }

    if (search) {
      sql += ' AND (judul LIKE ? OR ringkasan LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY published_at DESC, created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const berita = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      berita.push({
        id: row.id,
        judul: row.judul,
        slug: row.slug,
        ringkasan: row.ringkasan,
        thumbnail: row.thumbnail,
        kategori: row.kategori,
        penulis: row.penulis,
        createdAt: row.created_at
      });
    }
    stmt.free();

    res.json({
      success: true,
      data: berita
    });
  } catch (error) {
    console.error('Get published berita error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get berita by slug (public)
export async function getBeritaBySlug(req, res) {
  try {
    const { slug } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM berita WHERE slug = ?');
    stmt.bind([slug]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Berita tidak ditemukan'
      });
    }

    const row = stmt.getAsObject();
    stmt.free();

    // Get related berita
    const relatedStmt = db.prepare(`
      SELECT id, judul, slug, thumbnail, created_at 
      FROM berita 
      WHERE kategori = ? AND slug != ? AND status = 'published'
      ORDER BY created_at DESC LIMIT 3
    `);
    relatedStmt.bind([row.kategori, slug]);

    const related = [];
    while (relatedStmt.step()) {
      const r = relatedStmt.getAsObject();
      related.push({
        id: r.id,
        judul: r.judul,
        slug: r.slug,
        thumbnail: r.thumbnail,
        createdAt: r.created_at
      });
    }
    relatedStmt.free();

    res.json({
      success: true,
      data: {
        id: row.id,
        judul: row.judul,
        slug: row.slug,
        ringkasan: row.ringkasan,
        konten: row.konten,
        thumbnail: row.thumbnail,
        kategori: row.kategori,
        status: row.status,
        penulis: row.penulis,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        related
      }
    });
  } catch (error) {
    console.error('Get berita by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Get berita by ID (admin)
export async function getBeritaById(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM berita WHERE id = ?');
    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({
        success: false,
        message: 'Berita tidak ditemukan'
      });
    }

    const row = stmt.getAsObject();
    stmt.free();

    res.json({
      success: true,
      data: {
        id: row.id,
        judul: row.judul,
        slug: row.slug,
        ringkasan: row.ringkasan,
        konten: row.konten,
        thumbnail: row.thumbnail,
        kategori: row.kategori,
        status: row.status,
        penulis: row.penulis,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Get berita by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Create berita (admin)
export async function createBerita(req, res) {
  try {
    const { judul, ringkasan, konten, thumbnail, kategori, status } = req.body;

    if (!judul || judul.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Judul minimal 10 karakter'
      });
    }

    if (!ringkasan || ringkasan.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Ringkasan minimal 20 karakter'
      });
    }

    if (!konten || konten.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Konten minimal 50 karakter'
      });
    }

    const db = getDatabase();
    const id = uuidv4();
    let slug = generateSlug(judul);
    const now = new Date().toISOString();
    const publishedAt = status === 'published' ? now : null;

    // Ensure unique slug
    let slugSuffix = 0;
    let finalSlug = slug;
    while (true) {
      const checkStmt = db.prepare('SELECT id FROM berita WHERE slug = ?');
      checkStmt.bind([finalSlug]);
      if (!checkStmt.step()) {
        checkStmt.free();
        break;
      }
      checkStmt.free();
      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }

    db.run(`
      INSERT INTO berita (id, judul, slug, ringkasan, konten, thumbnail, kategori, status, penulis, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, judul, finalSlug, ringkasan, konten, thumbnail || null, kategori || null, status || 'draft', req.user.nama, publishedAt, now, now]);

    saveDatabase();

    res.status(201).json({
      success: true,
      message: 'Berita berhasil ditambahkan',
      data: { id, judul, slug: finalSlug, status: status || 'draft' }
    });
  } catch (error) {
    console.error('Create berita error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Update berita (admin)
export async function updateBerita(req, res) {
  try {
    const { id } = req.params;
    const { judul, ringkasan, konten, thumbnail, kategori, status } = req.body;
    const db = getDatabase();

    // Check if berita exists
    const checkStmt = db.prepare('SELECT * FROM berita WHERE id = ?');
    checkStmt.bind([id]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'Berita tidak ditemukan'
      });
    }
    const existing = checkStmt.getAsObject();
    checkStmt.free();

    const now = new Date().toISOString();
    let publishedAt = existing.published_at;
    
    // Set published_at if status changes to published
    if (status === 'published' && existing.status !== 'published') {
      publishedAt = now;
    }

    // Update slug if judul changes
    let newSlug = existing.slug;
    if (judul && judul !== existing.judul) {
      newSlug = generateSlug(judul);
      // Check for unique slug
      let slugSuffix = 0;
      let finalSlug = newSlug;
      while (true) {
        const slugCheck = db.prepare('SELECT id FROM berita WHERE slug = ? AND id != ?');
        slugCheck.bind([finalSlug, id]);
        if (!slugCheck.step()) {
          slugCheck.free();
          break;
        }
        slugCheck.free();
        slugSuffix++;
        finalSlug = `${newSlug}-${slugSuffix}`;
      }
      newSlug = finalSlug;
    }

    db.run(`
      UPDATE berita SET
        judul = COALESCE(?, judul),
        slug = ?,
        ringkasan = COALESCE(?, ringkasan),
        konten = COALESCE(?, konten),
        thumbnail = COALESCE(?, thumbnail),
        kategori = COALESCE(?, kategori),
        status = COALESCE(?, status),
        published_at = ?,
        updated_at = ?
      WHERE id = ?
    `, [judul, newSlug, ringkasan, konten, thumbnail, kategori, status, publishedAt, now, id]);

    saveDatabase();

    res.json({
      success: true,
      message: 'Berita berhasil diperbarui'
    });
  } catch (error) {
    console.error('Update berita error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Delete berita (admin)
export async function deleteBerita(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if berita exists
    const checkStmt = db.prepare('SELECT id FROM berita WHERE id = ?');
    checkStmt.bind([id]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({
        success: false,
        message: 'Berita tidak ditemukan'
      });
    }
    checkStmt.free();

    db.run('DELETE FROM berita WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      message: 'Berita berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete berita error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default { getAllBerita, getPublishedBerita, getBeritaBySlug, createBerita, updateBerita, deleteBerita };