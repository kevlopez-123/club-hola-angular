# Banco Solidario Puntos — Angular 22

> **Novedades:** Angular 22.2 (TypeScript 6, Node 24 local: usa siempre `npm start` / `npm run build` / `npm run e2e`), panel con interfaz SaaS (workspace, Ctrl+K, migas, tema oscuro), plataforma **white-label** (colores, logos, país, moneda y documentos desde Admin → Configuración → Marca) y pruebas de escalabilidad (`STRESS_N=500000 npm run e2e -- escalabilidad`). Para reutilizarla en otro cliente ver [docs/REPLICAR.md](docs/REPLICAR.md). Suite e2e: ~290 pruebas.

Reescritura en **Angular** (componentes standalone, signals, control flow `@if/@for`, rutas con lazy loading) del proyecto original hecho con Lovable (React + TanStack + Vite). El diseño se conserva: se mantiene **Tailwind CSS 4** con los mismos tokens y clases del original.

## Cómo ejecutarlo

```bash
npm install
npm start          # http://localhost:4200
npm run build      # build de producción en dist/
```

- Sitio del participante: `/` · Login: `/login`
- Panel de administración: `/admin` (acceso simulado; elige un rol en la pantalla de ingreso)

## Conectar el backend real

1. `src/environments/environment.ts` (y `environment.prod.ts`): `usarMock: false` y `apiBase: "https://api.tudominio.com/v1"`.
2. El contrato del API está en [`docs/api/openapi.yaml`](docs/api/openapi.yaml), generado desde la MockAPI (`npm run api:docs`). Los esquemas de los datos del participante se generan de `src/app/core/models.ts` (`scripts/esquemas-openapi.mjs` define qué esquema usa cada endpoint); las listas del panel usan `Paginado`.
3. Seguridad: `authInterceptor` envía `Authorization: Bearer <token>` (guárdalo con `TokenService.set(token)` al ingresar). `erroresInterceptor` reintenta lecturas ante 502/503/504 o corte de red, avisa "Sin conexión" / "Problema con el servidor" y trata un 401 fuera de `/auth/` como sesión vencida (el panel vuelve al ingreso).
4. Probar pantallas de error sin backend: en la consola `sessionStorage.bs_fallo = "503"` (también `"0"` = sin red, `"401"`); `sessionStorage.removeItem("bs_fallo")` para quitarlo.
## Registro de cambios, concurrencia y pagos

- **Auditoría:** el servidor registra solo cada cambio hecho desde el panel (quién, cuándo, sección, acción y `antes`/`despues`), además de los ingresos y los intentos fallidos (sin guardar la contraseña). Filtros por usuario, sección y fechas; descarga en Excel o PDF de todo lo filtrado.
- **Concurrencia:** los registros editables llevan `version`. El cliente manda la versión que cargó en `If-Match` (`versionesInterceptor`) y el servidor responde **412** si otro usuario guardó antes; el panel avisa y ofrece recargar. Varias pestañas comparten la base simulada para poder probarlo.
- **Pagos:** la compra de puntos va en dos pasos (`POST me/puntos/compra` crea la compra *Pendiente*; `POST me/puntos/compra/:codigo/pago` registra lo que responde la pasarela: aprobado, rechazado o pendiente). Rechazada o fallida se puede reintentar; una pendiente la resuelve el panel (`POST admin/compras-puntos/:codigo/resolver`), como lo haría el webhook del proveedor. Tarjetas de prueba en la pasarela simulada.

## Sitio cerrado, sin stock y copia oculta (CCO)

- **Sitio cerrado.** Sin iniciar sesión solo se ve el ingreso y las páginas abiertas: Términos, Privacidad y la baja de correos (`RUTAS_ABIERTAS` en `core/participante.guard.ts`). Cualquier otra ruta redirige a `/login?volver=<ruta>` y, al entrar, se vuelve a ella. Sin sesión no hay menú ni buscador, y solo los textos legales son indexables (`RUTAS_INDEXABLES` en `core/seo.service.ts`). El backend real debe exigir la sesión también en las consultas del catálogo (hoy son públicas en la demo).
- **Sin control de stock.** Un producto activo siempre se puede canjear: no hay campo Stock, ni "Agotado" / "Últimas N unidades", ni tope de cantidad, ni validación o descuento al canjear. El reporte "Catálogo e inventario" pasó a "Catálogo" (productos activos y ocultos, destacados, vistas y reparto por marca) y el widget "Poco stock" del Dashboard a "Más vistos". Los lotes de códigos de beneficios son otra cosa y se mantienen. Los textos legales de ejemplo aún mencionan "disponibilidad de stock": revisarlos con el equipo legal.
- **Copia oculta (CCO).** Correos → Ajustes: activa la copia, hasta 10 direcciones y a qué correos aplica (automáticos a participantes y/o campañas). Los avisos internos no llevan copia y no se repite al destinatario. Cada correo guarda su `cco` y el detalle del enviado lo muestra. API: `GET/PUT /admin/correos/ajustes`. En el envío real va en el encabezado Bcc; son buzones con datos personales: solo internos y autorizados.

