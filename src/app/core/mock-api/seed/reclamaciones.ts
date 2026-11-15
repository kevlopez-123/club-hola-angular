import { reclamacionInicial, sumarDiasHabiles, type Reclamacion } from "../../reclamaciones";

/** Hojas de ejemplo del Libro de Reclamaciones (datos ficticios) para ver la pantalla del panel con contenido. */
export function reclamacionesIniciales() {
  const hoja = (numero: string, fechaISO: string, estado: string, d: Partial<Reclamacion>, extra: object = {}) => ({
    ...reclamacionInicial(),
    ...d,
    conformidad: true,
    id: `rc${numero}`,
    numero,
    fechaISO,
    fecha: `${fechaISO.slice(8, 10)}/${fechaISO.slice(5, 7)}/${fechaISO.slice(0, 4)}, 10:15:00 a. m.`,
    estado,
    ...extra,
  });
  return [
    hoja("000002", "2026-11-11", "En atención", {
      nombre: "Rosa Quispe Huamán", documento: "40111222", domicilio: "Av. Arequipa 1234, Lince, Lima", telefono: "987000111", correo: "rosa.quispe@example.com",
      bien: "Servicio", descripcion: "Cupón de 2x1 en entradas de cine", tipo: "Reclamo", detalle: "En el cine no me aceptaron el cupón generado en Club Hola, aunque estaba vigente.", pedido: "Que se respete el beneficio o se me explique por qué no aplicaba.",
    }),
    hoja("000001", "2026-10-26", "Resuelto", {
      nombre: "Luis Mendoza Prado", documento: "45678901", domicilio: "Jr. Cusco 456, Cercado de Lima", telefono: "912345678", correo: "luis.mendoza@example.com",
      bien: "Servicio", descripcion: "Código del beneficio de cafetería", tipo: "Queja", detalle: "La atención en el local fue lenta y no conocían la promoción.", pedido: "Que se capacite al personal del local.",
    }, { respuesta: "Coordinamos con la marca y se reforzó la capacitación del personal. Gracias por avisarnos.", fechaRespuesta: "2026-11-03" }),
  ].map((r) => ({ ...r, vence: sumarDiasHabiles(r.fechaISO, 15) }));
}
