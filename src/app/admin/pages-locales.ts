import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import { MapPickerComponent, type SugerenciaDireccion, type Ubicacion } from "../shared/map-picker";
import { CargaMasivaComponent } from "./carga-masiva";
import {
  AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, FilaEsqueletoComponent, INPUT_CLS, OrdenColumnaComponent,
  PageHeaderComponent, PagerComponent, Paginado, ToastService, ToggleComponent,
} from "./kit";
import type { Local } from "../core/mock-api/seed/locales";

type Fila = Local;
const vacio = (): Fila => ({ id: `loc-${Date.now().toString(36)}`, marca: "", nombre: "", direccion: "", distrito: "", provincia: "Lima", lat: 0, lng: 0, horario: "", telefono: "", activo: true });

/* ------------------------------------------------------------------ */
/* Locales: los establecimientos de cada marca (dirección y mapa)      */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-locales-page",
  imports: [CargaMasivaComponent, OrdenColumnaComponent, FilaEsqueletoComponent, IconComponent, PageHeaderComponent, BtnDirective, ToggleComponent, ConfirmComponent, PagerComponent, AdminModalComponent, FieldComponent, MapPickerComponent, LimpiarFiltrosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Locales" [desc]="pag.total().toLocaleString('es') + ' locales · dónde se puede canjear cada beneficio y qué se ve en el mapa'">
      <button aBtn variant="outline" (click)="cargaMasiva.set(true)"><app-icon name="Upload" class="h-4 w-4" /> Carga masiva</button>
      <button aBtn (click)="edit.set(nuevo())"><app-icon name="Plus" class="h-4 w-4" /> Nuevo local</button>
    </a-header>
    <a-carga-masiva tipo="locales" [abierto]="cargaMasiva()" (cerrado)="cargaMasiva.set(false)" (terminada)="recargar()" />

    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar local" [class]="input + ' pl-9'" placeholder="Buscar por local, marca, dirección o distrito" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Marca" [class]="input + ' w-auto'" (change)="pag.filtrar('marca', $any($event.target).value)">
        <option value="">Todas las marcas</option>
        @for (m of marcas(); track m) { <option [value]="m">{{ m }}</option> }
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table adm-compacta">
        <thead>
          <tr>
            <th aOrden="nombre" [pag]="pag" etiquetaOrden="Local">Local</th>
            <th aOrden="marca" [pag]="pag" etiquetaOrden="Marca">Marca</th>
            <th aOrden="distrito" [pag]="pag" etiquetaOrden="Distrito">Distrito</th>
            <th>Dirección</th>
            <th>Horario</th>
            <th aOrden="activo" [pag]="pag" etiquetaOrden="Publicado">Publicado</th>
            <th aria-label="Acciones"></th>
          </tr>
        </thead>
        <tbody>
          @for (l of pag.items(); track l.id) {
            <tr>
              <td><b>{{ l.nombre }}</b>@if (l.telefono) { <p class="text-xs text-muted-foreground">{{ l.telefono }}</p> }</td>
              <td class="det-completo det-chip">{{ l.marca }}</td>
              <td>{{ l.distrito }}<p class="text-xs text-muted-foreground">{{ l.provincia }}</p></td>
              <td class="text-sm">{{ l.direccion }}</td>
              <td class="text-sm">{{ l.horario || '—' }}</td>
              <td><a-toggle label="Publicado" [on]="l.activo" (onChange)="alternar(l, $event)" /></td>
              <td>
                <div class="flex gap-1">
                  <button type="button" data-compact class="adm-accion adm-accion-icono" [attr.aria-label]="'Editar ' + l.nombre" (click)="edit.set({ ...l })"><app-icon name="Pencil" class="h-4 w-4" /></button>
                  <button type="button" data-compact class="adm-accion adm-accion-icono peligro" [attr.aria-label]="'Eliminar ' + l.nombre" (click)="borrar.set(l)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="7"></tr> } } @else { <tr><td colspan="7" class="adm-empty">No hay locales con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-modal [open]="!!edit()" [title]="esNuevo() ? 'Nuevo local' : 'Editar local'" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <div class="space-y-4">
          <a-field label="Marca">
            <select [class]="input" (change)="set({ marca: $any($event.target).value })">
              <option value="" [selected]="!e.marca">Elige la marca</option>
              @for (m of marcas(); track m) { <option [value]="m" [selected]="m === e.marca">{{ m }}</option> }
            </select>
          </a-field>
          <a-field label="Nombre del local"><input [class]="input" maxlength="80" placeholder="Si lo dejas vacío: marca + distrito" [value]="e.nombre" (input)="set({ nombre: $any($event.target).value })" /></a-field>
          <div class="grid gap-4 sm:grid-cols-2">
            <a-field label="Dirección"><input [class]="input" maxlength="150" [value]="e.direccion" (input)="set({ direccion: $any($event.target).value })" /></a-field>
            <a-field label="Distrito o ciudad"><input [class]="input" maxlength="80" [value]="e.distrito" (input)="set({ distrito: $any($event.target).value })" /></a-field>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <a-field label="Provincia o departamento"><input [class]="input" maxlength="80" [value]="e.provincia" (input)="set({ provincia: $any($event.target).value })" /></a-field>
            <a-field label="Teléfono"><input [class]="input" maxlength="20" [value]="e.telefono" (input)="set({ telefono: $any($event.target).value })" /></a-field>
          </div>
          <a-field label="Horario"><input [class]="input" maxlength="120" placeholder="Lun a Dom 11:00 a 23:00" [value]="e.horario" (input)="set({ horario: $any($event.target).value })" /></a-field>
          <div>
            <p class="mb-1 text-sm font-medium">Ubicación en el mapa</p>
            <app-map-picker [lat]="e.lat || null" [lng]="e.lng || null" (ubicacionCambia)="ubicar($event)" (sugerencia)="sugerir($event)" />
            <p class="mt-1 text-xs text-muted-foreground">Coordenadas: {{ e.lat ? e.lat + ', ' + e.lng : 'sin marcar' }}</p>
          </div>
          <div class="flex items-center justify-between"><span class="text-sm font-medium">Publicado en el sitio</span><a-toggle label="Publicado" [on]="e.activo" (onChange)="set({ activo: $event })" /></div>
          @if (error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ error() }}</p> }
          <div class="det-pie"><button aBtn variant="outline" (click)="edit.set(null)">Cancelar</button><button aBtn (click)="guardar()">Guardar</button></div>
        </div>
      }
    </a-modal>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar local?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se quitará <b class="text-foreground">{{ borrar()?.nombre }}</b> del mapa y de la ficha de los beneficios de la marca.
    </a-confirm>
  `,
})
export class LocalesAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly pag = new Paginado<Fila>(inject(ApiService), "locales");
  protected readonly marcas = signal<string[]>([]);
  protected readonly edit = signal<Fila | null>(null);
  protected readonly borrar = signal<Fila | null>(null);
  protected readonly cargaMasiva = signal(false);
  protected readonly error = signal("");
  /** Si el local ya existe en la lista no es nuevo (el id se genera al abrir el formulario). */
  private readonly existentes = new Set<string>();
  protected readonly esNuevo = computed(() => { const e = this.edit(); return !!e && !this.existentes.has(e.id); });

  constructor() {
    this.pag.recargar();
    this.api.get<{ nombre: string }[]>("admin/c/marcas").subscribe((m) => this.marcas.set(m.map((x) => x.nombre).sort((a, b) => a.localeCompare(b, "es"))));
  }

  protected recargar() {
    this.pag.recargar();
  }
  protected nuevo(): Fila {
    return vacio();
  }
  protected set(p: Partial<Fila>) {
    const e = this.edit();
    if (e) this.edit.set({ ...e, ...p });
  }
  protected ubicar(u: Ubicacion) {
    this.set({ lat: +u.lat.toFixed(6), lng: +u.lng.toFixed(6) });
  }
  /** La dirección que sugiere el mapa solo rellena lo que aún está vacío. */
  protected sugerir(s: SugerenciaDireccion) {
    const e = this.edit();
    if (!e) return;
    this.set({ direccion: e.direccion || s.direccion, distrito: e.distrito || s.distrito.split(",")[0]!.trim() });
  }
  protected alternar(l: Fila, activo: boolean) {
    this.api.put(`admin/c/locales/${l.id}`, { ...l, activo }).subscribe(() => this.pag.recargar());
  }
  protected guardar() {
    const e = this.edit();
    if (!e) return;
    if (!e.marca) { this.error.set("Elige la marca."); return; }
    if (!e.direccion.trim() || !e.distrito.trim()) { this.error.set("Escribe la dirección y el distrito."); return; }
    if (!e.lat && !e.lng) { this.error.set("Marca el local en el mapa: se necesita para mostrarlo."); return; }
    this.error.set("");
    const entidad: Fila = { ...e, nombre: e.nombre.trim() || `${e.marca} ${e.distrito.trim()}`, direccion: e.direccion.trim(), distrito: e.distrito.trim(), provincia: e.provincia.trim() || "Lima" };
    this.api.put(`admin/c/locales/${e.id}`, entidad).subscribe({
      next: () => { this.existentes.add(e.id); this.edit.set(null); this.pag.recargar(); this.toast.show("Local guardado"); },
      error: (er) => this.error.set(er?.error?.message ?? "No se pudo guardar el local."),
    });
  }
  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.api.delete(`admin/c/locales/${b.id}`).subscribe(() => { this.pag.recargar(); this.toast.show("Local eliminado"); });
  }
}
