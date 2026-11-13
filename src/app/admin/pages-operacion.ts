import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { ApiService } from '../core/api.service';
import { leer } from '../core/leer';
import { CatalogService } from '../core/catalog.service';
import { CargaMasivaComponent } from './carga-masiva';
import { BrandService } from '../core/brand.service';
import { AdminSession } from './session';
import { formatUSD } from '../core/format';
import { estadoLabels } from '../core/labels';
import type {
  BeneficioUsuario,
  Compra,
  Direccion,
  EstadoPedido,
  Participante,
} from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { LimpiarFiltrosComponent } from '../shared/limpiar-filtros';
import {
  AdminApi,
  Paginado,
  PagerComponent,
  descargarTabla,
  AdminModalComponent,
  BtnDirective,
  ConfirmComponent,
  DrawerComponent,
  DrawerTitleComponent,
  FieldComponent,
  INPUT_CLS,
  PageHeaderComponent,
  PillComponent,
  StatComponent,
  ToastService,
  FilaEsqueletoComponent,
  OrdenColumnaComponent,
  abrirDesdeUrl,
} from './kit';

const ahora = () => new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });

/* ------------------------------------------------------------------ */
/* Participantes                                                       */
/* ------------------------------------------------------------------ */
type Ficha = Participante & { direcciones: Direccion[] };
@Component({
  selector: 'a-participantes-page',
  imports: [CargaMasivaComponent, RouterLink, OrdenColumnaComponent, 
    IconComponent,
    PageHeaderComponent,
    PillComponent,
    BtnDirective,
    PagerComponent,
    AdminModalComponent,
    FieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="participantes" title="Participantes" [desc]="pag.total().toLocaleString('es') + ' participantes registrados'">
      <button aBtn variant="outline" (click)="carga.set(true)">
        <app-icon name="Upload" class="h-4 w-4" /> Carga masiva
      </button>
      <button aBtn (click)="abrirNuevo()"><app-icon name="Plus" class="h-4 w-4" /> Nuevo participante</button>
    </a-header>

    <div class="adm-filtros"><div class="adm-busca">
      <app-icon
        name="Search"
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        [class]="input + ' pl-9'"
        placeholder="Buscar por nombre o cédula"
        aria-label="Buscar participante"
        (input)="pag.buscar($any($event.target).value)"
      />
    </div></div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th aOrden="nombre" [pag]="pag" etiquetaOrden="Participante">Participante</th>
            <th aOrden="estado" [pag]="pag" etiquetaOrden="Estado">Estado</th>
            <th aOrden="canal" [pag]="pag" etiquetaOrden="Canal">Canal</th>
            <th aOrden="cedula" [pag]="pag" etiquetaOrden="Cédula">Cédula</th>
            <th aOrden="nivel" [pag]="pag" etiquetaOrden="Nivel">Nivel</th>
            <th aria-label="Ficha"></th>
          </tr>
        </thead>
        <tbody>
          @for (r of pag.items(); track r.id) {
            <tr>
              <td>
                <a [routerLink]="['/admin/participantes', r.id]" class="block text-left">
                  <b class="hover:underline">{{ r.nombre }}</b>
                  <p class="text-xs text-muted-foreground">{{ r.email }}</p>
                </a>
              </td>
              <!-- Tarjeta: nombre y estado arriba; canal junto a la cédula; nivel; el ojo lleva a la ficha. -->
              <td class="det-completo det-chip">
                <a-pill [tone]="r.estado === 'Activo' ? 'ok' : 'bad'">{{ r.estado }}</a-pill>
              </td>
              <td>{{ r.canal }}</td>
              <td>{{ r.cedula }}</td>
              <td>{{ r.nivel }}</td>
              <td class="det-ojo"><a [routerLink]="['/admin/participantes', r.id]" [attr.aria-label]="'Ver ficha de ' + r.nombre" title="Ver ficha" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><app-icon name="Eye" class="h-4 w-4" /></a></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-carga-masiva tipo="participantes" [abierto]="carga()" (cerrado)="carga.set(false)" (terminada)="pag.recargar()" />

    <a-modal [open]="!!nuevo()" title="Nuevo participante" (closed)="nuevo.set(null)">
      @if (nuevo(); as n) {
        <div class="space-y-4">
          <a-field [label]="docEtiqueta()"><input [class]="input" [attr.maxlength]="docDigitos()" inputmode="text" autocomplete="off" [value]="n.documento" (input)="setN({ documento: $any($event.target).value.toUpperCase() })" /></a-field>
          <a-field label="Nombre y apellidos"><input [class]="input" maxlength="80" [value]="n.nombre" (input)="setN({ nombre: $any($event.target).value })" /></a-field>
          <a-field label="Correo"><input type="email" [class]="input" maxlength="120" [value]="n.correo" (input)="setN({ correo: $any($event.target).value })" /></a-field>
          <a-field label="Nivel">
            <select [class]="input" (change)="setN({ nivel: $any($event.target).value })">
              @for (v of niveles(); track v.id) { <option [value]="v.nombre" [selected]="v.nombre === n.nivel">{{ v.nombre }}</option> }
            </select>
          </a-field>
          <p class="text-xs text-muted-foreground">Recibirá un correo de bienvenida con su código de acceso.</p>
          @if (errorNuevo()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ errorNuevo() }}</p> }
          <div class="det-pie"><button aBtn variant="outline" (click)="nuevo.set(null)">Cancelar</button><button aBtn [disabled]="guardando()" (click)="crear()">Crear participante</button></div>
        </div>
      }
    </a-modal>
  `,
})
export class ParticipantesPage {
  private readonly brand = inject(BrandService);
  protected readonly niveles = computed(() => this.catalog.niveles());
  protected readonly nuevo = signal<{ documento: string; nombre: string; correo: string; nivel: string } | null>(null);
  protected readonly errorNuevo = signal('');
  protected readonly guardando = signal(false);
  protected readonly docDigitos = computed(() => this.brand.pais().documentos[0]?.digitos ?? 10);
  protected readonly docEtiqueta = computed(() => this.brand.pais().documentos[0]?.label ?? 'Documento');

  protected abrirNuevo() {
    this.errorNuevo.set('');
    this.nuevo.set({ documento: '', nombre: '', correo: '', nivel: this.niveles()[0]?.nombre ?? 'Clásico' });
  }
  protected setN(p: Partial<{ documento: string; nombre: string; correo: string; nivel: string }>) {
    const n = this.nuevo();
    if (n) this.nuevo.set({ ...n, ...p });
  }
  protected crear() {
    const n = this.nuevo();
    if (!n) return;
    const doc = n.documento.trim();
    const nombre = n.nombre.trim();
    const correo = n.correo.trim();
    if (!/^[A-Za-z0-9]+$/.test(doc)) { this.errorNuevo.set('El documento solo lleva letras y números.'); return; }
    if (doc.length !== this.docDigitos()) { this.errorNuevo.set(`El documento debe tener ${this.docDigitos()} caracteres.`); return; }
    if (nombre.length < 3) { this.errorNuevo.set('Escribe el nombre y los apellidos.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { this.errorNuevo.set('Escribe un correo válido.'); return; }
    this.errorNuevo.set('');
    this.guardando.set(true);
    const entidad = {
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, nombre, cedula: doc, email: correo, celular: '—', nivel: n.nivel,
      estado: 'Activo', canal: 'Web + App', alta: new Date().toLocaleDateString('es-PE'), direcciones: [], ajustes: [],
    };
    this.api.post<{ creados: number }>('admin/c/participantes/bulk', { items: [entidad] }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        if (!r.creados) { this.errorNuevo.set('Ya existe un participante con ese documento o correo.'); return; }
        this.nuevo.set(null);
        this.pag.recargar();
        this.toast.show('Participante creado');
      },
      error: (e) => { this.guardando.set(false); this.errorNuevo.set(e?.error?.message ?? e?.message ?? 'No se pudo crear el participante.'); },
    });
  }

  private readonly session = inject(AdminSession);
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  protected readonly input = INPUT_CLS;
  protected readonly pag = new Paginado<Ficha>(inject(ApiService), 'participantes');

  protected readonly carga = signal(false);
  constructor() {
    this.pag.recargar();
  }

}

/* ------------------------------------------------------------------ */
/* Compras (pedidos de beneficios pagados con tarjeta)                 */
/* ------------------------------------------------------------------ */
type Pedido = Compra & {
  cliente: string;
  email: string;
  estadoAdmin: EstadoPedido;
  digital: boolean;
  historial: { estado: EstadoPedido; fecha: string; nota?: string }[];
};

@Component({
  selector: 'a-pedidos-page',
  imports: [OrdenColumnaComponent, FilaEsqueletoComponent,
    LimpiarFiltrosComponent,
    IconComponent,
    PageHeaderComponent,
    PillComponent,
    BtnDirective,
    FieldComponent,
    ConfirmComponent,
    DrawerComponent,
    DrawerTitleComponent,
    PagerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="pedidos" title="Compras" desc="Beneficios pagados con tarjeta desde web y app.">
      <button aBtn variant="outline" (click)="exportar()">
        <app-icon name="Download" class="h-4 w-4" /> Descargar
      </button>
    </a-header>
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon
          name="Search"
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          [class]="input + ' pl-9'"
          placeholder="Código o cliente"
          aria-label="Buscar compra"
          (input)="pag.buscar($any($event.target).value)"
        />
      </div>
      <select
        aria-label="Estado"
        [class]="input + ' w-auto'"
        (change)="pag.filtrar('estadoAdmin', $any($event.target).value)"
      >
        <option value="">Todos los estados</option>
        @for (e of estados; track e) {
          <option>{{ e }}</option>
        }
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th aOrden="codigo" [pag]="pag" etiquetaOrden="Código">Código</th>
            <th aOrden="estadoAdmin" [pag]="pag" etiquetaOrden="Estado">Estado</th>
            <th aOrden="fechaISO" [pag]="pag" etiquetaOrden="Fecha">Fecha</th>
            <th aOrden="cliente" [pag]="pag" etiquetaOrden="Cliente">Cliente</th>
            <th>Ítems</th>
            <th aOrden="montoUSD" [pag]="pag" etiquetaOrden="Monto">Monto</th>
            <th aria-label="Detalle"></th>
          </tr>
        </thead>
        <tbody>
          @for (r of pag.items(); track r.codigo) {
            <tr>
              <td>
                <button class="font-bold hover:underline" (click)="abrir(r.codigo)">
                  {{ r.codigo }}
                </button>
              </td>
              <td class="det-completo det-chip">
                <a-pill [tone]="r.estadoAdmin === 'Anulado' ? 'bad' : 'ok'">{{ r.estadoAdmin }}</a-pill>
              </td>
              <td>{{ r.fecha }}@if ($any(r).hora) { · {{ $any(r).hora }} }</td>
              <td>{{ r.cliente }}</td>
              <td>{{ r.items.length }}</td>
              <td>{{ usd(r.montoUSD) }}</td>
              <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle de ' + r.codigo" title="Ver detalle" (click)="abrir(r.codigo)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="7"></tr> } } @else { <tr><td colspan="7" class="adm-empty">No hay compras con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-drawer [open]="!!sel()" (closed)="selCod.set(null)">
      @if (sel(); as s) {
        <a-drawer-title (closed)="selCod.set(null)">
          <p class="text-sm text-muted-foreground">Compra</p>
          <h2 class="text-2xl font-bold">{{ s.codigo }}</h2>
          <p class="text-sm text-muted-foreground">{{ s.fecha }} · {{ s.cliente }}</p>
        </a-drawer-title>

        <h3 class="mt-6 font-semibold">Seguimiento</h3>
        <ol class="mt-3 space-y-2">
          @for (h of s.historial; track h.fecha + h.estado) {
            <li class="flex gap-3">
              <span [class]="'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ' + (h.estado === 'Anulado' ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-primary bg-primary text-primary-foreground')">
                <app-icon [name]="h.estado === 'Anulado' ? 'X' : 'Check'" class="h-4 w-4" />
              </span>
              <div>
                <p class="font-semibold">{{ h.estado }}</p>
                <p class="text-xs text-muted-foreground">{{ h.fecha }}{{ h.nota ? ' · ' + h.nota : '' }}</p>
              </div>
            </li>
          }
        </ol>

        <h3 class="mt-6 font-semibold">Beneficios</h3>
        <ul class="mt-2 divide-y divide-border rounded-xl border border-border">
          @for (it of s.items; track it.nombre) {
            <li class="flex items-center gap-3 p-3">
              <img [src]="it.imagen" alt="" class="h-12 w-12 rounded-lg object-cover" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ it.nombre }}</p>
                <p class="text-xs text-muted-foreground">{{ it.marca }} · x{{ it.cantidad }}</p>
              </div>
              <b>{{ usd(it.precio * it.cantidad) }}</b>
            </li>
          }
        </ul>
        <div class="mt-3 flex justify-between rounded-xl bg-muted/60 p-3 font-semibold">
          <span>Total pagado con tarjeta</span><span>{{ usd(s.montoUSD) }}</span>
        </div>

        <h3 class="mt-6 font-semibold">Entrega</h3>
        <p class="mt-2 flex items-center gap-2 rounded-xl bg-muted/60 p-3">
          <app-icon name="Mail" class="h-4 w-4" /> {{ s.entrega }}
        </p>

        @if (s.estadoAdmin === 'Pagado') {
          <div class="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
            <button aBtn variant="peligro" (click)="anular.set(true)">Anular compra</button>
          </div>
        }
      }
    </a-drawer>

    <a-confirm
      [open]="anular()"
      [danger]="true"
      title="¿Anular esta compra?"
      confirmLabel="Sí, anular"
      (closed)="anular.set(false); motivo.set('')"
      (confirmed)="avanzar('Anulado', motivo() || 'Sin motivo')"
    >
      <p>
        Se reembolsarán
        <b class="text-foreground">{{ usd(sel()?.montoUSD ?? 0) }}</b> a la tarjeta del participante. Esta acción no se puede deshacer.
      </p>
      <a-field label="Motivo" class="mt-4"
        ><input
          [class]="input"
          [value]="motivo()"
          (input)="motivo.set($any($event.target).value)"
          placeholder="Ej. beneficio no disponible"
      /></a-field>
    </a-confirm>
  `,
})
export class PedidosPage {
  /** Descarga en CSV las compras de la página y filtros actuales. */
  protected exportar() {
    descargarTabla('compras', [['Código', 'Fecha', 'Cliente', 'Estado', 'Monto'], ...this.pag.items().map((p) => [p.codigo, p.fecha, p.cliente, p.estadoAdmin, p.montoUSD])], 'Compras');
  }
  protected readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly usd = formatUSD;
  protected readonly estados: EstadoPedido[] = ['Pagado', 'Anulado'];

