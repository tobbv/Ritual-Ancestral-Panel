# Ritual UI V2 — auditoría inicial

Fecha: 2026-09-18. Fuente: ZIP del usuario, 26 archivos. Rama: `codex/ritual-ui-v2`.
Original intacto en commit `1f4f62f`. No se modificó la aplicación, no se ejecutó SQL ni se accedió a datos remotos.

## Alcance y cómo continuar sin repetir trabajo

Auditoría estática: inventario general y revisión focalizada de shell, dashboard, cascada y persistencia de apariencia. Los módulos restantes requieren revisión detallada al migrarlos. No equivale a validación funcional en navegador ni a una auditoría completa de todas las reglas CSS.

Leer este documento primero. Las líneas corresponden al commit original: usar nombres de funciones/IDs como anclas después de editar. No leer repetidamente el HTML completo. Buscar con `rg -n` y extraer intervalos pequeños; algunas líneas contienen CSS minificado o imágenes embebidas muy extensas.

Contexto de producto: panel operativo para comerciantes; objetos principales: ventas, productos, clientes, entregas y cobros. Recorrido: iniciar sesión → elegir tarea o pendiente → consultar/editar → guardar y verificar. Prioridad visual: estado del negocio, pendientes y próxima acción. Mantener lenguaje español, precisión monetaria, recuperación de errores y acciones móviles accesibles. Referencia funcional: código actual. Referencia visual: imágenes del usuario. Sin cambio de framework por ahora.

## Arquitectura y carga real

- Aplicación HTML/CSS/JavaScript sin `package.json`, sistema de build ni suite de tests incluida. `index.html`: 1.150.849 bytes; mezcla plantillas, estilos, lógica, persistencia y extensiones.
- Diez vistas `.pv`, navegación por `navTo`, estado y funciones globales; handlers inline y renderizadores que generan HTML.
- Dependencias externas declaradas: Poppins/DM Mono, Supabase JS v2 y XLSX 0.18.5. Importar Poppins no garantiza que sea la fuente efectiva: apariencia guardada y estilos Apple también intervienen.
- Páginas separadas: `delivery.html` (portal repartidor), `pedido.html` (seguimiento), `etiqueta-envio.html` (impresión). No suponer que heredan el CSS del panel.
- No hay instrucciones AGENTS/CLAUDE/CODEX en el ZIP. Los SQL son archivos existentes; no se ejecutaron.

Orden visual en `index.html`:

1. Estilos inline iniciales, líneas 19–35 y 36–1434: base más sucesivas revisiones globales.
2. Bloque 8164–8256: extensiones y diseño del dashboard; reglas compactadas en 8253–8255.
3. Bloque 8441–8444: portal delivery.
4. `ritual-ancestral-ios-polish`, 8547–8931: otra capa global activa.
5. Seis bloques con `media="not all"`, 8932–9281: layouts operativos, correcciones de registro y dos revisiones de tarjetas de ventas. No participan normalmente en la cascada. Script `disabled-operational-layout-script` con tipo JSON, 9009: no ejecutable como JavaScript.
6. Cargas finales, 9282–9292: `pedidos.css/js`, `pedidos-panel.js`, `ventas-mes-refresh.css/js`, `nuevo-producto-refresh.css/js`, `barra-flotante.css`, `registro-ventas-refresh.css`, `delivery-refresh.css/js`.

`ritual-refresh.css/js` existen pero no se encontraron referencias a ellos en HTML/JS/CSS del ZIP. Clasificación: no enlazados en esta copia; preservar hasta verificar otros puntos de entrada. `elera-inspiracion.css` no existe ni aparece referenciado: no inventar su contenido ni eliminar una referencia inexistente.

## Mapa por módulo

