import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { TIPOS_PREMIO, normalizarCodigo, type CodigoPromo, type Giro, type Premio, type TipoPremio } from "../core/juegos";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import {
  AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, FilaEsqueletoComponent, INPUT_CLS, OrdenColumnaComponent,
  PageHeaderComponent, PagerComponent, PanelComponent, Paginado, PillComponent, ToastService, ToggleComponent,
} from "./kit";

const ROTULO_TIPO = Object.fromEntries(TIPOS_PREMIO.map((t) => [t.v, t.l])) as Record<TipoPremio, string>;

/* ------------------------------------------------------------------ */
/* Lista de premios (los de la ruleta y los de Lucky Code son distintos) */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-premios-lista",
  imports: [AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, IconComponent, PillComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-bold">{{ titulo() }}</h2>
        <p class="text-sm text-muted-foreground">{{ ayuda() }}</p>
      </div>
      <button aBtn (click)="edit.set(nuevo())"><app-icon name="Plus" class="h-4 w-4" /> Nuevo premio</button>
    </div>
    <div class="adm-wrap">
      <table class="adm-table adm-compacta">
        <thead><tr><th>Premio</th><th>Tipo</th><th>Activo</th><th aria-label="Acciones"></th></tr></thead>
        <tbody>
          @for (p of lista(); track p.id) {
            <tr>
              <td><b>{{ p.label }}</b><p class="text-xs text-muted-foreground">{{ p.detalle }}</p></td>
              <td class="det-chip"><a-pill [tone]="p.tipo === 'nada' ? 'muted' : 'ok'">{{ rotulo[p.tipo] }}</a-pill></td>
              <td><a-toggle label="Activo" [on]="p.activo" (onChange)="cambiar(p, $event)" /></td>
              <td>
                <div class="flex gap-1">
                  <button type="button" data-compact class="adm-accion adm-accion-icono" [attr.aria-label]="'Editar ' + p.label" (click)="edit.set({ ...p })"><app-icon name="Pencil" class="h-4 w-4" /></button>
                  <button type="button" data-compact class="adm-accion adm-accion-icono peligro" [attr.aria-label]="'Eliminar ' + p.label" (click)="borrar.set(p)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          } @empty { <tr><td colspan="4" class="adm-empty">No hay premios todavía</td></tr> }
        </tbody>
      </table>
    </div>

    <a-modal [open]="!!edit()" [title]="esNuevo() ? 'Nuevo premio' : 'Editar premio'" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <div class="space-y-4">
          <a-field label="Nombre del premio"><input [class]="input" maxlength="60" [value]="e.label" (input)="setE({ label: $any($event.target).value })" /></a-field>
          <a-field label="Tipo">
            <select [class]="input" (change)="setE({ tipo: $any($event.target).value })">
              @for (t of tipos(); track t.v) { <option [value]="t.v" [selected]="t.v === e.tipo">{{ t.l }}</option> }
            </select>
          </a-field>
          <a-field label="Mensaje que ve el participante"><textarea [class]="input + ' h-24 py-2'" maxlength="200" [value]="e.detalle" (input)="setE({ detalle: $any($event.target).value })"></textarea></a-field>
          <div class="flex items-center justify-between"><span class="text-sm font-medium">Activo</span><a-toggle label="Activo" [on]="e.activo" (onChange)="setE({ activo: $event })" /></div>
          @if (error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ error() }}</p> }
          <div class="det-pie"><button aBtn variant="outline" (click)="edit.set(null)">Cancelar</button><button aBtn (click)="guardar()">Guardar</button></div>
        </div>
      }
    </a-modal>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar este premio?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se quitará <b class="text-foreground">{{ borrar()?.label }}</b>.@if (!ruleta()) { Los códigos que lo entregan dejarán de ser válidos. }
    </a-confirm>
  `,
})
export class PremiosListaComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  /** true = premios de la ruleta; false = premios de Lucky Code (son listas distintas). */
  readonly ruleta = input.required<boolean>();
  readonly titulo = input.required<string>();
  readonly ayuda = input("");
  /** Avisa cuando cambia algún premio (para que la página recargue lo que dependa de ellos). */
  readonly cambio = output<void>();
  protected readonly input = INPUT_CLS;
  protected readonly rotulo = ROTULO_TIPO;
  private readonly todos = signal<Premio[]>([]);
  protected readonly lista = computed(() => this.todos().filter((p) => p.enRuleta === this.ruleta()));
  /** Lucky Code solo entrega premios reales: no tiene "Sin premio". */
  protected readonly tipos = computed(() => (this.ruleta() ? TIPOS_PREMIO : TIPOS_PREMIO.filter((t) => t.v !== "nada")));
  protected readonly edit = signal<Premio | null>(null);
  protected readonly borrar = signal<Premio | null>(null);
  protected readonly error = signal("");
  protected readonly esNuevo = computed(() => { const e = this.edit(); return !!e && !this.todos().some((p) => p.id === e.id); });

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.api.get<Premio[]>("admin/c/premios").subscribe((p) => this.todos.set(p));
  }
  protected nuevo(): Premio {
    return { id: `p${Date.now().toString(36)}`, label: "", tipo: this.ruleta() ? "cupon" : "giftcard", detalle: "", enRuleta: this.ruleta(), activo: true };
  }
  protected setE(p: Partial<Premio>) {
    const e = this.edit();
    if (e) this.edit.set({ ...e, ...p });
  }
  protected cambiar(p: Premio, activo: boolean) {
    this.api.put(`admin/c/premios/${p.id}`, { ...p, activo }).subscribe(() => { this.cargar(); this.cambio.emit(); });
  }
  protected guardar() {
    const e = this.edit();
    if (!e) return;
    if (!e.label.trim()) { this.error.set("Escribe el nombre del premio."); return; }
    if (!e.detalle.trim()) { this.error.set("Escribe el mensaje que verá el participante."); return; }
    this.error.set("");
    this.api.put(`admin/c/premios/${e.id}`, { ...e, enRuleta: this.ruleta(), label: e.label.trim(), detalle: e.detalle.trim() }).subscribe(() => {
      this.edit.set(null);
      this.cargar();
      this.cambio.emit();
      this.toast.show("Premio guardado");
    });
  }
  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.api.delete(`admin/c/premios/${b.id}`).subscribe(() => { this.cargar(); this.cambio.emit(); this.toast.show("Premio eliminado"); });
  }
}

/* ------------------------------------------------------------------ */
/* Ruleta (Spin & Win): giros por semana, premios e historial          */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-ruleta-page",
  imports: [BtnDirective, FieldComponent, FilaEsqueletoComponent, OrdenColumnaComponent, PageHeaderComponent, PagerComponent, PanelComponent, PillComponent, PremiosListaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Ruleta (Spin & Win)" desc="Los premios que salen en la ruleta, los giros por semana de cada participante y lo que ya se jugó." />

    <a-panel title="Giros por semana" class="mb-6">
      <div class="flex flex-wrap items-end gap-3">
        <a-field label="Giros por participante cada semana (se renuevan los lunes)">
          <input [class]="input + ' w-32'" type="number" min="1" max="20" [value]="girosMax()" (input)="girosMax.set(+$any($event.target).value)" />
        </a-field>
        <button aBtn (click)="guardarGiros()" [disabled]="girosMax() < 1 || girosMax() > 20">Guardar</button>
      </div>
    </a-panel>

    <a-premios-lista [ruleta]="true" titulo="Premios de la ruleta" ayuda="Cada premio activo es un sector de la ruleta. Necesita al menos 2 sectores activos para funcionar; los premios «Sin premio» (Sigue intentando) también cuentan como sector." />

    <h2 class="mb-2 mt-8 text-lg font-bold">Historial de juegos</h2>
    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr>
          <th aOrden="fechaISO" [pag]="hist" etiquetaOrden="Fecha">Fecha</th><th aOrden="participante" [pag]="hist" etiquetaOrden="Participante">Participante</th>
          <th>Premio</th><th>Origen</th>
        </tr></thead>
        <tbody>
          @for (g of hist.items(); track g.id) {
            <tr>
              <td>{{ g.fecha }} · {{ g.hora }}</td><td>{{ g.participante }}</td>
              <td>{{ g.premio }}</td>
              <td class="det-chip"><a-pill tone="info">{{ g.origen === 'ruleta' ? 'Ruleta' : 'Lucky Code' }}</a-pill></td>
            </tr>
          } @empty {
            @if (hist.cargando()) { @for (n of [1, 2, 3]; track n) { <tr aEsqueleto [cols]="4"></tr> } } @else { <tr><td colspan="4" class="adm-empty">Todavía nadie ha jugado</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="hist" />

  `,
})
export class RuletaAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly hist = new Paginado<Giro>(inject(ApiService), "giros");
  protected readonly girosMax = signal(3);

  constructor() {
    this.hist.recargar();
    this.api.get<{ juegos?: { girosMax: number } }>("config").subscribe((c) => this.girosMax.set(c.juegos?.girosMax ?? 3));
  }

  protected guardarGiros() {
    this.api.put("admin/config", { juegos: { girosMax: this.girosMax() } }).subscribe(() => this.toast.show("Giros por semana actualizados"));
  }
}

