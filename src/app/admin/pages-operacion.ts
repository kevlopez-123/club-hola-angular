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
import { formatPuntos, formatUSD, nivelPorPuntos } from '../core/format';
import { estadoLabels, tipoLabels } from '../core/labels';
import type {
  BeneficioUsuario,
  Compra,
  Cotizacion,
  Direccion,
  EstadoPedido,
  Movimiento,
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
type Ajuste = { fecha: string; puntos: number; motivo: string; usuario: string };
type Ficha = Participante & { direcciones: Direccion[]; ajustes: Ajuste[] };
@Component({
  selector: 'a-participantes-page',
  imports: [CargaMasivaComponent, RouterLink, OrdenColumnaComponent, 
    IconComponent,
    PageHeaderComponent,
    PillComponent,
    BtnDirective,
    PagerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="participantes" title="Participantes" [desc]="pag.total().toLocaleString('es') + ' participantes registrados'">
      <button aBtn variant="outline" (click)="ajusteMasivo.set(true)">
        <app-icon name="Upload" class="h-4 w-4" /> Ajuste masivo de puntos
      </button>
      <button aBtn variant="outline" (click)="carga.set(true)">
        <app-icon name="Upload" class="h-4 w-4" /> Carga masiva
      </button>
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
            <th aOrden="puntos" [pag]="pag" etiquetaOrden="Saldo">Saldo</th>
            <th aOrden="acumulados12m" [pag]="pag" etiquetaOrden="Nivel">Nivel</th>
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
              <!-- Tarjeta: nombre y estado arriba; canal junto a la cédula; saldo junto al nivel; el ojo lleva a la ficha. -->
              <td class="det-completo det-chip">
                <a-pill [tone]="r.estado === 'Activo' ? 'ok' : 'bad'">{{ r.estado }}</a-pill>
              </td>
              <td>{{ r.canal }}</td>
              <td>{{ r.cedula }}</td>
              <td>
                <b>{{ puntos(r.puntos) }}</b>
              </td>
              <td>{{ nivel(r.acumulados12m) }}</td>
              <td class="det-ojo"><a [routerLink]="['/admin/participantes', r.id]" [attr.aria-label]="'Ver ficha de ' + r.nombre" title="Ver ficha" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><app-icon name="Eye" class="h-4 w-4" /></a></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-carga-masiva tipo="ajustes" [abierto]="ajusteMasivo()" (cerrado)="ajusteMasivo.set(false)" (terminada)="pag.recargar()" />
    <a-carga-masiva tipo="participantes" [abierto]="carga()" (cerrado)="carga.set(false)" (terminada)="pag.recargar()" />
  `,
})
export class ParticipantesPage {
  private readonly session = inject(AdminSession);
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  protected readonly input = INPUT_CLS;
  protected readonly puntos = formatPuntos;
  protected readonly pag = new Paginado<Ficha>(inject(ApiService), 'participantes');

  protected readonly carga = signal(false);
  protected readonly ajusteMasivo = signal(false);
  constructor() {
    this.pag.recargar();
  }

  protected nivel(acum: number) {
    const n = this.catalog.niveles();
    return n.length ? nivelPorPuntos(n, acum).nombre : '';
  }
}

/* ------------------------------------------------------------------ */
/* Pedidos                                                             */
/* ------------------------------------------------------------------ */
type Pedido = Compra & {
  cliente: string;
  email: string;
  estadoAdmin: EstadoPedido;
  digital: boolean;
  guia: string;
  historial: { estado: EstadoPedido; fecha: string; nota?: string }[];
};
const flujoFisico: EstadoPedido[] = ['Confirmado', 'Preparando', 'Enviado', 'Entregado'];
const flujoDigital: EstadoPedido[] = ['Confirmado', 'Digital enviado'];

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
    <a-header vista="pedidos" title="Pedidos" desc="Canjes de productos y beneficios desde web y app.">
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
          aria-label="Buscar pedido"
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
            <th aOrden="digital" [pag]="pag" etiquetaOrden="Tipo">Tipo</th>
            <th>Items</th>
            <th>Pago</th>
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
                <a-pill
                  [tone]="
                    r.estadoAdmin === 'Cancelado'
                      ? 'bad'
                      : r.estadoAdmin === 'Entregado' || r.estadoAdmin === 'Digital enviado'
                        ? 'ok'
                        : 'warn'
                  "
                  >{{ r.estadoAdmin }}</a-pill
                >
              </td>
              <td>{{ r.fecha }}@if ($any(r).hora) { · {{ $any(r).hora }} }</td>
              <td>{{ r.cliente }}</td>
              <td>{{ r.digital ? 'Digital' : 'Físico' }}</td>
              <td>{{ r.items.length }}</td>
              <td>{{ r.montoUSD ? usd(r.montoUSD) : puntos(r.puntosUsados) + ' pts' }}</td>
              <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle de ' + r.codigo" title="Ver detalle" (click)="abrir(r.codigo)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="8"></tr> } } @else { <tr><td colspan="8" class="adm-empty">No hay pedidos con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-drawer [open]="!!sel()" (closed)="selCod.set(null)">
      @if (sel(); as s) {
        <a-drawer-title (closed)="selCod.set(null)">
          <p class="text-sm text-muted-foreground">Pedido</p>
          <h2 class="text-2xl font-bold">{{ s.codigo }}</h2>
          <p class="text-sm text-muted-foreground">{{ s.fecha }} · {{ s.cliente }}</p>
        </a-drawer-title>

        <h3 class="mt-6 font-semibold">Seguimiento</h3>
        <ol class="mt-3 space-y-0">
          @for (e of pasos(); track e; let i = $index; let last = $last) {
            <li class="relative flex gap-3 pb-5 last:pb-0">
              @if (!last) {
                <span
                  [class]="
                    'absolute left-[13px] top-7 h-full w-0.5 ' +
                    (hist(e) ? 'bg-primary' : 'bg-border')
                  "
                ></span>
              }
              <span
                [class]="
                  'relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ' +
                  (e === 'Cancelado'
                    ? 'border-destructive bg-destructive text-destructive-foreground'
                    : hist(e)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card')
                "
              >
                @if (hist(e)) {
                  <app-icon [name]="e === 'Cancelado' ? 'X' : 'Check'" class="h-4 w-4" />
                }
              </span>
              <div>
                <p [class]="'font-semibold ' + (!hist(e) ? 'text-muted-foreground' : '')">
                  {{ e }}
                </p>
                @if (hist(e); as h) {
                  <p class="text-xs text-muted-foreground">
                    {{ h.fecha }}{{ h.nota ? ' · ' + h.nota : '' }}
                  </p>
                }
              </div>
            </li>
          }
        </ol>

        <h3 class="mt-6 font-semibold">Productos</h3>
        <ul class="mt-2 divide-y divide-border rounded-xl border border-border">
          @for (it of s.items; track it.nombre) {
            <li class="flex items-center gap-3 p-3">
              <img [src]="it.imagen" alt="" class="h-12 w-12 rounded-lg object-cover" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ it.nombre }}</p>
                <p class="text-xs text-muted-foreground">{{ it.marca }} · x{{ it.cantidad }}</p>
              </div>
              <b>{{ puntos(it.puntos * it.cantidad) }} pts</b>
            </li>
          }
        </ul>
        <div class="mt-3 flex justify-between rounded-xl bg-muted/60 p-3 font-semibold">
          <span>Total</span
          ><span>{{ s.montoUSD ? usd(s.montoUSD) : puntos(s.puntosUsados) + ' puntos' }}</span>
        </div>

        <h3 class="mt-6 font-semibold">Entrega</h3>
        @if (s.digital) {
          <p class="mt-2 flex items-center gap-2 rounded-xl bg-muted/60 p-3">
            <app-icon name="Mail" class="h-4 w-4" /> Envío digital a {{ s.email }}
          </p>
        } @else {
          <div class="mt-2 flex gap-2 rounded-xl bg-muted/60 p-3">
            <app-icon name="MapPin" class="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p class="font-semibold">Recibe {{ s.cliente }}</p>
              <p class="text-sm text-muted-foreground">{{ s.entrega }}</p>
            </div>
          </div>
          <a-field label="Número de guía (courier)" class="mt-3">
            <input
              [class]="input"
              [value]="s.guia"
              (input)="patch({ guia: $any($event.target).value })"
              placeholder="Ej. SERV-48210"
              [disabled]="s.estadoAdmin === 'Cancelado'"
            />
          </a-field>
        }

        @if (s.estadoAdmin !== 'Cancelado') {
          <div class="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
            @if (siguiente(); as sig) {
              <button aBtn [disabled]="sig === 'Enviado' && !s.guia" (click)="avanzar(sig)">
                Marcar como {{ sig }}
              </button>
            }
            @if (s.estadoAdmin !== 'Entregado' && s.estadoAdmin !== 'Digital enviado') {
              <button aBtn variant="peligro" (click)="cancelar.set(true)">Cancelar pedido</button>
            }
            @if (siguiente() === 'Enviado' && !s.guia) {
              <p class="w-full text-sm text-muted-foreground">
                Ingresa el número de guía para marcarlo como enviado.
              </p>
            }
          </div>
        }
      }
    </a-drawer>

    <a-confirm
      [open]="cancelar()"
      [danger]="true"
      title="¿Cancelar este pedido?"
      confirmLabel="Sí, cancelar"
      (closed)="cancelar.set(false); motivo.set('')"
      (confirmed)="avanzar('Cancelado', motivo() || 'Sin motivo')"
    >
      <p>
        Se devolverán
        <b class="text-foreground">{{ puntos(sel()?.puntosUsados ?? 0) }} puntos</b> al participante
        @if (sel()?.montoUSD) {
          y se reembolsarán <b class="text-foreground">{{ usd(sel()!.montoUSD) }}</b> a su tarjeta
        }
        . Esta acción no se puede deshacer.
      </p>
      <a-field label="Motivo" class="mt-4"
        ><input
          [class]="input"
          [value]="motivo()"
          (input)="motivo.set($any($event.target).value)"
          placeholder="Ej. sin stock del proveedor"
      /></a-field>
    </a-confirm>
  `,
})
export class PedidosPage {
  /** Descarga en CSV los pedidos de la página y filtros actuales. */
  protected exportar() {
    descargarTabla('pedidos', [['Código', 'Fecha', 'Cliente', 'Estado', 'Puntos usados', 'Monto'], ...this.pag.items().map((p) => [p.codigo, p.fecha, p.cliente, p.estadoAdmin, p.puntosUsados, p.montoUSD])], 'Pedidos');
  }
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  protected readonly input = INPUT_CLS;
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  protected readonly estados: EstadoPedido[] = [
    'Confirmado',
    'Preparando',
    'Enviado',
    'Entregado',
    'Digital enviado',
    'Cancelado',
  ];

  private readonly api = inject(ApiService);
  protected readonly pag = new Paginado<Pedido>(inject(ApiService), 'pedidos');
  private readonly selPedido = signal<Pedido | null>(null);
  protected readonly selCod = signal<string | null>(null);
  protected readonly cancelar = signal(false);
  protected readonly motivo = signal('');

  protected readonly sel = computed(() => (this.selCod() ? this.selPedido() : null));
  private readonly flujo = computed(() => (this.sel()?.digital ? flujoDigital : flujoFisico));
  protected readonly pasos = computed(() => {
    const s = this.sel();
    return s?.estadoAdmin === 'Cancelado' ? s.historial.map((h) => h.estado) : this.flujo();
  });
  protected readonly siguiente = computed(() => {
    const s = this.sel();
    if (!s || s.estadoAdmin === 'Cancelado') return null;
    const flujo = this.flujo();
    const idx = flujo.indexOf(s.estadoAdmin);
    return idx < flujo.length - 1 ? flujo[idx + 1]! : null;
  });

  constructor() {
    this.pag.recargar();
    abrirDesdeUrl((c) => this.abrir(c));
  }

  protected abrir(codigo: string) {
    this.selCod.set(codigo);
    this.api.get<Pedido>(`admin/c/pedidos/${codigo}`).subscribe((p) => this.selPedido.set(p));
  }

  protected hist(e: EstadoPedido) {
    return this.sel()?.historial.find((x) => x.estado === e);
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
      historial: [...s.historial, { estado: e, fecha: ahora(), ...(nota ? { nota } : {}) }],
    });
    this.toast.show(
      e === 'Cancelado'
        ? `Pedido cancelado · ${formatPuntos(s.puntosUsados)} puntos devueltos`
        : `Estado actualizado a ${e} · se notificó al cliente`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Cotizaciones de vuelos                                              */
/* ------------------------------------------------------------------ */
type CotizacionFila = Cotizacion & { cliente?: string; email?: string };
type Ejecutivo = { id: string; nombre: string; rol: string };
const ESTADOS: Cotizacion['estado'][] = ['Enviada', 'En revisión', 'Cotizada', 'Cerrada'];

/** Años cumplidos a hoy desde una fecha ISO (yyyy-mm-dd). */
const edadDe = (iso: string) => {
  if (!iso) return null;
  const n = new Date(`${iso}T12:00:00`);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
  return e;
};
const fechaCorta = (iso: string) => (iso ? new Date(iso.length > 10 ? iso : `${iso}T12:00:00`).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fechaHora = (iso: string) => (iso ? new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

@Component({
  selector: 'a-cotizaciones-page',
  imports: [OrdenColumnaComponent, FilaEsqueletoComponent, 
    LimpiarFiltrosComponent,IconComponent, PageHeaderComponent, PillComponent, BtnDirective, FieldComponent, StatComponent, DrawerComponent, DrawerTitleComponent, PagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="cotizaciones" title="Cotizaciones de vuelos" desc="Solicitudes recibidas desde web y app. Responder en un máximo de 48 horas.">
      <button aBtn variant="outline" (click)="exportar()"><app-icon name="Download" class="h-4 w-4" /> Descargar</button>
    </a-header>

    <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (e of estados; track e) {
        <a-stat [label]="e === 'Enviada' ? 'Nuevas' : e" [value]="cuenta(e)" />
      }
    </div>

    <div class="adm-filtros">
<div class="adm-busca"><app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Buscar cotización" [class]="input + ' pl-9'" placeholder="Código, participante o ciudad" (input)="pag.buscar($any($event.target).value)" /></div>
<select aria-label="Estado" [class]="input + ' w-auto'" (change)="pag.filtrar('estado', $any($event.target).value)">
<option value="">Todos los estados</option>
@for (e of estados; track e) { <option>{{ e }}</option> }
</select>
<input type="date" aria-label="Desde" [class]="input + ' w-auto'" (input)="pag.filtrar('desde', $any($event.target).value)" />
<input type="date" aria-label="Hasta" [class]="input + ' w-auto'" (input)="pag.filtrar('hasta', $any($event.target).value)" />
<app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
</div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead>
          <tr><th aOrden="codigo" [pag]="pag" etiquetaOrden="Código">Código</th><th aOrden="estado" [pag]="pag" etiquetaOrden="Estado">Estado</th><th aOrden="fecha" [pag]="pag" etiquetaOrden="Fecha">Fecha</th><th aOrden="cliente" [pag]="pag" etiquetaOrden="Participante">Participante</th><th>Ruta</th><th>Viaje</th><th aOrden="pasajeros" [pag]="pag" etiquetaOrden="Pax">Pax</th><th aOrden="ejecutiva" [pag]="pag" etiquetaOrden="Ejecutiva">Ejecutiva</th><th>SLA</th><th aria-label="Gestionar"></th></tr>
        </thead>
        <tbody>
          @for (r of pag.items(); track r.codigo) {
            <tr>
              <td><button class="font-bold hover:underline" (click)="abrir(r)">{{ r.codigo }}</button></td>
              <td class="det-completo det-chip"><a-pill [tone]="tono(r.estado)">{{ r.estado }}</a-pill></td>
              <td>{{ r.fecha }}</td>
              <td>{{ r.cliente || '—' }}</td>
              <td class="adm-ancha">{{ ciudad(r.origen) }} → {{ ciudad(r.destino) }}</td>
              <td>{{ r.tipoViaje }} · {{ r.clase }}</td>
              <td>{{ r.pasajeros }}@if (conAsistencia(r)) { <app-icon name="Accessibility" class="ml-1 inline h-4 w-4 text-primary" /><span class="sr-only">Requiere asistencia</span> }</td>
              <td>{{ r.ejecutiva || 'Sin asignar' }}</td>
              <td>
                @if (r.estado === 'Enviada' || r.estado === 'En revisión') {
                  <a-pill [tone]="horas(r.fecha) > 48 ? 'bad' : 'ok'">{{ horas(r.fecha) > 48 ? 'Vencido' : 48 - horas(r.fecha) + ' h' }}</a-pill>
                } @else { — }
              </td>
              <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Gestionar ' + r.codigo" title="Gestionar" (click)="abrir(r)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="10"></tr> } } @else { <tr><td colspan="10" class="adm-empty">No hay cotizaciones con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-drawer [open]="!!sel()" (closed)="cerrar()">
      @if (sel(); as s) {
        <a-drawer-title (closed)="cerrar()">
          <p class="text-sm text-muted-foreground">Cotización · {{ s.fecha }}</p>
          <h2 class="text-2xl font-bold">{{ s.codigo }}</h2>
          <a-pill [tone]="tono(s.estado)">{{ s.estado }}</a-pill>
        </a-drawer-title>

        <div class="mt-6 rounded-xl bg-muted/60 p-4">
          <div class="flex items-center justify-between gap-3 text-lg font-bold">
            <span>{{ ciudad(s.origen) }}</span><app-icon name="Plane" class="h-5 w-5 text-primary" /><span>{{ ciudad(s.destino) }}</span>
          </div>
          <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><dt class="text-muted-foreground">Tipo</dt><dd class="font-semibold">{{ s.tipoViaje }}</dd></div>
            <div><dt class="text-muted-foreground">Clase</dt><dd class="font-semibold">{{ s.clase }}</dd></div>
            <div><dt class="text-muted-foreground">Ida</dt><dd class="font-semibold">{{ corta(s.salida) }}</dd></div>
            <div><dt class="text-muted-foreground">Regreso</dt><dd class="font-semibold">{{ s.regreso ? corta(s.regreso) : '—' }}</dd></div>
          </dl>
        </div>

        <h3 class="mt-6 font-semibold">Contacto</h3>
        <div class="mt-2 space-y-1 text-sm">
          <p class="font-semibold">{{ s.cliente || '—' }}</p>
          <p class="flex items-center gap-2"><app-icon name="Mail" class="h-4 w-4" /> {{ s.email || '—' }}</p>
          @if (celular(s); as cel) { <p class="flex items-center gap-2"><app-icon name="Phone" class="h-4 w-4" /> {{ cel }}</p> }
        </div>
        <p class="mt-2 text-xs text-muted-foreground">La comunicación con el participante es por WhatsApp o correo, directamente desde tu cuenta. Al usar estos botones queda anotado el contacto.</p>
        <div class="mt-2 flex flex-wrap gap-2">
          @if (waUrl(s); as wa) {
            <a [href]="wa" target="_blank" rel="noopener noreferrer" (click)="registrarContacto('WhatsApp')"
              class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white hover:opacity-90"><app-icon name="MessageSquare" class="h-4 w-4" /> Escribir por WhatsApp</a>
          }
          @if (s.email) {
            <a [href]="mailtoUrl(s)" (click)="registrarContacto('Correo')"
              class="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"><app-icon name="Mail" class="h-4 w-4" /> Enviar correo</a>
          }
        </div>
        @if (s.contactos?.length) {
          <ul class="mt-2 space-y-0.5 text-xs text-muted-foreground" aria-label="Contactos registrados">
            @for (k of s.contactos; track $index) { <li>{{ k.canal }} · {{ k.por }} · {{ hora(k.fecha) }}</li> }
          </ul>
        }

        <h3 class="mt-6 flex items-center gap-2 font-semibold"><app-icon name="Users" class="h-4 w-4" /> Pasajeros ({{ s.pasajerosDetalle.length }})</h3>
        <ul class="mt-2 divide-y divide-border rounded-xl border border-border text-sm" aria-label="Pasajeros">
          @for (p of s.pasajerosDetalle; track $index) {
            <li class="grid gap-x-4 gap-y-1 p-3 sm:grid-cols-2">
              <span class="font-semibold sm:col-span-2">{{ p.nombres }} {{ p.apellidos }}</span>
              <span class="text-muted-foreground">{{ tipoDoc(p.tipoDoc) }} · {{ p.numDoc }}</span>
              <span class="text-muted-foreground">Nació el {{ corta(p.nacimiento) }} · <b class="text-foreground">{{ edadDe(p.nacimiento) }} años</b></span>
              <span class="sm:col-span-2">
                @if (p.asistencia) { <a-pill tone="warn">Requiere asistencia (discapacidad)</a-pill> } @else { <span class="text-muted-foreground">Sin requerimientos especiales</span> }
              </span>
            </li>
          } @empty { <li class="p-3 text-muted-foreground">Sin datos de pasajeros.</li> }
        </ul>

        <h3 class="mt-6 font-semibold">Gestión</h3>
        <p class="mt-1 text-xs text-muted-foreground">Las ejecutivas son los usuarios con rol Atención, Operaciones o Administrador (Usuarios y roles).</p>
        <div class="mt-2 grid gap-3 sm:grid-cols-2">
          <a-field label="Ejecutiva asignada">
            <select [class]="input" aria-label="Ejecutiva asignada" (change)="ejecutivaId.set($any($event.target).value)">
              <option value="" [selected]="!ejecutivaId()">Sin asignar</option>
              @for (e of ejecutivos(); track e.id) { <option [value]="e.id" [selected]="e.id === ejecutivaId()">{{ e.nombre }} · {{ e.rol }}</option> }
            </select>
          </a-field>
          <a-field label="Monto cotizado">
            <input [class]="input" inputmode="decimal" placeholder="Ej. 850.00" [value]="monto()" (input)="monto.set($any($event.target).value)" />
          </a-field>
          <a-field label="Nota interna (no la ve el participante)" class="sm:col-span-2">
            <textarea [class]="input + ' min-h-24'" [value]="nota()" (input)="nota.set($any($event.target).value)" placeholder="Aerolínea, escalas, condiciones…"></textarea>
          </a-field>
        </div>

        <h3 class="mt-6 font-semibold">Cotización en PDF</h3>
        @if (pdf()) {
          <div class="mt-2 flex items-center gap-3 rounded-xl border border-border p-3">
            <app-icon name="FileText" class="h-6 w-6 text-primary" /><span class="min-w-0 flex-1 truncate font-medium">{{ pdf() }}</span>
            <button aBtn variant="ghost" (click)="pdf.set('')">Quitar</button>
          </div>
        } @else {
          <label class="mt-2 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary">
            <app-icon name="Paperclip" class="h-4 w-4" /><span><b class="text-foreground">Adjuntar PDF</b> con itinerario y tarifas</span>
            <input type="file" accept="application/pdf" class="sr-only" (change)="adjuntar($any($event.target).files?.[0])" />
          </label>
        }
        <button aBtn variant="outline" class="mt-3" (click)="guardarGestion()">Guardar gestión</button>

        <h3 class="mt-6 font-semibold">Historial de estados</h3>
        <ol class="mt-2 space-y-1 text-sm" aria-label="Historial de estados">
          @for (h of s.historial; track $index) {
            <li class="flex flex-wrap items-center gap-2"><a-pill [tone]="tono(h.estado)">{{ h.estado }}</a-pill><span class="text-muted-foreground">{{ hora(h.fecha) }} · {{ h.por }}</span></li>
          }
        </ol>

        <div class="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
          @if (s.estado === 'Enviada') { <button aBtn (click)="cambiar('En revisión')">Tomar solicitud</button> }
          @if (s.estado === 'En revisión') {
            <button aBtn [disabled]="!montoValido() || !pdf()" (click)="enviarCotizacion()">Enviar cotización</button>
          }
          @if (s.estado === 'Cotizada') { <button aBtn variant="outline" (click)="cambiar('En revisión')">Volver a revisión</button> }
          @if (s.estado === 'Cerrada') { <button aBtn variant="outline" (click)="cambiar('En revisión')">Reabrir</button> }
          @if (s.estado !== 'Cerrada') { <button aBtn variant="outline" (click)="cambiar('Cerrada')">Cerrar</button> }
          @if (s.estado === 'En revisión' && (!montoValido() || !pdf())) {
            <p class="w-full text-sm text-muted-foreground">Ingresa el monto y adjunta el PDF para enviar la cotización.</p>
          }
        </div>
      }
    </a-drawer>
  `,
})
export class CotizacionesAdminPage {
  protected readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(AdminSession);
  protected readonly input = INPUT_CLS;
  protected readonly estados = ESTADOS;
  protected readonly edadDe = edadDe;
  protected readonly corta = fechaCorta;
  protected readonly hora = fechaHora;

  /** Paginada en el servidor: buscar, filtrar por estado/fechas y conteo por estado no recorren todo en el navegador. */
  protected readonly pag = new Paginado<CotizacionFila>(inject(ApiService), 'cotizaciones', 15);
  protected readonly ejecutivos = leer(this.api.get<Ejecutivo[]>('admin/ejecutivos'), [] as Ejecutivo[]);
  private readonly participantes = leer(this.api.get<{ items: Participante[] }>('admin/q/participantes', { size: 50 }).pipe(map((r) => r.items)), [] as Participante[]);
  private readonly seleccion = signal<CotizacionFila | null>(null);
  /** La cotización abierta se actualiza con cada respuesta del servidor. */
  protected readonly sel = this.seleccion.asReadonly();

  // Borradores del formulario de gestión
  protected readonly ejecutivaId = signal('');
  protected readonly monto = signal('');
  protected readonly nota = signal('');
  protected readonly pdf = signal('');
  private readonly pdfUrl = signal('');
  private readonly brand = inject(BrandService);
  protected readonly montoValido = computed(() => Number(this.monto().replace(',', '.')) > 0);

  constructor() {
    this.pag.campos = 'estado';
    this.pag.recargar();
    abrirDesdeUrl((c) => this.api.get<{ items: CotizacionFila[] }>('admin/q/cotizaciones', { q: c, size: 5 }).subscribe((r) => { const f = r.items.find((x) => x.codigo === c); if (f) this.abrir(f); }));
  }

  protected abrir(c: CotizacionFila) {
    this.mostrar(c);
  }
  protected cerrar() {
    this.seleccion.set(null);
  }
  private mostrar(c: CotizacionFila) {
    this.seleccion.set(c);
    this.ejecutivaId.set(c.ejecutivaId ?? '');
    this.monto.set(c.monto ? String(c.monto) : '');
    this.nota.set(c.nota ?? '');
    this.pdf.set(c.pdf ?? '');
    this.pdfUrl.set(c.pdfUrl ?? '');
  }
  private actualizada(c: CotizacionFila, mensaje?: string) {
    this.mostrar(c);
    this.pag.recargar();
    if (mensaje) this.toast.show(mensaje);
  }

  protected celular(c: CotizacionFila) {
    return this.participantes().find((p) => p.email === c.email)?.celular ?? '';
  }
  protected conAsistencia(c: CotizacionFila) {
    return (c.pasajerosDetalle ?? []).some((p) => p.asistencia);
  }
  protected tipoDoc(v: string) {
    return ({ cedula: 'Cédula', pasaporte: 'Pasaporte', ruc: 'RUC' } as Record<string, string>)[v] ?? v;
  }
  protected ciudad(c: string) {
    return this.catalog.ciudades().find((x) => x.codigo === c || x.ciudad === c)?.ciudad ?? c;
  }
  protected horas(f: string) {
    return Math.floor((Date.now() - new Date(f).getTime()) / 36e5);
  }
  protected cuenta(e: string) {
    return (this.pag.facetas()['estado']?.[e] ?? 0).toLocaleString('es');
  }
  protected tono(e: Cotizacion['estado']) {
    return e === 'Enviada' ? 'warn' : e === 'En revisión' ? 'info' : e === 'Cotizada' ? 'ok' : 'muted';
  }
  protected adjuntar(f?: File) {
    if (!f) return;
    this.pdf.set(f.name);
    this.pdfUrl.set('');
    this.toast.show('PDF adjuntado');
    // Para que el participante pueda abrirlo desde Mis cotizaciones (con un servidor real se sube el archivo y se guarda su URL).
    if (f.size <= 1.5 * 1024 * 1024) {
      const r = new FileReader();
      r.onload = () => this.pdfUrl.set(String(r.result));
      r.readAsDataURL(f);
    }
  }

  /** Número para wa.me: solo dígitos y con el prefijo del país (un celular local empieza con 0). */
  private numeroWa(cel: string) {
    const prefijo = this.brand.pais().telefonoPrefijo.replace(/\D/g, '');
    const d = cel.replace(/\D/g, '');
    return d.startsWith(prefijo) && d.length > 10 ? d : prefijo + d.replace(/^0+/, '');
  }
  private mensajeSugerido(s: CotizacionFila) {
    const nombre = (s.cliente ?? '').split(' ')[0] || 'Hola';
    const ruta = `${this.ciudad(s.origen)} → ${this.ciudad(s.destino)}`;
    return s.estado === 'Cotizada' && s.monto
      ? `Hola ${nombre}, te escribo por tu cotización ${s.codigo} (${ruta}). El valor es ${formatUSD(s.monto)} y tiene validez de 72 horas. También la encuentras en Mis cotizaciones. ¿La confirmamos?`
      : `Hola ${nombre}, te escribo por tu solicitud de cotización ${s.codigo} (${ruta}).`;
  }
  protected waUrl(s: CotizacionFila) {
    const cel = this.celular(s);
    return cel ? `https://wa.me/${this.numeroWa(cel)}?text=${encodeURIComponent(this.mensajeSugerido(s))}` : '';
  }
  protected mailtoUrl(s: CotizacionFila) {
    return `mailto:${s.email}?subject=${encodeURIComponent('Tu cotización ' + s.codigo)}&body=${encodeURIComponent(this.mensajeSugerido(s))}`;
  }
  /** Anota en la cotización que la ejecutiva escribió por ese canal (no impide abrir WhatsApp o el correo). */
  protected registrarContacto(canal: 'WhatsApp' | 'Correo') {
    const s = this.sel();
    if (!s) return;
    this.api
      .post<CotizacionFila>(`admin/cotizaciones/${s.codigo}/contacto`, { canal, por: this.session.usuario()?.nombre })
      .subscribe((c) => this.actualizada(c));
  }

  private nombreEjecutiva(id: string) {
    return this.ejecutivos().find((e) => e.id === id)?.nombre ?? '';
  }
  /** Guarda ejecutiva, monto, PDF y nota sin cambiar el estado. */
  protected guardarGestion() {
    const s = this.sel();
    if (!s) return;
    this.api
      .patch<CotizacionFila>('admin/cotizaciones/' + s.codigo, {
        ejecutivaId: this.ejecutivaId(), ejecutiva: this.nombreEjecutiva(this.ejecutivaId()),
        monto: this.montoValido() ? Number(this.monto().replace(',', '.')) : undefined, pdf: this.pdf(), pdfUrl: this.pdfUrl(), nota: this.nota(),
      })
      .subscribe((c) => this.actualizada(c, 'Gestión guardada'));
  }
  /** Cambia el estado. Al tomar una solicitud sin ejecutiva, queda a cargo de quien la toma. */
  protected cambiar(estado: Cotizacion['estado']) {
    const s = this.sel();
    if (!s) return;
    const yo = this.session.usuario();
    const asigna = !s.ejecutivaId && estado === 'En revisión' && yo ? { ejecutivaId: yo.id, ejecutiva: yo.nombre } : {};
    this.api
      .patch<CotizacionFila>('admin/cotizaciones/' + s.codigo, { estado, por: yo?.nombre, ...asigna })
      .subscribe((c) => this.actualizada(c, `Cotización ${s.codigo} → ${estado} · el participante lo ve en Mis cotizaciones`));
  }
  protected enviarCotizacion() {
    const s = this.sel();
    if (!s || !this.montoValido() || !this.pdf()) return;
    const monto = Number(this.monto().replace(',', '.'));
    const yo = this.session.usuario();
    this.api
      .patch<CotizacionFila>('admin/cotizaciones/' + s.codigo, { estado: 'Cotizada', por: yo?.nombre, monto, pdf: this.pdf(), pdfUrl: this.pdfUrl(), nota: this.nota(), ejecutivaId: this.ejecutivaId() || yo?.id, ejecutiva: this.nombreEjecutiva(this.ejecutivaId()) || yo?.nombre })
      .subscribe((c) => this.actualizada(c, `Cotización ${s.codigo} → Cotizada · avísale al participante por WhatsApp o correo (botones del detalle)`));
  }
  /** Descarga en CSV las cotizaciones de la página y filtros actuales. */
  protected exportar() {
    descargarTabla('cotizaciones', [['Código', 'Fecha', 'Participante', 'Origen', 'Destino', 'Pasajeros', 'Ejecutiva', 'Estado'], ...this.pag.items().map((c) => [c.codigo, c.fecha, c.cliente ?? '', c.origen, c.destino, c.pasajeros, c.ejecutiva ?? '', c.estado])], 'Cotizaciones de vuelos');
  }
}
/* ------------------------------------------------------------------ */
/* Compras de puntos                                                   */
/* ------------------------------------------------------------------ */
type CompraPuntosFila = { codigo: string; fecha: string; fechaISO: string; cliente: string; email: string; cantidad: number; monto: number; estado: string; intentos?: number; motivo?: string; referencia?: string; participanteId?: string };

@Component({
  selector: 'a-compras-puntos-page',
  imports: [AdminModalComponent, RouterLink, OrdenColumnaComponent, FilaEsqueletoComponent,
    LimpiarFiltrosComponent,IconComponent, PageHeaderComponent, PillComponent, BtnDirective, PagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="compras-puntos" title="Compras de puntos" [desc]="pag.total().toLocaleString('es') + ' operaciones · cada compra del participante queda registrada aquí y en su historial de puntos'">
      <button aBtn variant="outline" (click)="exportar()"><app-icon name="Download" class="h-4 w-4" /> Descargar</button>
    </a-header>
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar compra" [class]="input + ' pl-9'" placeholder="Operación, participante o correo" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Filtrar por estado" [class]="input + ' w-auto'" (change)="pag.filtrar('estado', $any($event.target).value)">
        <option value="">Todos los estados</option>
        <option>Aprobada</option><option>Pendiente</option><option>Fallida</option>
      </select>
      <input type="date" aria-label="Desde" [class]="input + ' w-auto'" (input)="pag.filtrar('desde', $any($event.target).value)" />
      <input type="date" aria-label="Hasta" [class]="input + ' w-auto'" (input)="pag.filtrar('hasta', $any($event.target).value)" />
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>
    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr><th aOrden="codigo" [pag]="pag" etiquetaOrden="Operación">Operación</th><th aOrden="estado" [pag]="pag" etiquetaOrden="Estado">Estado</th><th aOrden="fechaISO" [pag]="pag" etiquetaOrden="Fecha">Fecha</th><th aOrden="cliente" [pag]="pag" etiquetaOrden="Participante">Participante</th><th aOrden="cantidad" [pag]="pag" etiquetaOrden="Puntos">Puntos</th><th aOrden="monto" [pag]="pag" etiquetaOrden="Monto pagado">Monto pagado</th><th>Pago</th><th aria-label="Detalle"></th></tr></thead>
        <tbody>
          @for (c of pag.items(); track c.codigo) {
            <tr>
              <td><button type="button" class="font-bold hover:underline" [attr.aria-label]="'Ver detalle de la operación ' + c.codigo" (click)="detalle.set(c)">{{ c.codigo }}</button></td>
              <td class="det-completo det-chip"><a-pill [tone]="c.estado === 'Aprobada' ? 'ok' : c.estado === 'Pendiente' ? 'warn' : c.estado === 'Fallida' ? 'bad' : 'muted'">{{ c.estado }}</a-pill></td>
              <td>{{ c.fecha }}@if ($any(c).hora) { · {{ $any(c).hora }} }</td>
              <td>{{ c.cliente }}<span class="block text-xs text-muted-foreground">{{ c.email }}</span></td>
              <td>{{ puntos(c.cantidad) }}</td>
              <td>{{ usd(c.monto) }}</td>
              <td class="det-completo">
                @if (c.estado === 'Aprobada') { <span class="text-xs text-muted-foreground">{{ c.intentos ? c.intentos + ' intento(s)' : '—' }}</span> }
                @else {
                  <span class="block text-xs text-muted-foreground">{{ c.motivo || (c.intentos ? 'Sin confirmar' : 'Aún sin pagar') }}@if (c.intentos) { · {{ c.intentos }} intento(s) }</span>
                  @if (c.estado === 'Pendiente' && c.intentos) {
                    <span class="mt-1 flex flex-wrap gap-1">
                      <button aBtn variant="outline" [attr.aria-label]="'Confirmar pago ' + c.codigo" (click)="resolver(c, 'aprobado')">Confirmar pago</button>
                      <button aBtn variant="ghost" [attr.aria-label]="'Rechazar pago ' + c.codigo" (click)="resolver(c, 'rechazado')">Rechazar</button>
                    </span>
                  }
                }
              </td>
              <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle de la operación ' + c.codigo" title="Ver detalle" (click)="detalle.set(c)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="8"></tr> } } @else { <tr><td colspan="8" class="adm-empty">Aún no hay compras de puntos</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />
    <a-modal [open]="!!detalle()" [wide]="true" [title]="'Operación ' + (detalle()?.codigo ?? '')" (closed)="detalle.set(null)">
      @if (detalle(); as c) {
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Participante</dt><dd class="text-sm font-semibold">{{ c.cliente }}</dd><dd class="text-xs text-muted-foreground">{{ c.email }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Fecha</dt><dd class="text-sm font-semibold">{{ c.fecha }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Puntos</dt><dd class="text-sm font-semibold">{{ puntos(c.cantidad) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Monto</dt><dd class="text-sm font-semibold">{{ usd(c.monto) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Estado</dt><dd><a-pill [tone]="c.estado === 'Aprobada' ? 'ok' : c.estado === 'Pendiente' ? 'warn' : c.estado === 'Fallida' ? 'bad' : 'muted'">{{ c.estado }}</a-pill></dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Intentos de pago</dt><dd class="text-sm font-semibold">{{ c.intentos ?? 0 }}</dd></div>
          @if (c.referencia) { <div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted-foreground">Referencia de la pasarela</dt><dd class="break-all font-mono text-sm">{{ c.referencia }}</dd></div> }
        </dl>
        @if (c.motivo) { <p class="mt-4 rounded-xl bg-muted/60 p-3 text-sm"><b>Motivo:</b> {{ c.motivo }}</p> }
        <div class="det-pie">
          @if (c.estado === 'Pendiente' && c.intentos) {
            <button aBtn variant="outline" (click)="resolver(c, 'aprobado'); detalle.set(null)">Confirmar pago</button>
            <button aBtn variant="ghost" (click)="resolver(c, 'rechazado'); detalle.set(null)">Rechazar</button>
          }
          @if (c.participanteId) { <a [routerLink]="['/admin/participantes', c.participanteId]" class="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Ver ficha del participante</a> }
        </div>
      }
    </a-modal>
  `,
})
export class ComprasPuntosPage {
  protected readonly detalle = signal<CompraPuntosFila | null>(null);
  protected readonly input = INPUT_CLS;
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly pag = new Paginado<CompraPuntosFila>(this.api, 'comprasPuntos');

  constructor() {
    this.pag.recargar();
    abrirDesdeUrl((c) => this.api.get<CompraPuntosFila>(`admin/c/comprasPuntos/${c}`).subscribe((f) => this.detalle.set(f)));
  }
  /** Simula lo que haría el aviso (webhook) de la pasarela: confirmar o rechazar un pago que quedó pendiente. */
  protected resolver(c: CompraPuntosFila, resultado: 'aprobado' | 'rechazado') {
    this.api.post(`admin/compras-puntos/${c.codigo}/resolver`, { resultado }).subscribe({
      next: () => {
        this.toast.show(resultado === 'aprobado' ? `Pago ${c.codigo} confirmado y puntos acreditados` : `Pago ${c.codigo} rechazado`);
        this.pag.recargar();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'No se pudo resolver el pago.'),
    });
  }
  /** Descarga en CSV las operaciones de la página y filtros actuales. */
  protected exportar() {
    descargarTabla('compras-de-puntos', [['Operación', 'Fecha', 'Participante', 'Correo', 'Puntos', 'Monto', 'Estado'], ...this.pag.items().map((c) => [c.codigo, c.fecha, c.cliente, c.email, c.cantidad, c.monto, c.estado])], 'Compras de puntos');
  }
}
