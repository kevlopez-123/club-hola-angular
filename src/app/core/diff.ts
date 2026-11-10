/** Diferencias entre dos valores (objetos, listas o simples), como lista plana de { campo, antes, despues }. Lo usa el detalle del Registro de cambios. */
export interface Diferencia {
  campo: string;
  antes: string;
  despues: string;
}

const AUSENTE = "—";

const texto = (v: unknown): string => {
  if (v === undefined) return AUSENTE;
  if (v === null) return "(vacío)";
  if (typeof v === "string") return v === "" ? "(vacío)" : v;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function aplanar(v: unknown, ruta: string, out: Map<string, unknown>) {
  if (esObjeto(v)) {
    const claves = Object.keys(v);
    if (!claves.length && ruta) out.set(ruta, "{}");
    for (const k of claves) aplanar(v[k], ruta ? `${ruta}.${k}` : k, out);
  } else if (Array.isArray(v)) {
    // Las listas de valores simples se comparan completas; las de objetos, elemento a elemento.
    if (v.every((x) => typeof x !== "object" || x === null)) out.set(ruta || "(lista)", v.length ? v.map(texto).join(", ") : "(vacío)");
    else v.forEach((x, i) => aplanar(x, `${ruta}[${i}]`, out));
  } else out.set(ruta || "(valor)", v);
}

export function diferencias(antes: unknown, despues: unknown): Diferencia[] {
  const a = new Map<string, unknown>();
  const d = new Map<string, unknown>();
  if (antes !== undefined) aplanar(antes, "", a);
  if (despues !== undefined) aplanar(despues, "", d);
  const claves = [...new Set([...a.keys(), ...d.keys()])];
  return claves
    .filter((k) => texto(a.get(k)) !== texto(d.get(k)))
    .map((k) => ({ campo: k, antes: texto(a.get(k)), despues: texto(d.get(k)) }));
}