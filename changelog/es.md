# Changelog (es)

Translation of CHANGELOG.md: same `## <version>` sections and bullets.

## 0.3.3

- Cambiado: la build principal ahora es por personaje y no por clase: dos personajes de la misma clase tienen equipo separado. Hasta que un personaje edite la suya, parte de la build compartida anterior.
- Cambiado: las tarjetas de Mis personajes muestran el Gear Score de la build principal del personaje (actual / objetivo, los mismos números que el Character Builder) en lugar de un CP siempre vacío; la barra superior tampoco lo muestra ya.
- Corregido: una build abierta desde la tarjeta de un personaje usa el Arcana y el Daevanion de ese personaje, no los del activo.

## 0.3.2

- Corregido: en Mis personajes toda la tarjeta del personaje abre su build (antes solo el nombre, sin ninguna pista visual).
- Corregido: el medidor sigue al personaje con el que realmente juegas, leído del juego; activar un personaje en Mis personajes ya no cambia a quién sigue el medidor.

## 0.3.1

- Nuevo: Antes de empezar: hay que aceptar los Términos y condiciones y la Política de privacidad completos (inglés, italiano, alemán, francés, español, portugués, ruso) antes de que PowerMeter lea cualquier dato de combate. Quien ya usa la app los acepta una vez en el próximo inicio.
- Cambiado: "Abrir widget" ahora se llama "Iniciar DPSMeter".
- Cambiado: los modos del medidor aparecen como BOSS, TRAIN, PVE, PVP, en este orden, en el medidor, el Historial de combates y los Ajustes.
- Cambiado: hacer clic en el nombre de un personaje en Mis personajes abre su build sin cambiar el personaje activo.
- Cambiado: la ventana de actualización agrupa las notas de la versión por tipo (nuevo, cambiado, corregido) y se lee mejor.
- Corregido: el Gear Viewer mostraba casi todas las piezas dos veces (el mismo objeto existe una vez por facción); ahora cada pieza aparece una sola vez.
- Corregido: la cabecera de la build mostraba contadores de me gusta y comentarios ficticios en lugar de los me gusta reales de la build.

## 0.3.0

- Nuevo: Registros en línea: los combates que subiste, con enlace, visibilidad modificable (público, no listado, privado), visitas, posición en la clasificación y borrado.
- Nuevo: Estadísticas de clases: DPS medio por clase en cada jefe, clases más jugadas y evolución semanal, a partir de los registros públicos de la comunidad. El mismo combate subido por varios miembros del grupo cuenta una sola vez.
- Nuevo: Visor de equipo: todas las piezas de equipo con filtros, búsqueda y estadísticas ordenables. Selecciona objetos para fijarlos arriba o compararlos, con flecha verde en el mejor valor y roja en el peor.
- Nuevo: Armería: busca personajes por región, facción, servidor y clase, mira los perfiles populares, las clasificaciones y la ficha completa de un personaje (EU/NA en cuanto estén disponibles).
- Nuevo: Festival Shugo: cuenta atrás en vivo para la próxima ronda, sus minijuegos, las rondas siguientes y un planificador de la tienda del festival con las fichas que te faltan.
- Nuevo: Grieta Espaciotemporal: cuentas atrás del portal y de la grieta, el horario de 24 horas y la ruta de tu facción.
- Nuevo: Calculadoras: estadísticas y Gear Score de una pieza entre dos niveles de mejora con la calidad del soul imprint, bonificaciones de las estadísticas primarias y probabilidad Splendent de una receta.
- Nuevo: Mercado (sustituye a la Lista de la compra): búsqueda de objetos y lista de seguimiento; precios, tendencias y estadísticas aparecerán cuando exista una fuente de datos de mercado para EU/NA.
- Nuevo: Artesanía paso a paso: cada paso muestra el objeto exacto que usa, los resultados Normal y Splendent y cuál necesita el paso siguiente; en el último nivel eliges entre mejorar la pieza normal y fabricar hasta obtener Splendent.
- Cambiado: Flow Map se sustituye por el Festival Shugo; Registros en línea y Estadísticas de clases explican para qué sirven.
- Corregido: alas, títulos y mascotas en la base de datos muestran sus bonificaciones.

## 0.2.14

