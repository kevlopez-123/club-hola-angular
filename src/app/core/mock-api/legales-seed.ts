import type { AceptacionLegal, DocLegal, TipoLegal } from "../legales";

/** Historial de ejemplo: Términos tiene dos versiones (la segunda aclara la vigencia de los puntos); Privacidad, una. */
export function legalesIniciales(terminosMd: string, privacidadMd: string, intro: { terminos?: string; privacidad?: string }): Record<TipoLegal, DocLegal> {
  const base = { exigeAceptacion: true, publicadaPor: "Sistema" };
  return {
    terminos: {
      versiones: [
        { ...base, version: 1, texto: terminosMd, intro: intro.terminos ?? "", notas: "Versión inicial.", vigenteDesde: "2026-08-01", publicadaEl: "2026-08-01T10:00:00.000Z" },
        {
          ...base, version: 2, intro: intro.terminos ?? "", vigenteDesde: "2026-09-15", publicadaEl: "2026-09-01T10:00:00.000Z", publicadaPor: "Mariela Castro",
          texto: terminosMd + "\n\n## Vigencia de los puntos\n\nLos puntos acumulados tienen una vigencia de 24 meses desde su acumulación. Te avisaremos con 30 días de anticipación antes de que venzan.",
          notas: "Se aclara la vigencia de los puntos (24 meses) y el aviso previo al vencimiento.",
        },
      ],
      borrador: null,
    },
    privacidad: {
      versiones: [{ ...base, version: 1, texto: privacidadMd, intro: intro.privacidad ?? "", notas: "Versión inicial.", vigenteDesde: "2026-08-01", publicadaEl: "2026-08-01T10:00:00.000Z" }],
      borrador: null,
    },
  };
}

/**
 * Qué aceptó cada participante de ejemplo: la participante demo (p1) tiene todo al día; otros quedaron en la versión 1 de Términos
 * (les toca aceptar la 2) y algunos nunca aceptaron nada, para que las cifras del panel no sean todas iguales.
 */
export function aceptacionesIniciales(ids: string[]): Record<string, Partial<Record<TipoLegal, AceptacionLegal>>> {
  const r: Record<string, Partial<Record<TipoLegal, AceptacionLegal>>> = {};
  ids.forEach((id, i) => {
    if (id === "p1") r[id] = { terminos: { version: 2, fecha: "2026-09-16T14:20:00.000Z", canal: "Web" }, privacidad: { version: 1, fecha: "2026-08-03T09:10:00.000Z", canal: "Web" } };
    else if (i % 5 === 3) return; // nunca aceptó nada
    else if (i % 3 === 1) r[id] = { terminos: { version: 1, fecha: "2026-08-10T11:00:00.000Z", canal: "App" }, privacidad: { version: 1, fecha: "2026-08-10T11:00:00.000Z", canal: "App" } };
    else r[id] = { terminos: { version: 2, fecha: "2026-09-18T16:40:00.000Z", canal: i % 2 ? "App" : "Web" }, privacidad: { version: 1, fecha: "2026-08-12T10:30:00.000Z", canal: "Web" } };
  });
  return r;
}