| Módulo / ancla HTML | Capas y dependencias | Tratamiento |
|---|---|---|
| Shell, `.sidebar`, `.topbar`, `#mainPage` | Base inline + revisiones Apple + `barra-flotante.css`; `sidebarColorearIconos`, modo oscuro, perfil y búsqueda | Primera migración; preservar navegación, perfil, sesión y controles dinámicos |
| Inicio, `#pv-inicio`, 1593 | CSS 8253–8255 + polish global + modo compacto; `dashCargar` y renderizadores | Primera pantalla V2 |
| Registro, `#pv-registro`, 1621 | Inline + `registro-ventas-refresh.css`; `raInyectarUI` añade modo rápido | Conservar cálculo, validación, envío, combos y acciones; auditar al migrar |
| Ventas, `#pv-ventasmes`, 1730 | Inline + `ventas-mes-refresh.css/js` + pedidos | No retirar wrapper hasta portar acciones e historial |
| Stock, `#pv-stock`, 1817 | Inline + funciones `ra*` de archivo, combos y orden de grupos | Presentación mezclada con datos; preservar |
| Productos, `#pv-productos`, 1833 | Inline + `nuevo-producto-refresh.css/js`; depende de nodos creados por `raInyectarUI` | Riesgo alto de borrar campos o calculadora |
| Movimientos, `#pv-movimientos`, 1901 | Inline/base global | Inventario inicial; revisar lógica al migrar |
| Clientes, `#pv-clientes`, 1925 | Inline + extensiones de notas/ocultación; estilos alternativos en refresh no cargado | No activar alternativa legacy |
| Delivery, `#pv-delivery`, 1938 | Inline + `delivery-refresh.css/js`; `deliveryPortalInyectar` y funciones del portal | Distinguir módulo administrativo de `delivery.html` |
| Finanzas, `#pv-finanzas`, 1965 | Inline, analítica, gastos y calculadora inyectada que luego se mueve a Productos | No eliminar calculadora por estar fuera de su módulo original |
| Configuración, `#pv-config`, 2088 | Inline; `cfgReorganizarUI` mueve tarjetas por títulos/clase | Sustituir dependencia de texto por estructura explícita al migrar |
| Pedidos y etiquetas | `pedidos.css/js`, `pedidos-panel.js`, `pedido-config.js` y HTML separados | Mezclan renderizado, estados, enlaces, impresión y operaciones remotas; no son CSS prescindible |

## Conflictos y duplicación comprobables

- Sidebar: base 108 fija 240 px; polish 8600 y responsive 8910/8919 vuelven a definirla; `barra-flotante.css` usa `#appMain .sidebar`, 248 px y numerosos `!important`. Tiene mayor especificidad para propiedades compartidas y variantes propias. No basta con cambiar variables.
- Topbar: base 121 fija 60 px; polish 8646 y capa flotante redefinen geometría. Esta última impone mínimo 78 px, márgenes y radio 27 px. Fondo, blur y sombras aparecen en varias capas.
- Dashboard: `.dash-kpi` en 8253 define radio 18 px y padding 17 px; `.stat,.dash-kpi` en 8677 impone radio 22 px y padding 17/18 px con `!important`; responsive 8923 vuelve a imponer radio 18 px/padding 14 px. Sus colores locales `--dash-blue/green/orange` y literales no dependen enteramente de la marca.
- `body.modo-compacto` modifica densidad adicionalmente (1433); `html.dark` tiene reglas en múltiples bloques y en refresh. Deben considerarse estados funcionales existentes.
- Los seis CSS externos actualmente cargados contienen 504 apariciones de `!important`: barra 95, delivery 93, producto 45, pedidos 9, registro 111, ventas 151. El refresh no cargado añade otras 120. Es un indicador de acumulación, no prueba automática de error.
- Exploración textual encontró 24 candidatos de selector+cuerpo repetidos en estilos inline activos. Ejemplo: `html.dark .group-row`, 983/1058. Otros son responsive (`.page`, `.stats`, `.card`) y pueden estar en contextos distintos. No eliminarlos por coincidencia textual; comprobar media, orden y consumidores.
- `raCalcPrecio` (8420) y `updateCalculator` (`nuevo-producto-refresh.js:120`) repiten costo total, margen, precio sugerido y descuento. El botón de aplicar precio vuelve a calcularlo (176). Es duplicación funcional dentro de una capa visual: unificar con pruebas de equivalencia durante la migración de Productos.
- Las normalizaciones `cfgNormalizarVisualApple` pueden reemplazar colores antiguos, mientras otras reglas hardcodeadas o `!important` pueden ignorar tokens. V2 debe tener un único camino para aplicar marca y evitar que la normalización legacy la revierta.

