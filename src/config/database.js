import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'sipedes.db');

// Initialize database
export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Create database directory if not exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('📁 Database directory created');
  }
  
  // Check if database file exists
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📦 Database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('📦 New database created');
  }
  
  // Create tables
  createTables();
  
  return db;
}

// Save database to file
export function saveDatabase() {
  if (db) {
    // Ensure directory exists before saving
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Get database instance
export function getDatabase() {
  return db;
}

// Create all tables
function createTables() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nik TEXT UNIQUE,
      nama TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      no_hp TEXT,
      alamat TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add status column if not exists (for existing databases)
  try {
    db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive'))`);
  } catch (e) {
    // Column already exists
  }

  // Layanan table
  db.run(`
    CREATE TABLE IF NOT EXISTS layanan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      deskripsi TEXT,
      icon TEXT,
      persyaratan TEXT,
      estimasi_hari INTEGER DEFAULT 3,
      biaya TEXT DEFAULT 'Gratis',
      kategori TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Permohonan table
  db.run(`
    CREATE TABLE IF NOT EXISTS permohonan (
      id TEXT PRIMARY KEY,
      no_registrasi TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      layanan_id INTEGER NOT NULL,
      nama_pemohon TEXT NOT NULL,
      nik_pemohon TEXT NOT NULL,
      email_pemohon TEXT,
      no_hp_pemohon TEXT,
      alamat_pemohon TEXT,
      keperluan TEXT,
      status TEXT DEFAULT 'diajukan' CHECK(status IN ('diajukan', 'diverifikasi', 'diproses', 'selesai', 'ditolak')),
      catatan TEXT,
      dokumen_hasil TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (layanan_id) REFERENCES layanan(id)
    )
  `);

  // Dokumen Permohonan table
  db.run(`
    CREATE TABLE IF NOT EXISTS dokumen_permohonan (
      id TEXT PRIMARY KEY,
      permohonan_id TEXT NOT NULL,
      nama TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
    )
  `);

  // Timeline Permohonan table
  db.run(`
    CREATE TABLE IF NOT EXISTS timeline_permohonan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permohonan_id TEXT NOT NULL,
      status TEXT NOT NULL,
      catatan TEXT,
      petugas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
    )
  `);

  // Berita table
  db.run(`
    CREATE TABLE IF NOT EXISTS berita (
      id TEXT PRIMARY KEY,
      judul TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      ringkasan TEXT,
      konten TEXT,
      thumbnail TEXT,
      kategori TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
      penulis TEXT,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Notifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Add link column if not exists (for existing databases)
  try {
    db.run(`ALTER TABLE notifications ADD COLUMN link TEXT`);
  } catch (e) {
    // Column already exists
  }

  saveDatabase();
  console.log('✅ Database tables created');
}

export default { initDatabase, getDatabase, saveDatabase };