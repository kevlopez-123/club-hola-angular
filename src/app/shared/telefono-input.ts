import { ChangeDetectionStrategy, Component, computed, inject, input, output } from "@angular/core";
import { BrandService } from "../core/brand.service";
import { digitosTelefono } from "../core/validaciones";
import { FlagComponent } from "./flag.component";

/**
 * Campo de teléfono con la bandera y el prefijo del país (Ecuador por defecto), igual que en el formulario de contacto:
 * solo se escriben los dígitos del número. El valor que entrega incluye el prefijo ("+593 996543210"); acepta valores guardados
 * con prefijo, con 0 inicial o con espacios y los muestra normalizados.
 */
@Component({
  selector: "app-telefono-input",
  imports: [FlagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="caja()">
      <span [class]="'flex items-center gap-2 text-ink ' + (variante() === 'sitio' ? 'text-base' : 'text-sm')"><app-flag [codigo]="brand.pais().codigo" [nombre]="brand.pais().nombre" [ancho]="24" />{{ brand.pais().telefonoPrefijo }}</span>
      <input [id]="inputId()" type="tel" inputmode="tel" autocomplete="tel-national" [attr.maxlength]="brand.pais().telefonoDigitos"
        [value]="digitos()" (input)="escribir($event)" (blur)="tocado.emit()" [attr.aria-invalid]="invalido()" [attr.aria-describedby]="describe() || null"
        placeholder="99 654 3210" [class]="'h-full min-w-0 flex-1 bg-transparent text-ink outline-none ' + (variante() === 'sitio' ? 'text-base' : 'text-sm')" />
    </div>
  `,
})
export class TelefonoInputComponent {
  protected readonly brand = inject(BrandService);
  readonly valor = input("");
  readonly inputId = input.required<string>();
  readonly invalido = input(false);
  /** Mismo alto y estilo que los demás campos del formulario: "sitio" (Mis datos, alto 48 px), "compacto" (checkout) o "panel" (administración). */
  readonly variante = input<"sitio" | "compacto" | "panel">("sitio");
  protected readonly caja = computed(() => {
    const base = "flex items-center gap-3 border px-4 focus-within:ring-2 focus-within:ring-primary/50 ";
    const forma = { sitio: "h-12 rounded-2xl bg-surface", compacto: "h-[2.75rem] rounded-xl bg-card", panel: "h-11 rounded-xl bg-background" }[this.variante()];
    return base + forma + " " + (this.invalido() ? "border-destructive ring-2 ring-destructive/70" : this.variante() === "panel" ? "border-input" : "border-border");
  });
  readonly describe = input("");
  readonly valorChange = output<string>();
  readonly tocado = output<void>();

  /** Dígitos del número nacional (sin prefijo ni 0 inicial). */
  protected readonly digitos = computed(() => digitosTelefono(this.valor(), this.brand.pais().telefonoPrefijo, this.brand.pais().telefonoDigitos));

  protected escribir(e: Event) {
    const el = e.target as HTMLInputElement;
    const d = el.value.replace(/\D/g, "").slice(0, this.brand.pais().telefonoDigitos);
    if (el.value !== d) el.value = d;
    this.valorChange.emit(d ? `${this.brand.pais().telefonoPrefijo} ${d}` : "");
  }
}
