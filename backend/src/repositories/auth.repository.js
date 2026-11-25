import { pool } from '../config/db.js';

export const authRepository = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.rol_id, u.nombre_completo, u.email, u.password_hash,
              u.telefono, u.nit_ci, u.activo, r.nombre AS rol_nombre
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findSessionById(userId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.rol_id, u.nombre_completo, u.email, u.telefono,
              u.nit_ci, u.activo, r.nombre AS rol_nombre
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async findPermissionsByRoleId(rolId) {
    const [rows] = await pool.execute(
      `SELECT p.clave
       FROM permisos p
       INNER JOIN rol_permiso rp ON rp.permiso_id = p.id
       WHERE rp.rol_id = ?`,
      [rolId]
    );
    return rows.map((row) => row.clave);
  },

  async findClientRoleId() {
    const [rows] = await pool.execute(
      "SELECT id FROM roles WHERE nombre = 'Cliente' LIMIT 1"
    );
    return rows[0]?.id || null;
  },

  async createClient({ rolId, nombreCompleto, email, passwordHash, telefono, nitCi }) {
    const [result] = await pool.execute(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, telefono, nit_ci)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rolId, nombreCompleto, email, passwordHash, telefono || null, nitCi || null]
    );
    return result.insertId;
  }
};