import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import { ApiService } from "../core/api.service";
import { formatUSD } from "../core/format";
import { formatear, miles, variacion, type ColumnaReporte, type ReporteTipo, type TipoReporte } from "../core/reportes-tipos";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import { IconComponent } from "../shared/icon.component";
import {
  AdminModalComponent, BtnDirective, ChartComponent, DonaComponent, FilaEsqueletoComponent, INPUT_CLS, OrdenColumnaComponent, PageHeaderComponent, PagerComponent, PanelComponent,
  Paginado, PeriodFilterComponent, PillComponent, StatComponent, ToggleComponent, descargarTabla, descargarXlsx, periodos, type Pagina, type Periodo,
} from "./kit";

type Fila = Record<string, unknown>;

/** Color de la etiqueta de estado según su texto (verde = bien, ámbar = en curso, rojo = problema). */
const TONOS: Record<string, "ok" | "warn" | "bad" | "muted"> = {
  Aprobada: "ok", Enviado: "ok", Entregado: "ok", "Digital enviado": "ok", Activo: "ok", Cotizada: "ok", Aceptan: "ok",
  Pendiente: "warn", "En cola": "warn", Reintentando: "warn", Preparando: "warn", Confirmado: "warn", Enviada: "warn", "En revisión": "warn", acumulacion: "ok", compra: "ok",
  Fallida: "bad", Fallido: "bad", Rebotado: "bad", Bloqueado: "bad", Cancelado: "bad", Inactivo: "bad", Oculto: "muted",
};

/**
 * Reportes por tipo. La lista de tipos y el contenido de cada uno (indicadores, gráficos, tabla, filtros) los define la API:
 * esta pantalla solo los dibuja, así que un reporte nuevo aparece sin tocar el panel.
 */
