import { db } from "./db";
import { ApiError } from "./types";

/**
 * Control de concurrencia optimista. Cada registro editable lleva un número `version` que sube con cada guardado.
 * El cliente manda la versión que cargó en `If-Match`; si otro usuario guardó antes, la versión ya no coincide y
 * el servidor responde 412 (Precondition Failed) en vez de pisar su cambio.
 */
const CLAVES: Record<string, string> = { participantes: "id", pedidos: "codigo", productos: "id", beneficios: "id", destinos: "slug", mensajes: "id", usuarios: "id", ciudades: "codigo", marcas: "id", comprasPuntos: "codigo", plantillasCorreo: "id", correosEnviados: "id" };
export const claveDeColeccion = (c: string) => CLAVES[c] ?? "id";

type Recurso = { leer: () => any | undefined };

/** El objeto guardado al que apunta una ruta de escritura (registro de una colección o las reglas), o null si no lleva versión. */
function recurso(ruta: string): Recurso | null {
  const p = ruta.replace(/^\/?(api\/)?/, "").split("?")[0]!.split("/");
  if (p[0] !== "admin") return null;
  if (p[1] === "reglas") return { leer: () => (db.admin as any).reglas };
  if (p[1] === "c" && p[2] && p[3] && p[3] !== "bulk") {
    const col = p[2];
    const k = claveDeColeccion(col);
    return { leer: () => ((db.admin as any)[col] as any[] | undefined)?.find((x) => String(x?.[k]) === p[3]) };
  }
  return null;
}

/** Antes de un PUT: si el cliente mandó `If-Match` y no coincide con la versión guardada, se rechaza. Devuelve la versión previa. */
export function comprobarVersion(metodo: string, ruta: string, ifMatch: string | null): number {
  if (metodo.toUpperCase() !== "PUT") return 0;
  const r = recurso(ruta);
  const actual = r?.leer();
  const previa = Number(actual?.version) || 0;
  if (r && actual && ifMatch !== null && ifMatch !== "" && Number(ifMatch) !== previa) {
    throw new ApiError(412, "Otro usuario modificó este registro mientras lo editabas. Tu cambio no se guardó: recarga para ver la versión actual.");
  }
  return previa;
}

/** Después de un PUT correcto: el registro guardado sube de versión. */
export function subirVersion(metodo: string, ruta: string, previa: number) {
  if (metodo.toUpperCase() !== "PUT") return;
  const guardado = recurso(ruta)?.leer();
  if (guardado && typeof guardado === "object") guardado.version = previa + 1;
}

/** Al guardar una colección completa los registros conservan la versión que tenían en el servidor (la lista del cliente puede traer versiones viejas). */
export function conservarVersiones(coleccion: string, anteriores: any[], nuevos: any[]) {
  const k = claveDeColeccion(coleccion);
  const v = new Map(anteriores.map((x) => [String(x?.[k]), x?.version]));
  for (const it of nuevos) {
    const previa = v.get(String(it?.[k]));
    if (it && typeof it === "object") {
      if (previa !== undefined) it.version = previa;
      else delete it.version;
    }
  }
}
/** Las lecturas del panel entregan siempre `version` (0 si nunca se guardó), para que el cliente pueda detectar si otro guardó antes. */
export function asegurarVersiones(ruta: string, salida: any) {
  const p = ruta.replace(/^\/?(api\/)?/, "").split("?")[0]!.split("/");
  if (p[0] !== "admin" || !salida || typeof salida !== "object") return;
  const marcar = (x: any) => { if (x && typeof x === "object" && !Array.isArray(x) && x.version === undefined) x.version = 0; };
  if (p[1] === "reglas") marcar(salida.reglas);
  else if (p[1] === "q" && Array.isArray(salida.items)) salida.items.forEach(marcar);
  else if (p[1] === "c") {
    if (Array.isArray(salida)) salida.forEach(marcar);
    else marcar(salida);
  }
}