## Guía de cards (tablas del panel)

Todas las tablas del panel se muestran como tarjetas con la misma anatomía (CSS en `styles.css`, rótulos puestos por `core/table-cards.ts` a partir de los `<th>`):

1. **Título**: la primera celda (código, nombre o fecha). Es lo que se lee primero y abre el detalle.
2. **Estado**: un chip pegado bajo el título, sin rótulo → `<td class="det-completo det-chip">`.
3. **Datos**: en pares de dos columnas con el rótulo encima; los textos largos ocupan la fila (`adm-ancha`). Fecha con hora (`dd/mm/aaaa · hh:mm`) junto al participante; cantidades juntas (ítems y puntos, puntos y monto).
4. **Ver detalle**: un ojo en la esquina superior derecha → `<td class="det-ojo">` (un botón o enlace con `aria-label` que nombra la fila).
5. **Acciones de gestión** (Editar, Eliminar, Reenviar, Desactivar…): al pie de la tarjeta, con línea separadora; es la última celda con `<th>` vacío.
6. **Orden**: lo más reciente primero en los reportes; cada encabezado ordena también la tarjeta. Barra de búsqueda, filtros, exportar y paginación iguales en todas.

En los reportes la API describe esto por columna (`ancho`, `sinEtiqueta`, `ordenPor`). `e2e/cards-consistentes.spec.ts` comprueba la anatomía de las listas principales.

## Reportes por tipo y Dashboard

- **Reportes** (Admin → Reportes): la API declara qué tipos existen (`GET /admin/reportes/tipos`: Resumen, Puntos, Ventas de puntos, Pedidos y canjes, Participantes, Catálogo e inventario, Vuelos, Correos, Embudo) y devuelve para cada uno indicadores con comparación contra el período anterior, gráficos y la definición de su tabla (`GET /admin/reportes/t/:id?desde&hasta`). La pantalla solo los dibuja: agregar un reporte no exige tocarla. Los de "estado actual" (participantes, inventario) no se comparan.
- **Tablas**: pagina, busca, filtra y ordena en el servidor (`GET /admin/reportes/q/:coleccion`, bajo el permiso de Reportes). Cada fila abre un detalle con enlace a su módulo. "Exportar tabla" baja hasta 2 000 filas con los filtros aplicados; "Exportar Excel" lleva indicadores, un hoja por gráfico y el detalle.
- **Dashboard** (`GET /admin/dashboard?desde&hasta`): indicadores que salen de los mismos reportes (un número del Dashboard siempre coincide con el del reporte y lleva a él), alertas de lo pendiente (pedidos, mensajes, pagos, stock, correos, lotes) y widgets que cada persona puede ocultar o mostrar (se recuerda en el navegador).
- Un reporte nuevo en el backend real debe respetar el mismo contrato; los widgets se declaran en `pages-dashboard.ts` (`WIDGETS`).
- **Formulario de datos**: lo completa el participante en Mi perfil; las respuestas se ven en la ficha (Datos y direcciones → Datos del formulario).

## Novedades por correo (baja y consentimiento)

- La preferencia `recibeNovedades` (con `novedadesCambio`: cuándo y quién la cambió) se edita en **Mi perfil → Comunicaciones**, en la **ficha del participante** (Datos y direcciones) y con el **enlace de baja** de cada correo de campaña (`/baja?t=…`, pública y `noindex`). Las campañas excluyen a quien no las acepta; los avisos de cuenta (código, pedidos, puntos) se envían siempre.
- API: `GET/PUT /me/novedades`, y públicas `GET/POST /novedades/baja` y `POST /novedades/alta` con el token del enlace. El token del mock es solo una firma simple: el backend real debe emitir un token firmado e inalterable, y añadir el encabezado `List-Unsubscribe` a los correos de campaña.
- Reportes: "Participantes activos por canal" y "Más canjeados" ahora se calculan con los datos del rango elegido (movimientos y pedidos).

## Analítica del embudo

