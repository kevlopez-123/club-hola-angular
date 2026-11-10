import type { DocumentoIdentidad, Provincia, TenantConfig } from "./tenant.types";

/** País con el que arranca el proyecto (cámbialo para cambiar de cliente por defecto). */
export const TENANT_POR_DEFECTO = "ecuador";

type Pais = TenantConfig["pais"];

const doc = (value: string, label: string, digitos: number, numerico = true): DocumentoIdentidad => ({ value, label, digitos, numerico });
const prov = (...nombres: string[]): Provincia[] => nombres.map((nombre) => ({ nombre, envio: true }));
const pasaporte = doc("pasaporte", "Pasaporte", 12, false);

/**
 * Países disponibles: código ISO, bandera, moneda, símbolo, prefijo y dígitos del celular, documentos de identidad
 * y divisiones administrativas oficiales (ISO 3166-2). En el panel solo se decide a cuáles se hace envío.
 */
export const PAISES: Record<string, Pais> = {
  EC: {
    codigo: "EC", nombre: "Ecuador", locale: "es-EC", telefonoPrefijo: "+593", telefonoDigitos: 9,
    moneda: { codigo: "USD", simbolo: "$" },
    centro: { lat: -0.1807, lng: -78.4678, zoom: 12 },
    documentos: [doc("cedula", "Cédula de Identidad", 10), doc("ruc", "RUC", 13), pasaporte, doc("ce", "Carné de Extranjería", 12, false), doc("colaborador", "Código de colaborador", 10, false)],
    provincias: prov("Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"),
  },
  PE: {
    codigo: "PE", nombre: "Perú", locale: "es-PE", telefonoPrefijo: "+51", telefonoDigitos: 9,
    moneda: { codigo: "PEN", simbolo: "S/ " },
    centro: { lat: -12.0464, lng: -77.0428, zoom: 12 },
    documentos: [doc("dni", "DNI", 8), doc("ruc", "RUC", 11), doc("ce", "Carné de Extranjería", 12, false), pasaporte],
    provincias: prov("Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali"),
  },
  CO: {
    codigo: "CO", nombre: "Colombia", locale: "es-CO", telefonoPrefijo: "+57", telefonoDigitos: 10,
    moneda: { codigo: "COP", simbolo: "$" },
    centro: { lat: 4.711, lng: -74.0721, zoom: 12 },
    documentos: [doc("cc", "Cédula de Ciudadanía", 10), doc("nit", "NIT", 10), doc("ce", "Cédula de Extranjería", 7), pasaporte],
    provincias: prov("Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"),
  },
  CL: {
    codigo: "CL", nombre: "Chile", locale: "es-CL", telefonoPrefijo: "+56", telefonoDigitos: 9,
    moneda: { codigo: "CLP", simbolo: "$" },
    centro: { lat: -33.4489, lng: -70.6693, zoom: 11 },
    documentos: [doc("rut", "RUT", 9, false), pasaporte],
    provincias: prov("Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana de Santiago", "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes y de la Antártica Chilena"),
  },
  BO: {
    codigo: "BO", nombre: "Bolivia", locale: "es-BO", telefonoPrefijo: "+591", telefonoDigitos: 8,
    moneda: { codigo: "BOB", simbolo: "Bs " },
    centro: { lat: -16.5, lng: -68.15, zoom: 12 },
    documentos: [doc("ci", "Cédula de Identidad", 8, false), doc("nit", "NIT", 10), pasaporte],
    provincias: prov("Beni", "Chuquisaca", "Cochabamba", "La Paz", "Oruro", "Pando", "Potosí", "Santa Cruz", "Tarija"),
  },
  MX: {
    codigo: "MX", nombre: "México", locale: "es-MX", telefonoPrefijo: "+52", telefonoDigitos: 10,
    moneda: { codigo: "MXN", simbolo: "$" },
    centro: { lat: 19.4326, lng: -99.1332, zoom: 11 },
    documentos: [doc("curp", "CURP", 18, false), doc("rfc", "RFC", 13, false), pasaporte],
    provincias: prov("Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"),
  },
  PA: {
    codigo: "PA", nombre: "Panamá", locale: "es-PA", telefonoPrefijo: "+507", telefonoDigitos: 8,
    moneda: { codigo: "USD", simbolo: "$" },
    centro: { lat: 8.9824, lng: -79.5199, zoom: 12 },
    documentos: [doc("cip", "Cédula de Identidad Personal", 12, false), pasaporte],
    provincias: prov("Bocas del Toro", "Chiriquí", "Coclé", "Colón", "Darién", "Herrera", "Los Santos", "Panamá", "Panamá Oeste", "Veraguas", "Comarca Emberá-Wounaan", "Comarca Guna Yala", "Comarca Ngäbe-Buglé"),
  },
  GT: {
    codigo: "GT", nombre: "Guatemala", locale: "es-GT", telefonoPrefijo: "+502", telefonoDigitos: 8,
    moneda: { codigo: "GTQ", simbolo: "Q " },
    centro: { lat: 14.6349, lng: -90.5069, zoom: 12 },
    documentos: [doc("dpi", "DPI", 13), doc("nit", "NIT", 9, false), pasaporte],
    provincias: prov("Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"),
  },
  ES: {
    codigo: "ES", nombre: "España", locale: "es-ES", telefonoPrefijo: "+34", telefonoDigitos: 9,
    moneda: { codigo: "EUR", simbolo: "€" },
    centro: { lat: 40.4168, lng: -3.7038, zoom: 11 },
    documentos: [doc("dni", "DNI / NIF", 9, false), doc("nie", "NIE", 9, false), pasaporte],
    provincias: prov("A Coruña", "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona", "Bizkaia", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ceuta", "Ciudad Real", "Córdoba", "Cuenca", "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva", "Huesca", "Illes Balears", "Jaén", "La Rioja", "Las Palmas", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia", "Valladolid", "Zamora", "Zaragoza"),
  },
  AR: {
    codigo: "AR", nombre: "Argentina", locale: "es-AR", telefonoPrefijo: "+54", telefonoDigitos: 10,
    moneda: { codigo: "ARS", simbolo: "$" },
    centro: { lat: -34.6037, lng: -58.3816, zoom: 11 },
    documentos: [doc("dni", "DNI", 8), doc("cuit", "CUIT / CUIL", 11), pasaporte],
    provincias: prov("Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"),
  },
  BR: {
    codigo: "BR", nombre: "Brasil", locale: "es-BR", telefonoPrefijo: "+55", telefonoDigitos: 11,
    moneda: { codigo: "BRL", simbolo: "R$ " },
    centro: { lat: -15.7939, lng: -47.8828, zoom: 11 },
    documentos: [doc("cpf", "CPF", 11), doc("cnpj", "CNPJ", 14), pasaporte],
    provincias: prov("Acre", "Alagoas", "Amapá", "Amazonas", "Bahía", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Río de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"),
  },
};

export const LISTA_PAISES = Object.values(PAISES);
export const paisPorCodigo = (codigo: string): Pais => structuredClone(PAISES[codigo] ?? PAISES["EC"]!);

const imgBase = {
  login: "img/login-banner.jpg",
  contacto: "img/contacto-oficina.jpg",
  ctaCatalogo: "img/cta-catalogo.jpg",
  ctaContacto: "img/cta-contacto.jpg",
};

const tipografia = {
  fuente: "Montserrat",
  fuenteUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900&display=swap",
};

/** Cliente por defecto: Banco Solidario (Ecuador). Para otro cliente, edita la marca desde el panel o duplica este objeto. */
export const ECUADOR: TenantConfig = {
  id: "ecuador",
  marca: {
    nombre: "Banco Solidario",
    programa: "Banco Solidario Puntos",
    unidadPuntos: "puntos",
    logoClaro: "https://www.banco-solidario.com/themes/solidario/img/solidario-color.svg",
    logoOscuro: "https://www.banco-solidario.com/themes/solidario/img/logo_blanco.svg",
    favicon: "favicon.ico",
    derechos: "Banco Solidario Ecuador 2026 | Todos los derechos reservados | Powered by Motiva Soluciones",
  },
  tema: { primario: "#00bdd2", textoPrimario: "#ffffff", texto: "#2b2b2b", fondo: "#ffffff", superficie: "#f2f1f1", radio: 1, ...tipografia },
  pais: paisPorCodigo("EC"),
  imagenes: imgBase,
};

/** La lista de provincias es la oficial del país; de lo guardado solo se conserva si cada una tiene envío. */
export const provinciasDe = (codigo: string, guardadas: Provincia[] = []): Provincia[] => {
  const envio = new Map(guardadas.map((p) => [p.nombre, p.envio]));
  return paisPorCodigo(codigo).provincias.map((p) => ({ nombre: p.nombre, envio: envio.get(p.nombre) ?? true }));
};

/** Completa con valores por defecto lo que falte (configuraciones guardadas o importadas de versiones anteriores). */
export const normalizarTenant = (t: Partial<TenantConfig>): TenantConfig => {
  const base = structuredClone(ECUADOR);
  const pais = { ...paisPorCodigo(t.pais?.codigo ?? "EC"), ...t.pais } as Pais;
  pais.provincias = provinciasDe(pais.codigo, t.pais?.provincias);
  return { ...base, ...t, marca: { ...base.marca, ...t.marca }, tema: { ...base.tema, ...t.tema }, pais, imagenes: { ...base.imagenes, ...t.imagenes } } as TenantConfig;
};

export const PRESETS: Record<string, TenantConfig> = { ecuador: ECUADOR };
export const presetPorId = (id: string): TenantConfig => structuredClone(PRESETS[id] ?? ECUADOR);
