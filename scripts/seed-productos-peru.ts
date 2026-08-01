// Puebla el catálogo con ~200 productos típicos de un minimarket peruano.
// Uso: npx tsx scripts/seed-productos-peru.ts  (con la API corriendo en :3210)

const API = process.env.MANA_API ?? 'http://localhost:3210';

interface Seed {
  name: string;
  category: 'bebidas' | 'abarrotes' | 'frutas-verduras' | 'limpieza' | 'pan';
  saleType: 'unit' | 'weight';
  price: number; // soles (por unidad o por kg)
  supplier?: string | undefined;
  quickAccess?: boolean;
  shortCode?: string;
  stock?: number; // unidades o gramos
}

const bebidas: Array<[string, number, string?]> = [
  ['Inca Kola 600 ml', 3.5, 'Arca Continental Lindley'],
  ['Inca Kola 1.5 L', 7.5, 'Arca Continental Lindley'],
  ['Inca Kola 3 L', 12.0, 'Arca Continental Lindley'],
  ['Coca-Cola 500 ml', 3.5, 'Arca Continental Lindley'],
  ['Coca-Cola 1.5 L', 7.9, 'Arca Continental Lindley'],
  ['Coca-Cola 3 L', 12.5, 'Arca Continental Lindley'],
  ['Sprite 500 ml', 3.0, 'Arca Continental Lindley'],
  ['Fanta Naranja 500 ml', 3.0, 'Arca Continental Lindley'],
  ['Pepsi 750 ml', 3.5, 'CBC Peruana'],
  ['Kola Real Amarilla 3.3 L', 8.5, 'Industrias AJE'],
  ['Cifrut Citrus Punch 500 ml', 2.0, 'Industrias AJE'],
  ['Agua San Luis 625 ml', 1.5, 'Arca Continental Lindley'],
  ['Agua San Luis 2.5 L', 4.0, 'Arca Continental Lindley'],
  ['Agua Cielo 625 ml', 1.5, 'Industrias AJE'],
  ['Agua Cielo 2.5 L', 3.8, 'Industrias AJE'],
  ['Agua San Mateo 600 ml', 2.5, 'Backus'],
  ['Sporade Tropical 500 ml', 2.5, 'Industrias AJE'],
  ['Volt Energizante 300 ml', 2.5, 'Industrias AJE'],
  ['Frugos del Valle Durazno 1 L', 5.5, 'Arca Continental Lindley'],
  ['Pulp Durazno 1 L', 4.5, 'Industrias AJE'],
  ['Pulp Mango cajita 145 ml', 1.0, 'Industrias AJE'],
  ['Chicha Morada Gloria 1 L', 4.8, 'Gloria'],
  ['Cerveza Pilsen Callao 630 ml', 7.5, 'Backus'],
  ['Cerveza Cristal 650 ml', 7.5, 'Backus'],
  ['Cerveza Cusqueña Dorada 620 ml', 9.0, 'Backus'],
  ['Cerveza Cusqueña Negra 620 ml', 9.5, 'Backus'],
  ['Maltin Power 330 ml', 2.0, 'Backus'],
  ['Yogurt Gloria Fresa 1 L', 7.9, 'Gloria'],
  ['Yogurt Gloria Vainilla 1 L', 7.9, 'Gloria'],
  ['Yogurt Laive Fresa 946 ml', 8.5, 'Laive'],
  ['Yogurt Gloria Fresa 185 ml', 2.0, 'Gloria'],
];

