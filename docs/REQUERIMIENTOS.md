# Maná — Sistema de Gestión del Minimarket · Requerimientos (v3)

> Plantilla de trabajo. Marca cada ítem como: ✅ MVP · 🔜 Fase 2 · ❌ No aplica
> Decisiones ya tomadas por el dueño están marcadas como **[DECIDIDO]**.

---

## 1. Contexto

- **Negocio:** minimarket **"Maná"** — variedad (abarrotes, bebidas, limpieza, snacks) + frutas y verduras a granel
- **País/moneda:** Perú, soles (S/)
- **Punto de venta:** **[DECIDIDO]** 1 sola PC con pantalla táctil, Windows, usada por turno mañana y turno tarde
- **Usuarios:** personal de tienda (cajeras) y encargado → perfiles por usuario
- **Restricción clave:** **[DECIDIDO]** el sistema NO depende de internet — 100% offline/local
- **Facturación:** **[DECIDIDO]** no hay facturación electrónica por ahora; solo se imprime un voucher/comprobante interno en la térmica
  - *Nota a futuro: en Perú, SUNAT puede exigir boleta electrónica según el régimen del negocio. Dejar la puerta abierta (los datos del ticket ya quedan guardados), pero fuera del alcance actual.*

## 2. El sistema dirige el hardware

**[DECIDIDO]** El sistema es el director de orquesta: todos los aparatos se conectan a la PC y es el software quien les ordena actuar (imprimir, abrir cajón, leer peso). Ningún aparato actúa por su cuenta.

| Aparato | Estado | Integración |
|---|---|---|
**[DECIDIDO]** Se asume un modelo **estándar** para todos los periféricos — el sistema se desarrolla contra los protocolos genéricos de la industria y si un aparato real difiere, se ajusta el driver, no el sistema:

| Aparato | Modelo asumido (estándar) | Integración |
|---|---|---|
| PC pantalla táctil (Windows) | ✅ ya lo tiene | UI táctil, botones grandes |
| Lector de **código de barras** (solo 1D, no QR) | ✅ ya lo tiene | USB HID (emula teclado) — plug & play |
| Impresora térmica de vouchers | ✅ ya lo tiene — **ESC/POS estándar**, papel 80mm | El sistema manda la orden de impresión (USB) |
| Cajón de dinero | ✅ ya lo tiene | Se abre con pulso enviado por la impresora (comando ESC/POS `kick`) al cobrar |
| Balanza electrónica | **Se asume disponible y conectable** — protocolo serial estándar (RS-232/USB, salida continua tipo CAS/Toledo, 9600 baud) | El sistema lee el peso en vivo vía `serialport` |

### 2.1 Balanza — flujo de venta a granel
- Se desarrolla desde el MVP contra un **protocolo serial estándar** (salida continua de peso, el más común en balanzas comerciales). El driver queda aislado en un módulo: si la balanza real usa otro protocolo, solo se cambia ese módulo.
- Flujo en el POS: cajera pone las papayas → toca "Papaya" en pantalla → el sistema **lee el peso directo de la balanza** → calcula precio por kg → agrega la línea.
- **Fallback obligatorio:** captura manual del peso (por si la balanza falla o se desconecta).

## 3. Módulos funcionales

### 3.1 Punto de Venta (POS)
- [ ] Pantalla de venta rápida: escanear código o buscar por nombre
- [ ] UI táctil: botones grandes, sin depender de mouse ni teclado físico
- [ ] Búsqueda tolerante (sin tildes, parcial: "coca 600")
- [ ] Grilla de accesos rápidos para productos sin código (pan, verduras, dulces sueltos)
- [ ] Venta a granel: peso desde balanza conectada (o captura manual) × precio por kg
- [ ] **Formas de pago [DECIDIDO]:** efectivo (contado), **Yape** (solo se registra, sin integración), **tarjeta** (solo se registra, sin POS bancario integrado), **fiado**, y pago mixto (ej: mitad efectivo, mitad Yape)
- [ ] Cálculo de vuelto en efectivo
- [ ] Impresión del voucher al cobrar (orden la manda el sistema a la térmica) + opción "sin voucher"
- [ ] Apertura automática del cajón al cobrar en efectivo
- [ ] Cancelar/modificar línea antes de cobrar; anulación de ticket con PIN del encargado
- [ ] Descuentos por línea o por ticket (según perfil)
- [ ] Venta en espera / recuperar (cliente que fue por algo más)
- [ ] Devoluciones
- [ ] Reimprimir último voucher

