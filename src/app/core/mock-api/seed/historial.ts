import { beneficios, productos } from "./mock";

/* ---------------- Mis beneficios ---------------- */

export type EstadoBeneficio = "activo" | "usado" | "vencido";

export type BeneficioUsuario = {
  id: string;
  beneficioId: string;
  codigo: string;
  estado: EstadoBeneficio;
  fecha: string;
  vence: string;
};

export const misBeneficios: BeneficioUsuario[] = [
  {
    id: "mb1",
    beneficioId: "b1",
    codigo: "MOT-8H2K9QAZ",
    estado: "activo",
    fecha: "02/08/2026",
    vence: "02/08/2026 21:30",
  },
  {
    id: "mb2",
    beneficioId: "b9",
    codigo: "MOT-2LP4WQ11",
    estado: "activo",
    fecha: "04/08/2026",
    vence: "04/08/2026 23:00",
  },
  {
    id: "mb3",
    beneficioId: "b2",
    codigo: "MOT-77PLZK03",
    estado: "usado",
    fecha: "18/07/2026",
    vence: "18/07/2026 19:00",
  },
  {
    id: "mb4",
    beneficioId: "b5",
    codigo: "MOT-4RTY8812",
    estado: "usado",
    fecha: "05/07/2026",
    vence: "05/07/2026 20:15",
  },
  {
    id: "mb5",
    beneficioId: "b3",
    codigo: "MOT-9QW1XS44",
    estado: "vencido",
    fecha: "20/06/2026",
    vence: "20/06/2026 22:00",
  },
  {
    id: "mb6",
    beneficioId: "b8",
    codigo: "MOT-1MN6BV77",
    estado: "vencido",
    fecha: "12/05/2026",
    vence: "12/05/2026 18:40",
  },
  {
    id: "mb7",
    beneficioId: "b11",
    codigo: "MOT-5KJ3HG20",
    estado: "activo",
    fecha: "03/08/2026",
    vence: "03/08/2026 22:10",
  },
];

export const beneficioDe = (id: string) => beneficios.find((b) => b.id === id);

export const estadoLabels: Record<EstadoBeneficio, string> = {
  activo: "Activo",
  usado: "Usado",
  vencido: "Vencido",
};

/* ---------------- Historial de compras ---------------- */

export type CompraItem = { nombre: string; marca: string; imagen: string; cantidad: number; puntos: number };

export type Compra = {
  codigo: string;
  fecha: string;
  fechaISO: string;
  /** Hora de la compra (HH:MM). */
  hora?: string;
  estado: "Entregado" | "En camino" | "Procesando";
  entrega: string;
  puntosUsados: number;
  montoUSD: number;
  items: CompraItem[];
};

const it = (id: string, cantidad = 1): CompraItem => {
  const p = productos.find((x) => x.id === id)!;
  return { nombre: p.nombre, marca: p.marca, imagen: p.imagen, cantidad, puntos: p.puntos };
};

export const compras: Compra[] = [
  {
    codigo: "BNB-4F82KDL1",
    fecha: "28/07/2026",
    fechaISO: "2026-07-28",
    estado: "Entregado",
    entrega: "Av. Amazonas N39-123 y Gaspar de Villarroel, Dpto. 501 — Quito",
    puntosUsados: 26000,
    montoUSD: 0,
    items: [it("p4")],
  },
  {
    codigo: "BNB-9KD01MZ7",
    fecha: "14/07/2026",
    fechaISO: "2026-07-14",
    estado: "En camino",
    entrega: "Av. Francisco de Orellana 236, Piso 8 — Guayaquil",
    puntosUsados: 48000,
    montoUSD: 120,
    items: [it("p2"), it("p6")],
  },
  {
    codigo: "BNB-77QAZX02",
    fecha: "02/06/2026",
    fechaISO: "2026-06-02",
    estado: "Entregado",
    entrega: "Entrega digital a ana.torres@dominio.com",
    puntosUsados: 11000,
    montoUSD: 0,
    items: [it("p12")],
  },
  {
    codigo: "BNB-31LOP9AA",
    fecha: "19/05/2026",
    fechaISO: "2026-05-19",
    estado: "Procesando",
    entrega: "Entrega digital a atorres@empresa.com.ec",
    puntosUsados: 7000,
    montoUSD: 35,
    items: [it("p11", 2)],
  },
];