const abarrotes: Array<[string, number, string?]> = [
  ['Arroz Costeño Extra 750 g', 4.2, 'Costeño Alimentos'],
  ['Arroz Costeño Extra 5 kg', 26.5, 'Costeño Alimentos'],
  ['Arroz Paisana Superior 750 g', 4.5, 'Costeño Alimentos'],
  ['Azúcar Rubia Cartavio 1 kg', 4.8, 'Cartavio'],
  ['Azúcar Blanca Cartavio 1 kg', 5.2, 'Cartavio'],
  ['Aceite Primor Clásico 1 L', 9.8, 'Alicorp'],
  ['Aceite Cocinero 1 L', 9.2, 'Alicorp'],
  ['Aceite Cil 1 L', 8.5, 'Alicorp'],
  ['Fideo Spaghetti Don Vittorio 500 g', 3.9, 'Alicorp'],
  ['Fideo Tallarín Nicolini 500 g', 3.5, 'Alicorp'],
  ['Fideo Cabello de Ángel Molitalia 500 g', 3.4, 'Molitalia'],
  ['Fideo Tornillo Don Vittorio 400 g', 3.6, 'Alicorp'],
  ['Atún Florida Filete 170 g', 6.5, 'Camposol'],
  ['Atún A-1 Trozos 170 g', 4.8],
  ['Atún Campomar Grated 170 g', 3.9],
  ['Leche Gloria Evaporada Azul 400 g', 4.6, 'Gloria'],
  ['Leche Gloria Light 400 g', 4.7, 'Gloria'],
  ['Leche Pura Vida 400 g', 3.8, 'Gloria'],
  ['Leche Laive Evaporada 400 g', 4.5, 'Laive'],
  ['Leche Condensada Nestlé 397 g', 8.9, 'Nestlé'],
  ['Avena 3 Ositos 170 g', 2.0, 'Molitalia'],
  ['Avena Quaker 300 g', 4.5],
  ['Café Altomayo Molido 250 g', 15.9, 'Altomayo'],
  ['Café Instantáneo Kirma 190 g', 17.5, 'Nestlé'],
  ['Nescafé Tradición 200 g', 19.9, 'Nestlé'],
  ['Milo Actigen 400 g', 16.9, 'Nestlé'],
  ['Ecco Cebada 190 g', 9.9, 'Nestlé'],
  ['Sal de Mesa Emsal 1 kg', 1.8],
  ['Sillao Kikko 500 ml', 6.5],
  ['Vinagre Blanco Venturo 600 ml', 3.2],
  ['Ají-no-moto sobre 100 g', 3.5],
  ['Mayonesa Alacena 95 g', 4.2, 'Alicorp'],
  ['Ketchup Alacena 90 g', 3.2, 'Alicorp'],
  ['Mostaza Alacena 85 g', 2.8, 'Alicorp'],
  ['Crema de Rocoto Alacena 85 g', 3.5, 'Alicorp'],
  ['Mermelada de Fresa Fanny 350 g', 5.9],
  ['Harina Blanca Flor 1 kg', 6.8, 'Alicorp'],
  ['Huevos Pardos x 15', 9.5],
  ['Panela Orgánica 500 g', 7.5],
  ['Quinua Perlada 500 g', 8.9],
  ['Lentejas 500 g', 5.5],
  ['Frijol Canario 500 g', 7.9],
  ['Garbanzos 500 g', 6.5],
  ['Galleta Soda Field 6 pack', 4.5, 'Mondelez'],
  ['Galleta Ritz taco', 3.5, 'Mondelez'],
  ['Galleta Casino Fresa', 1.0, 'Nestlé'],
  ['Galleta Morochas', 1.2, 'Nestlé'],
  ['Galleta Picaras', 1.2],
  ['Galleta Cua Cua', 1.0, 'Mondelez'],
  ['Galleta Doña Pepa', 1.2, 'Alicorp'],
  ['Galleta Chin Chin', 1.0],
  ['Galleta Oreo', 1.5, 'Mondelez'],
  ['Galleta Vainilla Field', 1.0, 'Mondelez'],
  ['Chocolate Sublime Clásico', 2.0, 'Nestlé'],
  ['Chocolate Triángulo D-Onofrio', 2.0, 'Nestlé'],
  ['Chocolate Princesa', 2.0, 'Nestlé'],
  ['Caramelos Halls Mentol', 0.5],
  ['Chicle Trident Menta', 1.0, 'Mondelez'],
  ['Papas Lays Clásicas 42 g', 2.0, 'PepsiCo'],
  ['Chizitos 26 g', 1.0, 'PepsiCo'],
  ['Cuates Picantes 40 g', 1.5, 'PepsiCo'],
  ['Piqueo Snax 40 g', 2.0, 'PepsiCo'],
  ['Doritos Queso 42 g', 2.0, 'PepsiCo'],
  ['Maní Salado Karinto 38 g', 1.5],
  ['Canchita Serrana 100 g', 2.5],
  ['Tuco Sibarita sobre', 1.0],
  ['Sopa Instantánea Ajinomen Gallina', 1.8],
  ['Mazamorra Morada Negrita 160 g', 3.2, 'Alicorp'],
  ['Gelatina Royal Fresa 160 g', 3.5],
];

