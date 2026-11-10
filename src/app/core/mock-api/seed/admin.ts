// Datos mock del panel de administración (un solo contenido para web y app).
export type Participante = {
  id: string;
  nombre: string;
  cedula: string;
  email: string;
  celular: string;
  puntos: number;
  acumulados12m: number;
  estado: "Activo" | "Bloqueado";
  canal: "Web" | "App" | "Web + App";
  alta: string;
  /** Acepta correos de novedades y campañas (false = baja). Los avisos de su cuenta (códigos, pedidos, puntos) se envían igual. */
  recibeNovedades?: boolean;
  /** Evidencia del último cambio de esa preferencia: cuándo y quién la hizo. */
  novedadesCambio?: { fecha: string; origen: "participante" | "enlace" | "admin" };
};

const nombres = [
  "Ana Torres", "Luis Mendoza", "María José Paredes", "Carlos Andrade", "Gabriela Ruiz",
  "Diego Salazar", "Valeria Cevallos", "Jorge Villacís", "Daniela Moreno", "Andrés Espinoza",
  "Paula Jaramillo", "Santiago Vera", "Camila Ortiz", "Fernando Ríos", "Lucía Chiriboga",
];

export const participantes: Participante[] = nombres.map((n, i) => {
  const acum = [12500, 64800, 182000, 38900, 251000, 8700, 97300, 143500, 45100, 310200, 22000, 76400, 158900, 5300, 89000][i] ?? 0;
  return {
    id: `p${i + 1}`,
    nombre: n,
    cedula: `17${String(10293847 + i * 7311).slice(0, 8)}`,
    email: n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, ".") + "@correo.com",
    celular: `+593 9${String(81234567 + i * 1371).slice(0, 8)}`,
    puntos: Math.round(acum * 0.42),
    acumulados12m: acum,
    estado: i === 5 || i === 13 ? "Bloqueado" : "Activo",
    canal: (["Web", "App", "Web + App"] as const)[i % 3]!,
    alta: `${String((i % 27) + 1).padStart(2, "0")}/0${(i % 9) + 1}/2026`,
  };
});

export const kpis = {
  emitidos: 18_450_300,
  canjeados: 11_204_800,
  canjesHoy: 342,
  activos: 24_870,
  ventasUSD: 48_230,
};

export const tendencia = [
  { mes: "May", emitidos: 2100, canjeados: 1350 },
  { mes: "Jun", emitidos: 2450, canjeados: 1600 },
  { mes: "Jul", emitidos: 2800, canjeados: 1720 },
  { mes: "Ago", emitidos: 3050, canjeados: 2010 },
  { mes: "Sep", emitidos: 3320, canjeados: 2240 },
  { mes: "Oct", emitidos: 3600, canjeados: 2380 },
];

export type EstadoPedido = "Confirmado" | "Preparando" | "Enviado" | "Entregado" | "Digital enviado" | "Cancelado";
export const estadosPedido: EstadoPedido[] = ["Confirmado", "Preparando", "Enviado", "Entregado", "Digital enviado", "Cancelado"];

export type Mensaje = {
  id: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  fecha: string;
  estado: "Nuevo" | "En proceso" | "Respondido";
  /** Teléfono que dejó el participante (consultas enviadas desde Contáctanos). */
  telefono?: string;
  /** De dónde llegó el mensaje. */
  origen?: string;
};

export const mensajes: Mensaje[] = [
  { id: "c1", nombre: "Ana Torres", email: "ana.torres@correo.com", asunto: "Pedido no llega", mensaje: "Hice un canje hace 5 días y aún no recibo mis audífonos.", fecha: "27/10/2026", estado: "Nuevo" },
  { id: "c2", nombre: "Carlos Andrade", email: "carlos.andrade@correo.com", asunto: "Cupón no válido", mensaje: "El local no aceptó mi cupón de descuento.", fecha: "26/10/2026", estado: "En proceso" },
  { id: "c3", nombre: "Gabriela Ruiz", email: "gabriela.ruiz@correo.com", asunto: "Puntos de compra", mensaje: "Compré 5 000 puntos pero no se reflejan.", fecha: "25/10/2026", estado: "Respondido" },
  { id: "c4", nombre: "Diego Salazar", email: "diego.salazar@correo.com", asunto: "Cuenta bloqueada", mensaje: "No puedo ingresar a la app.", fecha: "24/10/2026", estado: "Nuevo" },
];

/** Nombre del rol: los cinco del sistema u otros creados por el administrador. */
export type RolAdmin = string;
export const rolesAdmin: { rol: RolAdmin; descripcion: string; permisos: string[] }[] = [
  { rol: "Administrador", descripcion: "Acceso total al panel.", permisos: ["Todo"] },
  { rol: "Catálogo", descripcion: "Gestiona productos, beneficios, marcas, destinos y contenido.", permisos: ["Productos", "Beneficios", "Marcas", "Destinos", "Contenido"] },
  { rol: "Operaciones", descripcion: "Gestiona participantes, pedidos, movimientos y cotizaciones.", permisos: ["Participantes", "Pedidos", "Movimientos", "Cotizaciones"] },
  { rol: "Atención", descripcion: "Responde mensajes y cotizaciones de vuelos y consulta participantes.", permisos: ["Atención", "Cotizaciones", "Participantes"] },
  { rol: "Solo lectura", descripcion: "Consulta reportes y dashboard.", permisos: ["Dashboard", "Reportes"] },
];

