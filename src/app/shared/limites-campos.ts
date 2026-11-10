import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { LIMITES, type ClaveLimite } from "../core/limites";

/**
 * Límites de caracteres en todos los campos de texto, sin tener que tocar cada formulario. Un observador pone `maxlength` a los
 * campos que no traen uno (el que se escribe a mano en un campo siempre gana), eligiendo el límite de `core/limites` por lo que
 * dice su etiqueta ("Nombre", "Título", "Descripción"…), y muestra un contador "72/80" al acercarse al tope.
 * El servidor simulado vuelve a validar los mismos límites (ver `errorLargosFila`).
 */

/** Palabras de la etiqueta del campo → límite. El orden importa: gana la primera que coincide. */
const REGLAS: [RegExp, ClaveLimite][] = [
  [/contrase|clave|password/i, "texto"],
  [/subt[ií]tulo|lema|eslogan/i, "subtitulo"],
  [/t[ií]tulo|asunto/i, "titulo"],
  [/nombres?\s+y\s+apellidos|apellido|nombres?$|nombre completo/i, "persona"],
  [/etiqueta|insignia|chip/i, "etiqueta"],
  [/correo|e-?mail/i, "correo"],
  [/tel[eé]fono|celular|whatsapp/i, "telefono"],
  [/c[oó]digo|sku|documento|c[eé]dula|pasaporte/i, "codigo"],
  [/enlace|url|sitio web|p[aá]gina web|link|https?:/i, "url"],
  [/referencia/i, "referencia"],
  [/direcci[oó]n|calle/i, "direccion"],
  [/motivo|nota|comentario|observaci/i, "motivo"],
  [/alt\b|texto alternativo|breve|resumen/i, "breve"],
  [/descripci[oó]n|condiciones|t[eé]rminos|pasos|especificaci/i, "descripcion"],
  [/contenido|cuerpo|html|documento legal|texto del/i, "documento"],
  [/mensaje|respuesta|detalle|texto/i, "mensaje"],
  [/buscar|b[uú]squeda|search/i, "busqueda"],
  [/nombre|marca|categor[ií]a|comercio|rol\b|campa[ñn]a/i, "nombre"],
];

const TIPOS_CON_LIMITE = new Set(["", "text", "search", "email", "url", "tel"]);

@Injectable({ providedIn: "root" })
export class LimitesCampos {
  private readonly doc = inject(DOCUMENT);
  private iniciado = false;
  private contador: HTMLElement | null = null;

  iniciar() {
    if (this.iniciado || !this.doc.body) return;
    this.iniciado = true;
    this.revisar(this.doc.body);
    new MutationObserver((cambios) => {
      for (const c of cambios) c.addedNodes.forEach((n) => n instanceof HTMLElement && this.revisar(n));
    }).observe(this.doc.body, { childList: true, subtree: true });
    this.doc.addEventListener("focusin", (e) => this.mostrar(e.target));
    this.doc.addEventListener("input", (e) => this.mostrar(e.target));
    this.doc.addEventListener("focusout", () => this.ocultar());
  }

  /** Límite que corresponde a un campo según su etiqueta (o `undefined` si no lleva: contraseñas, números, fechas…). */
  limiteDe(el: HTMLInputElement | HTMLTextAreaElement): number | undefined {
    if (el instanceof HTMLInputElement && !TIPOS_CON_LIMITE.has(el.type)) return undefined;
    if (el.readOnly || el.disabled) return undefined;
    const etiqueta = [el.labels?.[0]?.textContent, el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.id, el.getAttribute("name")].filter(Boolean).join(" ");
    const esArea = el instanceof HTMLTextAreaElement;
    for (const [re, clave] of REGLAS) {
      if (!re.test(etiqueta)) continue;
      // Un área de texto (varias líneas) nunca queda más corta que un mensaje, salvo que su etiqueta indique un documento largo.
      return esArea && clave !== "documento" ? Math.max(LIMITES[clave], LIMITES.mensaje) : LIMITES[clave];
    }
    return esArea ? LIMITES.mensaje : LIMITES.texto;
  }

  private revisar(raiz: HTMLElement) {
    const campos = raiz.matches("input,textarea") ? [raiz, ...Array.from(raiz.querySelectorAll("input,textarea"))] : Array.from(raiz.querySelectorAll("input,textarea"));
    for (const c of campos as (HTMLInputElement | HTMLTextAreaElement)[]) {
      if (c.hasAttribute("maxlength") || c.dataset["limite"]) continue;
      const l = this.limiteDe(c);
      if (l === undefined) continue;
      c.setAttribute("maxlength", String(l));
      c.dataset["limite"] = String(l);
    }
  }

  private mostrar(t: EventTarget | null) {
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
    const max = Number(t.getAttribute("maxlength"));
    if (!max || max > 5000 || t.value.length < max * 0.7) return this.ocultar();
    const c = (this.contador ??= this.crear());
    c.textContent = `${t.value.length}/${max}`;
    c.dataset["lleno"] = t.value.length >= max ? "1" : "0";
    const r = t.getBoundingClientRect();
    c.style.top = `${Math.round(r.bottom + 2)}px`;
    c.style.left = `${Math.round(r.right - 56)}px`;
    c.hidden = false;
  }
  private ocultar() {
    if (this.contador) this.contador.hidden = true;
  }
  private crear(): HTMLElement {
    const c = this.doc.createElement("span");
    c.className = "contador-limite";
    c.setAttribute("aria-hidden", "true");
    c.hidden = true;
    this.doc.body.appendChild(c);
    return c;
  }
}