## Scripts que reconstruyen presentación

| Script / función | Comportamiento y contrato que preservar |
|---|---|
| `nuevo-producto-refresh.js:42`, `buildProduct` | Mueve campos existentes, reconstruye raíz con `replaceChildren`, conserva acciones/mensaje, crea estimaciones; observa variantes con MutationObserver |
| `buildCalculator`, mismo archivo:154 | Mueve inputs `raFc*` de Finanzas a modal en body, oculta resultado original, elimina tarjeta original; añade cierre, presets y aplicar precio |
| Inicialización producto:188 | Espera `raComboBtn` y `raCalcCard`; DOMContentLoaded + reintento 400 ms. `raInyectarUI` ejecuta inmediatamente y a 300 ms. Sustituir coordinación temporal por montaje explícito al migrar |
| `ventas-mes-refresh.js:42/179` | Reorganiza columnas, cliente, detalles, menú e historial; envuelve `window.vmRenderCards` y vuelve a decorar tras cada render. Reenvía editar y llama `verHistorialVenta` |
| `delivery-refresh.js` | Rellena iconos de `[data-delivery-icon]` con `uiIcon`; no es el generador del portal |
| `ritual-refresh.js` (no enlazado) | Otra implementación para Productos/calculadora, Delivery, Finanzas y tarjetas de ventas; mueve/elimina nodos y envuelve también `vmRenderCards`. No combinar con implementación V2 ni activarlo |
| `index.html:8434`, `raInyectarUI` | Añade modo rápido, combo compuesto y calculadora; conecta funciones reales |
| `index.html:8446`, `deliveryPortalInyectar` | Crea formulario y acciones de enlaces privados |
| `index.html:8467`, `cfgReorganizarUI` | Clasifica tarjetas por texto del encabezado, las mueve a categorías y crea navegación |
| `index.html:8518`, `sidebarColorearIconos` | Envuelve SVGs con placas de colores por módulo; presentación reemplazable al reconstruir shell |

No eliminar clases/IDs por parecer visuales: hay consultas DOM, delegación, callbacks y wrappers que dependen de ellos. Tras reconstruir un módulo, retirar su transformación legacy en el mismo cambio verificado para evitar doble montaje.

## Shell y dashboard: contrato para la primera migración

Shell: `navTo` (3352) activa `.pv`, actualiza navegación/título y genera `topbarActions`. Los selects `mesSelect`, `mesSelectDel`, `dPeriodo`, `mesSelectFin` son creados dinámicamente y disparan carga. `globalIr` depende de `.nav-item` y del texto del atributo onclick. `globalBuscar` (3328) consulta cachés y navega a módulos. Preservar `globalSearch`, `globalResults`, perfil/avatar, cerrar sesión y `toggleDarkMode` (1445), que persiste en `ritual_dark_mode`.

Dashboard HTML: 1593–1618. Orquestación: `dashCargar` (3051); período: `dashFiltrarPeriodo` (3109). Usa productos, configuración, ventas y `analizarFinanzas`; separa ventas vigentes para ticket y pendientes históricos. NO cambiar fórmulas durante rediseño.

Anclas a conservar o migrar explícitamente:

- `dashPeriodo`: hoy, 7 días, mes y mes anterior; cambio recarga.
- Estado: `dashHero`, `dashEstadoTitulo`, `dashEstadoNota`.
- Métricas: `dashCobrado`, `dashCobradoTrend`, `dashNeta`, `dashPendiente`, `dashPedidos`, `dashPorEntregar`, `dashStockBajo`, `dashTicket`.
- Contenido: `dashAlertas`, `dashPreparacion`, `dashStockLista`, `dashChart`, `dashActivity`, `dashHoyFecha`, `dashHoyResumen`, `dashChecklist`.
- Acciones: nueva venta, enlaces a módulos, copiar resumen diario, cambiar preparación mediante `actualizarCampoVenta`, recordatorios WhatsApp y checklist diario persistido localmente.
- Alertas/rotación: `renderDashAlertas` (3224), `dashCalcularRotacion` (3275). Preparación (3304) filtra no listos, no entregados/cancelados y fecha hasta hoy; muestra hasta 8. Stock (3317) muestra hasta 8.
- `renderDashChart` (3117) calcula siempre 7 días; `renderDashActivity` (3122) muestra 5 recientes; reciben todas las ventas, no solo el período. Mantener o resolver explícitamente esta diferencia al definir etiquetas; no alterar silenciosamente datos.
- `renderDashHoy` (3159) añade entregas de hoy, fechas especiales, estado de respaldo y saldos antiguos. Checklist (3202–3222) usa `checklist_cierre_` + fecha.
- Cargar dashboard NO es estrictamente solo lectura: llama `stockBajoDesdeActualizar` (2834), que puede guardar `stock_bajo_desde` en configuración. Usar datos simulados/interceptar persistencia en pruebas visuales.

## White-label: reutilización propuesta, no implementada

`guardarConfigClave` (2806) hace upsert por clave en `configuracion`; `cargarConfiguracion` (3417) reconstruye `appConfig`. Ya existen `nombre_negocio`, `moneda` y `apariencia` JSON. `aplicarApariencia` (3441) aplica variables, fuente, logo, favicon y avatar; `cfgGuardarEstiloVisual` (8069) es punto de guardado a revisar al migrar.

Propuesta: conservar registro `apariencia`, extender/versionar su JSON y centralizar lectura, validación, derivación de hover/soft/contraste y aplicación en `brand-config.js`. Mantener claves desconocidas; no sobreescribir preferencias ajenas. Reutilizar `nombre_negocio`; añadir isotipo dentro del JSON si corresponde. No se aprecia necesidad de cambio de esquema para esto; no se han verificado permisos/tamaño real del almacenamiento remoto.

No confundir white-label con multiempresa: cambiar marca no implementa aislamiento de datos por comercio. Revisar también nombre/logos hardcodeados en impresión, WhatsApp, pedidos y portal, no solo sidebar. La fuente neutral será Poppins; decidir cómo conservar la preferencia de tipografía existente sin reactivar estilos legacy.

## Estrategia V2 y primera entrega propuesta

- `design-system-v2.css`: tokens neutrales, spacing, tipografía, radios, sombras, estados y contrato de tokens de marca.
- `shell-v2.css`: navegación, topbar, contenedor y responsive del shell.
- `components-v2.css`: controles, tabla/lista, chips, métricas, paneles, formularios y modales compartidos; variantes explícitas, sin nuevos refresh por módulo.
- `brand-config.js`: persistencia existente y aplicación única de branding; ningún cambio remoto en esta etapa.
- Layouts de página simples; extraer renderizadores solo según necesidad, conservando cálculos y handlers. No reescribir toda la lógica ni introducir framework para ordenar CSS.
- Durante transición, delimitar superficies V2 con atributos/clases explícitos y limitar legacy a superficies pendientes. No resolver conflictos añadiendo otra capa global de `!important`. Auditar selectores compartidos antes de retirar reglas.