- Eventos: `ver_item`, `agregar_carrito`, `inicio_pago`, `canje` (`core/analitica.ts`). Los registra `AnaliticaService` **solo si la persona aceptó las cookies de analítica**; al retirar el permiso se borra el identificador de visita y se deja de registrar.
- Son anónimos: un identificador aleatorio por pestaña (`sessionStorage`), sin documento, correo ni sesión (la petición no lleva `Authorization`). Un fallo al enviarlos no muestra avisos.
- API: `POST /analitica/eventos` (público) y `GET /admin/reportes/embudo?desde&hasta` (visitas únicas por paso, embudo estricto, comparación con el período anterior y artículos con más interés). Se ve en Admin → Reportes.
- El backend real debe aplicar el mismo criterio: no guardar IP ni datos personales con estos eventos y rechazar los que lleguen sin visita.

## Correos, importaciones y reportes

- **Envío de correos:** cada correo nace *En cola* y un proveedor simulado lo entrega después (Enviado, Reintentando con espera creciente, Rebotado o Fallido tras 3 intentos; un fallido se puede reintentar). Para probar: direcciones con `rebote`, `falla` o `reintento`. Las **campañas** (Admin → Correos → Campañas) envían un mensaje con el diseño de marca a una audiencia (todos, por nivel o por saldo); excluyen bloqueados y a quienes no aceptan novedades (`recibeNovedades`).
- **Vigencia de puntos:** se edita en Reglas de puntos (meses de vigencia y días de aviso) y gobierna «Avisar ahora».
- **Importaciones:** cada carga masiva queda en Admin → Importaciones (quién, cuándo, filas, importadas, errores) con **reporte de errores descargable** (Excel) y plantillas de Excel con instrucciones y ejemplo.
- **Reportes:** indicadores reales por rango de fechas, **comparativo con el período anterior** de igual duración y descarga en **Excel (.xlsx)** o PDF (`GET admin/reportes/resumen?desde&hasta`).

## Sesión del participante

Ingreso por documento + código OTP (`auth/otp` → `auth/verificar`). El servidor emite un token (`TokenService`, ámbito *participante*, guardado en localStorage) que `authInterceptor` envía a las rutas de cuenta; sin él la API responde **401** y el sitio manda a `/login?volver=<ruta>`. `participanteGuard` protege las rutas privadas (carrito, perfil, mis-*, notificaciones, favoritos, contacto, cotizaciones); el catálogo, los vuelos y los textos legales son públicos. Cerrar sesión borra el token y recarga en `/login`. En las e2e la sesión parte iniciada (`playwright.config.ts`); `e2e/sesion-participante.spec.ts` prueba el flujo como visitante. Con el backend real: emitir un JWT en `auth/verificar` y validarlo en cada ruta `me/*`.

## Notificaciones dentro del sitio

Campanita en el encabezado (contador, lista y página `/notificaciones`). Cada plantilla de Admin → Correos puede crear, además del correo, un aviso en el sitio (título, texto y enlace con variables); funciona aunque el correo esté desactivado. API: `GET me/notificaciones` y `POST me/notificaciones/leer` (`{ ids? }`; sin ids marca todas). La app móvil usa los mismos endpoints; el *push* nativo queda para el backend.

## Permisos del panel

La matriz rol → sección → acción (ver, crear/editar, eliminar, exportar) está en `src/app/core/permisos.ts`: la usan el menú, el aviso de *solo lectura*, la página Roles y la MockAPI. El login emite un token con el rol y la MockAPI responde **401** sin sesión y **403** si el rol no puede la acción (`requisitoApi` deriva sección y acción de la ruta y el método). El backend real debe aplicar la misma matriz con el rol del JWT; la UI solo la refleja.

## SEO y cookies

- **SEO:** `SeoService` aplica en cada navegación descripción, URL canónica, Open Graph/Twitter, `robots` (cuenta, carrito, panel e ingreso van `noindex`) y, en producto, JSON-LD `schema.org/Product`. Las descripciones por página están en `core/seo.service.ts`.
- **robots.txt y sitemap.xml:** `SITE_URL=https://tu-dominio.com npm run seo:archivos` (por defecto localhost). El sitemap trae las páginas fijas; las fichas (productos, beneficios, destinos) las debe listar el backend.
- **Límite:** es una SPA; Google ejecuta JavaScript, pero las vistas previas de redes sociales no. Para ellas hace falta SSR/prerender (`ng add @angular/ssr`).
- **Cookies:** `ConsentimientoService` guarda la elección (esenciales siempre; analítica y marketing opcionales) y el pie tiene "Preferencias de cookies". Cualquier herramienta de analítica que se agregue debe iniciarse solo si `analitica()` es true.

