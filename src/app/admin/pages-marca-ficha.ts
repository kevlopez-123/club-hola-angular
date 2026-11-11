import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { map } from "rxjs/operators";
import { ApiService } from "../core/api.service";
import { formatUSD } from "../core/format";
import { IconComponent } from "../shared/icon.component";
import { MarcaEditorComponent } from "./marca-editor";
import { BarraListaComponent, ListaLocal } from "./lista-local";
import { OrdenColumnaComponent, PagerComponent, PillComponent, ToastService, ToggleComponent, descargarTabla } from "./kit";

type Marca = { id: string; nombre: string; logo: string; web: string; descripcion: string; activo: boolean };
type BeneficioMarca = { id: string; nombre: string; descuento: string; tipo: string; activo: boolean; imagen: string };
type CanjeMarca = { participanteId?: string; codigo: string; fecha: string; fechaISO: string; hora: string; cliente: string; estado: string; articulo: string; cantidad: number; monto: number };
type AuditoriaMarca = { fecha: string; usuario: string; accion: string; seccion: string };
type Actividad = { beneficios: BeneficioMarca[]; canjes: CanjeMarca[]; auditoria: AuditoriaMarca[] };

const TABS = [
  { k: "resumen", l: "Resumen" },
  { k: "beneficios", l: "Beneficios" },
  { k: "canjes", l: "Compras" },
  { k: "historial", l: "Historial" },
] as const;
type TabK = (typeof TABS)[number]["k"];

/**
 * Ficha de una marca aliada (/admin/marcas/:id): sus beneficios, las compras que incluyen artículos suyos y el historial
 * de cambios que la mencionan. Las marcas se enlazan con productos y beneficios por su nombre.
 */
