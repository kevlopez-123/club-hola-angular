import { errorLargo } from "./limites";

/**
 * Centro de ayuda del panel: guías para quienes operan la plataforma, dirigidas a uno o varios roles y administrables desde el
 * propio panel. Funciones puras (filtro por rol, búsqueda, validación) y las guías iniciales con las que arranca.
 */
export interface Guia {
  id: string;
  titulo: string;
  categoria: string;
  /** Una o dos líneas que se ven en la lista. */
  resumen: string;
  /** Texto con formato (markdown simple: títulos, listas, negritas, enlaces). */
  contenido: string;
  /** Roles a los que va dirigida. Vacío = todos. */
  roles: string[];
  /** Orden dentro de su categoría (menor primero). */
  orden: number;
  publicada: boolean;
  /** Última edición (AAAA-MM-DD). */
  actualizada: string;
}

export const guiaVacia = (): Guia => ({ id: "", titulo: "", categoria: "General", resumen: "", contenido: "", roles: [], orden: 50, publicada: true, actualizada: new Date().toISOString().slice(0, 10) });

/** Valida una guía. Devuelve el primer error o cadena vacía. */
export function errorGuia(g: Guia): string {
  if (!g.titulo.trim()) return "Escribe el título de la guía.";
  if (!g.categoria.trim()) return "Elige o escribe la categoría.";
  if (!g.contenido.trim()) return "Escribe el contenido de la guía.";
  if (!Number.isInteger(g.orden) || g.orden < 0 || g.orden > 999) return "El orden debe ser un número de 0 a 999.";
  return errorLargo(g.titulo, "titulo", "El título") || errorLargo(g.categoria, "etiqueta", "La categoría") || errorLargo(g.resumen, "breve", "El resumen") || errorLargo(g.contenido, "documento", "El contenido");
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ¿Esta guía es para este rol? (sin roles = para todos). */
export const guiaEsPara = (g: Pick<Guia, "roles">, rol: string) => !g.roles.length || g.roles.includes(rol);

/**
 * Guías que ve un rol: solo las publicadas que le tocan, filtradas por texto (título, resumen, categoría y contenido, sin importar
 * tildes ni mayúsculas; todas las palabras deben aparecer) y categoría, ordenadas por categoría y orden.
 */
export function guiasPara(guias: Guia[], rol: string, f: { q?: string; categoria?: string } = {}): Guia[] {
  const palabras = norm(f.q ?? "").split(/\s+/).filter(Boolean);
  return guias
    .filter((g) => g.publicada && guiaEsPara(g, rol))
    .filter((g) => !f.categoria || g.categoria === f.categoria)
    .filter((g) => {
      if (!palabras.length) return true;
      const texto = norm(`${g.titulo} ${g.resumen} ${g.categoria} ${g.contenido}`);
      return palabras.every((p) => texto.includes(p));
    })
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "es") || a.orden - b.orden || a.titulo.localeCompare(b.titulo, "es"));
}

/** Categorías que existen en una lista de guías, en orden alfabético. */
export const categoriasDe = (guias: Guia[]) => [...new Set(guias.map((g) => g.categoria))].sort((a, b) => a.localeCompare(b, "es"));

const F = "2026-11-09";
const g = (id: string, categoria: string, orden: number, titulo: string, resumen: string, roles: string[], contenido: string): Guia => ({ id, titulo, categoria, resumen, contenido, roles, orden, publicada: true, actualizada: F });

