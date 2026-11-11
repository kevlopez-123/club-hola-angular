import type { EstadoBeneficio } from "./models";

export const estadoLabels: Record<EstadoBeneficio, string> = {
  activo: "Activo",
  usado: "Usado",
  vencido: "Vencido",
};