/* ---------------- Historial de puntos ---------------- */

export type TipoMovimiento = "acumulacion" | "canje" | "compra" | "vencimiento" | "ajuste";

export type Movimiento = {
  id: string;
  fechaISO: string;
  fecha: string;
  detalle: string;
  tipo: TipoMovimiento;
  puntos: number;
};

export const tipoLabels: Record<TipoMovimiento, string> = {
  acumulacion: "Acumulación",
  canje: "Canje",
  compra: "Compra de puntos",
  vencimiento: "Vencimiento",
  ajuste: "Ajuste manual",
};

export const movimientos: Movimiento[] = [
  {
    id: "m1",
    fechaISO: "2026-08-01",
    fecha: "01/08/2026",
    detalle: "Compra en Banco Solidario Quito Norte — factura 001-045-9821",
    tipo: "acumulacion",
    puntos: 12400,
  },
  {
    id: "m2",
    fechaISO: "2026-07-28",
    fecha: "28/07/2026",
    detalle: "Canje Audífonos Sony WH-CH720N",
    tipo: "canje",
    puntos: -26000,
  },
  {
    id: "m3",
    fechaISO: "2026-07-20",
    fecha: "20/07/2026",
    detalle: "Compra de puntos operación PTS-91MZ",
    tipo: "compra",
    puntos: 25000,
  },
  {
    id: "m4",
    fechaISO: "2026-07-14",
    fecha: "14/07/2026",
    detalle: "Canje Huawei Watch GT 5 Active",
    tipo: "canje",
    puntos: -48000,
  },
  {
    id: "m5",
    fechaISO: "2026-07-05",
    fecha: "05/07/2026",
    detalle: "Compra en Banco Solidario Cumbayá — factura 002-011-3345",
    tipo: "acumulacion",
    puntos: 9600,
  },
  {
    id: "m6",
    fechaISO: "2026-07-01",
    fecha: "01/07/2026",
    detalle: "Compra en Banco Solidario Guayaquil Sur — factura 003-020-7714",
    tipo: "acumulacion",
    puntos: 18750,
  },
  {
    id: "m7",
    fechaISO: "2026-06-15",
    fecha: "15/06/2026",
    detalle: "Puntos vencidos del periodo 2024",
    tipo: "vencimiento",
    puntos: -3200,
  },
  {
    id: "m8",
    fechaISO: "2026-06-02",
    fecha: "02/06/2026",
    detalle: "Canje Gift Card Supermaxi $150",
    tipo: "canje",
    puntos: -11000,
  },
  {
    id: "m9",
    fechaISO: "2026-06-01",
    fecha: "01/06/2026",
    detalle: "Compra en Banco Solidario Quito Norte — factura 001-045-8890",
    tipo: "acumulacion",
    puntos: 15980,
  },
  {
    id: "m10",
    fechaISO: "2026-05-19",
    fecha: "19/05/2026",
    detalle: "Canje Gift Card Cinemark x2",
    tipo: "canje",
    puntos: -7000,
  },
  {
    id: "m11",
    fechaISO: "2026-05-04",
    fecha: "04/05/2026",
    detalle: "Compra en Banco Solidario Ambato Centro — factura 004-008-1122",
    tipo: "acumulacion",
    puntos: 8000,
  },
  {
    id: "m12",
    fechaISO: "2026-05-01",
    fecha: "01/05/2026",
    detalle: "Compra en Banco Solidario Quito Norte — factura 001-045-8012",
    tipo: "acumulacion",
    puntos: 14320,
  },
];

export const condicionesCompra = [
  "Sólo se permite una compra de puntos al día.",
  "Cada usuario puede comprar como máximo 250.000 puntos en los últimos 12 meses.",
  "Los puntos comprados tienen vigencia de 1 año.",
  "No se permite devolución de los puntos comprados.",
  "La compra de puntos no extiende el vencimiento de puntos acumulados anteriormente.",
];

/* ---------------- Perfil ---------------- */

export const perfil = {
  tipoDocumento: "Cédula de Identidad",
  codigoParticipante: "1712345678",
  correo: "ana.torres@dominio.com",
  nombres: "Ana Lucía",
  apellidos: "Torres Ramírez",
  telefono: "+593 99 654 3210",
};
