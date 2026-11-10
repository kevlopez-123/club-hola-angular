import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { errorPopup, estadoPopup, ETIQUETA_FRECUENCIA, popupVacio, variantePopupVacia, type CanalPopup, type FrecuenciaPopup, type Popup, type VariantePopup } from "../core/popups";
import { fechaLarga } from "../core/cupones";
import { IconComponent } from "../shared/icon.component";
import {
  AdminApi, BtnDirective, ConfirmComponent, DrawerComponent, DrawerTitleComponent, FieldComponent, ImageUploadComponent, INPUT_CLS, PageHeaderComponent, PanelComponent,
  PillComponent, ToastService, ToggleComponent, usarSucio,
} from "./kit";

const ESTADO: Record<string, { l: string; t: "ok" | "warn" | "bad" | "muted" }> = {
  vigente: { l: "Vigente", t: "ok" }, programado: { l: "Programado", t: "warn" }, vencido: { l: "Vencido", t: "bad" }, pausado: { l: "Pausado", t: "muted" },
};
const FRECUENCIAS = Object.entries(ETIQUETA_FRECUENCIA) as [FrecuenciaPopup, string][];

/**
 * Pop-ups del sitio y de la app: mensajes con vigencia, frecuencia y contenido distinto para cada canal. Se administran aquí;
 * el sitio los pide a `GET popups?canal=web` y la app a `GET popups?canal=app`.
 */
