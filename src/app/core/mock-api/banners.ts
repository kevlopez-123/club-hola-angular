import { bannerVisible, ordenarPorAudiencia, type Visitante } from "../banners-audiencia";
import { sinRepetidos, slideDeBeneficio } from "../banner-beneficio";
import { slideDeEvento } from "../banner-evento";
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
  const ubicacion = seccion === "home" ? "Home" : seccion === "beneficios" ? "Beneficios" : seccion === "eventos" ? "Eventos" : "";
  const visitante: Visitante = contexto.participante ? { nivel: db.usuario.nivel, intereses: interesesDelParticipante() } : { intereses: [] };
  const hoy = hoyIso();
  const vigentes = (db.admin.banners as any[]).filter((b) => b.canal === "Web" && b.ubicacion === ubicacion && b.activo && b.inicio <= hoy && b.fin >= hoy);
  const beneficios = db.admin.beneficios as any[];
  const marcas = db.admin.marcas as any[];
  const slides = ordenarPorAudiencia(vigentes.filter((b) => bannerVisible(b, visitante)))
    .map((b: any) => {
      // Banner de un beneficio: sale con su foto, marca y nombre; si el beneficio ya no se puede mostrar, el banner no aparece.
      if (b.eventoId) {
        return slideDeEvento(b, (db.admin.eventos as any[]).find((x) => x.id === b.eventoId), db.admin.categoriasEvento as any[], hoy);
      }
      if (b.beneficioId) {
        const ben = beneficios.find((x) => x.id === b.beneficioId);
        return slideDeBeneficio(b, ben, marcas.find((m) => m.nombre === ben?.marca)?.logo ?? "", hoy);
      }
      const { id, key, imagen, imagenMovil, alt, to } = b;
      return { id: id ?? key ?? crypto.randomUUID(), imagen, imagenMovil, alt, to };
    })
    .filter((s): s is NonNullable<typeof s> => !!s);
  return sinRepetidos(slides);
}
