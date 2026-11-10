import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { type Importacion } from "../core/importaciones";
import { hojaErrores } from "../core/plantillas-xlsx";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import {
  AdminModalComponent, BtnDirective, FilaEsqueletoComponent, INPUT_CLS, OrdenColumnaComponent, PageHeaderComponent, PagerComponent, Paginado, PillComponent, descargarXlsx,
} from "./kit";

/** Historial de cargas masivas con el reporte de errores de cada una. */
@Component({
  selector: "a-importaciones-page",
  imports: [OrdenColumnaComponent, FilaEsqueletoComponent, LimpiarFiltrosComponent, PageHeaderComponent, PillComponent, BtnDirective, IconComponent, PagerComponent, AdminModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="importaciones" title="Importaciones" [desc]="pag.total().toLocaleString('es') + ' cargas masivas · qué se subió, qué entró y qué se rechazó'" />
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar importación" [class]="input + ' pl-9'" placeholder="Archivo, tipo o usuario" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Filtrar por tipo" [class]="input + ' w-auto'" (change)="pag.filtrar('tipo', $any($event.target).value)">
        <option value="">Todos los tipos</option>
        <option>Participantes</option><option>Códigos de beneficio</option>
      </select>
      <input type="date" aria-label="Desde" [class]="input + ' w-auto'" (input)="pag.filtrar('desde', $any($event.target).value)" />
      <input type="date" aria-label="Hasta" [class]="input + ' w-auto'" (input)="pag.filtrar('hasta', $any($event.target).value)" />
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>
    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr>
          <th aOrden="archivo" [pag]="pag" etiquetaOrden="Archivo">Archivo</th><th aOrden="tipo" [pag]="pag" etiquetaOrden="Tipo">Tipo</th><th aOrden="ts" [pag]="pag" etiquetaOrden="Fecha">Fecha</th>
          <th aOrden="usuario" [pag]="pag" etiquetaOrden="Usuario">Usuario</th><th>Filas</th><th>Importadas</th><th>Con errores</th><th aria-label="Acciones"></th>
        </tr></thead>
        <tbody>
          @for (i of pag.items(); track i.id) {
            <tr>
              <td><b>{{ i.archivo }}</b></td>
              <td class="det-completo det-chip"><a-pill>{{ i.tipo }}</a-pill></td>
              <td>{{ i.fecha }}</td>
              <td>{{ i.usuario }}</td>
              <td>{{ i.total }}</td>
              <td>{{ i.importadas }}</td>
              <td>@if (i.conErrores) { <a-pill tone="bad">{{ i.conErrores }}</a-pill> } @else { <span class="text-xs text-muted-foreground">Sin errores</span> }</td>
              <td>
                @if (i.errores.length) {
                  <div class="flex flex-wrap gap-1">
                    <button aBtn variant="ghost" [attr.aria-label]="'Ver errores de ' + i.archivo" (click)="ver.set(i)"><app-icon name="Eye" class="h-4 w-4" /> Ver</button>
                    <button aBtn variant="outline" [attr.aria-label]="'Descargar reporte de errores de ' + i.archivo" (click)="descargar(i)"><app-icon name="Download" class="h-4 w-4" /> Reporte Excel</button>
                  </div>
                } @else { <span class="text-xs text-muted-foreground">—</span> }
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="8"></tr> } } @else { <tr><td colspan="8" class="adm-empty">Todavía no se importó ningún archivo</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-modal [open]="!!ver()" [wide]="true" title="Filas rechazadas" (closed)="ver.set(null)">
      @if (ver(); as i) {
        <p class="mb-3 text-sm text-muted-foreground"><b class="text-foreground">{{ i.archivo }}</b> · {{ i.importadas }} de {{ i.total }} filas importadas. Corrige estas filas en el archivo y vuelve a subirlo.</p>
        <div class="overflow-x-auto rounded-xl border border-border">
          <table class="w-full min-w-[520px] text-left text-sm" aria-label="Filas rechazadas">
            <thead class="bg-muted text-xs text-muted-foreground"><tr><th class="px-3 py-2">Fila</th><th class="px-3 py-2">Motivo</th><th class="px-3 py-2">Datos</th></tr></thead>
            <tbody>
              @for (e of i.errores; track $index) {
                <tr class="border-t border-border align-top"><td class="px-3 py-1.5">{{ e.fila }}</td><td class="px-3 py-1.5 text-destructive">{{ e.motivo }}</td><td class="px-3 py-1.5 font-mono text-xs">{{ e.datos.join(' · ') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button aBtn variant="outline" (click)="ver.set(null)">Cerrar</button>
          <button aBtn (click)="descargar(i)"><app-icon name="Download" class="h-4 w-4" /> Descargar reporte</button>
        </div>
      }
    </a-modal>
  `,
})
export class ImportacionesPage {
  protected readonly input = INPUT_CLS;
  protected readonly pag = new Paginado<Importacion>(inject(ApiService), "importaciones", 25);
  protected readonly ver = signal<Importacion | null>(null);

  constructor() {
    this.pag.sort.set("ts");
    this.pag.dir.set("desc");
    this.pag.recargar();
  }
  /** CSV con solo las filas rechazadas y su motivo: se corrige y se vuelve a subir. */
  protected descargar(i: Importacion) {
    descargarXlsx(`errores_${i.archivo.replace(/\.[^.]+$/, "")}.xlsx`, [hojaErrores(i.columnas?.length ? i.columnas : ["dato"], i.errores)]);
  }
}