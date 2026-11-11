import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { formatUSD } from "../core/format";
import { formatear, variacion, type Dashboard, type KpiReporte } from "../core/reportes-tipos";
import { IconComponent } from "../shared/icon.component";
import { AdminModalComponent, BtnDirective, ChartComponent, DonaComponent, PageHeaderComponent, PanelComponent, PeriodFilterComponent, PillComponent, StatComponent, type Periodo } from "./kit";

type Pedido = Dashboard["pedidos"][number];
type Mensaje = Dashboard["mensajes"][number];

/**
 * Widgets del Dashboard. Cada uno declara su título y cuánto ancho ocupa; agregar uno nuevo es agregar una entrada aquí
 * y su bloque en la plantilla. La persona elige cuáles ver (se recuerda en este navegador).
 */
const WIDGETS = [
  { id: "alertas", titulo: "Requiere atención", ancho: 3 },
  { id: "serie", titulo: "Monto pagado en el tiempo", ancho: 2 },
  { id: "embudo", titulo: "Embudo de compra", ancho: 1 },
  { id: "pedidos", titulo: "Últimas compras", ancho: 2 },
  { id: "mensajes", titulo: "Mensajes sin atender", ancho: 1 },
  { id: "top", titulo: "Más comprados", ancho: 1 },
  { id: "canales", titulo: "Participantes activos por canal", ancho: 1 },
] as const;
type WidgetId = (typeof WIDGETS)[number]["id"];
const CLAVE_OCULTOS = "bs-dash-ocultos";
const col = (ancho: number) => (ancho === 3 ? "md:col-span-2 xl:col-span-3" : ancho === 2 ? "md:col-span-2" : "");

