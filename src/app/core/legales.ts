/**
 * Textos legales con control de versiones: Términos y condiciones y Política de privacidad.
 * Cada publicación crea una versión nueva (nunca se edita una publicada). Los participantes aceptan Términos y Política de privacidad
 * (uso y tratamiento de datos) UNA SOLA VEZ, en su primer ingreso: hasta que lo hacen ven un aviso que bloquea el sitio. Publicar una versión
 * nueva no les pide aceptar de nuevo ni les avisa; la versión que aceptaron queda registrada con su fecha y canal.
 */
export type TipoLegal = "terminos" | "privacidad";
export const TIPOS_LEGALES: TipoLegal[] = ["terminos", "privacidad"];
export const NOMBRE_LEGAL: Record<TipoLegal, string> = { terminos: "Términos y condiciones", privacidad: "Política de privacidad" };
export const RUTA_LEGAL: Record<TipoLegal, string> = { terminos: "/terminos", privacidad: "/privacidad" };

export interface VersionLegal {
  version: number;
  /** Texto en Markdown (como se edita en el panel). */
  texto: string;
  /** Subtítulo de la página. */
  intro: string;
  /** Resumen de lo que cambió: es lo que leen los participantes. */
  notas: string;
  /** En desuso: la aceptación se pide solo en el primer ingreso. Se conserva por compatibilidad con datos guardados (siempre false). */
  exigeAceptacion: boolean;
  /** Fecha (aaaa-mm-dd) desde la que rige; una fecha futura deja la versión "programada" y avisa con anticipación. */
  vigenteDesde: string;
  publicadaEl: string;
  publicadaPor: string;
}

export interface BorradorLegal {
  texto: string;
  intro: string;
  notas: string;
  exigeAceptacion: boolean;
  vigenteDesde: string;
  actualizadoEl: string;
  por: string;
}

export interface DocLegal {
  versiones: VersionLegal[];
  borrador: BorradorLegal | null;
}

export interface AceptacionLegal {
  version: number;
  /** ISO con zona horaria. */
  fecha: string;
  canal: string;
}

/** Versión que rige hoy: la más nueva cuya fecha de vigencia ya llegó. */
export function versionEnVigor(doc: DocLegal, hoy: string): VersionLegal | undefined {
  return [...doc.versiones].filter((v) => v.vigenteDesde <= hoy).sort((a, b) => b.version - a.version)[0];
}
/** Versión publicada que todavía no rige (se avisó con anticipación). */
export function versionProgramada(doc: DocLegal, hoy: string): VersionLegal | undefined {
  return [...doc.versiones].filter((v) => v.vigenteDesde > hoy).sort((a, b) => a.version - b.version)[0];
}

/**
 * ¿Debe aceptar este documento? Solo si nunca lo aceptó (primer ingreso). Una versión nueva no vuelve a pedirlo: quien ya aceptó
 * una versión no ve el aviso otra vez.
 */
export function debeAceptar(vigente: VersionLegal | undefined, aceptada: AceptacionLegal | undefined): boolean {
  return !!vigente && !aceptada;
}

export interface PendienteLegal {
  tipo: TipoLegal;
  nombre: string;
  version: number;
  vigenteDesde: string;
  notas: string;
  texto: string;
  intro: string;
  /** true si es la primera vez que acepta este documento (no hay una versión anterior aceptada). */
  primera: boolean;
}

export interface EstadoLegalesParticipante {
  pendientes: PendienteLegal[];
  aceptadas: Partial<Record<TipoLegal, AceptacionLegal>>;
  vigentes: Record<TipoLegal, { version: number; vigenteDesde: string }>;
}

/* ---------------- Comparación de versiones ---------------- */
export type LineaDiff = { tipo: "igual" | "agregada" | "quitada"; texto: string };

/**
 * Diferencias línea por línea entre dos textos (subsecuencia común más larga). Pensado para textos legales de unas cientos de líneas;
 * si son enormes se compara por bloques para no bloquear el navegador.
 */
export function diferenciasTexto(antes: string, despues: string): LineaDiff[] {
  const a = antes.split("\n");
  const b = despues.split("\n");
  if (a.length * b.length > 4_000_000) {
    const sa = new Set(a);
    const sb = new Set(b);
    return [...a.filter((l) => !sb.has(l)).map((texto) => ({ tipo: "quitada" as const, texto })), ...b.map((texto) => ({ tipo: sa.has(texto) ? ("igual" as const) : ("agregada" as const), texto }))];
  }
  const n = a.length;
  const m = b.length;
  const L: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = a[i] === b[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const r: LineaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { r.push({ tipo: "igual", texto: a[i]! }); i++; j++; }
    else if (L[i + 1]![j]! >= L[i]![j + 1]!) r.push({ tipo: "quitada", texto: a[i++]! });
    else r.push({ tipo: "agregada", texto: b[j++]! });
  }
  while (i < n) r.push({ tipo: "quitada", texto: a[i++]! });
  while (j < m) r.push({ tipo: "agregada", texto: b[j++]! });
  return r;
}

export const resumenDiff = (d: LineaDiff[]) => ({ agregadas: d.filter((x) => x.tipo === "agregada").length, quitadas: d.filter((x) => x.tipo === "quitada").length });

/* ---------------- Resumen para el panel ---------------- */
export interface ResumenLegal {
  tipo: TipoLegal;
  nombre: string;
  vigente: VersionLegal | null;
  programada: VersionLegal | null;
  versiones: VersionLegal[];
  borrador: BorradorLegal | null;
  /** Participantes activos que ya aceptaron la versión en vigor, los que faltan y el total. */
  aceptaron: number;
  pendientes: number;
  total: number;
}
