import { faltantesAlCrear, plantillaDeColumnas, procesarMatriz, sinAcentos, type ColCarga, type FilaProcesada, type Valores } from "./carga-masiva";
import { errorReglasBeneficio } from "./cupones";
import type { PlantillaDef } from "./plantillas-xlsx";

/**
 * Definición de las cargas masivas del panel: qué columnas lleva cada plantilla, cómo se validan y cómo se convierte una fila en
 * el registro del catálogo (crear o actualizar). Las filas vacías de una actualización no cambian el dato.
 */
export type TipoCarga = "beneficios" | "marcas" | "participantes" | "codigos";

export interface CtxCarga {
  marcas: { id: string; nombre: string; web?: string }[];
  categoriasBeneficio: { slug: string; label: string }[];
  /** Provincias oficiales del país. */
  provincias: string[];
  /** Registros que ya existen, por su clave (id; en marcas, el nombre sin tildes en minúscula). */
  existentes: Map<string, any>;
  /** Imágenes subidas: nombre de archivo normalizado → dirección (data:). */
  imagenes: Map<string, string>;
  hoyIso: string;
  /** Participantes: cuántos caracteres tiene el documento en el país configurado. */
  digitosDocumento?: number;
  /** Códigos: los que ya están cargados en otros lotes del beneficio elegido. */
  codigosExistentes?: Set<string>;
}

export interface FilaPreparada extends FilaProcesada {
  accion?: "crear" | "actualizar";
  /** Registro listo para guardar (productos, beneficios, marcas). En ajustes son los valores de la fila. */
  entidad?: any;
  /** Nombres de imágenes que se resolvieron con las subidas (para el resumen). */
  imagenesUsadas?: string[];
}

