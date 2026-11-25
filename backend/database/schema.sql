CREATE DATABASE IF NOT EXISTS corejusto_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE corejusto_db;

CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL,
  -- Impide eliminar o corromper roles base del sistema como SuperAdmin o Cliente
  es_sistema TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permisos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(80) NOT NULL UNIQUE,
  modulo VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE rol_permiso (
  rol_id INT UNSIGNED NOT NULL,
  permiso_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  CONSTRAINT fk_rp_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id INT UNSIGNED NOT NULL,
  nombre_completo VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(30) NULL,
  nit_ci VARCHAR(30) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_rol (rol_id),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE configuracion_tienda (
  id TINYINT UNSIGNED PRIMARY KEY,
  nombre_tienda VARCHAR(120) NOT NULL,
  eslogan VARCHAR(255) NULL,
  logo_url VARCHAR(500) NULL,
  color_primario VARCHAR(7) NOT NULL DEFAULT '#0F172A',
  color_secundario VARCHAR(7) NOT NULL DEFAULT '#10B981',
  moneda_simbolo VARCHAR(10) NOT NULL DEFAULT 'Bs.',
  moneda_codigo VARCHAR(5) NOT NULL DEFAULT 'BOB',
  email_contacto VARCHAR(150) NOT NULL,
  telefono_contacto VARCHAR(30) NOT NULL,
  direccion_tienda VARCHAR(255) NOT NULL,
  politica_comercio_justo TEXT NOT NULL,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE zonas_envio (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  costo_envio DECIMAL(10, 2) NOT NULL,
  tiempo_estimado VARCHAR(80) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE categorias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE proveedores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  pais_origen VARCHAR(80) NOT NULL,
  contacto_email VARCHAR(150) NULL,
  telefono VARCHAR(30) NULL,
  certificacion_comercio_justo VARCHAR(180) NOT NULL,
  politica_garantia VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE productos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT UNSIGNED NOT NULL,
  proveedor_id INT UNSIGNED NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  precio_venta DECIMAL(10, 2) NOT NULL,
  margen_transparente_pct DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  meses_garantia SMALLINT UNSIGNED NOT NULL DEFAULT 12,
  stock_minimo INT UNSIGNED NOT NULL DEFAULT 5,
  imagen_url VARCHAR(500) NULL,
  especificaciones JSON NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_productos_categoria (categoria_id),
  INDEX idx_productos_proveedor (proveedor_id),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB;

CREATE TABLE lotes_inventario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id INT UNSIGNED NOT NULL,
  proveedor_id INT UNSIGNED NOT NULL,
  codigo_lote VARCHAR(60) NOT NULL UNIQUE,
  cantidad_inicial INT UNSIGNED NOT NULL,
  cantidad_disponible INT UNSIGNED NOT NULL,
  costo_unitario DECIMAL(10, 2) NOT NULL,
  fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('ACTIVO', 'AGOTADO', 'ANULADO') NOT NULL DEFAULT 'ACTIVO',
  observaciones VARCHAR(255) NULL,
  -- Índice compuesto crítico para que las consultas FIFO con FOR UPDATE sean instantáneas
  INDEX idx_lotes_fifo (producto_id, estado, fecha_ingreso, id),
  CONSTRAINT fk_lotes_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_lotes_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
) ENGINE=InnoDB;

CREATE TABLE movimientos_inventario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id INT UNSIGNED NOT NULL,
  lote_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('ENTRADA', 'SALIDA_VENTA', 'DEVOLUCION', 'AJUSTE_MERMA') NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  costo_unitario DECIMAL(10, 2) NOT NULL,
  referencia_tipo VARCHAR(40) NULL,
  referencia_id INT UNSIGNED NULL,
  motivo VARCHAR(255) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kardex_producto_fecha (producto_id, creado_en),
  CONSTRAINT fk_kardex_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_kardex_lote FOREIGN KEY (lote_id) REFERENCES lotes_inventario(id),
  CONSTRAINT fk_kardex_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE direcciones_cliente (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  zona_envio_id INT UNSIGNED NOT NULL,
  alias VARCHAR(60) NOT NULL,
  direccion_exacta VARCHAR(255) NOT NULL,
  referencia VARCHAR(255) NULL,
  es_principal TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_direcciones_usuario (usuario_id),
  CONSTRAINT fk_dir_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_dir_zona FOREIGN KEY (zona_envio_id) REFERENCES zonas_envio(id)
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo_pedido VARCHAR(40) NOT NULL UNIQUE,
  usuario_id INT UNSIGNED NOT NULL,
  tipo_entrega ENUM('ENVIO', 'RECOJO_TIENDA') NOT NULL,
  direccion_envio_id INT UNSIGNED NULL,
  direccion_snapshot VARCHAR(400) NULL,
  codigo_retiro VARCHAR(20) NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  costo_envio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  costo_ventas_cogs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  estado ENUM(
    'PENDIENTE_PAGO',
    'PAGADO',
    'EN_PREPARACION',
    'ENVIADO',
    'LISTO_RECOJO',
    'ENTREGADO',
    'CANCELADO'
  ) NOT NULL DEFAULT 'PENDIENTE_PAGO',
  notas VARCHAR(255) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pedidos_usuario_estado (usuario_id, estado),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_pedidos_direccion FOREIGN KEY (direccion_envio_id) REFERENCES direcciones_cliente(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE detalle_pedido (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  nombre_producto_snapshot VARCHAR(160) NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario_snapshot DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  INDEX idx_detalle_pedido (pedido_id),
  CONSTRAINT fk_dp_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_dp_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE detalle_pedido_lotes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  detalle_pedido_id BIGINT UNSIGNED NOT NULL,
  lote_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  costo_unitario_lote DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_dpl_detalle FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedido(id) ON DELETE CASCADE,
  CONSTRAINT fk_dpl_lote FOREIGN KEY (lote_id) REFERENCES lotes_inventario(id)
) ENGINE=InnoDB;

CREATE TABLE transacciones_pago (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  metodo ENUM('TARJETA_SIMULADA', 'QR_SIMULADO', 'EFECTIVO_TIENDA') NOT NULL,
  referencia_externa VARCHAR(120) NULL UNIQUE,
  monto DECIMAL(10, 2) NOT NULL,
  estado ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
  comprobante_url VARCHAR(500) NULL,
  datos_respuesta JSON NULL,
  validado_por_usuario_id INT UNSIGNED NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pagos_pedido (pedido_id),
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pagos_validador FOREIGN KEY (validado_por_usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vista_stock_productos AS
SELECT
  p.id AS producto_id,
  p.sku,
  p.nombre,
  p.stock_minimo,
  COALESCE(SUM(CASE WHEN l.estado = 'ACTIVO' THEN l.cantidad_disponible ELSE 0 END), 0) AS stock_actual,
  CASE
    WHEN COALESCE(SUM(CASE WHEN l.estado = 'ACTIVO' THEN l.cantidad_disponible ELSE 0 END), 0) <= p.stock_minimo
    THEN 1 ELSE 0
  END AS alerta_stock_bajo
FROM productos p
LEFT JOIN lotes_inventario l ON l.producto_id = p.id
GROUP BY p.id, p.sku, p.nombre, p.stock_minimo;