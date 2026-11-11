import { beneficiosClubHola, categoriasBeneficioClubHola, slidesBeneficiosClubHola, slidesClubHola } from "./clubhola";


export const user = {
  nombre: "Ana",
  nivel: "Oro",
  carrito: 2,
};

export type NavItem = {
  label: string;
  to?: string;
  children?: { label: string; to?: string }[];
};

export const navItems: NavItem[] = [
  { label: "Inicio", to: "/" },
  {
    label: "Beneficios",
    children: [
      { label: "Catálogo de beneficios", to: "/beneficios" },
      { label: "Mis beneficios", to: "/mis-beneficios" },
    ],
  },
  { label: "Mi nivel", to: "/mi-nivel" },
  { label: "Mis compras", to: "/mis-compras" },
  { label: "Spin & Win", to: "/spin-win" },
  { label: "Lucky Code", to: "/lucky-code" },
  { label: "Contáctanos", to: "/contacto" },
];

/** Banner full-width: solo imagen (y un link opcional). */
export type Slide = {
  id: string;
  imagen: string;
  /** Versión para pantallas pequeñas (opcional). */
  imagenMovil?: string | undefined;
  alt: string;
  to?: string;
  /** Marca, título, descuento y botón del banner (si faltan, es solo una imagen). */
  marca?: string | undefined;
  titulo?: string | undefined;
  descuento?: string | undefined;
  cta?: string | undefined;
};

export const slides: Slide[] = slidesClubHola;

export const slidesBeneficios: Slide[] = slidesBeneficiosClubHola;

export const categoriasBeneficio = categoriasBeneficioClubHola;

export type Beneficio = {
  id: string;
  marca: string;
  marcaUrl: string;
  nombre: string;
  descuento: string;
  categoria: string;
  categoriaSlug: string;
  imagen: string;
  galeria: string[];
  descripcion: string;
  pasos: string[];
  especificaciones: string[];
  terminos: string;
  /** "cupon" = canje con cupón QR; "compra" = se agrega al carrito y se paga */
  tipo: "cupon" | "compra" | "informativo";
  /** Código de descuento para usar en la web o app de la marca (beneficios informativos). */
  codigoDescuento?: string | undefined;
  /** Cupón comprado con tarjeta: se envía en PDF al correo. Indica dónde se usa. */
  cuponPdf?: "local" | "web" | "ambos" | undefined;
  /** Nivel mínimo para acceder (Clásico, Plata, Oro o Diamante). Sin valor = todos los niveles. */
  nivelMinimo?: string | undefined;
  /** Cupón gratuito que solo muestra un código alfanumérico (sin QR). */
  cuponSinQr?: boolean | undefined;
  precio?: number | undefined;
  /** Promoción (se calcula en el servidor): valores originales, insignia y etiqueta propia opcional. */
  precioOriginal?: number | undefined;
  promoEtiqueta?: string | undefined;
  etiqueta?: string | undefined;
  etiquetaColor?: string | undefined;
  /** Vigencia (AAAA-MM-DD, inclusive). Sin fecha = sin límite por ese lado. */
  desde?: string | undefined;
  hasta?: string | undefined;
  /** Regla propia del cupón; lo que falte parte de 3 h, sin límite y 3 meses. */
  cupon?: { horas?: number | undefined; limite?: number | undefined; meses?: number | undefined } | undefined;
  /** "unico" (por defecto): códigos del comercio, uno por participante. "compartido": un mismo código para todos. */
  modoCodigo?: "unico" | "compartido" | undefined;
  codigoCompartido?: string | undefined;
  /** Máximo de usos del código compartido (0 o vacío = sin máximo) y cuántos van. */
  usosMaximos?: number | undefined;
  usos?: number | undefined;
  /** Provincias donde está disponible. Vacío = todo el país. */
  provincias?: string[] | undefined;
  /** Solo en lo que ve el participante: estado según las fechas y regla efectiva del cupón. */
  vigencia?: "programado" | "vigente" | "vencido" | undefined;
  reglaCupon?: { horas: number; limite: number; meses: number } | undefined;
};

export const beneficios: Beneficio[] = beneficiosClubHola;

export type Direccion = {
  id: string;
  alias: string;
  recibe: string;
  telefono: string;
  direccion: string;
  distrito: string;
  /** Provincia (de la lista oficial del país) a la que se envía. */
  provincia?: string;
  /** Punto elegido en el mapa (opcional). */
  lat?: number;
  lng?: number;
};

export const direccionesIniciales: Direccion[] = [
  {
    id: "d1",
    alias: "Casa",
    recibe: "Ana Torres",
    telefono: "987 654 321",
    direccion: "Av. Manuel Villarán 702, Dpto. 501",
    distrito: "Surquillo, Lima",
  },
  {
    id: "d2",
    alias: "Obra",
    recibe: "Ana Torres",
    telefono: "987 654 321",
    direccion: "Av. Larco 1301, Piso 8",
    distrito: "Miraflores, Lima",
  },
];

export const correosIniciales = ["ana.torres@dominio.com", "atorres@empresa.com.pe"];

export const formatUSD = (n: number) =>
  `$${n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Beneficios exclusivos: los que se compran (se pagan con tarjeta) */
export const beneficiosExclusivos = beneficios.filter((x) => x.tipo === "compra");
