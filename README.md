# SIPEDES Backend API

Backend API untuk Sistem Pelayanan Desa (SIPEDES) Legok menggunakan Express.js dan SQLite.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via sql.js)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: multer
- **Validation**: express-validator

## Struktur Folder

```
backend/
├── database/           # SQLite database file
├── uploads/            # Upload files
│   ├── documents/      # User documents
│   ├── images/         # Images (thumbnails)
│   └── results/        # Result documents
├── src/
│   ├── config/         # Database config
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Auth & upload middleware
│   ├── routes/         # API routes
│   ├── seeders/        # Database seeders
│   └── index.js        # Entry point
├── .env                # Environment variables
└── package.json
```

## Instalasi

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start
```

## Environment Variables

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
DB_PATH=./database/sipedes.db
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| GET | /api/auth/profile | Get current user profile |
| PUT | /api/auth/profile | Update profile |
| PUT | /api/auth/change-password | Change password |

### Layanan
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/layanan | Get all layanan |
| GET | /api/layanan/:slug | Get layanan by slug |
| POST | /api/layanan | Create layanan (admin) |
| PUT | /api/layanan/:id | Update layanan (admin) |
| DELETE | /api/layanan/:id | Delete layanan (admin) |

### Permohonan
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/permohonan | Create permohonan |
| GET | /api/permohonan | Get all permohonan (admin) |
| GET | /api/permohonan/user | Get user's permohonan |
| GET | /api/permohonan/:id | Get permohonan detail |
| PUT | /api/permohonan/:id/status | Update status (admin) |
| GET | /api/permohonan/check/:noReg | Check status (public) |
| GET | /api/permohonan/stats/summary | Get statistics (admin) |

### Berita
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/berita/published | Get published berita |
| GET | /api/berita/slug/:slug | Get berita by slug |
| GET | /api/berita | Get all berita (admin) |
| POST | /api/berita | Create berita (admin) |
| PUT | /api/berita/:id | Update berita (admin) |
| DELETE | /api/berita/:id | Delete berita (admin) |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | Get all users |
| GET | /api/users/stats | Get user statistics |
| GET | /api/users/:id | Get user by ID |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |

## Default Accounts

Setelah running, database akan di-seed dengan akun default:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@desalegok.go.id | admin123 |
| User | ahmad@gmail.com | user123 |

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## Authentication

API menggunakan JWT Bearer token. Include token di header:

```
Authorization: Bearer <token>
```

## File Upload

- Max file size: 5MB (documents), 10MB (results)
- Allowed types: JPG, PNG, PDF, DOC, DOCX
- Upload endpoint menggunakan multipart/form-data

## Development

```bash
# Watch mode (auto-restart on changes)
npm run dev
```

## License

ISC
