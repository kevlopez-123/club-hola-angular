/**
 * Reglas de negocio de los beneficios, en funciones puras que comparten el panel, el sitio y el servidor simulado:
 * vigencia (desde / hasta), regla del cupón (cuánto dura, cuántas veces se puede canjear y cuánto hay que esperar para volver
 * a hacerlo), código compartido y provincias donde está disponible.
 *
 * "Canjear" es generar el cupón en la plataforma.
 */

export type Vigencia = "programado" | "vigente" | "vencido";

/** Estado de un beneficio según sus fechas (AAAA-MM-DD, ambas inclusivas; sin fecha = sin límite por ese lado). */
export function estadoVigencia(b: { desde?: string | undefined; hasta?: string | undefined }, hoyIso: string): Vigencia {
  if (b.desde && hoyIso < b.desde) return "programado";
  if (b.hasta && hoyIso > b.hasta) return "vencido";
  return "vigente";
}

export const fechaLarga = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso);

/** Regla que se aplica a un cupón. `limite` 0 = sin límite de canjes; `meses` es la espera desde el último canje cuando se llega al límite. */
export interface ReglaCupon {
  horas: number;
  limite: number;
  meses: number;
}
export const REGLA_GENERAL_POR_DEFECTO: ReglaCupon = { horas: 3, limite: 0, meses: 3 };

/** Valores propios de un beneficio; lo que no se define parte de los valores por defecto (3 h, sin límite, 3 meses). */
export interface ReglaPropia {
  horas?: number | undefined;
  limite?: number | undefined;
  meses?: number | undefined;
}

/** Regla efectiva: la propia del beneficio (si la tiene) sobre la general del programa. */
export function reglaDe(propia: ReglaPropia | undefined, general: Partial<ReglaCupon> | undefined): ReglaCupon {
  const g = { ...REGLA_GENERAL_POR_DEFECTO, ...(general ?? {}) };
  const num = (v: unknown, def: number) => (typeof v === "number" && Number.isFinite(v) ? v : def);
  return { horas: num(propia?.horas, g.horas) || REGLA_GENERAL_POR_DEFECTO.horas, limite: num(propia?.limite, g.limite), meses: num(propia?.meses, g.meses) };
}

/** Suma meses de calendario (31 de enero + 1 mes = 28/29 de febrero, no marzo). */
export function agregarMeses(ts: number, meses: number): number {
  const d = new Date(ts);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return d.getTime();
}

export interface EstadoCanje {
  permitido: boolean;
  /** Si no está permitido: fecha y hora desde la que se puede volver a canjear. */
  hasta?: number;
  /** Canjes hechos en el ciclo actual (0 si el límite se cumplió y ya terminó la espera). */
  canjeados: number;
  /** Canjes que quedan antes de la espera (solo con límite). */
  restantes?: number;
}

/**
 * Decide si el participante puede canjear de nuevo. Se recorren sus canjes en orden: cada vez que completa el límite
 * se abre una espera de `meses` contados **desde ese último canje**; pasada la espera empieza un ciclo nuevo.
 */
export function evaluarCanje(canjes: number[], regla: ReglaCupon, ahora: number): EstadoCanje {
  if (regla.limite <= 0) return { permitido: true, canjeados: canjes.length };
  let cuenta = 0;
  let bloqueadoHasta = 0;
  for (const t of [...canjes].sort((a, b) => a - b)) {
    cuenta++;
    if (cuenta >= regla.limite) {
      bloqueadoHasta = agregarMeses(t, regla.meses);
      cuenta = 0;
    }
  }
  if (bloqueadoHasta > ahora) return { permitido: false, hasta: bloqueadoHasta, canjeados: regla.limite, restantes: 0 };
  return { permitido: true, canjeados: cuenta, restantes: regla.limite - cuenta };
}

export type Disponibilidad = "si" | "no" | "desconocida";

/** ¿El beneficio está disponible en la provincia del participante? Lista vacía = todo el país. */
export function disponibleEn(provincias: string[] | undefined, provincia: string | undefined): Disponibilidad {
  if (!provincias?.length) return "si";
  if (!provincia) return "desconocida";
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return provincias.some((p) => n(p) === n(provincia)) ? "si" : "no";
}

/** Texto "Pichincha, Guayas y Azuay". */
export const listaTexto = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

export interface ReglasBeneficio {
  desde?: string | undefined;
  hasta?: string | undefined;
  cupon?: ReglaPropia | undefined;
  modoCodigo?: "unico" | "compartido" | undefined;
  codigoCompartido?: string | undefined;
  usosMaximos?: number | undefined;
  provincias?: string[] | undefined;
}

const entero = (v: unknown) => typeof v === "number" && Number.isInteger(v);

/** Valida las reglas de un beneficio. Devuelve el primer error o cadena vacía. `provinciasValidas` = lista oficial del país. */
export function errorReglasBeneficio(b: ReglasBeneficio, provinciasValidas?: string[]): string {
  const f = /^\d{4}-\d{2}-\d{2}$/;
  if (b.desde && !f.test(b.desde)) return "La fecha de inicio no es válida.";
  if (b.hasta && !f.test(b.hasta)) return "La fecha de vencimiento no es válida.";
  if (b.desde && b.hasta && b.hasta < b.desde) return "La fecha de vencimiento no puede ser anterior a la de inicio.";
  const c = b.cupon;
  if (c) {
    if (c.horas !== undefined && (!entero(c.horas) || c.horas < 1 || c.horas > 720)) return "La duración del cupón debe ser de 1 a 720 horas.";
    if (c.limite !== undefined && (!entero(c.limite) || c.limite < 0 || c.limite > 99)) return "El límite de canjes debe ser un número entero de 0 a 99 (0 = sin límite).";
    if (c.meses !== undefined && (!entero(c.meses) || c.meses < 1 || c.meses > 60)) return "La espera para volver a canjear debe ser de 1 a 60 meses.";
  }
  if (b.modoCodigo === "compartido") {
    const cod = (b.codigoCompartido ?? "").trim();
    if (!cod) return "Escribe el código compartido del cupón.";
    if (/\s/.test(cod) || cod.length > 40) return "El código compartido no puede tener espacios ni más de 40 caracteres.";
    if (b.usosMaximos !== undefined && (!entero(b.usosMaximos) || b.usosMaximos < 0)) return "El máximo de usos debe ser un número entero (0 = sin máximo).";
  }
  if (b.provincias?.length && provinciasValidas) {
    const mal = b.provincias.find((p) => !provinciasValidas.includes(p));
    if (mal) return `«${mal}» no es una provincia de la lista oficial.`;
  }
  return "";
}
