import type { Db } from "./db";

/**
 * Genera volúmenes grandes de datos para pruebas de carga del panel (solo en memoria, no se persiste).
 * Activar con `localStorage.setItem("bs_stress", "100000")` y recargar (n = cantidad de participantes).
 */
const NOMBRES = ["Ana", "Luis", "María", "Carlos", "Gabriela", "Diego", "Valeria", "Jorge", "Daniela", "Andrés", "Paula", "Santiago", "Camila", "Fernando", "Lucía", "Mateo", "Sofía", "Iván", "Rosa", "Pedro"];
const APELLIDOS = ["Torres", "Mendoza", "Paredes", "Andrade", "Ruiz", "Salazar", "Cevallos", "Villacís", "Moreno", "Espinoza", "Jaramillo", "Vera", "Ortiz", "Ríos", "Chiriboga", "Quinde", "Herrera", "Benítez", "Guamán", "Cárdenas"];
const MARCAS = ["HP", "Oster", "Sony", "LG", "Samsung", "Xiaomi", "Totto", "Philips", "Huawei", "Indurama", "GW", "Cinemark"];
const ESTADOS_PEDIDO = ["Confirmado", "Preparando", "Enviado", "Entregado", "Digital enviado", "Cancelado"];
const CANALES = ["Web", "App", "Web + App"];

/** Generador pseudoaleatorio determinista (mismos datos en cada corrida). */
const rnd = (() => {
  let s = 123456789;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
})();
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)]!;

