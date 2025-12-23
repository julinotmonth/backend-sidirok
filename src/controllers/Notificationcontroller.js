import { v4 as uuidv4 } from 'uuid';
import { getDatabase, saveDatabase } from '../config/database.js';

// Get notifications for current user (admin gets all, user gets their own)
export async function getNotifications(req, res) {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { limit = 20, unreadOnly } = req.query;

    let sql = `
      SELECT n.*, u.nama as user_nama
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Admin sees notifications for admin role, user sees their own
    if (isAdmin) {
      sql += ` AND (n.user_id = ? OR n.user_id = 'admin')`;
      params.push(userId);
    } else {
      sql += ` AND n.user_id = ?`;
      params.push(userId);
    }

    if (unreadOnly === 'true') {
      sql += ` AND n.is_read = 0`;
    }

    sql += ` ORDER BY n.created_at DESC LIMIT ${parseInt(limit)}`;

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const notifications = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      notifications.push({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
        read: row.is_read === 1,
        link: row.link || null,
        createdAt: row.created_at,
      });
    }
    stmt.free();

    // Get unread count
    let countSql = `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0`;
    if (isAdmin) {
      countSql += ` AND (user_id = '${userId}' OR user_id = 'admin')`;
    } else {
      countSql += ` AND user_id = '${userId}'`;
    }
    const countResult = db.exec(countSql);
    const unreadCount = countResult[0]?.values[0]?.[0] || 0;

    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Mark notification as read
export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      message: 'Notifikasi ditandai sudah dibaca'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Mark all notifications as read
export async function markAllAsRead(req, res) {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id = 'admin'`, [userId]);
    } else {
      db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    }
    saveDatabase();

    res.json({
      success: true,
      message: 'Semua notifikasi ditandai sudah dibaca'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Create notification (internal use)
export function createNotification(userId, title, message, type = 'info', link = null) {
  try {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `, [id, userId, title, message, type, link, now]);

    saveDatabase();
    return id;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

// Create notification for admin (when user submits permohonan)
export function notifyAdmin(title, message, type = 'info', link = null) {
  return createNotification('admin', title, message, type, link);
}

// Delete notification
export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM notifications WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      message: 'Notifikasi dihapus'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

// Clear all notifications
export async function clearAll(req, res) {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (isAdmin) {
      db.run(`DELETE FROM notifications WHERE user_id = ? OR user_id = 'admin'`, [userId]);
    } else {
      db.run('DELETE FROM notifications WHERE user_id = ?', [userId]);
    }
    saveDatabase();

    res.json({
      success: true,
      message: 'Semua notifikasi dihapus'
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  createNotification, 
  notifyAdmin,
  deleteNotification,
  clearAll
};