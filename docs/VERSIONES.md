# Versiones de SIGRAM APP

La versión se ve en la cabecera de la app, debajo del nombre, y en los datos de
la aplicación en Android. Sirve para saber de un vistazo si una actualización
ya ha llegado.

**Cómo se numeran:** se sube el segundo número en cada tanda de cambios (1.1,
1.2, 1.3…) y el primero solo si algún día cambia algo de fondo. Sin más reglas.

---

## 1.4.0 — 20 de octubre de 2026

### Novedades

- **Exportar la lista de Musaat a PDF.** Botón *Exportar PDF* en el apartado
  Musaat, al lado de *Nueva obra*. Sale una hoja apaisada con una fila por
  obra y una columna por intervención: la fecha si está enviada, *No procede*
  en gris si no te corresponde, y **Falta** en rojo si está pendiente.
- **Exporta lo que estás viendo.** Si tienes puesto el filtro de *Falta algo*
  o una búsqueda, el PDF sale con eso mismo, y lo dice bajo el título. Arriba
  a la derecha, el recuento y la fecha en que se generó.
- Las observaciones de cada obra salen en una línea bajo su nombre.

### Arreglos

- **La casilla del nombre de cada agente se quedaba estrecha** en el
  formulario de obra, con un hueco en blanco a su derecha: un nombre largo
  como “DIPUTACIÓN PROVINCIAL DE CÁCERES” salía cortado teniendo sitio de
  sobra al lado. Ahora ocupa todo el ancho que le queda, y la casilla del
  documento se queda en el suyo, que es de largo conocido.

### Nota

El PDF lo genera el servidor a partir de sus propios datos, así que hace falta
tener todo sincronizado. Si queda algo sin subir, el botón no aparece y la
pantalla te lo dice.

---

## 1.3.1 — 20 de octubre de 2026

### Arreglos

- **La app del móvil parpadeaba al abrirla y se quedaba en blanco tras
  iniciar sesión.** No era un problema de dibujo: la app se estaba
  reiniciando varias veces por segundo.

  Al arrancar se ponía a sincronizar aunque todavía no hubiera sesión. Sin
  sesión, el servidor contesta «no autenticado» a la primera petición; la app
  lo entendía como una sesión caducada, borraba el token y se recargaba. Al
  volver a arrancar hacía lo mismo, y así sin parar.

  Se arregla por los dos lados: la app ya no sincroniza si no hay sesión, y
  una sesión caducada provoca **una sola** recarga por arranque. Si después de
  recargar el servidor sigue diciendo que no, la app se queda quieta en la
  pantalla de login en vez de parpadear.

  El fallo también podía saltar con la sesión puesta: bastaba un «no
  autenticado» suelto —por ejemplo justo después de entrar, mientras el
  servidor despertaba— para quedarse sin token y entrar en el bucle.

### Nota

El servidor duerme cuando no se usa, así que la primera entrada del día puede
tardar entre 30 y 60 segundos. Eso es normal y no es este fallo: lo que no era
normal es que la app parpadeara mientras tanto.

---

## 1.3.0 — 19 de octubre de 2026

Esta publicación junta todo lo trabajado desde la 1.1: el cambio de aspecto,
la agenda de agentes y el control de Musaat. La 1.2 llegó a apuntarse mientras
se trabajaba, pero nunca se publicó, así que todo sale junto aquí.

### La app cambia de aspecto

- **Se parece a tu estudio.** El logo de SIGRAM está en la cabecera, y los
  colores de la app salen de él: el teal del botón principal y el de la barra
  de fase son los tonos del propio logo, bajados de brillo hasta que se leen
  al sol. El cian y el verde del logo tal cual dan 1,4:1 de contraste: sirven
  para el dibujo y para nada más.
- **Fondo gris piedra** en vez del gris azulado, y una tipografía nueva
  (Archivo) que va **dentro de la app**: se ve igual sin cobertura.
- **La cabecera azul oscura desaparece.** En el móvil eso devuelve unos 300 px
  antes de ver la primera obra.