@Component({
  selector: "a-popups-page",
  imports: [PageHeaderComponent, PanelComponent, BtnDirective, PillComponent, ToggleComponent, FieldComponent, ImageUploadComponent, DrawerComponent, DrawerTitleComponent, ConfirmComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Pop-ups" [desc]="lista().length + (lista().length === 1 ? ' pop-up' : ' pop-ups') + ' · mensajes por encima del contenido, con vigencia y distintos para web y app'">
      <button aBtn (click)="nuevo()"><app-icon name="Plus" class="h-4 w-4" /> Nuevo pop-up</button>
    </a-header>

    <div class="adm-filtros">
      <select aria-label="Estado" [class]="input + ' w-auto'" (change)="filtro.set($any($event.target).value)">
        <option value="">Todos los estados</option>
        <option value="vigente">Vigentes</option><option value="programado">Programados</option><option value="vencido">Vencidos</option><option value="pausado">Pausados</option>
      </select>
      <select aria-label="Canal" [class]="input + ' w-auto'" (change)="canalFiltro.set($any($event.target).value)">
        <option value="">Web y app</option><option value="web">Solo web</option><option value="app">Solo app</option>
      </select>
    </div>

    @if (error()) {
      <div role="alert" class="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{{ error() }} <button aBtn variant="outline" class="ml-2" (click)="cargar()">Reintentar</button></div>
    }
    <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      @for (p of visibles(); track p.id) {
        <a-panel>
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-semibold">{{ p.nombre }}</p>
              <div class="mt-1 flex flex-wrap gap-1">
                <a-pill [tone]="estado(p).t">{{ estado(p).l }}</a-pill>
                @if (p.web?.activo) { <a-pill tone="info">Web</a-pill> }
                @if (p.app?.activo) { <a-pill tone="info">App</a-pill> }
              </div>
            </div>
            <a-toggle label="Activo" [on]="p.activo" (onChange)="alternar(p, $event)" />
          </div>
          <p class="mt-3 line-clamp-2 text-sm font-semibold">{{ titulo(p) }}</p>
          <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div><dt class="font-semibold uppercase">Vigencia</dt><dd class="text-foreground">{{ vigencia(p) }}</dd></div>
            <div><dt class="font-semibold uppercase">Frecuencia</dt><dd class="text-foreground">{{ frecuencia(p) }}</dd></div>
            <div><dt class="font-semibold uppercase">Sale en</dt><dd class="text-foreground">{{ p.paginas === 'inicio' ? 'Solo el inicio' : 'Todas las páginas' }}</dd></div>
            <div><dt class="font-semibold uppercase">Prioridad</dt><dd class="text-foreground">{{ p.prioridad }}</dd></div>
            <div><dt class="font-semibold uppercase">Vistas</dt><dd class="text-foreground">Web {{ p.vistas?.web ?? 0 }} · App {{ p.vistas?.app ?? 0 }}</dd></div>
            <div><dt class="font-semibold uppercase">Clics</dt><dd class="text-foreground">Web {{ p.clics?.web ?? 0 }} · App {{ p.clics?.app ?? 0 }}</dd></div>
          </dl>
          <div class="mt-4 flex flex-wrap items-center gap-1">
            <button aBtn variant="ghost" (click)="editar(p)">Editar</button>
            <button aBtn variant="ghost" (click)="duplicar(p)"><app-icon name="Copy" class="h-4 w-4" /> Duplicar</button>
            <button aBtn variant="peligro-ghost" class="ml-auto" (click)="borrar.set(p)"><app-icon name="Trash2" class="h-4 w-4" /> Eliminar</button>
          </div>
        </a-panel>
      } @empty {
        @if (cargado()) { <p class="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{{ lista().length ? 'Ningún pop-up coincide con los filtros.' : 'Todavía no hay pop-ups. Crea el primero con «Nuevo pop-up».' }}</p> }
      }
    </div>

    <a-drawer [open]="!!edit()" [sucio]="sucio()" maxW="max-w-2xl" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <a-drawer-title (closed)="edit.set(null)"><h2 class="text-xl font-bold">{{ e.nombre || 'Nuevo pop-up' }}</h2></a-drawer-title>
        <div class="space-y-4">
          <a-field label="Nombre interno (solo lo ve el panel)"><input [class]="input" [value]="e.nombre" (input)="set({ nombre: $any($event.target).value })" /></a-field>

          <fieldset class="rounded-2xl border border-border p-4">
            <legend class="px-2 text-sm font-bold">Cuándo sale</legend>
            <div class="grid grid-cols-2 gap-3">
              <a-field label="Inicio"><input type="date" [class]="input" [value]="e.desde ?? ''" (input)="set({ desde: $any($event.target).value || undefined })" /></a-field>
              <a-field label="Fin"><input type="date" [class]="input" [min]="e.desde ?? ''" [value]="e.hasta ?? ''" (input)="set({ hasta: $any($event.target).value || undefined })" /></a-field>
              <a-field label="Frecuencia">
                <select [class]="input" aria-label="Frecuencia" (change)="set({ frecuencia: $any($event.target).value })">
                  @for (f of frecuencias; track f[0]) { <option [value]="f[0]" [selected]="f[0] === e.frecuencia">{{ f[1] }}</option> }
                </select>
              </a-field>
              @if (e.frecuencia === 'dias') {
                <a-field label="Volver a salir cada (días)"><input type="number" min="1" max="365" [class]="input" [value]="e.dias ?? ''" (input)="set({ dias: +$any($event.target).value || undefined })" /></a-field>
              }
              <a-field label="Dónde sale">
                <select [class]="input" aria-label="Dónde sale" (change)="set({ paginas: $any($event.target).value })">
                  <option value="inicio" [selected]="e.paginas === 'inicio'">Solo en el inicio</option>
                  <option value="todas" [selected]="e.paginas === 'todas'">En cualquier página</option>
                </select>
              </a-field>
              <a-field label="Prioridad (0–99)"><input type="number" min="0" max="99" [class]="input" [value]="e.prioridad" (input)="set({ prioridad: +$any($event.target).value })" /></a-field>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">Si hay varios pop-ups vigentes a la vez, sale primero el de mayor prioridad y los demás esperan su turno.</p>
          </fieldset>

          <div class="flex gap-1 rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Canal">
            @for (c of canales; track c.k) {
              <button type="button" role="tab" [attr.aria-selected]="canal() === c.k" (click)="canal.set(c.k)"
                [class]="'h-10 flex-1 rounded-lg text-sm font-semibold ' + (canal() === c.k ? 'bg-primary text-primary-foreground' : '')">
                {{ c.l }} @if (e[c.k]?.activo) { <span class="ml-1 text-xs">●</span> }
              </button>
            }
          </div>

          @if (variante(); as v) {
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium">Mostrar en {{ canal() === 'web' ? 'la web' : 'la app' }}</span>
              <a-toggle [label]="'Mostrar en ' + canal()" [on]="v.activo" (onChange)="setVariante({ activo: $event })" />
            </div>
          } @else {
            <button aBtn variant="outline" (click)="crearVariante()">Agregar contenido para {{ canal() === 'web' ? 'la web' : 'la app' }}</button>
          }
          @if (variante(); as v) {
            @if (v.activo) {
              <div class="space-y-4">
                @if (canal() === 'app' && e.web) { <button aBtn variant="ghost" (click)="copiarDeWeb()">Copiar el contenido de la web</button> }
                @if (canal() === 'web' && e.app) { <button aBtn variant="ghost" (click)="copiarDeApp()">Copiar el contenido de la app</button> }
                <a-field label="Formato">
                  <select [class]="input" aria-label="Formato" (change)="setVariante({ formato: $any($event.target).value })">
                    <option value="mixto" [selected]="v.formato !== 'imagen'">Imagen, texto y botón</option>
                    <option value="imagen" [selected]="v.formato === 'imagen'">Solo imagen (la imagen es todo el pop-up)</option>
                  </select>
                </a-field>
                <a-field [label]="v.formato === 'imagen' ? 'Título (texto alternativo de la imagen)' : 'Título'"><input [class]="input" [value]="v.titulo" (input)="setVariante({ titulo: $any($event.target).value })" /></a-field>
                @if (v.formato !== 'imagen') {
                  <a-field label="Mensaje"><textarea [class]="input + ' h-28 py-2'" [value]="v.mensaje" (input)="setVariante({ mensaje: $any($event.target).value })"></textarea></a-field>
                }
                <a-field [label]="v.formato === 'imagen' ? 'Imagen (obligatoria)' : 'Imagen (opcional)'">
                  <a-image-upload [aspect]="v.formato === 'imagen' ? 'aspect-[4/5]' : 'aspect-[16/9]'" [value]="v.imagen ? [v.imagen] : []" (valueChange)="setVariante({ imagen: $event[0] || undefined })" [minAncho]="640" [minAlto]="360" [hint]="v.formato === 'imagen' ? 'JPG o PNG vertical (4:5) o cuadrado · mínimo 640 px de ancho' : 'JPG o PNG 16:9 · mínimo 640×360 px'" />
                </a-field>
                @if (v.formato === 'imagen') {
                  <a-field label="Enlace al tocar la imagen (opcional)"><input [class]="input" placeholder="/beneficios o https://…" [value]="v.enlace ?? ''" (input)="setVariante({ enlace: $any($event.target).value || undefined })" /></a-field>
                } @else {
                  <div class="grid grid-cols-2 gap-3">
                    <a-field label="Texto del botón (opcional)"><input [class]="input" [value]="v.boton ?? ''" (input)="setVariante({ boton: $any($event.target).value || undefined })" /></a-field>
                    <a-field label="Enlace del botón"><input [class]="input" placeholder="/beneficios o https://…" [value]="v.enlace ?? ''" (input)="setVariante({ enlace: $any($event.target).value || undefined })" /></a-field>
                  </div>
                }

                <div>
                  <span class="mb-1.5 block text-sm font-medium">Vista previa ({{ canal() === 'web' ? 'web' : 'app' }})</span>
                  <div [class]="'mx-auto overflow-hidden bg-card shadow-lg ' + (canal() === 'web' ? 'max-w-md rounded-3xl border border-border' : 'w-64 rounded-[2rem] border-8 border-foreground')">
                    @if (v.imagen && v.formato === 'imagen') { <img [src]="v.imagen" [alt]="v.titulo" class="w-full object-contain" /> }
                    @else if (v.imagen) { <img [src]="v.imagen" alt="" class="aspect-[16/9] w-full object-cover" /> }
                    @if (v.formato !== 'imagen') {
                    <div class="p-5">
                      <p class="text-lg font-extrabold">{{ v.titulo || 'Título del pop-up' }}</p>
                      @if (v.mensaje) { <p class="mt-2 whitespace-pre-line text-sm">{{ v.mensaje }}</p> }
                      @if (v.boton) { <span class="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-bold uppercase text-primary-foreground">{{ v.boton }}</span> }
                    </div>
                    }
                  </div>
                </div>
              </div>
            }
          }

          @if (errorEdicion()) { <p role="alert" class="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{{ errorEdicion() }}</p> }
          <button aBtn class="w-full" [disabled]="!!errorEdicion() || guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Guardar pop-up' }}</button>
        </div>
      }
    </a-drawer>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar pop-up?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se eliminará «{{ borrar()?.nombre }}» y sus estadísticas; no se puede deshacer. Si solo quieres ocultarlo, desactívalo con el interruptor.
    </a-confirm>
  `,
})
export class PopupsPage {
  private readonly api = inject(ApiService);
  private readonly admin = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly frecuencias = FRECUENCIAS;
  protected readonly canales = [{ k: "web" as CanalPopup, l: "Web" }, { k: "app" as CanalPopup, l: "App" }];

  protected readonly lista = signal<Popup[]>([]);
  protected readonly cargado = signal(false);
  protected readonly error = signal("");
  protected readonly filtro = signal("");
  protected readonly canalFiltro = signal("");
  protected readonly edit = signal<Popup | null>(null);
  protected readonly sucio = usarSucio(() => this.edit());
  protected readonly canal = signal<CanalPopup>("web");
  protected readonly borrar = signal<Popup | null>(null);
  protected readonly guardando = signal(false);
  private readonly hoy = new Date().toISOString().slice(0, 10);

  protected readonly visibles = computed(() =>
    this.lista().filter((p) => (!this.filtro() || this.claveEstado(p) === this.filtro()) && (!this.canalFiltro() || !!p[this.canalFiltro() as CanalPopup]?.activo)),
  );
  protected readonly variante = computed(() => this.edit()?.[this.canal()]);
  protected readonly errorEdicion = computed(() => { const e = this.edit(); return e ? errorPopup(e) : ""; });

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.error.set("");
    this.admin.lista<Popup>("popups").subscribe({
      next: (l) => { this.lista.set(l); this.cargado.set(true); },
      error: () => this.error.set("No pudimos cargar los pop-ups. Revisa tu conexión e inténtalo otra vez."),
    });
  }

  private claveEstado(p: Popup) {
    return p.activo ? estadoPopup(p, this.hoy) : "pausado";
  }
  protected estado(p: Popup) {
    return ESTADO[this.claveEstado(p)]!;
  }
  protected titulo(p: Popup) {
    return p.web?.titulo || p.app?.titulo || "(sin título)";
  }
  protected vigencia(p: Popup) {
    return !p.desde && !p.hasta ? "Sin fechas" : `${p.desde ? fechaLarga(p.desde) : "…"} – ${p.hasta ? fechaLarga(p.hasta) : "…"}`;
  }
  protected frecuencia(p: Popup) {
    return p.frecuencia === "dias" ? `Cada ${p.dias ?? 1} ${p.dias === 1 ? "día" : "días"}` : ETIQUETA_FRECUENCIA[p.frecuencia];
  }

  protected nuevo() {
    this.canal.set("web");
    this.edit.set({ ...popupVacio(), id: crypto.randomUUID() });
  }
  protected editar(p: Popup) {
    this.canal.set(p.web ? "web" : "app");
    this.edit.set(structuredClone(p));
  }
  protected duplicar(p: Popup) {
    this.canal.set(p.web ? "web" : "app");
    const { vistas: _v, clics: _c, ...resto } = structuredClone(p);
    this.edit.set({ ...resto, id: crypto.randomUUID(), nombre: `${p.nombre} (copia)`, activo: false });
  }
  protected set(p: Partial<Popup>) {
    this.edit.update((e) => (e ? { ...e, ...p } : e));
  }
  protected setVariante(p: Partial<VariantePopup>) {
    const c = this.canal();
    this.edit.update((e) => (e && e[c] ? { ...e, [c]: { ...e[c]!, ...p } } : e));
  }
  protected crearVariante() {
    const c = this.canal();
    this.edit.update((e) => (e ? { ...e, [c]: variantePopupVacia() } : e));
  }
  protected copiarDeWeb() {
    this.edit.update((e) => (e?.web ? { ...e, app: { ...e.web } } : e));
  }
  protected copiarDeApp() {
    this.edit.update((e) => (e?.app ? { ...e, web: { ...e.app } } : e));
  }

  protected guardar() {
    const e = this.edit();
    if (!e || errorPopup(e)) return;
    this.guardando.set(true);
    this.api.put(`admin/c/popups/${e.id}`, e).subscribe({
      next: () => { this.guardando.set(false); this.edit.set(null); this.toast.show("Pop-up guardado"); this.cargar(); },
      error: (er) => { this.guardando.set(false); this.toast.error(er?.error?.message ?? "No pudimos guardar el pop-up."); },
    });
  }
  protected alternar(p: Popup, activo: boolean) {
    this.api.put(`admin/c/popups/${p.id}`, { ...p, activo }).subscribe({ next: () => this.cargar(), error: (er) => this.toast.error(er?.error?.message ?? "No pudimos cambiar el estado.") });
  }
  protected eliminar() {
    const p = this.borrar();
    if (!p) return;
    this.api.delete(`admin/c/popups/${p.id}`).subscribe(() => { this.toast.show("Pop-up eliminado"); this.cargar(); });
  }
}