@Component({
  selector: "a-marca-ficha-page",
  imports: [MarcaEditorComponent, RouterLink, IconComponent, PillComponent, ToggleComponent, BarraListaComponent, PagerComponent, OrdenColumnaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/admin/marcas" class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <app-icon name="ArrowLeft" class="h-4 w-4" /> Marcas aliadas
    </a>

    @if (marca(); as m) {
      <header class="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          @if (m.logo) { <img [src]="m.logo" [alt]="'Logo de ' + m.nombre" class="h-16 w-16 shrink-0 rounded-full border border-border bg-white object-contain p-1.5" /> }
          @else { <span class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-secondary text-lg font-extrabold text-primary" aria-hidden="true">{{ m.nombre.slice(0, 2).toUpperCase() }}</span> }
          <div class="min-w-0">
            <h1 class="text-2xl font-bold">{{ m.nombre }}</h1>
            <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              @if (m.web) { <a [href]="m.web" target="_blank" rel="noreferrer" class="text-primary hover:underline">{{ m.web }}</a> } @else { <span class="italic">Sin sitio web</span> }
              <a-pill [tone]="m.activo ? 'ok' : 'muted'">{{ m.activo ? 'Publicada' : 'Oculta' }}</a-pill>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-sm font-medium">
          <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 font-semibold hover:bg-muted" (click)="editando.set(m)"><app-icon name="Pencil" class="h-4 w-4" /> Editar marca</button>
          <a-toggle [label]="'Publicar ' + m.nombre" [on]="m.activo" (onChange)="publicar($event)" /> Publicada en el sitio
        </div>
      </header>

      <dl class="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4" aria-label="Resumen de la marca">
        <div class="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-card)]"><dt class="text-xs text-muted-foreground">Beneficios activos</dt><dd class="text-lg font-bold">{{ activos(act().beneficios) }} <span class="text-sm font-medium text-muted-foreground">de {{ act().beneficios.length }}</span></dd></div>
        <div class="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-card)]"><dt class="text-xs text-muted-foreground">Compras</dt><dd class="text-lg font-bold">{{ act().canjes.length }}</dd></div>
        <div class="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-card)]"><dt class="text-xs text-muted-foreground">Monto pagado</dt><dd class="text-lg font-bold">{{ usd(montoPagado()) }}</dd></div>
      </dl>

      <div class="mt-5 flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Secciones de la ficha">
        @for (t of tabs; track t.k) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.k" (click)="irA(t.k)"
            [class]="'h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ' + (tab() === t.k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')">
            {{ t.l }}@if (cuenta(t.k) !== null) { <span class="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold">{{ cuenta(t.k) }}</span> }
          </button>
        }
      </div>

      <div class="mt-6" role="tabpanel">
        @switch (tab()) {
          @case ("resumen") {
            <div class="grid gap-6 lg:grid-cols-2">
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="font-semibold">Sobre la marca</h2>
                <p class="mt-2 text-sm text-muted-foreground">{{ m.descripcion || 'Sin descripción.' }}</p>
                <button type="button" class="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-primary hover:underline" (click)="editando.set(m)"><app-icon name="Pencil" class="h-4 w-4" /> Editar logo, sitio web y descripción</button>
              </section>
              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="font-semibold">Últimas compras</h2>
                <ul class="mt-2 divide-y divide-border text-sm">
                  @for (c of ultimosCanjes(); track $index) {
                    <li class="flex items-center justify-between gap-3 py-2"><span><a routerLink="/admin/pedidos" [queryParams]="{ ver: c.codigo }" class="font-bold text-primary hover:underline">{{ c.codigo }}</a> · {{ c.articulo }}<span class="block text-xs text-muted-foreground">{{ c.fecha }} · {{ c.cliente }}</span></span><b>{{ usd(c.monto) }}</b></li>
                  } @empty { <li class="py-2 text-muted-foreground">Todavía no hay compras de esta marca.</li> }
                </ul>
                <button type="button" class="mt-2 text-sm font-semibold text-primary hover:underline" (click)="irA('canjes')">Ver todos</button>
              </section>
            </div>
          }
          @case ("beneficios") {
            <a-barra-lista [lista]="bens" etiqueta="beneficios" placeholder="Buscar beneficio" [filtros]="[{ k: 'estado', l: 'Estado' }]" (exportar)="exportarBeneficios()" />
            <div class="adm-wrap">
              <table class="adm-table" aria-label="Beneficios de la marca">
                <thead><tr><th aOrden="nombre" [pag]="bens" etiquetaOrden="Beneficio">Beneficio</th><th>Descuento</th><th>Tipo</th><th aOrden="estado" [pag]="bens" etiquetaOrden="Estado">Estado</th></tr></thead>
                <tbody>
                  @for (b of bens.items(); track b.id) {
                    <tr>
                      <td><span class="flex items-center gap-3">@if (b.imagen) { <img [src]="b.imagen" alt="" class="h-10 w-10 rounded-lg object-cover" /> }<a routerLink="/admin/beneficios" [queryParams]="{ ver: b.id }" class="font-bold text-primary hover:underline" [attr.aria-label]="'Ver el beneficio ' + b.nombre">{{ b.nombre }}</a></span></td>
                      <td>{{ b.descuento || '—' }}</td>
                      <td>{{ b.tipo || '—' }}</td>
                      <td class="det-completo det-chip"><a-pill [tone]="b.activo ? 'ok' : 'muted'">{{ b.activo ? 'Activo' : 'Inactivo' }}</a-pill></td>
                    </tr>
                  } @empty { <tr><td colspan="4" class="adm-empty">{{ act().beneficios.length ? 'Ningún beneficio coincide con la búsqueda.' : 'Esta marca no tiene beneficios.' }}</td></tr> }
                </tbody>
              </table>
            </div>
            <a-pager [p]="bens" />
            <a routerLink="/admin/beneficios" class="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Gestionar beneficios</a>
          }
          @case ("canjes") {
            <a-barra-lista [lista]="canj" etiqueta="compras" placeholder="Código, cliente o beneficio" [filtros]="[{ k: 'estado', l: 'Estado' }]" (exportar)="exportarCanjes()" />
            <div class="adm-wrap">
              <table class="adm-table" aria-label="Compras de la marca">
                <thead><tr><th aOrden="codigo" [pag]="canj" etiquetaOrden="Compra">Compra</th><th aOrden="estado" [pag]="canj" etiquetaOrden="Estado">Estado</th><th aOrden="fecha" [pag]="canj" etiquetaOrden="Fecha">Fecha</th><th aOrden="cliente" [pag]="canj" etiquetaOrden="Cliente">Cliente</th><th>Artículo</th><th aOrden="puntos" [pag]="canj" etiquetaOrden="Puntos">Puntos</th></tr></thead>
                <tbody>
                  @for (c of canj.items(); track $index) {
                    <tr>
                      <td><a routerLink="/admin/pedidos" [queryParams]="{ ver: c.codigo }" class="font-bold text-primary hover:underline" [attr.aria-label]="'Ver el pedido ' + c.codigo">{{ c.codigo }}</a></td>
                      <td class="det-completo det-chip"><a-pill>{{ c.estado }}</a-pill></td>
                      <td>{{ c.fecha }}@if (c.hora) { · {{ c.hora }} }</td>
                      <td>@if (c.participanteId) { <a [routerLink]="['/admin/participantes', c.participanteId]" class="text-primary hover:underline" [attr.aria-label]="'Ver la ficha de ' + c.cliente">{{ c.cliente }}</a> } @else { {{ c.cliente }} }</td>
                      <td class="adm-ancha">{{ c.cantidad > 1 ? c.cantidad + ' × ' : '' }}{{ c.articulo }}</td>
                      <td>{{ usd(c.monto) }}</td>
                    </tr>
                  } @empty { <tr><td colspan="6" class="adm-empty">{{ act().canjes.length ? 'Ninguna compra coincide con la búsqueda.' : 'Todavía no hay compras de esta marca.' }}</td></tr> }
                </tbody>
              </table>
            </div>
            <a-pager [p]="canj" />
          }
          @case ("historial") {
            <a-barra-lista [lista]="hist" etiqueta="cambios" placeholder="Buscar en el historial" />
            <div class="adm-wrap">
              <table class="adm-table" aria-label="Historial de la marca">
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th></tr></thead>
                <tbody>
                  @for (a of hist.items(); track $index) {
                    <tr><td><b>{{ a.fecha }}</b></td><td>{{ a.usuario }}</td><td class="adm-ancha">{{ a.accion }}</td></tr>
                  } @empty { <tr><td colspan="3" class="adm-empty">{{ act().auditoria.length ? 'Ningún cambio coincide con la búsqueda.' : 'Todavía no hay cambios registrados de esta marca.' }}</td></tr> }
                </tbody>
              </table>
            </div>
            <a-pager [p]="hist" />
          }
        }
      </div>
    <a-marca-editor [marca]="editando()" (cerrado)="editando.set(null)" (guardada)="editando.set(null); recargar()" />
    } @else if (cargado()) {
      <p class="mt-6 rounded-2xl bg-card p-8 text-center text-muted-foreground shadow-[var(--shadow-card)]">No encontramos esa marca.</p>
    } @else {
      <div role="status" aria-label="Cargando" class="skeleton mt-6 h-40 rounded-2xl"></div>
    }
  `,
})
export class MarcaFichaPage {
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly tabs = TABS;
  protected readonly usd = formatUSD;

  protected readonly marca = signal<Marca | null>(null);
  protected readonly cargado = signal(false);
  protected readonly act = signal<Actividad>({ beneficios: [], canjes: [], auditoria: [] });

  /** La pestaña activa vive en la URL (?tab=canjes): se puede compartir el enlace y el botón atrás funciona. */
  private readonly tabParam = toSignal(this.route.queryParamMap.pipe(map((p) => p.get("tab"))), { initialValue: null });
  protected readonly tab = computed<TabK>(() => (TABS.find((t) => t.k === this.tabParam())?.k ?? "resumen") as TabK);

  protected readonly montoPagado = computed(() => this.act().canjes.filter((c) => c.estado !== "Anulado").reduce((a, c) => a + c.monto, 0));
  protected readonly ultimosCanjes = computed(() => [...this.act().canjes].sort((a, b) => b.fechaISO.localeCompare(a.fechaISO)).slice(0, 5));

  protected readonly bens = new ListaLocal<BeneficioMarca>(() => this.act().beneficios, {
    texto: (b) => `${b.nombre} ${b.descuento} ${b.tipo}`,
    filtros: { estado: (b) => (b.activo ? "Activo" : "Inactivo") },
    campos: { nombre: (b) => b.nombre, estado: (b) => (b.activo ? "Activo" : "Inactivo") },
    orden: { k: "nombre", dir: "asc" },
  });
  protected readonly canj = new ListaLocal<CanjeMarca>(() => this.act().canjes, {
    texto: (c) => `${c.codigo} ${c.cliente} ${c.articulo}`,
    filtros: { estado: (c) => c.estado },
    campos: { codigo: (c) => c.codigo, fecha: (c) => c.fechaISO, cliente: (c) => c.cliente, monto: (c) => c.monto, estado: (c) => c.estado },
    fecha: (c) => c.fechaISO,
    orden: { k: "fecha", dir: "desc" },
  });
  protected readonly hist = new ListaLocal<AuditoriaMarca>(() => this.act().auditoria, { texto: (a) => `${a.accion} ${a.usuario}` });

  constructor() {
    queueMicrotask(() => this.cargar());
  }

  protected recargar() {
    this.cargar();
  }
  protected readonly editando = signal<Marca | null>(null);
  private cargar() {
    const id = this.id();
    this.api.get<Marca>(`admin/c/marcas/${id}`).subscribe({
      next: (m) => {
        this.marca.set(m);
        this.cargado.set(true);
        this.api.get<Actividad>(`admin/marcas/${id}/actividad`).subscribe((a) => this.act.set(a));
      },
      error: () => this.cargado.set(true),
    });
  }

  protected activos(l: { activo: boolean }[]) {
    return l.filter((x) => x.activo).length;
  }
  protected cuenta(k: TabK): number | null {
    const a = this.act();
    switch (k) {
      case "beneficios": return a.beneficios.length;
      case "canjes": return a.canjes.length;
      case "historial": return a.auditoria.length;
      default: return null;
    }
  }
  protected irA(k: TabK) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: k === "resumen" ? null : k }, queryParamsHandling: "merge", replaceUrl: false });
  }
  protected publicar(activo: boolean) {
    const m = this.marca();
    if (!m) return;
    this.marca.set({ ...m, activo });
    this.api.put(`admin/c/marcas/${m.id}`, { ...m, activo }).subscribe(() => this.toast.show(activo ? "Marca publicada" : "Marca oculta en el sitio"));
  }

  private csv(nombre: string, cabecera: string[], filas: (string | number)[][]) {
    descargarTabla(`${this.marca()?.id ?? "marca"}-${nombre}`, [cabecera, ...filas], `${nombre[0]!.toUpperCase()}${nombre.slice(1)} de ${this.marca()?.nombre ?? "la marca"}`);
  }
  protected exportarBeneficios() {
    this.csv("beneficios", ["Beneficio", "Descuento", "Tipo", "Estado"], this.bens.filtrados().map((b) => [b.nombre, b.descuento, b.tipo, b.activo ? "Activo" : "Inactivo"]));
  }
  protected exportarCanjes() {
    this.csv("canjes", ["Compra", "Fecha", "Cliente", "Beneficio", "Cantidad", "Monto", "Estado"], this.canj.filtrados().map((c) => [c.codigo, c.fecha, c.cliente, c.articulo, c.cantidad, c.monto, c.estado]));
  }
}