### 3.2 Inventario
- [ ] Catálogo: código de barras, nombre, categoría, unidad (unidad/kg), precio compra, precio venta, stock, stock mínimo
- [ ] Productos por peso: precio por kg, stock en kg
- [ ] Alta rápida desde el POS (código desconocido → "¿registrar?")
- [ ] Descuento automático de stock al vender (unidades y kg)
- [ ] Entradas de mercancía (compras a proveedor)
- [ ] Ajustes con motivo: merma (clave en frutas/verduras), caducidad, robo, conteo
- [ ] Alertas de stock mínimo / lista "qué pedir"
- [ ] Equivalencias: caja/paquete → unidades (factor de conversión)
- [ ] Kardex (historial de movimientos por producto)

### 3.3 Precios
- [ ] Margen visible (compra vs venta)
- [ ] Cambio masivo por categoría (subió el proveedor → +5% a toda la categoría)
- [ ] Precios por volumen / mayoreo
- [ ] Promociones simples (2x1, oferta temporal) — Fase 2
- [ ] Historial de cambios de precio

### 3.4 Caja y turnos
- [ ] Apertura de caja con fondo inicial **por turno** (mañana / tarde)
- [ ] Corte/cierre de turno: esperado vs contado, diferencia, desglosado por forma de pago (efectivo / Yape / tarjeta / fiado)
- [ ] Retiros parciales de efectivo
- [ ] Gastos pagados desde caja con concepto
- [ ] Resumen del día (ambos turnos)

### 3.5 Clientes y fiado — **[DECIDIDO] va en el MVP**
- [ ] Registro simple de clientes (nombre, teléfono, DNI opcional)
- [ ] Venta al fiado con límite de crédito por cliente
- [ ] Abonos (en efectivo/Yape) y estado de cuenta
- [ ] Lista de deudores con antigüedad de deuda
- [ ] El fiado aparece en el corte como forma de pago separada (no es plata en el cajón)

### 3.6 Proveedores y compras
- [ ] Catálogo de proveedores (contacto, días de visita)
- [ ] Registro de compras → actualiza stock y costo
- [ ] Cuentas por pagar — Fase 2
- [ ] Pedido sugerido según ventas y stock mínimo — Fase 2

### 3.7 Reportes
- [ ] Ventas por día / turno / semana / mes, desglosadas por forma de pago
- [ ] Productos más y menos vendidos
- [ ] Utilidad (venta − costo) por período y producto
- [ ] Ventas por hora
- [ ] Mermas (frutas/verduras sobre todo)
- [ ] Valor del inventario (a costo y a venta)
- [ ] Deuda total de fiados
- [ ] Exportar a Excel/CSV

### 3.8 Usuarios y perfiles — **[DECIDIDO]**
- [ ] Perfiles: **encargado** (todo) y **cajera** (vender, cobrar, fiado; sin ver costos/utilidad ni ajustar inventario)
- [ ] Login rápido por PIN en pantalla táctil (teclado numérico grande)
- [ ] Cambio de usuario rápido entre turnos sin cerrar el sistema
- [ ] Auditoría: quién anuló, quién descontó, quién ajustó stock, quién abrió el cajón sin venta
- [ ] Acciones sensibles piden PIN del encargado

### 3.9 Comprobante (voucher)
- [ ] Voucher térmico con: nombre de la tienda, fecha/hora, cajera, líneas (producto, cantidad/peso, precio), total, forma de pago, vuelto
- [ ] Leyenda "comprobante interno — no es comprobante de pago SUNAT" (o el texto que prefieras)
- [ ] Formato configurable (logo en cabecera, mensaje al pie)

### 3.10 Velocidad en caja — **[DECIDIDO]**
- [ ] Todo por teclado, cero mouse. Atajos: **F2** buscar, **F4** pagar, **F9** deshacer última línea *(F2/F9 ya implementados; F4 y Enter=cobrar llegan con el módulo sales)*
- [ ] Búsqueda predictiva tolerante a typos ("cocacola" → Coca-Cola 600ml) ✅
- [ ] Código corto propio (3 dígitos) para lo de mostrador sin código de barras → *tarea 16*
- [ ] Botones fijos para los 12–20 SKUs de mostrador (pan, granel, bolsas) → *hoy: flag acceso rápido; grilla fija dedicada en tarea 16*
- [ ] **Enter = cobrar exacto en efectivo** (un teclazo cubre la mitad de las ventas) → *tarea 4*

### 3.11 Que no dependa de la memoria del cajero — *va con tarea 4 (sales)*
- [ ] Cálculo de cambio grande y visible, con sugerencia de billetes
- [ ] Confirmación SOLO en lo destructivo (anular ticket); nunca en lo rutinario
- [ ] Ticket en espera / múltiples tickets abiertos
- [ ] **Undo de la última línea** (no "cancelar todo") ✅ *(botón + F9)*

### 3.12 Tolerancia a errores — *va con tareas 4 y 5*
- [ ] Indicador de conexión y cola pendiente siempre visible *(barra de estado ya existe; cola pendiente con sales)*
- [ ] Cero spinners bloqueantes: optimistic UI — la venta se registra local y sincroniza después
- [ ] Precio/código no encontrado → captura manual con alerta al encargado, NO bloqueo
- [ ] Recuperación de sesión: si se reinicia la PC, el ticket abierto sigue ahí (persistir ticket en curso)

