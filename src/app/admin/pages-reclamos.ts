import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { guardarArchivo } from "../core/descargas";
import { DIAS_HABILES_RESPUESTA, diasParaVencer, ESTADOS_RECLAMO, hojaReclamacion, type EstadoReclamo, type Reclamacion } from "../core/reclamaciones";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import {
  AdminModalComponent, BtnDirective, FieldComponent, FilaEsqueletoComponent, INPUT_CLS, OrdenColumnaComponent, PageHeaderComponent, PagerComponent, Paginado, PillComponent, ToastService,
} from "./kit";

type Reclamo = Reclamacion & {
  id: string;
  numero: string;
  fecha: string;
  fechaISO: string;
  estado: EstadoReclamo;
  vence: string;
  respuesta?: string;
  fechaRespuesta?: string;
};

const PROVEEDOR = "Motiva Soluciones S.A.C.";
const hoyIso = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Reclamos: las hojas del Libro de Reclamaciones                      */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-reclamos-page",
  imports: [OrdenColumnaComponent, FilaEsqueletoComponent, IconComponent, PageHeaderComponent, BtnDirective, PagerComponent, PillComponent, AdminModalComponent, FieldComponent, LimpiarFiltrosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Reclamos" [desc]="pag.total().toLocaleString('es') + ' hojas del Libro de Reclamaciones · se responde en ' + plazo + ' días hábiles'" />

    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar reclamo" [class]="input + ' pl-9'" placeholder="Buscar por número, nombre, documento o correo" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Estado" [class]="input + ' w-auto'" (change)="pag.filtrar('estado', $any($event.target).value)">
        <option value="">Todos los estados</option>
        @for (e of estados; track e) { <option>{{ e }}</option> }
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th aOrden="numero" [pag]="pag" etiquetaOrden="Hoja">Hoja</th>
            <th aOrden="estado" [pag]="pag" etiquetaOrden="Estado">Estado</th>
            <th aOrden="tipo" [pag]="pag" etiquetaOrden="Tipo">Tipo</th>
            <th aOrden="fechaISO" [pag]="pag" etiquetaOrden="Fecha">Fecha</th>
            <th aOrden="vence" [pag]="pag" etiquetaOrden="Plazo">Plazo de respuesta</th>
            <th aria-label="Acciones"></th>
          </tr>
        </thead>
        <tbody>
          @for (r of pag.items(); track r.id) {
            <tr>
              <td>
                <button type="button" class="text-left font-bold hover:underline" (click)="abrir(r)">N.° {{ r.numero }} · {{ r.nombre }}</button>
                <p class="text-xs text-muted-foreground">{{ r.tipoDocumento }} {{ r.documento }} · {{ r.correo }}</p>
              </td>
              <td class="det-completo det-chip"><a-pill [tone]="tono(r.estado)">{{ r.estado }}</a-pill></td>
              <td>{{ r.tipo }}</td>
              <td>{{ r.fecha.split(',')[0] }}</td>
              <td [class]="vencido(r) ? 'font-semibold text-destructive' : ''">{{ plazoTexto(r) }}</td>
              <td class="whitespace-nowrap">
                <button aBtn variant="ghost" [attr.aria-label]="'Atender la hoja ' + r.numero" (click)="abrir(r)"><app-icon name="Eye" class="h-4 w-4" /> Atender</button>
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="6"></tr> } } @else { <tr><td colspan="6" class="adm-empty">No hay reclamos con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-modal [open]="!!sel()" [wide]="true" [title]="'Hoja N.° ' + (sel()?.numero ?? '')" (closed)="sel.set(null)">
      @if (sel(); as r) {
        <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt class="inline text-muted-foreground">Consumidor: </dt><dd class="inline font-medium">{{ r.nombre }}</dd></div>
          <div><dt class="inline text-muted-foreground">{{ r.tipoDocumento }}: </dt><dd class="inline font-medium">{{ r.documento }}</dd></div>
          <div><dt class="inline text-muted-foreground">Correo: </dt><dd class="inline font-medium break-all">{{ r.correo }}</dd></div>
          <div><dt class="inline text-muted-foreground">Teléfono: </dt><dd class="inline font-medium">{{ r.telefono }}</dd></div>
          <div class="sm:col-span-2"><dt class="inline text-muted-foreground">Domicilio: </dt><dd class="inline font-medium">{{ r.domicilio }}</dd></div>
          @if (r.menor) { <div class="sm:col-span-2"><dt class="inline text-muted-foreground">Menor de edad · representante: </dt><dd class="inline font-medium">{{ r.representante }}</dd></div> }
          <div><dt class="inline text-muted-foreground">{{ r.tipo }} sobre: </dt><dd class="inline font-medium">{{ r.bien }}</dd></div>
          <div><dt class="inline text-muted-foreground">Monto reclamado: </dt><dd class="inline font-medium">{{ r.monto ? 'S/ ' + r.monto : 'No indicado' }}</dd></div>
        </dl>
        <h3 class="mb-1 mt-4 text-sm font-bold">Bien o servicio</h3>
        <p class="whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm">{{ r.descripcion }}</p>
        <h3 class="mb-1 mt-4 text-sm font-bold">Detalle</h3>
        <p class="whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm">{{ r.detalle }}</p>
        <h3 class="mb-1 mt-4 text-sm font-bold">Pedido del consumidor</h3>
        <p class="whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm">{{ r.pedido }}</p>

        <div class="mt-5 space-y-4 rounded-2xl border border-border p-4">
          <h3 class="text-sm font-bold">Atención del proveedor</h3>
          <a-field label="Estado">
            <select [class]="input" (change)="setSel({ estado: $any($event.target).value })">
              @for (e of estados; track e) { <option [selected]="e === r.estado">{{ e }}</option> }
            </select>
          </a-field>
          <a-field label="Respuesta al consumidor">
            <textarea [class]="input + ' h-28 py-2'" maxlength="2000" [value]="r.respuesta ?? ''" (input)="setSel({ respuesta: $any($event.target).value })"></textarea>
          </a-field>
          @if (error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ error() }}</p> }
        </div>
        <div class="det-pie">
          <button aBtn variant="outline" (click)="descargar(r)"><app-icon name="Download" class="h-4 w-4" /> Constancia</button>
          <button aBtn variant="outline" (click)="sel.set(null)">Cancelar</button>
          <button aBtn (click)="guardar()">Guardar</button>
        </div>
      }
    </a-modal>
  `,
})
export class ReclamosAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly estados = ESTADOS_RECLAMO;
  protected readonly plazo = DIAS_HABILES_RESPUESTA;
  protected readonly pag = new Paginado<Reclamo>(inject(ApiService), "reclamaciones");
  protected readonly sel = signal<Reclamo | null>(null);
  protected readonly error = signal("");
  private readonly original = computed(() => this.sel());

  constructor() {
    this.pag.recargar();
  }

  protected tono(e: EstadoReclamo) {
    return e === "Resuelto" ? ("ok" as const) : e === "En atención" ? ("info" as const) : ("warn" as const);
  }
  protected vencido(r: Reclamo) {
    return r.estado !== "Resuelto" && diasParaVencer(r.vence, hoyIso()) < 0;
  }
  protected plazoTexto(r: Reclamo) {
    if (r.estado === "Resuelto") return `Respondido${r.fechaRespuesta ? ' el ' + r.fechaRespuesta.split('-').reverse().join('/') : ''}`;
    const d = diasParaVencer(r.vence, hoyIso());
    return d < 0 ? `Vencido hace ${-d} ${-d === 1 ? 'día' : 'días'}` : d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  protected abrir(r: Reclamo) {
    this.error.set("");
    this.sel.set({ ...r });
  }
  protected setSel(p: Partial<Reclamo>) {
    const s = this.original();
    if (s) this.sel.set({ ...s, ...p });
  }
  protected guardar() {
    const r = this.sel();
    if (!r) return;
    if (r.estado === "Resuelto" && !(r.respuesta ?? "").trim()) { this.error.set("Escribe la respuesta al consumidor para marcarlo como resuelto."); return; }
    this.error.set("");
    const entidad: Reclamo = { ...r, ...(r.estado === "Resuelto" ? { fechaRespuesta: r.fechaRespuesta ?? hoyIso() } : {}) };
    this.api.put(`admin/c/reclamaciones/${r.id}`, entidad).subscribe({
      next: () => { this.sel.set(null); this.pag.recargar(); this.toast.show("Reclamo actualizado"); },
      error: (e) => this.error.set(e?.error?.message ?? "No se pudo guardar."),
    });
  }
  protected descargar(r: Reclamo) {
    guardarArchivo(new Blob([hojaReclamacion(r, r.numero, r.fecha, PROVEEDOR)], { type: "text/plain;charset=utf-8" }), `hoja-reclamacion-${r.numero}.txt`);
  }
}
