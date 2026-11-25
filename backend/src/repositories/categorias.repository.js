import { pool } from '../config/db.js';

export const categoriasRepository = {
  async findAll({ onlyActive = false } = {}) {
    const where = onlyActive ? 'WHERE c.activo = 1' : '';
    const [rows] = await pool.execute(
      `SELECT c.id, c.nombre, c.slug, c.descripcion, c.activo, c.creado_en,
              COUNT(p.id) AS total_productos
       FROM categorias c
       LEFT JOIN productos p ON p.categoria_id = c.id AND p.activo = 1
       ${where}
       GROUP BY c.id
       ORDER BY c.nombre ASC`
    );
    return rows.map((c) => ({ ...c, activo: Boolean(c.activo) }));
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, nombre, slug, descripcion, activo, creado_en FROM categorias WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ? { ...rows[0], activo: Boolean(rows[0].activo) } : null;
  },

  async findByNameOrSlug(nombre, slug, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM categorias WHERE (nombre = ? OR slug = ?) AND id != ? LIMIT 1'
      : 'SELECT id FROM categorias WHERE nombre = ? OR slug = ? LIMIT 1';
    const params = excludeId ? [nombre, slug, excludeId] : [nombre, slug];
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  },

  async countLinkedProducts(categoriaId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM productos WHERE categoria_id = ?',
      [categoriaId]
    );
    return rows[0].total;
  },

  async create({ nombre, slug, descripcion }) {
    const [res] = await pool.execute(
      'INSERT INTO categorias (nombre, slug, descripcion) VALUES (?, ?, ?)',
      [nombre, slug, descripcion || null]
    );
    return res.insertId;
  },

  async update(id, { nombre, slug, descripcion, activo }) {
    await pool.execute(
      'UPDATE categorias SET nombre = ?, slug = ?, descripcion = ?, activo = ? WHERE id = ?',
      [nombre, slug, descripcion || null, activo ? 1 : 0, id]
    );
  },

  async deleteById(id) {
    await pool.execute('DELETE FROM categorias WHERE id = ?', [id]);
  }
};