## Pruebas unitarias (Vitest)

```bash
npm test            # lógica pura (promos, niveles, correos) e interceptores HTTP
```

Los archivos `*.spec.ts` junto al código. Las e2e (abajo) cubren los flujos completos.

## Pruebas e2e (Playwright)

```bash
npm run e2e        # corre las ~114 pruebas (levanta o reutiliza `npm start`)
npm run e2e:ui     # modo interactivo
```

Usan el Microsoft Edge instalado (`channel: "msedge"` en `playwright.config.ts`; cámbialo por `chrome` o ejecuta `npx playwright install chromium`). Cada prueba corre con un `localStorage` limpio, así que los datos de la MockAPI no se contaminan entre pruebas.

| Archivo | Qué cubre |
| --- | --- |
| `routes-links.spec.ts` | Las 28 rutas del sitio y las 16 del admin cargan sin errores de consola; 404 y detalles inexistentes; todo enlace interno resuelve; no hay enlaces muertos (`#`); menú |
| `responsive.spec.ts` | Sin scroll horizontal a 375 / 768 / 1024 px (sitio y admin); menú móvil; cabecera sin solapes; barra lateral del admin |
| `participante.spec.ts` | Login OTP, catálogo/filtros/orden, búsqueda, favoritos, carrito y checkout (puntos, mixto, insuficiente, digital/físico), cupones, compra/transferencia/cashback de puntos, historial CSV, vuelos, perfil, contacto, juegos |
| `conexiones.spec.ts` | Cada pantalla del admin tiene efecto en el sitio: reglas de puntos, secciones del Home, FAQ/legales, menú, formulario de datos, stock, ajustes/bloqueo de cuentas, promociones, lotes de cupones |
| `admin.spec.ts` | Login y roles, recuperación de contraseña, y que lo administrado **se refleje en el sitio** (productos, niveles, configuración, banners, destinos), pedidos, participantes, carga masiva, atención, cotizaciones, usuarios, formulario, persistencia |

## Estructura

```
src/app/
├─ core/
│  ├─ api.service.ts          Cliente HTTP (todas las rutas cuelgan de /api)
│  ├─ catalog.service.ts      Catálogo de solo lectura (productos, beneficios, niveles, banners…) como signals
│  ├─ store.service.ts        Sesión del participante: puntos, carrito, favoritos, direcciones, cupones
│  ├─ format.ts / labels.ts / nav.ts / models.ts
│  └─ mock-api/               ← MockAPI (ver abajo)
├─ shared/                    Header, footer, modal, tarjetas, slider, buscador, selector de ciudad, niveles…
├─ pages/                     Páginas del participante (catálogo, carrito, puntos, vuelos, perfil…)
├─ admin/                     Panel de administración (layout, kit de UI, 16 páginas)
└─ app.routes.ts              Rutas (lazy) y títulos de página
```

## MockAPI

No hay backend: un **interceptor HTTP** (`core/mock-api/mock-api.interceptor.ts`) atiende todo lo que va a `/api/*` con una base de datos en memoria (`db.ts`) sembrada con los datos del proyecto original (`seed/`). Responde con una latencia artificial de ~120 ms y devuelve errores HTTP reales (404, 422).

- **Persistencia**: tras cada escritura el estado se guarda en `localStorage` (`bancosolidario_mockdb_v1`). Para volver a los datos de ejemplo: Admin → Configuración → *Restablecer datos de ejemplo*, o borra esa clave.
- **Admin ↔ sitio**: lo que se guarda en el admin (productos, beneficios, destinos, ciudades, banners, niveles, categorías) se refleja en el sitio del participante. Los pedidos del checkout aparecen en Admin → Pedidos.
- **Endpoints** (resumen):

| Área | Rutas |
| --- | --- |
| Auth | `POST auth/otp`, `POST auth/verificar` |
| Catálogo | `GET catalogo/productos[/:id]`, `catalogo/productos/tabs`, `catalogo/beneficios[/:id]`, `catalogo/categorias-*`, `catalogo/banners/:seccion`, `niveles` |
| Vuelos / config | `GET vuelos/ciudades`, `vuelos/destinos[/:slug]`, `config`, `destinatarios/:dni` |
| Participante | `me`, `me/perfil`, `me/direcciones`, `me/correos`, `me/favoritos/:id`, `me/cupones`, `me/movimientos`, `me/compras[/:codigo]`, `me/beneficios`, `me/cotizaciones`, `POST contacto` |
| Puntos y pedidos | `POST me/puntos/{sumar,compra,transferencia,cashback}`, `POST ordenes` |
| Admin | `GET/PUT admin/c/:coleccion` (participantes, pedidos, mensajes, usuarios, productos, beneficios, destinos, ciudades, banners, campos, lotes…), `admin/resumen`, `admin/reportes`, `admin/movimientos`, `admin/reglas`, `PUT admin/niveles` |

