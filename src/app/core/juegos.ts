/** Spin & Win (ruleta de premios) y Lucky Code (validador de códigos): tipos compartidos por el sitio y el panel. */
export type TipoPremio = "giftcard" | "cupon" | "vale" | "invitacion" | "nada";

export const TIPOS_PREMIO: { v: TipoPremio; l: string }[] = [
  { v: "giftcard", l: "Gift card" },
  { v: "cupon", l: "Cupón" },
  { v: "vale", l: "Vale digital" },
  { v: "invitacion", l: "Invitación" },
  { v: "nada", l: "Sin premio" },
];

export type Premio = {
  id: string;
  label: string;
  tipo: TipoPremio;
  detalle: string;
  /** Aparece como sector de la ruleta. */
  enRuleta: boolean;
  activo: boolean;
};

export type CodigoPromo = {
  /** Código en mayúsculas y con guiones (XXXX-XXXX-XXXX-XXXX). */
  codigo: string;
  premioId: string;
  premio: string;
  usado: boolean;
  usadoPor?: string;
  fechaUso?: string;
};

export type Giro = {
  id: string;
  participanteId: string;
  participante: string;
  premio: string;
  tipo: TipoPremio;
  /** "ruleta" o "codigo". */
  origen: "ruleta" | "codigo";
  fecha: string;
  fechaISO: string;
  hora: string;
};

/** Estado de la ruleta para el participante que ingresó. */
export type EstadoRuleta = {
  girosMax: number;
  usados: number;
  restantes: number;
  /** Fecha (dd/mm/aaaa) en que se renuevan los giros. */
  proximaFecha: string;
  premios: { id: string; label: string; tipo: TipoPremio }[];
};

export type ResultadoJuego = { premio: Pick<Premio, "id" | "label" | "tipo" | "detalle"> };

/** Lunes de la semana de una fecha ISO (la ruleta renueva sus giros cada lunes). */
export const lunesDe = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  const dia = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - dia);
  return d.toISOString().slice(0, 10);
};

/** Normaliza lo que escribe la persona: mayúsculas, sin espacios, grupos de 4 separados por guion. */
export const normalizarCodigo = (s: string): string => {
  const limpio = s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return limpio.replace(/(.{4})(?=.)/g, "$1-");
};
