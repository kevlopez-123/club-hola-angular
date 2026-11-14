/** Libro de Reclamaciones: la hoja que llena el consumidor, su validación y la constancia que se descarga. */
export interface Reclamacion {
  nombre: string;
  tipoDocumento: "DNI" | "CE" | "Pasaporte";
  documento: string;
  domicilio: string;
  telefono: string;
  correo: string;
  menor: boolean;
  representante: string;
  bien: "Producto" | "Servicio";
  monto: string;
  descripcion: string;
  tipo: "Reclamo" | "Queja";
  detalle: string;
  pedido: string;
  conformidad: boolean;
}

export const reclamacionInicial = (): Reclamacion => ({
  nombre: "", tipoDocumento: "DNI", documento: "", domicilio: "", telefono: "", correo: "", menor: false, representante: "",
  bien: "Servicio", monto: "", descripcion: "", tipo: "Reclamo", detalle: "", pedido: "", conformidad: false,
});

export const LIMITES_RECLAMACION = { nombre: 150, documento: 20, domicilio: 250, telefono: 20, correo: 255, representante: 400, monto: 15, descripcion: 1000, detalle: 4000, pedido: 2000 } as const;

/** Errores por campo (vacío si la hoja está completa). */
export function validarReclamacion(d: Reclamacion): Record<string, string> {
  const e: Record<string, string> = {};
  const lleno = (k: keyof typeof LIMITES_RECLAMACION) => {
    const v = String(d[k] ?? "").trim();
    if (!v) e[k] = "Completa este campo.";
    else if (v.length > LIMITES_RECLAMACION[k]) e[k] = `Máximo ${LIMITES_RECLAMACION[k]} caracteres.`;
  };
  (["nombre", "documento", "domicilio", "descripcion", "detalle", "pedido"] as const).forEach(lleno);
  const doc = d.documento.trim();
  if (!e["documento"] && d.tipoDocumento === "DNI" && !/^\d{8}$/.test(doc)) e["documento"] = "El DNI debe tener 8 dígitos.";
  if (!/^[+\d\s()-]{6,20}$/.test(d.telefono.trim())) e["telefono"] = "Ingresa un teléfono válido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo.trim()) || d.correo.trim().length > LIMITES_RECLAMACION.correo) e["correo"] = "Ingresa un correo válido.";
  if (d.menor && !d.representante.trim()) e["representante"] = "Completa los datos del padre, madre o representante.";
  if (d.monto.trim() && !/^\d{1,9}(\.\d{1,2})?$/.test(d.monto.trim())) e["monto"] = "Ingresa un monto válido.";
  if (!d.conformidad) e["conformidad"] = "Confirma la información ingresada.";
  return e;
}

/** Constancia en texto que se descarga al enviar la hoja. */
export function hojaReclamacion(d: Reclamacion, numero: string, fecha: string, proveedor: string): string {
  return `LIBRO DE RECLAMACIONES\nHOJA ${numero}\nFecha: ${fecha}\n${proveedor}\n\n1. IDENTIFICACIÓN DEL CONSUMIDOR\nNombre: ${d.nombre}\n${d.tipoDocumento}: ${d.documento}\nDomicilio: ${d.domicilio}\nTeléfono: ${d.telefono}\nCorreo: ${d.correo}\nMenor de edad: ${d.menor ? "Sí" : "No"}\nRepresentante: ${d.representante || "No aplica"}\n\n2. IDENTIFICACIÓN DEL BIEN CONTRATADO\n${d.bien}\nMonto reclamado: ${d.monto ? `S/ ${d.monto}` : "No indicado"}\nDescripción: ${d.descripcion}\n\n3. DETALLE Y PEDIDO\n${d.tipo}\nDetalle: ${d.detalle}\nPedido: ${d.pedido}\n\n4. OBSERVACIONES Y ACCIONES DEL PROVEEDOR\nPendiente.\nFecha de comunicación de respuesta: —\n\nLa formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para denunciar ante Indecopi.`;
}
