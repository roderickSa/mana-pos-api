# Maná POS — Manual de uso

Para quien atiende el mostrador (cajera) y para quien administra (encargado/dueño).
Todo funciona **sin internet**; los datos viven en la PC de la tienda.

Los roles: **Cajera** vende, cobra y consulta sus ventas de hoy. **Encargado** ve
todo el sistema (inventario, compras, ajustes). **Dueño** además maneja usuarios
dueño y los respaldos. Cada uno entra con su PIN.

---

## 1. Entrar y salir

- Teclea tu **PIN** (4–6 dígitos) y Enter. El teclado físico también sirve.
- **F10** o el botón Salir **bloquean la pantalla** sin perder la venta en curso:
  el ticket sigue ahí cuando alguien vuelve a entrar.
- La sesión expira sola a las 12 horas.

## 2. Vender (la pantalla principal)

### Agregar productos
- **Escanea** el código de barras: el producto entra solo, aunque no esté a la vista.
- **Teclea el código corto** (1–3 dígitos, el `#N` del tile) y Enter — para pan,
  huevos y lo de mostrador.
- **Toca el tile** del producto en la grilla, o búscalo por nombre.
- **Pesables**: al tocarlos se abre la balanza; sin balanza, teclea los **GRAMOS**
  a mano (500 = medio kilo).
- **Multiplicador**: teclea `3*` y el siguiente producto entra ×3.

### La línea del ticket
Toca cualquier línea del carrito y se abre su **panel de acciones**: cambiar
cantidad (teclado grande), repesar, descuento o eliminar. El ✕ de la fila
también elimina (Ctrl+Z o «Deshacer» la recupera).

### Avisos en la grilla
- **"Quedan N"** en ámbar = stock bajo el mínimo; **"Sin stock"** = tile apagado
  (escanear sigue vendiendo — el sistema nunca bloquea una venta por stock).
- **"VENCIDO"** en rojo = Inventario detectó un lote vencido de ese producto.
  Se puede vender igual (puede ser el lote nuevo el que está adelante), pero
  revísalo antes.

### Descuentos
- **Por línea**: hasta 20% lo aplica la cajera sola; más, pide el PIN del encargado.
- **A toda la venta**: siempre pide PIN del encargado.
- Todo descuento queda registrado con quién lo autorizó.

### Cliente en la venta (opcional)
Botón **👤 Cliente**: busca o crea al cliente (nombre y teléfono) y la venta
queda a su nombre — sirve para el historial, no solo para fiar.

### Cobrar
1. Elige el método: **Efectivo · Yape (F5) · Tarjeta (F6) · Fiado (F7)**.
2. **F4** o el botón grande.
3. En efectivo: teclea con cuánto paga (o botones de billetes) y el **vuelto se
   calcula en vivo**; vacío = pago exacto. **Pago dividido** («paga 20 en
   efectivo y el resto Yape») desde el mismo modal.
4. Fiado: exige cliente y respeta su límite de crédito.
5. El voucher sale solo; suena un doble bip de confirmación.

> **El redondeo**: los precios van en pasos de S/ 0.10 y el total se redondea
> UNA sola vez al múltiplo de 0.10 más cercano. Si hubo redondeo, la pantalla y
> el voucher lo muestran («Redondeo +0.05»).

### Atajos completos
`F1` los muestra en pantalla: F2 buscador, Enter cobro rápido, F4 cobrar,
F5/F6/F7 método, F8 consulta de precio, F9/Supr quitar línea, ↑↓ moverse,
+/− cantidad, Ctrl+Z deshacer, `N*` multiplicador, F10 bloquear, Esc cerrar.

## 3. Caja

- **Abrir turno** (mañana/tarde) con el fondo inicial contado.
- **Movimientos**: retiros, gastos y depósitos con concepto — todo resta o suma
  al efectivo esperado.
- **Cierre a ciegas**: cuentas el cajón y tecleas el total SIN ver el esperado;
  el sistema recién ahí revela la diferencia. Si descuadra, pide una nota.
- En **Cierres anteriores**: verde «cuadró», ámbar «sobró», rojo «faltó».
- El corte imprime el resumen del turno (ventas por método, retiros, etc.).

## 4. Ventas (historial)

- Abre en **Hoy**; chips rápidos Hoy/Ayer/7 días/Mes, fechas libres Desde/Hasta
  (vacías = todo el histórico). La cajera solo ve el día.
