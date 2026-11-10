# Replicar la plataforma para otro cliente o país

La plataforma está en español únicamente. Cada despliegue es de **un solo cliente** (sin workspaces): la marca y el país se configuran una vez y el sitio y el panel los adoptan.

## Requisitos
- Usar los scripts de npm (`npm start`, `npm run build`, `npm run e2e`): traen Node 24 local. Angular 22 no soporta el Node 25 del sistema.
- `.npmrc` ya incluye `legacy-peer-deps=true` (peer de lucide-angular).

## Opción A: sin tocar código (Admin → Configuración → Marca y localización)
1. **Identidad:** nombre de la empresa, nombre del programa, unidad (puntos, millas…) y texto legal del pie.
2. **Colores:** principal, **letra de botones primarios** (blanca por defecto), texto, fondos, fuente y redondeo. Se ve en vivo.
3. **Logos e imágenes:** logo para fondo claro, logo para fondo de color, favicon (se muestra en la pestaña del navegador), imágenes de ingreso y de las secciones. Por URL o subiendo un archivo (máx. 1,5 MB). Sin logo se muestra el nombre de la empresa.
4. **País:** elige entre Ecuador (por defecto), Perú, Colombia, Chile, Bolivia, México, Panamá, Guatemala, España, Argentina y Brasil. Cada país trae código ISO, emoji, moneda, símbolo, prefijo y dígitos del celular, documentos de identidad y provincias; todo es editable.
5. **Provincias con envío:** activa o desactiva cada una, agrega o quita. El formulario de datos del participante ofrece solo las que tienen envío.
6. **Marcas aliadas** (Admin → Marcas): nombre, logo, sitio web y descripción de cada marca; productos y beneficios eligen la marca de esa lista y el detalle muestra su logo y enlace.
7. Guardar. **Exportar JSON** lleva la configuración a otro proyecto; **Importar** la carga (completa lo que falte con valores por defecto).

Las banderas son SVG de la librería open source [flag-icons](https://github.com/lipis/flag-icons) (MIT), copiados en `public/flags`. Para agregar un país: copiar su bandera a `public/flags/<iso>.svg` y añadirlo en `PAISES` de `src/app/tenants/presets.ts`.

## Opción B: otro cliente por defecto
1. En `src/app/tenants/presets.ts` editar `ECUADOR` (o duplicarlo) y ajustar `TENANT_POR_DEFECTO`.
2. Colocar logos en `public/img` y referenciarlos en `marca` / `imagenes`; el favicon por defecto es `public/favicon.ico`.

## Usuarios del panel
Hay un usuario por rol con sus contraseñas iniciales en `seed/admin.ts` (`credencialesIniciales`):

| Rol | Correo | Contraseña inicial |
|---|---|---|
| Administrador | admin@bancosolidario.com | Admin#2026 |
| Catálogo | catalogo@bancosolidario.com | Catalogo#2026 |
| Operaciones | operaciones@bancosolidario.com | Operaciones#2026 |
| Atención | atencion@bancosolidario.com | Atencion#2026 |
| Solo lectura | lectura@bancosolidario.com | Lectura#2026 |

Cambia estos correos y contraseñas antes de publicar. Con un backend real, el ingreso es `POST auth/admin/login` (`{ email, clave }` → `{ id, nombre, email, rol }`) y los permisos por rol están en `accesoPorRol` (`admin-shell.ts`); el backend debe aplicarlos también.

## Reemplazar el MockAPI por un backend real
- Todo el acceso a datos pasa por `HttpClient`; el mock vive en `src/app/core/mock-api/` (interceptor). Quitar `mockApiInterceptor` de `app.config.ts` y apuntar a la API real con los mismos contratos.
- Las listas del admin usan paginación de servidor: `GET admin/q/:col?page&size&q&sort&dir&f_campo&desde&hasta&facetas` → `{items,total,page,size,facetas}`. El backend necesita índices para esas consultas.
- El botón “Restablecer datos iniciales” solo aparece en modo desarrollo.

## Pruebas
- `npm run e2e` (Playwright, canal Edge). Escalabilidad: `STRESS_N=500000 npm run e2e -- escalabilidad escalabilidad-extra`.

## Dónde se configura cada cosa
| Qué | Dónde |
|---|---|
| Precio por punto, mínimo, máximo, tope mensual, **opciones rápidas** y compra activa/inactiva | Admin → Reglas de puntos → Compra de puntos |
| “Consideraciones” de la compra de puntos | Admin → Reglas de puntos → Consideraciones de la compra de puntos |
| Operaciones de compra de puntos (código, participante, puntos, monto pagado) | Admin → Compras de puntos (y en el historial de puntos del participante) |
| Rangos, colores y beneficios de cada nivel; subtítulo de Mi nivel; introducción y reglas de “¿Cómo funcionan los niveles?”; meses de cálculo | Admin → Niveles (los textos admiten `{empresa}`, `{programa}`, `{unidad}`, `{meses}`) |
| Pasajeros de una cotización (documento, nacimiento, edad, asistencia), ejecutiva, monto, PDF, conversación e historial de estados | Admin → Cotizaciones de vuelos (el participante ve y responde en Mis cotizaciones) |
| Ejecutivas de las cotizaciones | Son los usuarios con rol Atención, Operaciones o Administrador (Admin → Usuarios) |
| Banners | En su módulo: Home → Contenido; Canjea → Productos → Banners; Beneficios → Beneficios → Banners; Vuelos → Destinos → Banners de vuelos; Onboarding → Contenido. Se ordenan con las flechas |
| Usuarios, Roles y Registro de cambios | Tres secciones separadas en “Sitio y app” |
| Marcas aliadas (logo, web, descripción) | Admin → Marcas; las usan productos y beneficios |
