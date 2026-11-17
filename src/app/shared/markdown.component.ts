import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { mdAHtml, mdEnLinea } from "../core/markdown";

/** Muestra texto markdown (ver core/markdown.ts). Los clics en enlaces internos de ancla (#…) se emiten en `ancla`. */
@Component({
  selector: "app-markdown",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(click)": "clic($event)" },
  template: `<div [class]="'md ' + clase()" [innerHTML]="html()"></div>`,
})
export class MarkdownComponent {
  readonly texto = input("");
  /** Solo en línea (sin párrafos ni encabezados): para frases cortas como la nota legal. */
  readonly enLinea = input(false);
  readonly clase = input("");
  readonly ancla = output<string>();
  private readonly san = inject(DomSanitizer);
  /** core/markdown.ts escapa todo el texto y solo genera etiquetas conocidas; Angular recortaría el iframe y el video del contenido enriquecido. */
  protected readonly html = computed(() => this.san.bypassSecurityTrustHtml(this.enLinea() ? mdEnLinea(this.texto()) : mdAHtml(this.texto())));

  protected clic(e: Event) {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href") ?? "";
    if (a && href.startsWith("#")) {
      e.preventDefault();
      this.ancla.emit(href.slice(1));
    }
  }
}
