import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { leer } from "../core/leer";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { CatalogService } from "../core/catalog.service";
import { StoreService } from "../core/store.service";
import { BrandService } from "../core/brand.service";
import { estadoLabels, tipoLabels } from "../core/labels";
import { formatPuntos, formatUSD, nivelPorPuntos } from "../core/format";
import type { BeneficioUsuario, Compra, EstadoBeneficio, Movimiento, Notificacion, TipoMovimiento } from "../core/models";
import { haceTiempo } from "../core/tiempo";
import { descargarBlob } from "../core/pdf-cotizacion";
import { pdfEstadoCuenta } from "../core/pdf-estado-cuenta";
import { ToastService } from "../shared/toast";
import { ICONO_NOTIFICACION } from "../shared/notificaciones";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import { NivelResumenCardComponent } from "../shared/widgets";

/* ------------------------------------------------------------------ */
/* Mi nivel                                                            */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-mi-nivel-page",
  imports: [IconComponent, NivelResumenCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Mi nivel</h1>
        <p class="mt-2 max-w-2xl text-base text-muted-foreground">
          {{ catalog.subtituloNiveles() }}
          Llevas <strong class="text-ink">{{ puntos(puntosNivel()) }}</strong> {{ brand.unidad() }} acumulados en el periodo.
        </p>

        <div class="mt-7"><app-nivel-resumen-card [puntos]="puntosNivel()" /></div>

        <h2 class="mt-10 text-xl font-extrabold text-ink lg:text-2xl">Rangos y beneficios por nivel</h2>
        <div class="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          @for (n of catalog.niveles(); track n.id; let i = $index) {
            <article class="flex flex-col rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]"
              [class.ring-2]="n.id === actual()?.id" [style.--tw-ring-color]="n.id === actual()?.id ? n.color : null">
              <span class="grid h-12 w-12 place-items-center rounded-full" [style.background]="n.color + '22'">
                <app-icon name="Gem" class="h-6 w-6" [style.color]="n.color" />
              </span>
              <h3 class="mt-4 text-lg font-extrabold text-ink">{{ n.nombre }}</h3>
              <p class="text-base text-muted-foreground">{{ puntos(n.desde) }}{{ n.hasta ? ' – ' + puntos(n.hasta) : ' a más' }} {{ brand.unidad() }}</p>
              <ul class="mt-4 space-y-2 text-base text-muted-foreground">
                @for (b of n.beneficios; track b) {
                  <li class="flex gap-2">
                    @if (i <= idxActual()) {
                      <app-icon name="Check" class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    } @else {
                      <app-icon name="Lock" class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/60" />
                    }
                    {{ b }}
                  </li>
                }
              </ul>
              @if (n.id === actual()?.id) {
                <p class="mt-4 text-base font-bold" [style.color]="n.color">Tu nivel actual</p>
              }
            </article>
          }
        </div>
      </div>
    </div>
  `,
})
export class MiNivelPage {
  protected readonly catalog = inject(CatalogService);
  protected readonly brand = inject(BrandService);
  private readonly store = inject(StoreService);
  protected readonly puntos = formatPuntos;
  protected readonly puntosNivel = computed(() => this.store.usuario().puntosNivel);
  protected readonly actual = computed(() => {
    const n = this.catalog.niveles();
    return n.length ? nivelPorPuntos(n, this.puntosNivel()) : null;
  });
  protected readonly idxActual = computed(() => this.catalog.niveles().findIndex((n) => n.id === this.actual()?.id));
}

/* ------------------------------------------------------------------ */
/* Mis beneficios                                                      */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-mis-beneficios-page",
  imports: [RouterLink, IconComponent, LimpiarFiltrosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Mis beneficios</h1>
        <p class="mt-2 max-w-2xl text-base text-muted-foreground">
          Historial de los cupones que has generado. Los activos pueden presentarse en el comercio antes de su vencimiento.
        </p>

        <div class="mt-7 grid gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div class="relative min-w-0">
            <label for="buscar-beneficios" class="sr-only">Buscar beneficio</label>
            <input id="buscar-beneficios" type="search" [value]="q()" (input)="q.set($any($event.target).value)"
              placeholder="Buscar por marca, beneficio o código"
              class="h-12 w-full rounded-full bg-muted pl-5 pr-12 text-base text-ink outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50" />
            <app-icon name="Search" class="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
          </div>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            @for (f of filtros; track f.value) {
              <button type="button" (click)="estado.set(f.value)" [attr.aria-pressed]="estado() === f.value"
                [class]="'min-h-11 rounded-full px-5 text-base font-semibold transition-colors lg:min-h-14 ' + (estado() === f.value ? 'bg-primary text-primary-foreground' : 'border border-border text-ink hover:border-primary hover:text-primary')">
                {{ f.label }}
              </button>
            }
            <app-limpiar-filtros [activo]="!!q() || estado() !== 'todos'" (limpiar)="q.set(''); estado.set('todos')" />
          </div>
        </div>

        <div class="mt-6 grid gap-4">
          @for (x of lista(); track x.mb.id) {
            <article class="grid gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
              <img [src]="x.b.imagen" [alt]="x.b.marca" class="h-24 w-full rounded-xl object-cover sm:h-24 sm:w-24" loading="lazy" />
              <div class="min-w-0">
                <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ x.b.marca }}</p>
                <h2 class="text-base font-extrabold text-ink">{{ x.b.nombre }}</h2>
                <p class="mt-1 text-base text-muted-foreground">Código {{ x.mb.codigo }} · Generado el {{ x.mb.fecha }}</p>
                <p class="text-base text-muted-foreground">Vence: {{ x.mb.vence }}</p>
              </div>
              <div class="flex flex-col items-start gap-3 sm:items-end">
                <span [class]="'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ' + estadoClase[x.mb.estado]">
                  <app-icon name="Ticket" class="h-4 w-4" />
                  {{ estadoLabels[x.mb.estado] }}
                </span>
                <a [routerLink]="['/beneficios', x.b.id]"
                  class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">
                  <app-icon name="QrCode" class="h-4 w-4" />
                  Ver detalles
                </a>
              </div>
            </article>
          }
          @if (lista().length === 0) {
            <p class="rounded-2xl bg-card p-8 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">No hay beneficios con ese criterio.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class MisBeneficiosPage {
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  private readonly mis = leer(this.api.get<BeneficioUsuario[]>("me/beneficios"), [] as BeneficioUsuario[]);

  protected readonly estadoLabels = estadoLabels;
  protected readonly estadoClase: Record<EstadoBeneficio, string> = {
    activo: "bg-lima/25 text-ink",
    usado: "bg-secondary text-secondary-foreground",
    vencido: "bg-muted text-muted-foreground",
  };
  protected readonly filtros: { value: EstadoBeneficio | "todos"; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "activo", label: "Activos" },
    { value: "usado", label: "Usados" },
    { value: "vencido", label: "Vencidos" },
  ];

  protected readonly q = signal("");
  protected readonly estado = signal<EstadoBeneficio | "todos">("todos");

  protected readonly lista = computed(() => {
    const t = this.q().trim().toLowerCase();
    const estado = this.estado();
    return this.mis()
      .map((mb) => ({ mb, b: this.catalog.beneficioPorId(mb.beneficioId) }))
      .filter((x): x is { mb: BeneficioUsuario; b: NonNullable<typeof x.b> } => {
        if (!x.b) return false;
        if (estado !== "todos" && x.mb.estado !== estado) return false;
        return !t || `${x.b.nombre} ${x.b.marca} ${x.mb.codigo}`.toLowerCase().includes(t);
      });
  });
}

/* ------------------------------------------------------------------ */
/* Mis compras                                                         */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-mis-compras-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Historial de compras y canjes</h1>
        <p class="mt-2 max-w-2xl text-base text-muted-foreground">Revisa el detalle de cada pedido, su estado y la forma de pago utilizada.</p>

        <div class="relative mt-7 max-w-xl">
          <label for="buscar-compras" class="sr-only">Buscar compra</label>
          <input id="buscar-compras" type="search" [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Buscar por código o producto"
            class="h-12 w-full rounded-full bg-card pl-5 pr-12 text-base text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50" />
          <app-icon name="Search" class="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
        </div>

        <div class="mt-6 grid gap-4">
          @for (c of lista(); track c.codigo) {
            <article class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
              <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div class="min-w-0">
                  <p class="text-base text-muted-foreground">Pedido {{ c.codigo }} · {{ c.fecha }}@if (c.hora) { · {{ c.hora }} }</p>
                  <h2 class="truncate text-base font-extrabold text-ink">{{ nombres(c) }}</h2>
                  <p class="text-base text-muted-foreground">{{ puntos(c.puntosUsados) }} puntos{{ c.montoUSD > 0 ? ' + ' + usd(c.montoUSD) : '' }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <span class="rounded-full bg-secondary px-4 py-1.5 text-sm font-bold text-secondary-foreground">{{ c.estado }}</span>
                  <a [routerLink]="['/mis-compras', c.codigo]"
                    class="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">Ver detalles</a>
                </div>
              </div>
              <div class="mt-4 flex gap-2">
                @for (i of c.items; track i.nombre) { <img [src]="i.imagen" alt="" class="h-14 w-14 rounded-xl object-cover" /> }
              </div>
            </article>
          }
          @if (lista().length === 0) {
            <p class="rounded-2xl bg-card p-8 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">No encontramos compras con ese criterio.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class MisComprasPage {
  private readonly compras = leer(inject(ApiService).get<Compra[]>("me/compras"), [] as Compra[]);
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  protected readonly q = signal("");

  protected nombres(c: Compra) {
    return c.items.map((i) => i.nombre).join(", ");
  }
  protected readonly lista = computed(() => {
    const t = this.q().trim().toLowerCase();
    if (!t) return this.compras();
    return this.compras().filter((c) => c.codigo.toLowerCase().includes(t) || c.items.some((i) => `${i.nombre} ${i.marca}`.toLowerCase().includes(t)));
  });
}

@Component({
  selector: "app-detalle-compra-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <a routerLink="/mis-compras" class="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-primary">
          <app-icon name="ArrowLeft" class="h-4 w-4" /> Volver al historial
        </a>

        @if (compra(); as compra) {
          <div class="mt-4 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] lg:p-8">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 class="text-2xl font-extrabold text-ink">Pedido {{ compra.codigo }}</h1>
                <p class="mt-1 text-base text-muted-foreground">Realizado el {{ compra.fecha }}@if (compra.hora) { a las {{ compra.hora }} }</p>
              </div>
              <span class="rounded-full bg-secondary px-5 py-2 text-base font-bold text-secondary-foreground">{{ compra.estado }}</span>
            </div>

            <div class="mt-6 grid gap-4">
              @for (i of compra.items; track i.nombre) {
                <div class="flex items-center gap-4 rounded-2xl bg-surface p-4">
                  <img [src]="i.imagen" alt="" class="h-20 w-20 rounded-xl object-cover" />
                  <div class="min-w-0">
                    <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ i.marca }}</p>
                    <p class="text-base font-extrabold text-ink">{{ i.nombre }}</p>
                    <p class="text-base text-muted-foreground">Cantidad: {{ i.cantidad }} · {{ puntos(i.puntos * i.cantidad) }} puntos</p>
                  </div>
                </div>
              }
            </div>

            <dl class="mt-6 space-y-3 border-t border-border pt-6 text-base">
              <div class="flex justify-between gap-4"><dt class="text-muted-foreground">Entrega</dt><dd class="text-right font-semibold text-ink">{{ compra.entrega }}</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-muted-foreground">Puntos utilizados</dt><dd class="font-semibold text-ink">{{ puntos(compra.puntosUsados) }} puntos</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-muted-foreground">Pagado con tarjeta</dt><dd class="font-semibold text-ink">{{ usd(compra.montoUSD) }}</dd></div>
            </dl>
          </div>
        } @else if (compras()) {
          <p class="mt-6 rounded-2xl bg-card p-8 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">No encontramos ese pedido.</p>
        }
      </div>
    </div>
  `,
})
export class DetalleCompraPage {
  readonly codigo = input.required<string>();
  protected readonly compras = leer(inject(ApiService).get<Compra[] | undefined>("me/compras"), undefined);
  protected readonly compra = computed(() => this.compras()?.find((c) => c.codigo === this.codigo()));
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
}

