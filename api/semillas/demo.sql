-- Datos de demostración: 3 locales y 30 productos de ejemplo.
-- Reemplazar por los locales y el catálogo real del súper piloto.

INSERT INTO locales (id, nombre, direccion, telefono) VALUES
  ('centro', 'Sucursal Centro', 'Centro de la ciudad', '2200-0001'),
  ('norte', 'Sucursal Norte', 'Bulevar del Norte', '2200-0002'),
  ('sur', 'Sucursal Sur', 'Salida al sur', '2200-0003');

INSERT INTO categorias (id, nombre, orden) VALUES
  ('frutas-verduras', 'Frutas y verduras', 0),
  ('lacteos', 'Lácteos y huevos', 1),
  ('panaderia', 'Panadería', 2),
  ('carnes', 'Carnes y pescado', 3),
  ('despensa', 'Despensa', 4),
  ('bebidas', 'Bebidas', 5),
  ('limpieza', 'Limpieza y hogar', 6);

INSERT INTO productos (id, sku, nombre, categoria_id, unidad, precio_centavos) VALUES
  ('banano', 'SKU-001', 'Banano', 'frutas-verduras', 'Docena', 3500),
  ('tomate', 'SKU-002', 'Tomate', 'frutas-verduras', 'Libra', 1800),
  ('aguacate', 'SKU-003', 'Aguacate', 'frutas-verduras', 'Unidad', 2500),
  ('papa', 'SKU-004', 'Papa', 'frutas-verduras', 'Libra', 1600),
  ('cebolla', 'SKU-005', 'Cebolla', 'frutas-verduras', 'Libra', 2000),
  ('limon', 'SKU-006', 'Limón', 'frutas-verduras', '10 unidades', 2000),
  ('manzana', 'SKU-007', 'Manzana roja', 'frutas-verduras', 'Unidad', 1500),
  ('leche', 'SKU-008', 'Leche entera', 'lacteos', '1 litro', 3200),
  ('huevos', 'SKU-009', 'Huevos', 'lacteos', 'Cartón de 30', 12000),
  ('queso', 'SKU-010', 'Queso fresco', 'lacteos', 'Libra', 7000),
  ('mantequilla', 'SKU-011', 'Mantequilla', 'lacteos', 'Libra', 5500),
  ('pan-molde', 'SKU-012', 'Pan de molde', 'panaderia', 'Bolsa', 5200),
  ('baguette', 'SKU-013', 'Baguette', 'panaderia', 'Unidad', 2500),
  ('croissant', 'SKU-014', 'Croissant', 'panaderia', 'Unidad', 1800),
  ('pechuga', 'SKU-015', 'Pechuga de pollo', 'carnes', 'Libra', 6500),
  ('carne-molida', 'SKU-016', 'Carne molida', 'carnes', 'Libra', 8500),
  ('tilapia', 'SKU-017', 'Tilapia', 'carnes', 'Libra', 7500),
  ('arroz', 'SKU-018', 'Arroz', 'despensa', 'Bolsa de 5 lb', 8500),
  ('frijoles', 'SKU-019', 'Frijoles rojos', 'despensa', 'Bolsa de 2 lb', 4800),
  ('aceite', 'SKU-020', 'Aceite vegetal', 'despensa', '1 litro', 7500),
  ('cafe', 'SKU-021', 'Café molido', 'despensa', '400 g', 9500),
  ('spaghetti', 'SKU-022', 'Spaghetti', 'despensa', 'Paquete de 400 g', 2200),
  ('harina-maiz', 'SKU-023', 'Harina de maíz', 'despensa', 'Bolsa de 4 lb', 4000),
  ('agua', 'SKU-024', 'Agua purificada', 'bebidas', 'Galón', 3000),
  ('jugo-naranja', 'SKU-025', 'Jugo de naranja', 'bebidas', '1 litro', 4500),
  ('refresco', 'SKU-026', 'Refresco de cola', 'bebidas', '2 litros', 4200),
  ('papel-higienico', 'SKU-027', 'Papel higiénico', 'limpieza', '4 rollos', 4800),
  ('detergente', 'SKU-028', 'Detergente en polvo', 'limpieza', '1 kg', 7000),
  ('jabon', 'SKU-029', 'Jabón de baño', 'limpieza', '3 unidades', 4500),
  ('esponja', 'SKU-030', 'Esponja para trastes', 'limpieza', 'Paquete de 3', 3500);

-- Algunos productos agotados para ver cómo se comporta la app.
INSERT INTO disponibilidad (local_id, producto_id, disponible, actualizado_en) VALUES
  ('norte', 'tilapia', 0, '2026-10-23T00:00:00.000Z'),
  ('norte', 'croissant', 0, '2026-10-23T00:00:00.000Z'),
  ('sur', 'aguacate', 0, '2026-10-23T00:00:00.000Z');
