import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { BrandService } from "../core/brand.service";
import { CatalogService } from "../core/catalog.service";
import {
  AJUSTES_BASE, bloqueNuevo, bloquesDe, correoValido, DISENO_BASE, EJEMPLO_VARS, MAX_CCO, FUENTE_MARCA, FUENTES_CORREO, nombreFuenteSeguro, PLANTILLAS_BASE, renderCorreoHtml, textoPlano,
  type AjustesCorreo, type BloqueCorreo, type NotificacionPlantilla, type CorreoEnviado, type DisenoCorreo, type EntornoCorreo, type PlantillaCorreo, type TipoBloque,
} from "../core/correos";
import { IconComponent } from "../shared/icon.component";
import { etiquetaAudiencia, type AudienciaCampana, type Campana } from "../core/campanas";
import { AdminSession } from "./session";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import {
  AdminModalComponent, BtnDirective, ConfirmComponent, FieldComponent, FilaEsqueletoComponent, ImageUploadComponent, INPUT_CLS, OrdenColumnaComponent,
  PageHeaderComponent, PagerComponent, Paginado, PanelComponent, PillComponent, ToastService, ToggleComponent,
} from "./kit";

const GRUPOS: PlantillaCorreo["grupo"][] = ["Seguridad y acceso", "Compras y nivel", "Beneficios y contacto", "Alertas internas"];
const TIPOS: { t: TipoBloque; l: string; icon: string }[] = [
  { t: "titulo", l: "Título", icon: "AlignLeft" },
  { t: "texto", l: "Texto", icon: "FileText" },
  { t: "imagen", l: "Imagen", icon: "Image" },
  { t: "boton", l: "Botón", icon: "Link2" },
  { t: "divisor", l: "Divisor", icon: "Minus" },
];

