import { Injectable, computed, inject, signal } from "@angular/core";
import { ApiService } from "./api.service";
import { BrandService } from "./brand.service";
import type {
  Beneficio, Categoria, CampoForm, ContenidoFaq, MenuItem, Nivel,
  SeccionHome, Slide,
} from "./models";

export type NivelesRespuesta = { niveles: Nivel[]; reglas: string[]; subtitulo: string; intro: string };
export type MarcaAliada = { nombre: string; logo: string; web: string; descripcion: string };

/** Textos de la pantalla de ingreso (admiten markdown en línea: **negrita**, [enlaces](https://…) y [texto](#terminos) / [texto](#privacidad) para abrir los textos legales). `{unidad}`, `{banco}` y `{programa}` se reemplazan por los de la marca. */
export type TextosIngreso = {
  tituloLateral: string;
  mensajeLateral: string;
  tituloFormulario: string;
  subtituloFormulario: string;
  placeholderDocumento: string;
  notaLegal: string;
  tituloCodigo: string;
};
export const TEXTOS_INGRESO: TextosIngreso = {
  tituloLateral: "Tu tarjeta vale más: disfruta beneficios, premios y descuentos exclusivos.",
  mensajeLateral: "Ingresa con tu documento y disfruta de las ventajas de ser cliente de {banco}.",
  tituloFormulario: "Ingresa a tu cuenta",
  subtituloFormulario: "Selecciona tu tipo de documento e ingresa tu número para continuar.",
  placeholderDocumento: "Ingresa tu número",
  notaLegal: "Al ingresar aceptas los [Términos y Condiciones](#terminos) y la [Política de Privacidad](#privacidad).",
  tituloCodigo: "Ingresa tu código",
};

/** Textos de las secciones de la portada. El título y la palabra destacada (en un recuadro de color) van por separado. */
export type TextosHome = {
  beneficiosTitulo: string; beneficiosResalte: string;
  nivelesTitulo: string; nivelesResalte: string;
  categoriasTitulo: string; categoriasResalte: string;
  ctaCatalogoTitulo: string; ctaCatalogoTexto: string; ctaCatalogoBoton: string;
  ctaContactoTitulo: string; ctaContactoTexto: string; ctaContactoBoton: string;
};
export const TEXTOS_HOME: TextosHome = {
  beneficiosTitulo: "Disfruta de grandiosos", beneficiosResalte: "beneficios",
  nivelesTitulo: "Beneficios destacados por", nivelesResalte: "nivel",
  categoriasTitulo: "Explora por", categoriasResalte: "categorías",
  ctaCatalogoTitulo: "Beneficios para ti", ctaCatalogoTexto: "Explora descuentos y experiencias exclusivas con tu tarjeta", ctaCatalogoBoton: "Ver beneficios",
  ctaContactoTitulo: "Contáctanos", ctaContactoTexto: "¿Tienes dudas o necesitas ayuda?", ctaContactoBoton: "Obtener ayuda",
};

/** Enlace del pie de página: `to` interno (/ruta) o externo (https://…). */
export type EnlacePie = { label: string; to: string };
export const PIE_INFORMACION: EnlacePie[] = [
  { label: "Preguntas frecuentes", to: "/preguntas-frecuentes" },
  { label: "Términos y condiciones", to: "/terminos" },
  { label: "Política de privacidad", to: "/privacidad" },
];
export const PIE_ATENCION: EnlacePie[] = [
  { label: "Reclamos y sugerencias", to: "/contacto" },
];
export type SitioConfig = {
  nombre: string;
  correoSoporte: string;
  telefonoPie: string;
  whatsapp: string;
  agenciasUrl: string;
  /** Ciudades con agencia que se listan en el pie (opcional). */
  ciudadesPie?: string;
  /** Texto del enlace a las agencias (opcional). */
  agenciasTexto?: string;
  /** Textos editables de la pantalla de ingreso (los que falten usan los de TEXTOS_INGRESO). */
  ingreso?: Partial<TextosIngreso>;
  /** Oculta la nota legal bajo el botón de ingreso. */
  ocultarNotaIngreso?: boolean;
  /** Textos de las secciones de la portada (los que falten usan los de TEXTOS_HOME). */
  textosHome?: Partial<TextosHome>;
  /** Enlaces del pie de página; si faltan se usan los de PIE_INFORMACION y PIE_ATENCION. */
  pie?: { informacion?: EnlacePie[]; atencion?: EnlacePie[] };
  redes: Record<string, string>;
};

export type ConfigApp = {
  sitio: SitioConfig;
  menu: MenuItem[];
  contenido: { faq: ContenidoFaq[]; /** Subtítulo de Preguntas frecuentes (opcional). */ faqIntro?: string; terminos: string; privacidad: string; /** Subtítulos de las páginas legales (opcionales). */ terminosIntro?: string; privacidadIntro?: string; /** Versión vigente de cada texto legal (para mostrarla en su página). */ legales?: Record<"terminos" | "privacidad", { version: number; vigenteDesde: string }> };
  cupon: { horas: number };
  formulario: CampoForm[];
  seccionesHome: SeccionHome[];
  contacto: { horario: string; telefonos: string; correo: string };
  tarjetas: { id: string; label: string }[];
  tiposDocumento: string[];
};

/**
 * Catálogo y configuración de solo lectura que publica el panel de administración
 * (productos, beneficios, categorías, banners, niveles, reglas, menú, textos…).
 * Todo se expone como signals y puede refrescarse con `refrescar()`.
 */
