import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const PERMISOS = [
  ['roles:ver', 'rbac', 'Listar roles y permisos'],
  ['roles:gestionar', 'rbac', 'Crear, editar y eliminar roles dinámicos'],
  ['usuarios:ver', 'usuarios', 'Listar usuarios del sistema'],
  ['usuarios:gestionar', 'usuarios', 'Crear, editar, cambiar rol y desactivar usuarios'],
  ['config:editar', 'whitelabel', 'Editar identidad visual, moneda y zonas de envío'],
  ['categorias:gestionar', 'catalogo', 'CRUD de categorías de productos'],
  ['proveedores:gestionar', 'catalogo', 'CRUD de proveedores y trazabilidad'],
  ['productos:ver', 'catalogo', 'Ver catálogo administrativo de productos'],
  ['productos:gestionar', 'catalogo', 'Crear, editar y desactivar productos'],
  ['inventario:ver', 'inventario', 'Consultar lotes activos y alertas de stock'],
  ['inventario:ingresar_lote', 'inventario', 'Registrar nuevos ingresos de lotes FIFO'],
  ['inventario:ver_kardex', 'inventario', 'Consultar historial inmutable de Kardex'],
  ['inventario:ajustar', 'inventario', 'Registrar mermas o devoluciones de inventario'],
  ['pedidos:ver_todos', 'pedidos', 'Ver todos los pedidos de la tienda'],
  ['pedidos:actualizar_estado', 'pedidos', 'Cambiar estado logístico y validar pagos'],
  ['pedidos:cancelar', 'pedidos', 'Cancelar pedidos y revertir lotes FIFO'],
  ['reportes:ver', 'reportes', 'Ver dashboard financiero, COGS y márgenes']
];