- Nuevo: pestaña PvE en el medidor para farmear mobs. El daño se suma sobre todos los mobs que golpeas, incluso después de morir, y se reinicia tras 5 minutos sin golpear mobs, al cambiar de zona o con Reiniciar.
- Nuevo: Jefe, PvE, Train y PvP están separados: cada golpe cuenta solo en la pestaña de su tipo de objetivo. El widget muestra siempre lo que está registrando (tipo y nombre del objetivo), y los combates guardados van a su pestaña, con un filtro por modo en el Historial.
- Nuevo: Curación recibida por jugador (propia y de otros) y Aggro (golpes recibidos de los mobs; Templario y Gladiador marcados como TANK; una estimación, indicada como tal, hasta que los mobs golpeen a alguien).
- Nuevo: Artesanía: todos los objetos fabricables con las armas primero, la cadena de mejora del primer al último nivel, el árbol de recetas y los materiales para la cantidad que elijas con Tienes y Faltan, guardados.
- Cambiado: el daño se muestra completo en todas partes (widget, ventana de detalles, medidor e informe del panel), sin redondeo K/M.
- Corregido: el medidor ya no deja de contar cuando un mob se mueve (se tomaba por un jugador), y la pestaña Jefe solo muestra jefes.
- Corregido: bloquear el widget ya no vacía la lista de jugadores; Build y Lobby siguen visibles al bloquear.
- Corregido: el widget muestra los iconos de la build guardada, incluso después de crearla o renombrarla.
- Corregido: Subir en el widget sube el combate recién terminado, pide iniciar sesión con Discord si hace falta y avisa cuando un combate de entrenamiento no se puede subir.

## 0.2.13

- Nuevo: los personajes tienen una facción (Elyos o Asmodian). Elígela al añadir un personaje, o en la tarjeta de uno existente; aparece en Inicio y en el Character Builder.
- Nuevo: el informe de combate muestra tus combates guardados: intentos contra el mismo jefe, resumen, habilidades, gráfico de DPS, cronología, daño recibido, curación y Comparar. Al pulsar un combate en el Historial o en Inicio se abre en el informe.
- Nuevo: Exportar en el informe de combate guarda el combate completo, para volver a cargarlo desde Historial de combates → Subir → Desde archivo.
- Nuevo: el Análisis de grupo muestra los jugadores, las habilidades y las rotaciones de apertura de tu último combate.
- Cambiado: se han eliminado todos los datos de ejemplo antes del lanzamiento. Las páginas que aún no tienen nada que mostrar (clasificaciones, builds de la comunidad, comentarios, noticias, actividades, curación y aggro del medidor, lobby del widget) muestran un estado vacío.
- Cambiado: Compartir solo da un enlace real, una vez subido el combate desde el Historial.
- Cambiado: los ajustes que aún no están disponibles aparecen desactivados y marcados como "Próximamente".
- Corregido: se conserva el equipo de tu build principal guardado en versiones anteriores.

## 0.2.12

- Nuevo: Subir en el Historial de combates abre una ventana para subir los combates seleccionados o un archivo guardado con Exportar, y te permite iniciar sesión con Discord desde ahí.
- Nuevo: renombra una build que creaste o clonaste y guárdala; botones Editar y Eliminar en tus builds, con una ventana de confirmación.
- Nuevo: las estadísticas de las alas muestran las bonificaciones del ala equipada además de las de la colección.
- Cambiado: las alas, títulos y mascotas que no dan estadísticas vuelven a aparecer en la lista, después de las demás, marcadas como "Sin estadísticas".
- Cambiado: Tus builds solo lista las builds que creaste o clonaste.
- Corregido: Descargar Npcap vuelve a iniciar el instalador (ahora pide permisos de administrador en lugar de fallar en silencio).

## 0.2.11

- Nuevo: las estadísticas del Character Builder son reales y en vivo: estadísticas base de la clase, equipo (Magicstones y el resto de ranuras), Daevanion, colecciones y títulos, calculadas como lo hace questlog. La vista Objetivo muestra el cambio en cada estadística.
- Nuevo: colecciones de Pantheon, Arcana y Genus Insight, con sus estadísticas en el builder.
- Nuevo: las habilidades y misiones de la base de datos muestran la ficha en inglés y, debajo, la misma ficha en tu idioma (el italiano es una traducción no oficial).
- Nuevo: elimina las builds que creaste o clonaste; tus builds y tus nodos de Daevanion se conservan tras un reinicio.
- Nuevo: nuevo icono de Windows.
- Cambiado: el Gear Score se calcula como lo hace questlog (mejora, avance, Magicstones, Theostone, Arcana, puntos de Daevanion).
- Cambiado: una build solo puede clonarse en un personaje de la misma clase.
- Cambiado: un único botón Atrás: a la build desde Piezas que faltan, y al Character Builder en el resto de los casos.
- Corregido: Subir en el Historial de combates sube los combates seleccionados.
- Corregido: las alas y títulos equipados dan sus bonificaciones; las alas y títulos sin estadísticas ya no aparecen en la lista; el poder de vuelo ya no está inflado.
- Corregido: el aspecto de guantelete y las alas del Brawler están ocultos hasta que el Brawler salga en EU/NA.