Referencia visual registrada: Elera como base. 4532/4536 dashboard, 4534/4538/4540 listado y detalle lateral, 4535/4542 finanzas, 4541 inventario, 4544 flujo por etapas, 4543/4547 informes; 4546 síntesis; 4537/4533 2 tabla con columna lateral; 4539/4545 chat (referencia compositiva, no función nueva); 4550 calendario auxiliar; 4548/4549 móvil. Sin márgenes negros de capturas, resplandores ni marcos de dispositivo. Predominan superficies blancas, gris cálido claro, densidad compacta, sidebar estrecha, topbar baja, métricas en franja y panel derecho contextual. Adaptar acento a marca.

Orden: shell + sistema compartido + dashboard → revisión visual por el usuario → módulos acordados uno por uno → retirada de legacy probado. La arquitectura de marca se prevé desde el inicio; editor completo de apariencia se completa en su etapa. No comenzar rediseño sin acordar siguiente entrega.

## Verificación y criterios de retirada

En esta etapa: comparar los 26 archivos contra el ZIP byte a byte, comprobar rama/commit y confirmar cero modificaciones de la aplicación. Sin pruebas de navegador, credenciales, SQL ni comprobación del servidor publicado.

Para primera implementación: datos de prueba sin escrituras reales; capturas desktop/tablet/móvil comparadas con referencias; navegación de los 10 módulos, búsqueda, controles dinámicos, perfil, oscuro/compacto y cierre de sesión; equivalencia de métricas y períodos; preparación, resumen, checklist y recordatorios; estados vacío/error/cargando; teclado, foco y textos largos. No enviar mensajes reales al probar.

Retirar una capa solo cuando: consumidores identificados → contratos migrados → acciones y estados comprobados → capturas revisadas → carga legacy desconectada → comprobación final sin esa capa. Los bloques desactivados y archivos no enlazados son candidatos a limpieza, no eliminaciones aprobadas por esta auditoría.

## Estado de implementación · primera migración

Implementada el 2026-09-19: sistema de tokens, adaptador de marca, componentes compartidos, shell responsive y dashboard V2. El CSS inline activo original se trasladó sin reescritura a `legacy.css` y queda limitado a superficies que todavía no tienen la clase `ui-v2`. `barra-flotante.css` dejó de cargarse porque su alcance completo —sidebar y topbar— fue reemplazado y verificado. Los otros refresh continúan activos para sus módulos pendientes.

Archivos V2: `design-system-v2.css`, `components-v2.css`, `shell-v2.css`, `pages-v2.css`, `brand-config.js` y `ui-v2.js`. La presentación del dashboard cambió; sus cálculos y accesos a datos continúan en las funciones existentes de `index.html`.

Segunda iteración del 2026-09-19: Dashboard y Registro de ventas se ajustaron a la composición Elera indicada por el usuario: marco exterior cálido, acento verde, controles carbón, mayor densidad y jerarquía de tabla/panel lateral. Registro conserva todos sus IDs y handlers originales (`vGuardar`, cálculo, carrito, cliente, pago, entrega y modo rápido), ahora está delimitado por `ui-v2` y dejó de cargar `registro-ventas-refresh.css`. No se añadieron funciones de negocio ni métricas nuevas.

Corrección visual posterior: se restauró la exclusión mutua entre vistas, se eliminó el título interno repetido de Registro, se sustituyó el carbón por verde profundo, se recuperó WhatsApp verde, se unificaron radios y sombras, y el progreso de Registro vuelve a mostrar círculos grises, paso activo animado y tilde verde según la validación existente. Los `select` de superficies V2 conservan el elemento original y sus eventos, pero se presentan mediante un menú accesible propio con opción activa, radios, sombra y apertura superior automática cuando falta espacio.

Verificación automatizada en `tools/verify-v2.cjs`: cálculo del período, persistencia del checklist, búsqueda, navegación por las diez vistas, disponibilidad de los campos y acción Guardar de Registro, tema oscuro, marca persistente y responsive a 1024/768/390/320 px. Se ejecutó con el cliente local de demostración y bloqueo de solicitudes a Supabase. Resultado: aprobado sin errores de JavaScript ni desbordamiento horizontal.
