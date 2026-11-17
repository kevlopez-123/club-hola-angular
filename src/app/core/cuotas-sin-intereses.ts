/**
 * Cuotas sin intereses: comercios afiliados al programa de BanBif (https://www.banbif.com.pe/beneficios/cuotas-sin-intereses).
 * Datos estáticos de la web del participante: no se administran desde el panel.
 */

export type Modalidad = "online" | "tiendas";
export type Cuotas = 3 | 6 | 9 | 12 | 18 | 24;

export type ComercioCuotas = {
  nombre: string;
  modalidad: Modalidad;
  /** Máximo de cuotas sin intereses que ofrece el comercio. */
  cuotas: Cuotas;
  categorias: string[];
  logo: string;
  /** Página del comercio en banbif.com.pe. Si no se conoce el enlace exacto, se usa la página general del programa. */
  detalle: string;
};

export const CUOTAS_DISPONIBLES: Cuotas[] = [3, 6, 9, 12, 18, 24];
export const URL_PROGRAMA_CUOTAS = "https://www.banbif.com.pe/beneficios/cuotas-sin-intereses";
const BASE_COMERCIO = "https://www.banbif.com.pe/comercio/";
const BASE_IMAGEN = "https://content.banbif.com.pe/sites/default/files/";

export const CATEGORIAS_CUOTAS = ["Tecnología", "Hogar", "Viajes", "Ropa y accesorios", "Deportes", "Calzado", "Joyería", "Servicios", "Salud y belleza"];

/** Comercios cuyo enlace de detalle se verificó en banbif.com.pe (nombre → slug). */
const SLUGS_VERIFICADOS: Record<string, string> = {
  BanBifMall: "banbifmall", Ishop: "ishop", "Aldo & Co": "aldo-co", CREPIER: "crepier", Decameron: "decameron", Despegar: "despegar",
  Claro: "claro", Severin: "severin", "Lounge 59": "lounge-59", Vans: "vans", Ssenda: "ssenda", Petunia: "petunia",
  "Palo Santo Concept": "palo-santo-concept", Oltursa: "oltursa", "Oigo Salud": "oigo-salud", "LLANTAS WEB": "llantas-web",
  "Joyería Grimanti": "joyeria-grimanti", Homekit: "homekit", Depilzone: "depilzone", "Kitchen Factory": "kitchen-factory",
};