export interface Definicion {
  tipo: TipoCarga;
  /** Nombre en el historial de Importaciones. */
  nombre: string;
  /** Verbo y objeto para los botones ("Carga masiva de productos"). */
  titulo: string;
  columnas: ColCarga[];
  /** Columna que identifica cada fila. */
  clave: string;
  /** Colección del servidor donde se guarda (ajustes y códigos tienen su propio punto de entrada). */
  coleccion?: "beneficios" | "marcas" | "participantes";
  /** Solo crea (no actualiza por clave): participantes y códigos. */
  soloCrear?: boolean;
  conImagenes: boolean;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const claveMarca = (nombre: string) => slug(nombre);

/* ------------------------------------------------------------------ */
/* Columnas                                                            */
/* ------------------------------------------------------------------ */
const IMAGENES: ColCarga = {
  clave: "imagenes", titulo: "Imágenes", tipo: "imagenes",
  ayuda: "Nombres de los archivos subidos en el paso «Imágenes» (por ejemplo laptop-1.jpg) o direcciones https://…, separados por punto y coma. La primera es la principal.",
  ejemplo: "laptop-1.jpg; laptop-2.jpg", alias: ["imagen", "fotos", "foto"],
};
const ACTIVO: ColCarga = { clave: "activo", titulo: "Activo", tipo: "sino", ayuda: "Sí para publicarlo, No para dejarlo oculto. Vacío: Sí al crear, sin cambios al actualizar.", ejemplo: "Sí" };

export const COLUMNAS: Record<TipoCarga, ColCarga[]> = {
  beneficios: [
    { clave: "codigo", titulo: "Código", tipo: "codigo", obligatoria: true, limite: "codigo", ayuda: "Identifica el beneficio. Si ya existe, se actualiza; si no, se crea. También sirve de nombre para sus imágenes.", ejemplo: "POLLO-30", alias: ["sku"] },
    { clave: "nombre", titulo: "Nombre", tipo: "texto", obligatoria: true, limite: "nombre", ayuda: "Título del beneficio.", ejemplo: "30% de descuento en combo familiar" },
    { clave: "comercio", titulo: "Comercio", tipo: "texto", obligatoria: true, limite: "nombre", ayuda: "Marca aliada que lo ofrece; debe existir en Marcas aliadas.", ejemplo: "Pollo Gus", alias: ["marca"] },
    { clave: "categoria", titulo: "Categoría", tipo: "texto", obligatoria: true, limite: "nombre", ayuda: "Categoría de beneficios existente.", ejemplo: "Restaurantes" },
    { clave: "descuento", titulo: "Descuento", tipo: "texto", obligatoria: true, limite: "etiqueta", ayuda: "Texto corto del descuento.", ejemplo: "30%" },
    { clave: "modalidad", titulo: "Modalidad", tipo: "opcion", opciones: ["Cupón", "Compra"], ayuda: "Cupón: se genera un código para el comercio. Compra: se agrega al carrito y se paga con tarjeta. Vacío: Cupón.", ejemplo: "Cupón" },
    { clave: "precio", titulo: "Precio US$", tipo: "decimal", min: 0, max: 1000000, ayuda: "Precio en dólares (solo si tiene costo).", ejemplo: 0, alias: ["precio", "precio usd"] },
    { clave: "descripcion", titulo: "Descripción", tipo: "texto", limite: "descripcion", ayuda: "Texto de la ficha.", ejemplo: "Combo familiar de pollo asado con papas y ensalada." },
    { clave: "pasos", titulo: "Pasos", tipo: "lista", limite: "breve", ayuda: "Pasos para usarlo, separados por punto y coma. Vacío: los pasos estándar.", ejemplo: "Genera el cupón; Preséntalo en el local" },
    { clave: "terminos", titulo: "Términos", tipo: "texto", limite: "descripcion", ayuda: "Términos y condiciones.", ejemplo: "Válido de lunes a jueves." },
    { clave: "desde", titulo: "Desde", tipo: "fecha", ayuda: "Primer día de vigencia (AAAA-MM-DD o dd/mm/aaaa). Vacío: sin fecha de inicio.", ejemplo: "2026-12-01" },
    { clave: "hasta", titulo: "Hasta", tipo: "fecha", ayuda: "Último día de vigencia. Vacío: sin vencimiento.", ejemplo: "2027-03-31" },
    { clave: "provincias", titulo: "Provincias", tipo: "lista", limite: "nombre", ayuda: "Provincias donde está disponible, separadas por punto y coma. Vacío: todo el país.", ejemplo: "Pichincha; Guayas" },
    { clave: "codigocompartido", titulo: "Código compartido", tipo: "codigo", limite: "codigo", ayuda: "Si todos reciben el mismo código, escríbelo aquí. Vacío: códigos únicos de los lotes del comercio.", ejemplo: "", alias: ["codigo compartido"] },
    { clave: "usosmaximos", titulo: "Usos máximos", tipo: "entero", min: 0, max: 100000000, ayuda: "Máximo de usos del código compartido (0 o vacío = sin máximo).", ejemplo: 0, alias: ["usos maximos"] },
    { clave: "horas", titulo: "Duración (horas)", tipo: "entero", min: 1, max: 720, ayuda: "Cuánto dura el cupón. Vacío: 3 al crear; sin cambios al actualizar.", ejemplo: 24, alias: ["horas"] },
    { clave: "limite", titulo: "Límite de canjes", tipo: "entero", min: 0, max: 99, ayuda: "Veces que cada participante puede canjearlo (0 = sin límite). Vacío: sin límite al crear; sin cambios al actualizar.", ejemplo: 1, alias: ["limite"] },
    { clave: "meses", titulo: "Espera (meses)", tipo: "entero", min: 1, max: 60, ayuda: "Meses de espera desde el último canje para volver a canjearlo. Vacío: 3 al crear; sin cambios al actualizar.", ejemplo: 3, alias: ["meses"] },
    IMAGENES,
    ACTIVO,
  ],
  marcas: [
    { clave: "nombre", titulo: "Nombre", tipo: "texto", obligatoria: true, limite: "nombre", ayuda: "Nombre de la marca; identifica la fila (si ya existe, se actualiza).", ejemplo: "Pollo Gus" },
    { clave: "web", titulo: "Sitio web", tipo: "url", limite: "url", ayuda: "Dirección completa (https://…).", ejemplo: "https://www.polloGus.com", alias: ["web", "sitio"] },
    { clave: "descripcion", titulo: "Descripción", tipo: "texto", limite: "descripcion", ayuda: "Se muestra en el detalle de productos.", ejemplo: "Cadena de pollo asado." },
    { clave: "logo", titulo: "Logo", tipo: "imagenes", ayuda: "Nombre del archivo subido en el paso «Imágenes» (por ejemplo pollo-gus.png) o una dirección https://…", ejemplo: "pollo-gus.png", alias: ["imagen"] },
    ACTIVO,
  ],
  participantes: [
    { clave: "documento", titulo: "Documento", tipo: "codigo", obligatoria: true, limite: "codigo", texto: true, ayuda: "Cédula o documento: solo letras y números, con los caracteres que define el país (en Perú, 10). No puede repetirse con un participante que ya exista.", ejemplo: "1712345678", alias: ["cedula"] },
    { clave: "nombre", titulo: "Nombre", tipo: "texto", obligatoria: true, limite: "persona", ayuda: "Nombres y apellidos.", ejemplo: "Ana Torres" },
    { clave: "correo", titulo: "Correo", tipo: "correo", obligatoria: true, limite: "correo", ayuda: "Correo electrónico válido; ahí recibe su código de acceso y el correo de bienvenida.", ejemplo: "ana.torres@correo.com", alias: ["email"] },
    { clave: "nivel", titulo: "Nivel", tipo: "opcion", opciones: ["Clásico", "Plata", "Oro", "Diamante"], ayuda: "Nivel que le asigna el banco. Vacío: Clásico.", ejemplo: "Clásico" },
  ],
  codigos: [
    { clave: "codigo", titulo: "Código", tipo: "codigo", obligatoria: true, limite: "codigo", texto: true, ayuda: "Un código por fila (letras, números y guiones). Si ya está cargado en otro lote del mismo beneficio, se omite.", ejemplo: "ABC-0001" },
  ],
};

export const DEFINICIONES: Record<TipoCarga, Definicion> = {
  beneficios: { tipo: "beneficios", nombre: "Beneficios", titulo: "Carga masiva de beneficios", columnas: COLUMNAS.beneficios, clave: "codigo", coleccion: "beneficios", conImagenes: true },
  marcas: { tipo: "marcas", nombre: "Marcas aliadas", titulo: "Carga masiva de marcas", columnas: COLUMNAS.marcas, clave: "nombre", coleccion: "marcas", conImagenes: true },
  participantes: { tipo: "participantes", nombre: "Participantes", titulo: "Carga masiva de participantes", columnas: COLUMNAS.participantes, clave: "documento", coleccion: "participantes", soloCrear: true, conImagenes: false },
  codigos: { tipo: "codigos", nombre: "Códigos de beneficio", titulo: "Cargar códigos de beneficio", columnas: COLUMNAS.codigos, clave: "codigo", soloCrear: true, conImagenes: false },
};

const NOTA_ACTUALIZAR = "Si el código (o nombre) ya existe se actualiza ese registro: las celdas vacías no cambian el dato. Los obligatorios solo se exigen al crear.";
/** Una dirección sirve en Excel solo si es https:// (las imágenes subidas son data: enormes que no caben en una celda). */
const soloUrls = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x) => /^https?:\/\//i.test(String(x))).join("; ") : "");
const lista = (xs: unknown) => (Array.isArray(xs) ? xs.map((x) => String(x).replace(/;/g, ",")).join("; ") : "");
const sn = (v: unknown) => (v === false ? "No" : "Sí");

