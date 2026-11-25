import { pool } from '../config/db.js';

export const direccionesRepository = {
  async findByUserId(usuarioId) {
    const [rows] = await pool.execute(
      `SELECT d.id, d.usuario_id, d.zona_envio_id, z.nombre AS zona_nombre,
              z.costo_envio, z.tiempo_estimado, d.alias, d.direccion_exacta,
              d.referencia, d.es_principal, d.creado_en
       FROM direcciones_cliente d
       INNER JOIN zonas_envio z ON z.id = d.zona_envio_id
       WHERE d.usuario_id = ?
       ORDER BY d.es_principal DESC, d.id DESC`,
      [usuarioId]
    );
    return rows.map((row) => ({ ...row, es_principal: Boolean(row.es_principal) }));
  },

  async findByIdAndUser(id, usuarioId, conn = pool) {
    const [rows] = await conn.execute(
      `SELECT d.id, d.usuario_id, d.zona_envio_id, z.nombre AS zona_nombre,
              z.costo_envio, z.tiempo_estimado, z.activo AS zona_activa,
              d.alias, d.direccion_exacta, d.referencia, d.es_principal
       FROM direcciones_cliente d
       INNER JOIN zonas_envio z ON z.id = d.zona_envio_id
       WHERE d.id = ? AND d.usuario_id = ?
       LIMIT 1`,
      [id, usuarioId]
    );
    if (!rows[0]) return null;
    return {
      ...rows[0],
      es_principal: Boolean(rows[0].es_principal),
      zona_activa: Boolean(rows[0].zona_activa)
    };
  },

  async create(usuarioId, data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (data.es_principal) {
        await conn.execute(
          'UPDATE direcciones_cliente SET es_principal = 0 WHERE usuario_id = ?',
          [usuarioId]
        );
      }

      const [res] = await conn.execute(
        `INSERT INTO direcciones_cliente
         (usuario_id, zona_envio_id, alias, direccion_exacta, referencia, es_principal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          usuarioId,
          data.zona_envio_id,
          data.alias,
          data.direccion_exacta,
          data.referencia || null,
          data.es_principal ? 1 : 0
        ]
      );

      await conn.commit();
      return res.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async update(id, usuarioId, data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (data.es_principal) {
        await conn.execute(
          'UPDATE direcciones_cliente SET es_principal = 0 WHERE usuario_id = ? AND id != ?',
          [usuarioId, id]
        );
      }

      await conn.execute(
        `UPDATE direcciones_cliente
         SET zona_envio_id = ?, alias = ?, direccion_exacta = ?, referencia = ?, es_principal = ?
         WHERE id = ? AND usuario_id = ?`,
        [
          data.zona_envio_id,
          data.alias,
          data.direccion_exacta,
          data.referencia || null,
          data.es_principal ? 1 : 0,
          id,
          usuarioId
        ]
      );

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async deleteByIdAndUser(id, usuarioId) {
    await pool.execute(
      'DELETE FROM direcciones_cliente WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
  }
};