async function runSeed() {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'transacciones_pago', 'detalle_pedido_lotes', 'detalle_pedido', 'pedidos',
      'direcciones_cliente', 'movimientos_inventario', 'lotes_inventario',
      'productos', 'proveedores', 'categorias', 'zonas_envio',
      'configuracion_tienda', 'usuarios', 'rol_permiso', 'permisos', 'roles'
    ];
    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE ${table}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const rolesData = [
      ['SuperAdmin', 'Control total del sistema, RBAC y configuración White-Label', 1],
      ['Gestor de Catálogo', 'Administración de productos, proveedores, categorías e inventario FIFO', 0],
      ['Operador de Pedidos', 'Validación de pagos QR/efectivo y despacho de pedidos', 0],
      ['Cliente', 'Compra en tienda pública, gestión de direcciones y seguimiento de pedidos', 1]
    ];

    for (const r of rolesData) {
      await conn.execute('INSERT INTO roles (nombre, descripcion, es_sistema) VALUES (?, ?, ?)', r);
    }

    for (const p of PERMISOS) {
      await conn.execute('INSERT INTO permisos (clave, modulo, descripcion) VALUES (?, ?, ?)', p);
    }

    const [[rolAdmin]] = await conn.query("SELECT id FROM roles WHERE nombre = 'SuperAdmin'");
    const [[rolGestor]] = await conn.query("SELECT id FROM roles WHERE nombre = 'Gestor de Catálogo'");
    const [[rolOperador]] = await conn.query("SELECT id FROM roles WHERE nombre = 'Operador de Pedidos'");
    const [[rolCliente]] = await conn.query("SELECT id FROM roles WHERE nombre = 'Cliente'");

    await conn.execute(
      'INSERT INTO rol_permiso (rol_id, permiso_id) SELECT ?, id FROM permisos',
      [rolAdmin.id]
    );

    const permisosGestor = [
      'categorias:gestionar', 'proveedores:gestionar', 'productos:ver', 'productos:gestionar',
      'inventario:ver', 'inventario:ingresar_lote', 'inventario:ver_kardex', 'inventario:ajustar'
    ];
    await conn.query(
      'INSERT INTO rol_permiso (rol_id, permiso_id) SELECT ?, id FROM permisos WHERE clave IN (?)',
      [rolGestor.id, permisosGestor]
    );

    const permisosOperador = [
      'pedidos:ver_todos', 'pedidos:actualizar_estado', 'pedidos:cancelar', 'inventario:ver'
    ];
    await conn.query(
      'INSERT INTO rol_permiso (rol_id, permiso_id) SELECT ?, id FROM permisos WHERE clave IN (?)',
      [rolOperador.id, permisosOperador]
    );

    const hashAdmin = await bcrypt.hash('Admin123!', 10);
    const hashGestor = await bcrypt.hash('Gestor123!', 10);
    const hashOperador = await bcrypt.hash('Operador123!', 10);
    const hashCliente = await bcrypt.hash('Cliente123!', 10);

    const [adminRes] = await conn.execute(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, telefono, nit_ci)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rolAdmin.id, 'Administrador Principal', 'admin@corejusto.com', hashAdmin, '70010001', '1000001']
    );

    await conn.execute(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, telefono, nit_ci)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rolGestor.id, 'Carlos Mendoza', 'gestor@corejusto.com', hashGestor, '70010002', '1000002']
    );

    await conn.execute(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, telefono, nit_ci)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rolOperador.id, 'Lucía Vargas', 'operador@corejusto.com', hashOperador, '70010003', '1000003']
    );

    const [clienteRes] = await conn.execute(
      `INSERT INTO usuarios (rol_id, nombre_completo, email, password_hash, telefono, nit_ci)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rolCliente.id, 'Dilan Tapia', 'cliente@corejusto.com', hashCliente, '70010004', '8912345']
    );

    await conn.execute(
      `INSERT INTO configuracion_tienda
       (id, nombre_tienda, eslogan, logo_url, color_primario, color_secundario, moneda_simbolo, moneda_codigo, email_contacto, telefono_contacto, direccion_tienda, politica_comercio_justo)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'CoreJusto Hardware',
        'Componentes de PC con trazabilidad directa y precios transparentes',
        null,
        '#0F172A',
        '#10B981',
        'Bs.',
        'BOB',
        'contacto@corejusto.com',
        '+591 70010001',
        'Av. Cristo Redentor, 3er Anillo, Santa Cruz de la Sierra',
        'Importación directa sin intermediarios especulativos, margen transparente publicado y garantía oficial respaldada por lote.'
      ]
    );

    const zonas = [
      ['Zona Central (1er al 4to Anillo)', 20.00, 'Entrega el mismo día (2 a 4 horas)'],
      ['Zona Periférica (5to al 8vo Anillo)', 30.00, 'Entrega en 24 horas'],
      ['Envío Interdepartamental (Flota/Courier)', 45.00, 'Entrega en 24 a 48 horas']
    ];
    for (const z of zonas) {
      await conn.execute('INSERT INTO zonas_envio (nombre, costo_envio, tiempo_estimado) VALUES (?, ?, ?)', z);
    }

    await conn.execute(
      `INSERT INTO direcciones_cliente (usuario_id, zona_envio_id, alias, direccion_exacta, referencia, es_principal)
       VALUES (?, 2, 'Casa', 'Barrio Los Lotes, entre 6to y 7mo Anillo, Calle 4 #25', 'Portón gris frente a la plaza', 1),
              (?, 1, 'Universidad', 'Av. Beni 3er Anillo Externo', 'Entrega en portería principal', 0)`,
      [clienteRes.insertId, clienteRes.insertId]
    );

    const categorias = [
      ['Procesadores', 'procesadores', 'CPUs AMD Ryzen e Intel Core de última generación'],
      ['Tarjetas Gráficas', 'tarjetas-graficas', 'GPUs dedicadas para gaming y estaciones de trabajo'],
      ['Placas Madre', 'placas-madre', 'Motherboards AM5 y LGA1700 con VRM reforzado'],
      ['Memorias RAM', 'memorias-ram', 'Kits DDR4 y DDR5 de baja latencia'],
      ['Almacenamiento SSD', 'almacenamiento-ssd', 'Unidades NVMe PCIe 4.0 de alta velocidad'],
      ['Fuentes de Poder', 'fuentes-de-poder', 'Fuentes certificadas 80 Plus Bronze y Gold']
    ];
    for (const c of categorias) {
      await conn.execute('INSERT INTO categorias (nombre, slug, descripcion) VALUES (?, ?, ?)', c);
    }

    const proveedores = [
      ['AndesTech Direct', 'Chile', 'ventas@andestech.cl', '+56 2 2900 1100', 'Importador Directo Certificado - Cero Reventa', 'Garantía directa de reemplazo por 12 a 36 meses'],
      ['SiliconFair Latam', 'Estados Unidos', 'b2b@siliconfair.com', '+1 305 555 0199', 'Sello Comercio Justo Tecnológico - Trazabilidad de Fábrica', 'RMA gestionado en menos de 7 días hábiles'],
      ['Pacific Components Co.', 'Taiwán', 'export@pacificcomp.tw', '+886 2 2700 4400', 'Distribución Oficial de Fabricante OEM', 'Garantía oficial sellada por número de serie']
    ];
    for (const pr of proveedores) {
      await conn.execute(
        `INSERT INTO proveedores (nombre, pais_origen, contacto_email, telefono, certificacion_comercio_justo, politica_garantia)
         VALUES (?, ?, ?, ?, ?, ?)`,
        pr
      );
    }

    const productos = [
      [1, 1, 'CPU-R5-7600', 'AMD Ryzen 5 7600 6-Core 5.1GHz', 'amd-ryzen-5-7600', 'Procesador arquitectura Zen 4 con gráficos integrados y disipador Wraith Stealth.', 1850.00, 14.00, 36, 4, JSON.stringify({ socket: 'AM5', nucleos: 6, hilos: 12, tdp: '65W', frecuencia_boost: '5.1 GHz' })],
      [2, 2, 'GPU-RTX4060-8G', 'NVIDIA GeForce RTX 4060 Dual 8GB GDDR6', 'rtx-4060-dual-8gb', 'Tarjeta gráfica arquitectura Ada Lovelace con DLSS 3 y bajo consumo energético.', 2790.00, 12.50, 24, 3, JSON.stringify({ vram: '8GB GDDR6', interfaz: 'PCIe 4.0', consumo: '115W', salidas: 'HDMI 2.1 + 3x DP' })],
      [3, 3, 'MB-B650M-PRO', 'Placa Madre B650M Pro WiFi DDR5', 'placa-madre-b650m-pro', 'Placa Micro-ATX para plataforma AM5 con doble ranura M.2 PCIe 4.0 y WiFi 6.', 1390.00, 15.00, 24, 4, JSON.stringify({ socket: 'AM5', formato: 'Micro-ATX', memoria: 'DDR5 hasta 128GB', m2_slots: 2 })],
      [4, 1, 'RAM-DDR5-32G', 'Kit Memoria RAM 32GB (2x16GB) DDR5 6000MHz', 'ram-32gb-ddr5-6000', 'Memoria de alto rendimiento con perfiles EXPO/XMP y disipador de aluminio.', 980.00, 16.00, 36, 5, JSON.stringify({ capacidad: '32GB (2x16GB)', tipo: 'DDR5', velocidad: '6000 MT/s', latencia: 'CL30' })],
      [5, 2, 'SSD-NVME-1TB', 'SSD WD Black SN850X 1TB NVMe PCIe 4.0', 'ssd-wd-black-sn850x-1tb', 'Almacenamiento ultrarrápido para sistema operativo, compilación y videojuegos.', 650.00, 18.00, 36, 5, JSON.stringify({ capacidad: '1TB', formato: 'M.2 2280', lectura: '7300 MB/s', escritura: '6300 MB/s' })],
      [6, 3, 'PSU-750W-GOLD', 'Fuente de Poder 750W 80 Plus Gold Modular', 'fuente-750w-80plus-gold', 'Fuente totalmente modular con condensadores japoneses y soporte ATX 3.0.', 890.00, 15.00, 60, 4, JSON.stringify({ potencia: '750W', certificacion: '80 Plus Gold', modularidad: 'Full Modular', protecciones: 'OVP/UVP/OCP/SCP' })]
    ];

    for (const prod of productos) {
      await conn.execute(
        `INSERT INTO productos
         (categoria_id, proveedor_id, sku, nombre, slug, descripcion, precio_venta, margen_transparente_pct, meses_garantia, stock_minimo, especificaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        prod
      );
    }

    // Lotes iniciales: el producto 5 (SSD 1TB) incluye dos lotes con distinto costo para probar FIFO multi-lote;
    // el producto 2 (RTX 4060) queda debajo de su stock_minimo (3) para probar las alertas del dashboard.
    const lotes = [
      [1, 1, 'LOTE-CPU-2026-01', 8, 8, 1550.00, '2026-11-02 09:00:00', 'Ingreso inicial importación directa'],
      [2, 2, 'LOTE-GPU-2026-01', 2, 2, 2400.00, '2026-11-05 10:30:00', 'Lote reducido para prueba de alerta de stock bajo'],
      [3, 3, 'LOTE-MB-2026-01', 6, 6, 1150.00, '2026-11-04 14:00:00', 'Ingreso inicial placas AM5'],
      [4, 1, 'LOTE-RAM-2026-01', 12, 12, 810.00, '2026-11-06 11:15:00', 'Ingreso inicial kits DDR5'],
      [5, 2, 'LOTE-SSD-2026-A', 10, 10, 450.00, '2026-11-01 08:30:00', 'Primer lote SSD - costo anterior más bajo'],
      [5, 2, 'LOTE-SSD-2026-B', 5, 5, 490.00, '2026-11-15 16:00:00', 'Segundo lote SSD - costo actualizado para validación FIFO'],
      [6, 3, 'LOTE-PSU-2026-01', 7, 7, 740.00, '2026-11-08 15:45:00', 'Ingreso inicial fuentes 750W Gold']
    ];

    for (const l of lotes) {
      const [loteRes] = await conn.execute(
        `INSERT INTO lotes_inventario
         (producto_id, proveedor_id, codigo_lote, cantidad_inicial, cantidad_disponible, costo_unitario, fecha_ingreso, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        l
      );

      await conn.execute(
        `INSERT INTO movimientos_inventario
         (producto_id, lote_id, usuario_id, tipo, cantidad, costo_unitario, referencia_tipo, referencia_id, motivo)
         VALUES (?, ?, ?, 'ENTRADA', ?, ?, 'LOTE_INICIAL', ?, ?)`,
        [l[0], loteRes.insertId, adminRes.insertId, l[3], l[5], loteRes.insertId, l[7]]
      );
    }

    await conn.commit();
    console.log('Seed completado correctamente.');
  } catch (error) {
    await conn.rollback();
    console.error('Error ejecutando seed:', error.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

runSeed();