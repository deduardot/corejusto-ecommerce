import { pool } from '../config/db.js';

export const proveedoresRepository = {
  async findAll({ onlyActive = false } = {}) {
    const where = onlyActive ? 'WHERE activo = 1' : '';
    const [rows] = await pool.execute(
      `SELECT id, nombre, pais_origen, contacto_email, telefono,
              certificacion_comercio_justo, politica_garantia, activo, creado_en
       FROM proveedores
       ${where}
       ORDER BY nombre ASC`
    );
    return rows.map((p) => ({ ...p, activo: Boolean(p.activo) }));
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, nombre, pais_origen, contacto_email, telefono,
              certificacion_comercio_justo, politica_garantia, activo, creado_en
       FROM proveedores
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ? { ...rows[0], activo: Boolean(rows[0].activo) } : null;
  },

  async findByName(nombre, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM proveedores WHERE nombre = ? AND id != ? LIMIT 1'
      : 'SELECT id FROM proveedores WHERE nombre = ? LIMIT 1';
    const params = excludeId ? [nombre, excludeId] : [nombre];
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  async countDependencies(proveedorId) {
    const [[prod]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM productos WHERE proveedor_id = ?',
      [proveedorId]
    );
    const [[lotes]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM lotes_inventario WHERE proveedor_id = ?',
      [proveedorId]
    );
    return prod.total + lotes.total;
  },

  async create(data) {
    const [res] = await pool.execute(
      `INSERT INTO proveedores
       (nombre, pais_origen, contacto_email, telefono, certificacion_comercio_justo, politica_garantia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.nombre,
        data.pais_origen,
        data.contacto_email || null,
        data.telefono || null,
        data.certificacion_comercio_justo,
        data.politica_garantia
      ]
    );
    return res.insertId;
  },

  async update(id, data) {
    await pool.execute(
      `UPDATE proveedores
       SET nombre = ?, pais_origen = ?, contacto_email = ?, telefono = ?,
           certificacion_comercio_justo = ?, politica_garantia = ?, activo = ?
       WHERE id = ?`,
      [
        data.nombre,
        data.pais_origen,
        data.contacto_email || null,
        data.telefono || null,
        data.certificacion_comercio_justo,
        data.politica_garantia,
        data.activo ? 1 : 0,
        id
      ]
    );
  },

  async deleteById(id) {
    await pool.execute('DELETE FROM proveedores WHERE id = ?', [id]);
  }
};