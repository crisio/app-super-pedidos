-- Inventario importado desde SAP.

-- Código del centro en SAP. Los locales con inventario_sap = 1 toman su disponibilidad
-- del archivo: lo que no viene en el archivo para ese centro no está disponible.
ALTER TABLE locales ADD COLUMN codigo_sap TEXT;
ALTER TABLE locales ADD COLUMN inventario_sap INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX locales_por_codigo_sap ON locales (codigo_sap) WHERE codigo_sap IS NOT NULL;

-- Nombre en minúsculas y sin tildes, para buscar productos.
ALTER TABLE productos ADD COLUMN nombre_busqueda TEXT NOT NULL DEFAULT '';
UPDATE productos SET nombre_busqueda =
  replace(replace(replace(replace(replace(replace(replace(lower(nombre),
    'á', 'a'), 'é', 'e'), 'í', 'i'), 'ó', 'o'), 'ú', 'u'), 'ü', 'u'), 'ñ', 'n');
CREATE INDEX productos_por_codigo_barras ON productos (codigo_barras);
CREATE INDEX productos_por_nombre ON productos (activo, nombre);

ALTER TABLE disponibilidad ADD COLUMN existencias REAL;

CREATE TABLE importaciones (
  id TEXT PRIMARY KEY,
  archivo TEXT NOT NULL,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  -- Locales cuyo inventario actualiza esta importación (arreglo JSON de ids).
  locales TEXT NOT NULL DEFAULT '[]',
  creada_en TEXT NOT NULL,
  terminada_en TEXT,
  productos INTEGER NOT NULL DEFAULT 0,
  existencias INTEGER NOT NULL DEFAULT 0,
  desactivados INTEGER NOT NULL DEFAULT 0
);
