// Desactiva productos duplicados por nombre (case-insensitive), conservando el
// más reciente. Los desactivados mantienen su historial de kardex/ventas.
// Uso: npx tsx scripts/desactivar-duplicados.ts
import Database from 'better-sqlite3';

const db = new Database('./mana.sqlite');
const result = db
  .prepare(
    `UPDATE products SET active = 0 WHERE id IN (
       SELECT p1.id FROM products p1
       JOIN products p2
         ON lower(p1.name) = lower(p2.name)
        AND p1.id != p2.id
        AND p1.created_at < p2.created_at
     )`,
  )
  .run();
console.log(`Duplicados desactivados: ${result.changes}`);
db.close();
