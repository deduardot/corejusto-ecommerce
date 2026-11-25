import { pool } from '../config/db.js';

export const rolesRepository = {
  async findAllPermissions() {
    const [rows] = await pool.execute(
      'SELECT id, clave, modulo, descripcion FROM permisos ORDER BY modulo, clave'
    );
    return rows;
  },

  async findAllRolesWithPermissions() {
    const [roles] = await pool.execute(
      `SELECT r.id, r.nombre, r.descripcion, r.es_sistema, r.creado_en,
              COUNT(DISTINCT u.id) AS total_usuarios
       FROM roles r
       LEFT JOIN usuarios u ON u.rol_id = r.id
       GROUP BY r.id
       ORDER BY r.id ASC`
    );

    const [links] = await pool.execute(
      `SELECT rp.rol_id, p.id, p.clave, p.modulo
       FROM rol_permiso rp
       INNER JOIN permisos p ON p.id = rp.permiso_id`
    );

    const map = new Map();
    for (const link of links) {
      if (!map.has(link.rol_id)) map.set(link.rol_id, []);
      map.get(link.rol_id).push({ id: link.id, clave: link.clave, modulo: link.modulo });
    }

    return roles.map((role) => ({
      ...role,
      es_sistema: Boolean(role.es_sistema),
      permisos: map.get(role.id) || []
    }));
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, nombre, descripcion, es_sistema FROM roles WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async findByName(nombre) {
    const [rows] = await pool.execute(
      'SELECT id FROM roles WHERE nombre = ? LIMIT 1',
      [nombre]
    );
    return rows[0] || null;
  },

  async countValidPermissions(permisoIds) {
    if (!permisoIds.length) return 0;
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS total FROM permisos WHERE id IN (?)',
      [permisoIds]
    );
    return rows[0].total;
  },

  async countUsersByRole(rolId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM usuarios WHERE rol_id = ?',
      [rolId]
    );
    return rows[0].total;
  },

  async createWithPermissions({ nombre, descripcion, permisoIds }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.execute(
        'INSERT INTO roles (nombre, descripcion, es_sistema) VALUES (?, ?, 0)',
        [nombre, descripcion]
      );
      const rolId = res.insertId;

      if (permisoIds.length > 0) {
        const values = permisoIds.map((pid) => [rolId, pid]);
        await conn.query('INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ?', [values]);
      }

      await conn.commit();
      return rolId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async updateWithPermissions(rolId, { nombre, descripcion, permisoIds }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        'UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?',
        [nombre, descripcion, rolId]
      );

      if (Array.isArray(permisoIds)) {
        await conn.execute('DELETE FROM rol_permiso WHERE rol_id = ?', [rolId]);
        if (permisoIds.length > 0) {
          const values = permisoIds.map((pid) => [rolId, pid]);
          await conn.query('INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ?', [values]);
        }
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async deleteById(rolId) {
    await pool.execute('DELETE FROM roles WHERE id = ?', [rolId]);
  }
};