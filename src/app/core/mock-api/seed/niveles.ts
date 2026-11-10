export type NivelId = "clasico" | "plata" | "oro" | "diamante";

export type Nivel = {
  id: NivelId;
  nombre: string;
  desde: number;
  hasta: number | null;
  color: string;
  beneficios: string[];
};

/** Los niveles se calculan con los puntos acumulados en los últimos 12 meses. */
export const niveles: Nivel[] = [
  {
    id: "clasico",
    nombre: "Clásico",
    desde: 0,
    hasta: 49999,
    color: "#8A93A6",
    beneficios: [
      "Acceso al catálogo base de productos",
      "Envío gratis en canjes desde $50 en agencias Banco Solidario",
    ],
  },
  {
    id: "plata",
    nombre: "Plata",
    desde: 50000,
    hasta: 149999,
    color: "#20A6FF",
    beneficios: [
      "Promociones anticipadas en campañas de temporada",
    ],
  },
  {
    id: "oro",
    nombre: "Oro",
    desde: 150000,
    hasta: 299999,
    color: "#BED500",
    beneficios: [
      "Beneficios exclusivos nivel Oro",
      "Descuentos adicionales en materiales seleccionados",
    ],
  },
  {
    id: "diamante",
    nombre: "Diamante",
    desde: 300000,
    hasta: null,
    color: "#924FF5",
    beneficios: [
      "Todo el catálogo desbloqueado, sin restricciones de nivel",
      "Asesor dedicado y atención preferente",
    ],
  },
];

export const nivelPorPuntos = (puntos: number): Nivel =>
  [...niveles].reverse().find((n) => puntos >= n.desde) ?? niveles[0]!;

export const siguienteNivel = (puntos: number): Nivel | null => {
  const actual = nivelPorPuntos(puntos);
  const idx = niveles.findIndex((n) => n.id === actual.id);
  return niveles[idx + 1] ?? null;
};

/** Avance porcentual dentro del nivel actual (0-100). */
export const progresoNivel = (puntos: number): number => {
  const actual = nivelPorPuntos(puntos);
  const siguiente = siguienteNivel(puntos);
  if (!siguiente) return 100;
  return Math.min(100, Math.round(((puntos - actual.desde) / (siguiente.desde - actual.desde)) * 100));
};

export const faltanParaSiguiente = (puntos: number): number => {
  const siguiente = siguienteNivel(puntos);
  return siguiente ? Math.max(0, siguiente.desde - puntos) : 0;
};

/** Textos configurables de "Mi nivel" y "¿Cómo funcionan los niveles?". Admiten {empresa}, {programa}, {unidad} y {meses}. */
export const nivelesTexto = {
  meses: 12,
  subtitulo: "Tu nivel se define por los {unidad} que acumulas con tus compras en {empresa} en los últimos {meses} meses.",
  intro: "Mientras más compres en {empresa}, más rápido subes de nivel y accedes a más beneficios.",
  reglas: [
    "Tu nivel se calcula con los {unidad} acumulados por tus compras en {empresa} en los últimos {meses} meses, no con tu saldo disponible.",
    "Canjear productos no reduce tu nivel: los {unidad} usados siguen contando para el periodo.",
    "Los {unidad} comprados no suman para el cálculo de nivel.",
    "El nivel se actualiza el primer día de cada mes y se mantiene por {meses} meses desde que lo alcanzas.",
  ],
};