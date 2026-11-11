import { ChangeDetectionStrategy, Component, computed, effect, inject, isDevMode, signal } from "@angular/core";
import { map } from "rxjs/operators";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import type { Embudo } from "../core/analitica";
import { leer, leerEstado } from "../core/leer";
import { ACCIONES, SECCIONES, registrarRoles, type Accion, type MatrizPermisos, type Seccion } from "../core/permisos";
import { diferencias } from "../core/diff";
import { firstValueFrom } from "rxjs";
import { BrandService } from "../core/brand.service";
import { resetMockDb } from "../core/mock-api/db";
import { CatalogService, type SitioConfig , TEXTOS_INGRESO, TEXTOS_HOME, PIE_ATENCION, PIE_INFORMACION, type EnlacePie, type TextosHome, type TextosIngreso } from "../core/catalog.service";
import { formatUSD } from "../core/format";
import type { Compra, Mensaje, Nivel, RolAdmin } from "../core/models";
import { IconComponent } from "../shared/icon.component";
import { MarcaEditorComponent } from "./pages-marca";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import { AdminSession } from "./session";
import {
  AdminApi,
  Paginado,
  PagerComponent, descargarTabla, descargarXlsx, usarSucio, DrawerComponent, DrawerTitleComponent, AdminModalComponent, BtnDirective, ChartComponent, ConfirmComponent, FieldComponent, INPUT_CLS, PageHeaderComponent,
  PanelComponent, PeriodFilterComponent, PillComponent, StatComponent, ToggleComponent, ToastService, factorPeriodo, periodos, serieDe,
  type Periodo,
  FilaEsqueletoComponent,
  OrdenColumnaComponent,
  ErrorCargaComponent,
} from "./kit";

