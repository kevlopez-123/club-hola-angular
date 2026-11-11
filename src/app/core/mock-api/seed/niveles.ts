export type NivelId = "clasico" | "plata" | "oro" | "diamante";

export type Nivel = {
  id: NivelId;
  nombre: string;
  color: string;
  beneficios: string[];
};

/** El nivel corresponde al segmento que asigna el banco a cada participante (no se calcula). */
export const niveles: Nivel[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    color: "#8A93A6",
    beneficios: ["Acceso al catálogo base de beneficios", "Participación en Spin & Win", "Validación de códigos en Lucky Code"],
  },
  {
    id: "plata",
    nombre: "Plata",
    color: "#20A6FF",
    beneficios: ["Beneficios exclusivos nivel Plata", "Beneficios del nivel Clásico"],
  },
  {
    id: "oro",
    nombre: "Oro",
    color: "#BED500",
    beneficios: ["Beneficios exclusivos nivel Oro", "Beneficios de los niveles Clásico y Plata", "Acceso preferente a eventos"],
  },
  {
    id: "diamante",
    nombre: "Diamante",
    color: "#924FF5",
    beneficios: ["Beneficios exclusivos nivel Diamante", "Beneficios de todos los niveles anteriores", "Asesor dedicado y atención preferente"],
  },
];

export const nivelPorId = (id: string): Nivel => niveles.find((n) => n.id === id || n.nombre === id) ?? niveles[0]!;

/** ¿El nivel del participante alcanza el mínimo pedido? Sin mínimo, todos acceden. */
export const tieneAcceso = (lista: Nivel[], nivelUsuario: string, minimo?: string): boolean => {
  if (!minimo) return true;
  const pos = (x: string) => lista.findIndex((n) => n.id === x || n.nombre === x);
  return pos(nivelUsuario) >= pos(minimo);
};

/** Textos configurables de "Mi nivel". Admiten {empresa} y {programa}. */
export const nivelesTexto = {
  subtitulo: "Tu nivel corresponde al segmento que te asigna {empresa}.",
  intro: "Cada nivel incluye beneficios exclusivos y acceso a los de los niveles anteriores.",
  reglas: [
    "Tu nivel corresponde al segmento que te asigna {empresa}.",
    "Cada nivel incluye beneficios exclusivos y acceso a los de los niveles anteriores.",
    "Las condiciones y la disponibilidad se consultan en el detalle de cada beneficio.",
  ],
};
