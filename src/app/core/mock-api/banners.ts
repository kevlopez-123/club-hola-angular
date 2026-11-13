import { bannerVisible, ordenarPorAudiencia, type Visitante } from "../banners-audiencia";
import { contexto } from "./contexto";
import { db } from "./db";

const hoyIso = () => new Date().toISOString().slice(0, 10);

/** Categorías que le interesan al participante: las de sus favoritos y las de lo que ya canjeó. */
function interesesDelParticipante(): string[] {
  const porId = new Map((db.admin.beneficios as any[]).map((b) => [String(b.id), String(b.categoria ?? "")]));
  const ids = [...db.favoritos, ...(db.misBeneficios as any[]).map((m) => String(m.beneficioId))];
  return [...new Set(ids.map((id) => porId.get(id)).filter((c): c is string => !!c))];
}

/** Banners de una sección del sitio (web), vigentes hoy y filtrados para quien pregunta: su nivel y sus intereses. */
export function bannersPara(seccion: string) {
  const ubicacion = seccion === "home" ? "Home" : seccion === "beneficios" ? "Beneficios" : "";
  const visitante: Visitante = contexto.participante ? { nivel: db.usuario.nivel, intereses: interesesDelParticipante() } : { intereses: [] };
  const hoy = hoyIso();
  const vigentes = (db.admin.banners as any[]).filter((b) => b.canal === "Web" && b.ubicacion === ubicacion && b.activo && b.inicio <= hoy && b.fin >= hoy);
  return ordenarPorAudiencia(vigentes.filter((b) => bannerVisible(b, visitante)))
    .map(({ id, key, imagen, imagenMovil, alt, to }: any) => ({ id: id ?? key ?? crypto.randomUUID(), imagen, imagenMovil, alt, to }));
}
