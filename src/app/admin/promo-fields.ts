import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { ETIQUETA_COLORES, type PromoCampos } from "../core/promo";
import { FieldComponent, INPUT_CLS } from "./kit";

/** Campos de promoción y etiqueta propia de un producto o beneficio (se reutilizan en ambos formularios). */
@Component({
  selector: "a-promo-fields",
  imports: [FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Bloque con la misma separación (1 rem) que el resto de campos del formulario.
  host: { class: "block space-y-4" },
  template: `
    @if (conPrecio()) {
      <fieldset class="min-w-0 rounded-xl border border-border p-4">
        <legend class="px-1 text-sm font-semibold">Promoción</legend>
        <p class="mb-3 text-xs text-muted-foreground">
          El participante ve el precio con descuento (en puntos y en dinero) y el original tachado, con una insignia "-20%". Sin fechas, la promoción
          queda activa hasta que la quites.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <a-field label="Tipo de descuento">
            <select [class]="input" (change)="cambiarTipo($any($event.target).value)">
              <option value="" [selected]="!valor().promoTipo">Sin promoción</option>
              <option value="porcentaje" [selected]="valor().promoTipo === 'porcentaje'">Porcentaje (%)</option>
              <option value="monto" [selected]="valor().promoTipo === 'monto'">Monto en US$</option>
            </select>
          </a-field>
          <a-field [label]="valor().promoTipo === 'monto' ? 'Descuento (US$)' : 'Descuento (%)'">
            <input [class]="input" type="number" min="0" [attr.max]="valor().promoTipo === 'porcentaje' ? 100 : null" step="any"
              [disabled]="!valor().promoTipo" [value]="valor().promoValor ?? ''" (input)="cambiarValor($any($event.target).value)" />
          </a-field>
          <a-field label="Desde (opcional)">
            <input type="date" [class]="input" [disabled]="!valor().promoTipo" [value]="valor().promoDesde ?? ''" (input)="cambio.emit({ promoDesde: $any($event.target).value })" />
          </a-field>
          <a-field label="Hasta (opcional)">
            <input type="date" [class]="input" [disabled]="!valor().promoTipo" [value]="valor().promoHasta ?? ''" (input)="cambio.emit({ promoHasta: $any($event.target).value })" />
          </a-field>
        </div>
        @if (valor().promoTipo === 'monto') {
          <p class="mt-2 text-xs text-muted-foreground">Se descuenta ese monto del precio en dinero y su equivalente en puntos, según las reglas de puntos.</p>
        }
      </fieldset>
    }
    <fieldset class="min-w-0 rounded-xl border border-border p-4">
      <legend class="px-1 text-sm font-semibold">Etiqueta propia</legend>
      <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <a-field label="Texto (opcional)">
          <input [class]="input" maxlength="20" placeholder="Ej. Nuevo, Oferta, Solo hoy" [value]="valor().etiqueta ?? ''" (input)="cambio.emit({ etiqueta: $any($event.target).value })" />
        </a-field>
        <a-field label="Color">
          <select [class]="input" (change)="cambio.emit({ etiquetaColor: $any($event.target).value })">
            @for (c of colores; track c.v) { <option [value]="c.v" [selected]="(valor().etiquetaColor || 'marca') === c.v">{{ c.l }}</option> }
          </select>
        </a-field>
      </div>
    </fieldset>
  `,
})
export class PromoFieldsComponent {
  readonly valor = input.required<PromoCampos & { etiqueta?: string | undefined; etiquetaColor?: string | undefined }>();
  /** false en beneficios sin costo (cupones): solo etiqueta propia. */
  readonly conPrecio = input(true);
  readonly cambio = output<Record<string, unknown>>();
  protected readonly input = INPUT_CLS;
  protected readonly colores = ETIQUETA_COLORES;

  protected cambiarTipo(tipo: string) {
    this.cambio.emit(tipo ? { promoTipo: tipo, promoValor: this.valor().promoValor ?? 10 } : { promoTipo: "", promoValor: undefined, promoDesde: "", promoHasta: "" });
  }
  protected cambiarValor(v: string) {
    const n = Math.max(0, Number(v) || 0);
    this.cambio.emit({ promoValor: this.valor().promoTipo === "porcentaje" ? Math.min(100, n) : n });
  }
}