@Injectable({ providedIn: "root" })
export class CatalogService {
  private readonly api = inject(ApiService);
  /** Falló la carga del catálogo (red o servidor): las pantallas muestran el error con "Reintentar" en vez de "sin resultados". */
  readonly errorCarga = signal(false);
  private readonly falla = () => this.errorCarga.set(true);
  /** Vuelve a pedir el catálogo tras un error. */
  reintentar() {
    this.cargar();
  }
  private readonly brand = inject(BrandService);
  private ultimaCarga = 0;

  private readonly beneficiosRaw = signal<Beneficio[] | undefined>(undefined);
  readonly beneficios = computed(() => this.beneficiosRaw() ?? []);
  readonly cargado = computed(() => this.beneficiosRaw() !== undefined);

  readonly categoriasBeneficio = signal<Categoria[]>([]);
  /** Marcas aliadas con logo y sitio web (se administran en Admin → Marcas). */
  readonly marcasAliadas = signal<MarcaAliada[]>([]);
  marcaPorNombre(nombre: string) {
    return this.marcasAliadas().find((m) => m.nombre === nombre);
  }

  readonly bannersHome = signal<Slide[]>([]);
  readonly bannersBeneficios = signal<Slide[]>([]);

  private readonly nivelesRes = signal<NivelesRespuesta | undefined>(undefined);
  readonly niveles = computed(() => this.nivelesRes()?.niveles ?? []);
  /** Reemplaza {empresa}, {programa}, {unidad} y {meses} en los textos configurables del programa. */
  llenar(texto: string) {
    const m = this.brand.marca();
    return texto
      .replaceAll("{empresa}", m.nombre)
      .replaceAll("{programa}", m.programa)
      ;
  }
  readonly reglasNiveles = computed(() => (this.nivelesRes()?.reglas ?? []).map((r) => this.llenar(r)));
  /** Textos tal como se guardaron (con {empresa}, {meses}…), para editarlos en el panel. */
  readonly textosNiveles = computed(() => { const r = this.nivelesRes(); return r ? { subtitulo: r.subtitulo, intro: r.intro, reglas: r.reglas } : null; });
  readonly subtituloNiveles = computed(() => this.llenar(this.nivelesRes()?.subtitulo ?? ""));
  readonly introNiveles = computed(() => this.llenar(this.nivelesRes()?.intro ?? ""));
  recargarNiveles() {
    this.api.get<NivelesRespuesta>("niveles").subscribe({ next: (r) => this.nivelesRes.set(r), error: this.falla });
  }

  private readonly configRaw = signal<ConfigApp | undefined>(undefined);
  readonly config = this.configRaw.asReadonly();

  /** Textos de la portada: lo que el administrador dejó vacío usa el texto original. */
  readonly textosHome = computed<TextosHome>(() => {
    const g = this.configRaw()?.sitio?.textosHome ?? {};
    const out = { ...TEXTOS_HOME };
    for (const k of Object.keys(out) as (keyof TextosHome)[]) if (g[k]?.trim()) out[k] = g[k]!.trim();
    return out;
  });
  /** Menú principal: solo ítems activos; un grupo sin hijos activos se oculta. */
  readonly menu = computed(() =>
    (this.configRaw()?.menu ?? [])
      .filter((i) => i.activo)
      .map((i) => (i.children ? { ...i, children: i.children.filter((c) => c.activo) } : i))
      .filter((i) => !i.children || i.children.length > 0),
  );
  /** ¿La ruta está habilitada en el menú? (rutas que no están en el menú siempre lo están). */
  rutaHabilitada(ruta: string) {
    const items = this.configRaw()?.menu ?? [];
    for (const i of items) {
      if (i.to === ruta) return i.activo;
      const hijo = i.children?.find((c) => c.to === ruta);
      if (hijo) return i.activo && hijo.activo;
    }
    return true;
  }

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.errorCarga.set(false);
    this.api.get<Beneficio[]>("catalogo/beneficios").subscribe({ next: (r) => this.beneficiosRaw.set(r), error: this.falla });
    this.api.get<Categoria[]>("catalogo/categorias-beneficio").subscribe({ next: (r) => this.categoriasBeneficio.set(r), error: this.falla });
    this.api.get<MarcaAliada[]>("catalogo/marcas").subscribe({ next: (r) => this.marcasAliadas.set(r), error: this.falla });
    this.api.get<Slide[]>("catalogo/banners/home").subscribe({ next: (r) => this.bannersHome.set(r), error: this.falla });
    this.api.get<Slide[]>("catalogo/banners/beneficios").subscribe({ next: (r) => this.bannersBeneficios.set(r), error: this.falla });
    this.recargarNiveles();
    this.recargarConfig();
    this.ultimaCarga = Date.now();
  }

  /** Vuelve a pedir lo publicado (p. ej. al volver del panel de administración); no repite una carga recién hecha. */
  refrescar() {
    if (Date.now() - this.ultimaCarga > 1500) this.cargar();
  }

  /** Vuelve a pedir solo la configuración (tras guardarla desde el admin). */
  recargarConfig() {
    this.api.get<ConfigApp>("config").subscribe({ next: (c) => this.configRaw.set(c), error: this.falla });
  }

  beneficioPorId(id: string) {
    return this.beneficios().find((b) => b.id === id);
  }
}