export function generarStress(db: Db, n: number) {
  const hoy = new Date();
  const fechaISO = (diasAtras: number) => new Date(hoy.getTime() - diasAtras * 864e5).toISOString().slice(0, 10);
  const fecha = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

  const participantes = Array.from({ length: n }, (_, i) => {
    const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
    const acum = Math.floor(rnd() * 350000);
    return {
      id: `s${i}`,
      nombre,
      cedula: String(1000000000 + i * 7).slice(0, 10),
      email: `usuario${i}@correo.com`,
      celular: `+593 9${String(80000000 + i).slice(0, 8)}`,
      puntos: Math.round(acum * 0.4),
      acumulados12m: acum,
      estado: rnd() < 0.03 ? "Bloqueado" : "Activo",
      canal: pick(CANALES),
      alta: fecha(fechaISO(Math.floor(rnd() * 700))),
      direcciones: [],
      ajustes: [],
    };
  });
  // Se conserva la participante demo (p1) al inicio para que el sitio siga funcionando.
  const p1 = db.admin.participantes.find((p: any) => p.id === "p1");
  db.admin.participantes = (p1 ? [p1, ...participantes] : participantes) as any[];

  const base = db.admin.productos[0]!;
  const productos = Array.from({ length: Math.max(100, Math.floor(n / 10)) }, (_, i) => {
    const marca = pick(MARCAS);
    const precio = Math.round(10 + rnd() * 900);
    return {
      ...base,
      id: `sp${i}`,
      nombre: `${marca} Producto ${i + 1}`,
      marca,
      precio,
      puntos: precio * 70,
      activo: true,
      destacado: false,
    };
  });
  db.admin.productos = [...db.admin.productos, ...productos] as any[];
  db.catalogo.productos = db.admin.productos.filter((p: any) => p.activo) as any[];

  const beneficiosBase = db.admin.beneficios[0]!;
  db.admin.beneficios = [
    ...db.admin.beneficios,
    ...Array.from({ length: Math.max(50, Math.floor(n / 20)) }, (_, i) => ({ ...beneficiosBase, id: `sb${i}`, nombre: `Beneficio masivo ${i + 1}`, marca: `Comercio ${i % 200}`, activo: true })),
  ] as any[];
  db.catalogo.beneficios = db.admin.beneficios.filter((b: any) => b.activo) as any[];

  const compraBase = db.admin.pedidos[0]!;
  const pedidos = Array.from({ length: n * 2 }, (_, i) => {
    const iso = fechaISO(Math.floor(rnd() * 700));
    const estadoAdmin = pick(ESTADOS_PEDIDO);
    return {
      ...compraBase,
      codigo: `BNB-S${String(i).padStart(7, "0")}`,
      fecha: fecha(iso),
      fechaISO: iso,
      cliente: participantes[i % participantes.length]!.nombre,
      email: participantes[i % participantes.length]!.email,
      estadoAdmin,
      estado: "Procesando",
      digital: rnd() < 0.3,
      puntosUsados: Math.floor(rnd() * 50000),
      montoUSD: rnd() < 0.3 ? Math.round(rnd() * 300) : 0,
      guia: "",
      historial: [{ estado: "Confirmado", fecha: `${fecha(iso)} 09:00` }],
    };
  });
  db.admin.pedidos = [...db.admin.pedidos, ...pedidos] as any[];

  // Atención: N/5 mensajes · Cotizaciones: N/4 · Destinos: N/50 · Ciudades: N/100 · Marcas: 50 extra
  const ESTADOS_MSG = ["Nuevo", "En proceso", "Respondido"];
  const ASUNTOS = ["Pedido no llega", "Cupón no válido", "Puntos de compra", "Cuenta bloqueada", "Consulta de nivel", "Error al pagar"];
  db.admin.mensajes = [
    ...db.admin.mensajes,
    ...Array.from({ length: Math.max(20, Math.floor(n / 5)) }, (_, i) => {
      const p = participantes[i % participantes.length]!;
      return { id: `sc${i}`, nombre: p.nombre, email: p.email, asunto: `${pick(ASUNTOS)} #${i}`, mensaje: "Mensaje de prueba de carga.", fecha: fecha(fechaISO(Math.floor(rnd() * 90))), estado: pick(ESTADOS_MSG) };
    }),
  ] as any[];

  const CODIGOS = db.admin.ciudades.map((c: any) => c.codigo);
  const ESTADOS_COT = ["Enviada", "En revisión", "Cotizada", "Cerrada"];
  (db as any).cotizacionesExtra = Array.from({ length: Math.max(20, Math.floor(n / 4)) }, (_, i) => {
    const p = participantes[i % participantes.length]!;
    return {
      codigo: `COT-S${String(i).padStart(7, "0")}`,
      fecha: fechaISO(Math.floor(rnd() * 120)),
      origen: pick(CODIGOS),
      destino: pick(CODIGOS),
      tipoViaje: rnd() < 0.7 ? "Ida y vuelta" : "Solo ida",
      clase: pick(["Económica", "Ejecutiva"]),
      salida: fechaISO(-30 - Math.floor(rnd() * 200)),
      estado: pick(ESTADOS_COT),
      cliente: p.nombre,
      email: p.email,
      pasajeros: 1,
      pasajerosDetalle: [{ nombres: p.nombre.split(" ")[0]!, apellidos: p.nombre.split(" ").slice(1).join(" "), tipoDoc: "cedula", numDoc: p.cedula, nacimiento: "1985-05-15", asistencia: rnd() < 0.05 }],
      mensajes: [],
      historial: [{ estado: "Enviada", fecha: `${fechaISO(0)}T09:00:00`, por: "Participante" }],
    };
  });

  const destinoBase = db.admin.destinos[0]!;
  db.admin.destinos = [
    ...db.admin.destinos,
    ...Array.from({ length: Math.max(12, Math.floor(n / 50)) }, (_, i) => ({ ...destinoBase, slug: `sd${i}`, titulo: `Destino masivo ${i + 1}`, ciudad: `Ciudad ${i + 1}`, pais: `País ${i % 40}`, activo: true, destacado: false })),
  ] as any[];
  db.admin.ciudades = [
    ...db.admin.ciudades,
    ...Array.from({ length: Math.max(20, Math.floor(n / 100)) }, (_, i) => ({ codigo: "Z" + i.toString(36).toUpperCase().padStart(2, "0"), ciudad: `Ciudad masiva ${i + 1}`, pais: `País ${i % 40}`, activo: true })),
  ] as any[];
  db.admin.marcas = [
    ...db.admin.marcas,
    ...Array.from({ length: 50 }, (_, i) => ({ id: `marca-masiva-${i}`, nombre: `Marca masiva ${i + 1}`, logo: "", web: `https://www.marca${i}.com`, descripcion: "", activo: true })),
  ] as any[];

  db.admin.comprasPuntos = [...Array.from({ length: Math.max(20, Math.floor(n / 2)) }, (_, i) => { const iso = fechaISO(Math.floor(rnd() * 400)); const p = participantes[i % participantes.length]!; const cantidad = 500 * (1 + Math.floor(rnd() * 40)); return { codigo: `PTS-S${String(i).padStart(7, "0")}`, fechaISO: iso, fecha: fecha(iso), participanteId: p.id, cliente: p.nombre, email: p.email, cantidad, monto: Math.round(cantidad * 0.0031 * 100) / 100, estado: "Aprobada" }; }), ...db.admin.comprasPuntos] as any[];

  const tipos = ["acumulacion", "canje", "compra"] as const;
  db.admin.movimientos = [
    ...db.admin.movimientos,
    ...Array.from({ length: n * 3 }, (_, i) => {
      const iso = fechaISO(Math.floor(rnd() * 700));
      const tipo = pick([...tipos]);
      return { id: `sm${i}`, fechaISO: iso, fecha: fecha(iso), detalle: `${tipo === "canje" ? "Canje" : tipo === "compra" ? "Compra de puntos" : "Compra en agencia"} #${i}`, tipo, puntos: (tipo === "canje" ? -1 : 1) * Math.floor(rnd() * 30000), cliente: participantes[i % participantes.length]!.nombre };
    }),
  ] as any[];
}