/* ------------------------------------------------------------------ */
/* Historial de puntos                                                 */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-historial-puntos-page",
  imports: [IconComponent, NivelResumenCardComponent, LimpiarFiltrosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Historial de puntos</h1>
        <p class="mt-2 max-w-2xl text-base text-muted-foreground">Revisa el movimiento de tus puntos por periodo y descarga tu estado de cuenta.</p>

        <div class="mt-7"><app-nivel-resumen-card [puntos]="store.usuario().puntosNivel" /></div>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <span class="flex items-center gap-2 text-base text-muted-foreground"><app-icon name="PiggyBank" class="h-5 w-5 text-primary" /> Saldo actual</span>
            <p class="mt-2 text-2xl font-extrabold text-primary">{{ puntos(store.puntos()) }}</p>
          </div>
          <div class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <span class="text-base text-muted-foreground">Ganados en el periodo</span>
            <p class="mt-2 text-2xl font-extrabold text-ink">+{{ puntos(ganados()) }}</p>
          </div>
          <div class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
            <span class="text-base text-muted-foreground">Usados en el periodo</span>
            <p class="mt-2 text-2xl font-extrabold text-ink">{{ puntos(usados()) }}</p>
          </div>
        </div>

        <div class="mt-6 grid gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <label class="text-base font-semibold text-ink">
            Desde
            <input type="date" [value]="desde()" (input)="desde.set($any($event.target).value)"
              class="mt-1 h-12 w-full rounded-xl border border-border px-4 text-base text-ink focus:ring-2 focus:ring-primary/50" />
          </label>
          <label class="text-base font-semibold text-ink">
            Hasta
            <input type="date" [value]="hasta()" (input)="hasta.set($any($event.target).value)"
              class="mt-1 h-12 w-full rounded-xl border border-border px-4 text-base text-ink focus:ring-2 focus:ring-primary/50" />
          </label>
          <label class="text-base font-semibold text-ink">
            Tipo de movimiento
            <select [value]="tipo()" (change)="tipo.set($any($event.target).value)"
              class="select-field mt-1 h-12 w-full rounded-xl border border-border bg-card px-4 text-base text-ink focus:ring-2 focus:ring-primary/50">
              @for (t of tipos; track t) {
                <option [value]="t" [selected]="t === tipo()">{{ t === "todos" ? "Todos" : tipoLabels[t] }}</option>
              }
            </select>
          </label>
          <app-limpiar-filtros [activo]="filtrosActivos()" (limpiar)="restablecerFiltros()" />
          <button type="button" (click)="descargar()" [disabled]="generando()" [attr.aria-busy]="generando()"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-all hover:scale-[1.03] hover:bg-primary/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95 disabled:cursor-wait disabled:opacity-70 disabled:hover:scale-100 lg:min-h-14">
            @if (generando()) {
              <span class="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true"></span> Generando PDF…
            } @else {
              <app-icon name="ArrowDownToLine" class="h-5 w-5" />
              Estado de cuenta
            }
          </button>
        </div>

        <!-- Móvil: tarjetas -->
        <ul class="mt-6 grid gap-3 lg:hidden">
          @for (m of lista(); track m.id) {
            <li class="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
              <div class="flex items-start justify-between gap-3">
                <p class="min-w-0 text-base font-semibold text-ink">{{ m.detalle }}</p>
                <p [class]="'shrink-0 text-base font-extrabold ' + (m.puntos > 0 ? 'text-primary' : 'text-ink')">{{ m.puntos > 0 ? "+" : "" }}{{ puntos(m.puntos) }}</p>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span class="rounded-full bg-surface px-3 py-1 font-semibold text-ink">{{ tipoLabels[m.tipo] }}</span>
                <span>{{ m.fecha }}</span>
              </div>
            </li>
          }
          @if (lista().length === 0) {
            <li class="rounded-2xl bg-card p-6 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">No hay movimientos en el rango seleccionado.</li>
          }
        </ul>

        <!-- Desktop: tabla -->
        <div class="mt-6 hidden overflow-x-auto rounded-2xl bg-card shadow-[var(--shadow-card)] lg:block">
          <table class="w-full min-w-[640px] text-left text-base">
            <caption class="sr-only">Movimientos de puntos del periodo seleccionado</caption>
            <thead class="bg-surface text-sm uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" class="px-5 py-4">Fecha</th>
                <th scope="col" class="px-5 py-4">Detalle</th>
                <th scope="col" class="px-5 py-4">Tipo</th>
                <th scope="col" class="px-5 py-4 text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              @for (m of lista(); track m.id) {
                <tr class="border-t border-border">
                  <td class="px-5 py-4 text-muted-foreground">{{ m.fecha }}</td>
                  <td class="px-5 py-4 font-semibold text-ink">{{ m.detalle }}</td>
                  <td class="px-5 py-4 text-muted-foreground">{{ tipoLabels[m.tipo] }}</td>
                  <td [class]="'px-5 py-4 text-right font-extrabold ' + (m.puntos > 0 ? 'text-primary' : 'text-ink')">{{ m.puntos > 0 ? "+" : "" }}{{ puntos(m.puntos) }}</td>
                </tr>
              }
              @if (lista().length === 0) {
                <tr><td colspan="4" class="px-5 py-8 text-center text-muted-foreground">No hay movimientos en el rango seleccionado.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class HistorialPuntosPage {
  protected readonly store = inject(StoreService);
  private readonly movimientos = leer(inject(ApiService).get<Movimiento[]>("me/movimientos"), [] as Movimiento[]);
  protected readonly puntos = formatPuntos;
  protected readonly tipoLabels = tipoLabels;
  protected readonly tipos: (TipoMovimiento | "todos")[] = ["todos", "acumulacion", "canje", "compra", "vencimiento", "ajuste"];

  protected readonly tipo = signal<TipoMovimiento | "todos">("todos");
  protected readonly desde = signal("2026-05-01");
  protected readonly hasta = signal("2026-12-31");
  /** El periodo por defecto no cuenta como filtro: solo lo que se cambió. */
  protected readonly filtrosActivos = computed(() => this.tipo() !== "todos" || this.desde() !== "2026-05-01" || this.hasta() !== "2026-12-31");
  protected restablecerFiltros() {
    this.tipo.set("todos");
    this.desde.set("2026-05-01");
    this.hasta.set("2026-12-31");
  }

  protected readonly lista = computed(() =>
    this.movimientos().filter((m) => (this.tipo() === "todos" || m.tipo === this.tipo()) && m.fechaISO >= this.desde() && m.fechaISO <= this.hasta()),
  );
  protected readonly ganados = computed(() => this.lista().filter((m) => m.puntos > 0).reduce((a, m) => a + m.puntos, 0));
  protected readonly usados = computed(() => this.lista().filter((m) => m.puntos < 0).reduce((a, m) => a + m.puntos, 0));

  private readonly toast = inject(ToastService);
  private readonly brand = inject(BrandService);
  protected readonly generando = signal(false);

  /** Genera el estado de cuenta en PDF con el periodo y los filtros que se están viendo. */
  protected descargar() {
    if (this.generando()) return;
    this.generando.set(true);
    // Deja pintar el estado "Generando" antes de armar el archivo.
    setTimeout(() => {
      try {
        const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        const f = (iso: string) => iso.split("-").reverse().join("/");
        const blob = pdfEstadoCuenta({
          programa: this.brand.programa(),
          participante: this.store.usuario().nombre,
          periodo: `${f(this.desde())} al ${f(this.hasta())}${this.tipo() !== "todos" ? ` - ${tipoLabels[this.tipo() as TipoMovimiento]}` : ""}`,
          generado: new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" }),
          color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#00bdd2",
          saldo: formatPuntos(this.store.puntos()),
          ganados: formatPuntos(this.ganados()),
          usados: formatPuntos(this.usados()),
          filas: this.lista().map((m) => ({ fecha: m.fecha, detalle: m.detalle, tipo: tipoLabels[m.tipo], puntos: m.puntos })),
          formatoPuntos: formatPuntos,
        });
        descargarBlob(blob, `estado-de-cuenta-puntos-${this.desde()}-${this.hasta()}.pdf`);
        this.toast.show("Estado de cuenta descargado");
      } catch {
        this.toast.error("No pudimos generar el estado de cuenta. Inténtalo de nuevo.");
      } finally {
        this.generando.set(false);
      }
    }, 120);
  }}

/* ------------------------------------------------------------------ */
/* Notificaciones                                                      */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-notificaciones-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Notificaciones</h1>
            <p class="mt-2 max-w-2xl text-base text-muted-foreground">Novedades de tus pedidos, puntos, beneficios y cotizaciones de vuelos.</p>
          </div>
          @if (store.noLeidas()) {
            <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90" (click)="store.marcarLeidas()">
              <app-icon name="CheckCheck" class="h-4 w-4" /> Marcar todas como leídas
            </button>
          }
        </div>

        <div role="tablist" aria-label="Filtro de notificaciones" class="mt-6 inline-flex rounded-full bg-card p-1 shadow-[var(--shadow-card)]">
          @for (t of tabs; track t.id) {
            <button role="tab" type="button" [attr.aria-selected]="filtro() === t.id" (click)="filtro.set(t.id)"
              [class]="'min-h-10 rounded-full px-5 text-sm font-bold ' + (filtro() === t.id ? 'bg-primary text-primary-foreground' : 'text-ink hover:bg-muted')">
              {{ t.label }}@if (t.id === 'sin-leer' && store.noLeidas()) { ({{ store.noLeidas() }}) }
            </button>
          }
        </div>

        <ul class="mt-6 grid gap-3">
          @for (n of lista(); track n.id) {
            <li>
              <a [routerLink]="n.enlace || '/notificaciones'" (click)="abrir(n)"
                [class]="'flex gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-muted/60 ' + (n.leida ? '' : 'ring-2 ring-primary/30')">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><app-icon [name]="icono[n.tipo]" class="h-5 w-5" /></span>
                <span class="min-w-0 flex-1">
                  <span class="block text-base text-ink" [class.font-extrabold]="!n.leida" [class.font-semibold]="n.leida">{{ n.titulo }}</span>
                  <span class="block text-base text-muted-foreground">{{ n.texto }}</span>
                  <span class="mt-1 block text-sm text-muted-foreground">{{ tiempo(n.fecha) }}</span>
                </span>
                @if (!n.leida) { <span class="mt-2 h-3 w-3 shrink-0 rounded-full bg-primary" aria-label="Sin leer"></span> }
              </a>
            </li>
          } @empty {
            <li class="rounded-2xl bg-card p-8 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">
              {{ filtro() === 'sin-leer' ? 'No tienes notificaciones sin leer.' : 'Todavía no tienes notificaciones.' }}
            </li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class NotificacionesPage {
  protected readonly store = inject(StoreService);
  protected readonly tiempo = haceTiempo;
  protected readonly icono = ICONO_NOTIFICACION;
  protected readonly tabs = [{ id: "todas" as const, label: "Todas" }, { id: "sin-leer" as const, label: "Sin leer" }];
  protected readonly filtro = signal<"todas" | "sin-leer">("todas");
  protected readonly lista = computed(() => this.store.notificaciones().filter((n) => this.filtro() === "todas" || !n.leida));

  constructor() {
    this.store.cargarNotificaciones();
  }
  protected abrir(n: Notificacion) {
    if (!n.leida) this.store.marcarLeidas([n.id]);
  }
}