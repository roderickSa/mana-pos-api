// Carga de estrés para la iteración 6: ~1000 productos realistas de
// minimarket peruano, ~25 clientes y ~100 ventas de prueba (con descuentos,
// pesables y fiado) para revisar rendimiento y paginaciones.
//
// Uso: con la API corriendo en :3210 →
//   npx tsx scripts/seed-carga-1000.ts
// PIN de encargado/dueño: variable MANA_SEED_PIN (default 2580).
//
// Es re-ejecutable: los nombres duplicados se omiten (DUPLICATE_NAME) y las
// categorías existentes se reutilizan. Las ventas SÍ se generan de nuevo en
// cada corrida (abre y cierra su propia sesión de caja).

import { randomUUID } from 'node:crypto';

const API = process.env.MANA_API ?? 'http://localhost:3210';
const PIN = process.env.MANA_SEED_PIN ?? '2580';
const VENTAS = Number(process.env.MANA_SEED_VENTAS ?? '100');

let TOKEN = '';

// PRNG determinista (mulberry32): misma carga en cada corrida.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260806);
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
const randInt = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));

// Precio en céntimos redondeado a la diez (los precios de venta van en pasos
// de S/0.10; los costos quedan exactos).
const dime = (cents: number): number => Math.max(10, Math.round(cents / 10) * 10);

