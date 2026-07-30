# Entornos: producción y pruebas

Hay **un solo código** (este repositorio) desplegado **dos veces**. No hay ningún
clon del proyecto: así cada arreglo se hace una vez y los dos entornos no
divergen.

| | Producción (la que se usa en obra) | Pruebas |
|---|---|---|
| Rama git | `main` | `pruebas` |
| Web | https://sigram-visitas.onrender.com | https://sigram-visitas-pruebas.onrender.com |
| Base de datos | Turso de producción | Turso de pruebas (aparte y vacía) |
| Fotos en Drive | carpeta `SIGRAM VISITAS` | carpeta `SIGRAM VISITAS (pruebas)` |
| APK del móvil | apunta aquí | no se usa: las pruebas se hacen en el navegador |
| Aviso en la cabecera | ninguno | etiqueta roja **PRUEBAS** |

Nada de lo que se haga en pruebas toca las obras reales: son bases de datos
distintas y carpetas de Drive distintas.

## Cómo se trabaja

1. **Desarrollar** en la rama `pruebas`. Cada `git push` a esa rama despliega
   **solo** el sitio de pruebas; producción no se entera.
2. **Probar** en https://sigram-visitas-pruebas.onrender.com (desde el PC o
   desde Chrome en el móvil). La etiqueta roja **PRUEBAS** en la cabecera
   confirma que no es el sitio real.
3. **Publicar** cuando haya varios cambios ya validados:
   ```bash
   git checkout main
   git merge pruebas
   git push
   ```
   Eso despliega producción.
4. **Regenerar el APK** solo después de publicar, y solo si los cambios afectan
   a la app del móvil (los cambios del informe PDF, por ejemplo, no lo
   necesitan: el PDF se genera en el servidor).

## Variables de entorno del servicio de pruebas (Render)

| Variable | Valor |
|---|---|
| `TURSO_DATABASE_URL` | URL de la base de datos **de pruebas** |
| `TURSO_AUTH_TOKEN` | token de esa base de datos |
| `PUBLIC_URL` | `https://sigram-visitas-pruebas.onrender.com` |
| `DRIVE_FOLDER_NAME` | `SIGRAM VISITAS (pruebas)` |
| `GOOGLE_CLIENT_ID` | el mismo que producción |
| `GOOGLE_CLIENT_SECRET` | el mismo que producción |
| `SESSION_SECRET` | uno nuevo, distinto al de producción |
| `ALLOWED_GOOGLE_EMAIL` | el email propio, para que el sitio de pruebas sea privado |

`DRIVE_FOLDER_NAME` es opcional: si no se define, se usa `SIGRAM VISITAS`
(por eso producción no necesita tocarse).

## Alta del servicio de pruebas (una sola vez)

1. **Turso**: crear una base de datos nueva (p. ej. `sigram-pruebas`) y copiar
   su URL y su token. No hace falta crear las tablas a mano: el servidor las
   crea solas al arrancar (`ensureSchema`).
2. **Render**: nuevo *Web Service* desde el repo `HugoMG17/sigram-visitas`,
   rama **`pruebas`**, entorno **Docker** (usa el `Dockerfile` del repo),
   nombre `sigram-visitas-pruebas`. Rellenar las variables de la tabla de
   arriba.
3. **Google Cloud Console** → credenciales OAuth → *URIs de redirección
   autorizados* → añadir:
   ```
   https://sigram-visitas-pruebas.onrender.com/auth/google/callback
   ```
   Sin esto, el login del sitio de pruebas falla.

En el plan gratuito de Render el sitio de pruebas se duerme cuando no se usa:
la primera carga tras un rato tarda 30-60 s. Es normal y no afecta a
producción.