/** Fila de la plantilla con los datos de un registro existente (el camino inverso de `prepararCarga`). Las imágenes subidas no se exportan: una celda vacía no cambia la imagen al volver a subir. */
export function filaDeEntidad(tipo: TipoCarga, e: any): (string | number)[] {
  switch (tipo) {
    case "beneficios":
      return [e.id, e.nombre ?? "", e.marca ?? "", e.categoria ?? "", e.descuento ?? "", e.tipo === "compra" ? "Compra" : "Cupón", e.precio ?? "", e.descripcion ?? "", lista(e.pasos), e.terminos ?? "", e.desde ?? "", e.hasta ?? "", lista(e.provincias), e.modoCodigo === "compartido" ? (e.codigoCompartido ?? "") : "", e.modoCodigo === "compartido" ? (e.usosMaximos ?? "") : "", e.cupon?.horas ?? "", e.cupon?.limite ?? "", e.cupon?.meses ?? "", soloUrls(e.imagenes?.length ? e.imagenes : e.galeria), sn(e.activo)];
    case "marcas":
      return [e.nombre ?? "", e.web ?? "", e.descripcion ?? "", soloUrls([e.logo]), sn(e.activo)];
    default:
      return [];
  }
}

/** Plantilla con el catálogo actual ya cargado en la hoja Datos: se edita y se vuelve a subir (las filas con su código se actualizan). */
export function plantillaConDatos(tipo: TipoCarga, registros: any[]): PlantillaDef {
  const base = plantillaDe(tipo);
  const d = DEFINICIONES[tipo];
  return {
    ...base,
    titulo: `${d.titulo.replace("Carga masiva", "Catálogo actual")} (para editar y volver a subir)`,
    descripcion: `Trae ${registros.length} ${registros.length === 1 ? "registro" : "registros"} tal como están hoy. Cambia lo que necesites en la hoja «Datos» y súbelo con «Carga masiva»: cada fila con su código se actualiza y las que agregues al final se crean. Las imágenes subidas desde el panel no se exportan; déjalas vacías para conservarlas.`,
    filas: registros.map((r) => filaDeEntidad(tipo, r)),
  };
}

