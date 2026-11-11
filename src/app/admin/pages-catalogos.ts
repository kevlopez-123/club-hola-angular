import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ApiService } from '../core/api.service';
import { formatUSD } from '../core/format';
import { errorReglasBeneficio, fechaLarga, reglaDe, type ReglaCupon, type Vigencia } from '../core/cupones';
import { BrandService } from '../core/brand.service';
import { CargaMasivaComponent } from './carga-masiva';
import type { Beneficio, Slide } from '../core/models';
import { CatIconComponent, IconComponent } from '../shared/icon.component';
import { PromoFieldsComponent } from './promo-fields';
import type { PromoCampos } from '../core/promo';
import { ICONOS_CATEGORIA } from '../shared/iconos-categoria';
import { LimpiarFiltrosComponent } from '../shared/limpiar-filtros';
import { BannersEditorComponent } from './pages-banners';
import {
  AdminApi,
  Paginado,
  PagerComponent,
  AdminModalComponent,
  BtnDirective,
  ConfirmComponent,
  DrawerComponent,
  DrawerTitleComponent,
  FieldComponent,
  ImageUploadComponent,
  INPUT_CLS,
  PageHeaderComponent,
  PanelComponent,
  PillComponent,
  ToggleComponent,
  ToastService,
  usarSucio,
  OrdenColumnaComponent,
  abrirDesdeUrl,
} from './kit';
import { AdminSession } from './session';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/* ------------------------------------------------------------------ */
/* Modal de categoría de beneficios                         */
/* ------------------------------------------------------------------ */
/** Antes de guardar: quita líneas vacías de las listas y limpia la promoción si no hay tipo elegido. */
function limpiarListas<T extends PromoCampos & { consideraciones?: string[]; especificaciones?: string[]; pasos?: string[] }>(e: T): T {
  const limpia = (l?: string[]) => (l ?? []).map((x) => x.trim()).filter(Boolean);
  const r: T = { ...e };
  if (e.consideraciones) r.consideraciones = limpia(e.consideraciones);
  if (e.especificaciones) r.especificaciones = limpia(e.especificaciones);
  if (e.pasos) r.pasos = limpia(e.pasos);
  if (!e.promoTipo) {
    r.promoTipo = "";
    r.promoValor = undefined;
    r.promoDesde = "";
    r.promoHasta = "";
  }
  return r;
}
export type CategoriaEdit = {
  slug: string;
  label: string;
  activo: boolean;
  /** Ícono de la lista (nombre de lucide). */
  icon?: string | undefined;
  /** SVG propio (data URL): si existe, reemplaza al ícono. */
  imagen?: string | undefined;
  subcategorias: { slug: string; label: string }[];
};