- **Voucher** de cada venta en detalle tipo ticket: líneas, descuentos, redondeo,
  pagos, devoluciones y el neto «queda cobrado». Se puede **reimprimir**.
- **Anular** (PIN encargado + motivo): repone el stock completo y descuenta de caja.
- **Devolver** (parcial o total): eliges qué líneas y cuánto; el sistema devuelve
  exactamente lo cobrado (proporcional a descuentos y redondeo), repone stock,
  registra la salida de caja e imprime constancia. Si la venta fue fiada, la
  devolución abona a la deuda en vez de salir efectivo.
- **⬇ Descargar CSV** con los filtros puestos.

## 5. Clientes

- **Directorio**: libreta completa — crear, editar, límite de fiado, estado de
  cuenta, y **Abonar** si debe.
- **Fiado**: la cobranza — deuda, desde cuándo, disponible, **Abonar** (efectivo
  o Yape, entra a caja) y recordatorio por **WhatsApp** con mensaje pre-armado.
- La deuda en rojo, lo «a favor» en verde. Los totales de arriba son de toda la
  lista, no solo de la página.

## 6. Inventario (encargado)

- **Productos**: búsqueda, filtro por categoría, orden por columna (Producto,
  Stock, Precio, Margen), chips «sin costo» y «stock bajo». Acciones por fila:
  editar, precio, entrada, ajuste, conteo, kardex, fusionar duplicados.
- **Precios…**: cambio masivo por categoría/proveedor (% o soles) y sugerencias
  para productos con margen bajo — siempre con vista previa y una confirmación
  que muestra cuántos productos cambian y el impacto promedio.
- **Entrada de mercancía**: por unidades o por cajas, costo y vencimiento
  opcional. Si el producto tiene una orden de compra abierta, la entrada se
  vincula sola a la orden (baja su pendiente).
- **Ajustes de stock**: merma, vencido, robo/pérdida y conteo físico.
- **Por vencer**: lotes ordenados por urgencia, con merma directa del lote.
- **Kardex**: todos los movimientos (últimos 7 días por defecto) con la columna
  de **saldo** después de cada movimiento, filtros y export CSV.
- **Excel**: exporta todo el inventario (sirve de respaldo legible) e importa
  productos nuevos desde la plantilla.

## 7. Compras (encargado)

- **Nueva orden**: proveedor, productos (en cajas si compran por caja, en kilos
  los pesables) con «reposición sugerida» para llegar a 2× el mínimo.
- **Recibir mercadería**: total o parcial (la orden queda «parcial»); cada
  recepción actualiza stock, costo y lote con vencimiento.

## 8. Ajustes (encargado; respaldos y usuarios dueño, solo dueño)

- **Voucher**: nombre de tienda, línea extra y mensaje final, con vista previa
  al ancho real del papel (32 o 48 columnas).
- **Equipos**: elegir impresora del sistema y ancho de papel (58/80 mm) — se
  aplica desde la siguiente impresión, sin reiniciar. **Imprimir prueba** y
  **abrir cajón** para verificar el hardware. Estado de la balanza en vivo.
- **Categorías**: crear/editar con ícono y color (visten los tiles de Vender),
  reordenar (define el orden de las pestañas), desactivar o eliminar
  reasignando los productos.
- **Usuarios**: crear cajeras/encargados, resetear PIN, desactivar. Las cuentas
  de dueño solo las edita otro dueño.
- **IGV**: tasa referencial para los reportes del dueño (el voucher es
  comprobante interno; no es facturación electrónica).
- **Respaldo** (dueño): carpeta externa (USB/red) además del backup diario local.

## 9. Los sonidos

- **Bip corto agudo**: acción registrada (producto agregado, línea quitada,
  descuento aplicado).
- **Doble bip ascendente**: operación completada (venta cobrada, caja abierta,
  abono, precios aplicados).
- **Tono grave doble**: algo falló — mira la pantalla.

## 10. Problemas frecuentes

| Pasa esto | Haz esto |
|---|---|
| «La caja está cerrada» al vender | Abre el turno en **Caja** |
| «Tu sesión expiró» | Vuelve a entrar con tu PIN (la venta en curso se conserva) |
| No imprime | **Ajustes → Equipos → Imprimir prueba**; revisa cable/papel |
| El producto no aparece al escanear | Créalo en Inventario o agrégale ese código de barras (alias) |
| Se cobró mal una venta | **Ventas → detalle → Anular** (PIN encargado) y véndela de nuevo |
| Descuadre en el cierre | Es normal que pida nota: escribe qué pasó y cierra igual |