@Component({
  selector: "a-dashboard-page",
  imports: [RouterLink, PageHeaderComponent, PeriodFilterComponent, StatComponent, PanelComponent, PillComponent, ChartComponent, DonaComponent, BtnDirective, IconComponent, AdminModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Dashboard" [desc]="'Actividad del programa en web y app · ' + etiqueta()">
      <a-period-filter [(per)]="per" [(desde)]="desde" [(hasta)]="hasta" />
      <button aBtn variant="outline" (click)="personalizar.set(true)"><app-icon name="SlidersHorizontal" class="h-4 w-4" /> Personalizar</button>
    </a-header>

    @if (error()) {
      <div role="alert" class="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
        <p class="font-semibold text-destructive">{{ error() }}</p>
        <button aBtn variant="outline" class="mt-3" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (!d()) {
      <div role="status" aria-label="Cargando" aria-busy="true" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (n of [1, 2, 3, 4, 5, 6]; track n) { <div class="skeleton h-28 rounded-2xl" aria-hidden="true"></div> }
        <div class="skeleton h-72 rounded-2xl sm:col-span-2 xl:col-span-3" aria-hidden="true"></div>
      </div>
    }

    @if (d(); as d) {
      <div class="flex flex-wrap gap-3 [&>*]:min-w-[min(100%,14rem)] [&>*]:flex-1" aria-label="Indicadores del período">
        @for (k of d.kpis; track k.id) {
          <a [routerLink]="['/admin/reportes']" [queryParams]="{ tipo: d.enlaces[k.id] }" class="block min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring" [attr.aria-label]="k.etiqueta + ': ver el reporte'">
            <a-stat [label]="k.etiqueta" [value]="fmt(k)" [hint]="hint(k)" [icon]="k.icono" class="h-full transition-colors hover:border-primary" />
          </a>
        }
      </div>

      <div class="mt-6 grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        @for (w of visibles(); track w.id) {
          <div [class]="'min-w-0 ' + col(w.ancho)">
            @switch (w.id) {
              @case ("alertas") {
                <a-panel [title]="w.titulo">
                  @if (d.alertas.length) {
                    <ul class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      @for (a of d.alertas; track a.id) {
                        <li>
                          <a [routerLink]="a.enlace" class="flex h-full items-start gap-3 rounded-xl border border-border p-3 hover:border-primary">
                            <span [class]="'grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-2 text-sm font-bold ' + (a.nivel === 'alta' ? 'bg-destructive/15 text-destructive' : a.nivel === 'media' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')">{{ a.cantidad }}</span>
                            <span class="min-w-0"><span class="block text-sm font-semibold">{{ a.titulo }}</span><span class="block text-xs text-muted-foreground">{{ a.detalle }}</span></span>
                          </a>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="flex items-center gap-2 py-4 text-sm text-muted-foreground"><app-icon name="CheckCircle2" class="h-5 w-5 text-primary" /> Todo al día: no hay pendientes.</p>
                  }
                </a-panel>
              }
              @case ("serie") {
                <a-panel [title]="w.titulo">
                  <a actions routerLink="/admin/reportes" [queryParams]="{ tipo: 'resumen' }" class="text-sm font-semibold text-primary">Ver reporte</a>
                  <a-chart type="bar" [labels]="d.serie.map(s => s.x)" [series]="serieVentas()" />
                </a-panel>
              }
              @case ("embudo") {
                <a-panel [title]="w.titulo">
                  <a actions routerLink="/admin/reportes" [queryParams]="{ tipo: 'embudo' }" class="text-sm font-semibold text-primary">Ver reporte</a>
                  @if (d.embudo[0]!.visitas) {
                    <a-chart type="bar" [horizontal]="true" [labels]="d.embudo.map(e => e.etiqueta)" [series]="[{ label: 'Visitas', data: d.embudo.map(e => e.visitas), color: '--primary' }]" />
                  } @else { <p class="adm-empty">Sin visitas con analítica en este rango.</p> }
                </a-panel>
              }
              @case ("pedidos") {
                <a-panel [title]="w.titulo">
                  <a actions routerLink="/admin/pedidos" class="text-sm font-semibold text-primary">Ver todos</a>
                  <div class="adm-wrap">
                    <table class="adm-table" aria-label="Últimas compras">
                      <thead><tr><th>Código</th><th>Estado</th><th>Fecha</th><th>Participante</th><th>Monto</th><th aria-label="Detalle"></th></tr></thead>
                      <tbody>
                        @for (p of d.pedidos; track p.codigo) {
                          <tr>
                            <td><button type="button" class="font-bold hover:underline" (click)="pedido.set(p)">{{ p.codigo }}</button></td>
                            <td class="det-completo det-chip"><a-pill [tone]="p.estadoAdmin === 'Anulado' ? 'bad' : 'ok'">{{ p.estadoAdmin }}</a-pill></td>
                            <td>{{ p.fecha }}</td><td>{{ p.cliente }}</td><td>{{ usd(p.montoUSD) }}</td>
                            <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle del pedido ' + p.codigo" title="Ver detalle" (click)="pedido.set(p)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
                          </tr>
                        } @empty { <tr><td colspan="6" class="adm-empty">Todavía no hay compras.</td></tr> }
                      </tbody>
                    </table>
                  </div>
                </a-panel>
              }
              @case ("mensajes") {
                <a-panel [title]="w.titulo">
                  <a actions routerLink="/admin/atencion" class="text-sm font-semibold text-primary">Atender</a>
                  <ul class="space-y-2">
                    @for (m of d.mensajes; track m.id) {
                      <li><button type="button" class="block w-full rounded-xl bg-muted/50 p-3 text-left hover:bg-muted" (click)="mensaje.set(m)">
                        <span class="block text-sm font-semibold">{{ m.asunto }}</span><span class="block text-xs text-muted-foreground">{{ m.nombre }} · {{ m.fecha }}</span></button></li>
                    } @empty { <li class="py-4 text-sm text-muted-foreground">No hay mensajes pendientes.</li> }
                  </ul>
                </a-panel>
              }
              @case ("top") {
                <a-panel [title]="w.titulo">
                  <a actions routerLink="/admin/reportes" [queryParams]="{ tipo: 'canjes' }" class="text-sm font-semibold text-primary">Ver reporte</a>
                  @if (d.topCompras.length) { <a-chart type="bar" [horizontal]="true" [labels]="d.topCompras.map(t => t.name)" [series]="[{ label: 'Unidades', data: d.topCompras.map(t => t.unidades), color: '--primary' }]" /> }
                  @else { <p class="adm-empty">Sin compras en este rango.</p> }
                </a-panel>
              }
              @case ("canales") {
                <a-panel [title]="w.titulo">
                  <a actions routerLink="/admin/reportes" [queryParams]="{ tipo: 'participantes' }" class="text-sm font-semibold text-primary">Ver reporte</a>
                  @if (d.canales.length) { <a-dona [labels]="d.canales.map(c => c.name)" [data]="d.canales.map(c => c.value)" nombre="Participantes" /> }
                  @else { <p class="adm-empty">Sin actividad en este rango.</p> }
                </a-panel>
              }
            }
          </div>
        }
      </div>
    }

    <a-modal [open]="!!pedido()" [wide]="true" [title]="'Compra ' + (pedido()?.codigo ?? '')" (closed)="pedido.set(null)">
      @if (pedido(); as p) {
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Participante</dt><dd class="text-sm font-semibold">{{ p.cliente }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Fecha</dt><dd class="text-sm font-semibold">{{ p.fecha }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Estado</dt><dd><a-pill [tone]="p.estadoAdmin === 'Anulado' ? 'bad' : 'ok'">{{ p.estadoAdmin }}</a-pill></dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Pagado con tarjeta</dt><dd class="text-sm font-semibold">{{ usd(p.montoUSD) }}</dd></div>
          @if (p.entrega) { <div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted-foreground">Entrega</dt><dd class="text-sm font-semibold">{{ p.entrega }}</dd></div> }
        </dl>
        <h3 class="mb-2 mt-5 text-sm font-bold">Beneficios</h3>
        <ul class="divide-y divide-border rounded-xl border border-border text-sm">
          @for (i of p.items; track $index) { <li class="flex justify-between gap-3 px-3 py-2"><span>{{ i.cantidad }} × {{ i.nombre }}</span><span class="text-muted-foreground">{{ i.marca }}</span></li> }
        </ul>
        <div class="det-pie"><a routerLink="/admin/pedidos" class="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Gestionar en Compras</a></div>
      }
    </a-modal>

    <a-modal [open]="!!mensaje()" [wide]="true" [title]="mensaje()?.asunto ?? ''" (closed)="mensaje.set(null)">
      @if (mensaje(); as m) {
        <p class="text-sm text-muted-foreground">{{ m.nombre }} · {{ m.email }} · {{ m.fecha }}</p>
        <p class="mt-3 whitespace-pre-line rounded-xl bg-muted/50 p-4 text-sm">{{ m.mensaje }}</p>
        <div class="det-pie" style="justify-content:space-between"><a-pill [tone]="m.estado === 'Nuevo' ? 'warn' : 'info'">{{ m.estado }}</a-pill>
          <a routerLink="/admin/atencion" class="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">Responder en Atención</a></div>
      }
    </a-modal>

    <a-modal [open]="personalizar()" title="Personalizar el Dashboard" (closed)="personalizar.set(false)">
      <p class="mb-3 text-sm text-muted-foreground">Elige qué bloques ver. Se recuerda en este navegador; los indicadores de arriba siempre se muestran.</p>
      <ul class="space-y-1">
        @for (w of widgets; track w.id) {
          <li><label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted">
            <input type="checkbox" class="h-4 w-4" [checked]="!ocultos().includes(w.id)" (change)="alternar(w.id)" /> <span class="text-sm font-medium">{{ w.titulo }}</span></label></li>
        }
      </ul>
      <div class="det-pie" style="justify-content:space-between">
        <button aBtn variant="outline" (click)="restablecer()">Mostrar todos</button>
        <button aBtn (click)="personalizar.set(false)">Listo</button>
      </div>
    </a-modal>
  `,
})
export class DashboardPage {
  private readonly api = inject(ApiService);
  /** "Hoy" del programa (los períodos rápidos terminan ahí); null mientras carga o si falló. */
  private readonly hoy = signal<string | null>(null);
  protected readonly widgets = WIDGETS;
  protected readonly col = col;
  protected readonly usd = formatUSD;
  protected readonly per = signal<Periodo>("6m");
  protected readonly desde = signal("2026-10-01");
  protected readonly hasta = signal("2026-10-28");
  protected readonly d = signal<Dashboard | null>(null);
  protected readonly error = signal("");
  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly mensaje = signal<Mensaje | null>(null);
  protected readonly personalizar = signal(false);
  protected readonly ocultos = signal<WidgetId[]>(leerOcultos());
  protected readonly visibles = computed(() => WIDGETS.filter((w) => !this.ocultos().includes(w.id)));
  private secuencia = 0;

  /** Los períodos rápidos terminan en "hoy" del programa; "Rango" usa las fechas elegidas. */
  private readonly rango = computed(() => {
    const hoy = this.hoy();
    if (this.per() === "rango") return { desde: this.desde(), hasta: this.hasta() };
    if (!hoy) return null;
    const dias = { "7d": 7, "30d": 30, "90d": 90, "6m": 183, rango: 0 }[this.per()];
    return { desde: new Date(new Date(hoy + "T00:00:00Z").getTime() - (dias - 1) * 864e5).toISOString().slice(0, 10), hasta: hoy };
  });
  protected readonly etiqueta = computed(() => {
    const r = this.rango();
    return r ? `${r.desde} a ${r.hasta}` : "Cargando…";
  });

  constructor() {
    this.cargarMeta();
    effect(() => {
      if (this.rango()) this.cargar();
    });
  }

  private cargarMeta() {
    this.api.get<{ hoy: string }>("admin/meta").subscribe({
      next: (m) => this.hoy.set(m.hoy),
      error: () => this.error.set("No pudimos cargar los datos. Revisa tu conexión e inténtalo otra vez."),
    });
  }

  protected cargar() {
    const r = this.rango();
    if (!r) {
      this.error.set("");
      this.cargarMeta();
      return;
    }
    const n = ++this.secuencia;
    this.error.set("");
    this.api.get<Dashboard>("admin/dashboard", { desde: r.desde, hasta: r.hasta }).subscribe({
      next: (x) => { if (n === this.secuencia) this.d.set(x); },
      // Un rango no válido (p. ej. fecha inicial posterior a la final) se explica; el resto es un fallo de conexión.
      error: (e) => { if (n === this.secuencia) { this.d.set(null); this.error.set(e?.status === 422 ? (e.error?.message ?? "Rango de fechas no válido.") : "No pudimos cargar los datos. Revisa tu conexión e inténtalo otra vez."); } },
    });
  }

  protected fmt(k: KpiReporte) {
    return formatear(k.formato, k.valor);
  }
  protected hint(k: KpiReporte) {
    return k.previo === null ? "" : `${variacion(k.valor, k.previo)} vs. anterior (${formatear(k.formato, k.previo)})`;
  }
  protected readonly serieVentas = computed(() => {
    const s = this.d()?.serie ?? [];
    return [
      { label: "Período actual", data: s.map((x) => x.ventas), color: "--primary", fill: true },
      { label: "Período anterior", data: s.map((x) => x.ventasPrevio), color: "--muted-foreground" },
    ];
  });

  protected alternar(id: WidgetId) {
    this.ocultos.update((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
    guardarOcultos(this.ocultos());
  }
  protected restablecer() {
    this.ocultos.set([]);
    guardarOcultos([]);
  }
}

function leerOcultos(): WidgetId[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_OCULTOS) ?? "[]") as unknown;
    return Array.isArray(v) ? (v.filter((x) => WIDGETS.some((w) => w.id === x)) as WidgetId[]) : [];
  } catch {
    return [];
  }
}
function guardarOcultos(v: WidgetId[]) {
  try {
    localStorage.setItem(CLAVE_OCULTOS, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: vale solo en esta visita */
  }
}