const frutasVerduras: Array<[string, number]> = [
  ['Papaya', 4.5],
  ['Plátano de Seda', 2.8],
  ['Plátano Bizcocho', 3.5],
  ['Manzana Israel', 5.5],
  ['Manzana Delicia', 4.9],
  ['Naranja de Jugo', 2.5],
  ['Mandarina', 3.9],
  ['Limón', 4.5],
  ['Palta Fuerte', 8.9],
  ['Tomate', 3.2],
  ['Cebolla Roja', 2.8],
  ['Papa Amarilla', 3.9],
  ['Papa Blanca', 2.2],
  ['Papa Huayro', 3.5],
  ['Papa Canchán', 2.5],
  ['Camote Amarillo', 2.4],
  ['Yuca', 2.8],
  ['Zanahoria', 2.2],
  ['Choclo Serrano', 4.5],
  ['Ají Amarillo', 6.5],
  ['Ají Limo', 7.5],
  ['Rocoto', 5.9],
  ['Apio', 3.5],
  ['Poro', 3.2],
  ['Zapallo Macre', 2.9],
  ['Brócoli', 5.5],
  ['Espinaca', 4.9],
  ['Lechuga Criolla', 4.5],
  ['Pepinillo', 2.9],
  ['Uva Red Globe', 8.9],
  ['Piña Golden', 3.9],
  ['Sandía', 2.5],
  ['Melón Coquito', 3.5],
  ['Fresa', 7.9],
  ['Mango Kent', 4.9],
  ['Granadilla', 7.5],
  ['Maracuyá', 4.5],
  ['Chirimoya', 8.5],
  ['Kion', 8.9],
  ['Ajo Entero', 12.0],
];

const limpieza: Array<[string, number, string?]> = [
  ['Detergente Bolívar Floral 360 g', 5.9, 'Alicorp'],
  ['Detergente Bolívar 780 g', 11.5, 'Alicorp'],
  ['Detergente Ace 360 g', 5.5, 'P&G'],
  ['Detergente Ariel 360 g', 6.2, 'P&G'],
  ['Detergente Opal 360 g', 5.2, 'Alicorp'],
  ['Jabón Bolívar Barra', 3.5, 'Alicorp'],
  ['Jabón Marsella Barra', 2.9, 'Alicorp'],
  ['Lavavajilla Sapolio 360 g', 4.5, 'Intradevco'],
  ['Lavavajilla Ayudín 330 g', 4.9, 'P&G'],
  ['Lejía Clorox 680 g', 3.5, 'Clorox'],
  ['Poett Lavanda 325 ml', 4.2, 'Clorox'],
  ['Limpiatodo Sapolio Lavanda 900 ml', 6.5, 'Intradevco'],
  ['Papel Higiénico Elite x4', 6.9, 'Softys'],
  ['Papel Higiénico Suave x4', 6.5, 'Softys'],
  ['Papel Higiénico Noble x2', 3.2],
  ['Papel Toalla Scott', 6.9, 'Kimberly-Clark'],
  ['Servilletas Elite x100', 2.9, 'Softys'],
  ['Esponja Scotch Brite', 2.5, '3M'],
  ['Bolsas de Basura 50 L x10', 4.5],
  ['Ambientador Sapolio Spray', 7.9, 'Intradevco'],
  ['Insecticida Sapolio Mata Moscas', 9.9, 'Intradevco'],
  ['Shampoo H&S sachet 10 ml', 1.0, 'P&G'],
  ['Shampoo Sedal sachet 12 ml', 1.0, 'Unilever'],
  ['Jabón de Tocador Camay', 2.5, 'P&G'],
  ['Jabón de Tocador Neko', 3.9],
  ['Pasta Dental Colgate 75 ml', 5.5, 'Colgate'],
  ['Pasta Dental Kolynos 75 ml', 3.9, 'Colgate'],
  ['Cepillo Dental Colgate', 4.5, 'Colgate'],
  ['Toallas Nosotras Normal x10', 5.5],
  ['Pañales Huggies M x8', 12.9, 'Kimberly-Clark'],
  ['Fósforos Llama x50', 1.0],
  ['Pilas AA Panasonic x2', 6.5],
];

