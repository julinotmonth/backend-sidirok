import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database.js';

export async function seedDatabase() {
  const db = getDatabase();
  
  // Check if data already exists
  const userCount = db.exec('SELECT COUNT(*) FROM users');
  if (userCount[0]?.values[0]?.[0] > 0) {
    console.log('📊 Database already has data, skipping seed');
    return;
  }

  console.log('🌱 Seeding database...');

  const now = new Date().toISOString();

  // Seed Admin User
  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('admin123', 10);
  db.run(`
    INSERT INTO users (id, nik, nama, email, password, no_hp, alamat, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?)
  `, [
    adminId, '3507123456789012', 'Administrator Desa', 'admin@desa.id', 
    adminPassword, '081234567890', 'Kantor Desa Legok, Kec. Gempol', now, now
  ]);

  // Seed Regular User (warga)
  const userId = uuidv4();
  const userPassword = await bcrypt.hash('123456', 10);
  db.run(`
    INSERT INTO users (id, nik, nama, email, password, no_hp, alamat, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)
  `, [
    userId, '3507111234567890', 'Warga Demo', 'warga@desa.id',
    userPassword, '082345678901', 'Dusun Sidodadi RT 02 RW 05, Desa Legok', now, now
  ]);

  // Seed another user
  const userId2 = uuidv4();
  const userPassword2 = await bcrypt.hash('user123', 10);
  db.run(`
    INSERT INTO users (id, nik, nama, email, password, no_hp, alamat, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)
  `, [
    userId2, '3507112345678901', 'Siti Rahayu', 'siti.rahayu@gmail.com',
    userPassword2, '083456789012', 'Dusun Krajan RT 01 RW 03, Desa Legok', now, now
  ]);

  // Seed Layanan
  const layananData = [
    {
      nama: 'Surat Keterangan Domisili',
      slug: 'surat-keterangan-domisili',
      deskripsi: 'Surat keterangan yang menyatakan seseorang berdomisili di wilayah desa.',
      icon: 'Home',
      persyaratan: ['KTP', 'KK', 'Surat Pengantar RT/RW'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    },
    {
      nama: 'Surat Keterangan Tidak Mampu',
      slug: 'surat-keterangan-tidak-mampu',
      deskripsi: 'Surat keterangan untuk warga yang membutuhkan bantuan sosial.',
      icon: 'Heart',
      persyaratan: ['KTP', 'KK', 'Surat Pengantar RT/RW', 'Foto Rumah'],
      estimasiHari: 2,
      biaya: 'Gratis',
      kategori: 'Sosial'
    },
    {
      nama: 'Surat Keterangan Usaha',
      slug: 'surat-keterangan-usaha',
      deskripsi: 'Surat keterangan untuk keperluan perizinan usaha.',
      icon: 'Briefcase',
      persyaratan: ['KTP', 'KK', 'Surat Pengantar RT/RW', 'Foto Tempat Usaha'],
      estimasiHari: 2,
      biaya: 'Gratis',
      kategori: 'Usaha'
    },
    {
      nama: 'Surat Pengantar KTP',
      slug: 'surat-pengantar-ktp',
      deskripsi: 'Surat pengantar untuk pembuatan atau perpanjangan KTP.',
      icon: 'CreditCard',
      persyaratan: ['KK', 'Surat Pengantar RT/RW', 'Pas Foto 3x4'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    },
    {
      nama: 'Surat Pengantar KK',
      slug: 'surat-pengantar-kk',
      deskripsi: 'Surat pengantar untuk pembuatan atau perubahan Kartu Keluarga.',
      icon: 'Users',
      persyaratan: ['KTP', 'KK Lama', 'Surat Pengantar RT/RW', 'Akta Nikah/Cerai'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    },
    {
      nama: 'Surat Keterangan Kelahiran',
      slug: 'surat-keterangan-kelahiran',
      deskripsi: 'Surat keterangan untuk pengurusan akta kelahiran.',
      icon: 'Baby',
      persyaratan: ['KTP Orang Tua', 'KK', 'Surat Keterangan Lahir dari Bidan/RS', 'Akta Nikah'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    },
    {
      nama: 'Surat Keterangan Kematian',
      slug: 'surat-keterangan-kematian',
      deskripsi: 'Surat keterangan untuk pengurusan akta kematian.',
      icon: 'FileText',
      persyaratan: ['KTP Almarhum', 'KK', 'Surat Keterangan dari RS/Puskesmas', 'KTP Pelapor'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    },
    {
      nama: 'Surat Pengantar SKCK',
      slug: 'surat-pengantar-skck',
      deskripsi: 'Surat pengantar untuk pembuatan SKCK di kepolisian.',
      icon: 'Shield',
      persyaratan: ['KTP', 'KK', 'Pas Foto 4x6', 'Surat Pengantar RT/RW'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Keamanan'
    },
    {
      nama: 'Surat Keterangan Pindah',
      slug: 'surat-keterangan-pindah',
      deskripsi: 'Surat keterangan untuk kepindahan domisili.',
      icon: 'Truck',
      persyaratan: ['KTP', 'KK', 'Surat Pengantar RT/RW', 'Alasan Pindah'],
      estimasiHari: 2,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    },
    {
      nama: 'Surat Keterangan Belum Menikah',
      slug: 'surat-keterangan-belum-menikah',
      deskripsi: 'Surat keterangan status belum menikah.',
      icon: 'User',
      persyaratan: ['KTP', 'KK', 'Surat Pengantar RT/RW'],
      estimasiHari: 1,
      biaya: 'Gratis',
      kategori: 'Kependudukan'
    }
  ];

  for (const layanan of layananData) {
    db.run(`
      INSERT INTO layanan (nama, slug, deskripsi, icon, persyaratan, estimasi_hari, biaya, kategori, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      layanan.nama, layanan.slug, layanan.deskripsi, layanan.icon,
      JSON.stringify(layanan.persyaratan), layanan.estimasiHari, layanan.biaya, layanan.kategori, now
    ]);
  }

  // Seed Berita
  const beritaData = [
    {
      judul: 'Peluncuran Sistem Pelayanan Online Desa Legok',
      slug: 'peluncuran-sistem-pelayanan-online-desa-legok',
      ringkasan: 'Desa Legok meluncurkan sistem pelayanan administrasi online untuk memudahkan warga dalam mengurus berbagai keperluan surat-menyurat.',
      konten: 'Dalam rangka meningkatkan pelayanan kepada masyarakat, Desa Legok dengan bangga meluncurkan Sistem Pelayanan Desa (SIPEDES) yang memungkinkan warga untuk mengurus berbagai keperluan administrasi secara online.\n\nSistem ini dirancang untuk memberikan kemudahan akses pelayanan tanpa harus datang langsung ke kantor desa. Warga dapat mengajukan permohonan surat, melacak status permohonan, dan mengunduh dokumen yang sudah selesai.\n\nKepala Desa Legok berharap sistem ini dapat meningkatkan efisiensi pelayanan dan kepuasan masyarakat.',
      thumbnail: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800',
      kategori: 'Pengumuman',
      status: 'published',
      penulis: 'Admin Desa'
    },
    {
      judul: 'Jadwal Posyandu Bulan April 2024',
      slug: 'jadwal-posyandu-bulan-april-2024',
      ringkasan: 'Informasi jadwal pelaksanaan Posyandu di seluruh dusun Desa Legok untuk bulan April 2024.',
      konten: 'Berikut jadwal pelaksanaan Posyandu di Desa Legok untuk bulan April 2024:\n\n1. Dusun Krajan - Tanggal 5 April 2024\n2. Dusun Sidodadi - Tanggal 10 April 2024\n3. Dusun Wonorejo - Tanggal 15 April 2024\n\nPelaksanaan dimulai pukul 08.00 WIB. Diharapkan seluruh ibu yang memiliki balita untuk hadir tepat waktu dan membawa buku KIA.',
      thumbnail: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800',
      kategori: 'Kesehatan',
      status: 'published',
      penulis: 'Admin Desa'
    },
    {
      judul: 'Pembangunan Jalan Dusun Sidodadi Selesai',
      slug: 'pembangunan-jalan-dusun-sidodadi-selesai',
      ringkasan: 'Proyek pembangunan jalan di Dusun Sidodadi telah rampung dan siap digunakan oleh warga.',
      konten: 'Proyek pembangunan jalan sepanjang 500 meter di Dusun Sidodadi telah selesai dilaksanakan. Pembangunan ini menggunakan dana desa tahun anggaran 2024.\n\nJalan yang sebelumnya rusak parah kini telah diperbaiki dengan aspal hotmix berkualitas tinggi. Hal ini diharapkan dapat memperlancar aktivitas warga dan transportasi hasil pertanian.',
      thumbnail: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
      kategori: 'Pembangunan',
      status: 'published',
      penulis: 'Admin Desa'
    },
    {
      judul: 'Pelatihan UMKM Digital untuk Warga Desa',
      slug: 'pelatihan-umkm-digital-untuk-warga-desa',
      ringkasan: 'Desa Legok mengadakan pelatihan pemasaran digital untuk pelaku UMKM guna meningkatkan penjualan.',
      konten: 'Dalam rangka mendukung pertumbuhan ekonomi masyarakat, Desa Legok bekerja sama dengan Dinas Koperasi dan UKM menyelenggarakan pelatihan pemasaran digital.\n\nPelatihan ini meliputi cara membuat akun media sosial bisnis, teknik fotografi produk, dan strategi pemasaran online. Diharapkan pelaku UMKM dapat meningkatkan penjualan melalui platform digital.',
      thumbnail: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
      kategori: 'Kegiatan',
      status: 'published',
      penulis: 'Admin Desa'
    }
  ];

  for (const berita of beritaData) {
    const beritaId = uuidv4();
    db.run(`
      INSERT INTO berita (id, judul, slug, ringkasan, konten, thumbnail, kategori, status, penulis, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      beritaId, berita.judul, berita.slug, berita.ringkasan, berita.konten,
      berita.thumbnail, berita.kategori, berita.status, berita.penulis, now, now, now
    ]);
  }

  // Seed Sample Permohonan
  const permohonanId1 = uuidv4();
  const noReg1 = 'REG-202403-0001';
  db.run(`
    INSERT INTO permohonan (id, no_registrasi, user_id, layanan_id, nama_pemohon, nik_pemohon, email_pemohon, no_hp_pemohon, alamat_pemohon, keperluan, status, created_at, updated_at)
    VALUES (?, ?, ?, 1, 'Warga Demo', '3507111234567890', 'warga@desa.id', '082345678901', 'Dusun Sidodadi RT 02 RW 05', 'Untuk keperluan melamar kerja', 'selesai', ?, ?)
  `, [permohonanId1, noReg1, userId, now, now]);

  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'diajukan', 'Permohonan berhasil diajukan', 'Warga Demo', ?)
  `, [permohonanId1, now]);
  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'diverifikasi', 'Dokumen telah diverifikasi', 'Administrator Desa', ?)
  `, [permohonanId1, now]);
  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'diproses', 'Surat sedang diproses', 'Administrator Desa', ?)
  `, [permohonanId1, now]);
  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'selesai', 'Surat telah selesai dan dapat diunduh', 'Administrator Desa', ?)
  `, [permohonanId1, now]);

  const permohonanId2 = uuidv4();
  const noReg2 = 'REG-202403-0002';
  db.run(`
    INSERT INTO permohonan (id, no_registrasi, user_id, layanan_id, nama_pemohon, nik_pemohon, email_pemohon, no_hp_pemohon, alamat_pemohon, keperluan, status, created_at, updated_at)
    VALUES (?, ?, ?, 3, 'Warga Demo', '3507111234567890', 'warga@desa.id', '082345678901', 'Dusun Sidodadi RT 02 RW 05', 'Untuk membuka usaha warung', 'diproses', ?, ?)
  `, [permohonanId2, noReg2, userId, now, now]);

  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'diajukan', 'Permohonan berhasil diajukan', 'Warga Demo', ?)
  `, [permohonanId2, now]);
  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'diverifikasi', 'Dokumen telah diverifikasi', 'Administrator Desa', ?)
  `, [permohonanId2, now]);
  db.run(`
    INSERT INTO timeline_permohonan (permohonan_id, status, catatan, petugas, created_at)
    VALUES (?, 'diproses', 'Surat sedang diproses', 'Administrator Desa', ?)
  `, [permohonanId2, now]);

  saveDatabase();
  console.log('✅ Database seeded successfully');
  console.log('');
  console.log('📧 Default accounts:');
  console.log('   Admin: admin@desa.id / admin123');
  console.log('   User:  warga@desa.id / 123456');
}

export default { seedDatabase };