/* ------------------------------------------------------------------ */
/* Niveles                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-niveles-page",
  imports: [PageHeaderComponent, PanelComponent, FieldComponent, BtnDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Niveles" desc="El nivel corresponde al segmento que asigna el banco a cada participante (se cambia en su ficha). Los textos se muestran en Mi nivel y en “¿Cómo funcionan los niveles?”.">
      <button aBtn (click)="guardar()">Guardar niveles</button>
    </a-header>
    <a-panel title="Textos de Mi nivel y de “¿Cómo funcionan los niveles?”" class="mb-6">
      <p class="mb-4 text-sm text-muted-foreground">Puedes usar <code>&#123;empresa&#125;</code>, <code>&#123;programa&#125;</code>: se reemplazan por los datos de la marca.</p>
      <div class="grid gap-4 lg:grid-cols-2">
        <a-field label="Subtítulo de Mi nivel (debajo del título)"><textarea [class]="input + ' h-20 py-2'" [value]="txt().subtitulo" (input)="setTxt({ subtitulo: $any($event.target).value })"></textarea></a-field>
        <a-field label="Introducción de “¿Cómo funcionan los niveles?”"><textarea [class]="input + ' h-20 py-2'" [value]="txt().intro" (input)="setTxt({ intro: $any($event.target).value })"></textarea></a-field>
        <a-field label="Reglas: “Cómo funcionan los niveles” (una por línea)"><textarea [class]="input + ' h-32 py-2'" [value]="txt().reglas.join('\n')" (input)="setTxt({ reglas: $any($event.target).value.split('\n') })"></textarea></a-field>
      </div>
    </a-panel>
    <div class="grid gap-6 md:grid-cols-2">
      @for (n of niv(); track n.id; let i = $index) {
        <a-panel>
          <div class="mb-4 flex items-center gap-3">
            <input type="color" aria-label="Color" [value]="n.color" (input)="patch(i, { color: $any($event.target).value })" class="h-11 w-11 cursor-pointer rounded-xl border border-border" />
            <input [class]="input + ' text-lg font-bold'" [value]="n.nombre" (input)="patch(i, { nombre: $any($event.target).value })" />
          </div>
          <a-field label="Beneficios del nivel (uno por línea)" class="mt-3">
            <textarea [class]="input + ' h-32 py-2'" [value]="n.beneficios.join('\\n')" (input)="patch(i, { beneficios: $any($event.target).value.split('\\n') })"></textarea>
          </a-field>
        </a-panel>
      }
    </div>
  `,
})
export class NivelesPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly catalog = inject(CatalogService);
  protected readonly input = INPUT_CLS;
  private readonly editados = signal<Nivel[] | null>(null);
  private readonly textoEditado = signal<{ subtitulo: string; intro: string; reglas: string[] } | null>(null);
  protected readonly niv = computed(() => this.editados() ?? this.catalog.niveles().map((n) => ({ ...n, beneficios: n.beneficios })));
  protected readonly txt = computed(() => this.textoEditado() ?? this.catalog.textosNiveles() ?? { subtitulo: "", intro: "", reglas: [] as string[] });

  protected setTxt(p: Partial<{ subtitulo: string; intro: string; reglas: string[] }>) {
    this.textoEditado.set({ ...this.txt(), ...p });
  }

  protected patch(i: number, p: Partial<Nivel>) {
    this.editados.set(this.niv().map((n, j) => (j === i ? { ...n, ...p } : n)));
  }
  protected guardar() {
    this.api.put("admin/niveles", { niveles: this.niv(), ...this.txt() }).subscribe(() => {
      this.catalog.recargarNiveles(); // Mi nivel, el modal y el panel leen los mismos textos
      this.editados.set(null);
      this.textoEditado.set(null);
      this.toast.show();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-configuracion-page",
  imports: [ErrorCargaComponent, PageHeaderComponent, PanelComponent, FieldComponent, ToggleComponent, BtnDirective, MarcaEditorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Configuración"><button aBtn (click)="guardar()">Guardar</button></a-header>
    @if (errorCarga()) { <a-error-carga (reintentar)="cargar()" /> }
    <div class="grid gap-6 lg:grid-cols-2">
      <a-marca-editor class="lg:col-span-2" />
      @if (sitio(); as s) {
        <a-panel title="Datos del programa" class="lg:col-span-2">
          <div class="grid gap-4 md:grid-cols-2">
            <a-field label="Correo de soporte (se muestra en el pie)"><input [class]="input" type="email" [value]="s.correoSoporte" (input)="set('correoSoporte', $event)" /></a-field>
            <a-field label="Teléfono (se muestra en el pie)"><input [class]="input" [value]="s.telefonoPie" (input)="set('telefonoPie', $event)" /></a-field>
            <a-field label="WhatsApp de soporte (botón flotante)"><input [class]="input" [value]="s.whatsapp" (input)="set('whatsapp', $event)" /></a-field>
            <a-field label="Ciudades con agencia (se muestran en el pie)"><input [class]="input" placeholder="Lima · Arequipa · Cusco" [value]="s.ciudadesPie ?? ''" (input)="set('ciudadesPie', $event)" /></a-field>
            <a-field label="Texto del enlace a las agencias"><input [class]="input" placeholder="Encuentra tu agencia" [value]="s.agenciasTexto ?? ''" (input)="set('agenciasTexto', $event)" /></a-field>
            <a-field label="Enlace “Encuentra tu agencia”"><input [class]="input" type="url" [value]="s.agenciasUrl" (input)="set('agenciasUrl', $event)" /></a-field>
          </div>
        </a-panel>
        <a-panel title="Página Contáctanos" class="lg:col-span-2">
          <p class="mb-3 text-sm text-muted-foreground">Datos que ve el participante en la tarjeta “Contáctanos” de esa página. Si dejas el correo o los teléfonos vacíos se usan los de soporte de arriba (los del pie de página).</p>
          <div class="grid gap-4 md:grid-cols-2">
            <a-field label="Horario de atención" class="md:col-span-2"><input [class]="input" placeholder="Horarios atención: Lun-Vie de 9h a 18h" [value]="contacto().horario" (input)="setContacto('horario', $event)" /></a-field>
            <a-field label="Teléfonos"><input [class]="input" [placeholder]="s.telefonoPie" [value]="contacto().telefonos" (input)="setContacto('telefonos', $event)" /></a-field>
            <a-field label="Correo"><input [class]="input" type="email" [placeholder]="s.correoSoporte" [value]="contacto().correo" (input)="setContacto('correo', $event)" /></a-field>
          </div>
        </a-panel>        <a-panel title="Textos del Home" class="lg:col-span-2">
          <p class="mb-3 text-sm text-muted-foreground">Títulos de las secciones de la portada. Cada título lleva una palabra destacada en un recuadro de color. Si dejas un campo vacío se usa el texto original (se ve como sugerencia).</p>
          <div class="grid gap-4 md:grid-cols-2">
            @for (c of camposHome; track c.k) {
              <a-field [label]="c.l"><input [class]="input" [placeholder]="textosHomeBase[c.k]" [value]="s.textosHome?.[c.k] ?? ''" (input)="setHome(c.k, $event)" /></a-field>
            }
          </div>
          <button aBtn variant="ghost" class="mt-3" (click)="restaurarHome()">Restaurar títulos del Home</button>
        </a-panel>
        <a-panel title="Enlaces del pie de página" class="lg:col-span-2">
          <p class="mb-3 text-sm text-muted-foreground">Enlaces de las columnas "Información" y "Atención al cliente". Usa una ruta del sitio (<code>/contacto</code>) o una dirección completa (<code>https://…</code>, se abre en otra pestaña). El enlace a las agencias se configura arriba.</p>
          <div class="grid gap-6 lg:grid-cols-2">
            @for (col of columnasPie; track col.k) {
              <div>
                <h3 class="mb-2 text-sm font-semibold">{{ col.l }}</h3>
                <ul class="space-y-2">
                  @for (e of pieLista(col.k); track $index; let i = $index) {
                    <li class="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                      <input [class]="input" [attr.aria-label]="col.l + ': texto del enlace ' + (i + 1)" placeholder="Texto" [value]="e.label" (input)="setPie(col.k, i, 'label', $event)" />
                      <input [class]="input" [attr.aria-label]="col.l + ': dirección del enlace ' + (i + 1)" placeholder="/ruta o https://…" [value]="e.to" (input)="setPie(col.k, i, 'to', $event)" />
                      <button aBtn variant="ghost" [attr.aria-label]="'Quitar ' + e.label" (click)="quitarPie(col.k, i)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                    </li>
                  }
                </ul>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button aBtn variant="outline" (click)="agregarPie(col.k)"><app-icon name="Plus" class="h-4 w-4" /> Agregar enlace</button>
                  <button aBtn variant="ghost" (click)="restaurarPie(col.k)">Restaurar</button>
                </div>
              </div>
            }
          </div>
        </a-panel>        <a-panel title="Pantalla de ingreso" class="lg:col-span-2">
          <p class="mb-3 text-sm text-muted-foreground">Textos de la pantalla donde el participante ingresa con su documento. Puedes usar <code>&#123;unidad&#125;</code>, <code>&#123;banco&#125;</code> y <code>&#123;programa&#125;</code>: se reemplazan por los de la marca. Si dejas un campo vacío se usa el texto original.</p>
          <div class="grid gap-4 md:grid-cols-2">
            @for (c of camposIngreso; track c.k) {
              <a-field [label]="c.l">
                @if (c.largo) { <textarea [class]="input + ' h-24 py-2'" [placeholder]="textosBase[c.k]" [value]="s.ingreso?.[c.k] ?? ''" (input)="setIngreso(c.k, $event)"></textarea> }
                @else { <input [class]="input" [placeholder]="textosBase[c.k]" [value]="s.ingreso?.[c.k] ?? ''" (input)="setIngreso(c.k, $event)" /> }
              </a-field>
            }
          </div>
          <div class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span class="text-sm font-medium">Ocultar la nota legal bajo el botón</span>
            <a-toggle label="Ocultar la nota legal" [on]="!!s.ocultarNotaIngreso" (onChange)="setOcultarNota($event)" />
          </div>
          <button aBtn variant="ghost" class="mt-3" (click)="restaurarIngreso()">Restaurar textos originales</button>
        </a-panel>        <a-panel title="Redes sociales" class="lg:col-span-2">
          <p class="mb-3 text-sm text-muted-foreground">Solo se muestran en el pie del sitio las redes que tengan URL.</p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (r of redes; track r.key) {
              <a-field [label]="r.label"><input [class]="input" type="url" placeholder="https://" [value]="s.redes[r.key] ?? ''" (input)="setRed(r.key, $event)" /></a-field>
            }
          </div>
        </a-panel>
      }
      @if (modoPruebas) {
        <a-panel title="Entorno de desarrollo" class="lg:col-span-2">
          <p class="text-sm text-muted-foreground">Los datos se guardan en este navegador mientras no haya un backend conectado. Puedes volver a la configuración inicial.</p>
          <button aBtn variant="outline" class="mt-3" (click)="reset()">Restablecer datos iniciales</button>
        </a-panel>
      }
    </div>
  `,
})
export class ConfiguracionPage {
  protected readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  /** Solo visible mientras la app use el backend simulado (al conectar uno real se oculta). */
  protected readonly modoPruebas = isDevMode();
  protected readonly redes = [
    { key: "facebook", label: "Facebook" }, { key: "x", label: "X (Twitter)" }, { key: "linkedin", label: "LinkedIn" },
    { key: "instagram", label: "Instagram" }, { key: "tiktok", label: "TikTok" }, { key: "youtube", label: "YouTube" },
  ];
  private readonly api = inject(ApiService);
  protected readonly sitio = signal<SitioConfig | null>(null);
  protected readonly contacto = signal({ horario: "", telefonos: "", correo: "" });

  protected readonly errorCarga = signal(false);
  constructor() {
    this.cargar();
  }
  protected cargar() {
    this.errorCarga.set(false);
    this.api.get<{ sitio: SitioConfig; contacto?: { horario: string; telefonos: string; correo: string } }>("config").subscribe({
      next: (c) => {
        this.sitio.set(structuredClone(c.sitio));
        this.contacto.set({ horario: "", telefonos: "", correo: "", ...c.contacto });
      },
      error: () => this.errorCarga.set(true),
    });
  }
  protected setContacto(k: "horario" | "telefonos" | "correo", e: Event) {
    this.contacto.update((c) => ({ ...c, [k]: (e.target as HTMLInputElement).value }));
  }
  protected set(k: keyof SitioConfig, e: Event) {
    this.sitio.update((s) => (s ? { ...s, [k]: (e.target as HTMLInputElement).value } : s));
  }
  protected readonly textosHomeBase = TEXTOS_HOME;
  protected readonly camposHome: { k: keyof TextosHome; l: string }[] = [
        { k: "beneficiosTitulo", l: "Beneficios: título" }, { k: "beneficiosResalte", l: "Beneficios: palabra destacada" },
    { k: "nivelesTitulo", l: "Beneficios por nivel: título" }, { k: "nivelesResalte", l: "Beneficios por nivel: palabra destacada" },
    { k: "categoriasTitulo", l: "Categorías: título" }, { k: "categoriasResalte", l: "Categorías: palabra destacada" },
    { k: "ctaCatalogoTitulo", l: "Tarjeta Catálogo: título" }, { k: "ctaCatalogoBoton", l: "Tarjeta Catálogo: botón" },
    { k: "ctaCatalogoTexto", l: "Tarjeta Catálogo: texto" }, { k: "ctaContactoTitulo", l: "Tarjeta Contacto: título" },
    { k: "ctaContactoBoton", l: "Tarjeta Contacto: botón" }, { k: "ctaContactoTexto", l: "Tarjeta Contacto: texto" },
  ];
  protected setHome(k: keyof TextosHome, e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.sitio.update((s) => (s ? { ...s, textosHome: { ...s.textosHome, [k]: v } } : s));
  }
  protected restaurarHome() {
    this.sitio.update((s) => (s ? { ...s, textosHome: {} } : s));
  }

  protected readonly columnasPie = [
    { k: "informacion", l: "Columna Información" },
    { k: "atencion", l: "Columna Atención al cliente" },
  ] as const;
  protected pieLista(col: "informacion" | "atencion"): EnlacePie[] {
    return this.sitio()?.pie?.[col] ?? (col === "informacion" ? PIE_INFORMACION : PIE_ATENCION).map((e) => ({ ...e }));
  }
  private escribirPie(col: "informacion" | "atencion", lista: EnlacePie[] | undefined) {
    this.sitio.update((s) => {
      if (!s) return s;
      const pie = { ...s.pie };
      if (lista) pie[col] = lista;
      else delete pie[col];
      return { ...s, pie };
    });
  }
  protected setPie(col: "informacion" | "atencion", i: number, campo: "label" | "to", e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.escribirPie(col, this.pieLista(col).map((x, k) => (k === i ? { ...x, [campo]: v } : x)));
  }
  protected agregarPie(col: "informacion" | "atencion") {
    this.escribirPie(col, [...this.pieLista(col), { label: "", to: "/" }]);
  }
  protected quitarPie(col: "informacion" | "atencion", i: number) {
    this.escribirPie(col, this.pieLista(col).filter((_, k) => k !== i));
  }
  protected restaurarPie(col: "informacion" | "atencion") {
    this.escribirPie(col, undefined);
  }  protected readonly textosBase = TEXTOS_INGRESO;
  protected readonly camposIngreso: { k: keyof TextosIngreso; l: string; largo?: boolean }[] = [
    { k: "tituloLateral", l: "Título del banner lateral", largo: true },
    { k: "mensajeLateral", l: "Mensaje del banner lateral", largo: true },
    { k: "tituloFormulario", l: "Título del formulario" },
    { k: "subtituloFormulario", l: "Subtítulo del formulario", largo: true },
    { k: "placeholderDocumento", l: "Texto de ayuda del número de documento" },
    { k: "tituloCodigo", l: "Título del paso del código" },
    { k: "notaLegal", l: "Nota legal bajo el botón", largo: true },
  ];
  protected setIngreso(k: keyof TextosIngreso, e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.sitio.update((s) => (s ? { ...s, ingreso: { ...s.ingreso, [k]: v } } : s));
  }
  protected setOcultarNota(v: boolean) {
    this.sitio.update((s) => (s ? { ...s, ocultarNotaIngreso: v } : s));
  }
  protected restaurarIngreso() {
    this.sitio.update((s) => (s ? { ...s, ingreso: {}, ocultarNotaIngreso: false } : s));
  }
  protected setRed(k: string, e: Event) {
    this.sitio.update((s) => (s ? { ...s, redes: { ...s.redes, [k]: (e.target as HTMLInputElement).value.trim() } } : s));
  }
  protected guardar() {
    this.api.put("admin/config", { contacto: this.contacto() }).subscribe();
    this.sitio.update((s) => {
      if (!s?.pie) return s;
      const limpia = (l?: EnlacePie[]) => l?.filter((e) => e.label.trim() && e.to.trim());
      return { ...s, pie: { ...(s.pie.informacion ? { informacion: limpia(s.pie.informacion)! } : {}), ...(s.pie.atencion ? { atencion: limpia(s.pie.atencion)! } : {}) } };
    });
    this.api.put("admin/sitio", this.sitio()).subscribe(() => {
      this.toast.show("Configuración guardada · ya se ve en el sitio");
      this.catalog.recargarConfig();
    });
  }
  private readonly catalog = inject(CatalogService);
  protected reset() {
    try {
      localStorage.removeItem("bs_carrito");
      localStorage.removeItem("bs_favoritos");
    } catch {
      /* nada */
    }
    resetMockDb();
  }
}

