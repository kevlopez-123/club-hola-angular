import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from "@angular/core";
import { ApiService } from "../core/api.service";
import { AdminModalComponent, BtnDirective, FieldComponent, ImageUploadComponent, INPUT_CLS, ToastService, usarSucio } from "./kit";

export type MarcaRow = { id: string; nombre: string; logo: string; web: string; descripcion: string; activo: boolean };

export const marcaVacia = (): MarcaRow => ({ id: "", nombre: "", logo: "", web: "", descripcion: "", activo: true });
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const webOk = (w: string) => !w || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(w);

/**
 * Ventana para crear o editar una marca aliada (nombre, logo, sitio web y descripción). La usan la lista de Marcas y la ficha de
 * cada marca. Se abre cuando recibe una marca (con `id` vacío es una alta) y avisa con `guardada` o `cerrado`.
 */
@Component({
  selector: "a-marca-editor",
  imports: [AdminModalComponent, BtnDirective, FieldComponent, ImageUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-modal [open]="!!edit()" [sucio]="sucio()" [title]="edit()?.id ? 'Editar marca' : 'Nueva marca'" (closed)="cerrado.emit()">
      @if (edit(); as e) {
        <div class="space-y-4">
          <a-field label="Nombre de la marca">
            <input [class]="input" [value]="e.nombre" (input)="set({ nombre: $any($event.target).value })" />
          </a-field>
          <a-field label="Logo (cuadrado o apaisado, fondo claro)">
            <a-image-upload aspect="aspect-[3/1]" [value]="e.logo ? [e.logo] : []" (valueChange)="set({ logo: $event[0] ?? '' })" [minAncho]="400" [minAlto]="100" hint="PNG o SVG · mínimo 400 px de ancho" />
          </a-field>
          <a-field label="Sitio web">
            <input [class]="input" type="url" placeholder="https://www.marca.com" [value]="e.web" (input)="set({ web: $any($event.target).value })" />
          </a-field>
          @if (!webValida()) { <p class="text-sm text-destructive" role="alert">Escribe una dirección completa, por ejemplo https://www.marca.com</p> }
          <a-field label="Descripción (se muestra en el detalle de productos)">
            <textarea [class]="input + ' h-24 py-2'" [value]="e.descripcion" (input)="set({ descripcion: $any($event.target).value })"></textarea>
          </a-field>
          @if (duplicada()) { <p class="text-sm text-destructive" role="alert">Ya existe una marca con ese nombre.</p> }
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="cerrado.emit()">Cancelar</button>
            <button aBtn [disabled]="!e.nombre.trim() || !webValida() || duplicada()" (click)="guardar()">Guardar marca</button>
          </div>
        </div>
      }
    </a-modal>
  `,
})
export class MarcaEditorComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  /** Marca a editar (o una vacía para crear); null = cerrado. */
  readonly marca = input<MarcaRow | null>(null);
  readonly guardada = output<MarcaRow>();
  readonly cerrado = output<void>();

  protected readonly edit = signal<MarcaRow | null>(null);
  protected readonly sucio = usarSucio(() => this.edit());
  private readonly ocupada = signal("");
  protected readonly webValida = computed(() => webOk(this.edit()?.web.trim() ?? ""));
  protected readonly duplicada = computed(() => {
    const e = this.edit();
    return !!e && !!this.ocupada() && this.ocupada() === slug(e.nombre);
  });

  constructor() {
    // Cada vez que se abre con una marca, el formulario parte de una copia.
    effect(() => {
      const m = this.marca();
      untracked(() => {
        this.ocupada.set("");
        this.edit.set(m ? { ...m } : null);
      });
    });
  }

  protected set(p: Partial<MarcaRow>) {
    this.edit.update((e) => (e ? { ...e, ...p } : e));
    this.ocupada.set("");
  }

  protected guardar() {
    const e = this.edit();
    if (!e) return;
    const id = e.id || slug(e.nombre);
    const poner = () => {
      const marca = { ...e, id, nombre: e.nombre.trim(), web: e.web.trim() };
      this.api.put(`admin/c/marcas/${id}`, marca).subscribe(() => {
        this.toast.show("Marca guardada");
        this.guardada.emit(marca);
      });
    };
    if (e.id) return poner();
    // Alta: el servidor confirma que el nombre no exista.
    this.api.get<{ items: MarcaRow[] }>("admin/q/marcas", { q: e.nombre.trim(), size: 200 }).subscribe((r) => {
      if (r.items.some((x) => slug(x.nombre) === id)) this.ocupada.set(id);
      else poner();
    });
  }
}