- **Cada obra lleva su barra de fase**: los cuatro pasos por los que pasa
  (proyecto, licencia, ejecución, finalizada), con el de ahora marcado. Una
  obra parada es lo único rojo de la lista, porque es lo único que pide una
  decisión; una terminada se dibuja entera en verde.
- **La ficha de obra responde a lo que vas a mirar**: cada visita dice cuántos
  puntos deja pendientes y cuántos resueltos, y arriba pone cuántos quedan en
  la última.
- **La sincronización se vuelve discreta.** Si está todo subido no se pinta
  nada. Los fallos dejan de ser dos párrafos rojos a pantalla completa.
- **Se lee y se toca mejor**: textos más grandes y con más contraste, botones
  de 44 px, se va el retardo de ~300 ms al tocar en Android, y el contenido ya
  no se mete debajo de las barras del sistema.

### Novedades

- **Agentes: una agenda propia.** Apartado nuevo en la cabecera, junto a
  Obras. Guarda de una vez a la gente y a las empresas con las que trabajas,
  con su nombre y su DNI (o su CIF, si marcas que es una empresa).
- **Buscar en vez de teclear.** En el formulario de obra, la casilla de nombre
  de cada rol busca en la agenda: eliges y se rellena sola. Vale para los seis
  roles de siempre y también para los roles que escribes a mano. Si quien
  buscas no está, lo guardas en la agenda sin salir del formulario.
- **Corregir una vez, corregido en todas.** Una obra que usa una ficha muestra
  siempre lo que dice la ficha. Arreglas un DNI mal escrito en un sitio y
  queda bien en todas las obras, y en los informes que generes a partir de
  entonces.
- **Importar lo que ya hay.** Mientras quede gente escrita a mano en alguna
  obra, la pantalla Agentes lo avisa y ofrece crear sus fichas y enlazar las
  obras de una vez. Antes de tocar nada dice cuántas fichas va a crear y
  cuántas obras va a enlazar.
- **El informe recoge las correcciones**, sin necesidad de volver a abrir la
  obra.
- **Musaat: el control de lo que hay que declarar.** Apartado nuevo con la
  lista de obras que van a la mutua. Cada obra nace con las cinco
  intervenciones por enviar —proyecto, estudio de seguridad, dirección de
  obra, dirección aparejador y coordinación—, y de cada una marcas *Enviado*,
  con su fecha, o *No procede* cuando el seguro no te corresponde a ti.
- **Un punto de color por obra**: rojo si no has enviado nada, naranja si
  enviaste algo y falta el resto, verde cuando está todo resuelto. Lo que no
  procede cuenta como resuelto. Arriba, un filtro por cada uno de los tres
  estados con su cuenta, y un buscador por nº de expediente o nombre.
- **Observaciones** al final de la ficha de cada obra de Musaat, para lo que
  haga falta recordar de esa declaración.
- **El estado de Musaat, también en la lista de obras.** Al lado de cada obra
  ves cómo va su declaración sin tener que entrar. Se emparejan por el **nº de
  expediente**; una obra que no esté en Musaat sale en rojo.

  La lista de Musaat es independiente de tus obras, a propósito: no todas las
  obras se declaran, y lo que mandas a la mutua debe quedar como lo mandaste,
  sin que lo cambie después una edición de la obra. Se apunta a mano.

> El apartado se llama **Agentes** y no *Personas* porque ahí caben también
> las empresas, que es la mitad de los casos: promotores y constructoras
> suelen ser sociedades. Por dentro el código y la base de datos siguen
> diciendo «persona»: renombrarlos obligaría a migrar la base de datos de
> todos los dispositivos para cambiar una palabra que nadie ve.

### Notas

Nada de lo que ya tenías cambia. Una obra escrita a mano sigue funcionando
exactamente igual; el vínculo con la agenda es opcional y se añade cuando tú
quieras. Si borras una ficha de la agenda, las obras que la usaban conservan
el nombre y las correcciones que ya habías hecho: lo que pierden es poder
encontrarla al buscar.

El informe PDF sigue imprimiendo solo los nombres de los agentes, no sus
documentos. Lo que se corrige en todas, por tanto, es el nombre.

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
