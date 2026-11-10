import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { Meta } from "@angular/platform-browser";
import { BrandService } from "./brand.service";


/** El sitio está cerrado (hay que iniciar sesión): lo único indexable son los textos legales. */
export const RUTAS_INDEXABLES = ["/terminos", "/privacidad"];

export const esRutaPrivada = (url: string) => {
  const p = url.split(/[?#]/)[0]!.replace(/\/$/, "") || "/";
  return !RUTAS_INDEXABLES.some((r) => p === r || p.startsWith(r + "/"));
};

/** Descripción por página pública. `{programa}` y `{banco}` se reemplazan por la marca. */
export const DESCRIPCIONES: Record<string, string> = {
  "/terminos": "Términos y condiciones de uso de {programa}.",
  "/privacidad": "Política de privacidad y tratamiento de datos personales de {programa}.",
};

export type DatosSeo = {
  titulo?: string;
  descripcion?: string;
  imagen?: string;
  noindex?: boolean;
  /** Tipo Open Graph: "website" (por defecto) o "product". */
  tipo?: string;
  /** Datos estructurados (JSON-LD) de la página. */
  jsonLd?: object | null;
};

/**
 * SEO de una aplicación de una sola página: meta description, URL canónica, Open Graph / Twitter, robots y JSON-LD.
 * Lo aplica `BrandTitleStrategy` en cada navegación y las fichas (producto, beneficio, destino) lo afinan con sus datos.
 * Nota: los rastreadores que no ejecutan JavaScript (vistas previas de redes sociales) necesitan SSR/prerender para verlo.
 */
@Injectable({ providedIn: "root" })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly brand = inject(BrandService);

  private llenar(t: string) {
    return t.replaceAll("{programa}", this.brand.programa()).replaceAll("{banco}", this.brand.marca().nombre);
  }
  private absoluta(url: string) {
    try {
      return new URL(url, this.doc.location.origin).href;
    } catch {
      return url;
    }
  }

  aplicar(url: string, titulo: string, extra: DatosSeo = {}) {
    const ruta = url.split(/[?#]/)[0]!.replace(/\/$/, "") || "/";
    const privada = extra.noindex ?? esRutaPrivada(url);
    const descripcion = this.llenar(extra.descripcion ?? DESCRIPCIONES[ruta] ?? "{programa}: beneficios y canje de puntos de {banco}.");
    const imagen = extra.imagen ? this.absoluta(extra.imagen) : this.absoluta(this.brand.marca().logoClaro || "");
    const canonica = this.doc.location.origin + (ruta === "/" ? "/" : ruta);

    this.meta.updateTag({ name: "description", content: descripcion });
    this.meta.updateTag({ name: "robots", content: privada ? "noindex, nofollow" : "index, follow" });
    this.meta.updateTag({ name: "theme-color", content: this.brand.tenant().tema.primario });
    this.meta.updateTag({ property: "og:site_name", content: this.brand.programa() });
    this.meta.updateTag({ property: "og:locale", content: "es_" + (this.brand.tenant().pais.codigo ?? "EC") });
    this.meta.updateTag({ property: "og:type", content: extra.tipo ?? "website" });
    this.meta.updateTag({ property: "og:title", content: titulo });
    this.meta.updateTag({ property: "og:description", content: descripcion });
    this.meta.updateTag({ property: "og:url", content: canonica });
    if (imagen) this.meta.updateTag({ property: "og:image", content: imagen });
    else this.meta.removeTag("property='og:image'");
    this.meta.updateTag({ name: "twitter:card", content: imagen ? "summary_large_image" : "summary" });
    this.meta.updateTag({ name: "twitter:title", content: titulo });
    this.meta.updateTag({ name: "twitter:description", content: descripcion });
    if (imagen) this.meta.updateTag({ name: "twitter:image", content: imagen });

    let link = this.doc.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (privada) link?.remove();
    else {
      if (!link) {
        link = this.doc.createElement("link");
        link.rel = "canonical";
        this.doc.head.appendChild(link);
      }
      link.href = canonica;
    }
    this.jsonLd(extra.jsonLd ?? null);
  }

  /** Afina el SEO de una ficha cuando ya se cargaron sus datos (producto, beneficio, destino). */
  detalle(datos: DatosSeo & { titulo: string }) {
    const url = this.doc.location.pathname;
    this.aplicar(url, this.llenar(datos.titulo), datos);
    this.doc.title = this.llenar(datos.titulo);
  }

  private jsonLd(obj: object | null) {
    const id = "seo-jsonld";
    const previo = this.doc.getElementById(id);
    if (!obj) {
      previo?.remove();
      return;
    }
    const s = previo ?? this.doc.createElement("script");
    s.id = id;
    s.setAttribute("type", "application/ld+json");
    // "<" escapado para que un dato no pueda cerrar la etiqueta <script>.
    s.textContent = JSON.stringify(obj).replace(/</g, "\\u003c");
    if (!previo) this.doc.head.appendChild(s);
  }
}