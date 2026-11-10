import { leerZip } from "./xlsx-lector";

/**
 * Imágenes de las cargas masivas: se suben varias a la vez o dentro de un ZIP, se achican en el navegador (la base simulada vive
 * en el almacenamiento del navegador, ~5 MB; con un servidor real irían a archivos) y se enlazan con las filas por su nombre.
 */
export interface ImagenCarga {
  /** Nombre de archivo normalizado (minúsculas, sin carpetas): la clave de enlace. */
  nombre: string;
  /** Nombre tal como venía. */
  original: string;
  /** Imagen lista (data:). */
  url: string;
  bytes: number;
}

export interface ResumenImagenes {
  imagenes: ImagenCarga[];
  /** Archivos que no se pudieron usar y por qué. */
  omitidas: { nombre: string; motivo: string }[];
}

/** Presupuesto total de las imágenes de una carga (caracteres de los data: URL). */
export const PRESUPUESTO_IMAGENES = 3_000_000;
/** Lado mayor máximo tras achicar (las fichas se ven a ≤ 900 px). */
export const LADO_MAXIMO = 900;
const EXT = /\.(jpe?g|png|webp|gif|svg)$/i;

/** ¿La ruta es una imagen que se puede usar? (se ignoran carpetas del sistema como __MACOSX y archivos ocultos) */
export function esImagenUtil(ruta: string): boolean {
  const base = nombreDe(ruta);
  return EXT.test(base) && !base.startsWith(".") && !/(^|\/)__macosx\//i.test(ruta);
}
/** Nombre sin carpetas, en minúsculas. */
export function nombreDe(ruta: string): string {
  return (ruta.split(/[\\/]/).pop() ?? ruta).trim().toLowerCase();
}

const mimeDe = (nombre: string) => (/\.png$/i.test(nombre) ? "image/png" : /\.webp$/i.test(nombre) ? "image/webp" : /\.gif$/i.test(nombre) ? "image/gif" : /\.svg$/i.test(nombre) ? "image/svg+xml" : "image/jpeg");

const aBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Achica una imagen (lado mayor ≤ LADO_MAXIMO) y la devuelve como data: URL en WebP (o la deja igual si es SVG). */
export async function prepararImagen(bytes: Uint8Array, nombre: string): Promise<string> {
  const mime = mimeDe(nombre);
  if (mime === "image/svg+xml") return `data:${mime};base64,${aBase64(bytes)}`;
  const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * escala));
  const h = Math.max(1, Math.round(bmp.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = w;
  lienzo.height = h;
  lienzo.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const webp = lienzo.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : lienzo.toDataURL("image/jpeg", 0.85);
}

/** Procesa los archivos elegidos (imágenes sueltas y/o ZIP): achica, normaliza el nombre y respeta el presupuesto. */
export async function imagenesDeArchivos(archivos: File[]): Promise<ResumenImagenes> {
  const crudos: { nombre: string; bytes: Uint8Array }[] = [];
  const omitidas: ResumenImagenes["omitidas"] = [];
  for (const f of archivos) {
    if (/\.zip$/i.test(f.name)) {
      try {
        for (const e of await leerZip(await f.arrayBuffer())) {
          if (esImagenUtil(e.nombre)) crudos.push(e);
          else if (!/(^|\/)(__macosx|\.)/i.test(e.nombre) && !nombreDe(e.nombre).startsWith(".")) omitidas.push({ nombre: nombreDe(e.nombre), motivo: "No es una imagen (JPG, PNG, WebP, GIF o SVG)." });
        }
      } catch {
        omitidas.push({ nombre: f.name, motivo: "No se pudo abrir el ZIP." });
      }
    } else if (esImagenUtil(f.name)) crudos.push({ nombre: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    else omitidas.push({ nombre: f.name, motivo: "No es una imagen (JPG, PNG, WebP, GIF o SVG)." });
  }
  const imagenes: ImagenCarga[] = [];
  const vistos = new Set<string>();
  let usado = 0;
  for (const c of crudos) {
    const k = nombreDe(c.nombre);
    if (vistos.has(k)) { omitidas.push({ nombre: k, motivo: "Nombre repetido: se usa la primera." }); continue; }
    vistos.add(k);
    try {
      const url = await prepararImagen(c.bytes, k);
      if (usado + url.length > PRESUPUESTO_IMAGENES) { omitidas.push({ nombre: k, motivo: "No cabe: el servidor simulado guarda las imágenes en el navegador (≈ 3 MB). Sube menos o usa direcciones https://." }); continue; }
      usado += url.length;
      imagenes.push({ nombre: k, original: c.nombre.split(/[\\/]/).pop() ?? c.nombre, url, bytes: url.length });
    } catch (e) {
      omitidas.push({ nombre: k, motivo: `La imagen está dañada o no se pudo leer (${(e as Error)?.message ?? "error"}).` });
    }
  }
  return { imagenes, omitidas };
}

/** Mapa nombre → url para enlazar con las filas. */
export const mapaImagenes = (xs: ImagenCarga[]) => new Map(xs.map((i) => [i.nombre, i.url]));
