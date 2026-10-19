# Diseño de SIGRAM APP

Estas son las decisiones de aspecto de la app, escritas para que no se pierdan
y para que lo nuevo que se añada encaje sin tener que adivinar.

De momento se aplican a la **lista de obras** y a la **ficha de una obra**. El
resto de pantallas hereda los colores, la letra y los botones, pero su
composición todavía es la de antes.

## La idea

**El cromo no lleva color.** Botones, bordes y texto en tinta; el color queda
reservado para lo que significa algo. Si todo está bien, la pantalla es gris,
blanca y negra. Cuando aparece un color, es porque hay algo que saber.

Los colores salen del logo, y cada uno tiene un trabajo:

| Color | Dónde | Qué dice |
|---|---|---|
| Teal `#0b5d6b` | botón de la acción principal | lo que vienes a hacer aquí |
| Teal `#007b85` | el tramo marcado de la barra de fase | en qué fase está la obra **ahora** |
| Verde `#007d52` | barra y nombre de una obra finalizada | terminada, no pide nada |
| Ámbar `#fdf4e3` | etiqueta "Sin subir", "Sin conexión" | hay trabajo guardado solo en este aparato |
| Rojo `#a8191f` | "Paralizada", fallos de sincronización, "Eliminar" | algo pide una decisión |
| Gris `#8a8a8a` | fases ya pasadas, datos secundarios | ya está hecho, o no es lo importante |

### Por qué no son los colores del logo tal cual

El cian y el verde del logo son `#00ecff` y `#01fea7`. Sobre blanco dan
**1,45:1** y **1,33:1** de contraste, cuando el mínimo legible es 4,5:1. Son
colores de pantalla encendida: preciosos en el mark, ilegibles en un botón, y
a pleno sol en el móvil directamente invisibles.

Así que el mark va con su degradado tal cual, y todo lo demás usa **el mismo
tono bajado de brillo** hasta pasar el contraste. Son los de la tabla.

Nada más lleva color. Un botón azul "porque es un botón" rompe el sistema: en
cuanto todo es color, el color deja de avisar de nada.

## El fondo y la letra

- **Fondo gris piedra `#f4f3f1`**, no gris azulado. Es el color de la cal y el
  mortero, y a pleno sol cansa menos la vista que un azulado.
- **El mark del logo** en la cabecera, a 38×27 px, en `client/public/brand`.
  Sale recortado del icono de Android, con el fondo blanco quitado, y se
  guarda en la caché del service worker como las tipografías.
- **Archivo**, una grotesca de rotulación industrial. Va **dentro de la app**,
  en `client/public/fonts`, y entra en la caché del service worker
  (`includeAssets` en `client/vite.config.ts`): si se cargara desde Google, la
  primera carga sin cobertura se quedaría con la letra del sistema.
- Las cifras llevan `tabular-nums` (clase `.num`, fechas y contadores): todos
  los dígitos ocupan lo mismo, así las fechas de una lista quedan en columna.

## La barra de fase

El elemento propio de SIGRAM. Cuatro tramos, uno por fase de una obra:
redacción de proyecto → tramitación de licencia → ejecución → finalizada. El
tramo de ahora va en azul, los pasados en gris, los que faltan vacíos.

No es un dato nuevo: es el campo `estado` que ya se guardaba, dibujado como lo
que de verdad es. Está en `client/src/components/FaseObra.tsx`.

"Paralizada" no es un paso de la secuencia, así que se dibuja sin ningún tramo
marcado y con el nombre en rojo: es la única obra de la lista que pide hacer
algo.

Donde hay barra de fase **no se pone además una etiqueta de estado**: las dos
dirían lo mismo.

## Reglas al añadir pantallas

- **Una sola acción principal por pantalla**, en tinta. Lo demás, botón gris
  (`.btn-secondary`) o texto suelto.
- **Lo destructivo va en texto, sin recuadro** (`.btn-danger`), y nunca con el
  mismo peso que lo que se usa a diario.
- **Zona táctil de 44 px como mínimo** en todo lo que se toca. Se usa con
  guantes y con una mano.
- **El título de la pantalla entre 19 y 24 px**, nunca más: esto es una
  herramienta, no una página de presentación.
- **El texto de datos a 14-15 px** y en tinta. El gris es para lo secundario;
  una pantalla entera en gris claro parece sin terminar y al sol no se lee.
- **Decir el cero.** "Sin puntos" se escribe; no se deja el hueco en blanco,
  que parece que está cargando.
- **Bajo cada título, una línea que cuente lo que hay** ("4 visitas · 2 puntos
  pendientes en la última"), calculada sobre lo que se está viendo.
- **Toda lista es `<ul>`/`<li>`** con su `aria-label`, no un montón de `<div>`.
- **Todo campo lleva etiqueta**, aunque sea solo para el lector de pantalla
  (clase `.solo-voz`). El texto de dentro del campo no cuenta: desaparece al
  escribir.
- **Lo que aparece solo, se anuncia**: `aria-live="polite"` en recuentos,
  "Cargando…" y avisos de sincronización.
- **Lo que se toca lleva `touch-action: manipulation`**, o Android mete un
  retardo de 300 ms y zoom por doble toque.
- **Los márgenes usan `env(safe-area-inset-*)`**, o en el APK con navegación
  por gestos el contenido se mete bajo las barras del sistema.

## Probar el diseño

El revisor abre un navegador limpio, con la base de datos vacía. Para ver las
pantallas con contenido:

```
http://localhost:5173/?seed=demo
```

Siembra seis obras y cinco visitas de ejemplo (`client/src/dev/seedDemo.ts`).
**Solo funciona en desarrollo**: en la versión publicada ese código no existe.
