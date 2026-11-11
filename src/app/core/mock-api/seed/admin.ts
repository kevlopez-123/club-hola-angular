// Datos mock del panel de administración (un solo contenido para web y app).
export type Participante = {
  id: string;
  nombre: string;
  cedula: string;
  email: string;
  celular: string;
  /** Nivel asignado por el banco según su segmento (Clásico, Plata, Oro o Diamante). */
  nivel: string;
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
    cedula: `4${String(1029384 + i * 7311).slice(0, 7)}`,
    email: n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, ".") + "@correo.com",
    celular: `+51 9${String(81234567 + i * 1371).slice(0, 8)}`,
    nivel: acum >= 300000 ? "Diamante" : acum >= 150000 ? "Oro" : acum >= 50000 ? "Plata" : "Clásico",
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

export type EstadoPedido = "Pagado" | "Anulado";
export const estadosPedido: EstadoPedido[] = ["Pagado", "Anulado"];

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
  { id: "c1", nombre: "Ana Torres", email: "ana.torres@correo.com", asunto: "Beneficio no llega", mensaje: "Compré un beneficio hace 2 días y aún no llega a mi correo.", fecha: "27/10/2026", estado: "Nuevo" },
  { id: "c2", nombre: "Carlos Andrade", email: "carlos.andrade@correo.com", asunto: "Cupón no válido", mensaje: "El local no aceptó mi cupón de descuento.", fecha: "26/10/2026", estado: "En proceso" },
  { id: "c3", nombre: "Gabriela Ruiz", email: "gabriela.ruiz@correo.com", asunto: "Cambio de nivel", mensaje: "Creo que mi nivel no corresponde a mi segmento.", fecha: "25/10/2026", estado: "Respondido" },
  { id: "c4", nombre: "Diego Salazar", email: "diego.salazar@correo.com", asunto: "Cuenta bloqueada", mensaje: "No puedo ingresar a la app.", fecha: "24/10/2026", estado: "Nuevo" },
];

/** Nombre del rol: los cinco del sistema u otros creados por el administrador. */
export type RolAdmin = string;
export const rolesAdmin: { rol: RolAdmin; descripcion: string; permisos: string[] }[] = [
  { rol: "Administrador", descripcion: "Acceso total al panel.", permisos: ["Todo"] },
  { rol: "Catálogo", descripcion: "Gestiona beneficios, marcas y contenido.", permisos: ["Beneficios", "Marcas", "Contenido"] },
  { rol: "Operaciones", descripcion: "Gestiona participantes y compras.", permisos: ["Participantes", "Pedidos"] },
  { rol: "Atención", descripcion: "Responde mensajes y consulta participantes.", permisos: ["Atención", "Participantes"] },
  { rol: "Solo lectura", descripcion: "Consulta reportes y dashboard.", permisos: ["Dashboard", "Reportes"] },
];

/** Usuarios iniciales del panel, uno por rol. Las contraseñas iniciales están en `credencialesIniciales` y deben cambiarse al entrar. */
export const usuariosAdmin = [
  { id: "u1", nombre: "Mariela Castro", email: "admin@clubhola.com.pe", rol: "Administrador" as RolAdmin, ultimo: "—" },
  { id: "u2", nombre: "Roberto Peña", email: "catalogo@clubhola.com.pe", rol: "Catálogo" as RolAdmin, ultimo: "—" },
  { id: "u3", nombre: "Karla Núñez", email: "operaciones@clubhola.com.pe", rol: "Operaciones" as RolAdmin, ultimo: "—" },
  { id: "u4", nombre: "Lucía Torres", email: "atencion@clubhola.com.pe", rol: "Atención" as RolAdmin, ultimo: "—" },
  { id: "u5", nombre: "Esteban Lara", email: "lectura@clubhola.com.pe", rol: "Solo lectura" as RolAdmin, ultimo: "—" },
];

/** Contraseñas iniciales por correo (el backend real debe guardarlas con hash). */
export const credencialesIniciales = [
  { email: "admin@clubhola.com.pe", clave: "Admin#2026" },
  { email: "catalogo@clubhola.com.pe", clave: "Catalogo#2026" },
  { email: "operaciones@clubhola.com.pe", clave: "Operaciones#2026" },
  { email: "atencion@clubhola.com.pe", clave: "Atencion#2026" },
  { email: "lectura@clubhola.com.pe", clave: "Lectura#2026" },
];

export const auditoria = [
  { fecha: "28/10/2026 12:31", usuario: "Mariela Castro", accion: "Editó los beneficios del nivel Oro" },
  { fecha: "28/10/2026 10:05", usuario: "Roberto Peña", accion: "Publicó banner “Black Friday” (App)" },
  { fecha: "27/10/2026 17:44", usuario: "Karla Núñez", accion: "Cambió el nivel de Ana Torres a Oro" },
];

export const onboarding = [
  { id: "o1", titulo: "Tu nivel", texto: "Sube de nivel y desbloquea más beneficios.", activo: true },
  { id: "o2", titulo: "Gira y gana", texto: "Participa en Spin & Win y valida tus códigos Lucky Code.", activo: true },
  { id: "o3", titulo: "Beneficios exclusivos", texto: "Descuentos en tus marcas favoritas.", activo: true },
];

export const provincias = ["Lima", "Callao", "Arequipa", "Cusco", "La Libertad", "Piura", "Lambayeque", "Junín", "Ica", "Cajamarca"];

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
