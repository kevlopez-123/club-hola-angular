import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

/**
 * Bandera de un país (SVG 4:3 de la librería open source flag-icons, MIT, copiadas en `public/flags`).
 * Reemplaza a los emojis de bandera, que no se ven en Windows.
 */
@Component({
  selector: "app-flag",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "inline-block shrink-0 align-middle" },
  template: `<img [src]="src()" [alt]="nombre() || codigo()" [attr.width]="ancho()" [attr.height]="alto()" class="rounded-[3px] border border-black/10 object-cover" style="height:auto" loading="lazy" />`,
})
export class FlagComponent {
  /** Código ISO 3166-1 alfa-2 (EC, PE…). */
  readonly codigo = input.required<string>();
  readonly nombre = input("");
  /** Ancho en px (el alto mantiene la proporción 4:3). */
  readonly ancho = input(20);
  protected readonly alto = computed(() => Math.round((this.ancho() * 3) / 4));
  protected readonly src = computed(() => `flags/${this.codigo().toLowerCase()}.svg`);
}
