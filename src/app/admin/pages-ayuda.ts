import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { categoriasDe, errorGuia, guiasPara, guiaVacia, type Guia } from "../core/ayuda";
import { fechaLarga } from "../core/cupones";
import { puede } from "../core/permisos";
import { IconComponent } from "../shared/icon.component";
import { MarkdownComponent } from "../shared/markdown.component";
import {
  AdminApi, AdminModalComponent, BtnDirective, ConfirmComponent, DrawerComponent, DrawerTitleComponent, FieldComponent, INPUT_CLS, PageHeaderComponent, PillComponent,
  ToastService, ToggleComponent, abrirDesdeUrl, usarSucio,
} from "./kit";
import { AdminSession } from "./session";

/**
 * Centro de ayuda del panel: guías para quienes lo operan, dirigidas a uno o varios roles (cada persona ve solo las suyas).
 * Con permiso de edición sobre «Ayuda» se pueden crear, editar, ordenar, dirigir a roles y despublicar desde la pestaña Administrar.
 */
@Component({
  selector: "a-ayuda-page",
  imports: [PageHeaderComponent, BtnDirective, PillComponent, FieldComponent, ToggleComponent, DrawerComponent, DrawerTitleComponent, AdminModalComponent, ConfirmComponent, IconComponent, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Centro de ayuda" [desc]="'Guías para tu rol (' + rol() + '). Si falta algo, pídele a un administrador que lo agregue.'">
      @if (puedeAdministrar() && vista() === 'administrar') { <button aBtn (click)="nueva()"><app-icon name="Plus" class="h-4 w-4" /> Nueva guía</button> }
    </a-header>

    @if (puedeAdministrar()) {
      <div class="mb-4 flex gap-2" role="tablist" aria-label="Vista">
        <button aBtn role="tab" [attr.aria-selected]="vista() === 'guias'" [variant]="vista() === 'guias' ? 'primary' : 'outline'" (click)="vista.set('guias')">Guías</button>
        <button aBtn role="tab" [attr.aria-selected]="vista() === 'administrar'" [variant]="vista() === 'administrar' ? 'primary' : 'outline'" (click)="vista.set('administrar')">Administrar</button>
      </div>
    }
    @if (error()) {
      <div role="alert" class="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{{ error() }} <button aBtn variant="outline" class="ml-2" (click)="cargar()">Reintentar</button></div>
    }

    @if (vista() === 'guias') {
      <div class="adm-filtros">
        <div class="adm-busca">
          <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Buscar en la ayuda" [class]="input + ' pl-9'" placeholder="Buscar una guía (por ejemplo: imágenes, roles, puntos)" (input)="q.set($any($event.target).value)" />
        </div>
      </div>
      <div class="mb-5 flex flex-wrap gap-2" role="group" aria-label="Categorías">
        <button type="button" [attr.aria-pressed]="!categoria()" (click)="categoria.set('')" [class]="chip(!categoria())">Todas</button>
        @for (c of categorias(); track c) { <button type="button" [attr.aria-pressed]="categoria() === c" (click)="categoria.set(c)" [class]="chip(categoria() === c)">{{ c }}</button> }
      </div>
      <p class="mb-3 text-sm text-muted-foreground" aria-live="polite">{{ visibles().length }} {{ visibles().length === 1 ? 'guía' : 'guías' }}</p>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (g of visibles(); track g.id) {
          <button type="button" (click)="abrir(g)" class="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary">
            <span class="text-xs font-bold uppercase tracking-wide text-primary">{{ g.categoria }}</span>
            <span class="mt-1 block text-base font-bold">{{ g.titulo }}</span>
            @if (g.resumen) { <span class="mt-1 block text-sm text-muted-foreground">{{ g.resumen }}</span> }
          </button>
        } @empty {
          @if (cargado()) { <p class="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{{ q() || categoria() ? 'Ninguna guía coincide con tu búsqueda.' : 'Todavía no hay guías para tu rol.' }}</p> }
        }
      </div>
    } @else {
      <div class="adm-wrap">
        <table class="adm-table">
          <thead><tr><th>Guía</th><th>Categoría</th><th>Dirigida a</th><th>Orden</th><th>Publicada</th><th>Actualizada</th><th></th></tr></thead>
          <tbody>
            @for (g of todas(); track g.id) {
              <tr>
                <td><b>{{ g.titulo }}</b>@if (g.resumen) { <p class="text-xs text-muted-foreground">{{ g.resumen }}</p> }</td>
                <td>{{ g.categoria }}</td>
                <td class="text-sm">{{ g.roles.length ? g.roles.join(', ') : 'Todos los roles' }}</td>
                <td>{{ g.orden }}</td>
                <td><a-toggle label="Publicada" [on]="g.publicada" (onChange)="publicar(g, $event)" /></td>
                <td class="text-sm">{{ fecha(g.actualizada) }}</td>
                <td class="whitespace-nowrap">
                  <button aBtn variant="ghost" (click)="editar(g)">Editar</button>
                  <button aBtn variant="peligro-ghost" (click)="borrar.set(g)"><app-icon name="Trash2" class="h-4 w-4" /> Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <a-modal [open]="!!leyendo()" [wide]="true" [title]="leyendo()?.titulo ?? ''" (closed)="leyendo.set(null)">
      @if (leyendo(); as g) {
        <p class="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><a-pill tone="info">{{ g.categoria }}</a-pill> Actualizada el {{ fecha(g.actualizada) }}</p>
        <div class="max-h-[65vh] overflow-y-auto pr-1"><app-markdown [texto]="g.contenido" /></div>
        <div class="mt-4 flex justify-end"><button aBtn (click)="leyendo.set(null)">Cerrar</button></div>
      }
    </a-modal>

    <a-drawer [open]="!!edit()" [sucio]="sucio()" maxW="max-w-2xl" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <a-drawer-title (closed)="edit.set(null)"><h2 class="text-xl font-bold">{{ e.titulo || 'Nueva guía' }}</h2></a-drawer-title>
        <div class="space-y-4">
          <a-field label="Título"><input [class]="input" [value]="e.titulo" (input)="set({ titulo: $any($event.target).value })" /></a-field>
          <div class="grid grid-cols-2 gap-3">
            <a-field label="Categoría">
              <input [class]="input" list="categorias-ayuda" [value]="e.categoria" (input)="set({ categoria: $any($event.target).value })" />
              <datalist id="categorias-ayuda">@for (c of categoriasTodas(); track c) { <option [value]="c"></option> }</datalist>
            </a-field>
            <a-field label="Orden (menor primero)"><input type="number" min="0" max="999" [class]="input" [value]="e.orden" (input)="set({ orden: +$any($event.target).value })" /></a-field>
          </div>
          <a-field label="Resumen (se ve en la lista)"><input [class]="input" [value]="e.resumen" (input)="set({ resumen: $any($event.target).value })" /></a-field>

          <fieldset class="rounded-2xl border border-border p-4">
            <legend class="px-2 text-sm font-bold">A quién va dirigida</legend>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium">Todos los roles</span>
              <a-toggle label="Todos los roles" [on]="!e.roles.length" (onChange)="todosLosRoles($event)" />
            </div>
            @if (e.roles.length || elegirRoles()) {
              <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Roles destinatarios">
                @for (r of roles(); track r) {
                  <button type="button" [attr.aria-pressed]="e.roles.includes(r)" (click)="alternarRol(r)" [class]="chip(e.roles.includes(r))">{{ r }}</button>
                }
              </div>
            }
          </fieldset>

          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium">Publicada (visible para esos roles)</span>
            <a-toggle label="Publicada" [on]="e.publicada" (onChange)="set({ publicada: $event })" />
          </div>

          <div class="grid gap-3 lg:grid-cols-2">
            <a-field label="Contenido (títulos con ##, listas con -, **negrita**, [enlaces](https://…))">
              <textarea [class]="input + ' h-80 py-2 font-mono text-sm'" [value]="e.contenido" (input)="set({ contenido: $any($event.target).value })"></textarea>
            </a-field>
            <div><span class="mb-1.5 block text-sm font-medium">Vista previa</span><div class="h-80 overflow-y-auto rounded-xl border border-border bg-card p-4"><app-markdown [texto]="e.contenido" /></div></div>
          </div>

          @if (errorEdicion()) { <p role="alert" class="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{{ errorEdicion() }}</p> }
          <button aBtn class="w-full" [disabled]="!!errorEdicion() || guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Guardar guía' }}</button>
        </div>
      }
    </a-drawer>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar guía?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se eliminará «{{ borrar()?.titulo }}» y no se puede deshacer. Si solo quieres ocultarla, despublícala con el interruptor.
    </a-confirm>
  `,
})
export class AyudaPage {
  private readonly api = inject(ApiService);
  private readonly admin = inject(AdminApi);
  private readonly session = inject(AdminSession);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;

  protected readonly rol = computed(() => this.session.rol());
  protected readonly puedeAdministrar = computed(() => puede(this.session.rol(), "ayuda", "editar"));
  protected readonly vista = signal<"guias" | "administrar">("guias");
  /** Lo que el servidor entrega a este rol (administrar trae además los borradores y las de otros roles). */
  private readonly guias = signal<Guia[]>([]);
  protected readonly todas = signal<Guia[]>([]);
  protected readonly cargado = signal(false);
  protected readonly error = signal("");
  protected readonly q = signal("");
  protected readonly categoria = signal("");
  protected readonly leyendo = signal<Guia | null>(null);
  protected readonly edit = signal<Guia | null>(null);
  protected readonly sucio = usarSucio(() => this.edit());
  protected readonly borrar = signal<Guia | null>(null);
  protected readonly guardando = signal(false);
  protected readonly elegirRoles = signal(false);
  protected readonly roles = signal<string[]>([]);

  protected readonly categorias = computed(() => categoriasDe(this.guias()));
  protected readonly categoriasTodas = computed(() => categoriasDe(this.todas()));
  protected readonly visibles = computed(() => guiasPara(this.guias(), this.rol(), { q: this.q(), categoria: this.categoria() }));
  protected readonly errorEdicion = computed(() => { const e = this.edit(); return e ? errorGuia(e) : ""; });

  constructor() {
    this.cargar();
    abrirDesdeUrl((id) => {
      const g = this.guias().find((x) => x.id === id);
      if (g) this.leyendo.set(g);
      else this.api.get<Guia[]>("admin/ayuda").subscribe((l) => this.leyendo.set(l.find((x) => x.id === id) ?? null));
    });
  }

  protected chip = (activo: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${activo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`;
  protected fecha = fechaLarga;

  protected cargar() {
    this.error.set("");
    this.api.get<Guia[]>("admin/ayuda").subscribe({
      next: (l) => { this.guias.set(l); this.cargado.set(true); },
      error: () => this.error.set("No pudimos cargar la ayuda. Revisa tu conexión e inténtalo otra vez."),
    });
    if (this.puedeAdministrar()) {
      this.admin.lista<Guia>("guias").subscribe((l) => this.todas.set(l));
      this.api.get<{ roles: { rol: string }[] }>("admin/meta").subscribe((m) => this.roles.set(m.roles.map((r) => r.rol)));
    }
  }

  protected abrir(g: Guia) {
    this.leyendo.set(g);
  }

  protected nueva() {
    this.elegirRoles.set(false);
    this.edit.set({ ...guiaVacia(), id: crypto.randomUUID() });
  }
  protected editar(g: Guia) {
    this.elegirRoles.set(false);
    this.edit.set(structuredClone(g));
  }
  protected set(p: Partial<Guia>) {
    this.edit.update((e) => (e ? { ...e, ...p } : e));
  }
  protected todosLosRoles(todos: boolean) {
    this.elegirRoles.set(!todos);
    if (todos) this.set({ roles: [] });
  }
  protected alternarRol(r: string) {
    this.edit.update((e) => (e ? { ...e, roles: e.roles.includes(r) ? e.roles.filter((x) => x !== r) : [...e.roles, r] } : e));
  }

  protected guardar() {
    const e = this.edit();
    if (!e || errorGuia(e)) return;
    this.guardando.set(true);
    this.api.put(`admin/c/guias/${e.id}`, { ...e, actualizada: new Date().toISOString().slice(0, 10) }).subscribe({
      next: () => { this.guardando.set(false); this.edit.set(null); this.toast.show("Guía guardada"); this.cargar(); },
      error: (er) => { this.guardando.set(false); this.toast.error(er?.error?.message ?? "No pudimos guardar la guía."); },
    });
  }
  protected publicar(g: Guia, publicada: boolean) {
    this.api.put(`admin/c/guias/${g.id}`, { ...g, publicada }).subscribe({ next: () => this.cargar(), error: (er) => this.toast.error(er?.error?.message ?? "No pudimos cambiar el estado.") });
  }
  protected eliminar() {
    const g = this.borrar();
    if (!g) return;
    this.api.delete(`admin/c/guias/${g.id}`).subscribe(() => { this.toast.show("Guía eliminada"); this.cargar(); });
  }
}