/* ------------------------------------------------------------------ */
/* Atención (mismo formato que Pedidos: tabla paginada + panel de detalle) */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-atencion-page",
  imports: [OrdenColumnaComponent, FilaEsqueletoComponent, LimpiarFiltrosComponent, PageHeaderComponent, PillComponent, BtnDirective, IconComponent, PagerComponent, DrawerComponent, DrawerTitleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Atención" [desc]="nuevos().toLocaleString('es') + ' mensajes nuevos · ' + pag.total().toLocaleString('es') + ' en total'">
      <button aBtn variant="outline" (click)="exportar()"><app-icon name="Download" class="h-4 w-4" /> Descargar</button>
    </a-header>
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar mensaje" [class]="input + ' pl-9'" placeholder="Asunto, nombre o correo" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Estado" [class]="input + ' w-auto'" (change)="pag.filtrar('estado', $any($event.target).value)">
        <option value="">Todos los estados</option>
        <option>Nuevo</option>
        <option>En proceso</option>
        <option>Respondido</option>
      </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>

    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr><th aOrden="asunto" [pag]="pag" etiquetaOrden="Asunto">Asunto</th><th aOrden="estado" [pag]="pag" etiquetaOrden="Estado">Estado</th><th aOrden="nombre" [pag]="pag" etiquetaOrden="Participante">Participante</th><th>Fecha</th><th aria-label="Detalle"></th></tr></thead>
        <tbody>
          @for (m of pag.items(); track m.id) {
            <tr>
              <td><button class="text-left font-bold hover:underline" (click)="abrir(m)">{{ m.asunto }}</button></td>
              <td class="det-completo det-chip"><a-pill [tone]="m.estado === 'Nuevo' ? 'bad' : m.estado === 'Respondido' ? 'ok' : 'warn'">{{ m.estado }}</a-pill></td>
              <td>{{ m.nombre }}<span class="block text-xs text-muted-foreground">{{ m.email }}</span></td>
              <td>{{ m.fecha }}</td>
              <td class="det-ojo"><button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle de ' + m.asunto" title="Ver detalle" (click)="abrir(m)"><app-icon name="Eye" class="h-4 w-4" /></button></td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="5"></tr> } } @else { <tr><td colspan="5" class="adm-empty">No hay mensajes con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-drawer [open]="!!sel()" (closed)="sel.set(null)">
      @if (sel(); as m) {
        <a-drawer-title (closed)="sel.set(null)">
          <p class="text-sm text-muted-foreground">Mensaje · {{ m.fecha }}</p>
          <h2 class="text-2xl font-bold">{{ m.asunto }}</h2>
          <a-pill [tone]="m.estado === 'Nuevo' ? 'bad' : m.estado === 'Respondido' ? 'ok' : 'warn'">{{ m.estado }}</a-pill>
        </a-drawer-title>

        <h3 class="mt-6 font-semibold">Participante</h3>
        <p class="mt-2 text-sm"><b>{{ m.nombre }}</b> · {{ m.email }}</p>
        @if (m.telefono) { <p class="mt-1 flex items-center gap-2 text-sm"><app-icon name="Phone" class="h-4 w-4" /> {{ prefijo() }} {{ m.telefono }}</p> }
        @if (m.origen) { <p class="mt-1 text-xs text-muted-foreground">Recibido desde: {{ m.origen }}</p> }
        <div class="mt-2 flex flex-wrap gap-2">
          @if (m.telefono) {
            <a [href]="waUrl(m)" target="_blank" rel="noopener noreferrer" class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-white hover:opacity-90"><app-icon name="MessageSquare" class="h-4 w-4" /> WhatsApp</a>
          }
          <a [href]="mailtoUrl(m)" class="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted"><app-icon name="Mail" class="h-4 w-4" /> Correo</a>
        </div>

        <h3 class="mt-6 font-semibold">Mensaje</h3>
        <p class="mt-2 rounded-xl bg-muted/60 p-4">{{ m.mensaje }}</p>

        <h3 class="mt-6 font-semibold">Respuesta</h3>
        <textarea [class]="input + ' mt-2 h-32 py-2'" aria-label="Respuesta" placeholder="Escribe una respuesta…" [value]="resp()" (input)="resp.set($any($event.target).value)"></textarea>
        <div class="mt-3 flex flex-wrap gap-2 border-t border-border pt-5">
          <button aBtn [disabled]="!resp().trim()" (click)="setEstado('Respondido'); toast.show('Respuesta enviada por correo')">Responder</button>
          <button aBtn variant="outline" (click)="setEstado('En proceso'); toast.show()">Marcar en proceso</button>
        </div>
      }
    </a-drawer>
  `,
})
export class AtencionPage {
  protected readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  protected readonly input = INPUT_CLS;
  protected readonly pag = new Paginado<Mensaje>(inject(ApiService), "mensajes", 15);
  private readonly brand = inject(BrandService);
  protected readonly prefijo = computed(() => this.brand.pais().telefonoPrefijo);
  /** wa.me con el prefijo del país (un celular local empieza con 0). */
  protected waUrl(m: Mensaje) {
    const prefijo = this.prefijo().replace(/\D/g, "");
    const d = (m.telefono ?? "").replace(/\D/g, "").replace(/^0+/, "");
    return `https://wa.me/${prefijo}${d}?text=${encodeURIComponent(`Hola ${m.nombre.split(" ")[0]}, te escribo por tu consulta: «${m.asunto}».`)}`;
  }
  protected mailtoUrl(m: Mensaje) {
    return `mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.asunto)}`;
  }
  protected readonly sel = signal<Mensaje | null>(null);
  protected readonly resp = signal("");
  protected readonly nuevos = computed(() => this.pag.facetas()["estado"]?.["Nuevo"] ?? 0);

  constructor() {
    this.pag.campos = "estado";
    this.pag.recargar();
  }
  protected abrir(m: Mensaje) {
    this.resp.set("");
    this.sel.set(m);
  }
  protected setEstado(estado: Mensaje["estado"]) {
    const m = this.sel();
    if (!m) return;
    const nuevo = { ...m, estado };
    this.api.put(`admin/c/mensajes/${m.id}`, nuevo).subscribe(() => {
      this.sel.set(nuevo);
      this.resp.set("");
      this.pag.recargar();
    });
  }
  /** Descarga en CSV los mensajes de la página y filtros actuales. */
  protected exportar() {
    descargarTabla("atencion", [["Asunto", "Participante", "Correo", "Fecha", "Estado"], ...this.pag.items().map((m) => [m.asunto, m.nombre, m.email, m.fecha, m.estado])], "Atención al participante");
  }
}
/* ------------------------------------------------------------------ */
/* Usuarios                                                           */
/* ------------------------------------------------------------------ */
type EstadoU = "Activo" | "Invitado" | "Inactivo";
type UsuarioAdmin = { id: string; nombre: string; email: string; rol: RolAdmin; ultimo: string; estado: EstadoU };
type Aud = { id?: string; ts?: string; fecha: string; usuario: string; rol?: string; accion: string; seccion: string; antes?: unknown; despues?: unknown };
type Invitacion = { nombre: string; email: string; rol: RolAdmin; mensaje: string };
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