@Component({
  selector: 'a-category-modal',
  imports: [
    AdminModalComponent,
    FieldComponent,
    BtnDirective,
    ToggleComponent,
    IconComponent,
    CatIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-modal
      [open]="!!value()"
      [title]="value()?.label ? 'Editar ' + value()!.label : 'Nueva categoría'"
      (closed)="closed.emit()"
    >
      @if (c(); as c) {
        @if (eligiendo()) {
          <div class="space-y-3">
            <button aBtn variant="ghost" (click)="eligiendo.set(false)"><app-icon name="ArrowLeft" class="h-4 w-4" /> Volver</button>
            <input type="search" aria-label="Buscar ícono" placeholder="Buscar: casa, avión, café…" [class]="input" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" />
            <div class="grid max-h-80 grid-cols-5 gap-2 overflow-y-auto sm:grid-cols-6" role="group" aria-label="Íconos disponibles">
              @for (i of filtrados(); track i.n) {
                <button type="button" data-compact [attr.aria-label]="i.k" [attr.title]="i.k" [attr.aria-pressed]="c.icon === i.n && !c.imagen" (click)="elegir(i.n)"
                  [class]="'grid h-12 w-full place-items-center rounded-xl border transition-colors ' + (c.icon === i.n && !c.imagen ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')">
                  <app-icon [name]="i.n" class="h-5 w-5" />
                </button>
              }
            </div>
            @if (!filtrados().length) { <p class="text-sm text-muted-foreground">No hay íconos con esa búsqueda. Prueba otra palabra o sube tu propio SVG.</p> }
          </div>
        } @else {        <div class="space-y-4">
          <a-field label="Nombre"
            ><input
              [class]="input"
              [value]="c.label"
              (input)="
                set({
                  label: $any($event.target).value,
                  slug: value()?.label ? c.slug : slugify($any($event.target).value),
                })
              "
          /></a-field>
          <div>
            <span class="mb-1.5 block text-sm font-medium text-foreground">Ícono</span>
            <div class="flex items-center gap-3">
              <span class="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border bg-secondary p-3 text-primary">
                <app-cat-icon [icon]="c.icon" [imagen]="c.imagen" class="h-full w-full" />
              </span>
              <div class="flex flex-wrap gap-2">
                <button aBtn variant="outline" (click)="eligiendo.set(true)"><app-icon name="LayoutGrid" class="h-4 w-4" /> Elegir ícono</button>
                <label class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
                  <app-icon name="Upload" class="h-4 w-4" /> Subir SVG propio
                  <input type="file" accept=".svg,image/svg+xml" class="sr-only" aria-label="Subir SVG propio" (change)="subirSvg($any($event.target).files?.[0]); $any($event.target).value = ''" />
                </label>
                @if (c.imagen) { <button aBtn variant="ghost" (click)="set({ imagen: undefined })">Quitar SVG</button> }
              </div>
            </div>
            <p class="mt-1.5 text-xs text-muted-foreground">Elige uno de la lista o sube tu propio SVG (cuadrado, hasta 100 KB). El SVG propio reemplaza al ícono.</p>
            @if (errorSvg()) { <p role="alert" class="mt-1 text-xs font-medium text-destructive">{{ errorSvg() }}</p> }
          </div>
          @if (conSub()) {
            <a-field label="Subcategorías">
              <ul class="mb-2 space-y-2">
                @for (s of c.subcategorias; track $index; let i = $index) {
                  <li class="flex gap-2">
                    <input
                      aria-label="Subcategoría"
                      [class]="input"
                      [value]="s.label"
                      (input)="setSub(i, $any($event.target).value)"
                    />
                    <button
                      aBtn
                      variant="ghost"
                      aria-label="Eliminar subcategoría"
                      (click)="set({ subcategorias: c.subcategorias.filter((_, k) => k !== i) })"
                    >
                      ×
                    </button>
                  </li>
                }
              </ul>
              <div class="flex gap-2">
                <input
                  [class]="input"
                  placeholder="Nueva subcategoría"
                  [value]="nueva()"
                  (input)="nueva.set($any($event.target).value)"
                  (keydown.enter)="addSub()"
                />
                <button aBtn variant="outline" (click)="addSub()">Añadir</button>
              </div>
            </a-field>
          }
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Visible en web y app</span
            ><a-toggle label="Visible" [on]="c.activo" (onChange)="set({ activo: $event })" />
          </div>
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="closed.emit()">Cancelar</button>
            <button aBtn [disabled]="!c.label.trim()" (click)="saved.emit(c)">Guardar</button>
          </div>
        </div>
        }
      }
    </a-modal>
  `,
})
export class CategoryModalComponent {
  readonly value = input<CategoriaEdit | null>(null);
  readonly conSub = input(true);
  readonly saved = output<CategoriaEdit>();
  readonly closed = output<void>();
  protected readonly input = INPUT_CLS;
  protected readonly slugify = slugify;
  protected readonly c = signal<CategoriaEdit | null>(null);
  protected readonly nueva = signal('');
  protected readonly eligiendo = signal(false);
  protected readonly busqueda = signal('');
  protected readonly errorSvg = signal('');
  protected readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return q ? ICONOS_CATEGORIA.filter((i) => (i.k + ' ' + i.n).toLowerCase().includes(q)) : ICONOS_CATEGORIA;
  });

  constructor() {
    effect(() => {
      const v = this.value();
      this.c.set(v ? structuredClone(v) : null);
      this.nueva.set('');
      this.eligiendo.set(false);
      this.busqueda.set('');
      this.errorSvg.set('');
    });
  }
  protected set(p: Partial<CategoriaEdit>) {
    this.c.update((x) => (x ? { ...x, ...p } : x));
  }
  protected elegir(icon: string) {
    this.set({ icon, imagen: undefined });
    this.eligiendo.set(false);
  }
  /** Sube un SVG propio (cuadrado, hasta 100 KB). Se guarda como data URL y se muestra con <img>, donde no se ejecutan scripts. */
  protected subirSvg(f?: File) {
    this.errorSvg.set('');
    if (!f) return;
    if (!/\.svg$/i.test(f.name) && f.type !== 'image/svg+xml') return this.errorSvg.set('El archivo debe ser un SVG.');
    if (f.size > 100 * 1024) return this.errorSvg.set('El SVG pesa más de 100 KB. Usa uno más liviano.');
    const r = new FileReader();
    r.onload = () => {
      const texto = String(r.result);
      if (!/<svg[\s>]/i.test(texto)) return this.errorSvg.set('El archivo no parece un SVG válido.');
      if (/<script|\son\w+\s*=|javascript:/i.test(texto)) return this.errorSvg.set('El SVG no puede contener scripts.');
      this.set({ imagen: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(texto))) });
    };
    r.readAsText(f);
  }
  protected setSub(i: number, label: string) {
    this.c.update((x) =>
      x
        ? { ...x, subcategorias: x.subcategorias.map((s, k) => (k === i ? { ...s, label } : s)) }
        : x,
    );
  }
  protected addSub() {
    const n = this.nueva().trim();
    if (!n) return;
    this.c.update((x) =>
      x ? { ...x, subcategorias: [...x.subcategorias, { slug: slugify(n), label: n }] } : x,
    );
    this.nueva.set('');
  }
}

/* ------------------------------------------------------------------ */
/* Beneficios                                                          */
/* ------------------------------------------------------------------ */
type BeneficioRow = Beneficio & PromoCampos & { activo: boolean; exclusivo: boolean; imagenes: string[] };
const VIGENCIA_PILL: Record<Vigencia, { l: string; t: 'ok' | 'warn' | 'bad' }> = { vigente: { l: 'Vigente', t: 'ok' }, programado: { l: 'Programado', t: 'warn' }, vencido: { l: 'Vencido', t: 'bad' } };
type Lote = {
  id: string;
  beneficioId?: string;
  codigos?: string[];
  comercio: string;
  beneficio: string;
  archivo: string;
  total: number;
  usados: number;
  vence: string;
  fecha: string;
  /** Marca de tiempo de la carga: define el orden FIFO entre lotes del mismo beneficio. */
  creadoEn?: number;
};

@Component({
  selector: 'a-beneficios-page',
  imports: [CargaMasivaComponent, ConfirmComponent, PromoFieldsComponent, LimpiarFiltrosComponent,
    BannersEditorComponent,
    PagerComponent,
    IconComponent,
    PageHeaderComponent,
    PillComponent,
    BtnDirective,
    FieldComponent,
    ToggleComponent,
    PanelComponent,
    ImageUploadComponent,
    DrawerComponent,
    DrawerTitleComponent,
    CategoryModalComponent,
    AdminModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header
      title="Beneficios"
      [desc]="pag.total().toLocaleString('es') + ' beneficios'"
    >
      @if (tab() === 'lista') {
      <button aBtn variant="outline" (click)="cargaMasiva.set(true)"><app-icon name="Upload" class="h-4 w-4" /> Carga masiva</button>
      <button aBtn [disabled]="!pag.items().length" (click)="edit.set(nuevo())">
        <app-icon name="Plus" class="h-4 w-4" /> Nuevo beneficio
      </button>
      }
    </a-header>
    <a-carga-masiva tipo="beneficios" [abierto]="cargaMasiva()" (cerrado)="cargaMasiva.set(false)" (terminada)="pag.recargar()" />
    <div class="mb-4 flex flex-wrap gap-2">
      @for (t of tabs; track t.k) {
        <button aBtn [variant]="tab() === t.k ? 'primary' : 'outline'" (click)="tab.set(t.k)">
          {{ t.l }}
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('lista') {
        <div class="adm-filtros"><div class="adm-busca">
          <app-icon
            name="Search"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          /><input
            [class]="input + ' pl-9'"
            placeholder="Buscar beneficio o comercio"
            aria-label="Buscar beneficio"
            (input)="pag.buscar($any($event.target).value)"
          />
        </div>
<select aria-label="Categoría" [class]="input + ' w-auto'" (change)="pag.filtrar('categoriaSlug', $any($event.target).value)">
<option value="">Todas las categorías</option>
@for (c of cats(); track c.slug) {
<option [value]="c.slug">{{ c.label }}</option>
}
</select>
<select aria-label="Vigencia" [class]="input + ' w-auto'" (change)="pag.filtrar('vigencia', $any($event.target).value)">
<option value="">Toda vigencia</option>
<option value="vigente">Vigentes</option>
<option value="programado">Programados</option>
<option value="vencido">Vencidos</option>
</select>
<app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" /></div>
      <div class="adm-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Beneficio</th>
                <th>Tipo</th>
                <th>Vigencia</th>
                <th>Provincias</th>
                <th>Cupón</th>
                <th>Categoría</th>
                <th>Descuento</th>
                <th>Valor</th>
                <th>Exclusivo</th>
                <th>Activo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of pag.items(); track r.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <img [src]="r.imagen" alt="" class="h-11 w-16 rounded-lg object-cover" />
                      <div>
                        <b>{{ r.nombre }}</b>
                        <p class="text-xs text-muted-foreground">{{ r.marca }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="det-completo det-chip">
                    <a-pill [tone]="r.tipo === 'compra' ? 'warn' : 'muted'">{{ tipoDe(r) }}</a-pill>
                  </td>
                  <td class="det-chip">
                    <a-pill [tone]="vigenciaPill(r).t">{{ vigenciaPill(r).l }}</a-pill>
                    <p class="mt-1 text-xs text-muted-foreground">{{ rangoVigencia(r) }}</p>
                  </td>
                  <td class="text-sm">{{ textoProvincias(r) }}</td>
                  <td class="text-sm">{{ textoCupon(r) }}</td>
                  <td>{{ r.categoria }}</td>
                  <td>{{ r.descuento }}</td>
                  <td>
                    {{ r.precio ? usd(r.precio) : '—' }}
                  </td>
                  <td>
                    @if (r.exclusivo) {
                      <a-pill tone="ok">Sí</a-pill>
                    } @else {
                      —
                    }
                  </td>
                  <td>
                    <a-toggle label="Activo" [on]="r.activo" (onChange)="toggle(r.id, $event)" />
                  </td>
                  <td><button aBtn variant="ghost" (click)="edit.set(conRegla(r))">Editar</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <a-pager [p]="pag" />
      }
      @case ('categorias') {
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            (click)="editCat.set({ slug: '', label: '', activo: true, subcategorias: [] })"
            class="grid min-h-24 place-items-center rounded-2xl border-2 border-dashed border-border font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <span class="flex items-center gap-2"
              ><app-icon name="Plus" class="h-4 w-4" /> Nueva categoría</span
            >
          </button>
          @for (c of cats(); track c.slug) {
            <a-panel>
              <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span class="flex min-w-0 items-center gap-2">
                  @if (c.imagen) {
                    <img [src]="c.imagen" alt="" class="h-8 w-8 rounded-lg object-cover" />
                  }
                  <b>{{ c.label }}</b>
                  @if (!c.activo) {
                    <a-pill tone="bad">Oculta</a-pill>
                  }
                </span>
                <button aBtn variant="ghost" (click)="editCat.set(c)">Editar</button>
              </div>
            </a-panel>
          }
        </div>
      }
      @case ('banners') {
        <a-banners-editor [ubicaciones]="['Beneficios']" />
      }
      @case ('cupones') {
        <div class="grid gap-6 lg:grid-cols-2">
          <a-panel title="Carga de códigos de beneficios" class="lg:col-span-2">
            <button actions aBtn (click)="cargaCodigos.set(true)">
              <app-icon name="Upload" class="h-4 w-4" /> Cargar códigos
            </button>
            <p class="mb-3 text-sm text-muted-foreground">
              Cada comercio entrega códigos únicos; el sitio asigna el siguiente disponible al
              generar el cupón del beneficio vinculado y avisa cuando se agotan o vencen. Formato:
              CSV o TXT, un código por línea. Un beneficio puede tener varios lotes: se usan en orden de
              carga (el más antiguo primero) y, cuando uno se agota o vence, sigue el siguiente.
            </p>
            <div class="adm-wrap">
              <table class="adm-table">
                <thead>
                  <tr>
                    <th>Comercio</th>
                    <th>Estado</th>
                    <th>Archivo</th>
                    <th>Vence</th>
                    <th>Disponibles</th>
                    <th aria-label="Detalle"></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of lotesOrdenados(); track l.id) {
                    <tr>
                      <td>
                        <b>{{ l.comercio }}</b>
                        <p class="text-xs text-muted-foreground">{{ l.beneficio }}</p>
                      </td>
                      <td class="det-completo det-chip">
                        <a-pill [tone]="estadoLote(l).tono">{{ estadoLote(l).texto }}</a-pill>
                      </td>
                      <td>
                        <span class="text-sm"
                          >{{ l.archivo
                          }}<span class="block text-xs text-muted-foreground">{{
                            l.fecha
                          }}</span></span
                        >
                      </td>
                      <td>{{ l.vence }}</td>
                      <td>
                        <a-pill [tone]="(l.total - l.usados) / l.total < 0.2 ? 'bad' : 'ok'"
                          >{{ l.total - l.usados }} / {{ l.total }}</a-pill
                        >
                      </td>
                      <td class="det-ojo">
                        <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" [attr.aria-label]="'Ver detalle del lote ' + l.archivo" title="Ver detalle" (click)="loteDetalle.set(l)"><app-icon name="Eye" class="h-4 w-4" /></button>
                      </td>
                      <td>
                        <button aBtn variant="peligro-ghost" (click)="confirmarLote.set(l)">
                          Desactivar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </a-panel>
        </div>
      }
    }

    <a-drawer [open]="!!edit()" [sucio]="sucio()" maxW="max-w-lg" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <a-drawer-title (closed)="edit.set(null)"
          ><h2 class="text-xl font-bold">{{ e.nombre || 'Nuevo beneficio' }}</h2></a-drawer-title
        >
        <div class="space-y-4">
          <a-field label="Imágenes (galería)"
            ><a-image-upload
              [multiple]="true"
              aspect="aspect-[16/10]"
              [value]="e.imagenes"
              (valueChange)="setE({ imagenes: $event, imagen: $event[0] || e.imagen })"
              [minAncho]="1024" [minAlto]="640" hint="JPG 16:10 · 1600×1000 px"
          /></a-field>
          <a-field label="Comercio"
            ><select [class]="input" aria-label="Comercio" (change)="setE({ marca: $any($event.target).value })">
              @for (m of marcasOpc(e.marca); track m) {
                <option [selected]="m === e.marca">{{ m }}</option>
              }
            </select></a-field
          >
          <a-field label="Nombre"
            ><input
              [class]="input"
              [value]="e.nombre"
              (input)="setE({ nombre: $any($event.target).value })"
          /></a-field>
          <div class="grid grid-cols-2 gap-3">
            <a-field label="Descuento"
              ><input
                [class]="input"
                [value]="e.descuento"
                (input)="setE({ descuento: $any($event.target).value })"
            /></a-field>
            <a-field label="Categoría"
              ><select [class]="input" (change)="setCategoria($any($event.target).value)">
                @for (c of cats(); track c.slug) {
                  <option [value]="c.slug" [selected]="c.slug === e.categoriaSlug">
                    {{ c.label }}
                  </option>
                }
              </select></a-field
            >
            <a-field label="Precio"
              ><input
                [class]="input"
                type="number"
                [value]="e.precio ?? 0"
                (input)="setE({ precio: +$any($event.target).value })"
            /></a-field>
          </div>
          <a-field label="Pasos de uso (uno por línea)">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="e.pasos.join('\\n')"
              (input)="setE({ pasos: $any($event.target).value.split('\\n') })"
            ></textarea>
          </a-field>
          <a-field label="Términos y condiciones">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="e.terminos"
              (input)="setE({ terminos: $any($event.target).value })"
            ></textarea>
          </a-field>
          <a-field label="Especificaciones (una por línea)">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="(e.especificaciones ?? []).join('\\n')"
              (input)="setE({ especificaciones: $any($event.target).value.split('\\n') })"
            ></textarea>
          </a-field>
          <fieldset class="rounded-2xl border border-border p-4">
            <legend class="px-2 text-sm font-bold">Vigencia</legend>
            <p class="mb-3 text-xs text-muted-foreground">Fuera de estas fechas el beneficio no se muestra y no se puede canjear. Déjalas vacías si no tiene límite.</p>
            <div class="grid grid-cols-2 gap-3">
              <a-field label="Inicio"
                ><input type="date" [class]="input" [value]="e.desde ?? ''" (input)="setE({ desde: $any($event.target).value || undefined })"
              /></a-field>
              <a-field label="Vencimiento"
                ><input type="date" [class]="input" [min]="e.desde ?? ''" [value]="e.hasta ?? ''" (input)="setE({ hasta: $any($event.target).value || undefined })"
              /></a-field>
            </div>
          </fieldset>

          @if (e.tipo !== 'compra') {
            <fieldset class="rounded-2xl border border-border p-4">
              <legend class="px-2 text-sm font-bold">Cupón</legend>
              <a-field label="Código del cupón">
                <select [class]="input" aria-label="Código del cupón" (change)="setE({ modoCodigo: $any($event.target).value })">
                  <option value="unico" [selected]="e.modoCodigo !== 'compartido'">Códigos únicos del comercio (uno por participante)</option>
                  <option value="compartido" [selected]="e.modoCodigo === 'compartido'">Un código compartido por todos los participantes</option>
                </select>
              </a-field>
              @if (e.modoCodigo === 'compartido') {
                <div class="mt-3 grid grid-cols-2 gap-3">
                  <a-field label="Código compartido">
                    <input [class]="input + ' uppercase'" maxlength="40" placeholder="PROMO20" [value]="e.codigoCompartido ?? ''" (input)="setE({ codigoCompartido: $any($event.target).value.trim().toUpperCase() })" />
                  </a-field>
                  <a-field label="Máximo de usos (0 = sin máximo)">
                    <input [class]="input" type="number" min="0" [value]="e.usosMaximos ?? 0" (input)="setE({ usosMaximos: +$any($event.target).value })" />
                  </a-field>
                </div>
                <p class="mt-2 text-xs text-muted-foreground">Todos los participantes reciben el mismo código; sigue valiendo el límite de canjes por persona. Van {{ e.usos ?? 0 }} usos.</p>
              } @else {
                <p class="mt-2 text-xs text-muted-foreground">Cada participante recibe un código distinto de los lotes que se cargan en «Cupones y códigos».</p>
              }

              <p class="mb-2 mt-4 text-sm font-bold">Regla del cupón de este beneficio</p>
              <div class="grid gap-3 sm:grid-cols-3">
                <a-field label="Dura (horas)">
                  <input [class]="input" type="number" min="1" max="720" [value]="reglaDe(e).horas" (input)="setRegla({ horas: +$any($event.target).value })" />
                </a-field>
                <a-field label="Se puede canjear (veces)">
                  <input [class]="input" type="number" min="0" max="99" [value]="reglaDe(e).limite" (input)="setRegla({ limite: +$any($event.target).value })" />
                </a-field>
                <a-field label="Espera (meses)">
                  <input [class]="input" type="number" min="1" max="60" [value]="reglaDe(e).meses" (input)="setRegla({ meses: +$any($event.target).value })" />
                </a-field>
              </div>
              <p class="mt-3 rounded-xl bg-muted/60 p-3 text-sm" aria-live="polite">{{ resumenRegla(reglaDe(e)) }}</p>
            </fieldset>
          }

          <fieldset class="rounded-2xl border border-border p-4">
            <legend class="px-2 text-sm font-bold">Dónde está disponible</legend>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium">En todo el país</span>
              <a-toggle label="En todo el país" [on]="!e.provincias?.length" (onChange)="todoElPais($event)" />
            </div>
            @if (e.provincias?.length || elegirProvincias()) {
              <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Provincias donde está disponible">
                @for (n of provinciasOpc(); track n) {
                  <button type="button" [attr.aria-pressed]="provinciaActiva(e, n)" (click)="alternarProvincia(n)"
                    [class]="'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ' + (provinciaActiva(e, n) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary')">{{ n }}</button>
                }
              </div>
              <p class="mt-2 text-xs text-muted-foreground">{{ e.provincias?.length ?? 0 }} de {{ provinciasOpc().length }} provincias. Solo quienes viven allí pueden canjearlo; si el participante no indicó su provincia, se le pide completarla.</p>
            }
          </fieldset>

          @if (errReglas()) { <p role="alert" class="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{{ errReglas() }}</p> }

          <a-promo-fields [valor]="e" [conPrecio]="e.tipo === 'compra' || e.exclusivo" (cambio)="setE($event)" />          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Beneficio exclusivo</span
            ><a-toggle
              label="Exclusivo"
              [on]="e.exclusivo"
              (onChange)="setE({ exclusivo: $event, tipo: $event ? 'compra' : e.tipo })"
            />
          </div>
          <button aBtn class="w-full" [disabled]="!!errReglas()" (click)="guardar()">Guardar beneficio</button>
        </div>
      }
    </a-drawer>

    <a-category-modal
      [conSub]="false"
      [value]="editCat()"
      (closed)="editCat.set(null)"
      (saved)="guardarCat($event)"
    />

    <a-confirm
      [open]="!!confirmarLote()"
      [danger]="true"
      title="¿Desactivar lote?"
      confirmLabel="Desactivar"
      (closed)="confirmarLote.set(null)"
      (confirmed)="desactivarLote(confirmarLote()!.id)"
    >
      Se quitará el lote de
      <b class="text-foreground">{{ confirmarLote()?.beneficio }}</b> con
      {{ (confirmarLote()?.total ?? 0) - (confirmarLote()?.usados ?? 0) }} códigos sin usar. Esta acción no se puede deshacer.
    </a-confirm>
    <a-modal [open]="!!loteDetalle()" title="Detalle del lote de códigos" (closed)="loteDetalle.set(null)">
      @if (loteDetalle(); as l) {
        <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Comercio</dt><dd class="text-sm font-semibold">{{ l.comercio }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Beneficio</dt><dd class="text-sm font-semibold">{{ l.beneficio }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Archivo</dt><dd class="text-sm font-semibold">{{ l.archivo }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Cargado el</dt><dd class="text-sm font-semibold">{{ l.fecha }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Códigos</dt><dd class="text-sm font-semibold">{{ l.total }} en total · {{ l.usados }} usados · {{ l.total - l.usados }} disponibles</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Uso</dt><dd class="text-sm font-semibold">{{ l.total ? ((l.usados / l.total) * 100).toFixed(0) : 0 }} %</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Vence</dt><dd class="text-sm font-semibold">{{ l.vence }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Estado</dt><dd><a-pill [tone]="estadoLote(l).tono">{{ estadoLote(l).texto }}</a-pill></dd></div>
        </dl>
        <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="img" [attr.aria-label]="'Uso del lote: ' + (l.total ? ((l.usados / l.total) * 100).toFixed(0) : 0) + ' %'"><div class="h-full bg-primary" [style.width.%]="l.total ? (l.usados / l.total) * 100 : 0"></div></div>
        <p class="mt-3 text-xs text-muted-foreground">Los códigos se entregan en orden de carga (el lote más antiguo vigente primero) y no se muestran aquí por seguridad.</p>
        <div class="det-pie"><button aBtn (click)="loteDetalle.set(null)">Cerrar</button></div>
      }
    </a-modal>
    <a-carga-masiva tipo="codigos" [abierto]="cargaCodigos()" (cerrado)="cargaCodigos.set(false)" (terminada)="recargarLotes()" />
  `,
})
export class BeneficiosAdminPage {
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  private readonly api = inject(ApiService);
  protected readonly input = INPUT_CLS;
  protected readonly usd = formatUSD;
  protected readonly tabs = [
    { k: 'lista', l: 'Beneficios' },
    { k: 'categorias', l: 'Categorías' },
    { k: 'cupones', l: 'Cupones y códigos' },
    { k: 'banners', l: 'Banners' },
  ] as const;

  protected readonly pag = new Paginado<BeneficioRow>(inject(ApiService), 'beneficios');
  protected readonly cats = signal<CategoriaEdit[]>([]);
  protected readonly lotes = signal<Lote[]>([]);
  protected readonly loteDetalle = signal<Lote | null>(null);
  protected readonly tab = signal<'lista' | 'categorias' | 'cupones' | 'banners'>('lista');
  protected readonly edit = signal<BeneficioRow | null>(null);
  protected readonly cargaMasiva = signal(false);
  /** Avisa antes de descartar si hay cambios sin guardar. */
  protected readonly sucio = usarSucio(() => this.edit());
  protected readonly editCat = signal<CategoriaEdit | null>(null);
  protected readonly cargaCodigos = signal(false);
  private readonly brand = inject(BrandService);
  /** Provincias oficiales del país (el beneficio puede limitarse a algunas). */
  protected readonly provinciasOpc = computed(() => this.brand.tenant().pais.provincias.map((p) => p.nombre));
  /** Muestra la lista de provincias aunque todavía no se haya marcado ninguna (al apagar «En todo el país»). */
  protected readonly elegirProvincias = signal(false);
  protected readonly errReglas = computed(() => {
    const e = this.edit();
    return e ? errorReglasBeneficio(e, this.provinciasOpc()) : '';
  });

  private readonly marcas = signal<string[]>([]);
  protected marcasOpc(actual: string) {
    const m = this.marcas();
    return actual && !m.includes(actual) ? [actual, ...m] : actual ? m : ['', ...m];
  }

  constructor() {
    this.pag.recargar();
    this.admin.lista<{ nombre: string }>('marcas').subscribe((m) => this.marcas.set(m.map((x) => x.nombre)));
    this.admin.lista<CategoriaEdit>('categoriasBeneficio').subscribe((c) => this.cats.set(c));
    this.admin.lista<Lote>('lotes').subscribe((l) => this.lotes.set(l));
    abrirDesdeUrl((id) => this.api.get<BeneficioRow>(`admin/c/beneficios/${id}`).subscribe((b) => this.edit.set(this.conRegla(b))));
  }

  /** Cada beneficio tiene su propia regla de cupón: al abrirlo siempre trae los tres valores (los que no tenía parten de 3 h, sin límite y 3 meses). */
  protected conRegla(b: BeneficioRow): BeneficioRow {
    return { ...b, cupon: { ...reglaDe(b.cupon, undefined) } };
  }
  protected reglaDe(b: BeneficioRow): ReglaCupon {
    return reglaDe(b.cupon, undefined);
  }
  /** Resumen corto para la lista: «24 h · 1 vez, espera 3 meses». */
  protected textoCupon(b: BeneficioRow): string {
    if (b.tipo === 'compra') return '—';
    const r = reglaDe(b.cupon, undefined);
    return r.limite <= 0 ? ` h · sin límite` : ` h ·  , espera  `;
  }

  /** "El cupón dura 24 horas. Se puede canjear 1 vez; para volver a hacerlo hay que esperar 3 meses desde el último canje." */
  protected resumenRegla(r: ReglaCupon): string {
    const horas = `El cupón dura ${r.horas} ${r.horas === 1 ? 'hora' : 'horas'}.`;
    if (r.limite <= 0) return `${horas} Se puede canjear sin límite.`;
    const veces = r.limite === 1 ? '1 vez' : `${r.limite} veces`;
    return `${horas} Cada participante puede canjearlo ${veces}; después debe esperar ${r.meses} ${r.meses === 1 ? 'mes' : 'meses'} desde su último canje para volver a hacerlo.`;
  }
  protected setRegla(p: Partial<ReglaCupon>) {
    this.edit.update((e) => (e ? { ...e, cupon: { ...reglaDe(e.cupon, undefined), ...p } } : e));
  }

  protected vigenciaPill(r: BeneficioRow) {
    return VIGENCIA_PILL[(r as any).vigencia as Vigencia] ?? VIGENCIA_PILL.vigente;
  }
  protected rangoVigencia(r: BeneficioRow): string {
    if (!r.desde && !r.hasta) return 'Sin fechas';
    return `${r.desde ? fechaLarga(r.desde) : '…'} – ${r.hasta ? fechaLarga(r.hasta) : '…'}`;
  }
  protected textoProvincias(r: BeneficioRow): string {
    const n = r.provincias?.length ?? 0;
    return n === 0 ? 'Todo el país' : n <= 2 ? r.provincias!.join(', ') : `${n} provincias`;
  }
  protected provinciaActiva(e: BeneficioRow, n: string) {
    return !!e.provincias?.includes(n);
  }
  protected alternarProvincia(n: string) {
    this.edit.update((e) => {
      if (!e) return e;
      const ya = e.provincias ?? [];
      return { ...e, provincias: ya.includes(n) ? ya.filter((x) => x !== n) : [...ya, n] };
    });
  }
  protected todoElPais(todo: boolean) {
    this.elegirProvincias.set(!todo);
    if (todo) this.setE({ provincias: [] });
  }

  protected tipoDe(b: Beneficio) {
    return b.tipo === 'compra' ? 'Con pago' : 'Gratis';
  }
  protected nuevo(): BeneficioRow {
    return {
      ...this.pag.items()[0]!,
      id: crypto.randomUUID(),
      nombre: '',
      marca: '',
      promoTipo: '',
      promoValor: undefined,
      promoDesde: '',
      promoHasta: '',
      etiqueta: '',
      etiquetaColor: 'marca',
      especificaciones: [],
      // Un beneficio nuevo parte sin reglas heredadas del primero de la lista.
      desde: undefined,
      hasta: undefined,
      modoCodigo: 'unico',
      codigoCompartido: undefined,
      usosMaximos: undefined,
      usos: 0,
      provincias: [],
      cupon: { horas: 3, limite: 0, meses: 3 },
    };
  }
  protected setE(p: Partial<BeneficioRow>) {
    this.edit.update((e) => (e ? { ...e, ...p } : e));
  }
  protected setCategoria(slug: string) {
    const c = this.cats().find((x) => x.slug === slug);
    this.setE({ categoriaSlug: slug, categoria: c?.label ?? slug });
  }
  private guardarItem(b: BeneficioRow, despues?: () => void) {
    this.api.put(`admin/c/beneficios/${b.id}`, b).subscribe({
      next: () => {
        this.pag.recargar();
        despues?.();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'No pudimos guardar el beneficio.'),
    });
  }
  protected toggle(id: string, activo: boolean) {
    const b = this.pag.items().find((x) => x.id === id);
    if (b) this.guardarItem({ ...b, activo });
  }
  protected guardar() {
    const e = this.edit();
    if (!e) return;
    this.guardarItem(limpiarListas(e), () => {
      this.edit.set(null);
      this.toast.show('Beneficio guardado');
    });
  }
  protected guardarCat(c: CategoriaEdit) {
    const orig = this.editCat();
    this.cats.update((x) =>
      orig?.label ? x.map((y) => (y.slug === orig.slug ? c : y)) : [...x, c],
    );
    this.admin.guardar('categoriasBeneficio', this.cats()).subscribe();
    this.editCat.set(null);
  }

  /** Lotes agrupados por beneficio y, dentro de cada uno, en el orden en que se usan (FIFO: el más antiguo primero). */
  protected readonly lotesOrdenados = computed(() =>
    [...this.lotes()].sort(
      (a, b) =>
        (a.beneficioId ?? '').localeCompare(b.beneficioId ?? '') ||
        a.fecha.localeCompare(b.fecha) ||
        (a.creadoEn ?? 0) - (b.creadoEn ?? 0),
    ),
  );
  /** "En uso" es el primer lote con códigos disponibles y vigente de su beneficio; los demás esperan su turno. */
  protected estadoLote(l: Lote): { texto: string; tono: 'ok' | 'warn' | 'bad' | 'muted' | 'info' } {
    const hoy = new Date().toISOString().slice(0, 10);
    if (l.vence < hoy) return { texto: 'Vencido', tono: 'bad' };
    if (l.usados >= l.total) return { texto: 'Agotado', tono: 'muted' };
    const enUso = this.lotesOrdenados().find((x) => x.beneficioId === l.beneficioId && x.vence >= hoy && x.usados < x.total);
    return enUso?.id === l.id ? { texto: 'En uso', tono: 'ok' } : { texto: 'En espera', tono: 'info' };
  }
  /** Al terminar una carga de códigos se vuelve a pedir la lista de lotes (la carga la hace el servidor). */
  protected recargarLotes() {
    this.admin.lista<Lote>('lotes').subscribe((l) => this.lotes.set(l));
  }
  protected readonly confirmarLote = signal<Lote | null>(null);
  protected desactivarLote(id: string) {
    this.lotes.update((x) => x.filter((y) => y.id !== id));
    this.admin.guardar('lotes', this.lotes()).subscribe();
    this.toast.show('Lote desactivado');
    this.confirmarLote.set(null);
  }
  protected hoyIso() {
    return new Date().toISOString().slice(0, 10);
  }
}