export function plantillaDe(tipo: TipoCarga): PlantillaDef {
  const d = DEFINICIONES[tipo];
  const base = { participantes: "Crea participantes con el nivel que les asigna el banco. Recibirán un correo de bienvenida al importarse.", codigos: "Cada código se entrega a un solo participante. El beneficio y la fecha de vencimiento se eligen en la pantalla de carga, no en el archivo.", productos: "Crea o actualiza productos del catálogo.", beneficios: "Crea o actualiza beneficios, con su vigencia, regla del cupón y provincias.", marcas: "Crea o actualiza marcas aliadas (nombre, sitio web, descripción y logo).", ajustes: "Suma o resta puntos a varios participantes a la vez. Cada ajuste queda en su historial con el motivo y quién lo hizo." }[tipo];
  const imagenes = d.conImagenes ? ["Las imágenes se suben aparte (varias a la vez o un ZIP) en el paso «Imágenes» y se enlazan por el nombre del archivo."] : [];
  const notas = tipo === "participantes"
    ? ["Un participante cuyo documento ya existe se rechaza: esta carga solo crea.", "Las filas con errores no se importan; se te entrega un reporte para corregirlas y volver a subirlas.", "No dejes filas vacías entre los datos."]
    : tipo === "codigos"
      ? ["Los repetidos dentro del archivo y los que ya están en otro lote del mismo beneficio se omiten.", "Los lotes se usan en orden de carga: cuando uno se agota o vence, sigue el siguiente."]
      : [NOTA_ACTUALIZAR, ...imagenes, "Las listas se separan con punto y coma."];
  const ej: Record<TipoCarga, (string | number)[][]> = {
    participantes: [["0923456781", "Luis Mora", "luis.mora@correo.com", "Clásico"]],
    codigos: [["ABC-0002"], ["ABC-0003"]],
    beneficios: [["CAFE-2X1", "2x1 en bebidas grandes", "Sweet & Coffee", "Cafeterías", "2x1", "Cupón", 0, "", "", "", "2026-12-01", "2027-03-31", "Pichincha; Azuay", "", 0, 24, 1, 3, "", "Sí"]],
    marcas: [["Sweet & Coffee", "https://www.sweetandcoffee.com", "Cafeterías", "sweet.png", "Sí"]],
  };
  return plantillaDeColumnas(d.columnas, { titulo: d.titulo, descripcion: base, ejemplos: ej[tipo], notas });
}

/* ------------------------------------------------------------------ */
/* Conversión de filas en registros                                    */
/* ------------------------------------------------------------------ */
const coincide = (a: string, b: string) => sinAcentos(a) === sinAcentos(b);
const quitarClave = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Resuelve nombres de archivo contra las imágenes subidas; las direcciones https:// o data: pasan tal cual. */
export function resolverImagenes(refs: string[], imagenes: Map<string, string>): { urls: string[]; faltan: string[] } {
  const urls: string[] = [];
  const faltan: string[] = [];
  for (const r of refs) {
    if (/^(https?:\/\/|data:image\/)/i.test(r)) { urls.push(r); continue; }
    const k = r.trim().toLowerCase();
    const sinExt = k.replace(/\.[a-z0-9]{2,5}$/, "");
    const u = imagenes.get(k) ?? imagenes.get(sinExt) ?? [...imagenes.entries()].find(([n]) => n.replace(/\.[a-z0-9]{2,5}$/, "") === sinExt)?.[1];
    if (u) urls.push(u); else faltan.push(r);
  }
  return { urls, faltan };
}
const errImagenes = (faltan: string[]) => `No encontré estas imágenes entre las que subiste: ${faltan.join(", ")}.`;

