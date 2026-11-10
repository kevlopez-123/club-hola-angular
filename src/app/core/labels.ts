import type { EstadoBeneficio, TipoMovimiento } from "./models";

export const tipoLabels: Record<TipoMovimiento, string> = {
  acumulacion: "Acumulación",
  canje: "Canje",
  compra: "Compra de puntos",
  vencimiento: "Vencimiento",
  ajuste: "Ajuste manual",
};

export const estadoLabels: Record<EstadoBeneficio, string> = {
  activo: "Activo",
  usado: "Usado",
  vencido: "Vencido",
};
