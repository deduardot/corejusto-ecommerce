import { pool } from '../config/db.js';

export const configRepository = {
  async getStoreConfig() {
    const [rows] = await pool.execute(
      `SELECT id, nombre_tienda, eslogan, logo_url, color_primario, color_secundario,
              moneda_simbolo, moneda_codigo, email_contacto, telefono_contacto,
              direccion_tienda, politica_comercio_justo, actualizado_en
       FROM configuracion_tienda
       WHERE id = 1
       LIMIT 1`
    );
    return rows[0] || null;
  },

  async updateStoreConfig(data) {
    await pool.execute(
      `UPDATE configuracion_tienda
       SET nombre_tienda = ?, eslogan = ?, logo_url = ?, color_primario = ?,
           color_secundario = ?, moneda_simbolo = ?, moneda_codigo = ?,
           email_contacto = ?, telefono_contacto = ?, direccion_tienda = ?,
           politica_comercio_justo = ?
       WHERE id = 1`,
      [
        data.nombre_tienda,
        data.eslogan,
        data.logo_url,
        data.color_primario,
        data.color_secundario,
        data.moneda_simbolo,
        data.moneda_codigo,
        data.email_contacto,
        data.telefono_contacto,
        data.direccion_tienda,
        data.politica_comercio_justo
      ]
    );
  },

  async findZones({ onlyActive = false } = {}) {
    const sql = onlyActive
      ? 'SELECT id, nombre, costo_envio, tiempo_estimado, activo FROM zonas_envio WHERE activo = 1 ORDER BY costo_envio ASC'
      : 'SELECT id, nombre, costo_envio, tiempo_estimado, activo FROM zonas_envio ORDER BY id ASC';
    const [rows] = await pool.execute(sql);
    return rows.map((z) => ({ ...z, activo: Boolean(z.activo) }));
  },

  async findZoneById(id) {
    const [rows] = await pool.execute(
      'SELECT id, nombre, costo_envio, tiempo_estimado, activo FROM zonas_envio WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ? { ...rows[0], activo: Boolean(rows[0].activo) } : null;
  },

  async findZoneByName(nombre) {
    const [rows] = await pool.execute(
      'SELECT id FROM zonas_envio WHERE nombre = ? LIMIT 1',
      [nombre]
    );
    return rows[0] || null;
  },

  async countAddressesByZone(zonaId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM direcciones_cliente WHERE zona_envio_id = ?',
      [zonaId]
    );
    return rows[0].total;
  },

  async createZone({ nombre, costo_envio, tiempo_estimado }) {
    const [res] = await pool.execute(
      'INSERT INTO zonas_envio (nombre, costo_envio, tiempo_estimado) VALUES (?, ?, ?)',
      [nombre, costo_envio, tiempo_estimado]
    );
    return res.insertId;
  },

  async updateZone(id, { nombre, costo_envio, tiempo_estimado, activo }) {
    await pool.execute(
      'UPDATE zonas_envio SET nombre = ?, costo_envio = ?, tiempo_estimado = ?, activo = ? WHERE id = ?',
      [nombre, costo_envio, tiempo_estimado, activo ? 1 : 0, id]
    );
  },

  async deleteZone(id) {
    await pool.execute('DELETE FROM zonas_envio WHERE id = ?', [id]);
  }
};