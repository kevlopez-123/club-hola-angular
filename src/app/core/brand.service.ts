import { DOCUMENT } from "@angular/common";
import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { ApiService } from "./api.service";
import { configurarFormato } from "./format";
import { normalizarTenant, presetPorId, TENANT_POR_DEFECTO } from "../tenants/presets";
import type { TenantConfig } from "../tenants/tenant.types";

/* ---- utilidades de color ---- */
const hexARgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "").padEnd(6, "0");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const rgbAHex = (c: number[]) => "#" + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
/** Mezcla `a` con `b`; `t` es la proporción de `b` (0–1). */
export const mezclar = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hexARgb(a);
  const [r2, g2, b2] = hexARgb(b);
  return rgbAHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
};
const luminancia = (hex: string) => {
  const [r, g, b] = hexARgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Color de texto legible (blanco o casi negro) sobre `fondo`. */
export const contraste = (fondo: string) => (luminancia(fondo) > 0.4 ? "#111827" : "#ffffff");

/**
 * Marca de la plataforma: lee el tenant de la API, lo aplica como variables CSS (colores, radio, fuente),
 * configura el formato de números/moneda y expone logos, nombres y datos del país a toda la app.
 */
@Injectable({ providedIn: "root" })
export class BrandService {
  private readonly api = inject(ApiService);
  private readonly doc = inject(DOCUMENT);

  readonly tenant = signal<TenantConfig>(presetPorId(TENANT_POR_DEFECTO));
  readonly marca = computed(() => this.tenant().marca);
  readonly pais = computed(() => this.tenant().pais);
  readonly imagenes = computed(() => this.tenant().imagenes);
  readonly programa = computed(() => this.tenant().marca.programa);
  /** Provincias (lista oficial del país) a las que el administrador activó el envío. */
  readonly provinciasEnvio = computed(() => this.tenant().pais.provincias.filter((p) => p.envio).map((p) => p.nombre));
  /** Provincia de la lista oficial que aparece mencionada en un texto de dirección ("Quito, Pichincha"). */
  provinciaEn(texto: string): string {
    const t = texto.toLowerCase();
    return this.tenant().pais.provincias.find((p) => t.includes(p.nombre.toLowerCase()))?.nombre ?? "";
  }
  /** ¿Esta dirección se puede enviar? Usa la provincia elegida o, en direcciones antiguas, la que mencione el texto. */
  envioPosible(d: { provincia?: string; distrito: string }): boolean {
    const p = d.provincia || this.provinciaEn(d.distrito);
    return !!p && this.provinciasEnvio().includes(p);
  }
  readonly unidad = computed(() => this.tenant().marca.unidadPuntos);
  readonly moneda = computed(() => this.tenant().pais.moneda);

  /** Estado de la fuente elegida: "cargando", "ok" o "error" (nombre que Google Fonts no tiene). */
  readonly fuenteEstado = signal<"cargando" | "ok" | "error">("ok");

  /**
   * Google Fonts rechaza el rango de pesos `100..900` en las fuentes que no son variables (p. ej. Poppins) y entonces
   * no se aplica nada. Se prueba esa URL, luego pesos sueltos y por último solo el peso regular.
   */
  private cargarFuente(link: HTMLLinkElement, url: string) {
    const intentos = [url, url.replace(/:wght@[^&]*/, ":wght@400;500;600;700"), url.replace(/:wght@[^&]*/, "")];
    const unicos = intentos.filter((u, i) => intentos.indexOf(u) === i);
    link.dataset["origen"] = url;
    this.fuenteEstado.set("cargando");
    let i = 0;
    link.onload = () => this.fuenteEstado.set("ok");
    link.onerror = () => {
      if (++i < unicos.length) link.href = unicos[i]!;
      else this.fuenteEstado.set("error");
    };
    link.href = unicos[0]!;
  }
  constructor() {
    effect(() => this.aplicar(this.tenant()));
  }

  /** Carga el tenant desde la API (se ejecuta al arrancar la app, antes del primer render). */
  async cargar() {
    try {
      this.tenant.set(normalizarTenant(await firstValueFrom(this.api.get<TenantConfig>("tenant"))));
    } catch {
      /* sin API: se usa el preset por defecto */
    }
  }

  /** Aplica una vista previa sin guardarla (usado por el editor del admin). */
  previsualizar(t: TenantConfig) {
    this.tenant.set(t);
  }

  private aplicar(t: TenantConfig) {
    const root = this.doc.documentElement;
    const set = (k: string, v: string) => root.style.setProperty(k, v);
    const { primario, texto, fondo, superficie, radio, fuente, fuenteUrl } = t.tema;
    const oscuro = (x: number) => mezclar(primario, "#000000", x);

    set("--primary", primario);
    set("--primary-foreground", t.tema.textoPrimario || "#ffffff");
    for (const k of ["--celeste", "--lima", "--brand-red", "--ring", "--chart-1", "--chart-2", "--sidebar-primary", "--sidebar-ring"]) set(k, primario);
    set("--gradient-header", primario);
    set("--secondary", mezclar(primario, "#ffffff", 0.9));
    set("--secondary-foreground", texto);
    set("--chart-3", oscuro(0.35));
    set("--shadow-card-hover", `0 18px 40px -16px ${primario}1a`);

    for (const k of ["--ink", "--foreground", "--card-foreground", "--popover-foreground", "--brand-dark", "--sidebar-foreground", "--sidebar-accent-foreground", "--chart-5"]) set(k, texto);
    set("--ink-strong", mezclar(texto, "#000000", 0.5));
    for (const k of ["--background", "--card", "--popover", "--sidebar"]) set(k, fondo);
    for (const k of ["--surface", "--muted", "--sidebar-accent"]) set(k, superficie);
    set("--muted-foreground", mezclar(texto, fondo, 0.35));
    for (const k of ["--border", "--input", "--sidebar-border"]) set(k, mezclar(texto, fondo, 0.84));
    set("--radius", `${radio}rem`);
    set("--fuente", `"${fuente}"`);

    // Fuente web
    let link = this.doc.getElementById("brand-font") as HTMLLinkElement | null;
    if (fuenteUrl) {
      if (!link) {
        link = this.doc.createElement("link");
        link.id = "brand-font";
        link.rel = "stylesheet";
        this.doc.head.appendChild(link);
      }
      if (link.dataset["origen"] !== fuenteUrl) this.cargarFuente(link, fuenteUrl);
    } else {
      link?.remove();
      this.fuenteEstado.set("ok");
    }

    // Favicon y formato regional
    let ico = this.doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!ico) {
      ico = this.doc.createElement("link");
      ico.rel = "icon";
      this.doc.head.appendChild(ico);
    }
    ico.removeAttribute("type"); // el navegador detecta el formato (ico, png, svg)
    ico.href = t.marca.favicon || "favicon.ico";
    root.lang = "es"; // la plataforma está solo en español
    configurarFormato({ locale: t.pais.locale, simbolo: t.pais.moneda.simbolo });
  }
}
