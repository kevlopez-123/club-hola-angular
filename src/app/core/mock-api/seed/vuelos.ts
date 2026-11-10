const vBanner1 = "img/v-banner-1.jpg";
const vBanner2 = "img/v-banner-2.jpg";
const vGalapagos = "img/v-galapagos.jpg";
const vCartagena = "img/v-cartagena.jpg";
const vMiami = "img/v-miami.jpg";
const vCusco = "img/v-cusco.jpg";
import type { Slide } from "./mock";

export const slidesVuelos: Slide[] = [
  { id: "vuelo-promo-1", imagen: vBanner1, alt: "Promociones de vuelos nacionales e internacionales" },
  { id: "vuelo-promo-2", imagen: vBanner2, alt: "Viaja en familia con tus puntos Banco Solidario" },
];

export type Ciudad = { codigo: string; ciudad: string; pais: string };

export const ciudades: Ciudad[] = [
  { codigo: "UIO", ciudad: "Quito", pais: "Ecuador" },
  { codigo: "GYE", ciudad: "Guayaquil", pais: "Ecuador" },
  { codigo: "CUE", ciudad: "Cuenca", pais: "Ecuador" },
  { codigo: "GPS", ciudad: "Baltra (Galápagos)", pais: "Ecuador" },
  { codigo: "MIA", ciudad: "Miami", pais: "Estados Unidos" },
  { codigo: "JFK", ciudad: "Nueva York", pais: "Estados Unidos" },
  { codigo: "BOG", ciudad: "Bogotá", pais: "Colombia" },
  { codigo: "CTG", ciudad: "Cartagena", pais: "Colombia" },
  { codigo: "LIM", ciudad: "Lima", pais: "Perú" },
  { codigo: "CUZ", ciudad: "Cusco", pais: "Perú" },
  { codigo: "SCL", ciudad: "Santiago", pais: "Chile" },
  { codigo: "MAD", ciudad: "Madrid", pais: "España" },
  { codigo: "MEX", ciudad: "Ciudad de México", pais: "México" },
  { codigo: "PTY", ciudad: "Ciudad de Panamá", pais: "Panamá" },
];

export const tiposViaje = [
  { value: "ida-vuelta", label: "Ida y vuelta" },
  { value: "solo-ida", label: "Solo ida" },
] as const;

export const clases = [
  { value: "economica", label: "Económica" },
  { value: "ejecutiva", label: "Ejecutiva" },
  { value: "primera", label: "Primera clase" },
] as const;

export const tiposDocumento = [
  { value: "cedula", label: "Cédula" },
  { value: "pasaporte", label: "Pasaporte" },
] as const;

export type Destino = {
  slug: string;
  ciudad: string;
  pais: string;
  codigo: string;
  imagen: string;
  titulo: string;
  resumen: string;
  desdeUSD: number;
  duracion: string;
  mejorEpoca: string;
  descripcion: string;
  highlights: string[];
};