/** [nombre, modalidad (O = online, T = pago en tiendas), cuotas, categorías separadas por |, imagen] */
type Fila = [string, "O" | "T", Cuotas, string, string];
const FILAS: Fila[] = [
  ["BanBifMall", "O", 24, "Servicios", "2026-09/cuotas-comercio-banbifmall-desktop.png"],
  ["Ishop", "T", 24, "Tecnología", "2026-04/cuotas-comercios-ishop-desktop.png"],
  ["Aldo & Co", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-aldoandco-desktop.png"],
  ["CREPIER", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-crepier-desktop.png"],
  ["Decameron", "T", 6, "Viajes", "2026-04/cuotas-comercio-decameron-desktop.png"],
  ["Despegar", "T", 12, "Viajes", "2026-09/cuotas-comercio-despegar-desktop.png"],
  ["Claro", "T", 24, "Tecnología", "2026-09/cuotas-comercio-claro-desktop.png"],
  ["Severin", "T", 6, "Hogar", "2026-09/cuotas-comercio-severin-desktop.png"],
  ["Lounge 59", "T", 12, "Salud y belleza", "2026-09/cuotas-comercio-lounge59-desktop.png"],
  ["Grillcorp", "T", 18, "Hogar", "2026-09/cuotas-comercio-grillcorp-desktop.png"],
  ["Vans", "T", 6, "Deportes|Calzado", "2026-09/cuotas-comercio-vans-desktop.png"],
  ["Turifax", "T", 24, "Viajes", "2026-09/cuotas-comercio-turifax-desktop.png"],
  ["TripGuru World", "T", 24, "Viajes", "2026-09/cuotas-comercio-tripguru-world-desktop.png"],
  ["The friend of Pablo", "T", 6, "Salud y belleza", "2026-09/cuotas-comercio-the-friend-of-pablo-desktop.png"],
  ["Ssenda", "T", 24, "Servicios", "2026-09/cuotas-comercio-ssenda-desktop.png"],
  ["Smart Locks Perú", "T", 24, "Hogar", "2026-09/cuotas-comercio-smart-locks-peru-desktop.png"],
  ["Petunia", "T", 3, "Joyería", "2026-09/cuotas-comercio-petunia-desktop.png"],
  ["Palo Santo Concept", "T", 6, "Deportes", "2026-09/cuotas-comercio-palo-santo-desktop.png"],
  ["Oltursa", "T", 3, "Viajes", "2026-09/cuotas-comercio-oltursa-desktop.png"],
  ["Oigo Salud", "T", 12, "Salud y belleza", "2026-09/cuotas-comercio-oigo-salud-desktop.png"],
  ["LLANTAS WEB", "T", 6, "Servicios", "2026-09/cuotas-comercio-llantas-web-desktop.png"],
  ["Joyería Murguía", "T", 9, "Joyería", "2026-09/cuotas-comercio-joyeria-murguia-desktop.png"],
  ["Joyería Grimanti", "T", 3, "Joyería", "2026-09/cuotas-comercio-grimanti-desktop.png"],
  ["HOSEG", "T", 9, "Ropa y accesorios", "2026-09/cuotas-comercio-hoseg-desktop.png"],
  ["Homekit", "T", 12, "Hogar", "2026-09/cuotas-comercio-homekit-desktop.png"],
  ["Florsheim", "T", 6, "Deportes|Calzado", "2026-09/cuotas-comercio-florsheim-desktop.png"],
  ["El Baúl de la Novia", "T", 12, "Ropa y accesorios", "2026-09/cuotas-comercio-el-baul-de-la-novia-desktop.png"],
  ["Domiruth", "T", 12, "Viajes", "2026-09/cuotas-comercio-domiruth-desktop.png"],
  ["Dolce Vita", "T", 3, "Ropa y accesorios", "2026-09/cuotas-comercio-dolce-vita-desktop.png"],
  ["Depilzone", "T", 12, "Salud y belleza", "2026-09/cuotas-comercio-depilzone-desktop.png"],
  ["Daniel Motos", "T", 3, "Servicios", "2026-09/cuotas-comercio-daniel-motos-desktop.png"],
  ["COLINEAL", "T", 6, "Hogar", "2026-09/cuotas-comercio-colineal-desktop.png"],
  ["CLUTCH", "T", 3, "Ropa y accesorios", "2026-09/cuotas-comercio-clutch-desktop.png"],
  ["Clínica Virtual Dent", "T", 12, "Salud y belleza", "2026-09/cuotas-comercio-virtual-dent-desktop.png"],
  ["Clínica dental alemana", "T", 24, "Salud y belleza", "2026-09/cuotas-comercio-clinica-dental-alemana-desktop.png"],
  ["Body Skin Wellness Center", "T", 6, "Salud y belleza", "2026-09/cuotas-comercio-body-skin-wellness-center-desktop.png"],
  ["Equipak", "T", 6, "Deportes", "2026-04/cuotas-comercios-equipak-desktop.png"],
  ["Decomuebles", "T", 12, "Hogar", "2026-04/cuotas-comercios-decomuebles-desktop.png"],
  ["Nuevo Mundo Viajes", "T", 12, "Viajes", "2026-04/cuotas-comercios-nuevo-mundo-viajes-desktop.png"],
  ["Limalinen", "T", 3, "Hogar", "2026-04/cuotas-comercios-limalinen-desktop_0.png"],
  ["Kitchen Factory", "T", 3, "Hogar", "2026-04/cuotas-comercios-kitchen-factory-desktop_1.png"],
  ["CARATI", "T", 18, "Joyería", "2026-04/cuotas-comercios-carati-desktop.png"],
  ["Steve Madden", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-stevemadden-desktop.png"],
  ["NEW ATHLETIC", "T", 3, "Deportes", "2026-04/cuotas-comercios-newathletic-desktop.png"],
  ["PRAIA BRAVA", "T", 9, "Ropa y accesorios", "2026-04/cuotas-comercios-praia-brava-desktop_0.png"],
  ["Bipolar", "T", 9, "Ropa y accesorios", "2026-09/cuotas-comercio-bipolar-desktop.png"],
  ["Be smart", "T", 6, "Tecnología", "2026-04/cuotas-comercio-besmart-desktop.png"],
  ["Aclla Joyería", "T", 6, "Joyería", "2026-04/cuotas-comercios-aclla-joyeria-desktop.png"],
  ["Ecru", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercio-ecru-desktop_0.png"],
  ["UMBRO", "T", 3, "Deportes", "2026-04/cuotas-comercios-umbro-desktop_1.png"],
  ["NEW BALANCE", "T", 3, "Deportes", "2026-04/cuotas-comercios-nb-desktop.png"],
  ["MERREL", "T", 3, "Deportes", "2026-04/cuotas-comercio-merrell-desktop.png"],
  ["CONVERSE", "T", 3, "Deportes|Calzado", "2026-04/cuotas-comercios-converse-desktop.png"],
  ["COLISEUM", "T", 3, "Ropa y accesorios", "2026-04/cuotas-comercio-coliseum-desktop.png"],
  ["CAT", "T", 3, "Ropa y accesorios", "2026-04/cuotas-comercios-cat-desktop.png"],
  ["Kulhaus", "T", 12, "Hogar", "2026-04/cuotas-comercio-kulhaus-desktop.png"],
  ["Joyas Aremar", "T", 12, "Joyería", "2026-04/cuotas-comercios-aremar-desktop.png"],
  ["Bohoo", "T", 9, "Joyería", "2026-09/cuotas-comercio-bohoo-desktop.png"],
  ["Claudia Navarro", "T", 6, "Joyería", "2026-09/cuotas-comercio-claudia-navarro-desktop.png"],
  ["MILENIAL THE LABEL", "T", 3, "Deportes|Calzado", "2026-04/cuotas-comercio-milenial-desktop.png"],
  ["HOFF", "T", 12, "Deportes|Calzado", "2026-04/cuotas-comercios-hoff-desktop.png"],
  ["EL GANSO", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercio-el-ganso-desktop.png"],
  ["Bibi", "T", 9, "Deportes|Calzado", "2026-04/cuotas-comercio-bibi-desktop.png"],
  ["BIBO", "T", 6, "Salud y belleza", "2026-09/cuotas-comercios-bibomedicina-desktop.png"],
  ["VOLCOM", "T", 3, "Ropa y accesorios", "2026-04/cuotas-comercios-volcom-desktop_0.png"],
  ["OAKLEY", "T", 6, "Deportes", "2026-04/cuotas-comercios-oakley-desktop_1.png"],
  ["BIG HEAD", "T", 9, "Ropa y accesorios", "2026-09/cuotas-comercio-bighead-desktop.png"],
  ["RKF", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercio-rkf-desktop.png"],
  ["PATAGONIA", "T", 24, "Deportes", "2026-04/cuotas-comercio-patagonia-desktop.png"],
  ["HUSH PUPPIES", "T", 12, "Deportes|Calzado", "2026-04/cuotas-comercios-hushpuppies-desktop.png"],
  ["COLUMBIA", "T", 3, "Deportes", "2026-04/cuotas-comercios-columbia-desktop.png"],
  ["Bsoul", "T", 9, "Ropa y accesorios", "2026-04/cuotas-comercio-bsoul-desktop.png"],
  ["Now", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-now-desktop.png"],
  ["MONARK", "T", 6, "Deportes", "2026-04/cuotas-comercios-monark-desktop.png"],
  ["MOIXX", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-moixx-desktop.png"],
  ["La Matier", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-la-matier-desktop_0.png"],
  ["Joyería Diamanti", "T", 9, "Joyería", "2026-04/cuotas-comercios-diamanti-desktop.png"],
  ["Hemenster", "T", 12, "Joyería", "2026-04/cuotas-comercios-hemenster-desktop.png"],
  ["Fito Espinoza Galería de Arte", "T", 6, "Hogar", "2026-04/cuotas-comercio-fito-desktop_0.png"],
  ["Eyes Illusion", "T", 3, "Salud y belleza", "2026-04/cuotas-comercios-eyesillusion-desktop.png"],
  ["Elio Moore", "T", 6, "Ropa y accesorios", "2026-04/cuotas-comercios-%20elio-moore-desktop.png"],
  ["COSTAMAR", "T", 3, "Viajes", "2026-04/cuotas-comercios-costamar-desktop_1.png"],
  ["AMPHORA", "T", 3, "Ropa y accesorios", "2026-04/cuotas-comercios-amphora-desktop.png"],
  ["A&M Viajes", "T", 18, "Viajes", "2026-04/cuotas-comercios-aym-desktop.png"],
  ["Parfois", "T", 24, "Ropa y accesorios", "2026-04/cuotas-comercio-parfois-desktop_0.png"],
  ["NANDA SKIN & BEAUTY", "T", 12, "Salud y belleza", "2026-04/cuotas-comercios-nanda-desktop.png"],
  ["Bruno Ferrini", "T", 6, "Deportes|Calzado", "2026-04/cuotas-comercios-brunoferrini-desktop.png"],
  ["ILARIA PERÚ", "T", 6, "Joyería", "2026-04/cuotas-comercios-ilaria-desktop.png"],
  ["MOTOFACIL.PE", "T", 12, "Servicios", "2026-04/cuotas-comercios-motofacil-desktop.png"],
  ["Kitchen Studio", "T", 6, "Hogar", "2026-04/cuotas-comercios-kitchen-studio-desktop.png"],
  ["Viajes El Corte Inglés", "T", 24, "Viajes", "2026-04/cuotas-comercios-viajes-el-corte-ingles-desktop_0.png"],
  ["itouch", "T", 6, "Tecnología", "2026-04/cuotas-comercios-itouch-desktop.png"],
];

export const COMERCIOS_CUOTAS: ComercioCuotas[] = FILAS.map(([nombre, m, cuotas, cats, img]) => ({
  nombre,
  modalidad: m === "O" ? "online" : "tiendas",
  cuotas,
  categorias: cats.split("|"),
  logo: BASE_IMAGEN + img,
  detalle: SLUGS_VERIFICADOS[nombre] ? BASE_COMERCIO + SLUGS_VERIFICADOS[nombre] : URL_PROGRAMA_CUOTAS,
}));

export const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type FiltroCuotas = { texto: string; categoria: string; cuotas: Cuotas | 0; modalidad: Modalidad | "" };

/** Aplica los filtros del módulo. «cuotas» es el mínimo que ofrece el comercio; 0 = todas. */
export function filtrarComercios(lista: ComercioCuotas[], f: FiltroCuotas): ComercioCuotas[] {
  const q = sinTildes(f.texto.trim());
  return lista.filter(
    (c) =>
      (!q || sinTildes(c.nombre).includes(q)) &&
      (!f.categoria || c.categorias.includes(f.categoria)) &&
      (!f.cuotas || c.cuotas === f.cuotas) &&
      (!f.modalidad || c.modalidad === f.modalidad),
  );
}

/** El enlace al detalle es exacto (página del comercio) o el general del programa. */
export const tieneDetalleExacto = (c: ComercioCuotas) => c.detalle.startsWith(BASE_COMERCIO);

export const TEXTO_CONDICIONES = [
  "Válido en compras con tarjetas de crédito BanBif (titulares y adicionales) en los comercios afiliados.",
  "Monto mínimo de compra: S/ 100 o US$ 100 (S/ 50 en BanBifMall).",
  "El número de cuotas, la modalidad (online o pago en tiendas) y la vigencia dependen de cada comercio.",
  "El beneficio aplica solo en los locales afiliados al programa y con el procesador de pagos indicado por el comercio.",
  "Revisa los términos y condiciones de cada comercio en BanBif antes de comprar.",
];
