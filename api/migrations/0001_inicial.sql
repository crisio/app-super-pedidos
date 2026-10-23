-- Esquema inicial: locales, catálogo, disponibilidad por local, usuarios y pedidos.
-- Montos en centavos de Lempira. Fechas en ISO 8601 (UTC).

CREATE TABLE locales (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE productos (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  codigo_barras TEXT,
  nombre TEXT NOT NULL,
  categoria_id TEXT NOT NULL REFERENCES categorias(id),
  unidad TEXT NOT NULL,
  precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0),
  activo INTEGER NOT NULL DEFAULT 1
);

-- Sin fila = disponible. El personal del local marca lo que se agota.
CREATE TABLE disponibilidad (
  local_id TEXT NOT NULL REFERENCES locales(id),
  producto_id TEXT NOT NULL REFERENCES productos(id),
  disponible INTEGER NOT NULL,
  actualizado_en TEXT NOT NULL,
  actualizado_por TEXT,
  PRIMARY KEY (local_id, producto_id)
);

CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  clave_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('central', 'local')),
  local_id TEXT REFERENCES locales(id),
  activo INTEGER NOT NULL DEFAULT 1,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta TEXT,
  CHECK (rol = 'central' OR local_id IS NOT NULL)
);

CREATE TABLE sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  creada_en TEXT NOT NULL,
  expira_en TEXT NOT NULL
);

CREATE TABLE pedidos (
  id TEXT PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  local_id TEXT NOT NULL REFERENCES locales(id),
  canal TEXT NOT NULL,
  estado TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  entrega TEXT NOT NULL,
  direccion TEXT NOT NULL DEFAULT '',
  delivery_nombre TEXT NOT NULL DEFAULT '',
  pago TEXT NOT NULL,
  notas TEXT NOT NULL DEFAULT '',
  subtotal_centavos INTEGER NOT NULL,
  envio_centavos INTEGER NOT NULL,
  tarifa_servicio_centavos INTEGER NOT NULL,
  total_centavos INTEGER NOT NULL,
  -- Evita pedidos duplicados si la misma solicitud llega dos veces.
  clave_idempotencia TEXT UNIQUE,
  creado_por TEXT REFERENCES usuarios(id),
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);

CREATE INDEX pedidos_por_local_estado ON pedidos (local_id, estado, creado_en);
CREATE INDEX pedidos_por_estado ON pedidos (estado, creado_en);

CREATE TABLE lineas_pedido (
  pedido_id TEXT NOT NULL REFERENCES pedidos(id),
  producto_id TEXT NOT NULL REFERENCES productos(id),
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL,
  precio_centavos INTEGER NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  importe_centavos INTEGER NOT NULL,
  PRIMARY KEY (pedido_id, producto_id)
);

-- Historial de cambios de estado (auditoría).
CREATE TABLE eventos_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id TEXT NOT NULL REFERENCES pedidos(id),
  estado TEXT NOT NULL,
  nota TEXT NOT NULL DEFAULT '',
  usuario_id TEXT REFERENCES usuarios(id),
  creado_en TEXT NOT NULL
);

CREATE INDEX eventos_por_pedido ON eventos_pedido (pedido_id, id);
