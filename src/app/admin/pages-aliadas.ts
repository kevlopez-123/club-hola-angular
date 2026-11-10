import { RouterLink } from "@angular/router";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { MarcaEditorComponent, marcaVacia, type MarcaRow } from "./marca-editor";
import { CargaMasivaComponent } from "./carga-masiva";
import { IconComponent } from "../shared/icon.component";
import {
  BtnDirective, ConfirmComponent, INPUT_CLS, PageHeaderComponent, PagerComponent,
  Paginado, PillComponent, ToastService, ToggleComponent, usarSucio,
  FilaEsqueletoComponent,
  OrdenColumnaComponent,
} from "./kit";


/* ------------------------------------------------------------------ */
/* Marcas aliadas: nombre, logo y sitio web                            */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-marcas-page",
  imports: [CargaMasivaComponent, MarcaEditorComponent, RouterLink, OrdenColumnaComponent, FilaEsqueletoComponent, IconComponent, PageHeaderComponent, BtnDirective, ToggleComponent, ConfirmComponent, PagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Marcas aliadas" [desc]="pag.total().toLocaleString('es') + ' marcas · se eligen al crear productos y beneficios'">
      <button aBtn variant="outline" (click)="cargaMasiva.set(true)"><app-icon name="Upload" class="h-4 w-4" /> Carga masiva</button>
      <button aBtn (click)="edit.set(nueva())"><app-icon name="Plus" class="h-4 w-4" /> Nueva marca</button>
    </a-header>
    <a-carga-masiva tipo="marcas" [abierto]="cargaMasiva()" (cerrado)="cargaMasiva.set(false)" (terminada)="pag.recargar()" />

    <div class="adm-filtros"><div class="adm-busca">
      <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input aria-label="Buscar marca" [class]="input + ' pl-9'" placeholder="Buscar marca o sitio web" (input)="pag.buscar($any($event.target).value)" />
    </div></div>

    <div class="adm-wrap">
      <table class="adm-table adm-compacta">
        <thead>
          <tr><th aria-label="Logo"></th><th aOrden="nombre" [pag]="pag" etiquetaOrden="Marca">Marca</th><th aOrden="web" [pag]="pag" etiquetaOrden="Sitio web">Sitio web</th><th aOrden="activo" [pag]="pag" etiquetaOrden="Publicada">Publicada</th><th></th></tr>
        </thead>
        <tbody>
          @for (m of pag.items(); track m.id) {
            <tr>
              <td>
                @if (m.logo) { <img [src]="m.logo" [alt]="'Logo de ' + m.nombre" class="h-12 w-12 rounded-full border border-border bg-white object-contain p-1" /> }
                @else { <span class="grid h-12 w-12 place-items-center rounded-full bg-secondary text-sm font-extrabold text-primary" aria-hidden="true">{{ m.nombre.slice(0, 2).toUpperCase() }}</span> }
              </td>
              <td><a [routerLink]="['/admin/marcas', m.id]" class="font-bold hover:text-primary hover:underline" [attr.aria-label]="'Ver ficha de ' + m.nombre">{{ m.nombre }}</a></td>
              <td>
                @if (m.web) { <a [href]="m.web" target="_blank" rel="noreferrer" class="text-primary hover:underline">{{ m.web }}</a> }
                @else { <span class="italic">Sin sitio web</span> }
              </td>
              <td><a-toggle label="Publicada" [on]="m.activo" (onChange)="alternar(m, $event)" /></td>
              <td>
                <div class="flex gap-1">
                  <a [routerLink]="['/admin/marcas', m.id]" data-compact class="adm-accion adm-accion-icono" [attr.aria-label]="'Abrir la ficha de ' + m.nombre" [title]="'Ver ficha: productos, beneficios y canjes'"><app-icon name="Eye" class="h-4 w-4" /></a>
                  <button type="button" data-compact class="adm-accion adm-accion-icono" [attr.aria-label]="'Editar ' + m.nombre" [title]="'Editar ' + m.nombre" (click)="edit.set({ ...m })"><app-icon name="Pencil" class="h-4 w-4" /></button>
                  <button type="button" data-compact class="adm-accion adm-accion-icono peligro" [attr.aria-label]="'Eliminar ' + m.nombre" [title]="'Eliminar ' + m.nombre" (click)="borrar.set(m)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="5"></tr> } } @else { <tr><td colspan="5" class="adm-empty">No hay marcas con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-marca-editor [marca]="edit()" (cerrado)="edit.set(null)" (guardada)="edit.set(null); pag.recargar()" />

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar marca?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se quitará <b class="text-foreground">{{ borrar()?.nombre }}</b> de la lista. Los productos y beneficios que la usan conservarán el nombre, pero sin logo ni sitio web.
    </a-confirm>
  `,
})
export class MarcasAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly pag = new Paginado<MarcaRow>(inject(ApiService), "marcas");
  protected readonly edit = signal<MarcaRow | null>(null);
  protected readonly cargaMasiva = signal(false);
  protected readonly borrar = signal<MarcaRow | null>(null);

  constructor() {
    this.pag.recargar();
  }

  protected nueva(): MarcaRow {
    return marcaVacia();
  }
  protected alternar(m: MarcaRow, activo: boolean) {
    this.api.put(`admin/c/marcas/${m.id}`, { ...m, activo }).subscribe(() => this.pag.recargar());
  }
  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.api.delete(`admin/c/marcas/${b.id}`).subscribe(() => {
      this.pag.recargar();
      this.toast.show("Marca eliminada");
    });
  }
}
