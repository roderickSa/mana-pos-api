# Maná POS — Guía de instalación en la PC de la tienda (Windows)

Todo corre **local en la PC táctil**: sin internet, sin servicios externos.
La app queda en `http://localhost:3210` (API + pantalla juntas, un solo puerto).

## 1. Requisitos

- Windows 10/11
- [Node.js LTS](https://nodejs.org) instalado (marca "Add to PATH")
- [NSSM](https://nssm.cc/download) (para que arranque solo al prender la PC) — descomprime `nssm.exe` en `C:\nssm\`
- Los dos repos copiados a `C:\mana\mana-pos-api` y `C:\mana\mana-pos-web`

## 2. Instalar y compilar (una sola vez, con internet)

```bat
cd C:\mana\mana-pos-web
npm install
npm run build

cd C:\mana\mana-pos-api
npm install
```

## 3. Configurar los equipos (variables de entorno del servicio)

| Variable | Valor en la tienda | Qué es |
|---|---|---|
| `MANA_DEVICES_MODE` | `real` | Activa impresora, cajón y balanza reales |
| `MANA_PRINTER_INTERFACE` | `printer:NOMBRE_IMPRESORA` o `\\.\COM5` | Fallback de la térmica (nombre de Windows o puerto) |
| `MANA_PRINTER_PAPER_MM` | `80` (o `58`) | Ancho del papel por defecto |
| `MANA_SCALE_SERIAL_PATH` | `COM3` | Puerto serial de la balanza (míralo en Administrador de dispositivos) |
| `MANA_SCALE_BAUD_RATE` | `9600` | Velocidad (dato del manual de la balanza) |

> **La impresora también se elige desde la pantalla**: en **Ajustes → Equipos**
> se lista lo instalado en Windows y se elige impresora y ancho de papel — eso
> manda sobre las variables y aplica desde la siguiente impresión, sin
> reiniciar. Las variables quedan como respaldo si nadie configuró nada.

Deja el resto por defecto: BD en `mana.sqlite`, backups en `backups\`, imágenes en `data\images\`.

## 4. Instalar como servicio de Windows (arranca solo)

Ejecuta `scripts\instalar-servicio-windows.bat` como administrador, o a mano:

```bat
C:\nssm\nssm.exe install ManaPOS "C:\Program Files\nodejs\npx.cmd" tsx src/main.ts
C:\nssm\nssm.exe set ManaPOS AppDirectory C:\mana\mana-pos-api
C:\nssm\nssm.exe set ManaPOS AppEnvironmentExtra MANA_DEVICES_MODE=real MANA_PRINTER_INTERFACE=printer:POS80 MANA_SCALE_SERIAL_PATH=COM3
C:\nssm\nssm.exe set ManaPOS AppStdout C:\mana\mana-pos-api\logs\mana.log
C:\nssm\nssm.exe set ManaPOS AppStderr C:\mana\mana-pos-api\logs\mana-error.log
C:\nssm\nssm.exe start ManaPOS
```

## 5. Modo kiosko en la pantalla táctil

Acceso directo en el escritorio (o en Inicio automático) con:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://localhost:3210
```

## 6. Primer uso

1. Entra con el PIN **2580** (usuario inicial "Dueño").
2. Ve a **Ajustes → Usuarios**: **CAMBIA ESE PIN YA** y crea al encargado y a
   las cajeras con sus propios PIN.
3. Ve a **Ajustes → Equipos**: elige la impresora instalada y el ancho de papel,
   **Imprimir prueba** y **abrir cajón** para verificar el hardware. El estado
   de la balanza sale ahí mismo.
4. Ve a **Ajustes → Voucher**: nombre de la tienda y mensaje final, con vista
   previa al ancho real del papel.
5. Ve a **Ajustes → Categorías**: ordena las pestañas de Vender y ponles ícono
   y color.
6. Ve a **Inventario → Importar Excel**: descarga la plantilla, llénala con tus
   productos y súbela (las categorías deben existir antes).
7. Ve a **Ajustes → Respaldo** (dueño): configura la carpeta externa (USB o red).
8. Abre la **Caja** con el fondo del día y a vender.

El manual completo de operación está en `docs/MANUAL-DE-USO.md`.

## 7. Modo entrenamiento (opcional)

Para que una cajera nueva practique sin tocar los datos reales:

```bat
cd C:\mana\mana-pos-api
set MANA_TRAINING=1&& set MANA_HTTP_PORT=3211&& npx tsx src/main.ts
```

Abre `http://localhost:3211`: verás la franja ámbar **MODO ENTRENAMIENTO** y una
BD aparte (`entrenamiento.sqlite`). Ciérralo con Ctrl+C cuando termine.

## 7b. Personalizar el voucher

En **Ajustes → Voucher** (solo encargado) cambias el nombre de la tienda, la
línea de dirección/RUC y el mensaje final, con vista previa. Se aplica desde la
siguiente impresión.

## 8. Backups

- El sistema crea solo un backup diario en `C:\mana\mana-pos-api\backups\` (guarda los últimos 14).
- **Recomendado**: una vez por semana copia esa carpeta a un USB.
- Restaurar = detener el servicio, reemplazar `mana.sqlite` por el backup, iniciar el servicio.

## 9. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| La pantalla dice "Sistema local sin responder" | El servicio ManaPOS está detenido → `nssm start ManaPOS` |
| No imprime | Cable USB / prendida → prueba desde **Ajustes → Equipos → Imprimir prueba**; verifica la impresora elegida y el ancho |
| Imprime pero con caracteres raros o nada por nombre de impresora | Algunos drivers necesitan el paquete opcional: `cd C:\mana\mana-pos-api && npm install printer` y reinicia el servicio |
| La balanza no marca | Puerto COM correcto y cable → el estado sale en **Ajustes → Equipos** |
| Se fue la luz a media venta | No pasa nada: la BD no se corrompe (WAL) y el ticket en curso sigue al volver |
