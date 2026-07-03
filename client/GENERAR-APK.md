# Cómo generar el APK de Android (SIGRAM VISITAS)

La app Android es el mismo cliente web empaquetado con Capacitor. Funciona
100% offline (los datos viven en el dispositivo y sincronizan al recuperar
conexión) y habla con el servidor de producción (`sigram-visitas.onrender.com`).

## Requisitos (solo la primera vez)

1. Instalar **Android Studio** (https://developer.android.com/studio) —
   incluye el SDK de Android y el JDK. Con la instalación por defecto basta.
2. `npm install` en la raíz del proyecto (si no está hecho ya).

## Generar el APK

Desde `client/` en una terminal:

```
npm run build
npx cap sync android
npx cap open android
```

Eso abre el proyecto en Android Studio. Ahí:

1. Esperar a que termine la sincronización de Gradle (barra inferior).
2. Menú **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
3. Al terminar sale una notificación con el enlace **"locate"**: el APK está
   en `client/android/app/build/outputs/apk/debug/app-debug.apk`.

## Instalarlo en el móvil

- **Por USB**: conectar el móvil con la depuración USB activada y darle al
  botón ▶ (Run) en Android Studio con el móvil seleccionado.
- **Sin cable**: enviarse el `app-debug.apk` (Drive, WhatsApp...) y abrirlo
  en el móvil. Android pedirá permitir "instalar apps de origen desconocido".

## Cosas a saber

- **Login**: el botón "Iniciar sesión con Google" abre Chrome (el navegador
  del sistema, obligatorio para Google). Mientras la app no esté verificada
  por Google aparecerá el aviso "Google no ha verificado esta aplicación" —
  se continúa por "Configuración avanzada → Ir a sigram-visitas.onrender.com".
  Tras el login, Chrome devuelve el control a la app automáticamente.
- **Offline**: tras el primer login, la app entra directa aunque no haya
  conexión y todo lo creado se sincroniza al recuperarla (igual que la web).
- **Actualizar la app** tras cambios en el cliente: repetir los tres comandos
  de arriba y volver a generar el APK.
- Para distribuir a otros arquitectos conviene un **APK firmado de release**
  (Build → Generate Signed App Bundle / APK, creando una keystore la primera
  vez); el de debug vale para probar en tus propios dispositivos.
