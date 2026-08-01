# Maná POS en modo kiosco (PC Windows de la tienda)

La cajera no debe ver la barra de direcciones ni las pestañas del navegador.
Con el API corriendo como servicio (sirve el front compilado en el mismo
puerto), crear un acceso directo en el escritorio con uno de estos comandos:

## Edge (viene con Windows)

```
msedge.exe --kiosk http://localhost:3210 --edge-kiosk-type=fullscreen --no-first-run
```

## Chrome

```
chrome.exe --kiosk --app=http://localhost:3210 --no-first-run
```

Notas:

- Salir del kiosco: `Alt+F4` (Edge fullscreen bloquea casi todo lo demás).
- Poner el acceso directo en `shell:startup` para que arranque solo al
  encender la PC (el servicio del API ya arranca con Windows).
- El zoom por doble tap ya está deshabilitado en la app (`user-scalable=no`);
  el teclado físico y el lector de códigos funcionan igual dentro del kiosco.
- Si la pantalla táctil dispara el teclado virtual de Windows sobre los
  inputs, desactivarlo en Configuración → Dispositivos → Escritura: la app ya
  tiene keypad propio para peso, cobro, abonos y arqueo.