@Component({
  selector: "a-usuarios-page",
  imports: [ErrorCargaComponent, PageHeaderComponent, PillComponent, BtnDirective, FieldComponent, AdminModalComponent, ConfirmComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Usuarios" [desc]="activos() + ' activos · ' + invitados() + ' invitaciones pendientes'">
      <button aBtn (click)="inv.set({ nombre: '', email: '', rol: 'Operaciones', mensaje: '' })"><app-icon name="Plus" class="h-4 w-4" /> Invitar usuario</button>
    </a-header>
    @if (errorCarga()) { <a-error-carga (reintentar)="cargar()" /> }

    <div class="adm-filtros"><div class="adm-busca">
      <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input aria-label="Buscar usuario" [class]="input + ' pl-9'" placeholder="Nombre o correo" (input)="q.set($any($event.target).value)" />
    </div></div>
    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr><th>Usuario</th><th>Estado</th><th>Rol</th><th>Último acceso</th><th></th></tr></thead>
        <tbody>
          @for (r of lista(); track r.id) {
            <tr>
              <td><b>{{ r.nombre }}</b><p class="text-xs text-muted-foreground">{{ r.email }}</p></td>
              <td class="det-completo det-chip"><a-pill [tone]="r.estado === 'Activo' ? 'ok' : r.estado === 'Invitado' ? 'warn' : 'bad'">{{ r.estado }}</a-pill></td>
              <td><a-pill tone="ok">{{ r.rol }}</a-pill></td>
              <td>{{ r.ultimo }}</td>
              <td><div class="flex gap-1">
                @if (r.estado === "Invitado") { <button aBtn variant="ghost" (click)="toast.show('Invitación reenviada a ' + r.email); log('Reenvió invitación a ' + r.nombre)">Reenviar</button> }
                <button aBtn variant="ghost" (click)="edit.set({ ...r })">Editar</button>
              </div></td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <a-modal [open]="!!inv()" [sucio]="sucioInv()" title="Invitar usuario al panel" (closed)="inv.set(null)">
      @if (inv(); as i) {
        <div class="space-y-4">
          <a-field label="Nombre completo"><input [class]="input" [value]="i.nombre" (input)="inv.set({ ...i, nombre: $any($event.target).value })" /></a-field>
          <a-field label="Correo electrónico"><input type="email" [class]="input" [value]="i.email" (input)="inv.set({ ...i, email: $any($event.target).value })" /></a-field>
          @if (dup()) { <p class="text-sm text-destructive">Ya existe un usuario con este correo.</p> }
          <a-field label="Rol"><select [class]="input" (change)="inv.set({ ...i, rol: $any($event.target).value })">@for (r of roles(); track r.rol) { <option [selected]="r.rol === i.rol">{{ r.rol }}</option> }</select></a-field>
          <p class="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{{ descripcionRol(i.rol) }}</p>
          <a-field label="Mensaje (opcional)"><textarea [class]="input + ' h-20 py-2'" [value]="i.mensaje" (input)="inv.set({ ...i, mensaje: $any($event.target).value })"></textarea></a-field>
          <p class="text-sm text-muted-foreground">Recibirá un enlace válido por 72 horas para crear su contraseña.</p>
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="inv.set(null)">Cancelar</button>
            <button aBtn [disabled]="!i.nombre.trim() || !emailOk(i.email) || dup()" (click)="invitar(i)">Enviar invitación</button>
          </div>
        </div>
      }
    </a-modal>

    <a-modal [open]="!!edit()" [sucio]="sucioEdit()" [title]="'Editar ' + (edit()?.nombre ?? '')" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <div class="space-y-4">
          <a-field label="Nombre completo"><input [class]="input" [value]="e.nombre" (input)="edit.set({ ...e, nombre: $any($event.target).value })" /></a-field>
          <a-field label="Correo electrónico"><input [class]="input" [value]="e.email" disabled /></a-field>
          <a-field label="Rol"><select [class]="input" (change)="edit.set({ ...e, rol: $any($event.target).value })">@for (r of roles(); track r.rol) { <option [selected]="r.rol === e.rol">{{ r.rol }}</option> }</select></a-field>
          <div class="flex flex-wrap gap-2 border-t border-border pt-4">
            <button aBtn variant="outline" (click)="toast.show('Enlace de restablecimiento enviado a ' + e.email); log('Restableció contraseña de ' + e.nombre)">Restablecer contraseña</button>
            @if (e.estado === "Inactivo") {
              <button aBtn variant="outline" (click)="reactivar(e)">Reactivar</button>
            } @else {
              <button aBtn variant="peligro" (click)="baja.set(e)">Desactivar acceso</button>
            }
          </div>
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="edit.set(null)">Cancelar</button>
            <button aBtn [disabled]="!e.nombre.trim()" (click)="guardarEdicion(e)">Guardar</button>
          </div>
        </div>
      }
    </a-modal>

    <a-confirm [open]="!!baja()" [danger]="true" title="¿Desactivar acceso?" confirmLabel="Desactivar" (closed)="baja.set(null)" (confirmed)="desactivar()">
      <b class="text-foreground">{{ baja()?.nombre }}</b> no podrá ingresar al panel. Su historial de cambios se conserva.
    </a-confirm>
  `,
})
export class UsuariosPage {
  private readonly session = inject(AdminSession);
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  private readonly api = inject(ApiService);
  protected readonly input = INPUT_CLS;
  protected readonly emailOk = emailOk;

  protected readonly users = signal<UsuarioAdmin[]>([]);
  private readonly meta = leer(this.api.get<{ roles: { rol: RolAdmin; descripcion: string; permisos: string[] }[] } | undefined>("admin/meta"), undefined);
  protected readonly roles = computed(() => this.meta()?.roles ?? []);

  protected readonly inv = signal<Invitacion | null>(null);
  protected readonly edit = signal<UsuarioAdmin | null>(null);
  protected readonly sucioInv = usarSucio(() => this.inv());
  protected readonly sucioEdit = usarSucio(() => this.edit());
  protected readonly baja = signal<UsuarioAdmin | null>(null);
  protected readonly q = signal("");

  protected readonly activos = computed(() => this.users().filter((u) => u.estado === "Activo").length);
  protected readonly invitados = computed(() => this.users().filter((u) => u.estado === "Invitado").length);
  protected readonly lista = computed(() => this.users().filter((u) => (u.nombre + u.email).toLowerCase().includes(this.q().toLowerCase())));
  protected readonly dup = computed(() => !!this.inv() && this.users().some((u) => u.email.toLowerCase() === this.inv()!.email.toLowerCase()));

  protected readonly errorCarga = signal(false);
  constructor() {
    this.cargar();
  }
  protected cargar() {
    this.errorCarga.set(false);
    this.admin.lista<UsuarioAdmin>("usuarios").subscribe({ next: (u) => this.users.set(u), error: () => this.errorCarga.set(true) });
  }

  protected descripcionRol(rol: RolAdmin) {
    return this.roles().find((r) => r.rol === rol)?.descripcion;
  }

  protected log(accion: string) {
    this.api.post("admin/auditoria", { accion, usuario: this.session.usuario()?.nombre }).subscribe();
  }
  private persistir() {
    this.admin.guardar("usuarios", this.users()).subscribe();
  }

  protected invitar(i: Invitacion) {
    this.users.update((x) => [...x, { id: crypto.randomUUID(), nombre: i.nombre.trim(), email: i.email.trim(), rol: i.rol, ultimo: "—", estado: "Invitado" }]);
    this.persistir();
    this.log(`Invitó a ${i.nombre.trim()} como ${i.rol}`);
    this.toast.show(`Invitación enviada a ${i.email}`);
    this.inv.set(null);
  }
  protected guardarEdicion(e: UsuarioAdmin) {
    const prev = this.users().find((u) => u.id === e.id);
    this.users.update((x) => x.map((u) => (u.id === e.id ? e : u)));
    this.persistir();
    this.log(prev?.rol !== e.rol ? `Cambió rol de ${e.nombre}: ${prev?.rol} → ${e.rol}` : `Editó datos de ${e.nombre}`);
    this.toast.show("Usuario actualizado");
    this.edit.set(null);
  }
  protected reactivar(e: UsuarioAdmin) {
    this.users.update((x) => x.map((u) => (u.id === e.id ? { ...u, estado: "Activo" } : u)));
    this.persistir();
    this.log(`Reactivó a ${e.nombre}`);
    this.toast.show("Usuario reactivado");
    this.edit.set(null);
  }
  protected desactivar() {
    const b = this.baja();
    if (!b) return;
    this.users.update((x) => x.map((u) => (u.id === b.id ? { ...u, estado: "Inactivo" } : u)));
    this.persistir();
    this.log(`Desactivó a ${b.nombre}`);
    this.toast.show("Acceso desactivado");
    this.edit.set(null);
  }
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-roles-page",
  imports: [RouterLink, PageHeaderComponent, PanelComponent, PillComponent, BtnDirective, FieldComponent, AdminModalComponent, ConfirmComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Roles" desc="Qué puede ver y gestionar cada rol del panel. Se asignan al crear o editar un usuario.">
      <button aBtn (click)="nuevo()"><app-icon name="Plus" class="h-4 w-4" /> Nuevo rol</button>
    </a-header>
    @if (errorCarga()) {
      <div role="alert" class="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">No pudimos cargar los roles. <button aBtn variant="outline" class="ml-2" (click)="cargar()">Reintentar</button></div>
    }
    <div class="grid gap-6 md:grid-cols-2">
      @for (r of roles(); track r.rol) {
        <a-panel [title]="r.rol">
          <div actions><a-pill [tone]="r.sistema ? 'muted' : 'info'">{{ r.sistema ? 'Del sistema' : 'Personalizado' }}</a-pill></div>
          <p class="text-sm text-muted-foreground">{{ r.descripcion }}</p>
          <ul class="mt-3 space-y-1.5 text-sm">
            <li>
              <button type="button" class="inline-flex min-h-9 items-center gap-2 font-semibold text-primary hover:underline" [attr.aria-label]="'Ver los usuarios con el rol ' + r.rol" (click)="verUsuarios.set(r)">
                <app-icon name="Users" class="h-4 w-4" /> {{ r.usuarios }} {{ r.usuarios === 1 ? 'usuario' : 'usuarios' }} con este rol
              </button>
            </li>
            <li>
              <button type="button" class="inline-flex min-h-9 items-center gap-2 font-semibold text-primary hover:underline" [attr.aria-label]="'Ver los permisos del rol ' + r.rol" (click)="verPermisos.set(r)">
                <app-icon name="ShieldCheck" class="h-4 w-4" /> Ver permisos · {{ seccionesDe(r).length }} {{ seccionesDe(r).length === 1 ? 'sección' : 'secciones' }}
              </button>
            </li>
          </ul>
          <div class="mt-3 flex flex-wrap gap-2">
            <button aBtn variant="outline" [attr.aria-label]="'Duplicar el rol ' + r.rol" (click)="duplicar(r)"><app-icon name="Copy" class="h-4 w-4" /> Duplicar</button>
            @if (!r.sistema) {
              <button aBtn variant="outline" [attr.aria-label]="'Editar el rol ' + r.rol" (click)="editar(r)"><app-icon name="Pencil" class="h-4 w-4" /> Editar</button>
              <button aBtn variant="peligro-ghost" [attr.aria-label]="'Eliminar el rol ' + r.rol" (click)="porEliminar.set(r)"><app-icon name="Trash2" class="h-4 w-4" /> Eliminar</button>
            }
          </div>
        </a-panel>
      }
    </div>

    <a-modal [open]="!!verUsuarios()" [wide]="true" [title]="'Usuarios con el rol ' + (verUsuarios()?.rol ?? '')" (closed)="verUsuarios.set(null)">
      @if (verUsuarios(); as r) {
        @if (usuariosConRol(r.rol).length) {
          <ul class="divide-y divide-border" aria-label="Usuarios del rol">
            @for (u of usuariosConRol(r.rol); track u.id) {
              <li class="flex flex-wrap items-center justify-between gap-2 py-3">
                <span class="min-w-0"><b>{{ u.nombre }}</b><span class="block text-sm text-muted-foreground">{{ u.email }}</span></span>
                <a-pill [tone]="u.estado === 'Inactivo' ? 'bad' : u.estado === 'Invitado' ? 'warn' : 'ok'">{{ u.estado || 'Activo' }}</a-pill>
              </li>
            }
          </ul>
        } @else { <p class="text-muted-foreground">Ningún usuario tiene este rol todavía.</p> }
        <div class="det-pie">
          <a routerLink="/admin/usuarios" class="inline-flex h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">Ir a Usuarios</a>
          <button aBtn variant="outline" (click)="verUsuarios.set(null)">Cerrar</button>
        </div>
      }
    </a-modal>

    <a-modal [open]="!!verPermisos()" [wide]="true" [title]="'Permisos del rol ' + (verPermisos()?.rol ?? '')" (closed)="verPermisos.set(null)">
      @if (verPermisos(); as r) {
        <p class="mb-3 text-sm text-muted-foreground">{{ r.descripcion }}</p>
        <div class="overflow-x-auto rounded-xl border border-border">
          <table class="w-full text-left text-sm" [attr.aria-label]="'Permisos del rol ' + r.rol">
            <thead class="bg-muted text-xs text-muted-foreground">
              <tr><th class="px-3 py-2 font-semibold">Sección</th>@for (a of acciones; track a.id) { <th class="px-2 py-2 text-center font-semibold">{{ a.etiqueta }}</th> }</tr>
            </thead>
            <tbody>
              @for (s of seccionesDe(r); track s.id) {
                <tr class="border-t border-border">
                  <td class="px-3 py-1.5">{{ s.etiqueta }}</td>
                  @for (a of acciones; track a.id) {
                    <td class="px-2 py-1.5 text-center">
                      @if (tiene(r, s.id, a.id)) { <span aria-label="Sí" class="font-bold text-primary">✓</span> } @else { <span aria-label="No" class="text-muted-foreground/50">—</span> }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="det-pie"><button aBtn variant="outline" (click)="verPermisos.set(null)">Cerrar</button></div>
      }
    </a-modal>

    <a-modal [open]="!!form()" [xl]="true" [sucio]="sucio()" [title]="form()?.original ? 'Editar el rol ' + form()!.original : 'Nuevo rol'" (closed)="form.set(null)">
      @if (form(); as f) {
        <div class="grid gap-4 sm:grid-cols-2">
          <a-field label="Nombre del rol" [requerido]="true" [error]="errorNombre()" [forzar]="intentado()">
            <input [class]="input" [value]="f.rol" [disabled]="!!f.original" maxlength="40" placeholder="Ej. Marketing" (input)="set({ rol: $any($event.target).value })" />
          </a-field>
          <a-field label="Descripción (opcional)">
            <input [class]="input" [value]="f.descripcion" maxlength="200" placeholder="Para qué sirve este rol" (input)="set({ descripcion: $any($event.target).value })" />
          </a-field>
        </div>
        @if (f.original && usuariosDe(f.original) > 0) {
          <p role="status" class="mt-3 rounded-xl bg-accent/40 p-3 text-sm">{{ usuariosDe(f.original) }} {{ usuariosDe(f.original) === 1 ? 'usuario tiene' : 'usuarios tienen' }} este rol: los cambios aplican en su siguiente acción.</p>
        }
        <p class="mt-4 text-sm font-semibold">Permisos por sección</p>
        <p class="mb-2 text-xs text-muted-foreground">Quien puede crear, eliminar o exportar necesariamente puede ver. Una sección sin permisos no aparece en su menú.</p>
        <div class="overflow-x-auto rounded-xl border border-border">
          <table class="w-full text-left text-sm" aria-label="Permisos del rol">
            <thead class="bg-muted text-xs text-muted-foreground">
              <tr><th class="px-3 py-2 font-semibold">Sección</th>@for (a of acciones; track a.id) { <th class="px-2 py-2 text-center font-semibold">{{ a.etiqueta }}</th> }<th class="px-2 py-2 text-center font-semibold">Todo</th></tr>
            </thead>
            <tbody>
              @for (g of grupos; track g.nombre) {
                <tr class="border-t border-border bg-muted/40"><th colspan="6" scope="colgroup" class="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ g.nombre }}</th></tr>
                @for (s of g.secciones; track s.id) {
                  <tr class="border-t border-border">
                    <td class="px-3 py-1.5">{{ s.etiqueta }}</td>
                    @for (a of acciones; track a.id) {
                      <td class="px-2 py-1.5 text-center">
                        <input type="checkbox" class="h-5 w-5 cursor-pointer" [attr.aria-label]="a.etiqueta + ' en ' + s.etiqueta" [checked]="marcado(f, s.id, a.id)" (change)="alternar(s.id, a.id, $any($event.target).checked)" />
                      </td>
                    }
                    <td class="px-2 py-1.5 text-center">
                      <input type="checkbox" class="h-5 w-5 cursor-pointer" [attr.aria-label]="'Todo en ' + s.etiqueta" [checked]="completa(f, s.id)" (change)="todo(s.id, $any($event.target).checked)" />
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (errorMatriz()) { <p role="alert" class="mt-2 text-sm font-semibold text-destructive">{{ errorMatriz() }}</p> }
        @if (errorGuardar()) { <p role="alert" class="mt-2 text-sm font-semibold text-destructive">{{ errorGuardar() }}</p> }
        <div class="det-pie">
          <button aBtn variant="outline" (click)="form.set(null)">Cancelar</button>
          <button aBtn [disabled]="guardando()" (click)="guardar()">{{ f.original ? 'Guardar cambios' : 'Crear rol' }}</button>
        </div>
      }
    </a-modal>

    <a-confirm [open]="!!porEliminar()" [danger]="true" [title]="'¿Eliminar el rol ' + (porEliminar()?.rol ?? '') + '?'" confirmLabel="Eliminar" (closed)="porEliminar.set(null)" (confirmed)="eliminar()">
      @if ((porEliminar()?.usuarios ?? 0) > 0) {
        Hay {{ porEliminar()?.usuarios }} {{ porEliminar()?.usuarios === 1 ? 'usuario' : 'usuarios' }} con este rol: cámbiales el rol desde Usuarios y luego podrás eliminarlo.
      } @else {
        Esta acción no se puede deshacer.
      }
    </a-confirm>
  `,
})
export class RolesPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly roles = signal<RolInfo[]>([]);
  protected readonly errorCarga = signal(false);
  protected readonly acciones = ACCIONES;
  /** Secciones del panel agrupadas como en el menú. */
  protected readonly grupos = [...new Set(SECCIONES.map((s) => s.grupo))].map((nombre) => ({ nombre, secciones: SECCIONES.filter((s) => s.grupo === nombre) }));

  protected readonly form = signal<FormRol | null>(null);
  protected readonly intentado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal("");
  protected readonly porEliminar = signal<RolInfo | null>(null);
  protected readonly verUsuarios = signal<RolInfo | null>(null);
  protected readonly verPermisos = signal<RolInfo | null>(null);
  private readonly usuarios = signal<{ id: string; nombre: string; email: string; rol: string; estado?: string }[]>([]);
  protected usuariosConRol(rol: string) {
    return this.usuarios().filter((u) => u.rol === rol);
  }
  private base = "";
  protected readonly sucio = computed(() => !!this.form() && JSON.stringify(this.form()) !== this.base);

  constructor() {
    this.cargar();
    this.api.get<{ id: string; nombre: string; email: string; rol: string; estado?: string }[]>("admin/c/usuarios").subscribe({ next: (u) => this.usuarios.set(u), error: () => undefined });
  }
  protected cargar() {
    this.errorCarga.set(false);
    this.api.get<{ roles: RolInfo[] }>("admin/meta").subscribe({ next: (m) => this.recibir(m.roles), error: () => this.errorCarga.set(true) });
  }
  private recibir(roles: RolInfo[]) {
    this.roles.set(roles);
    registrarRoles(roles);
  }

  /** Secciones en las que el rol puede hacer algo (las demás no aparecen en su menú). */
  protected seccionesDe(r: RolInfo) {
    return SECCIONES.filter((s) => (r.matriz[s.id]?.length ?? 0) > 0);
  }
  protected tiene(r: RolInfo, s: Seccion, a: Accion) {
    return !!r.matriz[s]?.includes(a);
  }
  protected usuariosDe(rol: string) {
    return this.roles().find((r) => r.rol === rol)?.usuarios ?? 0;
  }

  /* ---- Editor ---- */
  private abrir(f: FormRol) {
    this.base = JSON.stringify(f);
    this.intentado.set(false);
    this.errorGuardar.set("");
    this.form.set(f);
  }
  protected nuevo() {
    this.abrir({ original: "", rol: "", descripcion: "", matriz: {} });
  }
  protected duplicar(r: RolInfo) {
    this.abrir({ original: "", rol: this.nombreCopia(r.rol), descripcion: r.descripcion, matriz: structuredClone(r.matriz) });
  }
  protected editar(r: RolInfo) {
    this.abrir({ original: r.rol, rol: r.rol, descripcion: r.descripcion, matriz: structuredClone(r.matriz) });
  }
  private nombreCopia(base: string) {
    const existe = (n: string) => this.roles().some((r) => r.rol.toLowerCase() === n.toLowerCase());
    let n = `${base} (copia)`.slice(0, 40);
    for (let i = 2; existe(n); i++) n = `${base} (copia ${i})`.slice(0, 40);
    return n;
  }
  protected set(c: Partial<FormRol>) {
    this.form.update((f) => (f ? { ...f, ...c } : f));
    this.errorGuardar.set("");
  }
  protected marcado(f: FormRol, s: Seccion, a: Accion) {
    return !!f.matriz[s]?.includes(a);
  }
  protected completa(f: FormRol, s: Seccion) {
    return ACCIONES.every((a) => this.marcado(f, s, a.id));
  }
  protected alternar(s: Seccion, a: Accion, on: boolean) {
    this.form.update((f) => {
      if (!f) return f;
      let acc = new Set(f.matriz[s] ?? []);
      if (on) { acc.add(a); if (a !== "ver") acc.add("ver"); } else { acc.delete(a); if (a === "ver") acc = new Set(); }
      const matriz = { ...f.matriz };
      if (acc.size) matriz[s] = ACCIONES.map((x) => x.id).filter((x) => acc.has(x)); else delete matriz[s];
      return { ...f, matriz };
    });
    this.errorGuardar.set("");
  }
  protected todo(s: Seccion, on: boolean) {
    this.form.update((f) => {
      if (!f) return f;
      const matriz = { ...f.matriz };
      if (on) matriz[s] = ACCIONES.map((x) => x.id); else delete matriz[s];
      return { ...f, matriz };
    });
    this.errorGuardar.set("");
  }

  protected readonly errorNombre = computed(() => {
    const f = this.form();
    if (!f || f.original) return "";
    const n = f.rol.trim();
    if (n.length < 3) return "Escribe un nombre de al menos 3 caracteres.";
    if (!/^[\p{L}\p{N} _-]+$/u.test(n)) return "Solo letras, números, espacios, guiones y guion bajo.";
    if (this.roles().some((r) => r.rol.toLowerCase() === n.toLowerCase())) return "Ya existe un rol con ese nombre.";
    return "";
  });
  protected readonly errorMatriz = computed(() => (this.intentado() && !Object.keys(this.form()?.matriz ?? {}).length ? "Elige al menos un permiso." : ""));

  protected guardar() {
    const f = this.form();
    if (!f) return;
    this.intentado.set(true);
    if (this.errorNombre() || !Object.keys(f.matriz).length) return;
    this.guardando.set(true);
    const cuerpo = { rol: f.rol.trim(), descripcion: f.descripcion, matriz: f.matriz };
    const peticion = f.original ? this.api.put<RolInfo[]>(`admin/roles/${encodeURIComponent(f.original)}`, cuerpo) : this.api.post<RolInfo[]>("admin/roles", cuerpo);
    peticion.subscribe({
      next: (roles) => { this.guardando.set(false); this.recibir(roles); this.toast.show(f.original ? "Rol actualizado" : `Rol «${cuerpo.rol}» creado`); this.form.set(null); },
      error: (e) => { this.guardando.set(false); this.errorGuardar.set(e?.error?.message ?? "No se pudo guardar el rol."); },
    });
  }
  protected eliminar() {
    const r = this.porEliminar();
    if (!r || r.usuarios > 0) return;
    this.api.delete<RolInfo[]>(`admin/roles/${encodeURIComponent(r.rol)}`).subscribe({
      next: (roles) => { this.recibir(roles); this.toast.show(`Rol «${r.rol}» eliminado`); },
      error: (e) => this.toast.error(e?.error?.message ?? "No se pudo eliminar el rol."),
    });
  }
}