## 0.2.10

- Nuevo: colecciones en el Character Builder (aspectos, mascotas, alas, monolito, títulos) con sus totales reales de estadísticas; un personaje nuevo empieza en 0. Genus Insight, Pantheon y Arcana llegarán en una actualización dedicada.
- Nuevo: estadísticas reales de objetos en el Character Builder (base, mejora, avance, líneas de impronta de alma), Magicstones, Theostones y Piedras filosofales reales, y Gear Score calculado con tus piezas.
- Nuevo: desde la ficha de un objeto, Añadir a la build lo pone en tu equipo actual y Añadir al objetivo en tu equipo objetivo.
- Nuevo: Comparar y Exportar en el informe de combate; Exportar en el Historial de combates.
- Cambiado: la ranura de mano secundaria es la Guard para todas las clases; se quitó el deslizador de Potencial; el Combat Power ya no se muestra con números inventados.
- Corregido: el widget de build muestra los iconos de los objetos.
- Corregido: Piezas que faltan cuenta todas las ranuras (también los brazaletes); Actual muestra vacía una build vacía; Volver a la build regresa a la build en la que trabajabas.
- Corregido: las barras de curas, daño recibido y objetivos del informe de combate se escalan sobre todo el combate, y el contador de intentos cambia entre intentos.
- Corregido: los retratos de Build community muestran la cara del personaje.

## 0.2.9

- Nuevo: toda la base de datos del juego está en la app (objetos, PNJ, misiones, mazmorras, habilidades, recetas, títulos, logros, mascotas, alas y más) con detalles reales, enlaces entre entradas y búsqueda con Ctrl+K.
- Nuevo: pestaña PvP en el DPS Meter: el daño que tú y tu grupo hacéis a otros jugadores.
- Nuevo: Character Builder rehecho: cada ranura solo ofrece objetos de su tipo, deslizadores y menús de estadísticas que funcionan, equipo actual y objetivo reales, piezas que faltan, Comparar, Widget y Compartir (Discord).
- Nuevo: Build community muestra 12 builds por página; Tus builds y Me gusta funcionan.
- Cambiado: el archivo del programa ahora se llama PowerMeter.exe.
- Cambiado: el chip del personaje arriba es un botón simple que abre Mis personajes.
- Corregido: exportar personajes guarda el archivo en Descargas.
- Corregido: cada pestaña del informe de combate (línea de tiempo de habilidades y buffs, daño recibido, curas, objetivos) sigue el intervalo seleccionado.
- Corregido: el equipo por defecto y las listas de builds siguen la clase de tu personaje.

## 0.2.8

- Nuevo: Mis personajes funciona: añade, importa, exporta, duplica y elimina personajes, y elige el activo. Al cambiar de personaje se actualiza todo el panel (builder, Skill Planner, Daevanion).
- Nuevo: el Daevanion Planner muestra los tableros reales de la clase de tu personaje.
- Nuevo: iconos reales de objetos en el builder, fichas de objeto, búsqueda e inicio.
- Nuevo: mapa del mundo interactivo con marcadores reales (datos: aion2-interactive-map, CC BY-NC 4.0).
- Nuevo: elige etiquetas al crear una build nueva.
- Cambiado: las pestañas del DPS Meter ahora son Boss, Train y PvP.
- Cambiado: solo se muestran EU y NA; el Brawler está oculto hasta que salga en Occidente.
- Corregido: cambiar de pestaña en el DPS Meter ya no vuelve a Boss.
- Corregido: seleccionar un intervalo en el informe de combate actualiza las estadísticas de abajo.
- Corregido: funcionan las pestañas y filtros de las clasificaciones y los números de página de Build community.

## 0.2.7

- Corregido: las notas de la versión en la ventana de actualización ahora aparecen en el idioma elegido para PowerMeter.