/** Guías con las que arranca el centro de ayuda (el administrador las edita, agrega o despublica). */
export const GUIAS_INICIALES: Guia[] = [
  g("primeros-pasos", "Primeros pasos", 1, "Cómo moverte por el panel", "El menú, la búsqueda rápida y tu perfil.", [],
`## Qué ves en el panel

El **menú de la izquierda** muestra solo las secciones a las que tu rol tiene acceso. Si falta alguna que necesitas, pídele a un administrador que ajuste tu rol.

## Atajos útiles

- **Búsqueda rápida:** escribe en la barra de arriba (o pulsa Ctrl + K) para ir a cualquier sección o hacer una acción.
- **Tarjetas o tabla:** en muchos listados puedes cambiar la vista con el selector de la esquina.
- **Tu perfil:** en el menú de tu nombre puedes cambiar tu nombre y tu contraseña.

## Si algo no sale como esperabas

Los cambios importantes quedan en el **Registro de cambios** con quién los hizo y cuándo. Ahí puedes ver qué se modificó.`),
  g("descargas", "Primeros pasos", 2, "Descargar listados en Excel o PDF", "Cómo bajar la información de cualquier pantalla.", [],
`En cada listado hay un botón **Descargar**. Al pulsarlo eliges el formato:

- **Excel (.xlsx):** para filtrar, ordenar o seguir trabajando los datos.
- **PDF:** para imprimir o compartir.

Se descarga **lo que tienes filtrado**, no solo la página que ves. Los archivos salen con los colores de la marca y los encabezados en mayúscula.`),
  g("colores", "Sitio y app", 1, "Cambiar los colores y el logo del sitio", "Dónde se configura la marca de la plataforma.", ["Administrador"],
`1. Entra a **Configuración → Marca y localización**.
2. Cambia el **Color principal**, el color del texto y los fondos. Verás los cambios al instante en el panel.
3. Sube el **logo** y el ícono del navegador.
4. Pulsa **Guardar marca** para publicarlo en el sitio.

> Los colores del sitio cambian al guardar. Las **imágenes** (banners, logo) no se recolorean: si tienen el color anterior, hay que subirlas de nuevo.`),
  g("cargas-excel", "Carga masiva", 1, "Cargar productos, beneficios o marcas con Excel", "El recorrido completo: plantilla, revisión y confirmación.", ["Administrador", "Catálogo"],
`## Antes de empezar

En **Productos**, **Beneficios** o **Marcas** pulsa **Carga masiva**.

## Paso a paso

1. **Descarga la plantilla.** Trae tres hojas: *Instrucciones*, *Datos* y *Ejemplo*.
2. **Llena la hoja «Datos»** desde la fila 2. Los encabezados con **\\*** son obligatorios al crear.
3. **Sube el archivo.** Verás una revisión fila por fila: *Se crea*, *Se actualiza* o el motivo del error.
4. **Confirma.** Las filas con error no se cargan; descarga el reporte, corrígelas y vuelve a subirlas.

## Crear o actualizar

La columna **Código** (o el **nombre** en marcas) identifica cada fila. Si ya existe, se **actualiza** y las celdas vacías **no cambian** el dato. Las listas se separan con punto y coma.

## Límites

Máximo **2.000 filas** por carga. Los textos tienen límite de caracteres, que la plantilla indica en cada columna.`),
  g("imagenes-masa", "Carga masiva", 2, "Subir imágenes en masa", "Varias a la vez o dentro de un ZIP.", ["Administrador", "Catálogo"],
`En el paso **Imágenes** de la carga masiva puedes subir **varias imágenes a la vez** o un **ZIP** con todas.

## Cómo se enlazan

Por el **nombre del archivo**. Si un producto tiene en la columna *Imágenes* el valor \`laptop-1.jpg; laptop-2.jpg\`, se usan esos dos archivos; la primera es la principal. Da igual si escribes la extensión o las mayúsculas.

## Qué tener en cuenta

- Se aceptan JPG, PNG, WebP, GIF y SVG. Lo demás se ignora y se avisa.
- Las imágenes se **achican** automáticamente para que carguen rápido.
- Si una fila cita una imagen que no subiste, esa fila se rechaza con el nombre que falta.`),
  g("beneficios-reglas", "Catálogos", 1, "Beneficios: vigencia, cupones y provincias", "Fechas, regla del cupón, código compartido y dónde está disponible.", ["Administrador", "Catálogo"],
`## Vigencia

Cada beneficio puede tener **fecha de inicio y de vencimiento**. Fuera de ese rango no se muestra ni se puede canjear.

## Regla del cupón

Define **cuánto dura** el cupón, **cuántas veces** puede canjearlo cada participante y **cuánto debe esperar** para volver a hacerlo (contado desde su último canje). Hay una **regla general** en *Cupones y códigos* y cada beneficio puede tener la suya.

## Código compartido

En lugar de códigos únicos por participante, un beneficio puede usar **un mismo código para todos**, con un máximo de usos opcional.

## Provincias

Puedes limitar un beneficio a algunas provincias. Si el participante no indicó la suya, el beneficio se le muestra y se le pide completar sus datos.`),
  g("ajuste-puntos", "Participantes", 1, "Ajustar puntos a varios participantes", "Suma o resta puntos con un Excel.", ["Administrador", "Operaciones"],
`En **Participantes** pulsa **Ajuste masivo de puntos**.

1. Descarga la plantilla y llena **documento**, **puntos** (positivo suma, negativo resta) y **motivo**.
2. Súbela: el sistema **simula** el resultado, con el saldo antes y después de cada fila y el total que se suma y se resta.
3. Si todo está bien, confirma.

**Importante:** los ajustes no se pueden deshacer; se corrigen con otro ajuste de signo contrario. Un ajuste que dejaría el saldo en negativo se rechaza. Cada ajuste queda en el historial del participante y en el Registro de cambios.`),
  g("pedidos-cotizaciones", "Operación", 1, "Gestionar pedidos y cotizaciones", "Estados, mensajes y seguimiento.", ["Administrador", "Operaciones", "Atención"],
`## Pedidos

Abre un pedido para ver su detalle y cambiar su **estado**. Al cambiarlo, el participante recibe un correo.

## Cotizaciones de vuelos

Cada solicitud muestra los pasajeros y el seguimiento. Puedes asignar una **ejecutiva**, subir el **PDF** de la cotización y escribir mensajes. Hay un máximo de **48 horas** para responder.

## Atención

Los mensajes de los participantes llegan a **Atención**: responde y cambia su estado cuando esté resuelto.`),
  g("textos-legales", "Sitio y app", 2, "Publicar un texto legal nuevo", "Versiones, vigencia y reaceptación.", ["Administrador"],
`En **Textos legales** se guardan los Términos y la Política de privacidad por **versiones**.

1. Edita el texto como **borrador**.
2. Indica **desde cuándo rige** y si los participantes deben **volver a aceptarlo**.
3. **Publica**. Si exige reaceptación, la próxima vez que ingresen verán el texto antes de seguir.

Las versiones anteriores se conservan y puedes cargarlas de nuevo como borrador.`),
  g("roles", "Administración", 1, "Crear roles y dar permisos", "Quién puede ver y hacer qué.", ["Administrador"],
`En **Roles** puedes **duplicar** un rol existente o crear uno nuevo y marcar, sección por sección, qué puede hacer: **ver**, **crear y editar**, **eliminar** y **exportar**.

- Los roles del sistema no se editan, pero se pueden duplicar para partir de ellos.
- Siempre debe quedar al menos un administrador activo.
- Un rol sin permisos de una sección no la ve en su menú.

Después asigna el rol a cada persona en **Usuarios**.`),
  g("popups", "Sitio y app", 3, "Crear un pop-up", "Un mensaje con vigencia, distinto para web y app.", ["Administrador", "Catálogo"],
`En **Pop-ups** crea un mensaje que aparece por encima del contenido.

- **Contenido por canal:** puedes escribir uno para la web, otro para la app, o el mismo para ambos.
- **Vigencia:** fecha de inicio y de fin.
- **Frecuencia:** una vez por sesión, una sola vez, cada N días o cada vez.
- **Dónde sale:** solo en el inicio o en cualquier página.
- **Prioridad:** si hay varios vigentes, sale primero el de mayor prioridad.

Antes de publicar usa la **vista previa**. Puedes pausar un pop-up sin borrarlo.`),
];