type RolInfo = { rol: string; descripcion: string; sistema: boolean; matriz: MatrizPermisos; permisos: string[]; usuarios: number };
type FormRol = { original: string; rol: string; descripcion: string; matriz: MatrizPermisos };

/* ------------------------------------------------------------------ */
/* Registro de cambios (auditoría)                                     */
/* ------------------------------------------------------------------ */
@Component({
  selector: "a-auditoria-page",
  imports: [OrdenColumnaComponent, FilaEsqueletoComponent, LimpiarFiltrosComponent, PageHeaderComponent, PillComponent, BtnDirective, IconComponent, PagerComponent, AdminModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header vista="auditoria" title="Registro de cambios" [desc]="pag.total().toLocaleString('es') + ' cambios registrados en el panel · quién, cuándo y qué cambió'">
      <button aBtn variant="outline" [disabled]="exportando()" (click)="exportar()"><app-icon name="Download" class="h-4 w-4" /> {{ exportando() ? 'Preparando…' : 'Descargar' }}</button>
    </a-header>
    <div class="adm-filtros">
      <div class="adm-busca">
        <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Buscar cambio" [class]="input + ' pl-9'" placeholder="Acción o usuario" (input)="pag.buscar($any($event.target).value)" />
      </div>
      <select aria-label="Filtrar por usuario" [class]="input + ' w-auto'" (change)="pag.filtrar('usuario', $any($event.target).value)">
        <option value="">Todos los usuarios</option>
        @for (u of usuarios(); track u.id) { <option>{{ u.nombre }}</option> }
      </select>
      <select aria-label="Filtrar por sección" [class]="input + ' w-auto'" (change)="pag.filtrar('seccion', $any($event.target).value)">
        <option value="">Todas las secciones</option>
        @for (s of secciones; track s) { <option>{{ s }}</option> }
      </select>
      <input type="date" aria-label="Desde" [class]="input + ' w-auto'" (input)="pag.filtrar('desde', $any($event.target).value)" />
      <input type="date" aria-label="Hasta" [class]="input + ' w-auto'" (input)="pag.filtrar('hasta', $any($event.target).value)" />
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
    </div>
    <div class="adm-wrap">
      <table class="adm-table">
        <thead><tr><th aOrden="ts" [pag]="pag" etiquetaOrden="Fecha">Fecha</th><th aOrden="seccion" [pag]="pag" etiquetaOrden="Sección">Sección</th><th aOrden="usuario" [pag]="pag" etiquetaOrden="Usuario">Usuario</th><th>Acción</th><th aria-label="Ver cambios"></th></tr></thead>
        <tbody>
          @for (a of pag.items(); track a.id ?? $index) {
            <tr>
              <td><b>{{ a.fecha }}</b></td>
              <td class="det-completo det-chip"><a-pill>{{ a.seccion }}</a-pill></td>
              <td>{{ a.usuario }}@if (a.rol) { <span class="block text-xs text-muted-foreground">{{ a.rol }}</span> }</td>
              <td class="adm-ancha">{{ a.accion }}</td>
              <td class="det-ojo">
                @if (a.antes !== undefined || a.despues !== undefined) {
                  <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver qué cambió: ' + a.accion" title="Ver cambios" (click)="ver.set(a)"><app-icon name="Eye" class="h-4 w-4" /></button>
                }
              </td>
            </tr>
          } @empty {
            @if (pag.cargando()) { @for (n of [1, 2, 3, 4, 5]; track n) { <tr aEsqueleto [cols]="5"></tr> } } @else { <tr><td colspan="5" class="adm-empty">Sin cambios con estos filtros</td></tr> }
          }
        </tbody>
      </table>
    </div>
    <a-pager [p]="pag" />

    <a-modal [open]="!!ver()" [wide]="true" title="Qué cambió" (closed)="ver.set(null)">
      @if (ver(); as a) {
        <dl class="mb-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div><dt class="inline text-muted-foreground">Acción: </dt><dd class="inline font-medium">{{ a.accion }}</dd></div>
          <div><dt class="inline text-muted-foreground">Usuario: </dt><dd class="inline font-medium">{{ a.usuario }}{{ a.rol ? ' (' + a.rol + ')' : '' }}</dd></div>
          <div><dt class="inline text-muted-foreground">Fecha: </dt><dd class="inline font-medium">{{ a.fecha }}</dd></div>
          <div><dt class="inline text-muted-foreground">Sección: </dt><dd class="inline font-medium">{{ a.seccion }}</dd></div>
        </dl>
        @if (cambios().length) {
          <div class="overflow-x-auto rounded-xl border border-border">
            <table class="w-full text-left text-sm" aria-label="Campos modificados">
              <thead class="bg-muted text-xs text-muted-foreground"><tr><th class="px-3 py-2 font-semibold">Campo</th><th class="px-3 py-2 font-semibold">Antes</th><th class="px-3 py-2 font-semibold">Después</th></tr></thead>
              <tbody>
                @for (d of cambios(); track d.campo) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-1.5 font-mono text-xs">{{ d.campo }}</td>
                    <td class="px-3 py-1.5 text-destructive">{{ d.antes }}</td>
                    <td class="px-3 py-1.5 font-medium text-foreground">{{ d.despues }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="text-sm text-muted-foreground">No hay campos distintos entre el antes y el después.</p>
        }
        <div class="mt-5 flex justify-end"><button aBtn variant="outline" (click)="ver.set(null)">Cerrar</button></div>
      }
    </a-modal>
  `,
})
export class AuditoriaPage {
  private readonly api = inject(ApiService);
  protected readonly input = INPUT_CLS;
  /** Las secciones del panel (más "Acceso", que registra ingresos y fallos). */
  protected readonly secciones = [...SECCIONES.map((s) => s.etiqueta), "Acceso"];
  protected readonly pag = new Paginado<Aud>(this.api, "auditoria", 25);
  protected readonly usuarios = leer(inject(AdminApi).lista<{ id: string; nombre: string }>("usuarios"), [] as { id: string; nombre: string }[]);
  protected readonly ver = signal<Aud | null>(null);
  protected readonly exportando = signal(false);
  protected readonly cambios = computed(() => {
    const a = this.ver();
    return a ? diferencias(a.antes, a.despues) : [];
  });

  constructor() {
    // Lo más reciente primero.
    this.pag.sort.set("ts");
    this.pag.dir.set("desc");
    this.pag.recargar();
  }

  /** Descarga (Excel o PDF) TODOS los cambios que cumplen los filtros actuales (no solo la página visible), con el detalle de lo que cambió. */
  protected async exportar() {
    this.exportando.set(true);
    try {
      const base: Record<string, string | number> = { size: 200, sort: "ts", dir: "desc" };
      if (this.pag.q().trim()) base["q"] = this.pag.q().trim();
      for (const [k, v] of Object.entries(this.pag.filtros())) if (v) base[k] = v;
      const todos: Aud[] = [];
      for (let page = 1; page <= 100; page++) {
        const r = await firstValueFrom(this.api.get<{ items: Aud[]; total: number }>("admin/q/auditoria", { ...base, page }));
        todos.push(...r.items);
        if (todos.length >= r.total || !r.items.length) break;
      }
      descargarTabla("registro-de-cambios", [
        ["Fecha", "Usuario", "Rol", "Sección", "Acción", "Qué cambió"],
        ...todos.map((a) => [a.fecha, a.usuario, a.rol ?? "", a.seccion, a.accion, diferencias(a.antes, a.despues).map((d) => `${d.campo}: ${d.antes} → ${d.despues}`).join(" | ")]),
      ], "Registro de cambios");
    } finally {
      this.exportando.set(false);
    }
  }
}
