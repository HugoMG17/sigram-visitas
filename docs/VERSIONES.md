# Versiones de SIGRAM APP

La versión se ve en la cabecera de la app, debajo del nombre, y en los datos de
la aplicación en Android. Sirve para saber de un vistazo si una actualización
ya ha llegado.

**Cómo se numeran:** se sube el segundo número en cada tanda de cambios (1.1,
1.2, 1.3…) y el primero solo si algún día cambia algo de fondo. Sin más reglas.

---

## 1.1.0 — 1 de agosto de 2026

### Novedades

- **Descargar todas las fotos de una visita.** Botón verde *Descargar fotos*
  junto a *Exportar PDF*, que baja un ZIP con todas las fotos de la visita
  **organizadas en carpetas**: una por cada punto (numerada y con su título) y
  otra de *Fotos generales*. Dentro de cada carpeta las fotos van numeradas
  desde 1. Antes había que bajarlas de una en una.
- **Editar el título de un punto.** Un botón de lápiz junto al título lo
  convierte en un campo editable: se guarda con Enter o al salir, y se cancela
  con Escape. Hasta ahora el título se escribía al crear el punto y ya no había
  forma de cambiarlo; solo se podía editar la descripción.

### Nota

Si se deja el título de un punto vacío, se recupera el que tenía: un punto sin
título no habría manera de identificarlo en el informe.

---

## 1.0 — 31 de julio de 2026

Primera versión numerada. La app ya estaba en uso; a partir de aquí cada
publicación queda registrada aquí.

**La app pasa a llamarse SIGRAM APP** (antes SIGRAM VISITAS): las visitas de
obra son el primer apartado, pero está pensada para ir sumando otros.

> El identificador interno de la aplicación Android (`com.sigram.visitas`) y el
> nombre de la carpeta de Google Drive se mantienen a propósito. Cambiarlos
> haría que Android la tratara como una app distinta —instalándose aparte en
> lugar de actualizarse— y que las fotos nuevas fueran a una carpeta distinta
> de las que ya hay. Son nombres que nunca se ven.

### Qué hace la app

**Obras.** Ficha con nº de expediente, nombre, estado, dirección y referencia
catastral. Buscador por expediente o nombre. Los agentes de la edificación se
registran con nombre y DNI, admitiendo **varias personas por rol**: Promotor,
Dirección Facultativa (Director de obra, Director de ejecución y Coordinador de
seguridad y salud en fase de ejecución, más los **roles libres** que se
necesiten), Constructor y Proyectista. Cada obra puede llevar su **logo**.

**Visitas.** Dentro de cada obra, con fecha, título y anotaciones. Admiten
**fotos generales** y **puntos** de seguimiento; cada punto tiene su título,
descripción, sus propias fotos y un estado (Vacío, Pendiente o Solucionado).
Los puntos se pueden reordenar, y se pueden **importar los pendientes** de
otras visitas de la misma obra para continuar su seguimiento, copiándolos con
sus fotos y sin tocar los originales.

**Informe en PDF.** Se genera en el servidor con la cabecera de la obra y su
logo arriba a la derecha, los agentes con su denominación profesional, las
notas de la visita, las fotos generales, cada punto con su estado y sus fotos,
el espacio de firmas y la numeración de páginas. El archivo sale nombrado con
la fecha delante, para que se ordene solo.

**Funciona sin cobertura.** Todo se guarda primero en el dispositivo y se
sincroniza solo al recuperar conexión, que es lo que permite trabajar a pie de
obra. Las fotos se guardan en el Google Drive de cada usuario.

**Dónde se usa.** Como web (también instalable) y como aplicación Android.

### Novedades de esta versión

- **Logo por obra** en la cabecera del informe PDF, con un apartado para
  subirlo al final del formulario de obra.
- **Roles libres en la Dirección Facultativa**, para los profesionales que no
  son los tres habituales.
- **Ficha de obra más limpia**: al entrar solo se ven expediente, nombre,
  estado y dirección; el resto se consulta al editar.
- **Fotos generales sin encabezado** en el PDF.
- **La app se actualiza sola** tras cada publicación. Espera si hay un
  formulario abierto o quedan cambios sin sincronizar, y nunca borra datos.
  Se acabó tener que borrar los datos del sitio con F12 para ver los cambios.
- **La versión se muestra en la cabecera**, bajo el nombre de la app.

### Arreglos

- **Los logos reales no se podían guardar** (el servidor rechazaba envíos de
  más de 100 KB y respondía un error genérico).
- **Los errores dejan de disfrazarse** de "error interno": un envío demasiado
  grande ahora lo dice.
- **Logos mucho más ligeros**: se elige el formato según tenga o no
  transparencia.
- **Exportar el PDF exige que la obra esté sincronizada**; antes podía salir un
  informe sin el logo recién puesto y sin avisar.
- **Ya no se cierra la sesión en cada publicación.** Las sesiones vivían en la
  memoria del servidor y se perdían en cada despliegue o al despertar el
  servicio; ahora se guardan en la base de datos.
- **Los ficheros de la app dejan de estar tras el login.** La comprobación
  automática de versión recibía un error de autenticación en vez del fichero y
  fallaba en silencio. Los datos (obras, fotos y PDF) siguen protegidos.
- **El nombre del constructor no se guardaba** al editar una obra.
- **Al borrar una obra, una visita o un punto, sus fotos se quedaban en
  Drive.** Solo se borraba el fichero al eliminar una foto suelta, así que el
  resto se acumulaba ocupando espacio y sin forma de llegar a él, pese a que
  el mensaje de confirmación decía "con todos sus puntos y adjuntos". Ahora se
  eliminan de verdad, y también se liberan del móvil.

### Notas

Al instalar esta versión puede pedirse iniciar sesión una última vez: las
sesiones anteriores no eran recuperables. A partir de aquí ya no.

Las fotos de lo que se borrara **antes** de esta versión siguen en Drive: el
arreglo se aplica a los borrados de aquí en adelante, no a los pasados.