### 3.13 Onboarding — *tarea 16 + convención transversal*
- [ ] Un cajero nuevo cobra en 10 minutos sin manual
- [ ] Modo entrenamiento con datos falsos
- [ ] **Convención (aplica a TODOS los módulos):** mensajes de error en humano — "El escáner se desconectó, revisa el cable USB", nunca "ERR_DEVICE_TIMEOUT"

## 4. Requerimientos no funcionales

| Requerimiento | Detalle |
|---|---|
| **Offline total** | Cero dependencia de internet para operar |
| **Velocidad** | Escaneo → línea en pantalla <200ms; leer balanza <1s |
| **Táctil primero** | Toda la operación de venta posible solo con dedos |
| **Respaldos** | Backup automático diario local (y a USB/nube cuando haya internet); restauración probada |
| **Simplicidad** | Una cajera nueva aprende a cobrar en 10 minutos |
| **Robustez** | Corte de luz a media venta ≠ base de datos corrupta; el sistema arranca solo al prender la PC |
| **Multi-turno** | Cambio mañana→tarde en segundos, cada quien con su sesión |

## 5. Tecnología propuesta

| Capa | Tecnología | Nota |
|---|---|---|
| Backend | Node.js + TypeScript (Fastify) | Corre como servicio de Windows (NSSM o similar), arranca con la PC |
| Base de datos | SQLite (WAL mode) + Drizzle | Local, backup = copiar un archivo, aguanta cortes de luz |
| Frontend | React + Vite, UI táctil | Se abre en el navegador en modo kiosko (pantalla completa) |
| Impresora + cajón | `node-thermal-printer` / ESC/POS por USB | El cajón se abre con el comando kick de la impresora |
| Lector QR/códigos | Nada especial | Es un teclado USB (HID); el POS captura el escaneo |
| Balanza | `serialport` (npm) leyendo RS-232/USB | Módulo con driver por protocolo, para soportar la balanza que compres |
| Backups | Tarea programada: copia del `.sqlite` + copia a USB/Drive | |

**Arquitectura en una línea:** una sola app local en la PC de la caja; el backend habla con todos los aparatos (impresora, cajón, balanza) y el frontend táctil habla solo con el backend. Si mañana quieres ver reportes desde el celular (§7), el mismo backend se expone en la red local o sincroniza a nube — sin rehacer nada.

## 6. Alcance del MVP — **[DECIDIDO]**

1. Catálogo de productos (con y sin código de barras, por unidad y por kg)
2. POS táctil: escanear/buscar/accesos rápidos, granel con **lectura de balanza en vivo** (+ fallback manual), cobrar
3. Formas de pago: efectivo, Yape (registro), tarjeta (registro), fiado, mixto
4. Impresión de voucher + apertura de cajón
5. Descuento automático de stock
6. Fiado: clientes, límite, abonos, deudores
7. Caja por turnos: apertura, corte con desglose por forma de pago
8. Perfiles encargado/cajera con PIN + auditoría básica
9. Reporte de ventas del día/turno
10. Backup automático

### Fase 2
- Proveedores y compras formales, alertas de stock, promociones, cambio masivo de precios, reportes avanzados, mermas

### Fase 3 / anotado para después
- **Ver ventas desde el celular fuera de la tienda** (pedido explícito: "de momento no, pero anótalo") → requiere componente nube o túnel; el diseño local-first lo permite sin rehacer
- Integración real con Yape / POS bancario
- Boleta electrónica SUNAT si el negocio lo requiere
- Multi-caja / multi-sucursal

## 7. Identidad visual — "Maná"

- **Concepto:** maná = alimento provisto cada día → frescura, abundancia sencilla, tienda de barrio confiable.
- **Paleta:** verde profundo de mercado (frutas/verduras, frescura) como color primario + ámbar/trigo (el "maná", pan, calidez) como acento. Fondos claros cálidos, tinta casi negra cálida. Rojo reservado solo para acciones destructivas (anular).
- **Wordmark:** "maná" en minúsculas, redondeado y cercano.
- **UI:** táctil primero — botones grandes (mín. 48px), tarjetas de producto con color por categoría, panel de ticket siempre visible a la derecha, barra de estado con balanza/impresora/turno.
- Referencias de inspiración: patrones de POS en Dribbble/Behance (grillas de producto + ticket lateral + barra de pago inferior), principios: menos taps por venta, alto contraste, funciones frecuentes al frente.
- **Mockup:** ver artifact "Maná POS" (mockup navegable de la pantalla de venta).

## 8. Pendientes de decisión

1. Texto exacto del voucher (razón social si aplica, mensaje al pie).
2. Validar el mockup de diseño con las cajeras (¿los botones se entienden sin explicación?).