### Pasar a un backend real

1. Quita `mockApiInterceptor` de `provideHttpClient(withInterceptors([...]))` en `src/app/app.config.ts`.
2. Apunta `ApiService.base` a la URL de tu API (o configura un proxy de `/api` en `ng serve`).
3. Implementa los endpoints de la tabla; los tipos del dominio están en `core/models.ts`. El resto de la app no cambia, porque solo habla con `ApiService`.

## Qué cambió respecto a React

| React / Lovable | Angular |
| --- | --- |
| TanStack Router (file-based) | `app.routes.ts` con `loadComponent`, layout compartido (`SiteLayoutComponent`) |
| `StoreProvider` (Context) | `StoreService` con signals + persistencia vía API |
| Datos importados en el bundle | `CatalogService` → API mock |
| `lucide-react` | `lucide-angular` con registro de íconos (`shared/icon.component.ts`, tree-shaking) |
| `recharts` | `chart.js` (carga diferida, solo en el admin) |
| `sonner` | `ToastService` + `<a-toaster>` |
| `useSyncExternalStore` (cotizaciones) | API + signals |

## Pendientes conocidos

- La imagen `asesora-contacto.png` de la página *Contáctanos* era un recurso alojado en Lovable que no está en el repositorio; la sección se muestra sin esa ilustración (colócala en `public/img/` y vuelve a agregarla en `profile-pages.ts`).
- No se agregaron pruebas automáticas (el proyecto original tampoco las tenía).
- Los componentes de `components/ui` de shadcn (no utilizados por las rutas) no se portaron.


## Textos legales con versiones, roles personalizados y vista de tabla

**Textos legales (Admin → Textos legales).** Términos y Privacidad se publican como versiones nuevas (nunca se edita una publicada), con "qué cambió" (queda en el historial), fecha de vigencia (hoy o futura, queda programada), borrador, historial, comparación línea a línea y "restaurar como borrador". **Los participantes los aceptan una sola vez, en su primer ingreso (web y app):** hasta que lo hacen, un aviso bloquea el sitio con **una casilla por documento** (Términos y condiciones; Política de privacidad con el uso y tratamiento de datos) y no se continúa sin marcarlas; la aceptación queda registrada con versión, fecha y canal. **Publicar una versión nueva no vuelve a pedirla ni envía avisos** (no hay "actualización" de aceptación; el campo `exigeAceptacion` quedó en desuso). Mientras no acepten, el servidor rechaza canjes y compras de puntos (403). Las páginas `/terminos` y `/privacidad` muestran "Versión N · vigente desde…", la ficha del participante muestra qué aceptó y el reporte Participantes cuenta los que aún no aceptan (no han tenido su primer ingreso). La participante demo viene ya aceptada (así las pruebas no parten con el aviso); en la demo publicada se define `BS_DEMO_PRIMER_INGRESO` en `index.html` para que parta sin aceptar y se vea el primer ingreso. En la demo la aceptación no tiene validez legal; un backend real debe guardar versión, fecha, canal e IP, y exigirla en cada acción.

**Roles personalizados (Admin → Roles).** Los cinco roles del sistema son fijos (se pueden duplicar). El administrador crea roles con una matriz Sección × Acción (ver / crear y editar / eliminar / exportar; quien puede lo demás necesariamente puede ver), los edita (el nombre no cambia), y solo puede eliminar uno que nadie use. Siempre debe quedar un Administrador activo. El panel recibe las matrices con `admin/meta`; el servidor vuelve a comprobar cada petición. Los cambios quedan en el Registro de cambios.

**Vista de tabla.** Los módulos con lista (Pedidos, Cotizaciones, Compras de puntos, Movimientos, Participantes, Correos, Registro de cambios, Importaciones, Reportes) tienen el selector *Tarjetas / Tabla* en el encabezado (`<a-header vista="…">`). La elección se recuerda por módulo en el navegador; por defecto son tarjetas.