/** Usuarios iniciales del panel, uno por rol. Las contraseñas iniciales están en `credencialesIniciales` y deben cambiarse al entrar. */
export const usuariosAdmin = [
  { id: "u1", nombre: "Mariela Castro", email: "admin@bancosolidario.com", rol: "Administrador" as RolAdmin, ultimo: "—" },
  { id: "u2", nombre: "Roberto Peña", email: "catalogo@bancosolidario.com", rol: "Catálogo" as RolAdmin, ultimo: "—" },
  { id: "u3", nombre: "Karla Núñez", email: "operaciones@bancosolidario.com", rol: "Operaciones" as RolAdmin, ultimo: "—" },
  { id: "u4", nombre: "Lucía Torres", email: "atencion@bancosolidario.com", rol: "Atención" as RolAdmin, ultimo: "—" },
  { id: "u5", nombre: "Esteban Lara", email: "lectura@bancosolidario.com", rol: "Solo lectura" as RolAdmin, ultimo: "—" },
];

/** Contraseñas iniciales por correo (el backend real debe guardarlas con hash). */
export const credencialesIniciales = [
  { email: "admin@bancosolidario.com", clave: "Admin#2026" },
  { email: "catalogo@bancosolidario.com", clave: "Catalogo#2026" },
  { email: "operaciones@bancosolidario.com", clave: "Operaciones#2026" },
  { email: "atencion@bancosolidario.com", clave: "Atencion#2026" },
  { email: "lectura@bancosolidario.com", clave: "Lectura#2026" },
];

export const auditoria = [
  { fecha: "28/10/2026 12:31", usuario: "Mariela Castro", accion: "Editó nivel Oro (rango de puntos)" },
  { fecha: "28/10/2026 10:05", usuario: "Roberto Peña", accion: "Publicó banner “Black Friday” (App)" },
  { fecha: "27/10/2026 17:44", usuario: "Karla Núñez", accion: "Ajustó +5 000 puntos a Ana Torres" },
  { fecha: "27/10/2026 11:20", usuario: "Roberto Peña", accion: "Creó destino “Galápagos”" },
];

export const onboarding = [
  { id: "o1", titulo: "Acumula puntos", texto: "Usa tus tarjetas y suma puntos en cada compra.", activo: true },
  { id: "o2", titulo: "Canjea lo que quieras", texto: "Tecnología, hogar, gift cards y más.", activo: true },
  { id: "o3", titulo: "Beneficios exclusivos", texto: "Descuentos en tus marcas favoritas.", activo: true },
];

export const provincias = ["Pichincha", "Guayas", "Azuay", "Manabí", "El Oro", "Tungurahua", "Imbabura", "Loja"];

// ---------- Formulario dinámico ----------
export type TipoCampo = "texto" | "email" | "telefono" | "numero" | "fecha" | "textarea" | "select" | "checkbox";

export type CampoForm = {
  id: string;
  tipo: TipoCampo;
  etiqueta: string;
  obligatorio: boolean;
  ayuda?: string | undefined;
  opciones?: string[] | undefined;
  mapeo?: string | undefined; // dato del participante al que se guarda
  ancho: "media" | "completa";
};

export const camposDisponiblesMapeo = [
  { campo: "apellido_paterno", tipo: "texto" },
  { campo: "apellido_materno", tipo: "texto" },
  { campo: "email", tipo: "texto" },
  { campo: "celular", tipo: "texto" },
  { campo: "fecha_nacimiento", tipo: "fecha" },
  { campo: "genero", tipo: "lista" },
  { campo: "provincia", tipo: "lista" },
  { campo: "ciudad", tipo: "lista" },
  { campo: "ocupacion", tipo: "texto" },

];

export const camposIniciales: CampoForm[] = [
  { id: "f1", tipo: "texto", etiqueta: "Apellido paterno", obligatorio: true, mapeo: "apellido_paterno", ancho: "media" },
  { id: "f2", tipo: "texto", etiqueta: "Apellido materno", obligatorio: false, mapeo: "apellido_materno", ancho: "media" },
  { id: "f3", tipo: "email", etiqueta: "Correo electrónico", obligatorio: true, mapeo: "email", ancho: "media" },
  { id: "f4", tipo: "telefono", etiqueta: "N.º de celular", obligatorio: true, mapeo: "celular", ancho: "media" },
  { id: "f5", tipo: "fecha", etiqueta: "Fecha de nacimiento", obligatorio: false, mapeo: "fecha_nacimiento", ancho: "media" },
  { id: "f6", tipo: "select", etiqueta: "Género", obligatorio: true, opciones: ["Femenino", "Masculino", "Prefiero no decir"], mapeo: "genero", ancho: "media" },
  { id: "f7", tipo: "select", etiqueta: "Provincia", obligatorio: false, opciones: provincias, mapeo: "provincia", ancho: "media" },
  { id: "f8", tipo: "select", etiqueta: "Ciudad", obligatorio: false, opciones: ["Quito", "Guayaquil", "Cuenca"], mapeo: "ciudad", ancho: "media" },

];