/* ------------------------------------------------------------------ */
/* Vista previa del correo: escritorio y móvil (HTML real del correo)  */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-correo-preview",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-3 flex items-center justify-between gap-2">
      <span class="text-sm font-semibold text-foreground">Vista previa</span>
      <div role="group" aria-label="Tamaño de la vista previa" class="inline-flex rounded-xl border border-border p-0.5">
        <button type="button" data-compact [attr.aria-pressed]="modo() === 'desktop'" (click)="modo.set('desktop')"
          [class]="'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ' + (modo() === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')">
          <app-icon name="Monitor" class="h-4 w-4" /> Escritorio
        </button>
        <button type="button" data-compact [attr.aria-pressed]="modo() === 'mobile'" (click)="modo.set('mobile')"
          [class]="'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ' + (modo() === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')">
          <app-icon name="Smartphone" class="h-4 w-4" /> Móvil
        </button>
      </div>
    </div>
    @if (para() || asunto()) {
      <div class="mb-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
        @if (para()) { <p class="truncate text-muted-foreground">Para: {{ para() }}</p> }
        <p class="truncate font-semibold text-foreground">{{ asunto() }}</p>
      </div>
    }
    <div #caja class="overflow-hidden rounded-2xl bg-muted p-3">
      <div class="mx-auto" [style.width.px]="ancho() * escala()" [style.height.px]="alto() * escala()">
        <iframe title="Correo renderizado" aria-label="Correo renderizado" sandbox="allow-same-origin" [attr.data-modo]="modo()" [srcdoc]="doc()"
          [class]="'block border-0 bg-white shadow-md ' + (modo() === 'mobile' ? 'rounded-[28px] ring-[6px] ring-foreground/80' : 'rounded-lg')"
          [style.width.px]="ancho()" [style.height.px]="alto()" [style.transform]="'scale(' + escala() + ')'" style="transform-origin: top left"></iframe>
      </div>
    </div>
  `,
})
export class CorreoPreviewComponent {
  private readonly san = inject(DomSanitizer);
  readonly html = input.required<string>();
  readonly asunto = input("");
  readonly para = input("");
  protected readonly modo = signal<"desktop" | "mobile">("desktop");
  private readonly caja = viewChild<ElementRef<HTMLElement>>("caja");
  private readonly disponible = signal(0);
  /** Tamaño real del correo (se ve completo y se reduce si el panel es angosto). */
  protected readonly ancho = computed(() => (this.modo() === "mobile" ? 375 : 640));
  protected readonly alto = computed(() => (this.modo() === "mobile" ? 640 : 560));
  protected readonly escala = computed(() => (this.disponible() > 0 ? Math.min(1, (this.disponible() - 24) / this.ancho()) : 1));
  constructor() {
    afterNextRender(() => {
      const el = this.caja()?.nativeElement;
      if (!el) return;
      this.disponible.set(el.clientWidth);
      const ro = new ResizeObserver(() => this.disponible.set(el.clientWidth));
      ro.observe(el);
      this.destroy.onDestroy(() => ro.disconnect());
    });
  }
  private readonly destroy = inject(DestroyRef);
  protected readonly doc = computed(() => this.san.bypassSecurityTrustHtml(this.html()));
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-correos-page",
  imports: [
    RouterLink, CorreoPreviewComponent, IconComponent, PageHeaderComponent, PanelComponent, PillComponent, BtnDirective, FieldComponent, ToggleComponent,
    AdminModalComponent, ConfirmComponent, PagerComponent, OrdenColumnaComponent, FilaEsqueletoComponent, LimpiarFiltrosComponent, ImageUploadComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="correos" title="Correos" desc="Diseña los correos automáticos con la marca del programa y revisa lo que se envió a participantes y al equipo." />
    <div role="tablist" aria-label="Secciones de correos" class="mb-5 inline-flex rounded-xl border border-border p-0.5">
      @for (t of tabs; track t.id) {
        <button role="tab" type="button" [attr.aria-selected]="tab() === t.id" (click)="tab.set(t.id)"
          [class]="'min-h-10 rounded-lg px-4 text-sm font-semibold ' + (tab() === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')">{{ t.label }}</button>
      }
    </div>

    @switch (tab()) {
      @case ('plantillas') {
        <div class="space-y-6">
          @for (g of grupos; track g) {
            <a-panel [title]="g">
              <ul class="divide-y divide-border">
                @for (p of porGrupo(g); track p.id) {
                  <li class="flex flex-wrap items-center gap-3 py-3">
                    <div class="min-w-0 flex-1 basis-60">
                      <p class="font-semibold text-foreground">{{ p.nombre }} @if (p.fija) { <a-pill tone="info">Seguridad</a-pill> } @if (p.interna) { <a-pill tone="muted">Equipo</a-pill> } @if (p.notificar?.activo) { <a-pill tone="ok">Campanita</a-pill> }</p>
                      <p class="text-sm text-muted-foreground">{{ p.evento }}</p>
                    </div>
                    @if (p.fija) {
                      <span class="text-sm text-muted-foreground">Siempre activa</span>
                    } @else {
                      <a-toggle [label]="'Activar ' + p.nombre" [on]="p.activo" (onChange)="activar(p, $event)" />
                    }
                    <button aBtn variant="outline" [attr.aria-label]="'Editar ' + p.nombre" (click)="editar(p)"><app-icon name="Pencil" class="h-4 w-4" /> Editar</button>
                  </li>
                }
              </ul>
            </a-panel>
          }
        </div>
      }
      @case ('ajustes') {
        <div class="max-w-3xl">
          <a-panel title="Copia oculta (CCO)">
            <p class="mb-4 text-sm text-muted-foreground">Cada correo que se envía a un participante puede llegar también a estas direcciones, sin que el participante las vea. Sirve, por ejemplo, para archivar lo que se comunica o para auditoría del banco.</p>
            <div class="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <span class="text-sm font-medium">Enviar copia oculta en los correos</span>
              <a-toggle label="Enviar copia oculta" [on]="ajustes().cco.activo" (onChange)="setCco({ activo: $event })" />
            </div>
            <div class="mt-4 space-y-4" [class.opacity-60]="!ajustes().cco.activo">
              <a-field label="Direcciones en copia oculta">
                <span class="flex flex-wrap gap-2">
                  <input [class]="input + ' min-w-0 flex-1'" type="email" aria-label="Agregar dirección en copia oculta" placeholder="auditoria@banco.com" [value]="nuevaCco()"
                    (input)="nuevaCco.set($any($event.target).value); errorCco.set('')" (keydown.enter)="$event.preventDefault(); agregarCco()" (blur)="agregarCco()" />
                  <button aBtn variant="outline" type="button" (click)="agregarCco()"><app-icon name="Plus" class="h-4 w-4" /> Agregar</button>
                </span>
              </a-field>
              @if (errorCco()) { <p role="alert" class="-mt-2 text-sm font-medium text-destructive">{{ errorCco() }}</p> }
              @if (ajustes().cco.direcciones.length) {
                <ul class="flex flex-wrap gap-2" aria-label="Direcciones en copia oculta">
                  @for (d of ajustes().cco.direcciones; track d) {
                    <li class="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pl-3 pr-1 text-sm">{{ d }}
                      <button type="button" class="grid h-7 w-7 place-items-center rounded-full hover:bg-background" [attr.aria-label]="'Quitar ' + d" (click)="quitarCco(d)"><app-icon name="X" class="h-3.5 w-3.5" /></button></li>
                  }
                </ul>
              } @else { <p class="text-sm text-muted-foreground">Todavía no hay direcciones.</p> }
              <fieldset class="space-y-1">
                <legend class="mb-1 text-sm font-medium">A qué correos se aplica</legend>
                <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" class="h-4 w-4" [checked]="ajustes().cco.sistema" (change)="setCco({ sistema: $any($event.target).checked })" /> Correos automáticos a participantes (códigos, pedidos, puntos…)</label>
                <label class="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" class="h-4 w-4" [checked]="ajustes().cco.campanas" (change)="setCco({ campanas: $any($event.target).checked })" /> Campañas masivas</label>
              </fieldset>
              <p class="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Las copias llevan datos personales de los participantes: usa solo buzones internos autorizados (máximo {{ maxCco }}). Los avisos internos del equipo no llevan copia, y si una dirección coincide con la del destinatario no se repite.</p>
            </div>
            <div class="det-pie"><button aBtn (click)="guardarAjustes()">Guardar ajustes</button></div>
          </a-panel>
        </div>
      }
      @case ('diseno') {
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="space-y-6">
            <a-panel title="Marca del correo">
              <p class="mb-4 text-sm text-muted-foreground">Se aplica a todos los correos. Si dejas un campo vacío se usa el de la marca del programa.</p>
              <div class="space-y-4">
                <a-field label="Logo del encabezado">
                  <a-image-upload [value]="uno(diseno().logo)" (valueChange)="setDiseno({ logo: $event[0] ?? '' })" hint="PNG o SVG con fondo transparente, pensado para fondo de color" aspect="aspect-[3/1]" />
                </a-field>
                <a-field label="Imagen de cabecera (opcional)">
                  <a-image-upload [value]="uno(diseno().banner)" (valueChange)="setDiseno({ banner: $event[0] ?? '' })" hint="Banner bajo el logo, 600 × 200 px" aspect="aspect-[3/1]" [minAncho]="600" [minAlto]="200" />
                </a-field>
                <div class="grid grid-cols-2 gap-4">
                  @for (c of colores; track c.k) {
                    <a-field [label]="c.l">
                      <span class="flex items-center gap-2">
                        <input type="color" [attr.aria-label]="c.l" class="h-11 w-14 cursor-pointer rounded-lg border border-input bg-background p-1" [value]="colorDe(c.k)" (input)="setColor(c.k, $any($event.target).value)" />
                        <button type="button" data-compact class="text-xs font-semibold text-primary hover:underline" (click)="setColor(c.k, c.def)">{{ c.def ? 'Restaurar' : 'Usar marca' }}</button>
                      </span>
                    </a-field>
                  }
                </div>
                <a-field label="Tipografía">
                  <select [class]="input" aria-label="Tipografía del correo" (change)="elegirFuente($any($event.target).value)">
                    <optgroup label="Seguras (se ven igual en todos los correos)">
                      @for (f of fuentes; track f.v) { <option [value]="f.v" [selected]="modoFuente() === 'segura' && diseno().fuente === f.v" [style.font-family]="f.v">{{ f.l }}</option> }
                    </optgroup>
                    <optgroup label="Web (con alternativa segura)">
                      <option value="__marca__" [selected]="modoFuente() === 'marca'">La de la marca ({{ fuenteMarca() || 'sin definir' }})</option>
                      <option value="__google__" [selected]="modoFuente() === 'google'">Otra de Google Fonts…</option>
                    </optgroup>
                  </select>
                </a-field>
                @if (modoFuente() === 'google') {
                  <a-field label="Nombre en Google Fonts">
                    <input [class]="input" aria-label="Nombre de la fuente en Google Fonts" placeholder="Poppins, Inter, Open Sans…" [value]="diseno().fuenteWeb" (input)="setDiseno({ fuenteWeb: $any($event.target).value })" />
                  </a-field>
                  @if (diseno().fuenteWeb && !fuenteWebValida()) { <p role="alert" class="-mt-2 text-xs font-medium text-destructive">Usa solo letras, números y espacios, tal como aparece en fonts.google.com.</p> }
                }
                @if (modoFuente() !== 'segura') {
                  <p class="-mt-2 text-xs text-muted-foreground">Gmail y Outlook no descargan fuentes web: ahí se usará {{ nombreSegura() }}. Apple Mail, iOS Mail y la mayoría de los clientes móviles sí la muestran.</p>
                }
                <a-field label="Texto del pie">
                  <textarea [class]="input + ' h-20 py-2'" placeholder="Enviado por {banco}. Este es un correo automático: no respondas a este mensaje." [value]="diseno().pie" (input)="setDiseno({ pie: $any($event.target).value })"></textarea>
                </a-field>
                <div class="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <span class="text-sm font-medium">Mostrar redes sociales en el pie</span>
                  <a-toggle label="Mostrar redes sociales" [on]="diseno().mostrarRedes" (onChange)="setDiseno({ mostrarRedes: $event })" />
                </div>
                <!-- Las redes salen de Configuración del sitio: si ninguna tiene enlace, el pie no puede mostrar nada. -->
                @if (redesConfiguradas().length) {
                  <p class="-mt-2 text-xs text-muted-foreground">Se muestran las que tienen enlace en Configuración: {{ redesConfiguradas().join(', ') }}.</p>
                } @else {
                  <p role="status" class="-mt-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                    Todavía no hay redes sociales con enlace, por eso la vista previa no muestra nada en el pie.
                    <a routerLink="/admin/configuracion" class="font-semibold text-primary underline">Agrégalas en Configuración → Redes sociales</a>.
                  </p>
                }
              </div>
              <div class="mt-5 flex flex-wrap justify-between gap-2">
                <button aBtn variant="ghost" (click)="restaurarDiseno()">Restaurar diseño original</button>
                <button aBtn (click)="guardarDiseno()">Guardar diseño</button>
              </div>
            </a-panel>
          </div>
          <div>
            <label class="mb-3 block text-sm font-medium">Probar con la plantilla
              <select [class]="input + ' mt-1.5'" aria-label="Plantilla de ejemplo" (change)="ejemploId.set($any($event.target).value)">
                @for (p of plantillas(); track p.id) { <option [value]="p.id" [selected]="p.id === ejemploId()">{{ p.nombre }}</option> }
              </select>
            </label>
            <a-correo-preview [html]="htmlEjemplo()" />
          </div>
        </div>
      }
      @case ('campanas') {
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted-foreground">Mensajes masivos a una audiencia (todos o por nivel). Solo llegan a participantes activos que aceptan novedades; cada correo usa el diseño de marca y pasa por la misma cola de envío.</p>
          <button aBtn (click)="nuevaCampana()"><app-icon name="Plus" class="h-4 w-4" /> Nueva campaña</button>
        </div>
        <div class="adm-wrap">
          <table class="adm-table">
            <thead><tr><th>Campaña</th><th>Estado</th><th>Audiencia</th><th>Fecha</th><th>Destinatarios</th><th>Resultado</th></tr></thead>
            <tbody>
              @for (c of campanas(); track c.id) {
                <tr>
                  <td><button type="button" class="text-left font-bold hover:underline" [attr.aria-label]="'Ver detalle de la campaña ' + c.nombre" (click)="campDetalle.set(c)">{{ c.nombre }}</button><span class="block text-xs text-muted-foreground">{{ c.asunto }}</span></td>
                  <td class="det-completo det-chip"><a-pill [tone]="c.estado === 'Enviada' ? 'ok' : 'muted'">{{ c.estado }}</a-pill></td>
                  <td>{{ etiquetaAud(c) }}</td>
                  <td>{{ c.fecha }}</td>
                  <td>{{ c.total ?? 0 }}@if (c.excluidos) { <span class="block text-xs text-muted-foreground">{{ c.excluidos }} excluidos</span> }</td>
                  <td class="adm-ancha">
                    @if (stats()[c.id]; as st) {
                      <span class="text-xs">{{ st['Enviado'] ?? 0 }} enviados · {{ (st['En cola'] ?? 0) + (st['Reintentando'] ?? 0) }} en proceso · {{ st['Rebotado'] ?? 0 }} rebotados · {{ st['Fallido'] ?? 0 }} fallidos</span>
                    } @else { <span class="text-xs text-muted-foreground">—</span> }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="adm-empty">Todavía no hay campañas</td></tr>
              }
            </tbody>
          </table>
        </div>
      }      @default {
        <ul class="mb-4 flex flex-wrap gap-2" aria-label="Resumen de envíos">
          @for (e of estados; track e) {
            <li class="rounded-xl border border-border bg-card px-3 py-1.5 text-sm"><span class="font-bold text-foreground">{{ pag.facetas()['estado']?.[e] ?? 0 }}</span> <span class="text-muted-foreground">{{ plural(e) }}</span></li>
          }
        </ul>
        <div class="adm-filtros">
          <div class="adm-busca">
            <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Buscar correo" [class]="input + ' pl-9'" [value]="pag.q()" placeholder="Destinatario, asunto o referencia" (input)="pag.buscar($any($event.target).value)" />
          </div>
          <select aria-label="Filtrar por plantilla" [class]="input + ' w-auto'" (change)="pag.filtrar('plantillaId', $any($event.target).value)">
            <option value="">Todas las plantillas</option>
            @for (p of plantillas(); track p.id) { <option [value]="p.id">{{ p.nombre }}</option> }
          </select>
          <select aria-label="Filtrar por estado" [class]="input + ' w-auto'" (change)="pag.filtrar('estado', $any($event.target).value)">
            <option value="">Todos los estados</option>
            @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
          </select>
          <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
        </div>
        <div class="adm-wrap">
          <table class="adm-table">
            <thead><tr>
              <th aOrden="para" [pag]="pag" etiquetaOrden="Destinatario">Destinatario</th>
              <th aOrden="estado" [pag]="pag" etiquetaOrden="Estado">Estado</th>
              <th aOrden="fecha" [pag]="pag" etiquetaOrden="Fecha">Fecha</th>
              <th aOrden="plantilla" [pag]="pag" etiquetaOrden="Plantilla">Plantilla</th>
              <th aOrden="asunto" [pag]="pag" etiquetaOrden="Asunto">Asunto</th>
              <th aria-label="Acciones"></th>
            </tr></thead>
            <tbody>
              @for (c of pag.items(); track c.id) {
                <tr>
                  <td><b>{{ c.destinatario || c.para }}</b><span class="block text-xs font-normal text-muted-foreground">{{ c.para }}</span></td>
                  <td class="det-completo det-chip">
                    <a-pill [tone]="tono(c.estado)">{{ c.estado }}</a-pill>
                    @if (c.error) { <span class="mt-1 block text-xs text-muted-foreground">{{ c.error }}</span> }
                    @if (c.intentos && c.intentos > 1) { <span class="block text-xs text-muted-foreground">{{ c.intentos }} intentos</span> }
                  </td>
                  <td>{{ c.fecha }}</td>
                  <td>{{ c.plantilla }}@if (c.referencia) { <span class="block text-xs text-muted-foreground">{{ c.referencia }}</span> }</td>
                  <td class="adm-ancha">{{ c.asunto }}</td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      @if (c.estado === 'Fallido') {
                        <button aBtn variant="outline" [attr.aria-label]="'Reintentar envío ' + c.asunto" (click)="reintentar(c)"><app-icon name="Loader2" class="h-4 w-4" /> Reintentar</button>
                      }
                      <button aBtn variant="ghost" [attr.aria-label]="'Ver correo ' + c.asunto" (click)="ver.set(c)"><app-icon name="Eye" class="h-4 w-4" /> Ver</button>
                      <button aBtn variant="ghost" [attr.aria-label]="'Reenviar correo ' + c.asunto" (click)="reenviar(c)"><app-icon name="Send" class="h-4 w-4" /> Reenviar</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="6"></tr> } } @else { <tr><td colspan="6" class="adm-empty">Todavía no se envió ningún correo</td></tr> }
              }
            </tbody>
          </table>
        </div>
        <a-pager [p]="pag" />
      }
    }

    <a-modal [open]="!!edit()" [wide]="true" [xl]="true" [title]="'Editar: ' + (edit()?.nombre ?? '')" [sucio]="sucio()" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="space-y-4">
            <a-field label="Asunto"><input [class]="input" [value]="e.asunto" (input)="cambiarAsunto($event)" /></a-field>
            <div>
              <p class="mb-1.5 text-sm font-medium">Contenido del correo</p>
              <ol class="space-y-2" aria-label="Bloques del correo">
                @for (b of bloques(); track b.id; let i = $index; let ult = $last) {
                  <li class="rounded-xl border border-border bg-background p-3">
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <span class="text-xs font-bold uppercase tracking-wide text-muted-foreground">{{ nombreTipo(b.tipo) }}</span>
                      <span class="flex items-center">
                        @if (b.tipo !== 'divisor' && b.tipo !== 'imagen') {
                          <button type="button" data-compact class="grid h-9 w-9 place-items-center rounded-lg text-xs font-bold hover:bg-muted" [attr.aria-label]="'Alinear ' + nombreTipo(b.tipo) + ' ' + (i + 1) + (b.alinear === 'center' ? ' a la izquierda' : ' al centro')" (click)="setBloque(i, { alinear: b.alinear === 'center' ? 'left' : 'center' })">{{ b.alinear === 'center' ? '≡' : '☰' }}</button>
                        }
                        <button type="button" data-compact class="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted disabled:opacity-30" [disabled]="i === 0" [attr.aria-label]="'Subir ' + nombreTipo(b.tipo) + ' ' + (i + 1)" (click)="mover(i, -1)"><app-icon name="ArrowUp" class="h-4 w-4" /></button>
                        <button type="button" data-compact class="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted disabled:opacity-30" [disabled]="ult" [attr.aria-label]="'Bajar ' + nombreTipo(b.tipo) + ' ' + (i + 1)" (click)="mover(i, 1)"><app-icon name="ArrowDown" class="h-4 w-4" /></button>
                        <button type="button" data-compact class="grid h-9 w-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10" [attr.aria-label]="'Quitar ' + nombreTipo(b.tipo) + ' ' + (i + 1)" (click)="quitar(i)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                      </span>
                    </div>
                    @switch (b.tipo) {
                      @case ('titulo') { <input [class]="input" [attr.aria-label]="'Texto del título ' + (i + 1)" [value]="b.texto ?? ''" (focus)="foco.set(i)" (input)="setBloque(i, { texto: $any($event.target).value })" /> }
                      @case ('texto') { <textarea [class]="input + ' h-28 py-2'" [attr.aria-label]="'Texto del párrafo ' + (i + 1)" [value]="b.texto ?? ''" (focus)="foco.set(i)" (input)="setBloque(i, { texto: $any($event.target).value })"></textarea> }
                      @case ('imagen') {
                        <a-image-upload [value]="uno(b.imagen)" (valueChange)="setBloque(i, { imagen: $event[0] ?? '' })" hint="Ancho recomendado: 600 px" aspect="aspect-[3/1]" />
                        <input class="mt-2" [class]="input" [attr.aria-label]="'Texto alternativo de la imagen ' + (i + 1)" placeholder="Descripción de la imagen (accesibilidad)" [value]="b.alt ?? ''" (input)="setBloque(i, { alt: $any($event.target).value })" />
                      }
                      @case ('boton') {
                        <div class="grid gap-2 sm:grid-cols-2">
                          <input [class]="input" [attr.aria-label]="'Texto del botón ' + (i + 1)" placeholder="Texto del botón" [value]="b.texto ?? ''" (input)="setBloque(i, { texto: $any($event.target).value })" />
                          <input [class]="input" [attr.aria-label]="'Enlace del botón ' + (i + 1)" placeholder="https://… o {sitio}/ruta" [value]="b.url ?? ''" (input)="setBloque(i, { url: $any($event.target).value })" />
                        </div>
                      }
                      @default { <p class="text-xs text-muted-foreground">Línea separadora.</p> }
                    }
                  </li>
                }
              </ol>
              <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Agregar bloque">
                @for (t of tipos; track t.t) {
                  <button aBtn variant="outline" [attr.aria-label]="'Agregar bloque ' + t.l" (click)="agregar(t.t)"><app-icon [name]="t.icon" class="h-4 w-4" /> {{ t.l }}</button>
                }
              </div>
            </div>
            <div>
              <p class="mb-1.5 text-sm font-medium">Variables (toca una para insertarla en el texto que editas)</p>
              <div class="flex flex-wrap gap-1.5">
                @for (v of e.variables; track v) { <button type="button" data-compact class="rounded-md bg-muted px-2 py-1 font-mono text-xs hover:bg-primary/15" (click)="insertarVariable(v)">{{ '{' + v + '}' }}</button> }
              </div>
            </div>
            @if (!e.interna && !e.fija) {
              <div class="space-y-3 rounded-xl border border-border p-3">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium">Aviso dentro del sitio (campanita)</p>
                    <p class="text-xs text-muted-foreground">Además del correo, el participante ve este aviso en su cuenta. Funciona aunque el correo esté desactivado.</p>
                  </div>
                  <a-toggle label="Activar aviso dentro del sitio" [on]="notif().activo" (onChange)="setNotif({ activo: $event })" />
                </div>
                @if (notif().activo) {
                  <a-field label="Título del aviso"><input [class]="input" [value]="notif().titulo" (input)="setNotif({ titulo: $any($event.target).value })" /></a-field>
                  <a-field label="Texto del aviso"><input [class]="input" [value]="notif().texto" (input)="setNotif({ texto: $any($event.target).value })" /></a-field>
                  <a-field label="Enlace del aviso"><input [class]="input" placeholder="/mis-compras/{codigo}" [value]="notif().enlace ?? ''" (input)="setNotif({ enlace: $any($event.target).value })" /></a-field>
                  <div class="rounded-xl bg-muted p-3 text-sm" aria-label="Vista previa del aviso">
                    <p class="font-bold">{{ vistaNotif(notif().titulo) }}</p>
                    <p class="text-muted-foreground">{{ vistaNotif(notif().texto) }}</p>
                  </div>
                }
              </div>
            }
            @if (!e.interna) {
              <div class="space-y-3 rounded-xl border border-border p-3" role="group" aria-label="Copia oculta de esta plantilla">
                <div>
                  <p class="text-sm font-medium">Copia oculta (CCO) de esta plantilla</p>
                  <p class="text-xs text-muted-foreground">Elige quién recibe copia de este correo en particular. Los participantes no ven estas direcciones.</p>
                </div>
                <select [class]="input" aria-label="Quién recibe copia de este correo" (change)="setCcoPl({ modo: $any($event.target).value })">
                  <option value="global" [selected]="ccoPl().modo === 'global'">Según los Ajustes generales</option>
                  <option value="propio" [selected]="ccoPl().modo === 'propio'">Solo estas direcciones</option>
                  <option value="ninguno" [selected]="ccoPl().modo === 'ninguno'">Sin copia</option>
                </select>
                @if (ccoPl().modo === 'propio') {
                  <div class="flex gap-2">
                    <input type="email" [class]="input" aria-label="Agregar dirección de copia de esta plantilla" placeholder="comercial@banco.com" [value]="nuevaCcoPl()"
                      (input)="nuevaCcoPl.set($any($event.target).value); errorCcoPl.set('')" (keydown.enter)="$event.preventDefault(); agregarCcoPl()" (blur)="agregarCcoPl()" />
                    <button aBtn variant="outline" type="button" (click)="agregarCcoPl()"><app-icon name="Plus" class="h-4 w-4" /> Agregar</button>
                  </div>
                  @if (errorCcoPl()) { <p role="alert" class="text-xs font-medium text-destructive">{{ errorCcoPl() }}</p> }
                  <ul class="flex flex-wrap gap-2" aria-label="Direcciones de copia de esta plantilla">
                    @for (d of ccoPl().direcciones; track d) {
                      <li class="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-3 pr-1 text-sm">{{ d }}
                        <button type="button" class="grid h-7 w-7 place-items-center rounded-full hover:bg-background" [attr.aria-label]="'Quitar ' + d" (click)="quitarCcoPl(d)"><app-icon name="X" class="h-3.5 w-3.5" /></button></li>
                    } @empty { <li class="text-sm text-muted-foreground">Agrega al menos una dirección; si no, no habrá copia.</li> }
                  </ul>
                  <p class="text-xs text-muted-foreground">Reemplaza la copia de los Ajustes para esta plantilla, incluso si esa está apagada.</p>
                }
              </div>
            }
            <div class="flex flex-wrap items-end gap-2">
              <a-field label="Enviar una prueba a" class="min-w-0 flex-1"><input type="email" [class]="input" placeholder="tu@correo.com" [value]="prueba()" (input)="prueba.set($any($event.target).value)" /></a-field>
              <button aBtn variant="outline" (click)="probar()">Enviar prueba</button>
            </div>
          </div>
          <a-correo-preview [html]="htmlEdicion()" [asunto]="asuntoEdicion()" [para]="e.interna ? 'equipo@banco.com' : ''" />
        </div>
        <div class="mt-6 flex flex-wrap justify-between gap-2">
          <button aBtn variant="ghost" (click)="restaurar(e)">Restaurar diseño original</button>
          <div class="flex gap-2">
            <button aBtn variant="outline" (click)="edit.set(null)">Cancelar</button>
            <button aBtn [disabled]="!e.asunto.trim() || !bloques().length" (click)="guardar(e)">Guardar</button>
          </div>
        </div>
      }
    </a-modal>

    <a-modal [open]="!!camp()" [wide]="true" [xl]="true" title="Nueva campaña" [sucio]="campSucia()" (closed)="camp.set(null)">
      @if (camp(); as c) {
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="space-y-4">
            <a-field label="Nombre interno"><input [class]="input" placeholder="Promo de fin de año" [value]="c.nombre" (input)="setCamp({ nombre: $any($event.target).value })" /></a-field>
            <a-field label="Asunto del correo"><input [class]="input" [value]="c.asunto" (input)="setCamp({ asunto: $any($event.target).value })" /></a-field>
            <a-field label="Mensaje"><textarea [class]="input + ' h-32 py-2'" placeholder="Hola {nombre}, …" [value]="c.mensaje" (input)="setCamp({ mensaje: $any($event.target).value })"></textarea></a-field>
            <div class="grid gap-3 sm:grid-cols-2">
              <a-field label="Texto del botón (opcional)"><input [class]="input" [value]="c.botonTexto ?? ''" (input)="setCamp({ botonTexto: $any($event.target).value })" /></a-field>
              <a-field label="Enlace del botón"><input [class]="input" placeholder="{sitio}/beneficios" [value]="c.botonUrl ?? ''" (input)="setCamp({ botonUrl: $any($event.target).value })" /></a-field>
            </div>
            <fieldset class="space-y-3 rounded-xl border border-border p-3">
              <legend class="px-1 text-sm font-medium">Audiencia</legend>
              <select [class]="input" aria-label="Tipo de audiencia" (change)="setAud({ tipo: $any($event.target).value })">
                <option value="todos" [selected]="c.audiencia.tipo === 'todos'">Todos los participantes activos</option>
                <option value="nivel" [selected]="c.audiencia.tipo === 'nivel'">Por nivel</option>
              </select>
              @if (c.audiencia.tipo === 'nivel') {
                <select [class]="input" aria-label="Nivel de la audiencia" (change)="setAud({ nivel: $any($event.target).value })">
                  @for (n of niveles(); track n.id) { <option [value]="n.nombre" [selected]="c.audiencia.nivel === n.nombre">{{ n.nombre }}</option> }
                </select>
              }
              <p role="status" class="text-sm" aria-label="Alcance de la audiencia">
                @if (alcance(); as a) {
                  Llegará a <b>{{ a.total }}</b> participantes@if (a.excluidos) { · <span class="text-muted-foreground">{{ a.excluidos }} quedan fuera (bloqueados o sin aceptar novedades)</span> }.
                } @else { Calculando…  }
              </p>
            </fieldset>
            <div class="flex flex-wrap items-end gap-2">
              <a-field label="Enviar una prueba a" class="min-w-0 flex-1"><input type="email" [class]="input" placeholder="tu@correo.com" [value]="pruebaCamp()" (input)="pruebaCamp.set($any($event.target).value)" /></a-field>
              <button aBtn variant="outline" (click)="probarCampana()">Enviar prueba</button>
            </div>
          </div>
          <a-correo-preview [html]="htmlCampana()" [asunto]="c.asunto" para="participante@correo.com" />
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button aBtn variant="outline" (click)="camp.set(null)">Cancelar</button>
          <button aBtn [disabled]="!campValida() || !alcance()?.total" (click)="confirmarCamp.set(true)"><app-icon name="Send" class="h-4 w-4" /> Enviar campaña</button>
        </div>
      }
    </a-modal>
    <a-confirm [open]="confirmarCamp()" title="¿Enviar la campaña?" confirmLabel="Enviar ahora" (closed)="confirmarCamp.set(false)" (confirmed)="enviarCampana()">
      Se pondrán en cola <b class="text-foreground">{{ alcance()?.total ?? 0 }}</b> correos a la audiencia elegida. Una vez enviada no se puede cancelar.
    </a-confirm>
    <a-modal [open]="!!campDetalle()" [wide]="true" [title]="'Campaña: ' + (campDetalle()?.nombre ?? '')" (closed)="campDetalle.set(null)">
      @if (campDetalle(); as c) {
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Asunto</dt><dd class="text-sm font-semibold">{{ c.asunto }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Audiencia</dt><dd class="text-sm font-semibold">{{ etiquetaAud(c) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Enviada</dt><dd class="text-sm font-semibold">{{ c.fecha || 'Aún no' }}@if (c.creadaPor) { · por {{ c.creadaPor }} }</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Destinatarios</dt><dd class="text-sm font-semibold">{{ c.total ?? 0 }}@if (c.excluidos) { · {{ c.excluidos }} excluidos (bloqueados o sin aceptar novedades) }</dd></div>
        </dl>
        @if (stats()[c.id]; as st) {
          <ul class="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Resultado del envío">
            <li class="rounded-xl border border-border px-3 py-1.5"><b>{{ st['Enviado'] ?? 0 }}</b> enviados</li>
            <li class="rounded-xl border border-border px-3 py-1.5"><b>{{ (st['En cola'] ?? 0) + (st['Reintentando'] ?? 0) }}</b> en proceso</li>
            <li class="rounded-xl border border-border px-3 py-1.5"><b>{{ st['Rebotado'] ?? 0 }}</b> rebotados</li>
            <li class="rounded-xl border border-border px-3 py-1.5"><b>{{ st['Fallido'] ?? 0 }}</b> fallidos</li>
          </ul>
        }
        <h3 class="mb-1 mt-5 text-sm font-bold">Mensaje</h3>
        <p class="whitespace-pre-line rounded-xl bg-muted/50 p-4 text-sm">{{ c.mensaje }}</p>
        @if (c.botonTexto) { <p class="mt-2 text-sm text-muted-foreground">Botón: «{{ c.botonTexto }}» → {{ c.botonUrl }}</p> }
        <div class="det-pie"><button aBtn (click)="verCorreosDe(c)"><app-icon name="Mail" class="h-4 w-4" /> Ver los correos enviados</button></div>
      }
    </a-modal>
    <a-modal [open]="!!ver()" [wide]="true" [xl]="true" title="Correo enviado" (closed)="ver.set(null)">
      @if (ver(); as c) {
        <dl class="mb-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          @if (c.cco?.length) { <div class="sm:col-span-2"><dt class="inline text-muted-foreground">CCO: </dt><dd class="inline font-medium">{{ c.cco!.join(', ') }}</dd></div> }
          <div><dt class="inline text-muted-foreground">Plantilla: </dt><dd class="inline font-medium">{{ c.plantilla }}</dd></div>
          <div><dt class="inline text-muted-foreground">Fecha: </dt><dd class="inline font-medium">{{ c.fecha }}</dd></div>
          <div><dt class="inline text-muted-foreground">Estado: </dt><dd class="inline font-medium">{{ c.estado }}</dd></div>
          <div><dt class="inline text-muted-foreground">Reenvíos: </dt><dd class="inline font-medium">{{ c.reenvios ?? 0 }}</dd></div>
        </dl>
        <a-correo-preview [html]="c.html || htmlPlano(c.cuerpo)" [asunto]="c.asunto" [para]="c.para" />
        <div class="mt-5 flex justify-end gap-2">
          <button aBtn variant="outline" (click)="ver.set(null)">Cerrar</button>
          <button aBtn (click)="reenviar(c); ver.set(null)"><app-icon name="Send" class="h-4 w-4" /> Reenviar</button>
        </div>
      }
    </a-modal>
  `,
})
export class CorreosPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly brand = inject(BrandService);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(AdminSession);
  protected readonly input = INPUT_CLS;
  protected readonly grupos = GRUPOS;
  protected readonly tipos = TIPOS;
  protected readonly fuentes = FUENTES_CORREO;
  protected readonly estados = ["Enviado", "En cola", "Reintentando", "Rebotado", "Fallido"];
  protected tono(e: string): "ok" | "info" | "warn" | "bad" | "muted" {
    return e === "Enviado" ? "ok" : e === "En cola" ? "info" : e === "Reintentando" ? "warn" : "bad";
  }
  protected plural(e: string) {
    return { Enviado: "enviados", "En cola": "en cola", Reintentando: "reintentando", Rebotado: "rebotados", Fallido: "fallidos" }[e] ?? e;
  }
  protected readonly tabs = [{ id: "plantillas" as const, label: "Plantillas" }, { id: "campanas" as const, label: "Campañas" }, { id: "enviados" as const, label: "Enviados" }, { id: "diseno" as const, label: "Diseño" }, { id: "ajustes" as const, label: "Ajustes" }];
  protected readonly tab = signal<"plantillas" | "campanas" | "enviados" | "diseno" | "ajustes">("plantillas");
  protected readonly plantillas = signal<PlantillaCorreo[]>([]);
  protected readonly edit = signal<PlantillaCorreo | null>(null);
  protected readonly bloques = signal<BloqueCorreo[]>([]);
  protected readonly foco = signal(-1);
  private original = "";
  protected readonly ver = signal<CorreoEnviado | null>(null);
  protected readonly prueba = signal("");
  protected readonly diseno = signal<DisenoCorreo>({ ...DISENO_BASE });
  protected readonly ejemploId = signal("bienvenida");
  protected readonly pag = new Paginado<CorreoEnviado>(this.api, "correosEnviados");

  protected readonly colores = [
    { k: "colorEncabezado" as const, l: "Color del encabezado", def: "" },
    { k: "colorBoton" as const, l: "Color de los botones", def: "" },
    { k: "colorTextoBoton" as const, l: "Texto de los botones", def: "" },
    { k: "colorTexto" as const, l: "Color del texto", def: DISENO_BASE.colorTexto },
    { k: "colorFondo" as const, l: "Fondo del correo", def: DISENO_BASE.colorFondo },
  ];

  /* ---- Tipografía y redes del diseño ---- */
  protected readonly fuenteMarca = computed(() => this.brand.tenant().tema.fuente ?? "");
  protected readonly modoFuente = computed<"segura" | "marca" | "google">(() => {
    const w = this.diseno().fuenteWeb;
    return !w ? "segura" : w === FUENTE_MARCA ? "marca" : "google";
  });
  protected readonly fuenteWebValida = computed(() => !!nombreFuenteSeguro(this.diseno().fuenteWeb));
  protected readonly nombreSegura = computed(() => this.fuentes.find((f) => f.v === this.diseno().fuente)?.l.split(" (")[0] ?? "Arial");
  protected elegirFuente(v: string) {
    if (v === FUENTE_MARCA) this.setDiseno({ fuenteWeb: FUENTE_MARCA });
    else if (v === "__google__") this.setDiseno({ fuenteWeb: this.modoFuente() === "google" ? this.diseno().fuenteWeb : "Poppins" });
    else this.setDiseno({ fuente: v, fuenteWeb: "" });
  }
  protected readonly redesConfiguradas = computed(() =>
    Object.entries(this.entorno().redes).filter(([, u]) => !!u).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)),
  );

  private readonly entorno = computed<EntornoCorreo>(() => {
    const t = this.brand.tenant();
    return {
      fuente: t.tema.fuente,
      logoClaro: t.marca.logoClaro, logoOscuro: t.marca.logoOscuro, primario: t.tema.primario, textoPrimario: t.tema.textoPrimario ?? "#ffffff",
      programa: t.marca.programa, banco: t.marca.nombre, redes: (this.catalog.config()?.sitio?.redes ?? {}) as Record<string, string | undefined>,
    };
  });
  private readonly vars = computed(() => ({ ...EJEMPLO_VARS, programa: this.entorno().programa, banco: this.entorno().banco, sitio: location.origin }));
  protected readonly htmlEdicion = computed(() => renderCorreoHtml(this.bloques(), this.diseno(), this.entorno(), this.vars()));
  protected readonly asuntoEdicion = computed(() => {
    const a = this.edit()?.asunto ?? "";
    return a.replace(/\{(\w+)\}/g, (m, k) => (this.vars() as Record<string, string>)[k] ?? m);
  });
  protected readonly htmlEjemplo = computed(() => {
    const p = this.plantillas().find((x) => x.id === this.ejemploId());
    return renderCorreoHtml(p ? bloquesDe(p) : [], this.diseno(), this.entorno(), this.vars());
  });
  /** Aviso dentro del sitio de la plantilla en edición (el guardado o, si no tiene, el de fábrica). */
  protected readonly notif = computed<NotificacionPlantilla>(() => {
    const e = this.edit();
    return e?.notificar ?? PLANTILLAS_BASE.find((x) => x.id === e?.id)?.notificar ?? { activo: false, tipo: "info", titulo: "", texto: "", enlace: "" };
  });
  /** Copia oculta propia de la plantilla en edición. */
  protected readonly ccoPl = computed<NonNullable<PlantillaCorreo["cco"]>>(() => this.edit()?.cco ?? { modo: "global", direcciones: [] });
  protected readonly nuevaCcoPl = signal("");
  protected readonly errorCcoPl = signal("");
  protected setCcoPl(c: Partial<NonNullable<PlantillaCorreo["cco"]>>) {
    this.edit.update((e) => (e ? { ...e, cco: { ...this.ccoPl(), ...c } } : e));
  }
  protected agregarCcoPl() {
    const d = this.nuevaCcoPl().trim().toLowerCase();
    if (!d) return;
    const lista = this.ccoPl().direcciones;
    if (!correoValido(d)) { this.errorCcoPl.set("Escribe una dirección de correo válida, por ejemplo comercial@banco.com."); return; }
    if (lista.includes(d)) { this.errorCcoPl.set("Esa dirección ya está en la lista."); return; }
    if (lista.length >= MAX_CCO) { this.errorCcoPl.set(`Puedes agregar hasta ${MAX_CCO} direcciones.`); return; }
    this.setCcoPl({ direcciones: [...lista, d] });
    this.nuevaCcoPl.set("");
    this.errorCcoPl.set("");
  }
  protected quitarCcoPl(d: string) {
    this.setCcoPl({ direcciones: this.ccoPl().direcciones.filter((x) => x !== d) });
  }
  protected setNotif(c: Partial<NotificacionPlantilla>) {
    this.edit.update((e) => (e ? { ...e, notificar: { ...this.notif(), ...c } } : e));
  }
  protected vistaNotif(t: string) {
    return t.replace(/\{(\w+)\}/g, (m, k) => (this.vars() as Record<string, string>)[k] ?? m);
  }
  protected readonly sucio = computed(() => !!this.edit() && (JSON.stringify([this.edit()!.asunto, this.bloques(), this.notif(), this.ccoPl()]) !== this.original));

  /* ----- Campañas ----- */
  protected readonly campanas = signal<Campana[]>([]);
  protected readonly stats = signal<Record<string, Record<string, number>>>({});
  protected readonly campDetalle = signal<Campana | null>(null);
  /** Pasa a "Enviados" filtrado por el nombre de la campaña (cada correo guarda la campaña como referencia). */
  protected verCorreosDe(c: Campana) {
    this.campDetalle.set(null);
    this.tab.set("enviados");
    this.pag.buscar(c.nombre);
  }
  protected readonly camp = signal<Campana | null>(null);
  protected readonly alcance = signal<{ total: number; excluidos: number } | null>(null);
  protected readonly pruebaCamp = signal("");
  protected readonly confirmarCamp = signal(false);
  protected readonly niveles = this.catalog.niveles;
  protected etiquetaAud(c: Campana) {
    return etiquetaAudiencia(c.audiencia);
  }
  /** Hay algo escrito (se pide confirmar antes de cerrar y perderlo). */
  protected readonly campSucia = computed(() => {
    const c = this.camp();
    return !!c && (!!c.nombre.trim() || !!c.asunto.trim() || c.mensaje.trim() !== "Hola {nombre},");
  });
  protected readonly campValida = computed(() => {
    const c = this.camp();
    return !!c && !!c.nombre.trim() && !!c.asunto.trim() && !!c.mensaje.trim();
  });
  protected readonly htmlCampana = computed(() => {
    const c = this.camp();
    const bloques = bloquesDe({ asunto: c?.asunto ?? "", cuerpo: c?.mensaje ?? "", ...(c?.botonTexto && c?.botonUrl ? { boton: { texto: c.botonTexto, url: c.botonUrl } } : {}) });
    return renderCorreoHtml(bloques, this.diseno(), this.entorno(), { ...this.vars(), bajaUrl: "https://ejemplo.com/baja?t=enlace-personal" });
  });
  protected nuevaCampana() {
    this.pruebaCamp.set("");
    this.alcance.set(null);
    this.camp.set({ id: "", nombre: "", asunto: "", mensaje: "Hola {nombre},\n\n", audiencia: { tipo: "todos" }, estado: "Borrador" });
    this.calcularAlcance();
  }
  protected setCamp(c: Partial<Campana>) {
    this.camp.update((x) => (x ? { ...x, ...c } : x));
  }
  protected setAud(c: Partial<AudienciaCampana>) {
    const nivelPorDefecto = this.niveles()[0]?.nombre;
    this.camp.update((x) => {
      if (!x) return x;
      const a = { ...x.audiencia, ...c };
      if (a.tipo === "nivel" && !a.nivel && nivelPorDefecto) a.nivel = nivelPorDefecto;
      return { ...x, audiencia: a };
    });
    this.calcularAlcance();
  }
  private calcularAlcance() {
    const c = this.camp();
    if (!c) return;
    this.api.post<{ total: number; excluidos: number }>("admin/correos/campanas/audiencia", { audiencia: c.audiencia }).subscribe((r) => this.alcance.set({ total: r.total, excluidos: r.excluidos }));
  }
  protected probarCampana() {
    const c = this.camp();
    if (!c) return;
    this.api.post("admin/correos/campanas/prueba", { campana: c, para: this.pruebaCamp() }).subscribe({
      next: () => { this.toast.show("Correo de prueba enviado"); this.pag.recargar(); },
      error: (e) => this.toast.error(e?.error?.message ?? "No se pudo enviar la prueba."),
    });
  }
  protected enviarCampana() {
    const c = this.camp();
    if (!c) return;
    this.api.post<Campana>("admin/correos/campanas/enviar", { campana: c, por: this.session.usuario()?.nombre }).subscribe({
      next: (r) => {
        this.toast.show(`Campaña enviada: ${r.total} correos en cola`);
        this.camp.set(null);
        this.cargarCampanas();
        this.pag.recargar();
      },
      error: (e) => this.toast.error(e?.error?.message ?? "No se pudo enviar la campaña."),
    });
  }
  protected cargarCampanas() {
    this.api.get<Campana[]>("admin/c/campanas").subscribe((l) => {
      this.campanas.set(l);
      for (const c of l) {
        this.api.get<{ facetas: Record<string, Record<string, number>> }>("admin/q/correosEnviados", { f_campanaId: c.id, size: 1, facetas: "estado" }).subscribe((r) => this.stats.update((s) => ({ ...s, [c.id]: r.facetas["estado"] ?? {} })));
      }
    });
  }

  constructor() {
    this.cargar();    this.cargarCampanas();
    this.pag.campos = "estado"; // contadores por estado
    this.pag.recargar();
    // Mientras haya envíos en cola o reintentando, la lista se actualiza sola para ver cómo avanzan.
    const t = setInterval(() => {
      if (this.tab() === "enviados" && this.pag.items().some((c) => c.estado === "En cola" || c.estado === "Reintentando")) this.pag.recargar();
      if (this.tab() === "campanas" && Object.values(this.stats()).some((e) => (e["En cola"] ?? 0) + (e["Reintentando"] ?? 0) > 0)) this.cargarCampanas();
    }, 2000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }
  protected reintentar(c: CorreoEnviado) {
    this.api.post<CorreoEnviado>(`admin/correos/${c.id}/reintentar`, {}).subscribe({
      next: () => { this.toast.show("Envío puesto en cola de nuevo"); this.pag.recargar(); },
      error: (e) => this.toast.error(e?.error?.message ?? "No se pudo reintentar."),
    });
  }
  private cargar() {
    this.api.get<PlantillaCorreo[]>("admin/c/plantillasCorreo").subscribe((l) => this.plantillas.set(l));
    this.api.get<DisenoCorreo>("admin/correos/diseno").subscribe((d) => this.diseno.set({ ...DISENO_BASE, ...d }));
    this.api.get<AjustesCorreo>("admin/correos/ajustes").subscribe((a) => this.ajustes.set(a));
  }
  protected uno(v?: string) {
    return v ? [v] : [];
  }
  protected nombreTipo(t: TipoBloque) {
    return TIPOS.find((x) => x.t === t)?.l ?? t;
  }
  protected porGrupo(g: string) {
    return this.plantillas().filter((p) => p.grupo === g);
  }

  /* ----- Edición de una plantilla ----- */
  protected editar(p: PlantillaCorreo) {
    this.prueba.set("");
    this.foco.set(-1);
    const b = structuredClone(bloquesDe(p));
    this.bloques.set(b);
    this.edit.set({ ...p });
    this.original = JSON.stringify([p.asunto, b, this.notif(), this.ccoPl()]);
  }
  protected cambiarAsunto(ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.edit.update((e) => (e ? { ...e, asunto: v } : e));
  }
  protected setBloque(i: number, cambios: Partial<BloqueCorreo>) {
    this.bloques.update((l) => l.map((b, j) => (j === i ? { ...b, ...cambios } : b)));
  }
  protected mover(i: number, d: number) {
    this.bloques.update((l) => {
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
  }
  protected quitar(i: number) {
    this.bloques.update((l) => l.filter((_, j) => j !== i));
  }
  protected agregar(t: TipoBloque) {
    this.bloques.update((l) => [...l, bloqueNuevo(t)]);
  }
  protected insertarVariable(v: string) {
    const i = this.foco();
    const b = this.bloques()[i];
    if (!b || (b.tipo !== "titulo" && b.tipo !== "texto")) {
      this.toast.show("Haz clic primero en un título o un texto para insertar la variable ahí");
      return;
    }
    this.setBloque(i, { texto: `${b.texto ?? ""}{${v}}` });
  }
  private reemplazar(p: PlantillaCorreo) {
    this.plantillas.update((l) => l.map((x) => (x.id === p.id ? p : x)));
  }
  private armar(e: PlantillaCorreo): PlantillaCorreo {
    const bloques = this.bloques();
    const { boton: _b, ...resto } = e;
    return { ...resto, bloques, cuerpo: textoPlano(bloques, {}) };
  }
  protected activar(p: PlantillaCorreo, activo: boolean) {
    if (p.activo === activo) return;
    const nueva = { ...p, activo };
    this.reemplazar(nueva);
    this.api.put<PlantillaCorreo>(`admin/c/plantillasCorreo/${p.id}`, nueva).subscribe(() => this.toast.show(`${p.nombre}: ${activo ? "activado" : "desactivado"}`));
  }
  protected guardar(e: PlantillaCorreo) {
    const nueva = this.armar(e);
    this.api.put<PlantillaCorreo>(`admin/c/plantillasCorreo/${e.id}`, nueva).subscribe(() => {
      this.reemplazar(nueva);
      this.original = JSON.stringify([e.asunto, this.bloques(), this.notif(), this.ccoPl()]);
      this.edit.set(null);
      this.toast.show("Plantilla guardada");
    });
  }
  protected restaurar(e: PlantillaCorreo) {
    const base = PLANTILLAS_BASE.find((x) => x.id === e.id);
    if (!base) return;
    this.bloques.set(structuredClone(bloquesDe({ asunto: base.asunto, cuerpo: base.cuerpo, ...(base.boton ? { boton: base.boton } : {}) })));
    const { notificar: _n, ...sin } = e;
    this.edit.set({ ...sin, asunto: base.asunto, ...(base.notificar ? { notificar: base.notificar } : {}) });
  }
  protected probar() {
    const e = this.edit();
    if (!e) return;
    const nueva = this.armar(e);
    // La prueba usa lo guardado; se guarda primero para que el correo refleje lo que se ve.
    this.api.put<PlantillaCorreo>(`admin/c/plantillasCorreo/${e.id}`, nueva).subscribe(() => {
      this.reemplazar(nueva);
      this.api.post<CorreoEnviado>("admin/correos/prueba", { plantillaId: e.id, para: this.prueba() }).subscribe({
        next: () => { this.toast.show("Correo de prueba enviado"); this.pag.recargar(); },
        error: (err) => this.toast.error(err?.error?.message ?? "No se pudo enviar la prueba."),
      });
    });
  }

  /* ----- Diseño de marca ----- */
  protected setDiseno(c: Partial<DisenoCorreo>) {
    this.diseno.update((d) => ({ ...d, ...c }));
  }
  protected setColor(k: "colorEncabezado" | "colorBoton" | "colorTextoBoton" | "colorTexto" | "colorFondo", v: string) {
    this.diseno.update((d) => ({ ...d, [k]: v }));
  }
  protected colorDe(k: "colorEncabezado" | "colorBoton" | "colorTextoBoton" | "colorTexto" | "colorFondo") {
    const t = this.brand.tenant().tema;
    const prop = this.diseno()[k];
    if (prop) return prop;
    return k === "colorTextoBoton" ? (t.textoPrimario ?? "#ffffff") : t.primario;
  }
  protected guardarDiseno() {
    this.api.put<DisenoCorreo>("admin/correos/diseno", this.diseno()).subscribe(() => this.toast.show("Diseño de correos guardado"));
  }
  /* ----- Ajustes: copia oculta (CCO) ----- */
  protected readonly maxCco = MAX_CCO;
  protected readonly ajustes = signal<AjustesCorreo>(structuredClone(AJUSTES_BASE));
  protected readonly nuevaCco = signal("");
  protected readonly errorCco = signal("");
  protected setCco(c: Partial<AjustesCorreo["cco"]>) {
    this.ajustes.update((a) => ({ cco: { ...a.cco, ...c } }));
  }
  protected agregarCco() {
    const d = this.nuevaCco().trim().toLowerCase();
    if (!d) return;
    if (!correoValido(d)) { this.errorCco.set("Escribe una dirección de correo válida, por ejemplo auditoria@banco.com."); return; }
    const lista = this.ajustes().cco.direcciones;
    if (lista.includes(d)) { this.errorCco.set("Esa dirección ya está en la lista."); return; }
    if (lista.length >= MAX_CCO) { this.errorCco.set(`Puedes agregar hasta ${MAX_CCO} direcciones.`); return; }
    this.setCco({ direcciones: [...lista, d] });
    this.nuevaCco.set("");
    this.errorCco.set("");
  }
  protected quitarCco(d: string) {
    this.setCco({ direcciones: this.ajustes().cco.direcciones.filter((x) => x !== d) });
  }
  protected guardarAjustes() {
    this.agregarCco();
    if (this.errorCco()) return;
    this.api.put<AjustesCorreo>("admin/correos/ajustes", this.ajustes()).subscribe({
      next: (a) => { this.ajustes.set(a); this.toast.show("Ajustes de correos guardados"); },
      error: (e) => this.errorCco.set(e?.error?.message ?? "No se pudieron guardar los ajustes."),
    });
  }

  protected restaurarDiseno() {
    this.diseno.set({ ...DISENO_BASE });
  }

  /* ----- Enviados ----- */
  protected htmlPlano(t: string) {
    return `<pre style="font:14px/1.6 Arial,sans-serif;white-space:pre-wrap;padding:16px">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
  }
  protected reenviar(c: CorreoEnviado) {
    this.api.post<CorreoEnviado>(`admin/correos/${c.id}/reenviar`, {}).subscribe(() => {
      this.toast.show(`Correo reenviado a ${c.para}`);
      this.pag.recargar();
    });
  }
}