**CCO por plantilla.** Además de los Ajustes generales, cada plantilla a participantes (Correos → Plantillas → Editar) elige quién recibe copia: *Según los Ajustes*, *Solo estas direcciones* (reemplaza la general, incluso apagada) o *Sin copia*. Las campañas siguen usando solo los Ajustes.

**Datos personales y direcciones: validaciones.** Mis datos y las direcciones de envío validan al salir de cada campo y al guardar (`core/validaciones.ts`, `validar-perfil.ts`, `validar-direccion.ts`; el servidor simulado repite las reglas con error 422). Fecha de nacimiento: fecha real, no futura, de 18 a 110 años. Provincia → ciudad son listas fijas en cascada (`core/ubicaciones.ts`, hoy Ecuador; en otros países la ciudad es texto). El teléfono usa bandera y prefijo del país (`shared/telefono-input.ts`). El formulario sigue un orden lógico (personales, contacto, ubicación, otros); si hay `Apellido paterno/materno` o `N.º de celular` configurados, el administrador no necesita campos fijos duplicados. El creador de formularios muestra ese mismo orden, las reglas de cada campo y no deja conectar dos campos al mismo dato; la ficha del participante muestra sus respuestas agrupadas y valida lo que edita el panel.

**Ficha de la marca.** Cada marca aliada tiene su ficha (`/admin/marcas/:id`, ícono de ojo o su nombre en la lista) con productos, beneficios, canjes con artículos suyos e historial de cambios; se enlazan por el nombre de la marca. Las listas con tarjetas compactas (Marcas, Ciudades de Destinos) llevan el interruptor a la izquierda y las acciones como íconos a la derecha.

**Módulos entrelazados.** Las listas de las fichas (participante y marca) llevan al detalle de cada registro: pedidos, compras de puntos, cotizaciones, productos, beneficios y la ficha del participante. Funciona con `?ver=ID` en la dirección del módulo (`abrirDesdeUrl` en `admin/kit.ts`). En Roles, la matriz de permisos y los usuarios de cada rol se ven en ventanas (enlaces de texto) y las acciones destructivas (eliminar, cancelar pedido, desactivar, bloquear) son rojas (variantes `danger`, `peligro` y `peligro-ghost` del botón).

**Mi perfil del panel** (`/admin/perfil`, desde el menú de usuario): nombre editable, correo y rol de solo lectura, último ingreso y cambio de contraseña con requisitos visibles (10+ caracteres, mayúsculas y minúsculas, número y símbolo) y botón para mostrar u ocultar. Disponible para cualquier rol; los cambios quedan en el Registro de cambios sin guardar la contraseña.

## Descargas, plantillas de Excel y límites de caracteres

- **Solo Excel o PDF, nunca CSV.** Todo listado del panel tiene el botón **Descargar**, que abre un diálogo para elegir Excel (.xlsx) o PDF; los dos salen con el color de la marca y los encabezados en mayúscula (`core/descargas.ts`, `admin/descarga-dialog.ts`). El nombre lleva la fecha (`pedidos_2026-11-09.xlsx`). Las llamadas son `descargarTabla(nombre, [encabezados, ...filas], título)`.
- **Excel con formato** (`core/xlsx.ts`, sin librerías): encabezado con el color de la marca, bordes, fila fija, filtro, celdas combinadas, listas desplegables, columnas de texto (documentos, códigos) y estilos para instrucciones y ejemplos. **PDF de tablas** (`core/pdf-tabla.ts`, `core/pdf-base.ts`): banda de marca, hoja vertical o apaisada, encabezado repetido y paginación.
- **Plantillas de carga** (`core/plantillas-xlsx.ts`): tres hojas, **Instrucciones** (cómo llenarla y tabla de columnas con ejemplo), **Datos** (la hoja que se sube; `*` en los obligatorios) y **Ejemplo** (no se importa). El reporte de errores de una carga también es Excel.
- **Lectura de cargas** (`core/xlsx-lector.ts`, `core/leer-archivo.ts`): lee .xlsx (hoja «Datos» o la primera) comprimido o no, con `DecompressionStream`. Por compatibilidad, la carga acepta también texto separado por coma, punto y coma o tabulador (.csv/.txt) exportado de otros sistemas; las descargas de la plataforma nunca son CSV.
- **Límites de caracteres** (`core/limites.ts`): una tabla única (nombre 80, persona 60, etiqueta 30, título 100, descripción 1000, correo 100, código 40, URL 300…). `shared/limites-campos.ts` pone `maxlength` a todo campo de texto que no traiga uno (según su etiqueta) y muestra un contador "72/80" al llegar al 70 %; un `maxlength` escrito a mano en el campo siempre gana. El servidor simulado vuelve a validar los mismos límites en las altas y ediciones del panel (`errorLargosFila`, 400).

