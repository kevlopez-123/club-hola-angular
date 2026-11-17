export type NivelId = "clasico" | "plata" | "oro" | "diamante";

export type Nivel = {
  id: NivelId;
  nombre: string;
  color: string;
  beneficios: string[];
  /** Texto enriquecido (markdown: enlaces, imágenes, botones, video) de «¿Cómo llegar a este nivel?». */
  comoLlegar?: string;
};

/** El nivel corresponde al segmento que asigna el banco a cada participante (no se calcula). */
export const niveles: Nivel[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    color: "#8A93A6",
    beneficios: ["Acceso al catálogo base de beneficios", "Participación en Spin & Win", "Validación de códigos en Lucky Code"],
    comoLlegar: "Es el nivel de inicio: lo tienes desde que formas parte de {programa}.\n\n- Ingresa con tu documento y genera tus cupones.\n- Juega Spin & Win y valida tus códigos en Lucky Code.\n\nConoce más sobre tu tarjeta en [banbif.com.pe](https://www.banbif.com.pe).",
  },
  {
    id: "plata",
    nombre: "Plata",
    color: "#20A6FF",
    beneficios: ["Beneficios exclusivos nivel Plata", "Beneficios del nivel Clásico"],
    comoLlegar: "Tu nivel lo asigna {empresa} según tu segmento. Para acercarte a **Plata**:\n\n1. Usa tu tarjeta de crédito con frecuencia.\n2. Participa en la campaña [Compra con tu tarjeta](https://www.banbif.com.pe/beneficios).\n3. Mantén tus pagos al día.\n\nTu nivel se actualiza cuando {empresa} actualiza tu segmento.",
  },
  {
    id: "oro",
    nombre: "Oro",
    color: "#BED500",
    beneficios: ["Beneficios exclusivos nivel Oro", "Beneficios de los niveles Clásico y Plata", "Acceso preferente a eventos"],
    comoLlegar: "Para llegar a **Oro**:\n\n1. Concentra tus consumos con tu tarjeta de crédito {empresa}.\n2. Participa en la campaña [Ahorra más](https://www.banbif.com.pe/beneficios).\n3. Contrata un producto adicional, por ejemplo un seguro o una cuenta.\n\n[btn:Ver beneficios de BanBif](https://www.banbif.com.pe/beneficios)",
  },
  {
    id: "diamante",
    nombre: "Diamante",
    color: "#924FF5",
    beneficios: ["Beneficios exclusivos nivel Diamante", "Beneficios de todos los niveles anteriores", "Asesor dedicado y atención preferente"],
    comoLlegar: "**Diamante** es el nivel más alto y lo asigna {empresa} a sus clientes con mayor relación con el banco.\n\n- Mantén tus consumos y tu saldo con {empresa}.\n- Consulta con tu asesor qué te falta: [escríbenos](https://www.banbif.com.pe).\n\n[btn:Hablar con un asesor](https://www.banbif.com.pe)",
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