async function api(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(TOKEN === '' ? {} : { authorization: `Bearer ${TOKEN}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function json<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${context}: HTTP ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Catálogo generado: familias × marcas × presentaciones ≈ 1000 nombres únicos.
// ---------------------------------------------------------------------------

interface ProductSeed {
  name: string;
  category: string; // slug
  saleType: 'unit' | 'weight';
  priceCents: number; // por unidad o por kg, múltiplo de 10
  supplier?: string;
  barcode: boolean;
  quickAccess?: boolean;
  shortCode?: string;
}

interface Familia {
  base: string;
  variantes: readonly string[];
  presentaciones: readonly (readonly [string, number])[]; // sufijo, precio base céntimos
  supplier?: string;
}

function expandir(
  categoria: string,
  familias: readonly Familia[],
  opts: { barcode?: boolean } = {},
): ProductSeed[] {
  const seeds: ProductSeed[] = [];
  for (const familia of familias) {
    for (const variante of familia.variantes) {
      for (const [sufijo, base] of familia.presentaciones) {
        const nombre = [familia.base, variante, sufijo].filter((p) => p !== '').join(' ');
        // ±8% de variación para que los precios no se vean clonados.
        const precio = dime(base * (0.92 + rand() * 0.16));
        seeds.push({
          name: nombre,
          category: categoria,
          saleType: 'unit',
          priceCents: precio,
          barcode: opts.barcode ?? true,
          ...(familia.supplier === undefined ? {} : { supplier: familia.supplier }),
        });
      }
    }
  }
  return seeds;
}

const bebidas = expandir('bebidas', [
  { base: 'Inca Kola', variantes: ['', 'Zero'], presentaciones: [['500 ml', 350], ['1 L', 550], ['1.5 L', 750], ['2.25 L', 1000], ['3 L', 1200]], supplier: 'Arca Continental Lindley' },
  { base: 'Coca-Cola', variantes: ['', 'Sin Azúcar'], presentaciones: [['500 ml', 350], ['1 L', 580], ['1.5 L', 790], ['2.25 L', 1050], ['3 L', 1250]], supplier: 'Arca Continental Lindley' },
  { base: 'Sprite', variantes: [''], presentaciones: [['500 ml', 300], ['1.5 L', 700], ['3 L', 1100]], supplier: 'Arca Continental Lindley' },
  { base: 'Fanta', variantes: ['Naranja', 'Kola Inglesa'], presentaciones: [['500 ml', 300], ['1.5 L', 700]], supplier: 'Arca Continental Lindley' },
  { base: 'Pepsi', variantes: ['', 'Black'], presentaciones: [['500 ml', 300], ['750 ml', 350], ['1.5 L', 650]], supplier: 'CBC Peruana' },
  { base: 'Kola Real', variantes: ['Amarilla', 'Negra', 'Piña'], presentaciones: [['600 ml', 200], ['1.7 L', 500], ['3.3 L', 850]], supplier: 'Industrias AJE' },
  { base: 'Guaraná Backus', variantes: [''], presentaciones: [['500 ml', 300], ['1.5 L', 650]], supplier: 'Backus' },
  { base: 'Cifrut', variantes: ['Citrus Punch', 'Fruit Punch', 'Granadilla'], presentaciones: [['500 ml', 200], ['1.5 L', 450], ['3 L', 700]], supplier: 'Industrias AJE' },
  { base: 'Agua San Luis', variantes: ['sin gas', 'con gas'], presentaciones: [['625 ml', 150], ['1 L', 250], ['2.5 L', 400], ['7 L', 900]], supplier: 'Arca Continental Lindley' },
  { base: 'Agua Cielo', variantes: ['sin gas', 'con gas', 'Alcalina'], presentaciones: [['625 ml', 150], ['2.5 L', 380]], supplier: 'Industrias AJE' },
  { base: 'Agua San Mateo', variantes: ['sin gas', 'con gas'], presentaciones: [['600 ml', 250], ['2.5 L', 550]], supplier: 'Backus' },
  { base: 'Sporade', variantes: ['Tropical', 'Blueberry', 'Mandarina'], presentaciones: [['500 ml', 250], ['1 L', 450]], supplier: 'Industrias AJE' },
  { base: 'Powerade', variantes: ['Mora', 'Frutas Tropicales'], presentaciones: [['500 ml', 350]], supplier: 'Arca Continental Lindley' },
  { base: 'Volt', variantes: ['Clásica', 'Ponche de Frutas', 'Maca'], presentaciones: [['300 ml', 250], ['473 ml', 350]], supplier: 'Industrias AJE' },
  { base: 'Red Bull', variantes: [''], presentaciones: [['250 ml', 750]], supplier: 'Distribuidora' },
  { base: 'Frugos del Valle', variantes: ['Durazno', 'Mango', 'Naranja'], presentaciones: [['235 ml', 150], ['1 L', 550]], supplier: 'Arca Continental Lindley' },
  { base: 'Pulp', variantes: ['Durazno', 'Mango', 'Manzana'], presentaciones: [['145 ml', 100], ['315 ml', 200], ['1 L', 450]], supplier: 'Industrias AJE' },
  { base: 'Chicha Morada Gloria', variantes: [''], presentaciones: [['1 L', 480]], supplier: 'Gloria' },
  { base: 'Té Lipton', variantes: ['Limón', 'Durazno'], presentaciones: [['450 ml', 300]], supplier: 'Distribuidora' },
  { base: 'Free Tea', variantes: ['Limón', 'Durazno'], presentaciones: [['450 ml', 280]], supplier: 'Industrias AJE' },
  { base: 'Gatorade', variantes: ['Tropical', 'Uva', 'Cool Blue'], presentaciones: [['500 ml', 400], ['750 ml', 550]], supplier: 'CBC Peruana' },
  { base: 'Aquarius', variantes: ['Pera', 'Manzana'], presentaciones: [['500 ml', 250], ['1.5 L', 550]], supplier: 'Arca Continental Lindley' },
  { base: 'Bio Aloe', variantes: ['Uva', 'Granada'], presentaciones: [['500 ml', 350]], supplier: 'Distribuidora' },
  { base: 'Triple Kola', variantes: [''], presentaciones: [['500 ml', 250], ['3 L', 750]], supplier: 'CBC Peruana' },
  { base: 'Concordia', variantes: ['Piña', 'Naranja'], presentaciones: [['500 ml', 250], ['3 L', 800]], supplier: 'CBC Peruana' },
  { base: 'Oro', variantes: [''], presentaciones: [['500 ml', 200], ['3 L', 650]], supplier: 'Industrias AJE' },
  { base: 'Evervess', variantes: [''], presentaciones: [['500 ml', 300], ['1.5 L', 550]], supplier: 'CBC Peruana' },
  { base: 'Schweppes Ginger Ale', variantes: [''], presentaciones: [['500 ml', 350]], supplier: 'Arca Continental Lindley' },
  { base: 'Néctar Watts', variantes: ['Durazno', 'Mango', 'Piña'], presentaciones: [['1 L', 500]], supplier: 'Distribuidora' },
  { base: 'Néctar Laive', variantes: ['Durazno', 'Naranja'], presentaciones: [['1 L', 480]], supplier: 'Laive' },
  { base: 'Soy Vida', variantes: ['Vainilla', 'Chocolate'], presentaciones: [['1 L', 550]], supplier: 'Laive' },
  { base: 'Yogurt Bebible Gloria Batti', variantes: ['Fresa', 'Vainilla'], presentaciones: [['110 ml', 120]], supplier: 'Gloria' },
]);

const cervezas = expandir('licores', [
  { base: 'Cerveza Pilsen Callao', variantes: [''], presentaciones: [['355 ml', 450], ['630 ml', 750], ['1 L', 1100]], supplier: 'Backus' },
  { base: 'Cerveza Cristal', variantes: [''], presentaciones: [['355 ml', 450], ['650 ml', 750], ['1 L', 1050]], supplier: 'Backus' },
  { base: 'Cerveza Cusqueña', variantes: ['Dorada', 'Negra', 'Trigo'], presentaciones: [['330 ml', 550], ['620 ml', 900]], supplier: 'Backus' },
  { base: 'Cerveza Pilsen Trujillo', variantes: [''], presentaciones: [['630 ml', 650]], supplier: 'Backus' },
  { base: 'Cerveza Corona', variantes: [''], presentaciones: [['355 ml', 700]], supplier: 'Distribuidora' },
  { base: 'Ron Cartavio', variantes: ['Superior', 'Black', 'Solera'], presentaciones: [['750 ml', 2500]], supplier: 'Cartavio' },
  { base: 'Ron Pomalca', variantes: ['Dorado', 'Blanco'], presentaciones: [['750 ml', 1600]], supplier: 'Distribuidora' },
  { base: 'Pisco Portón', variantes: ['Quebranta', 'Acholado'], presentaciones: [['750 ml', 5500]], supplier: 'Distribuidora' },
  { base: 'Pisco Queirolo', variantes: ['Quebranta', 'Acholado', 'Italia'], presentaciones: [['750 ml', 3200]], supplier: 'Santiago Queirolo' },
  { base: 'Vino Queirolo', variantes: ['Borgoña', 'Rosé', 'Magdalena'], presentaciones: [['750 ml', 2200]], supplier: 'Santiago Queirolo' },
  { base: 'Vino Tabernero', variantes: ['Borgoña', 'Gran Tinto'], presentaciones: [['750 ml', 2000]], supplier: 'Tabernero' },
  { base: 'Vodka Russkaya', variantes: [''], presentaciones: [['750 ml', 2300]], supplier: 'Distribuidora' },
  { base: 'Anís Nájar', variantes: [''], presentaciones: [['750 ml', 2800]], supplier: 'Distribuidora' },
  { base: 'Maltin Power', variantes: [''], presentaciones: [['330 ml', 200]], supplier: 'Backus' },
  { base: 'Cerveza Arequipeña', variantes: [''], presentaciones: [['620 ml', 700]], supplier: 'Backus' },
  { base: 'Cerveza San Juan', variantes: [''], presentaciones: [['620 ml', 650]], supplier: 'Backus' },
  { base: 'Cerveza Tres Cruces', variantes: ['Lager', 'Light'], presentaciones: [['355 ml', 400], ['630 ml', 650]], supplier: 'Aje' },
  { base: 'Cerveza Heineken', variantes: [''], presentaciones: [['330 ml', 650]], supplier: 'Distribuidora' },
  { base: 'Cerveza Stella Artois', variantes: [''], presentaciones: [['330 ml', 700]], supplier: 'Backus' },
  { base: 'Cerveza Budweiser', variantes: [''], presentaciones: [['355 ml', 500]], supplier: 'Backus' },
  { base: 'Whisky Johnnie Walker', variantes: ['Red Label'], presentaciones: [['750 ml', 6500]], supplier: 'Distribuidora' },
  { base: 'Whisky Old Times', variantes: ['Red', 'Black'], presentaciones: [['750 ml', 2900]], supplier: 'Distribuidora' },
  { base: 'Sangría Tabernero', variantes: [''], presentaciones: [['1 L', 1500]], supplier: 'Tabernero' },
  { base: 'Espumante Tabernero', variantes: ['Rosé'], presentaciones: [['750 ml', 2500]], supplier: 'Tabernero' },
  { base: 'RTD Piscano', variantes: ['Chilcano Ginger', 'Chilcano Maracuyá'], presentaciones: [['355 ml', 700]], supplier: 'Distribuidora' },
  { base: 'Smirnoff Ice', variantes: [''], presentaciones: [['355 ml', 650]], supplier: 'Distribuidora' },
]);

const abarrotes = expandir('abarrotes', [
  { base: 'Arroz Costeño', variantes: ['Extra', 'Superior', 'Graneadito'], presentaciones: [['750 g', 420], ['5 kg', 2650]], supplier: 'Costeño Alimentos' },
  { base: 'Arroz Paisana', variantes: ['Superior', 'Extra'], presentaciones: [['750 g', 450], ['5 kg', 2800]], supplier: 'Costeño Alimentos' },
  { base: 'Arroz Valle Norte', variantes: [''], presentaciones: [['750 g', 480], ['5 kg', 2900]], supplier: 'Distribuidora' },
  { base: 'Azúcar Cartavio', variantes: ['Rubia', 'Blanca'], presentaciones: [['1 kg', 480], ['2 kg', 950], ['5 kg', 2300]], supplier: 'Cartavio' },
  { base: 'Azúcar Casa Grande', variantes: ['Rubia'], presentaciones: [['1 kg', 470], ['5 kg', 2250]], supplier: 'Distribuidora' },
  { base: 'Aceite Primor', variantes: ['Clásico', 'Premium'], presentaciones: [['900 ml', 900], ['1 L', 980], ['1.8 L', 1750]], supplier: 'Alicorp' },
  { base: 'Aceite Cocinero', variantes: [''], presentaciones: [['900 ml', 850], ['1 L', 920], ['1.8 L', 1650]], supplier: 'Alicorp' },
  { base: 'Aceite Cil', variantes: [''], presentaciones: [['900 ml', 800], ['1 L', 850]], supplier: 'Alicorp' },
  { base: 'Aceite Sao', variantes: [''], presentaciones: [['900 ml', 780]], supplier: 'Distribuidora' },
  { base: 'Fideo Don Vittorio', variantes: ['Spaghetti', 'Tallarín', 'Tornillo', 'Codo Rayado', 'Canuto'], presentaciones: [['400 g', 360], ['500 g', 390], ['1 kg', 750]], supplier: 'Alicorp' },
  { base: 'Fideo Nicolini', variantes: ['Spaghetti', 'Tallarín', 'Cabello de Ángel'], presentaciones: [['500 g', 350], ['1 kg', 680]], supplier: 'Alicorp' },
  { base: 'Fideo Molitalia', variantes: ['Spaghetti', 'Tornillo', 'Caracol'], presentaciones: [['500 g', 340]], supplier: 'Molitalia' },
  { base: 'Fideo Lavaggi', variantes: ['Spaghetti', 'Tallarín'], presentaciones: [['500 g', 300]], supplier: 'Alicorp' },
  { base: 'Atún Florida', variantes: ['Filete', 'Trozos'], presentaciones: [['170 g', 650], ['pack x3', 1800]], supplier: 'Camposol' },
  { base: 'Atún A-1', variantes: ['Filete', 'Trozos', 'Grated'], presentaciones: [['170 g', 480]], supplier: 'Distribuidora' },
  { base: 'Atún Campomar', variantes: ['Trozos', 'Grated'], presentaciones: [['170 g', 390]], supplier: 'Distribuidora' },
  { base: 'Atún Primor', variantes: ['Filete'], presentaciones: [['170 g', 620]], supplier: 'Alicorp' },
  { base: 'Conserva Fanny', variantes: ['Caballa', 'Jurel', 'Sardina'], presentaciones: [['425 g', 750]], supplier: 'Distribuidora' },
  { base: 'Leche Gloria', variantes: ['Evaporada Azul', 'Light', 'Deslactosada', 'Niños'], presentaciones: [['170 g', 250], ['400 g', 460], ['pack x6', 2650]], supplier: 'Gloria' },
  { base: 'Leche Pura Vida', variantes: [''], presentaciones: [['400 g', 380]], supplier: 'Gloria' },
  { base: 'Leche Ideal', variantes: ['Cremosita', 'Amanecer'], presentaciones: [['400 g', 400]], supplier: 'Nestlé' },
  { base: 'Leche Laive', variantes: ['Evaporada', 'Light'], presentaciones: [['400 g', 450]], supplier: 'Laive' },
  { base: 'Leche Condensada Nestlé', variantes: [''], presentaciones: [['397 g', 890]], supplier: 'Nestlé' },
  { base: 'Avena 3 Ositos', variantes: ['Tradicional', 'Quinua', 'Maca'], presentaciones: [['170 g', 200], ['380 g', 400], ['900 g', 850]], supplier: 'Molitalia' },
  { base: 'Avena Quaker', variantes: ['Tradicional', 'Manzana Canela'], presentaciones: [['300 g', 450], ['600 g', 800]], supplier: 'PepsiCo' },
  { base: 'Café Altomayo', variantes: ['Molido', 'Instantáneo'], presentaciones: [['250 g', 1590], ['45 g', 550]], supplier: 'Altomayo' },
  { base: 'Café Kirma', variantes: [''], presentaciones: [['190 g', 1750], ['sobre 9 g', 100]], supplier: 'Nestlé' },
  { base: 'Nescafé Tradición', variantes: [''], presentaciones: [['200 g', 1990], ['sobre 9 g', 100]], supplier: 'Nestlé' },
  { base: 'Cafetal Selecto', variantes: [''], presentaciones: [['250 g', 1200]], supplier: 'Distribuidora' },
  { base: 'Milo', variantes: [''], presentaciones: [['400 g', 1690]], supplier: 'Nestlé' },
  { base: 'Nesquik', variantes: [''], presentaciones: [['400 g', 1450]], supplier: 'Nestlé' },
  { base: 'Ecco', variantes: [''], presentaciones: [['190 g', 990]], supplier: 'Nestlé' },
  { base: 'Sal Emsal', variantes: ['de Mesa', 'de Cocina'], presentaciones: [['1 kg', 180]], supplier: 'Emsal' },
  { base: 'Sillao Kikko', variantes: [''], presentaciones: [['150 ml', 300], ['500 ml', 650]], supplier: 'Kikko' },
  { base: 'Vinagre Venturo', variantes: ['Blanco', 'Tinto'], presentaciones: [['600 ml', 320]], supplier: 'Venturo' },
  { base: 'Ají-no-moto', variantes: [''], presentaciones: [['sobre 100 g', 350], ['sobre 250 g', 750]], supplier: 'Ajinomoto' },
  { base: 'Mayonesa Alacena', variantes: [''], presentaciones: [['95 g', 420], ['475 g', 1350]], supplier: 'Alicorp' },
  { base: 'Ketchup Alacena', variantes: [''], presentaciones: [['90 g', 320], ['380 g', 950]], supplier: 'Alicorp' },
  { base: 'Mostaza Alacena', variantes: [''], presentaciones: [['85 g', 280]], supplier: 'Alicorp' },
  { base: 'Crema Alacena', variantes: ['de Rocoto', 'Huancaína', 'Tarí'], presentaciones: [['85 g', 350], ['400 g', 1100]], supplier: 'Alicorp' },
  { base: 'Mermelada Fanny', variantes: ['Fresa', 'Piña'], presentaciones: [['350 g', 590]], supplier: 'Distribuidora' },
  { base: 'Mermelada Gloria', variantes: ['Fresa'], presentaciones: [['320 g', 650]], supplier: 'Gloria' },
  { base: 'Harina Blanca Flor', variantes: ['Preparada', 'Sin Preparar'], presentaciones: [['1 kg', 680]], supplier: 'Alicorp' },
  { base: 'Harina Favorita', variantes: [''], presentaciones: [['1 kg', 620]], supplier: 'Alicorp' },
  { base: 'Panetón Todinno', variantes: [''], presentaciones: [['900 g', 2800]], supplier: 'Distribuidora' },
  { base: 'Panetón Gloria', variantes: [''], presentaciones: [['900 g', 2200]], supplier: 'Gloria' },
  { base: 'Quinua Perlada', variantes: [''], presentaciones: [['500 g', 890]], supplier: 'Distribuidora' },
  { base: 'Lentejas', variantes: [''], presentaciones: [['500 g', 550]], supplier: 'Distribuidora' },
  { base: 'Frijol Canario', variantes: [''], presentaciones: [['500 g', 790]], supplier: 'Distribuidora' },
  { base: 'Garbanzos', variantes: [''], presentaciones: [['500 g', 650]], supplier: 'Distribuidora' },
  { base: 'Pallares', variantes: [''], presentaciones: [['500 g', 700]], supplier: 'Distribuidora' },
  { base: 'Arveja Partida', variantes: [''], presentaciones: [['500 g', 480]], supplier: 'Distribuidora' },
  { base: 'Tuco Sibarita', variantes: ['Panca', 'Amarillo'], presentaciones: [['sobre', 100]], supplier: 'Sibarita' },
  { base: 'Sazonador Batom', variantes: [''], presentaciones: [['sobre', 80]], supplier: 'Distribuidora' },
  { base: 'Caldo Maggi', variantes: ['Gallina', 'Carne'], presentaciones: [['x8 cubos', 350]], supplier: 'Nestlé' },
  { base: 'Sopa Ajinomen', variantes: ['Gallina', 'Carne', 'Oriental'], presentaciones: [['sobre', 180]], supplier: 'Ajinomoto' },
  { base: 'Mazamorra Negrita', variantes: ['Morada', 'de Durazno'], presentaciones: [['160 g', 320]], supplier: 'Alicorp' },
  { base: 'Gelatina Royal', variantes: ['Fresa', 'Naranja', 'Piña'], presentaciones: [['160 g', 350]], supplier: 'Mondelez' },
  { base: 'Gelatina Universal', variantes: ['Fresa', 'Piña'], presentaciones: [['150 g', 280]], supplier: 'Universal' },
  { base: 'Flan Royal', variantes: ['Vainilla'], presentaciones: [['110 g', 380]], supplier: 'Mondelez' },
  { base: 'Filtrante Herbi', variantes: ['Manzanilla', 'Anís', 'Hierba Luisa', 'Boldo'], presentaciones: [['x25', 250]], supplier: 'Herbi' },
  { base: 'Filtrante McColins', variantes: ['Manzanilla', 'Anís', 'Té Puro'], presentaciones: [['x25', 280]], supplier: 'Distribuidora' },
  { base: 'Huevos Pardos', variantes: [''], presentaciones: [['x15', 950], ['x30', 1850]], supplier: 'La Calera' },
  { base: 'Durazno en Almíbar Aconcagua', variantes: [''], presentaciones: [['820 g', 950]], supplier: 'Distribuidora' },
  { base: 'Piña en Rodajas Monteverde', variantes: [''], presentaciones: [['565 g', 850]], supplier: 'Distribuidora' },
  { base: 'Choclo Desgranado en Lata', variantes: [''], presentaciones: [['425 g', 550]], supplier: 'Distribuidora' },
  { base: 'Alverjita en Conserva', variantes: [''], presentaciones: [['425 g', 480]], supplier: 'Distribuidora' },
  { base: 'Champiñones Enteros', variantes: [''], presentaciones: [['400 g', 750]], supplier: 'Distribuidora' },
  { base: 'Aceitunas de Botija', variantes: [''], presentaciones: [['frasco 250 g', 850]], supplier: 'Distribuidora' },
  { base: 'Pasta de Tomate Pomarola', variantes: [''], presentaciones: [['160 g', 280], ['320 g', 500]], supplier: 'Molitalia' },
  { base: 'Salsa Roja Don Vittorio', variantes: [''], presentaciones: [['400 g', 550]], supplier: 'Alicorp' },
  { base: 'Cereal Ángel', variantes: ['Copix', 'Mel', 'Zuck'], presentaciones: [['130 g', 350], ['bolsa 500 g', 1100]], supplier: 'Global Alimentos' },
  { base: 'Corn Flakes Costa', variantes: [''], presentaciones: [['500 g', 1050]], supplier: 'Costa' },
  { base: 'Chocolate para Taza Sol del Cusco', variantes: [''], presentaciones: [['90 g', 350]], supplier: 'Distribuidora' },
  { base: 'Cocoa Winter', variantes: [''], presentaciones: [['160 g', 450]], supplier: 'Winter' },
  { base: 'Manjar Blanco Nestlé', variantes: [''], presentaciones: [['200 g', 500]], supplier: 'Nestlé' },
  { base: 'Miel de Abeja', variantes: [''], presentaciones: [['frasco 300 g', 1200]], supplier: 'Distribuidora' },
  { base: 'Algarrobina', variantes: [''], presentaciones: [['frasco 300 g', 1100]], supplier: 'Distribuidora' },
  { base: 'Panela Orgánica', variantes: [''], presentaciones: [['500 g', 750]], supplier: 'Distribuidora' },
  { base: 'Maicena Universal', variantes: [''], presentaciones: [['180 g', 300]], supplier: 'Universal' },
  { base: 'Polvo de Hornear Universal', variantes: [''], presentaciones: [['sobre', 100]], supplier: 'Universal' },
  { base: 'Vainilla Universal', variantes: [''], presentaciones: [['90 ml', 250]], supplier: 'Universal' },
  { base: 'Levadura Fleischmann', variantes: [''], presentaciones: [['sobre', 150]], supplier: 'Distribuidora' },
  { base: 'Pan Rallado', variantes: [''], presentaciones: [['200 g', 300]], supplier: 'Distribuidora' },
  { base: 'Comino Molido Sibarita', variantes: [''], presentaciones: [['sobre', 100]], supplier: 'Sibarita' },
  { base: 'Pimienta Molida Sibarita', variantes: [''], presentaciones: [['sobre', 120]], supplier: 'Sibarita' },
  { base: 'Orégano Seco', variantes: [''], presentaciones: [['sobre', 100]], supplier: 'Distribuidora' },
  { base: 'Laurel Seco', variantes: [''], presentaciones: [['sobre', 100]], supplier: 'Distribuidora' },
  { base: 'Canela Entera', variantes: [''], presentaciones: [['sobre', 150]], supplier: 'Distribuidora' },
  { base: 'Clavo de Olor', variantes: [''], presentaciones: [['sobre', 100]], supplier: 'Distribuidora' },
  { base: 'Anís en Grano', variantes: [''], presentaciones: [['sobre', 120]], supplier: 'Distribuidora' },
]);

const golosinas = expandir('golosinas', [
  { base: 'Galleta Field', variantes: ['Soda', 'Vainilla', 'Coronita', 'Charada'], presentaciones: [['taco', 150], ['pack x6', 450]], supplier: 'Mondelez' },
  { base: 'Galleta San Jorge', variantes: ['Soda', 'Vainilla'], presentaciones: [['pack x6', 400]], supplier: 'San Jorge' },
  { base: 'Galleta Victoria', variantes: ['Soda', 'Animalitos'], presentaciones: [['taco', 120]], supplier: 'Distribuidora' },
  { base: 'Galleta Casino', variantes: ['Fresa', 'Chocolate', 'Menta', 'Alfajor'], presentaciones: [['unidad', 100], ['pack x6', 550]], supplier: 'Nestlé' },
  { base: 'Galleta Morochas', variantes: ['Clásica', 'Bañada'], presentaciones: [['unidad', 120], ['pack x6', 650]], supplier: 'Nestlé' },
  { base: 'Galleta Picaras', variantes: ['Chocolate', 'Fresa'], presentaciones: [['unidad', 120], ['pack x6', 650]], supplier: 'Distribuidora' },
  { base: 'Galleta Cua Cua', variantes: [''], presentaciones: [['unidad', 100], ['pack x5', 480]], supplier: 'Mondelez' },
  { base: 'Galleta Doña Pepa', variantes: [''], presentaciones: [['unidad', 120]], supplier: 'Alicorp' },
  { base: 'Galleta Chin Chin', variantes: [''], presentaciones: [['unidad', 100]], supplier: 'Alicorp' },
  { base: 'Galleta Oreo', variantes: ['Clásica', 'Chocolate'], presentaciones: [['unidad', 150], ['pack x6', 800]], supplier: 'Mondelez' },
  { base: 'Galleta Ritz', variantes: [''], presentaciones: [['taco', 350]], supplier: 'Mondelez' },
  { base: 'Galleta Chomp', variantes: ['Chocolate', 'Vainilla'], presentaciones: [['unidad', 100]], supplier: 'Costa' },
  { base: 'Wafer Nik', variantes: ['Chocolate', 'Fresa', 'Limón'], presentaciones: [['unidad', 100]], supplier: 'Costa' },
  { base: 'Chocolate Sublime', variantes: ['Clásico', 'Blanco', 'Extremo'], presentaciones: [['unidad', 200], ['pack x4', 750]], supplier: 'Nestlé' },
  { base: 'Chocolate Triángulo', variantes: [''], presentaciones: [['unidad', 200]], supplier: 'Nestlé' },
  { base: 'Chocolate Princesa', variantes: [''], presentaciones: [['unidad', 200]], supplier: 'Nestlé' },
  { base: 'Chocolate Vizzio', variantes: [''], presentaciones: [['72 g', 650]], supplier: 'Costa' },
  { base: 'Chocolate Cañonazo', variantes: [''], presentaciones: [['unidad', 150]], supplier: 'Winter' },
  { base: 'Chocman', variantes: [''], presentaciones: [['unidad', 120]], supplier: 'Winter' },
  { base: 'Caramelos Halls', variantes: ['Mentol', 'Miel', 'Cereza'], presentaciones: [['unidad', 50], ['bolsa x25', 900]], supplier: 'Mondelez' },
  { base: 'Caramelos Mentitas', variantes: [''], presentaciones: [['bolsa', 250]], supplier: 'Distribuidora' },
  { base: 'Chicle Trident', variantes: ['Menta', 'Sandía', 'Tutti Frutti'], presentaciones: [['unidad', 100]], supplier: 'Mondelez' },
  { base: 'Chupetín Globo Pop', variantes: [''], presentaciones: [['unidad', 80]], supplier: 'Distribuidora' },
  { base: 'Marshmallows Guandy', variantes: [''], presentaciones: [['bolsa', 350]], supplier: 'Distribuidora' },
  { base: 'Papas Lays', variantes: ['Clásicas', 'Onduladas', 'Picantes'], presentaciones: [['42 g', 200], ['95 g', 400], ['200 g', 750]], supplier: 'PepsiCo' },
  { base: 'Chizitos', variantes: [''], presentaciones: [['26 g', 100], ['62 g', 200]], supplier: 'PepsiCo' },
  { base: 'Cuates', variantes: ['Picantes', 'Naturales'], presentaciones: [['40 g', 150]], supplier: 'PepsiCo' },
  { base: 'Piqueo Snax', variantes: [''], presentaciones: [['40 g', 200], ['200 g', 850]], supplier: 'PepsiCo' },
  { base: 'Doritos', variantes: ['Queso', 'Flamin Hot'], presentaciones: [['42 g', 200], ['200 g', 800]], supplier: 'PepsiCo' },
  { base: 'Cheetos', variantes: ['Horneados'], presentaciones: [['29 g', 100]], supplier: 'PepsiCo' },
  { base: 'Chifles Inka Chips', variantes: ['Salados', 'Dulces'], presentaciones: [['70 g', 350]], supplier: 'Distribuidora' },
  { base: 'Maní Karinto', variantes: ['Salado', 'Confitado', 'con Pasas'], presentaciones: [['38 g', 150], ['100 g', 350]], supplier: 'Karinto' },
  { base: 'Canchita Serrana', variantes: [''], presentaciones: [['100 g', 250]], supplier: 'Distribuidora' },
  { base: 'Habas Saladas', variantes: [''], presentaciones: [['100 g', 250]], supplier: 'Distribuidora' },
  { base: 'Galleta Rellenita', variantes: ['Chocolate', 'Fresa', 'Coco'], presentaciones: [['unidad', 100], ['pack x6', 550]], supplier: 'Costa' },
  { base: 'Galleta Glacitas', variantes: ['Chocolate', 'Toffee'], presentaciones: [['unidad', 120], ['pack x6', 650]], supplier: 'Costa' },
  { base: 'Galleta Choko Soda', variantes: [''], presentaciones: [['unidad', 150]], supplier: 'Costa' },
  { base: 'Galleta Zoológico', variantes: [''], presentaciones: [['bolsa 200 g', 350]], supplier: 'Distribuidora' },
  { base: 'Galleta Margarita', variantes: [''], presentaciones: [['taco', 150]], supplier: 'Costa' },
  { base: 'Galleta Tentación', variantes: ['Chocolate', 'Naranja'], presentaciones: [['unidad', 100]], supplier: 'Nestlé' },
  { base: 'Galleta Sayón', variantes: ['Soda', 'Vainilla'], presentaciones: [['taco', 100]], supplier: 'Sayón' },
  { base: 'Frunas', variantes: ['Surtidas'], presentaciones: [['tira', 100], ['bolsa x30', 550]], supplier: 'Arcor' },
  { base: 'Gomitas Mogul', variantes: ['Frutales', 'Ácidas'], presentaciones: [['bolsa', 250]], supplier: 'Arcor' },
  { base: 'Gomas Ambrosoli', variantes: [''], presentaciones: [['bolsa', 250]], supplier: 'Ambrosoli' },
  { base: 'Caramelos Ambrosoli', variantes: ['Frutales', 'Miel'], presentaciones: [['bolsa x100', 800]], supplier: 'Ambrosoli' },
  { base: 'Toffees Winter', variantes: ['Leche', 'Café'], presentaciones: [['bolsa', 450]], supplier: 'Winter' },
  { base: 'Cereal Bar Ángel', variantes: [''], presentaciones: [['unidad', 100]], supplier: 'Global Alimentos' },
  { base: 'Obleas Sponch', variantes: [''], presentaciones: [['unidad', 150]], supplier: 'Distribuidora' },
  { base: 'Turrón de Doña Pepa', variantes: [''], presentaciones: [['caja 300 g', 900]], supplier: 'Distribuidora' },
  { base: 'King Kong San Roque', variantes: [''], presentaciones: [['450 g', 1400]], supplier: 'San Roque' },
], {});

const lacteos = expandir('lacteos-y-embutidos', [
  { base: 'Yogurt Gloria', variantes: ['Fresa', 'Vainilla', 'Durazno', 'Lúcuma'], presentaciones: [['185 ml', 200], ['500 ml', 450], ['1 L', 790]], supplier: 'Gloria' },
  { base: 'Yogurt Laive', variantes: ['Fresa', 'Vainilla'], presentaciones: [['946 ml', 850]], supplier: 'Laive' },
  { base: 'Yogurt Milkito', variantes: ['Fresa', 'Durazno'], presentaciones: [['1 L', 700]], supplier: 'Distribuidora' },
  { base: 'Queso Fresco Laive', variantes: [''], presentaciones: [['400 g', 1400]], supplier: 'Laive' },
  { base: 'Queso Edam Laive', variantes: [''], presentaciones: [['180 g tajadas', 950]], supplier: 'Laive' },
  { base: 'Queso Bonlé', variantes: ['Fresco', 'Edam'], presentaciones: [['200 g', 900]], supplier: 'Gloria' },
  { base: 'Mantequilla Laive', variantes: ['con Sal', 'sin Sal'], presentaciones: [['100 g', 550], ['200 g', 980]], supplier: 'Laive' },
  { base: 'Mantequilla Gloria', variantes: [''], presentaciones: [['200 g', 950]], supplier: 'Gloria' },
  { base: 'Margarina Manty', variantes: [''], presentaciones: [['90 g', 250], ['450 g', 900]], supplier: 'Alicorp' },
  { base: 'Margarina Sello de Oro', variantes: [''], presentaciones: [['90 g', 280]], supplier: 'Alicorp' },
  { base: 'Jamonada San Fernando', variantes: ['de Pollo', 'de Cerdo'], presentaciones: [['90 g', 300], ['pieza 250 g', 750]], supplier: 'San Fernando' },
  { base: 'Jamonada Otto Kunz', variantes: [''], presentaciones: [['180 g', 650]], supplier: 'Otto Kunz' },
  { base: 'Hot Dog San Fernando', variantes: ['de Pollo'], presentaciones: [['250 g', 500], ['500 g', 900]], supplier: 'San Fernando' },
  { base: 'Hot Dog Laive Suiza', variantes: [''], presentaciones: [['250 g', 550]], supplier: 'Laive' },
  { base: 'Chorizo Otto Kunz', variantes: ['Parrillero', 'Precocido'], presentaciones: [['250 g', 1100]], supplier: 'Otto Kunz' },
  { base: 'Salchicha Braedt', variantes: ['Huachana'], presentaciones: [['250 g', 950]], supplier: 'Braedt' },
  { base: 'Leche Fresca Gloria', variantes: ['Entera', 'Deslactosada'], presentaciones: [['946 ml', 650]], supplier: 'Gloria' },
  { base: 'Leche Fresca Laive', variantes: ['Entera', 'Light'], presentaciones: [['946 ml', 680]], supplier: 'Laive' },
  { base: 'Queso Parmesano Bonlé', variantes: ['Rallado'], presentaciones: [['40 g', 450]], supplier: 'Gloria' },
  { base: 'Queso Mozzarella Laive', variantes: [''], presentaciones: [['180 g rallado', 1050]], supplier: 'Laive' },
  { base: 'Queso Andino', variantes: ['Paria', 'Mantecoso'], presentaciones: [['pieza 300 g', 1300]], supplier: 'Distribuidora' },
  { base: 'Crema de Leche Gloria', variantes: [''], presentaciones: [['lata 300 g', 750]], supplier: 'Gloria' },
  { base: 'Paté San Fernando', variantes: ['de Pollo'], presentaciones: [['lata', 350]], supplier: 'San Fernando' },
  { base: 'Mortadela San Fernando', variantes: [''], presentaciones: [['90 g', 250]], supplier: 'San Fernando' },
  { base: 'Tocino Braedt', variantes: ['Ahumado'], presentaciones: [['200 g', 1400]], supplier: 'Braedt' },
  { base: 'Huevos de Codorniz', variantes: [''], presentaciones: [['x24', 700]], supplier: 'La Calera' },
]);

const limpieza = expandir('limpieza', [
  { base: 'Detergente Bolívar', variantes: ['Floral', 'Bebé', 'Blanco'], presentaciones: [['360 g', 590], ['780 g', 1150], ['2 kg', 2700]], supplier: 'Alicorp' },
  { base: 'Detergente Ace', variantes: ['Regular', 'Limón'], presentaciones: [['360 g', 550], ['780 g', 1050]], supplier: 'P&G' },
  { base: 'Detergente Ariel', variantes: ['Regular', 'con Downy'], presentaciones: [['360 g', 620], ['780 g', 1200]], supplier: 'P&G' },
  { base: 'Detergente Opal', variantes: ['Regular', 'Floral'], presentaciones: [['360 g', 520], ['780 g', 980]], supplier: 'Alicorp' },
  { base: 'Detergente Marsella', variantes: [''], presentaciones: [['360 g', 500], ['780 g', 950]], supplier: 'Alicorp' },
  { base: 'Jabón Bolívar', variantes: ['Barra', 'Bebé'], presentaciones: [['unidad', 350], ['pack x2', 650]], supplier: 'Alicorp' },
  { base: 'Jabón Marsella', variantes: ['Barra'], presentaciones: [['unidad', 290]], supplier: 'Alicorp' },
  { base: 'Lavavajilla Sapolio', variantes: ['Limón', 'Tutti Frutti'], presentaciones: [['180 g', 250], ['360 g', 450], ['900 g', 950]], supplier: 'Intradevco' },
  { base: 'Lavavajilla Ayudín', variantes: ['Limón'], presentaciones: [['330 g', 490], ['900 g', 1100]], supplier: 'P&G' },
  { base: 'Lejía Clorox', variantes: ['Tradicional', 'Ropa Color'], presentaciones: [['345 g', 200], ['680 g', 350], ['2 L', 800]], supplier: 'Clorox' },
  { base: 'Lejía Sapolio', variantes: [''], presentaciones: [['680 g', 300]], supplier: 'Intradevco' },
  { base: 'Poett', variantes: ['Lavanda', 'Bebé', 'Primavera'], presentaciones: [['325 ml', 420], ['900 ml', 850]], supplier: 'Clorox' },
  { base: 'Limpiatodo Sapolio', variantes: ['Lavanda', 'Limón', 'Floral'], presentaciones: [['900 ml', 650]], supplier: 'Intradevco' },
  { base: 'Pinesol', variantes: ['Original', 'Lavanda'], presentaciones: [['267 ml', 400], ['900 ml', 950]], supplier: 'Clorox' },
  { base: 'Quitamanchas Vanish', variantes: ['Blanco', 'Color'], presentaciones: [['450 ml', 1200]], supplier: 'Reckitt' },
  { base: 'Suavizante Downy', variantes: ['Floral'], presentaciones: [['800 ml', 1100]], supplier: 'P&G' },
  { base: 'Esponja Scotch Brite', variantes: [''], presentaciones: [['unidad', 250], ['pack x3', 600]], supplier: '3M' },
  { base: 'Paño Absorbente Virutex', variantes: [''], presentaciones: [['unidad', 300]], supplier: 'Distribuidora' },
  { base: 'Guantes Virutex', variantes: ['Talla M', 'Talla L'], presentaciones: [['par', 550]], supplier: 'Distribuidora' },
  { base: 'Bolsas de Basura', variantes: ['20 L', '50 L', '75 L'], presentaciones: [['x10', 450]], supplier: 'Distribuidora' },
  { base: 'Ambientador Sapolio', variantes: ['Lavanda', 'Manzana Canela'], presentaciones: [['spray 360 ml', 790]], supplier: 'Intradevco' },
  { base: 'Insecticida Sapolio', variantes: ['Mata Moscas', 'Mata Cucarachas'], presentaciones: [['360 ml', 990]], supplier: 'Intradevco' },
  { base: 'Cera Sapolio', variantes: ['Amarilla', 'Roja', 'Neutra'], presentaciones: [['300 ml', 550]], supplier: 'Intradevco' },
  { base: 'Fósforos Llama', variantes: [''], presentaciones: [['x50', 100], ['pack x10', 900]], supplier: 'Distribuidora' },
  { base: 'Velas Estrella', variantes: ['Blancas'], presentaciones: [['x8', 350]], supplier: 'Distribuidora' },
  { base: 'Escoba Clorinda', variantes: [''], presentaciones: [['unidad', 1200]], supplier: 'Distribuidora' },
  { base: 'Recogedor', variantes: [''], presentaciones: [['unidad', 600]], supplier: 'Distribuidora' },
  { base: 'Trapeador', variantes: ['de Algodón'], presentaciones: [['unidad', 900]], supplier: 'Distribuidora' },
  { base: 'Balde', variantes: ['10 L'], presentaciones: [['unidad', 800]], supplier: 'Distribuidora' },
  { base: 'Jaboncillo para Ropa Ñapancha', variantes: [''], presentaciones: [['unidad', 250]], supplier: 'Distribuidora' },
  { base: 'Detergente Líquido Bolívar', variantes: ['Floral'], presentaciones: [['940 ml', 1400], ['1.8 L', 2500]], supplier: 'Alicorp' },
  { base: 'Papel Aluminio', variantes: [''], presentaciones: [['rollo 25 cm', 450]], supplier: 'Distribuidora' },
  { base: 'Papel Film', variantes: [''], presentaciones: [['rollo', 500]], supplier: 'Distribuidora' },
  { base: 'Vasos Descartables', variantes: ['x25'], presentaciones: [['unidad', 250]], supplier: 'Distribuidora' },
  { base: 'Platos Descartables', variantes: ['x25'], presentaciones: [['unidad', 400]], supplier: 'Distribuidora' },
  { base: 'Tenedores Descartables', variantes: ['x25'], presentaciones: [['unidad', 300]], supplier: 'Distribuidora' },
  { base: 'Taper Reyplast', variantes: ['1 L', '2 L'], presentaciones: [['unidad', 550]], supplier: 'Distribuidora' },
]);

const cuidadoPersonal = expandir('cuidado-personal', [
  { base: 'Shampoo H&S', variantes: ['Limpieza Renovadora', 'Suave y Manejable'], presentaciones: [['sachet 10 ml', 100], ['180 ml', 1250], ['375 ml', 1990]], supplier: 'P&G' },
  { base: 'Shampoo Sedal', variantes: ['Ceramidas', 'Rizos', 'Negros Luminosos'], presentaciones: [['sachet 12 ml', 100], ['340 ml', 1450]], supplier: 'Unilever' },
  { base: 'Shampoo Pantene', variantes: ['Restauración', 'Liso Extremo'], presentaciones: [['sachet 10 ml', 120], ['400 ml', 1890]], supplier: 'P&G' },
  { base: 'Shampoo Savital', variantes: ['Sábila', 'Keratina'], presentaciones: [['sachet', 80], ['550 ml', 1350]], supplier: 'Quala' },
  { base: 'Acondicionador Sedal', variantes: ['Ceramidas'], presentaciones: [['340 ml', 1450]], supplier: 'Unilever' },
  { base: 'Jabón Camay', variantes: ['Clásico', 'Floral'], presentaciones: [['unidad', 250], ['pack x3', 650]], supplier: 'P&G' },
  { base: 'Jabón Neko', variantes: ['Extra Protección', 'Avena'], presentaciones: [['unidad', 390], ['pack x3', 1050]], supplier: 'Distribuidora' },
  { base: 'Jabón Dove', variantes: ['Original'], presentaciones: [['unidad', 550]], supplier: 'Unilever' },
  { base: 'Jabón Rexona', variantes: ['Antibacterial'], presentaciones: [['unidad', 300]], supplier: 'Unilever' },
  { base: 'Pasta Colgate', variantes: ['Triple Acción', 'Total 12', 'Anticaries'], presentaciones: [['75 ml', 550], ['150 ml', 950]], supplier: 'Colgate' },
  { base: 'Pasta Kolynos', variantes: ['Súper Blanco'], presentaciones: [['75 ml', 390]], supplier: 'Colgate' },
  { base: 'Pasta Dento', variantes: ['Anticaries'], presentaciones: [['75 ml', 350]], supplier: 'Intradevco' },
  { base: 'Cepillo Colgate', variantes: ['Medio', 'Suave'], presentaciones: [['unidad', 450]], supplier: 'Colgate' },
  { base: 'Enjuague Listerine', variantes: ['Cool Mint'], presentaciones: [['180 ml', 1100]], supplier: 'Distribuidora' },
  { base: 'Desodorante Rexona', variantes: ['Hombre', 'Mujer'], presentaciones: [['sachet', 150], ['roll-on 50 ml', 990]], supplier: 'Unilever' },
  { base: 'Desodorante Nivea', variantes: ['Hombre', 'Mujer'], presentaciones: [['roll-on 50 ml', 1050]], supplier: 'Distribuidora' },
  { base: 'Papel Higiénico Elite', variantes: ['Doble Hoja'], presentaciones: [['x2', 380], ['x4', 690], ['x12', 1900]], supplier: 'Softys' },
  { base: 'Papel Higiénico Suave', variantes: [''], presentaciones: [['x4', 650], ['x12', 1750]], supplier: 'Softys' },
  { base: 'Papel Higiénico Noble', variantes: [''], presentaciones: [['x2', 320]], supplier: 'Distribuidora' },
  { base: 'Papel Toalla Scott', variantes: [''], presentaciones: [['x1', 690]], supplier: 'Kimberly-Clark' },
  { base: 'Servilletas Elite', variantes: [''], presentaciones: [['x100', 290]], supplier: 'Softys' },
  { base: 'Toallas Nosotras', variantes: ['Normal', 'Nocturna', 'Invisible'], presentaciones: [['x10', 550]], supplier: 'Distribuidora' },
  { base: 'Pañales Huggies', variantes: ['Talla M', 'Talla G', 'Talla XG'], presentaciones: [['x8', 1290], ['x20', 2900]], supplier: 'Kimberly-Clark' },
  { base: 'Pañales BabySec', variantes: ['Talla M', 'Talla G'], presentaciones: [['x8', 990]], supplier: 'Softys' },
  { base: 'Toallitas Húmedas Huggies', variantes: [''], presentaciones: [['x48', 850]], supplier: 'Kimberly-Clark' },
  { base: 'Afeitadora Gillette', variantes: ['Prestobarba 3'], presentaciones: [['unidad', 450]], supplier: 'P&G' },
  { base: 'Curitas Band-Aid', variantes: [''], presentaciones: [['x10', 300]], supplier: 'Distribuidora' },
  { base: 'Algodón CKF', variantes: [''], presentaciones: [['50 g', 350]], supplier: 'Distribuidora' },
  { base: 'Alcohol Alkofarma', variantes: ['70°'], presentaciones: [['380 ml', 550]], supplier: 'Distribuidora' },
  { base: 'Gel Ego', variantes: ['Black', 'Extreme'], presentaciones: [['sachet', 100], ['pote 240 g', 950]], supplier: 'Quala' },
  { base: 'Crema Nivea', variantes: ['Lata Azul'], presentaciones: [['30 ml', 450], ['60 ml', 750]], supplier: 'Distribuidora' },
  { base: 'Crema Hinds', variantes: ['Rosada', 'Coco'], presentaciones: [['125 ml', 850]], supplier: 'Distribuidora' },
  { base: 'Vaselina Reuter', variantes: [''], presentaciones: [['pote', 350]], supplier: 'Distribuidora' },
  { base: 'Talco Rexona Efficient', variantes: [''], presentaciones: [['100 g', 850]], supplier: 'Unilever' },
  { base: 'Protector Solar Nivea', variantes: ['FPS 50'], presentaciones: [['125 ml', 3500]], supplier: 'Distribuidora' },
  { base: 'Cotonetes Johnson', variantes: [''], presentaciones: [['x75', 450]], supplier: 'Distribuidora' },
  { base: 'Peine', variantes: ['de Bolsillo'], presentaciones: [['unidad', 150]], supplier: 'Distribuidora' },
  { base: 'Cortaúñas', variantes: [''], presentaciones: [['unidad', 300]], supplier: 'Distribuidora' },
  { base: 'Colonia Agua de Florida', variantes: [''], presentaciones: [['70 ml', 550]], supplier: 'Distribuidora' },
  { base: 'Pañuelos Elite', variantes: [''], presentaciones: [['paquete x10', 100], ['caja x75', 550]], supplier: 'Softys' },
  { base: 'Ligas para Cabello', variantes: [''], presentaciones: [['x12', 200]], supplier: 'Distribuidora' },
]);

const mascotas = expandir('mascotas', [
  { base: 'Ricocan', variantes: ['Adulto Carne', 'Cachorro', 'Adulto Pollo'], presentaciones: [['500 g', 400], ['2 kg', 1400], ['8 kg', 5200]], supplier: 'Rinti' },
  { base: 'Mimaskot', variantes: ['Carne', 'Pollo'], presentaciones: [['2 kg', 1300], ['8 kg', 4900]], supplier: 'Alicorp' },
  { base: 'Canbo', variantes: ['Adulto', 'Cachorro'], presentaciones: [['2 kg', 1800]], supplier: 'Rinti' },
  { base: 'Whiskas', variantes: ['Pescado', 'Pollo'], presentaciones: [['500 g', 650], ['sobre 85 g', 250]], supplier: 'Distribuidora' },
  { base: 'Gatarina Ricocat', variantes: ['Pescado', 'Pollo'], presentaciones: [['500 g', 450], ['2 kg', 1500]], supplier: 'Rinti' },
  { base: 'Arena para Gatos', variantes: [''], presentaciones: [['4 kg', 1200]], supplier: 'Distribuidora' },
  { base: 'Thor', variantes: ['Adulto'], presentaciones: [['2 kg', 1100], ['8 kg', 4200]], supplier: 'Rinti' },
  { base: 'Supercan', variantes: ['Carne', 'Pollo'], presentaciones: [['2 kg', 1200]], supplier: 'Distribuidora' },
  { base: 'Snack para Perro Doguitos', variantes: [''], presentaciones: [['65 g', 350]], supplier: 'Distribuidora' },
  { base: 'Shampoo para Perros', variantes: [''], presentaciones: [['380 ml', 950]], supplier: 'Distribuidora' },
  { base: 'Collar Antipulgas', variantes: [''], presentaciones: [['unidad', 1200]], supplier: 'Distribuidora' },
]);

const congelados = expandir('congelados', [
  { base: 'Helado D-Onofrio', variantes: ['Vainilla', 'Chocolate', 'Fresa', 'Tricolor'], presentaciones: [['1 L', 1200], ['5 L', 3900]], supplier: 'Nestlé' },
  { base: 'Sin Parar', variantes: ['Clásico', 'Almendras'], presentaciones: [['unidad', 450]], supplier: 'Nestlé' },
  { base: 'Frío Rico', variantes: [''], presentaciones: [['unidad', 350]], supplier: 'Nestlé' },
  { base: 'Turbo', variantes: [''], presentaciones: [['unidad', 200]], supplier: 'Nestlé' },
  { base: 'Nuggets San Fernando', variantes: ['de Pollo'], presentaciones: [['300 g', 950]], supplier: 'San Fernando' },
  { base: 'Hamburguesa Otto Kunz', variantes: ['de Res'], presentaciones: [['x4', 1100]], supplier: 'Otto Kunz' },
  { base: 'Papas Precocidas', variantes: [''], presentaciones: [['750 g', 850]], supplier: 'Distribuidora' },
  { base: 'Pollo Congelado', variantes: ['Entero'], presentaciones: [['unidad aprox 2 kg', 2200]], supplier: 'San Fernando' },
  { base: 'Alitas de Pollo Congeladas', variantes: [''], presentaciones: [['bolsa 1 kg', 1400]], supplier: 'San Fernando' },
  { base: 'Filete de Pescado Congelado', variantes: ['Merluza', 'Basa'], presentaciones: [['500 g', 1200]], supplier: 'Distribuidora' },
  { base: 'Langostinos Congelados', variantes: [''], presentaciones: [['500 g', 2500]], supplier: 'Distribuidora' },
  { base: 'Marciano de Fruta', variantes: ['Lúcuma', 'Fresa', 'Mango'], presentaciones: [['unidad', 100]], supplier: 'Distribuidora' },
  { base: 'Hielo en Bolsa', variantes: [''], presentaciones: [['1.5 kg', 400]], supplier: 'Distribuidora' },
]);

const libreria = expandir('libreria-y-otros', [
  { base: 'Cuaderno Loro', variantes: ['Rayado', 'Cuadriculado'], presentaciones: [['92 hojas', 350]], supplier: 'Distribuidora' },
  { base: 'Cuaderno Standford', variantes: ['A4 Cuadriculado'], presentaciones: [['160 hojas', 750]], supplier: 'Distribuidora' },
  { base: 'Lapicero Faber-Castell', variantes: ['Azul', 'Negro', 'Rojo'], presentaciones: [['unidad', 100], ['x3', 280]], supplier: 'Faber-Castell' },
  { base: 'Lápiz Mongol', variantes: ['2B'], presentaciones: [['unidad', 100]], supplier: 'Distribuidora' },
  { base: 'Borrador Layconsa', variantes: [''], presentaciones: [['unidad', 50]], supplier: 'Distribuidora' },
  { base: 'Regla', variantes: ['30 cm'], presentaciones: [['unidad', 100]], supplier: 'Distribuidora' },
  { base: 'Goma en Barra UHU', variantes: [''], presentaciones: [['8 g', 250]], supplier: 'Distribuidora' },
  { base: 'Cinta Adhesiva', variantes: ['Transparente'], presentaciones: [['unidad', 150]], supplier: 'Distribuidora' },
  { base: 'Papelote', variantes: ['Blanco', 'Cuadriculado'], presentaciones: [['unidad', 60]], supplier: 'Distribuidora' },
  { base: 'Cartulina', variantes: ['Blanca', 'de Colores'], presentaciones: [['unidad', 100]], supplier: 'Distribuidora' },
  { base: 'Pilas Panasonic', variantes: ['AA', 'AAA'], presentaciones: [['x2', 650], ['x4', 1200]], supplier: 'Panasonic' },
  { base: 'Pilas Duracell', variantes: ['AA', 'AAA'], presentaciones: [['x2', 950]], supplier: 'Distribuidora' },
  { base: 'Foco LED', variantes: ['9 W', '12 W'], presentaciones: [['unidad', 750]], supplier: 'Distribuidora' },
  { base: 'Recarga Bidón de Agua', variantes: [''], presentaciones: [['20 L', 1200]], supplier: 'Distribuidora' },
  { base: 'Colores Faber-Castell', variantes: ['x12'], presentaciones: [['caja', 1200]], supplier: 'Faber-Castell' },
  { base: 'Plumones Artesco', variantes: ['x10'], presentaciones: [['caja', 950]], supplier: 'Artesco' },
  { base: 'Plumón Indeleble', variantes: ['Negro', 'Azul'], presentaciones: [['unidad', 350]], supplier: 'Faber-Castell' },
  { base: 'Resaltador Artesco', variantes: ['Amarillo', 'Verde'], presentaciones: [['unidad', 250]], supplier: 'Artesco' },
  { base: 'Corrector Artesco', variantes: [''], presentaciones: [['unidad', 300]], supplier: 'Artesco' },
  { base: 'Tajador con Depósito', variantes: [''], presentaciones: [['unidad', 150]], supplier: 'Artesco' },
  { base: 'Tijera Escolar', variantes: [''], presentaciones: [['unidad', 300]], supplier: 'Artesco' },
  { base: 'Silicona Líquida Artesco', variantes: [''], presentaciones: [['100 ml', 350]], supplier: 'Artesco' },
  { base: 'Folder Manila A4', variantes: [''], presentaciones: [['unidad', 80]], supplier: 'Distribuidora' },
  { base: 'Sobre Manila A4', variantes: [''], presentaciones: [['unidad', 60]], supplier: 'Distribuidora' },
  { base: 'Papel Bond A4', variantes: [''], presentaciones: [['x100', 500]], supplier: 'Distribuidora' },
  { base: 'Plastilina Artesco', variantes: ['x10'], presentaciones: [['caja', 450]], supplier: 'Artesco' },
  { base: 'Témperas Artesco', variantes: ['x7'], presentaciones: [['caja', 800]], supplier: 'Artesco' },
  { base: 'Encendedor', variantes: [''], presentaciones: [['unidad', 200]], supplier: 'Distribuidora' },
  { base: 'Linterna a Pilas', variantes: [''], presentaciones: [['unidad', 1200]], supplier: 'Distribuidora' },
  { base: 'Paraguas Plegable', variantes: [''], presentaciones: [['unidad', 1800]], supplier: 'Distribuidora' },
  { base: 'Tapaboca KN95', variantes: [''], presentaciones: [['unidad', 100]], supplier: 'Distribuidora' },
]);

// Pesables (S/ por kg) — sin barcode.
const pesables: ReadonlyArray<readonly [string, number]> = [
  ['Papaya', 450], ['Plátano de Seda', 280], ['Plátano Bizcocho', 350], ['Plátano Verde', 250],
  ['Manzana Israel', 550], ['Manzana Delicia', 490], ['Manzana Chilena', 690], ['Pera', 590],
  ['Naranja de Jugo', 250], ['Naranja de Mesa', 390], ['Mandarina', 390], ['Limón', 450],
  ['Palta Fuerte', 890], ['Palta Hass', 990], ['Tomate', 320], ['Tomate Cherry', 850],
  ['Cebolla Roja', 280], ['Cebolla Blanca', 350], ['Papa Amarilla', 390], ['Papa Blanca', 220],
  ['Papa Huayro', 350], ['Papa Canchán', 250], ['Papa Yungay', 240], ['Camote Amarillo', 240],
  ['Camote Morado', 260], ['Yuca', 280], ['Olluco', 450], ['Zanahoria', 220],
  ['Choclo Serrano', 450], ['Choclo Desgranado', 650], ['Ají Amarillo', 650], ['Ají Limo', 750],
  ['Ají Panca Seco', 1200], ['Rocoto', 590], ['Culantro', 800], ['Perejil', 800],
  ['Apio', 350], ['Poro', 320], ['Zapallo Macre', 290], ['Zapallo Loche', 950],
  ['Brócoli', 550], ['Coliflor', 450], ['Espinaca', 490], ['Lechuga Criolla', 450],
  ['Col', 250], ['Vainita', 480], ['Arveja Verde', 550], ['Haba Verde', 480],
  ['Pepinillo', 290], ['Pimiento', 590], ['Beterraga', 300], ['Uva Red Globe', 890],
  ['Uva Italia', 790], ['Piña Golden', 390], ['Sandía', 250], ['Melón Coquito', 350],
  ['Fresa', 790], ['Mango Kent', 490], ['Mango Edward', 450], ['Granadilla', 750],
  ['Maracuyá', 450], ['Tuna', 500], ['Chirimoya', 850], ['Lúcuma', 900],
  ['Membrillo', 550], ['Durazno Huayco', 690], ['Kion', 890], ['Ajo Entero', 1200],
  ['Arroz a Granel', 380], ['Azúcar Rubia a Granel', 420], ['Lenteja a Granel', 520],
  ['Frijol Canario a Granel', 750], ['Maíz Popcorn a Granel', 450], ['Trigo a Granel', 350],
];

const panaderia: ReadonlyArray<readonly [string, number]> = [
  ['Pan Francés (unidad)', 30], ['Pan Ciabatta (unidad)', 50], ['Pan de Yema (unidad)', 50],
  ['Pan Integral (unidad)', 60], ['Pan Caracol (unidad)', 80], ['Pan Chancay (unidad)', 50],
  ['Pan de Camote (unidad)', 60], ['Pan Baguette (unidad)', 150], ['Pan de Molde Bimbo Blanco', 750],
  ['Pan de Molde Bimbo Integral', 820], ['Tostadas Bimbo 210 g', 650], ['Bizcocho Chancay Grande', 120],
  ['Empanada de Pollo (unidad)', 250], ['Empanada de Carne (unidad)', 250], ['Alfajor (unidad)', 150],
  ['Torta de Chocolate (tajada)', 450], ['Keke de Vainilla (tajada)', 250], ['Pionono (unidad)', 1500],
];

// Categorías nuevas de esta carga (las 6 base ya existen). icon/color de los
// sets fijos del API.
const CATEGORIAS_NUEVAS: ReadonlyArray<{ name: string; icon: string; color: string }> = [
  { name: 'Lácteos y embutidos', icon: 'lacteo', color: 'azul' },
  { name: 'Cuidado personal', icon: 'botella', color: 'rosado' },
  { name: 'Licores', icon: 'botella', color: 'morado' },
  { name: 'Mascotas', icon: 'mascota', color: 'marron' },
  { name: 'Congelados', icon: 'nieve', color: 'turquesa' },
  { name: 'Librería y otros', icon: 'bolsa', color: 'ambar' },
];

// Slug esperado por nombre (para asignar productos); se verifica contra la
// lista real del API después de crearlas.
const SLUGS_ESPERADOS = [
  'lacteos-y-embutidos', 'cuidado-personal', 'licores', 'mascotas', 'congelados', 'libreria-y-otros',
];

function buildSeeds(): ProductSeed[] {
  const seeds: ProductSeed[] = [
    ...bebidas,
    ...cervezas,
    ...abarrotes,
    ...golosinas,
    ...lacteos,
    ...limpieza,
    ...cuidadoPersonal,
    ...mascotas,
    ...congelados,
    ...libreria,
  ];
  for (const [name, priceCents] of pesables) {
    seeds.push({ name, category: 'frutas-verduras', saleType: 'weight', priceCents, barcode: false });
  }
  for (const [name, priceCents] of panaderia) {
    const empacado = name.includes('Bimbo') || name.includes('Tostadas');
    seeds.push({ name, category: 'pan', saleType: 'unit', priceCents, barcode: empacado });
  }
  // Nombres únicos (las familias podrían chocar entre sí).
  const vistos = new Set<string>();
  return seeds.filter((seed) => {
    if (vistos.has(seed.name)) return false;
    vistos.add(seed.name);
    return true;
  });
}

const CLIENTES: ReadonlyArray<readonly [string, string | null]> = [
  ['María Quispe', '987654321'], ['Juan Huamán', '912345678'], ['Rosa Flores', null],
  ['Pedro Ccopa', '956781234'], ['Carmen Mamani', '945612378'], ['Luis Condori', null],
  ['Julia Apaza', '934567812'], ['Jorge Chávez', null], ['Ana Torres', '923456781'],
  ['Víctor Puma', null], ['Elena Vilca', '998765432'], ['Raúl Ticona', null],
  ['Sofía Cárdenas', '976543218'], ['Miguel Rojas', null], ['Lucía Paredes', '965432187'],
  ['Andrés Salas', null], ['Teresa Núñez', '954321876'], ['Óscar Medina', null],
  ['Patricia Vega', '943218765'], ['Hugo Castillo', null], ['Gladys Ramos', '932187654'],
  ['Ernesto Díaz', null], ['Norma Aguilar', '921876543'], ['Felipe Guzmán', null],
  ['Yolanda Espinoza', '919876543'],
];

// ---------------------------------------------------------------------------

interface CreatedProduct {
  id: string;
  name: string;
  saleType: 'unit' | 'weight';
  priceCents: number; // unidad o por kg
}

async function login(): Promise<void> {
  const response = await api('POST', '/users/login', { pin: PIN });
  const body = await json<{ token: string; name: string }>(response, 'login');
  TOKEN = body.token;
  console.log(`Sesión iniciada como ${body.name}`);
}

async function ensureCategories(): Promise<Set<string>> {
  const existing = await json<Array<{ slug: string }>>(
    await api('GET', '/catalog/categories'),
    'listar categorías',
  );
  const slugs = new Set(existing.map((c) => c.slug));
  for (const categoria of CATEGORIAS_NUEVAS) {
    const created = await api('POST', '/catalog/categories', { name: categoria.name });
    if (created.status === 201) {
      const body = await created.json() as { slug: string };
      slugs.add(body.slug);
      await api('PUT', `/catalog/categories/${body.slug}`, {
        icon: categoria.icon,
        color: categoria.color,
      });
      console.log(`Categoría creada: ${categoria.name} (${body.slug})`);
    }
  }
  const faltantes = SLUGS_ESPERADOS.filter((slug) => !slugs.has(slug));
  if (faltantes.length > 0) {
    throw new Error(`Slugs de categoría no coinciden con lo esperado: ${faltantes.join(', ')}`);
  }
  return slugs;
}

async function seedProducts(): Promise<CreatedProduct[]> {
  const seeds = buildSeeds();
  console.log(`Productos a cargar: ${seeds.length}`);
  const created: CreatedProduct[] = [];
  let omitidos = 0;
  let shortCodeNext = 20; // 1-16 ya están usados por la carga anterior

  for (const [index, seed] of seeds.entries()) {
    const costFactor = 0.68 + rand() * 0.17; // margen realista 15-32%
    const isWeight = seed.saleType === 'weight';
    const barcode = seed.barcode ? `7750${String(100000000 + index)}` : null;
    // Unos pocos códigos cortos nuevos para mostrador.
    const shortCode = !isWeight && index % 97 === 0 && shortCodeNext < 100
      ? String(shortCodeNext++)
      : null;

    const body = isWeight
      ? {
          saleType: 'weight',
          name: seed.name,
          category: seed.category,
          barcode,
          shortCode,
          pricePerKgCents: seed.priceCents,
          costPerKgCents: Math.round(seed.priceCents * costFactor),
          stockMinimumGrams: 1000,
          quickAccess: index % 41 === 0,
        }
      : {
          saleType: 'unit',
          name: seed.name,
          category: seed.category,
          barcode,
          shortCode,
          priceCents: seed.priceCents,
          costCents: Math.round(seed.priceCents * costFactor),
          stockMinimum: randInt(3, 12),
          quickAccess: index % 41 === 0,
          ...(seed.supplier === undefined ? {} : { supplier: seed.supplier }),
        };

    const response = await api('POST', '/catalog/products', body);
    if (response.status === 201) {
      const product = await response.json() as { id: string };
      created.push({ id: product.id, name: seed.name, saleType: seed.saleType, priceCents: seed.priceCents });
      const stock = isWeight ? randInt(2, 20) * 1000 : randInt(6, 80);
      await api('POST', '/inventory/entries', { productId: product.id, quantity: stock, userId: 'seed-carga' });
    } else {
      omitidos += 1;
    }
    if ((index + 1) % 100 === 0) console.log(`  ${index + 1}/${seeds.length}…`);
  }
  console.log(`Productos creados: ${created.length} · omitidos (ya existían): ${omitidos}`);
  return created;
}

async function seedCustomers(): Promise<string[]> {
  const ids: string[] = [];
  for (const [name, phone] of CLIENTES) {
    const response = await api('POST', '/customers', {
      name,
      phone,
      document: null,
      creditLimitCents: randInt(10, 50) * 1000, // S/100–S/500
    });
    if (response.status === 201) {
      const body = await response.json() as { id: string };
      ids.push(body.id);
    }
  }
  console.log(`Clientes creados: ${ids.length}`);
  return ids;
}

const roundToDime = (cents: number): number => Math.round(cents / 10) * 10;

async function seedSales(products: CreatedProduct[], customerIds: string[]): Promise<void> {
  if (products.length < 10) {
    // Re-corrida sin productos nuevos: tomar el catálogo existente del API.
    const page = await json<{ items: Array<{ id: string; name: string; saleType: 'unit' | 'weight'; priceCents?: number; pricePerKgCents?: number }> }>(
      await api('GET', '/catalog/products?perPage=100'),
      'listar productos',
    );
    products = page.items.map((item) => ({
      id: item.id,
      name: item.name,
      saleType: item.saleType,
      priceCents: item.priceCents ?? item.pricePerKgCents ?? 100,
    }));
  }

  await api('POST', '/cash/open', { shift: 'morning', openingAmountCents: 20000, userId: 'seed-carga' });

  let vendidas = 0;
  let rechazadas = 0;
  for (let i = 0; i < VENTAS; i += 1) {
    const lineCount = randInt(1, 5);
    const lines: unknown[] = [];
    let subtotal = 0;
    for (let l = 0; l < lineCount; l += 1) {
      const product = pick(products);
      // Descuento de línea ocasional (≤20%, en pasos de diez).
      if (product.saleType === 'weight') {
        const grams = randInt(2, 30) * 50; // 100 g – 1.5 kg
        const gross = Math.round((grams / 1000) * product.priceCents);
        const discount = i % 11 === 0 ? Math.min(Math.floor(gross * 0.1 / 10) * 10, 100) : 0;
        lines.push({ saleType: 'weight', productId: product.id, grams, weightSource: 'manual', discountCents: discount });
        subtotal += gross - discount;
      } else {
        const quantity = randInt(1, 4);
        const gross = quantity * product.priceCents;
        const discount = i % 13 === 0 ? Math.min(Math.floor(gross * 0.15 / 10) * 10, 200) : 0;
        lines.push({ saleType: 'unit', productId: product.id, quantity, discountCents: discount });
        subtotal += gross - discount;
      }
    }
    // Descuento al ticket en algunas ventas (autorizado por encargado).
    const ticketDiscount = i % 17 === 0 && subtotal > 1000 ? 100 : 0;
    subtotal -= ticketDiscount;
    if (subtotal < 10) { rechazadas += 1; continue; }
    const total = Math.max(10, roundToDime(subtotal));

    // Fiado solo en tickets chicos para no agotar el límite de crédito.
    const method =
      i % 10 === 9 && customerIds.length > 0 && total <= 5000
        ? 'credit'
        : pick(['cash', 'cash', 'cash', 'yape', 'card'] as const);
    const payment =
      method === 'credit'
        ? { method: 'credit', amountCents: total, customerId: pick(customerIds) }
        : method === 'cash'
          ? { method: 'cash', amountCents: total, receivedCents: Math.ceil(total / 500) * 500 }
          : { method, amountCents: total };

    const response = await api('POST', '/sales/checkout', {
      ticketId: randomUUID(),
      lines,
      payments: [payment],
      userId: 'Rosa',
      ticketDiscountCents: ticketDiscount,
      discountAuthorizedBy: ticketDiscount > 0 ? 'Encargado' : null,
      customerId: i % 7 === 0 && customerIds.length > 0 ? pick(customerIds) : null,
    });
    if (response.status === 201 || response.status === 200) {
      vendidas += 1;
    } else {
      rechazadas += 1;
      if (rechazadas <= 3) console.log(`  venta rechazada (${response.status}): ${await response.text()}`);
    }
  }
  console.log(`Ventas creadas: ${vendidas} · rechazadas: ${rechazadas}`);

  // Cerrar la caja del seed contando exactamente lo esperado.
  const status = await json<{ breakdown: { currentCashCents: number } } | { currentCashCents: number }>(
    await api('GET', '/cash/status'),
    'estado de caja',
  );
  const counted = 'breakdown' in status ? status.breakdown.currentCashCents : status.currentCashCents;
  await api('POST', '/cash/close', { countedCashCents: counted, userId: 'seed-carga', note: 'cierre del seed de carga' });
  console.log(`Caja del seed cerrada (contado S/ ${(counted / 100).toFixed(2)})`);
}

async function main(): Promise<void> {
  await login();
  await ensureCategories();
  const products = await seedProducts();
  const customers = await seedCustomers();
  await seedSales(products, customers);
  console.log('Carga completa ✔');
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