## Reglas de los beneficios (vigencia, cupón, código compartido y provincias)

Las reglas viven en `core/cupones.ts` (funciones puras, con pruebas) y las comparten el panel, el sitio y el servidor simulado. "Canjear" es **generar el cupón** en la plataforma.

- **Vigencia:** cada beneficio tiene `desde` y `hasta` (AAAA-MM-DD, inclusivas; vacío = sin límite). Estado calculado hoy: Programado, Vigente o Vencido (no se guarda). El catálogo (`GET catalogo/beneficios`) solo lista los vigentes; la ficha (`GET catalogo/beneficios/:id`) sigue abierta con `vigencia` para explicar por qué no se puede canjear. En el panel hay columna y filtro de vigencia.
- **Regla del cupón:** `{ horas, limite, meses }`. El cupón dura `horas`; cada participante puede canjearlo `limite` veces (0 = sin límite) y, al completarlas, debe esperar `meses` **contados desde su último canje**; pasada la espera empieza un ciclo nuevo. La regla es **por beneficio** (`cupon`, se edita en Beneficios → Editar); no existe regla general. Un beneficio sin regla guardada parte de 3 h, sin límite y 3 meses.
- **Código compartido:** `modoCodigo: "compartido"` con `codigoCompartido` y `usosMaximos` (0 = sin máximo; `usos` cuenta). Todos reciben el mismo código; el límite por persona sigue valiendo. El código no se publica en el catálogo. Con `"unico"` (por defecto) se siguen usando los lotes de códigos del comercio.
- **Provincias:** `provincias` (lista oficial del país; vacía = todo el país). El sitio ofrece el filtro **Provincia** en el catálogo de beneficios y la ficha dice dónde está disponible. Si el participante no tiene provincia en Mis datos, el beneficio se muestra y se le pide completarla; si la suya no está incluida, no puede canjear.
- **API:** `GET me/cupones/estado/:beneficioId` devuelve `{ estado: disponible | no_vigente | otra_provincia | falta_provincia | bloqueado | agotado, mensaje, regla, disponibleDesde?, restantes? }` y `POST me/cupones` aplica las mismas reglas (409/422 con el mensaje). El servidor valida las reglas al guardar (`errorReglasBeneficio`, 422).

## Cargas masivas (productos, beneficios, marcas, ajuste de puntos e imágenes)

- **Dónde:** botón **Carga masiva** en Productos, Beneficios y Marcas, y **Ajuste masivo de puntos** en Participantes (`admin/carga-masiva.ts`, un solo componente con el mismo recorrido para los cuatro). Cada carga queda en Importaciones con sus filas rechazadas.
- **Recorrido:** 1) plantilla de Excel (Instrucciones, Datos y Ejemplo, con el color de la marca), 2) imágenes opcionales, 3) archivo lleno → **revisión fila por fila** (se crea, se actualiza o el motivo del error) → confirmar. Las filas con error no frenan a las demás y se bajan en un Excel para corregirlas. Máximo 2.000 filas por carga.
- **Crear o actualizar:** la clave es el **código** (productos y beneficios; es su identificador) o el **nombre** (marcas). Si existe se actualiza y **las celdas vacías no cambian el dato**; los obligatorios solo se exigen al crear. Las marcas, categorías y subcategorías se enlazan por nombre (sin importar mayúsculas ni tildes); las provincias de un beneficio, contra la lista oficial; las fechas aceptan AAAA-MM-DD, dd/mm/aaaa o el formato de fecha de Excel. Los beneficios llevan vigencia, provincias, regla del cupón y código compartido.
- **Imágenes en masa:** se suben **varias a la vez o un ZIP** (se ignoran las carpetas de Mac y lo que no es imagen) y se enlazan por el **nombre del archivo** en la columna Imágenes (con o sin extensión, la primera es la principal); también se aceptan direcciones https://. Se achican en el navegador (lado mayor 900 px, WebP). Como la base simulada vive en el navegador (~5 MB), hay un presupuesto de ~3 MB por carga; con un servidor real irían a almacenamiento de archivos.
- **Ajuste de puntos:** por documento, `+` suma y `−` resta, con motivo. **Primero se simula** en el servidor (participante, saldo antes y después, total que se suma y se resta) y solo se aplica al confirmar; los que dejarían el saldo en negativo, documentos inexistentes o repetidos se rechazan. Cada ajuste queda en la ficha del participante, en su historial de puntos y en el Registro de cambios. No se puede deshacer: se corrige con otro ajuste de signo contrario.
- **Servidor simulado:** `POST admin/c/{productos|beneficios|marcas}/upsert` (todo o nada: valida límites de caracteres y reglas de beneficios) y `POST admin/participantes/ajustes-masivos` (`aplicar: false|true`). Piezas puras con pruebas: `core/carga-masiva.ts` (conversión y validación de celdas), `core/cargas.ts` (columnas y registros), `core/imagenes-carga.ts`.