export const destinos: Destino[] = [
  {
    slug: "galapagos",
    ciudad: "Galápagos",
    pais: "Ecuador",
    codigo: "GPS",
    imagen: vGalapagos,
    titulo: "Galápagos, naturaleza sin filtros",
    resumen: "Playas de arena blanca, lobos marinos y snorkel entre tortugas gigantes.",
    desdeUSD: 289,
    duracion: "2 h desde Quito",
    mejorEpoca: "Diciembre a mayo",
    descripcion:
      "Un archipiélago único donde la fauna se acerca sin miedo. Recorre Santa Cruz, Isabela y San Cristóbal, combina caminatas por campos de lava con tardes de snorkel en aguas turquesa.",
    highlights: ["Snorkel en Concha de Perla", "Estación Charles Darwin", "Playa Tortuga Bay", "Tour de bahía en yate"],
  },
  {
    slug: "cartagena",
    ciudad: "Cartagena",
    pais: "Colombia",
    codigo: "CTG",
    imagen: vCartagena,
    titulo: "Cartagena, color caribeño",
    resumen: "Ciudad amurallada, balcones con buganvillas y atardeceres frente al mar.",
    desdeUSD: 340,
    duracion: "2 h 30 min desde Guayaquil",
    mejorEpoca: "Diciembre a abril",
    descripcion:
      "Callejones coloniales de día y música en vivo de noche. Cartagena mezcla historia, gastronomía caribeña y escapadas en lancha a las Islas del Rosario.",
    highlights: ["Ciudad amurallada", "Islas del Rosario", "Castillo San Felipe", "Cena en Getsemaní"],
  },
  {
    slug: "miami",
    ciudad: "Miami",
    pais: "Estados Unidos",
    codigo: "MIA",
    imagen: vMiami,
    titulo: "Miami, compras y playa",
    resumen: "Outlets, parques temáticos cercanos y las mejores playas urbanas.",
    desdeUSD: 420,
    duracion: "4 h 15 min desde Quito",
    mejorEpoca: "Marzo a junio",
    descripcion:
      "El destino favorito para compras familiares. Combina días de outlet y centros comerciales con paseos por Ocean Drive, Wynwood y Key Biscayne.",
    highlights: ["Dolphin Mall y Sawgrass", "Wynwood Walls", "South Beach", "Excursión a Orlando"],
  },
  {
    slug: "cusco",
    ciudad: "Cusco",
    pais: "Perú",
    codigo: "CUZ",
    imagen: vCusco,
    titulo: "Cusco y Machu Picchu",
    resumen: "La capital inca, el Valle Sagrado y una de las maravillas del mundo.",
    desdeUSD: 310,
    duracion: "3 h vía Lima",
    mejorEpoca: "Abril a octubre",
    descripcion:
      "Un viaje de historia viva: calles de piedra, mercados andinos y el tren panorámico rumbo a Machu Picchu al amanecer.",
    highlights: ["Machu Picchu", "Valle Sagrado", "Montaña de 7 Colores", "Barrio de San Blas"],
  },
];

export type PasajeroCotizacion = { nombres: string; apellidos: string; tipoDoc: string; numDoc: string; nacimiento: string; asistencia: boolean };
export type MensajeCotizacion = { de: "Ejecutiva" | "Participante"; autor: string; texto: string; fecha: string; adjunto?: string };
export type EstadoCotizacion = "Enviada" | "En revisión" | "Cotizada" | "Cerrada";

export type Cotizacion = {
  codigo: string;
  fecha: string;
  origen: string;
  destino: string;
  tipoViaje: string;
  clase: string;
  pasajeros: number;
  /** Datos de cada pasajero tal como los ingresó el participante. */
  pasajerosDetalle: PasajeroCotizacion[];
  salida: string;
  regreso?: string;
  estado: EstadoCotizacion;
  /** Ejecutiva a cargo (usuario del panel). */
  ejecutiva?: string;
  ejecutivaId?: string;
  /** Monto cotizado y PDF con el itinerario, cuando la cotización ya fue enviada. */
  monto?: number;
  pdf?: string;
  /** Enlace para abrir el PDF (en un servidor real, la URL del archivo; aquí un data URL de hasta 1,5 MB). */
  pdfUrl?: string;
  nota?: string;
  /** Contactos de la ejecutiva con el participante por WhatsApp o correo (solo los ve el panel). */
  contactos?: { canal: string; por: string; fecha: string }[];
  /** Conversación del chat anterior: ya no se muestra (la comunicación es por correo y WhatsApp). */
  mensajes: MensajeCotizacion[];
  /** Cambios de estado. */
  historial: { estado: EstadoCotizacion; fecha: string; por: string }[];
};

const pax = (nombres: string, apellidos: string, numDoc: string, nacimiento: string, asistencia = false, tipoDoc = "cedula"): PasajeroCotizacion => ({ nombres, apellidos, tipoDoc, numDoc, nacimiento, asistencia });