  private readonly api = inject(ApiService);
  protected readonly pag = new Paginado<Pedido>(inject(ApiService), 'pedidos');
  private readonly selPedido = signal<Pedido | null>(null);
  protected readonly selCod = signal<string | null>(null);
  protected readonly anular = signal(false);
  protected readonly motivo = signal('');

  protected readonly sel = computed(() => (this.selCod() ? this.selPedido() : null));

  constructor() {
    this.pag.recargar();
    abrirDesdeUrl((c) => this.abrir(c));
  }

  protected abrir(codigo: string) {
    this.selCod.set(codigo);
    this.api.get<Pedido>(`admin/c/pedidos/${codigo}`).subscribe((p) => this.selPedido.set(p));
  }

  protected patch(p: Partial<Pedido>) {
    const s = this.selPedido();
    if (!s) return;
    const nuevo = { ...s, ...p };
    this.selPedido.set(nuevo);
    this.api.put(`admin/c/pedidos/${nuevo.codigo}`, nuevo).subscribe(() => this.pag.recargar());
  }
  protected avanzar(e: EstadoPedido, nota?: string) {
    const s = this.sel();
    if (!s) return;
    this.patch({
      estadoAdmin: e,
      estado: e,
      historial: [...s.historial, { estado: e, fecha: ahora(), ...(nota ? { nota } : {}) }],
    });
    this.toast.show(`Compra anulada · se reembolsaron ${formatUSD(s.montoUSD)}`);
  }
}
