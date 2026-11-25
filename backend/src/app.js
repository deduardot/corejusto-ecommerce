import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { pool } from './config/db.js';
import { sanitizeInput } from './middlewares/sanitize.middleware.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import configRoutes from './routes/config.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';
import proveedoresRoutes from './routes/proveedores.routes.js';
import productosRoutes from './routes/productos.routes.js';
import inventarioRoutes from './routes/inventario.routes.js';
import direccionesRoutes from './routes/direcciones.routes.js';
import pedidosRoutes from './routes/pedidos.routes.js';

const app = express();

// Requerido detrás del proxy inverso de Render para que express-rate-limit valide IPs correctamente
app.set('trust proxy', 1);

const allowedOrigin = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, mensaje: 'Demasiadas peticiones desde esta IP, intenta nuevamente más tarde.' }
}));

app.use(express.json({ limit: '100kb' }));
app.use(sanitizeInput);

app.get('/api/health', async (_req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT COUNT(*) AS productos FROM productos');
    res.json({
      ok: true,
      servicio: 'CoreJusto API',
      db: 'conectada',
      productos_precargados: row.productos
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/config', configRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/direcciones', direccionesRoutes);
app.use('/api/pedidos', pedidosRoutes);

app.use((_req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Endpoint no encontrado' });
});

app.use(errorHandler);

export default app;