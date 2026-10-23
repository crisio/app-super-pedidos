export type Categoria = {
  id: string;
  nombre: string;
  emoji: string;
};

export type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  precio: number;
  emoji: string;
};

export const categorias: Categoria[] = [
  { id: "frutas-verduras", nombre: "Frutas y verduras", emoji: "🥬" },
  { id: "lacteos", nombre: "Lácteos y huevos", emoji: "🥛" },
  { id: "panaderia", nombre: "Panadería", emoji: "🍞" },
  { id: "carnes", nombre: "Carnes y pescado", emoji: "🍗" },
  { id: "despensa", nombre: "Despensa", emoji: "🥫" },
  { id: "bebidas", nombre: "Bebidas", emoji: "🧃" },
  { id: "limpieza", nombre: "Limpieza y hogar", emoji: "🧽" },
];

// Catálogo de ejemplo, en Lempiras. Se reemplazará por la base de datos.
export const productos: Producto[] = [
  { id: "banano", nombre: "Banano", categoria: "frutas-verduras", unidad: "Docena", precio: 35, emoji: "🍌" },
  { id: "tomate", nombre: "Tomate", categoria: "frutas-verduras", unidad: "Libra", precio: 18, emoji: "🍅" },
  { id: "aguacate", nombre: "Aguacate", categoria: "frutas-verduras", unidad: "Unidad", precio: 25, emoji: "🥑" },
  { id: "papa", nombre: "Papa", categoria: "frutas-verduras", unidad: "Libra", precio: 16, emoji: "🥔" },
  { id: "cebolla", nombre: "Cebolla", categoria: "frutas-verduras", unidad: "Libra", precio: 20, emoji: "🧅" },
  { id: "limon", nombre: "Limón", categoria: "frutas-verduras", unidad: "10 unidades", precio: 20, emoji: "🍋" },
  { id: "manzana", nombre: "Manzana roja", categoria: "frutas-verduras", unidad: "Unidad", precio: 15, emoji: "🍎" },
  { id: "leche", nombre: "Leche entera", categoria: "lacteos", unidad: "1 litro", precio: 32, emoji: "🥛" },
  { id: "huevos", nombre: "Huevos", categoria: "lacteos", unidad: "Cartón de 30", precio: 120, emoji: "🥚" },
  { id: "queso", nombre: "Queso fresco", categoria: "lacteos", unidad: "Libra", precio: 70, emoji: "🧀" },
  { id: "mantequilla", nombre: "Mantequilla", categoria: "lacteos", unidad: "Libra", precio: 55, emoji: "🧈" },
  { id: "pan-molde", nombre: "Pan de molde", categoria: "panaderia", unidad: "Bolsa", precio: 52, emoji: "🍞" },
  { id: "baguette", nombre: "Baguette", categoria: "panaderia", unidad: "Unidad", precio: 25, emoji: "🥖" },
  { id: "croissant", nombre: "Croissant", categoria: "panaderia", unidad: "Unidad", precio: 18, emoji: "🥐" },
  { id: "pechuga", nombre: "Pechuga de pollo", categoria: "carnes", unidad: "Libra", precio: 65, emoji: "🍗" },
  { id: "carne-molida", nombre: "Carne molida", categoria: "carnes", unidad: "Libra", precio: 85, emoji: "🥩" },
  { id: "tilapia", nombre: "Tilapia", categoria: "carnes", unidad: "Libra", precio: 75, emoji: "🐟" },
  { id: "arroz", nombre: "Arroz", categoria: "despensa", unidad: "Bolsa de 5 lb", precio: 85, emoji: "🍚" },
  { id: "frijoles", nombre: "Frijoles rojos", categoria: "despensa", unidad: "Bolsa de 2 lb", precio: 48, emoji: "🫘" },
  { id: "aceite", nombre: "Aceite vegetal", categoria: "despensa", unidad: "1 litro", precio: 75, emoji: "🫒" },
  { id: "cafe", nombre: "Café molido", categoria: "despensa", unidad: "400 g", precio: 95, emoji: "☕" },
  { id: "spaghetti", nombre: "Spaghetti", categoria: "despensa", unidad: "Paquete de 400 g", precio: 22, emoji: "🍝" },
  { id: "harina-maiz", nombre: "Harina de maíz", categoria: "despensa", unidad: "Bolsa de 4 lb", precio: 40, emoji: "🌽" },
  { id: "agua", nombre: "Agua purificada", categoria: "bebidas", unidad: "Galón", precio: 30, emoji: "💧" },
  { id: "jugo-naranja", nombre: "Jugo de naranja", categoria: "bebidas", unidad: "1 litro", precio: 45, emoji: "🧃" },
  { id: "refresco", nombre: "Refresco de cola", categoria: "bebidas", unidad: "2 litros", precio: 42, emoji: "🥤" },
  { id: "papel-higienico", nombre: "Papel higiénico", categoria: "limpieza", unidad: "4 rollos", precio: 48, emoji: "🧻" },
  { id: "detergente", nombre: "Detergente en polvo", categoria: "limpieza", unidad: "1 kg", precio: 70, emoji: "🧺" },
  { id: "jabon", nombre: "Jabón de baño", categoria: "limpieza", unidad: "3 unidades", precio: 45, emoji: "🧼" },
  { id: "esponja", nombre: "Esponja para trastes", categoria: "limpieza", unidad: "Paquete de 3", precio: 35, emoji: "🧽" },
];

const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));

export function buscarProducto(id: string) {
  return productosPorId.get(id);
}

const formatoMoneda = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
});

export function formatearPrecio(valor: number) {
  return formatoMoneda.format(valor);
}