function construirBeneficio(v: Valores, ctx: CtxCarga, previo: any): { entidad?: any; error?: string; usadas?: string[] } {
  let marca: { nombre: string; web?: string | undefined } | undefined = previo ? { nombre: previo.marca, web: previo.marcaUrl } : undefined;
  if (v["comercio"] !== undefined) {
    const m = ctx.marcas.find((x) => coincide(x.nombre, String(v["comercio"])));
    if (!m) return { error: `El comercio «${v["comercio"]}» no existe. Créalo en Marcas aliadas (o súbelo en la carga de marcas) y vuelve a subir el archivo.` };
    marca = m;
  }
  let cat = previo ? { slug: previo.categoriaSlug, label: previo.categoria } : undefined;
  if (v["categoria"] !== undefined) {
    const c = ctx.categoriasBeneficio.find((x) => coincide(x.label, String(v["categoria"])) || coincide(x.slug, String(v["categoria"])));
    if (!c) return { error: `La categoría «${v["categoria"]}» no existe. Categorías: ${ctx.categoriasBeneficio.map((x) => x.label).join(", ")}.` };
    cat = c;
  }
  let provincias: string[] | undefined;
  if (v["provincias"] !== undefined) {
    provincias = [];
    for (const p of v["provincias"] as string[]) {
      if (/^todo(s)?( el pa[ií]s)?$/i.test(p)) { provincias = []; break; }
      const oficial = ctx.provincias.find((x) => coincide(x, p));
      if (!oficial) return { error: `«${p}» no es una provincia de la lista oficial.` };
      if (!provincias.includes(oficial)) provincias.push(oficial);
    }
  }
  let imgs: string[] | undefined;
  let usadas: string[] = [];
  if (v["imagenes"] !== undefined) {
    const r = resolverImagenes(v["imagenes"] as string[], ctx.imagenes);
    if (r.faltan.length) return { error: errImagenes(r.faltan) };
    imgs = r.urls;
    usadas = (v["imagenes"] as string[]).filter((x) => !/^(https?:|data:)/i.test(x));
  }
  const base = previo ?? {
    id: String(v["codigo"]), marca: "", marcaUrl: "", nombre: "", descuento: "", categoria: "", categoriaSlug: "", imagen: "", galeria: [], imagenes: [], descripcion: "",
    pasos: ["Genera el cupón para reservar", "Acércate al local con tu DNI en físico.", "Presenta el cupón", "¡Disfruta!"], especificaciones: [], terminos: "",
    tipo: "cupon", activo: true, exclusivo: false, promoTipo: "", promoDesde: "", promoHasta: "", etiqueta: "", etiquetaColor: "marca", modoCodigo: "unico", provincias: [], usos: 0,
  };
  const modalidad = v["modalidad"] === undefined ? undefined : v["modalidad"] === "Compra" ? "compra" : "cupon";
  const cupon = ["horas", "limite", "meses"].some((k) => v[k] !== undefined)
    ? { ...(previo?.cupon ?? {}), ...quitarClave({ horas: v["horas"], limite: v["limite"], meses: v["meses"] }) }
    : undefined;
  const compartido = v["codigocompartido"] !== undefined;
  const cambios = quitarClave({
    nombre: v["nombre"], marca: marca?.nombre, marcaUrl: marca?.web ?? "", categoria: cat?.label, categoriaSlug: cat?.slug, descuento: v["descuento"],
    tipo: modalidad, precio: v["precio"],
    descripcion: v["descripcion"], pasos: v["pasos"], terminos: v["terminos"],
    desde: v["desde"], hasta: v["hasta"], provincias, cupon,
    ...(compartido ? { modoCodigo: "compartido", codigoCompartido: String(v["codigocompartido"]).toUpperCase(), ...(v["usosmaximos"] !== undefined ? { usosMaximos: v["usosmaximos"] } : {}) } : {}),
    activo: v["activo"],
    ...(imgs ? { imagen: imgs[0] ?? "", imagenes: imgs, galeria: imgs } : {}),
  });
  const entidad = { ...base, ...cambios };
  const e = errorReglasBeneficio(entidad, ctx.provincias);
  return e ? { error: e } : { entidad, usadas };
}