/* ------------------------------------------------------------------ */
/* Lucky Code: códigos promocionales                                   */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-codigos-page",
  imports: [AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, FilaEsqueletoComponent, IconComponent, LimpiarFiltrosComponent,
    OrdenColumnaComponent, PageHeaderComponent, PagerComponent, PillComponent, PremiosListaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Lucky Code" [desc]="pag.total().toLocaleString('es') + ' códigos · cada código se puede usar una sola vez'">
      <button aBtn (click)="abrirAlta()"><app-icon name="Plus" class="h-4 w-4" /> Cargar códigos</button>
    </a-header>

    <a-premios-lista [ruleta]="false" titulo="Premios de Lucky Code" ayuda="Son distintos a los de la ruleta: cada código entrega uno de estos premios." class="mb-8 block" />

    <h2 class="mb-2 text-lg font-bold">Códigos</h2>
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar código" [class]="input + ' pl-9'" placeholder="Código, premio o participante" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Estado" [class]="input + ' w-auto'" (change)="pag.filtrar('usado', $any($event.target).value)">
        <option value="">Todos</option><option value="false">Disponibles</option><option value="true">Usados</option>
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr>
          <th aOrden="codigo" [pag]="pag" etiquetaOrden="Código">Código</th><th aOrden="premio" [pag]="pag" etiquetaOrden="Premio">Premio</th>
          <th aOrden="usado" [pag]="pag" etiquetaOrden="Estado">Estado</th><th>Usado por</th><th aria-label="Acciones"></th>
        </tr></thead>
        <tbody>
          @for (c of pag.items(); track c.codigo) {
            <tr>
              <td><b>{{ c.codigo }}</b></td>
              <td>{{ c.premio }}</td>
              <td class="det-chip"><a-pill [tone]="c.usado ? 'muted' : 'ok'">{{ c.usado ? 'Usado' : 'Disponible' }}</a-pill></td>
              <td>@if (c.usado) { {{ c.usadoPor }} · {{ c.fechaUso }} } @else { — }</td>
              <td>
                @if (!c.usado) {
                  <button type="button" data-compact class="adm-accion adm-accion-icono peligro" [attr.aria-label]="'Eliminar ' + c.codigo" (click)="borrar.set(c)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                }
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="5"></tr> } } @else { <tr><td colspan="5" class="adm-empty">No hay códigos con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-modal [open]="alta()" title="Cargar códigos" (closed)="alta.set(false)">
      <div class="space-y-4">
        <a-field label="Premio que entregan">
          <select [class]="input" (change)="premioId.set($any($event.target).value)">
            @for (p of premios(); track p.id) { <option [value]="p.id" [selected]="p.id === premioId()">{{ p.label }}</option> }
          </select>
        </a-field>
        <a-field label="Códigos (uno por línea)">
          <textarea [class]="input + ' h-40 py-2 font-mono'" placeholder="76BC-H49A-547F-WBB2&#10;AAAA-BBBB-CCCC-DDDD" [value]="texto()" (input)="texto.set($any($event.target).value)"></textarea>
        </a-field>
        <p class="text-xs text-muted-foreground">Se guardan en mayúsculas y con guiones cada 4 caracteres. Los repetidos se omiten. Máximo 5.000 por carga.</p>
        @if (error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ error() }}</p> }
        <div class="det-pie"><button aBtn variant="outline" (click)="alta.set(false)">Cancelar</button><button aBtn (click)="cargar()">Cargar</button></div>
      </div>
    </a-modal>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar este código?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se quitará <b class="text-foreground">{{ borrar()?.codigo }}</b> y ya no se podrá canjear.
    </a-confirm>
  `,
})
export class CodigosAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly pag = new Paginado<CodigoPromo>(inject(ApiService), "codigosPromo");
  protected readonly premios = signal<Premio[]>([]);
  protected readonly alta = signal(false);
  protected readonly premioId = signal("");
  protected readonly texto = signal("");
  protected readonly error = signal("");
  protected readonly borrar = signal<CodigoPromo | null>(null);

  constructor() {
    this.pag.recargar();
  }

  protected abrirAlta() {
    this.api.get<Premio[]>("admin/c/premios").subscribe((p) => {
      const con = p.filter((x) => x.activo && !x.enRuleta && x.tipo !== "nada");
      this.premios.set(con);
      this.premioId.set(con[0]?.id ?? "");
      this.texto.set("");
      this.error.set("");
      this.alta.set(true);
    });
  }

  protected cargar() {
    const premio = this.premios().find((p) => p.id === this.premioId());
    if (!premio) { this.error.set("Elige el premio que entregan."); return; }
    const codigos = [...new Set(this.texto().split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(normalizarCodigo))];
    if (!codigos.length) { this.error.set("Escribe al menos un código."); return; }
    if (codigos.length > 5000) { this.error.set("Una carga puede tener como máximo 5.000 códigos."); return; }
    const mal = codigos.find((c) => c.replace(/-/g, "").length < 8);
    if (mal) { this.error.set(`«${mal}» es demasiado corto: usa al menos 8 caracteres.`); return; }
    this.api.post<{ creados: number; omitidos: string[] }>("admin/codigos-promo/cargar", { premioId: premio.id, codigos }).subscribe({
      next: (r) => {
        this.alta.set(false);
        this.pag.recargar();
        this.toast.show(`${r.creados} código(s) cargados${r.omitidos.length ? ` · ${r.omitidos.length} repetidos omitidos` : ""}`);
      },
      error: (e) => this.error.set(e?.error?.message ?? "No pudimos cargar los códigos."),
    });
  }

  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.api.delete(`admin/c/codigosPromo/${b.codigo}`).subscribe(() => { this.pag.recargar(); this.toast.show("Código eliminado"); });
  }
}
