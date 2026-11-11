import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { CatalogService } from "../core/catalog.service";
import { ETIQUETA_ESTADO, TIPOS_EVENTO, etiquetaTipo, fechaLabel, esPasado, type EstadoPreinscripcion, type Evento, type Preinscripcion } from "../core/eventos";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import {
  AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, FilaEsqueletoComponent, ImageUploadComponent, INPUT_CLS,
  OrdenColumnaComponent, PageHeaderComponent, PagerComponent, Paginado, PillComponent, ToastService, ToggleComponent,
} from "./kit";

type EventoEdit = Evento & { imgs: string[]; fotosEd: string[]; incluyeTxt: string; condicionesTxt: string };
const lineas = (t: string) => t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-eventos-page",
  imports: [AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, FilaEsqueletoComponent, IconComponent, ImageUploadComponent,
    LimpiarFiltrosComponent, OrdenColumnaComponent, PageHeaderComponent, PagerComponent, PillComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Eventos" [desc]="pag.total().toLocaleString('es') + ' eventos · se publican en el sitio cuando están activos'">
      <button aBtn (click)="nuevo()"><app-icon name="Plus" class="h-4 w-4" /> Nuevo evento</button>
    </a-header>

    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar evento" [class]="input + ' pl-9'" placeholder="Evento, marca o lugar" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Tipo" [class]="input + ' w-auto'" (change)="pag.filtrar('tipo', $any($event.target).value)">
        <option value="">Todos los tipos</option>
        @for (t of tipos; track t.slug) { <option [value]="t.slug">{{ t.label }}</option> }
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table adm-compacta">
        <thead><tr>
          <th aria-label="Imagen"></th><th aOrden="nombre" [pag]="pag" etiquetaOrden="Evento">Evento</th><th aOrden="fechaISO" [pag]="pag" etiquetaOrden="Fecha">Fecha</th>
          <th>Cupos</th><th>Nivel</th><th aOrden="activo" [pag]="pag" etiquetaOrden="Publicado">Publicado</th><th aria-label="Acciones"></th>
        </tr></thead>
        <tbody>
          @for (e of pag.items(); track e.id) {
            <tr>
              <td><img [src]="e.imagen" alt="" class="h-11 w-16 rounded-lg object-cover" /></td>
              <td><b>{{ e.nombre }}</b><p class="text-xs text-muted-foreground">{{ e.marca }} · {{ etiqueta(e.tipo) }}</p></td>
              <td>{{ fecha(e.fechaISO) }}<p class="text-xs text-muted-foreground">{{ e.hora }}</p>@if (pasado(e)) { <a-pill tone="muted">Realizado</a-pill> }</td>
              <td>{{ e.cuposRestantes }} / {{ e.cupos }}</td>
              <td class="det-chip"><a-pill tone="info">{{ e.nivelMinimo }}</a-pill></td>
              <td><a-toggle label="Publicado" [on]="e.activo" (onChange)="alternar(e, $event)" /></td>
              <td>
                <div class="flex gap-1">
                  <button type="button" data-compact class="adm-accion adm-accion-icono" [attr.aria-label]="'Editar ' + e.nombre" (click)="editar(e)"><app-icon name="Pencil" class="h-4 w-4" /></button>
                  <button type="button" data-compact class="adm-accion adm-accion-icono peligro" [attr.aria-label]="'Eliminar ' + e.nombre" (click)="borrar.set(e)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="7"></tr> } } @else { <tr><td colspan="7" class="adm-empty">No hay eventos con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-modal [open]="!!edit()" [wide]="true" [title]="esNuevo() ? 'Nuevo evento' : 'Editar evento'" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <div class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <a-field label="Nombre del evento"><input [class]="input" maxlength="80" [value]="e.nombre" (input)="setE({ nombre: $any($event.target).value })" /></a-field>
            <a-field label="Marca o anfitrión"><input [class]="input" maxlength="60" [value]="e.marca" (input)="setE({ marca: $any($event.target).value })" /></a-field>
            <a-field label="Tipo de evento">
              <select [class]="input" (change)="setE({ tipo: $any($event.target).value })">
                @for (t of tipos; track t.slug) { <option [value]="t.slug" [selected]="t.slug === e.tipo">{{ t.label }}</option> }
              </select>
            </a-field>
            <a-field label="Nivel mínimo">
              <select [class]="input" (change)="setE({ nivelMinimo: $any($event.target).value })">
                @for (n of catalog.niveles(); track n.id) { <option [value]="n.nombre" [selected]="n.nombre === e.nivelMinimo">{{ n.nombre }}</option> }
              </select>
            </a-field>
            <a-field label="Fecha"><input [class]="input" type="date" [value]="e.fechaISO" (input)="setE({ fechaISO: $any($event.target).value })" /></a-field>
            <a-field label="Hora"><input [class]="input" maxlength="14" placeholder="8:00 p. m." [value]="e.hora" (input)="setE({ hora: $any($event.target).value })" /></a-field>
            <a-field label="Lugar"><input [class]="input" maxlength="80" [value]="e.lugar" (input)="setE({ lugar: $any($event.target).value })" /></a-field>
            <a-field label="Distrito y ciudad"><input [class]="input" maxlength="60" placeholder="Barranco, Lima" [value]="e.distrito" (input)="setE({ distrito: $any($event.target).value })" /></a-field>
            <a-field label="Cupos totales"><input [class]="input" type="number" min="1" [value]="e.cupos" (input)="setE({ cupos: +$any($event.target).value })" /></a-field>
            <a-field label="Cupos disponibles"><input [class]="input" type="number" min="0" [value]="e.cuposRestantes" (input)="setE({ cuposRestantes: +$any($event.target).value })" /></a-field>
            <a-field label="Costo (texto que ve el participante)"><input [class]="input" maxlength="60" placeholder="Gratuito, S/ 120 por persona…" [value]="e.costo" (input)="setE({ costo: $any($event.target).value })" /></a-field>
          </div>
          <a-field label="Resumen (una línea)"><input [class]="input" maxlength="160" [value]="e.resumen" (input)="setE({ resumen: $any($event.target).value })" /></a-field>
          <a-field label="Descripción"><textarea [class]="input + ' h-28 py-2'" maxlength="800" [value]="e.descripcion" (input)="setE({ descripcion: $any($event.target).value })"></textarea></a-field>
          <div class="grid gap-3 sm:grid-cols-2">
            <a-field label="¿Qué incluye? (uno por línea)"><textarea [class]="input + ' h-28 py-2'" [value]="e.incluyeTxt" (input)="setE({ incluyeTxt: $any($event.target).value })"></textarea></a-field>
            <a-field label="Términos y condiciones (uno por línea)"><textarea [class]="input + ' h-28 py-2'" [value]="e.condicionesTxt" (input)="setE({ condicionesTxt: $any($event.target).value })"></textarea></a-field>
          </div>
          <a-field label="Imágenes del evento (la primera es la principal)">
            <a-image-upload [multiple]="true" aspect="aspect-[3/2]" [value]="e.imgs" (valueChange)="setE({ imgs: $event })" [minAncho]="1024" [minAlto]="683" hint="JPG 1200×800 px (3:2)" />
          </a-field>
          @if (pasado(e)) {
            <div class="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <a-field label="Fotos del evento realizado">
                <a-image-upload [multiple]="true" aspect="aspect-[3/2]" [value]="e.fotosEd" (valueChange)="setE({ fotosEd: $event })" hint="Se muestran en la galería del evento" />
              </a-field>
              <a-field label="Asistentes"><input [class]="input" type="number" min="0" [value]="e.asistentes ?? 0" (input)="setE({ asistentes: +$any($event.target).value })" /></a-field>
            </div>
          }
          <div class="flex items-center justify-between"><span class="text-sm font-medium">Publicado en el sitio</span><a-toggle label="Publicado" [on]="e.activo" (onChange)="setE({ activo: $event })" /></div>
          @if (error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ error() }}</p> }
          <div class="det-pie"><button aBtn variant="outline" (click)="edit.set(null)">Cancelar</button><button aBtn (click)="guardar()">Guardar evento</button></div>
        </div>
      }
    </a-modal>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar este evento?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se quitará <b class="text-foreground">{{ borrar()?.nombre }}</b> del sitio. Las pre-inscripciones ya registradas se conservan en el historial.
    </a-confirm>
  `,
})
export class EventosAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly catalog = inject(CatalogService);
  protected readonly input = INPUT_CLS;
  protected readonly tipos = TIPOS_EVENTO;
  protected readonly pag = new Paginado<Evento>(inject(ApiService), "eventos");
  protected readonly edit = signal<EventoEdit | null>(null);
  protected readonly borrar = signal<Evento | null>(null);
  protected readonly error = signal("");
  protected readonly esNuevo = signal(false);

  constructor() {
    this.pag.recargar();
  }

  protected etiqueta = etiquetaTipo;
  protected fecha = fechaLabel;
  protected pasado = (e: Pick<Evento, "fechaISO">) => esPasado(e);

  private aEdit(e: Evento): EventoEdit {
    return { ...e, imgs: e.galeria?.length ? [...e.galeria] : e.imagen ? [e.imagen] : [], fotosEd: [...(e.fotos ?? [])], incluyeTxt: e.incluye.join("\n"), condicionesTxt: e.condiciones.join("\n") };
  }
  protected nuevo() {
    const d = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    this.esNuevo.set(true);
    this.error.set("");
    this.edit.set(this.aEdit({
      id: `ev${Date.now().toString(36)}`, nombre: "", marca: "", tipo: "cenas", imagen: "", galeria: [], fechaISO: d, hora: "", lugar: "", distrito: "",
      cupos: 20, cuposRestantes: 20, nivelMinimo: "Clásico", costo: "Gratuito", resumen: "", descripcion: "", incluye: [], condiciones: [], activo: true,
    }));
  }
  protected editar(e: Evento) {
    this.esNuevo.set(false);
    this.error.set("");
    this.edit.set(this.aEdit(e));
  }
  protected setE(p: Partial<EventoEdit>) {
    const e = this.edit();
    if (e) this.edit.set({ ...e, ...p });
  }
  protected alternar(e: Evento, activo: boolean) {
    this.api.put(`admin/c/eventos/${e.id}`, { ...e, activo }).subscribe(() => this.pag.recargar());
  }
  protected guardar() {
    const e = this.edit();
    if (!e) return;
    if (e.nombre.trim().length < 3) return this.error.set("Escribe el nombre del evento.");
    if (!e.marca.trim() || !e.lugar.trim() || !e.hora.trim()) return this.error.set("Completa la marca, el lugar y la hora.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.fechaISO)) return this.error.set("Elige la fecha del evento.");
    if (!(e.cupos >= 1)) return this.error.set("Los cupos totales deben ser al menos 1.");
    if (e.cuposRestantes < 0 || e.cuposRestantes > e.cupos) return this.error.set("Los cupos disponibles deben estar entre 0 y los cupos totales.");
    if (!e.imgs.length) return this.error.set("Sube al menos una imagen del evento.");
    this.error.set("");
    const { imgs, fotosEd, incluyeTxt, condicionesTxt, ...base } = e;
    const evento: Evento = {
      ...base, nombre: e.nombre.trim(), marca: e.marca.trim(), imagen: imgs[0]!, galeria: imgs, incluye: lineas(incluyeTxt), condiciones: lineas(condicionesTxt),
      ...(fotosEd.length ? { fotos: fotosEd } : {}),
    };
    this.api.put(`admin/c/eventos/${evento.id}`, evento).subscribe(() => {
      this.edit.set(null);
      this.pag.recargar();
      this.toast.show("Evento guardado");
    });
  }
  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.api.delete(`admin/c/eventos/${b.id}`).subscribe(() => { this.pag.recargar(); this.toast.show("Evento eliminado"); });
  }
}

/* ------------------------------------------------------------------ */
/* Pre-inscripciones                                                   */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-preinscripciones-page",
  imports: [FilaEsqueletoComponent, IconComponent, LimpiarFiltrosComponent, OrdenColumnaComponent, PageHeaderComponent, PagerComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Pre-inscripciones" [desc]="pag.total().toLocaleString('es') + ' solicitudes · al cambiar el estado se ajustan los cupos del evento'" />

    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar pre-inscripción" [class]="input + ' pl-9'" placeholder="Código, participante o evento" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Estado" [class]="input + ' w-auto'" (change)="pag.filtrar('estado', $any($event.target).value)">
        <option value="">Todos los estados</option>
        @for (e of estados; track e) { <option [value]="e">{{ etiquetas[e] }}</option> }
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr>
          <th aOrden="codigo" [pag]="pag" etiquetaOrden="Código">Código</th><th aOrden="evento" [pag]="pag" etiquetaOrden="Evento">Evento</th>
          <th aOrden="participante" [pag]="pag" etiquetaOrden="Participante">Participante</th><th aOrden="fechaISO" [pag]="pag" etiquetaOrden="Fecha">Fecha</th>
          <th>Acomp.</th><th>Estado</th>
        </tr></thead>
        <tbody>
          @for (p of pag.items(); track p.id) {
            <tr>
              <td><b>{{ p.codigo }}</b></td>
              <td>{{ p.evento }}</td>
              <td>{{ p.participante }}<p class="text-xs text-muted-foreground">{{ p.email }} · {{ p.telefono }}</p>@if (p.restricciones) { <p class="text-xs text-muted-foreground">Restricciones: {{ p.restricciones }}</p> }</td>
              <td>{{ p.fecha }}</td>
              <td>{{ p.acompanantes }}</td>
              <td>
                <select [class]="input + ' w-auto'" [attr.aria-label]="'Estado de ' + p.codigo" (change)="cambiar(p, $any($event.target).value)">
                  @for (e of estados; track e) { <option [value]="e" [selected]="e === p.estado">{{ etiquetas[e] }}</option> }
                </select>
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="6"></tr> } } @else { <tr><td colspan="6" class="adm-empty">No hay pre-inscripciones con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />
  `,
})
export class PreinscripcionesAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly etiquetas = ETIQUETA_ESTADO;
  protected readonly estados = Object.keys(ETIQUETA_ESTADO) as EstadoPreinscripcion[];
  protected readonly pag = new Paginado<Preinscripcion>(inject(ApiService), "preinscripciones");

  constructor() {
    this.pag.recargar();
  }

  protected cambiar(p: Preinscripcion, estado: EstadoPreinscripcion) {
    if (estado === p.estado) return;
    this.api.put(`admin/c/preinscripciones/${p.id}`, { ...p, estado }).subscribe(() => {
      this.pag.recargar();
      this.toast.show(`${p.codigo}: ${ETIQUETA_ESTADO[estado].toLowerCase()}`);
    });
  }
}