const pan: Array<[string, number]> = [
  ['Pan Francés (unidad)', 0.3],
  ['Pan Ciabatta (unidad)', 0.5],
  ['Pan de Yema (unidad)', 0.5],
  ['Pan Integral (unidad)', 0.6],
  ['Pan Caracol (unidad)', 0.8],
  ['Pan Chancay (unidad)', 0.5],
  ['Tostadas Bimbo 210 g', 6.5],
  ['Empanada de Pollo (unidad)', 2.5],
];

// Códigos cortos para lo de mostrador (los que más se teclean).
const SHORT_CODES: Record<string, string> = {
  'Pan Francés (unidad)': '1',
  'Pan Chancay (unidad)': '2',
  'Pan de Yema (unidad)': '3',
  'Empanada de Pollo (unidad)': '4',
  'Huevos Pardos x 15': '5',
  Papaya: '10',
  'Plátano de Seda': '11',
  Tomate: '12',
  'Cebolla Roja': '13',
  'Papa Amarilla': '14',
  Limón: '15',
  'Palta Fuerte': '16',
};

const QUICK_ACCESS = new Set([
  ...Object.keys(SHORT_CODES),
  'Inca Kola 600 ml',
  'Agua San Luis 625 ml',
  'Leche Gloria Evaporada Azul 400 g',
  'Arroz Costeño Extra 750 g',
  'Azúcar Rubia Cartavio 1 kg',
  'Aceite Primor Clásico 1 L',
  'Galleta Soda Field 6 pack',
  'Detergente Bolívar Floral 360 g',
]);

function buildSeeds(): Seed[] {
  const seeds: Seed[] = [];
  for (const [name, price, supplier] of bebidas) {
    seeds.push({ name, price, supplier, category: 'bebidas', saleType: 'unit' });
  }
  for (const [name, price, supplier] of abarrotes) {
    seeds.push({ name, price, supplier, category: 'abarrotes', saleType: 'unit' });
  }
  for (const [name, price] of frutasVerduras) {
    seeds.push({ name, price, category: 'frutas-verduras', saleType: 'weight' });
  }
  for (const [name, price, supplier] of limpieza) {
    seeds.push({ name, price, supplier, category: 'limpieza', saleType: 'unit' });
  }
  for (const [name, price] of pan) {
    seeds.push({ name, price, category: 'pan', saleType: 'unit' });
  }
  return seeds;
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function main(): Promise<void> {
  const seeds = buildSeeds();
  let created = 0;
  let skipped = 0;

  for (const [index, seed] of seeds.entries()) {
    const priceCents = Math.round(seed.price * 100);
    const costCents = Math.round(priceCents * 0.78);
    const isWeight = seed.saleType === 'weight';
    // Barcode ficticio estable por índice (solo para unidades envasadas).
    const barcode = isWeight || seed.category === 'pan' ? null : `7759990${String(index).padStart(6, '0')}`;
    const shortCode = SHORT_CODES[seed.name] ?? null;
    const quickAccess = QUICK_ACCESS.has(seed.name);

    const body = isWeight
      ? {
          saleType: 'weight',
          name: seed.name,
          category: seed.category,
          barcode,
          shortCode,
          pricePerKgCents: priceCents,
          costPerKgCents: costCents,
          stockMinimumGrams: 1000,
          quickAccess,
        }
      : {
          saleType: 'unit',
          name: seed.name,
          category: seed.category,
          barcode,
          shortCode,
          priceCents,
          costCents,
          stockMinimum: 5,
          quickAccess,
        };

    const response = await post('/catalog/products', body);
    if (response.status === 201) {
      created += 1;
      const product = (await response.json()) as { id: string };
      // Stock inicial pseudoaleatorio pero estable por índice.
      const stock = isWeight ? 2000 + (index % 7) * 1500 : 12 + (index % 9) * 6;
      await post('/inventory/entries', { productId: product.id, quantity: stock, userId: 'seed-demo' });
    } else {
      skipped += 1;
    }
  }

  console.log(`Productos creados: ${created} · omitidos (ya existían u error): ${skipped}`);
}

void main();
