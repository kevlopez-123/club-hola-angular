import { beneficios } from "./mock";

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

export type CompraItem = { nombre: string; marca: string; imagen: string; cantidad: number; precio: number };

export type EstadoCompra = "Pagado" | "Anulado";

export type Compra = {
  codigo: string;
  fecha: string;
  fechaISO: string;
  /** Hora de la compra (HH:MM). */
  hora?: string;
  estado: EstadoCompra;
  /** Correo al que se envía el cupón digital. */
  entrega: string;
  montoUSD: number;
  items: CompraItem[];
};

const it = (id: string, cantidad = 1): CompraItem => {
  const b = beneficios.find((x) => x.id === id)!;
  return { nombre: b.nombre, marca: b.marca, imagen: b.imagen, cantidad, precio: b.precio ?? 0 };
};
const total = (items: CompraItem[]) => items.reduce((a, i) => a + i.precio * i.cantidad, 0);

const compra = (codigo: string, fecha: string, fechaISO: string, estado: EstadoCompra, entrega: string, items: CompraItem[]): Compra => ({
  codigo, fecha, fechaISO, estado, entrega: `Entrega digital a ${entrega}`, montoUSD: total(items), items,
});

export const compras: Compra[] = [
  compra("BNB-4F82KDL1", "28/07/2026", "2026-07-28", "Pagado", "ana.torres@dominio.com", [it("b7", 2)]),
  compra("BNB-9KD01MZ7", "14/07/2026", "2026-07-14", "Pagado", "ana.torres@dominio.com", [it("b6"), it("b21")]),
  compra("BNB-77QAZX02", "02/06/2026", "2026-06-02", "Pagado", "atorres@empresa.com.pe", [it("bc1")]),
  compra("BNB-31LOP9AA", "19/05/2026", "2026-05-19", "Anulado", "atorres@empresa.com.pe", [it("b22")]),
];

/* ---------------- Perfil ---------------- */

export const perfil = {
  tipoDocumento: "DNI",
  codigoParticipante: "41234567",
  correo: "ana.torres@dominio.com",
  nombres: "Ana Lucía",
  apellidos: "Torres Ramírez",
  telefono: "+51 987 654 321",
};
