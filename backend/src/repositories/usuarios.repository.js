import { pool } from '../config/db.js';

export const usuariosRepository = {
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT u.id, u.rol_id, r.nombre AS rol_nombre, u.nombre_completo,
              u.email, u.telefono, u.nit_ci, u.activo, u.creado_en
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       ORDER BY u.id DESC`
    );
    return rows.map((u) => ({ ...u, activo: Boolean(u.activo) }));
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.rol_id, r.nombre AS rol_nombre, u.nombre_completo,
              u.email, u.telefono, u.nit_ci, u.activo, u.creado_en
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
       WHERE u.id = ?
       LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    return { ...rows[0], activo: Boolean(rows[0].activo) };
  },

  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async create({ rolId, nombreCompleto, email, passwordHash, telefono, nitCi }) {
    const [result] = await pool.execute(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, telefono, nit_ci)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rolId, nombreCompleto, email, passwordHash, telefono || null, nitCi || null]
    );
    return result.insertId;
  },

  async update(id, { rolId, nombreCompleto, email, telefono, nitCi, passwordHash }) {
    if (passwordHash) {
      await pool.execute(
        `UPDATE usuarios
         SET rol_id = ?, nombre_completo = ?, email = ?, telefono = ?, nit_ci = ?, password_hash = ?
         WHERE id = ?`,
        [rolId, nombreCompleto, email, telefono || null, nitCi || null, passwordHash, id]
      );
      return;
    }

    await pool.execute(
      `UPDATE usuarios
       SET rol_id = ?, nombre_completo = ?, email = ?, telefono = ?, nit_ci = ?
       WHERE id = ?`,
      [rolId, nombreCompleto, email, telefono || null, nitCi || null, id]
    );
  },

  async updateStatus(id, activo) {
    await pool.execute('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  }
};