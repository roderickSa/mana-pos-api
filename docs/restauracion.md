# Restaurar Maná POS en una PC nueva

Guía para cuando la PC de la tienda se malogra, se roba o se reemplaza.
Tiempo estimado: 30 minutos.

## Qué necesitas

1. **El respaldo más reciente**: un archivo `mana-AAAA-MM-DD.sqlite`. Vive en:
   - La carpeta externa configurada en Ajustes → Respaldo (disco USB o
     carpeta sincronizada) — la opción preferida, o
   - `mana-pos-api/backups/` de la PC vieja (si el disco aún funciona), o
   - Una descarga hecha con el botón «Descargar copia» de Ajustes → Respaldo.
2. **La carpeta de imágenes de productos**: `mana-pos-api/data/images/` de la
   PC vieja. El respaldo .sqlite NO incluye las fotos — si no la tienes, el
   sistema funciona igual pero los tiles salen sin imagen.
3. El código del sistema (los repos `mana-pos-api` y `mana-pos-web` de GitHub,
   o una copia de la carpeta `minimarket-sistema` completa).

## Pasos

1. Instalar [Node.js LTS](https://nodejs.org) en la PC nueva.
2. Copiar la carpeta `minimarket-sistema` (o clonar ambos repos).
3. En `mana-pos-api/`: `npm install`.
4. En `mana-pos-web/`: `npm install && npx vite build`.
5. **Colocar el respaldo**: copiar el `mana-AAAA-MM-DD.sqlite` más reciente a
   `mana-pos-api/` con el nombre `mana.sqlite` (o a la ruta que indique la
   variable `MANA_DB_PATH` si se usa una distinta).
6. **Colocar las imágenes**: copiar la carpeta `data/images/` dentro de
   `mana-pos-api/data/images/`.
7. Arrancar: en `mana-pos-api/` correr `npx tsx src/main.ts`. Las migraciones
   pendientes (si el código es más nuevo que el respaldo) corren solas.
8. Abrir `http://localhost:3210`, entrar con el PIN de siempre y verificar:
   - Inventario → Productos: el stock coincide.
   - Caja: el último cierre aparece en el historial.
   - Fiado: las deudas están.
9. **Reconfigurar el respaldo**: Ajustes → Respaldo → volver a poner la
   carpeta externa (la config vive en la BD restaurada, pero la ruta del
   disco puede cambiar entre PCs, p. ej. `E:\` → `D:\`).
10. Modo kiosco y arranque automático: seguir `docs/kiosco-windows.md`.

## Verificar que el respaldo quedó activo

En Ajustes → Respaldo debe verse «Último respaldo: hoy». Si dice que la copia
externa falla, el disco no está conectado o la ruta cambió.

## Regla de oro

Probar la restauración UNA vez antes de necesitarla: restaurar en otra PC (o
en una carpeta aparte con `MANA_DB_PATH`) y confirmar que abre. Un respaldo
que nunca se probó restaurar no es un respaldo.