function construirMarca(v: Valores, ctx: CtxCarga, previo: any): { entidad?: any; error?: string; usadas?: string[] } {
  let logo: string | undefined;
  let usadas: string[] = [];
  if (v["logo"] !== undefined) {
    const refs = v["logo"] as string[];
    const r = resolverImagenes(refs.slice(0, 1), ctx.imagenes);
    if (r.faltan.length) return { error: errImagenes(r.faltan) };
    logo = r.urls[0] ?? "";
    usadas = refs.slice(0, 1).filter((x) => !/^(https?:|data:)/i.test(x));
  }
  const base = previo ?? { id: claveMarca(String(v["nombre"])), nombre: String(v["nombre"]), logo: "", web: "", descripcion: "", activo: true };
  // El nombre es la clave: al actualizar no se renombra (lo que cambie de mayúsculas o tildes en el archivo se ignora).
  const cambios = quitarClave({ ...(previo ? {} : { nombre: v["nombre"] }), web: v["web"], descripcion: v["descripcion"], logo, activo: v["activo"] });
  return { entidad: { ...base, ...cambios, id: base.id }, usadas };
}

/**
 * Procesa una hoja completa: valida cada fila, decide si crea o actualiza y arma el registro. Devuelve también un error general
 * si el archivo no sirve (faltan columnas, está vacío).
 */
export function prepararCarga(tipo: TipoCarga, matriz: string[][], ctx: CtxCarga): { filas: FilaPreparada[]; errorGeneral?: string; resumen: { crear: number; actualizar: number; errores: number } } {
  const def = DEFINICIONES[tipo];
  const r = procesarMatriz(def.columnas, matriz, def.clave);
  if (r.errorGeneral) return { filas: [], errorGeneral: r.errorGeneral, resumen: { crear: 0, actualizar: 0, errores: 0 } };
  const filas: FilaPreparada[] = r.filas.map((f) => {
    if (f.error) return f;
    if (tipo === "participantes" || tipo === "codigos") {
      const falta = faltantesAlCrear(def.columnas, f.valores);
      if (falta) return { ...f, error: falta.replace("para crearlo", "en esta fila") };
      if (tipo === "participantes") {
        const doc = String(f.valores["documento"]);
        if (ctx.digitosDocumento && doc.length !== ctx.digitosDocumento) return { ...f, error: `El documento debe tener ${ctx.digitosDocumento} caracteres.` };
        const id = `imp-${Date.now().toString(36)}-${f.fila}-${Math.random().toString(36).slice(2, 6)}`;
        const entidad = { id, nombre: f.valores["nombre"], cedula: doc, email: f.valores["correo"], celular: "—", nivel: f.valores["nivel"] ?? "Clásico", estado: "Activo", canal: "Web + App", alta: new Date().toLocaleDateString("es-PE"), direcciones: [], ajustes: [] };
        return { ...f, accion: "crear" as const, entidad };
      }
      if (tipo === "codigos") {
        const cod = String(f.valores["codigo"]);
        if (ctx.codigosExistentes?.has(cod)) return { ...f, error: "Ya estaba cargado en otro lote de este beneficio." };
        return { ...f, accion: "crear" as const, entidad: cod };
      }
      return f;
    }
    const clave = tipo === "marcas" ? claveMarca(String(f.valores["nombre"])) : String(f.valores["codigo"]);
    const previo = ctx.existentes.get(clave);
    if (!previo) {
      const falta = faltantesAlCrear(def.columnas, f.valores);
      if (falta) return { ...f, error: falta };
    }
    const res = tipo === "beneficios" ? construirBeneficio(f.valores, ctx, previo) : construirMarca(f.valores, ctx, previo);
    if (res.error) return { ...f, error: res.error };
    return { ...f, accion: previo ? ("actualizar" as const) : ("crear" as const), entidad: res.entidad, imagenesUsadas: res.usadas ?? [] };
  });
  const errores = filas.filter((f) => f.error).length;
  return { filas, resumen: { crear: filas.filter((f) => f.accion === "crear").length, actualizar: filas.filter((f) => f.accion === "actualizar").length, errores } };
}

/** Máximo de filas por carga (más grande se pide dividir el archivo). */
export const MAX_FILAS_CARGA = 2000;
