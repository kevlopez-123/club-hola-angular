/** Eventos exclusivos de Club Hola: tipos compartidos por el sitio y el panel. */
export type TipoEventoSlug = "cenas" | "gastronomicas" | "catas" | "lanzamientos" | "funciones" | "deportivos" | "culturales";

export const TIPOS_EVENTO: { slug: TipoEventoSlug; label: string; icon: string }[] = [
  { slug: "cenas", label: "Cenas exclusivas", icon: "UtensilsCrossed" },
  { slug: "gastronomicas", label: "Experiencias gastronómicas", icon: "ChefHat" },
  { slug: "catas", label: "Catas y degustaciones", icon: "Wine" },
  { slug: "lanzamientos", label: "Lanzamientos de marcas", icon: "Sparkles" },
  { slug: "funciones", label: "Funciones privadas", icon: "Clapperboard" },
  { slug: "deportivos", label: "Eventos deportivos", icon: "Trophy" },
  { slug: "culturales", label: "Eventos culturales", icon: "Theater" },
];

export const etiquetaTipo = (slug: string) => TIPOS_EVENTO.find((t) => t.slug === slug)?.label ?? slug;

export type Evento = {
  id: string;
  nombre: string;
  marca: string;
  tipo: TipoEventoSlug;
  imagen: string;
  galeria: string[];
  /** AAAA-MM-DD */
  fechaISO: string;
  hora: string;
  lugar: string;
  distrito: string;
  cupos: number;
  cuposRestantes: number;
  nivelMinimo: string;
  costo: string;
  resumen: string;
  descripcion: string;
  incluye: string[];
  condiciones: string[];
  /** Fotos del evento ya realizado. */
  fotos?: string[];
  asistentes?: number;
  /** Publicado en el sitio. */
  activo: boolean;
};

export type EstadoPreinscripcion = "confirmado" | "en-lista" | "asistido" | "cancelado";

export const ETIQUETA_ESTADO: Record<EstadoPreinscripcion, string> = {
  confirmado: "Confirmado",
  "en-lista": "En lista de espera",
  asistido: "Asistido",
  cancelado: "Cancelado",
};

export type Preinscripcion = {
  id: string;
  eventoId: string;
  evento: string;
  codigo: string;
  participanteId: string;
  participante: string;
  email: string;
  telefono: string;
  documento: string;
  /** dd/mm/aaaa */
  fecha: string;
  fechaISO: string;
  acompanantes: number;
  restricciones: string;
  comentario: string;
  estado: EstadoPreinscripcion;
};

/** ¿La pre-inscripción ocupa cupos? (confirmadas y asistidas; la lista de espera y las canceladas no). */
export const ocupaCupo = (e: EstadoPreinscripcion) => e === "confirmado" || e === "asistido";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** "2026-12-12" → "12 de diciembre, 2026" */
export const fechaLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} de ${MESES[m - 1]}, ${y}` : iso;
};

export const hoyISO = () => new Date().toISOString().slice(0, 10);
export const esPasado = (e: Pick<Evento, "fechaISO">, hoy = hoyISO()) => e.fechaISO < hoy;
export const fotosEvento = (e: Evento) => (e.fotos?.length ? e.fotos : e.galeria.length ? e.galeria : [e.imagen]);