@Component({
  selector: "a-reportes-page",
  imports: [RouterLink, PageHeaderComponent, PeriodFilterComponent, PanelComponent, ChartComponent, BtnDirective, IconComponent, StatComponent, ToggleComponent, DonaComponent, PagerComponent, OrdenColumnaComponent, FilaEsqueletoComponent, LimpiarFiltrosComponent, PillComponent, AdminModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="reportes" title="Reportes" [desc]="(actual()?.descripcion ?? '') + ' · ' + etiqueta()">
      <a-period-filter [(per)]="per" [(desde)]="desde" [(hasta)]="hasta" />
      <button aBtn variant="outline" [disabled]="!rep()" (click)="exportarExcel()"><app-icon name="FileSpreadsheet" class="h-4 w-4" /> Exportar Excel</button>
    </a-header>

    <div role="tablist" aria-label="Tipo de reporte" class="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
      @for (t of tipos(); track t.id) {
        <button type="button" role="tab" [attr.aria-selected]="tipoId() === t.id" [title]="t.descripcion" (click)="elegir(t.id)"
          [class]="'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold ' + (tipoId() === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')">
          <app-icon [name]="t.icono" class="h-4 w-4" /> {{ t.titulo }}
        </button>
      }
    </div>

    @if (rep(); as r) {
      @if (r.anterior) {
        <div class="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
          <a-toggle label="Comparar con el período anterior" [on]="comparar()" (onChange)="comparar.set($event)" />
          <span class="font-medium">Comparar con el período anterior</span>
          <span class="text-muted-foreground">({{ r.anterior.desde }} a {{ r.anterior.hasta }})</span>
        </div>
      } @else {
        <p class="mb-5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">Este reporte muestra el estado actual: no depende del período elegido.</p>
      }
    }
    @if (errorRep()) {
      <div role="alert" class="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm font-semibold text-destructive">
        {{ errorRep() }}
        @if (fallaRed()) { <button aBtn variant="outline" class="ml-3" (click)="reintentar()">Reintentar</button> }
      </div>
    } @else if (!rep()) {
      <div role="status" aria-label="Cargando" aria-busy="true" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (n of [1, 2, 3]; track n) { <div class="skeleton h-28 rounded-2xl" aria-hidden="true"></div> }
        <div class="skeleton h-72 rounded-2xl sm:col-span-2 lg:col-span-3" aria-hidden="true"></div>
      </div>
    }

    @if (rep(); as r) {
      <!-- Los indicadores se reparten el ancho: los de la última fila crecen para llenarlo (sin celdas vacías). -->
      <div class="mb-5 flex flex-wrap gap-3 [&>*]:min-w-[min(100%,13rem)] [&>*]:flex-1" aria-label="Indicadores del período">
        @for (k of r.kpis; track k.id) { <a-stat [label]="k.etiqueta" [value]="fmt(k.formato, k.valor)" [hint]="hint(k)" [icon]="k.icono" /> }
      </div>

      @if (lineales().length) {
        <div class="grid gap-5 lg:grid-cols-2">
          @for (g of lineales(); track g.id; let i = $index) {
            <a-panel [title]="g.titulo" [class]="i === 0 && (lineales().length % 2 === 1) ? 'lg:col-span-2' : ''">
              <div actions class="flex gap-2"><button aBtn variant="outline" [attr.aria-label]="'Descargar ' + g.titulo" (click)="exportarGrafico(g.id)"><app-icon name="Download" class="h-4 w-4" /> Descargar</button></div>
              @if (g.etiquetas.length) { <a-chart [type]="g.tipo" [horizontal]="!!g.horizontal" [labels]="g.etiquetas" [series]="g.series" alto="16rem" /> }
              @else { <p class="adm-empty">Sin datos en este rango.</p> }
            </a-panel>
          }
        </div>
      }
      <!-- Los anillos llevan su leyenda al lado y se reparten la fila (1, 2, 3… según cuántos haya). -->
      @if (anillos().length) {
        <div class="flex flex-wrap gap-5 [&>*]:min-w-[min(100%,21rem)] [&>*]:flex-1" [class.mt-5]="lineales().length">
          @for (g of anillos(); track g.id) {
            <a-panel [title]="g.titulo">
              <div actions class="flex gap-2"><button aBtn variant="outline" [attr.aria-label]="'Descargar ' + g.titulo" (click)="exportarGrafico(g.id)"><app-icon name="Download" class="h-4 w-4" /> Descargar</button></div>
              @if (g.etiquetas.length) { <a-dona [labels]="g.etiquetas" [data]="g.series[0]!.data" [nombre]="g.series[0]!.label" /> }
              @else { <p class="adm-empty">Sin datos en este rango.</p> }
            </a-panel>
          }
        </div>
      }

      @if (r.extra; as x) {
        <a-panel [title]="x.titulo" class="mt-6 block">
          @if (x.filas.length) {
            <div class="adm-wrap">
              <table class="adm-table" [attr.aria-label]="x.titulo">
                <thead><tr>@for (c of x.columnas; track c.k) { <th [class]="c.tipo === 'n' ? 'text-right' : ''">{{ c.l }}</th> }</tr></thead>
                <tbody>@for (f of x.filas; track $index) { <tr>@for (c of x.columnas; track c.k) { <td [class]="c.tipo === 'n' ? 'text-right' : 'adm-ancha'">{{ celda(c, f) }}</td> }</tr> }</tbody>
              </table>
            </div>
          } @else { <p class="adm-empty">Todavía no hay visitas con analítica en este rango.</p> }
        </a-panel>
      }

      @if (pag(); as p) {
        <a-panel [title]="r.tablaTitulo" class="mt-6 block">
          <div actions class="flex gap-2"><button aBtn variant="outline" [disabled]="exportando()" (click)="exportarTabla()"><app-icon name="Download" class="h-4 w-4" /> {{ exportando() ? 'Preparando…' : 'Exportar tabla' }}</button></div>
          <div class="adm-filtros">
            <div class="adm-busca"><app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" [attr.aria-label]="'Buscar en ' + r.tablaTitulo" placeholder="Buscar" [class]="input + ' pl-9'" [value]="p.q()" (input)="p.buscar($any($event.target).value)" /></div>
            @for (f of r.filtros; track f.k) {
              <select [attr.aria-label]="f.l" [class]="input + ' w-auto'" (change)="p.filtrar(f.k, $any($event.target).value)">
                <option value="">{{ f.l }}: todos</option>
                @for (o of f.opciones; track o.v) { <option [value]="o.v" [selected]="p.filtros()['f_' + f.k] === o.v">{{ o.l }}</option> }
              </select>
            }
            <app-limpiar-filtros [activo]="p.activo()" (limpiar)="limpiarTabla()" />
          </div>
          <div class="adm-wrap">
            <table class="adm-table" [attr.aria-label]="r.tablaTitulo">
              <thead><tr>
                @for (c of r.columnas; track c.k) { <th [class]="c.tipo === 'n' || c.tipo === 'usd' ? 'text-right' : ''" [aOrden]="c.ordenPor ?? c.k" [pag]="p" [etiquetaOrden]="c.l">{{ c.l }}</th> }
                <th aria-label="Detalle"></th>
              </tr></thead>
              <tbody>
                @for (f of p.items(); track $index) {
                  <tr>
                    @for (c of r.columnas; track c.k; let i = $index) {
                      <td [class]="tdClase(c)">
                        @if (c.tipo === 'estado') { <a-pill [tone]="tono(c, f)">{{ celda(c, f) }}</a-pill> }
                        @else if (i === 0 && r.gestion?.directo) { <a [routerLink]="enlaceGestion(f)" class="block text-left font-bold hover:underline">{{ celda(c, f) }}</a> }
                        @else if (i === 0) { <button type="button" class="text-left font-bold hover:underline" (click)="fila.set(f)">{{ celda(c, f) }}</button> }
                        @else { {{ celda(c, f) }} }
                      </td>
                    }
                    <td class="det-ojo">
                      @if (r.gestion?.directo) {
                        <a [routerLink]="enlaceGestion(f)" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver ficha de ' + celda(r.columnas[0]!, f)" title="Ver ficha"><app-icon name="Eye" class="h-4 w-4" /></a>
                      } @else {
                        <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle de ' + celda(r.columnas[0]!, f)" title="Ver detalle" (click)="fila.set(f)"><app-icon name="Eye" class="h-4 w-4" /></button>
                      }
                    </td>
                  </tr>
                } @empty {
                  @if (p.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="r.columnas.length + 1"></tr> } }
                  @else { <tr><td [attr.colspan]="r.columnas.length + 1" class="adm-empty">Sin resultados</td></tr> }
                }
              </tbody>
            </table>
          </div>
          <a-pager [p]="p" />
        </a-panel>
      }

      <a-modal [open]="!!fila()" [wide]="true" [title]="'Detalle · ' + r.tablaTitulo" (closed)="fila.set(null)">
        @if (fila(); as f) {
          <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            @for (c of r.columnas; track c.k) {
              <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ c.l }}</dt><dd class="mt-0.5 text-sm font-semibold text-ink">{{ celda(c, f) }}</dd></div>
            }
          </dl>
          @if (productos(f).length) {
            <h3 class="mb-2 mt-5 text-sm font-bold">Productos y beneficios del pedido</h3>
            <ul class="divide-y divide-border rounded-xl border border-border text-sm">
              @for (i of productos(f); track $index) { <li class="flex justify-between gap-3 px-3 py-2"><span>{{ i.cantidad }} × {{ i.nombre }}</span><span class="text-muted-foreground">{{ i.marca }}</span></li> }
            </ul>
          }
          @if (f['motivo']) { <p class="mt-4 rounded-xl bg-muted/60 p-3 text-sm"><b>Motivo:</b> {{ f['motivo'] }}</p> }
          @if (r.gestion; as g) {
            <div class="det-pie"><a [routerLink]="enlaceGestion(f)" class="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">{{ g.etiqueta }}</a></div>
          }
        }
      </a-modal>
    }
  `,
})
export class ReportesPage {
  private readonly api = inject(ApiService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly input = INPUT_CLS;

  protected readonly tipos = signal<TipoReporte[]>([]);
  /** "Hoy" del programa (los períodos rápidos terminan ahí); null mientras carga o si falló. */
  private readonly hoy = signal<string | null>(null);
  protected readonly tipoId = toSignal(this.ruta.queryParamMap.pipe(map((q) => q.get("tipo") ?? "resumen")), { initialValue: "resumen" });
  protected readonly actual = computed(() => this.tipos().find((t) => t.id === this.tipoId()));

  protected readonly per = signal<Periodo>("6m");
  protected readonly desde = signal("2026-10-01");
  protected readonly hasta = signal("2026-10-28");
  protected readonly comparar = signal(true);
  protected readonly rep = signal<ReporteTipo | null>(null);
  protected readonly errorRep = signal("");
  /** El último fallo fue de conexión o del servidor (se puede reintentar), no un rango de fechas no válido. */
  protected readonly fallaRed = signal(false);
  protected readonly pag = signal<Paginado<Fila> | null>(null);
  protected readonly fila = signal<Fila | null>(null);
  protected readonly exportando = signal(false);
  private secuencia = 0;

  /** Rango real: los períodos rápidos terminan en "hoy" del programa y "Rango" usa las fechas elegidas. */
  protected readonly rango = computed(() => {
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
  /** Los gráficos con serie del período anterior la ocultan si se apaga la comparación. */
  protected readonly graficos = computed(() => {
    const cmp = this.comparar();
    return (this.rep()?.graficos ?? []).map((g) => (cmp ? g : { ...g, series: g.series.filter((s) => !s.label.includes("(período anterior)")) }));
  });

  protected readonly lineales = computed(() => this.graficos().filter((g) => g.tipo !== "doughnut"));
  protected readonly anillos = computed(() => this.graficos().filter((g) => g.tipo === "doughnut"));

  constructor() {
    this.cargarMeta();
    this.cargarTipos();
    effect(() => {
      const r = this.rango();
      const id = this.tipoId();
      if (!r) return;
      const n = ++this.secuencia;
      this.errorRep.set("");
      this.cargarReporte(id, r, n);
    });
  }

  private cargarMeta() {
    this.api.get<{ hoy: string }>("admin/meta").subscribe({
      next: (m) => this.hoy.set(m.hoy),
      error: () => { this.fallaRed.set(true); this.errorRep.set("No pudimos cargar los datos. Revisa tu conexión e inténtalo otra vez."); },
    });
  }
  private cargarTipos() {
    this.api.get<TipoReporte[]>("admin/reportes/tipos").subscribe({ next: (t) => this.tipos.set(t), error: () => undefined });
  }
  protected reintentar() {
    this.errorRep.set("");
    if (!this.hoy()) this.cargarMeta();
    this.cargarTipos();
    const r = this.rango();
    if (r) this.cargarReporte(this.tipoId(), r, ++this.secuencia);
  }
  private cargarReporte(id: string, r: { desde: string; hasta: string }, n: number) {
    this.errorRep.set("");
    this.fallaRed.set(false);
    {
      this.api.get<ReporteTipo>(`admin/reportes/t/${id}`, { desde: r.desde, hasta: r.hasta }).subscribe({
        next: (x) => {
          if (n !== this.secuencia) return;
          this.rep.set(x);
          this.armarTabla(x);
        },
        error: (e) => {
          if (n !== this.secuencia) return;
          this.rep.set(null);
          this.pag.set(null);
          const rango = e?.status === 422;
          this.fallaRed.set(!rango);
          this.errorRep.set(rango ? (e?.error?.message ?? "Rango de fechas no válido.") : "No pudimos cargar los datos. Revisa tu conexión e inténtalo otra vez.");
        },
      });
    }
  }

  protected elegir(id: string) {
    this.fila.set(null);
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: { tipo: id === "resumen" ? null : id }, queryParamsHandling: "merge" });
  }

  /** La tabla pide a la API solo la página visible; el rango (si aplica) viaja como filtro de fechas. */
  private armarTabla(r: ReporteTipo) {
    if (!r.coleccion) {
      this.pag.set(null);
      return;
    }
    const p = new Paginado<Fila>(this.api, r.coleccion, 10, "admin/reportes/q/");
    if (r.tablaPorRango) p.filtros.set({ desde: r.desde, hasta: r.hasta });
    if (r.orden) { p.sort.set(r.orden.k); p.dir.set(r.orden.dir); } // lo más reciente primero
    this.pag.set(p);
    p.recargar();
  }
  protected limpiarTabla() {
    const p = this.pag();
    const r = this.rep();
    if (!p || !r) return;
    p.q.set("");
    p.filtros.set(r.tablaPorRango ? { desde: r.desde, hasta: r.hasta } : {});
    p.page.set(1);
    p.recargar();
  }

  protected fmt = formatear;
  protected hint(k: ReporteTipo["kpis"][number]) {
    if (!this.comparar() || k.previo === null) return "";
    return `${variacion(k.valor, k.previo)} vs. anterior (${formatear(k.formato, k.previo)})`;
  }

  protected celda(c: ColumnaReporte, f: Fila): string {
    const v = f[c.k];
    if (c.tipo === "cant") return Array.isArray(v) ? String(v.length) : "0";
    if (v === undefined || v === null || v === "") return "—";
    if (c.tipo === "n") return miles(Number(v)); // 9.600, no 9600
    if (c.tipo === "usd") return formatUSD(Number(v));
    // Si el registro trae la hora, va junto a la fecha.
    if (c.k === "fecha" && typeof f["hora"] === "string") return `${String(v)} · ${f["hora"]}`;
    return c.etiquetas?.[String(v)] ?? String(v);
  }
  /** Clases de la celda: ancho en la tarjeta (media fila o completa) y alineación de los números. */
  protected tdClase(c: ColumnaReporte) {
    if (c.ancho === "completo") return "det-completo" + (c.sinEtiqueta ? " det-chip" : "");
    if (c.ancho === "mitad") return "";
    return c.tipo === "n" || c.tipo === "usd" ? "text-right" : c.tipo === "estado" ? "" : "adm-ancha";
  }
  protected tono(c: ColumnaReporte, f: Fila) {
    return TONOS[String(f[c.k])] ?? "muted";
  }
  protected productos(f: Fila): { nombre: string; cantidad: number; marca?: string }[] {
    return Array.isArray(f["items"]) ? (f["items"] as { nombre: string; cantidad: number; marca?: string }[]) : [];
  }
  /** Las fichas de participantes tienen su propia página; el resto lleva al módulo. */
  protected enlaceGestion(f: Fila): string[] {
    const g = this.rep()?.gestion;
    if (!g) return ["/admin"];
    return this.rep()?.coleccion === "participantes" && f["id"] ? [g.ruta, String(f["id"])] : [g.ruta];
  }

  /* ---------------- Exportaciones ---------------- */
  /** Todas las filas que cumplen la búsqueda y los filtros actuales (hasta 2 000), pidiendo páginas de 200. */
  private async filasFiltradas(): Promise<Fila[]> {
    const p = this.pag();
    const r = this.rep();
    if (!p || !r) return [];
    const params: Record<string, string | number> = { size: 200 };
    if (p.q().trim()) params["q"] = p.q().trim();
    if (p.sort()) { params["sort"] = p.sort(); params["dir"] = p.dir(); }
    for (const [k, v] of Object.entries(p.filtros())) if (v) params[k] = v;
    const filas: Fila[] = [];
    for (let pagina = 1; pagina <= 10; pagina++) {
      const res = await firstValueFrom(this.api.get<Pagina<Fila>>(`admin/reportes/q/${r.coleccion}`, { ...params, page: pagina }));
      filas.push(...res.items);
      if (filas.length >= res.total) break;
    }
    return filas;
  }
  private tablaAHojas(r: ReporteTipo, filas: Fila[]): (string | number)[][] {
    return [r.columnas.map((c) => c.l), ...filas.map((f) => r.columnas.map((c) => (c.tipo === "n" || c.tipo === "usd" ? Number(f[c.k] ?? 0) : this.celda(c, f))))];
  }
  protected async exportarTabla() {
    const r = this.rep();
    if (!r) return;
    this.exportando.set(true);
    try {
      descargarTabla(`${r.id}_${r.desde}_a_${r.hasta}`, this.tablaAHojas(r, await this.filasFiltradas()), r.tablaTitulo, `${r.desde} a ${r.hasta}`);
    } finally {
      this.exportando.set(false);
    }
  }
  protected exportarGrafico(id: string) {
    const r = this.rep();
    const g = this.graficos().find((x) => x.id === id);
    if (!r || !g) return;
    descargarTabla(`${r.id}_${g.id}`, [["Detalle", ...g.series.map((s) => s.label)], ...g.etiquetas.map((e, i) => [e, ...g.series.map((s) => s.data[i] ?? 0)])], g.titulo, `${r.desde} a ${r.hasta}`);
  }
  /** Libro de Excel: indicadores (con el período anterior y la variación), un hoja por gráfico y el detalle filtrado. */
  protected async exportarExcel() {
    const r = this.rep();
    if (!r) return;
    const hojas: { nombre: string; filas: (string | number)[][] }[] = [
      { nombre: "Resumen", filas: [["Indicador", `Actual (${r.desde} a ${r.hasta})`, r.anterior ? `Anterior (${r.anterior.desde} a ${r.anterior.hasta})` : "", "Variación %"],
        ...r.kpis.map((k) => [k.etiqueta, k.valor, k.previo ?? "", k.previo ? Math.round(((k.valor - k.previo) / k.previo) * 1000) / 10 : ""])] },
      ...this.graficos().map((g) => ({ nombre: g.titulo.replace(/[\\/?*[\]:]/g, " ").slice(0, 31), filas: [["", ...g.series.map((s) => s.label)], ...g.etiquetas.map((e, i) => [e, ...g.series.map((s) => s.data[i] ?? 0)])] as (string | number)[][] })),
    ];
    if (r.extra) hojas.push({ nombre: r.extra.titulo.slice(0, 31), filas: [r.extra.columnas.map((c) => c.l), ...r.extra.filas.map((f) => r.extra!.columnas.map((c) => f[c.k] ?? ""))] });
    if (r.coleccion) hojas.push({ nombre: r.tablaTitulo.slice(0, 31), filas: this.tablaAHojas(r, await this.filasFiltradas()) });
    descargarXlsx(`reporte_${r.id}_${r.desde}_a_${r.hasta}.xlsx`, hojas);
  }

  protected readonly periodos = periodos;
}