export const cotizacionesIniciales: Cotizacion[] = [
  {
    codigo: "COT-100482", fecha: "2026-08-02", origen: "UIO", destino: "MIA", tipoViaje: "Ida y vuelta", clase: "Económica", pasajeros: 3,
    pasajerosDetalle: [pax("Ana María", "Torres Ruiz", "1712345678", "1988-04-12"), pax("Mateo", "Torres Ruiz", "1723456780", "2015-09-30"), pax("Rosa María", "Cevallos Vera", "0912345678", "1952-01-20", true)],
    salida: "2026-09-12", regreso: "2026-09-22", estado: "Cotizada", ejecutiva: "Lucía Torres", ejecutivaId: "u4", monto: 1850, pdf: "cotizacion-COT-100482.pdf",
    mensajes: [
      { de: "Participante", autor: "Ana Torres", texto: "¿Pueden incluir una opción con equipaje de bodega para los tres?", fecha: "2026-08-02T15:10:00" },
      { de: "Ejecutiva", autor: "Lucía Torres", texto: "Claro, ya la incluimos. Te enviamos la cotización con silla de ruedas para tu madre en el aeropuerto.", fecha: "2026-08-03T10:20:00", adjunto: "cotizacion-COT-100482.pdf" },
    ],
    historial: [{ estado: "Enviada", fecha: "2026-08-02T15:05:00", por: "Participante" }, { estado: "En revisión", fecha: "2026-08-02T16:00:00", por: "Lucía Torres" }, { estado: "Cotizada", fecha: "2026-08-03T10:20:00", por: "Lucía Torres" }],
  },
  {
    codigo: "COT-100455", fecha: "2026-07-18", origen: "GYE", destino: "CTG", tipoViaje: "Ida y vuelta", clase: "Ejecutiva", pasajeros: 2,
    pasajerosDetalle: [pax("Ana María", "Torres Ruiz", "1712345678", "1988-04-12"), pax("Carlos", "Mendoza Vera", "0923456789", "1985-11-02")],
    salida: "2026-08-30", regreso: "2026-09-05", estado: "En revisión", ejecutiva: "Karla Núñez", ejecutivaId: "u3",
    mensajes: [{ de: "Participante", autor: "Ana Torres", texto: "Prefiero salir por la mañana, si es posible.", fecha: "2026-07-18T09:00:00" }],
    historial: [{ estado: "Enviada", fecha: "2026-07-18T08:55:00", por: "Participante" }, { estado: "En revisión", fecha: "2026-07-18T11:30:00", por: "Karla Núñez" }],
  },
  {
    codigo: "COT-100390", fecha: "2026-06-05", origen: "UIO", destino: "GPS", tipoViaje: "Solo ida", clase: "Económica", pasajeros: 1,
    pasajerosDetalle: [pax("Ana María", "Torres Ruiz", "1712345678", "1988-04-12")],
    salida: "2026-06-28", estado: "Cerrada", ejecutiva: "Lucía Torres", ejecutivaId: "u4", mensajes: [],
    historial: [{ estado: "Enviada", fecha: "2026-06-05T10:00:00", por: "Participante" }, { estado: "Cerrada", fecha: "2026-06-10T12:00:00", por: "Lucía Torres" }],
  },
  {
    codigo: "COT-100311", fecha: "2026-05-11", origen: "GYE", destino: "MAD", tipoViaje: "Ida y vuelta", clase: "Primera clase", pasajeros: 2,
    pasajerosDetalle: [pax("Ana María", "Torres Ruiz", "1712345678", "1988-04-12"), pax("Jorge Luis", "Palacios Vera", "PA1234567", "1979-07-25", false, "pasaporte")],
    salida: "2026-07-01", regreso: "2026-07-20", estado: "Cotizada", ejecutiva: "Karla Núñez", ejecutivaId: "u3", monto: 6420, pdf: "cotizacion-COT-100311.pdf",
    mensajes: [{ de: "Ejecutiva", autor: "Karla Núñez", texto: "Te enviamos la cotización con tarifa flexible.", fecha: "2026-05-13T09:15:00", adjunto: "cotizacion-COT-100311.pdf" }],
    historial: [{ estado: "Enviada", fecha: "2026-05-11T14:00:00", por: "Participante" }, { estado: "En revisión", fecha: "2026-05-12T09:00:00", por: "Karla Núñez" }, { estado: "Cotizada", fecha: "2026-05-13T09:15:00", por: "Karla Núñez" }],
  },
];
export const labelCiudad = (codigo: string) => {
  const c = ciudades.find((x) => x.codigo === codigo);
  return c ? `${c.ciudad} (${c.codigo})` : codigo;
};

export const formatFecha = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