## Pop-ups y centro de ayuda

- **Pop-ups** (Admin → Pop-ups, sección propia en Roles): mensajes por encima del contenido, con **contenido distinto para web y app** (título, mensaje, imagen y botón con enlace por canal; se puede copiar de uno a otro), **vigencia** (inicio y fin), **frecuencia** (una vez por sesión, una sola vez, cada N días o siempre), dónde sale (solo el inicio o cualquier página) y **prioridad** (si hay varios vigentes sale primero el de mayor prioridad, uno a la vez). Hay vista previa, pausa sin borrar, duplicar y estadísticas de vistas y clics por canal. Lógica pura en `core/popups.ts`; el sitio los muestra con `shared/popup-host.ts` (diálogo accesible: foco atrapado, Escape cierra, nunca tapa el aviso de textos legales; si falla la carga, simplemente no se muestra). El de ejemplo viene pausado.
- **API de pop-ups** (la usa también la app): `GET popups?canal=web|app&pagina=inicio|otra` devuelve solo lo vigente y solo el contenido de ese canal (sin estadísticas ni datos internos); `POST popups/:id/evento { canal, tipo: vista|clic|cierre }`. La frecuencia la aplica quien los muestra, con `debeMostrar`.
- **Centro de ayuda** (Admin → Ayuda): guías para quienes operan el panel, **dirigidas a uno o varios roles** (vacío = todos; incluye roles personalizados). Cada persona ve solo las suyas, con buscador (sin tildes ni mayúsculas, todas las palabras), categorías y enlace directo (`/admin/ayuda?ver=id`). Quien tiene permiso de editar sobre «Ayuda» ve la pestaña **Administrar**: crear, editar con vista previa del texto (markdown simple), ordenar, elegir roles y publicar o despublicar. La ayuda se puede **ver siempre** (cualquier rol); administrarla es un permiso. Vienen 11 guías iniciales (`core/ayuda.ts`).
- **API de ayuda:** `GET admin/ayuda` (publicadas y dirigidas al rol de quien pregunta) y la colección `admin/c/guias` (solo con permiso de editar Ayuda; el servidor valida cada guía).

## Cargas: participantes y códigos migrados, exportar el catálogo y pop-ups de solo imagen

- **Un solo recorrido para las seis cargas.** Participantes (Participantes → Carga masiva) y códigos de beneficio (Beneficios → Cupones y códigos → Cargar códigos) usan ahora `admin/carga-masiva.ts`, igual que productos, beneficios, marcas y ajuste de puntos: plantilla de Excel, revisión fila por fila, reporte de errores en Excel y registro en Importaciones. Participantes **solo crea**: el servidor rechaza al que ya existe (mismo documento o correo) y lo avisa; sigue enviando el correo de bienvenida. En códigos se elige el beneficio y el vencimiento antes de subir el archivo; los repetidos dentro del archivo o ya cargados en otro lote del beneficio se marcan como error en la revisión y el resto forma un lote nuevo (`POST admin/lotes/cargar`, con permiso de Beneficios y registro en el Registro de cambios).
- **Exportar lo que hay.** En las cargas de productos, beneficios y marcas, el botón **Descargar lo que hay para editarlo** baja el catálogo actual en el mismo formato de la carga (`plantillaConDatos`, `filaDeEntidad`): se edita en Excel y se vuelve a subir; cada fila con su código se actualiza y las que se agreguen al final se crean. Las imágenes subidas desde el panel no caben en una celda, así que se exportan vacías (una celda vacía no cambia la imagen); las que son direcciones https:// sí se exportan.
- **Pop-ups: formato por canal.** Cada canal (web y app) elige **Imagen, texto y botón** o **Solo imagen**: en este formato la imagen es todo el pop-up (obligatoria, vertical o cuadrada), es clicable si tiene enlace y el título hace de texto alternativo para lectores de pantalla. La API pública incluye `formato` (`mixto` por defecto).