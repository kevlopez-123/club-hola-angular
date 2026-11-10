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
import { formatPuntos, formatUSD } from '../core/format';
import { errorReglasBeneficio, fechaLarga, reglaDe, type ReglaCupon, type Vigencia } from '../core/cupones';
import { BrandService } from '../core/brand.service';
import { CargaMasivaComponent } from './carga-masiva';
import type { Beneficio, Ciudad, Destino, Producto, Slide } from '../core/models';
import { CatIconComponent, IconComponent } from '../shared/icon.component';
import { PromoFieldsComponent } from './promo-fields';
import type { PromoCampos } from '../core/promo';
import { ICONOS_CATEGORIA } from '../shared/iconos-categoria';
import { buscarAeropuertos, partesCoincidencia, type Aeropuerto } from './aeropuertos';
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
/* Modal de categoría (productos y beneficios)                         */
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
/* Productos                                                           */
/* ------------------------------------------------------------------ */
type ProductoRow = Producto & PromoCampos & {
  activo: boolean;
  destacado: boolean;
  /** Fecha de alta (ISO) y vistas de la ficha: alimentan las pestañas automáticas del Home. */
  creadoEn?: string;
  vistas?: number;
  fijarMasVistos?: boolean;
  fijarNovedad?: boolean;
  imagenes: string[];
  vigencia: string;
};

@Component({
  selector: 'a-productos-page',
  imports: [CargaMasivaComponent, PromoFieldsComponent, 
    LimpiarFiltrosComponent,
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header
      title="Catálogo de productos"
      [desc]="pag.total().toLocaleString('es') + ' productos · ' + cats().length + ' categorías'"
    >
      @if (tab() === 'productos') {
      <button aBtn variant="outline" (click)="cargaMasiva.set(true)"><app-icon name="Upload" class="h-4 w-4" /> Carga masiva</button>
      <button aBtn [disabled]="!pag.items().length" (click)="edit.set(nuevo())">
        <app-icon name="Plus" class="h-4 w-4" /> Nuevo producto
      </button>
      }
    </a-header>
    <a-carga-masiva tipo="productos" [abierto]="cargaMasiva()" (cerrado)="cargaMasiva.set(false)" (terminada)="pag.recargar()" />
    <div class="mb-4 flex flex-wrap gap-2">
      @for (t of tabs; track t.k) {
        <button aBtn [variant]="tab() === t.k ? 'primary' : 'outline'" (click)="tab.set(t.k)">
          {{ t.l }}
        </button>
      }
    </div>

    @if (tab() === 'productos') {
      <div class="adm-filtros">
        <div class="adm-busca">
          <app-icon
            name="Search"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          /><input
            [class]="input + ' pl-9'"
            placeholder="Buscar producto"
            aria-label="Buscar producto"
            (input)="pag.buscar($any($event.target).value)"
          />
        </div>
        <select aria-label="Categoría" [class]="input + ' w-auto'" (change)="pag.filtrar('categoria', $any($event.target).value)">
          <option value="">Todas las categorías</option>
          @for (c of cats(); track c.slug) {
            <option [value]="c.slug">{{ c.label }}</option>
          }
        </select>
      <app-limpiar-filtros [activo]="pag.activo()" (limpiar)="pag.limpiar()" />
      </div>
      <div class="adm-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Puntos</th>
              <th>Precio</th>
              <th>Activo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of pag.items(); track r.id) {
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    <img [src]="r.imagen" alt="" class="h-11 w-11 rounded-lg object-cover" />
                    <div>
                      <b>{{ r.nombre }}</b>
                      <p class="text-xs text-muted-foreground">{{ r.marca }}</p>
                    </div>
                  </div>
                </td>
                <td class="det-completo det-chip">
                  <a-pill [tone]="r.digital ? 'ok' : 'muted'">{{ r.digital ? 'Digital' : 'Físico' }}</a-pill>
                </td>
                <td>
                  {{ r.categoriaLabel
                  }}<span class="block text-xs text-muted-foreground">{{
                    r.subcategoriaLabel
                  }}</span>
                </td>
                <td>{{ puntos(r.puntos) }}</td>
                <td>{{ usd(r.precio) }}</td>
                <td>
                  <a-toggle label="Activo" [on]="r.activo" (onChange)="toggle(r.id, $event)" />
                </td>
                <td><button aBtn variant="ghost" (click)="edit.set({ ...r })">Editar</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <a-pager [p]="pag" />
    } @else if (tab() === 'banners') {
      <a-banners-editor [ubicaciones]="['Canjea']" />
    } @else {
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <button
          (click)="editCat.set({ slug: '', label: '', activo: true, subcategorias: [] })"
          class="grid min-h-32 place-items-center rounded-2xl border-2 border-dashed border-border font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
        >
          <span class="flex items-center gap-2"
            ><app-icon name="Plus" class="h-4 w-4" /> Nueva categoría</span
          >
        </button>
        @for (c of cats(); track c.slug) {
          <a-panel [title]="c.label">
            <div actions class="flex items-center gap-2">
              @if (!c.activo) {
                <a-pill tone="bad">Oculta</a-pill>
              }
              <button aBtn variant="ghost" (click)="editCat.set(c)">Editar</button>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (s of c.subcategorias; track s.slug) {
                <a-pill>{{ s.label }}</a-pill>
              } @empty {
                <span class="text-sm text-muted-foreground">Sin subcategorías</span>
              }
            </div>
          </a-panel>
        }
      </div>
    }

    <a-drawer [open]="!!edit()" [sucio]="sucio()" maxW="max-w-lg" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <a-drawer-title (closed)="edit.set(null)"
          ><h2 class="text-xl font-bold">{{ e.nombre || 'Nuevo producto' }}</h2></a-drawer-title
        >
        @if (intento() && listaErrores().length) {
          <div role="alert" class="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" data-resumen-errores>
            <b>Revisa {{ listaErrores().length }} campo(s):</b>
            <ul class="mt-1 list-disc pl-5">
              @for (m of listaErrores(); track m) { <li>{{ m }}</li> }
            </ul>
          </div>
        }
        <div class="space-y-4">
          <a-field label="Nombre" [requerido]="true" [error]="errores().nombre" [forzar]="intento()"
            ><input
              [class]="input"
              [value]="e.nombre"
              (input)="setE({ nombre: $any($event.target).value })"
          /></a-field>
          <a-field label="Marca"
            ><select [class]="input" aria-label="Marca" (change)="setE({ marca: $any($event.target).value })">
              @for (m of marcasOpc(e.marca); track m) {
                <option [selected]="m === e.marca">{{ m }}</option>
              }
            </select></a-field
          >
          <div class="grid grid-cols-2 gap-3">
            <a-field label="Puntos" [requerido]="true" [error]="errores().puntos" [forzar]="intento()"
              ><input
                [class]="input"
                type="number"
                [value]="e.puntos"
                (input)="setE({ puntos: +$any($event.target).value })"
            /></a-field>
            <a-field label="Precio US$" [requerido]="true" [error]="errores().precio" [forzar]="intento()"
              ><input
                [class]="input"
                type="number"
                [value]="e.precio"
                (input)="setE({ precio: +$any($event.target).value })"
            /></a-field>
          </div>
          <a-field label="Categoría"
            ><select [class]="input" aria-label="Categoría" (change)="setCategoriaProducto($any($event.target).value)">
              @for (c of cats(); track c.slug) {
                <option [value]="c.slug" [selected]="c.slug === e.categoria">{{ c.label }}</option>
              }
            </select></a-field
          >
          <a-field label="Subcategoría"
            ><select [class]="input" aria-label="Subcategoría" [disabled]="!subsDe(e.categoria).length" (change)="setSubcategoria($any($event.target).value)">
              <option value="" [selected]="!e.subcategoria">{{ subsDe(e.categoria).length ? 'Sin subcategoría' : 'Esta categoría no tiene subcategorías' }}</option>
              @for (s of subsDe(e.categoria); track s.slug) {
                <option [value]="s.slug" [selected]="s.slug === e.subcategoria">{{ s.label }}</option>
              }
            </select></a-field
          >
          <a-field label="Descripción">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="e.descripcion"
              (input)="setE({ descripcion: $any($event.target).value })"
            ></textarea>
          </a-field>
          <a-field label="Consideraciones (una por línea)">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="(e.consideraciones ?? []).join('\\n')"
              (input)="setE({ consideraciones: $any($event.target).value.split('\\n') })"
            ></textarea>
          </a-field>
          <a-field label="Especificaciones (una por línea)">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="(e.especificaciones ?? []).join('\\n')"
              (input)="setE({ especificaciones: $any($event.target).value.split('\\n') })"
            ></textarea>
          </a-field>
          <a-promo-fields [valor]="e" (cambio)="setE($event)" />          <a-field label="Imágenes (la primera es la principal)"
            ><a-image-upload
              [multiple]="true"
              [value]="e.imagenes"
              (valueChange)="setE({ imagenes: $event, imagen: $event[0] || e.imagen })"
              [minAncho]="800" [minAlto]="800" hint="JPG/PNG 1:1 · 1200×1200 px"
          /></a-field>
          <a-field label="Vigente hasta"
            ><input
              type="date"
              [class]="input"
              [value]="e.vigencia"
              (input)="setE({ vigencia: $any($event.target).value })"
          /></a-field>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Producto digital (envío por correo)</span
            ><a-toggle label="Digital" [on]="e.digital" (onChange)="setE({ digital: $event })" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Destacado en Home</span
            ><a-toggle
              label="Destacado"
              [on]="e.destacado"
              (onChange)="setE({ destacado: $event })"
            />
          </div>
          <div class="rounded-xl border border-border p-3">
            <p class="text-sm font-semibold">Pestañas del Home</p>
            <p class="mt-1 text-xs text-muted-foreground">
              <b>Más vistos</b> y <b>Novedades</b> se arman solas: por visitas a la ficha y por fecha de alta
              ({{ e.vistas ?? 0 }} vistas · alta {{ e.creadoEn || 'sin fecha' }}). Fíjalo para que salga siempre al principio.
            </p>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-sm font-medium">Fijar en Más vistos</span
              ><a-toggle label="Fijar en Más vistos" [on]="!!e.fijarMasVistos" (onChange)="setE({ fijarMasVistos: $event })" />
            </div>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-sm font-medium">Fijar en Novedades</span
              ><a-toggle label="Fijar en Novedades" [on]="!!e.fijarNovedad" (onChange)="setE({ fijarNovedad: $event })" />
            </div>
          </div>
          <button aBtn class="w-full" (click)="guardar()">Guardar producto</button>
        </div>
      }
    </a-drawer>

    <a-category-modal
      [value]="editCat()"
      (closed)="editCat.set(null)"
      (saved)="guardarCat($event)"
    />
  `,
})
export class ProductosAdminPage {
  private readonly admin = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  protected readonly tabs = [
    { k: 'productos', l: 'Productos' },
    { k: 'categorias', l: 'Categorías y subcategorías' },
    { k: 'banners', l: 'Banners' },
  ] as const;

  private readonly api = inject(ApiService);
  protected readonly pag = new Paginado<ProductoRow>(inject(ApiService), 'productos');
  protected readonly cats = signal<CategoriaEdit[]>([]);
  protected readonly tab = signal<'productos' | 'categorias' | 'banners'>('productos');
  protected readonly edit = signal<ProductoRow | null>(null);
  protected readonly cargaMasiva = signal(false);
  /** Avisa antes de descartar si hay cambios sin guardar. */
  protected readonly sucio = usarSucio(() => this.edit());
  protected readonly editCat = signal<CategoriaEdit | null>(null);
  protected readonly intento = signal(false);
  protected readonly errores = computed(() => {
    const e = this.edit();
    return {
      nombre: e && !e.nombre.trim() ? 'Escribe el nombre del producto.' : '',
      puntos: e && !(e.puntos > 0) ? 'Los puntos deben ser mayores que 0.' : '',
      precio: e && !(e.precio >= 0) ? 'El precio no puede ser negativo.' : '',
    };
  });
  protected readonly listaErrores = computed(() => Object.values(this.errores()).filter(Boolean));
  private readonly _reset = effect(() => {
    if (!this.edit()) this.intento.set(false);
  });

  private readonly marcas = signal<string[]>([]);
  /** Marcas administradas en Admin → Marcas (más la actual del producto, aunque ya no exista). */
  protected marcasOpc(actual: string) {
    const m = this.marcas();
    return actual && !m.includes(actual) ? [actual, ...m] : actual ? m : ['', ...m];
  }

  constructor() {
    this.pag.recargar();
    this.admin.lista<CategoriaEdit>('categoriasProducto').subscribe((c) => this.cats.set(c));
    this.admin.lista<{ nombre: string }>('marcas').subscribe((m) => this.marcas.set(m.map((x) => x.nombre)));
    const api = inject(ApiService);
    abrirDesdeUrl((id) => api.get<ProductoRow>(`admin/c/productos/${id}`).subscribe((p) => this.edit.set({ ...p })));
  }

  protected nuevo(): ProductoRow {
    const base = this.pag.items()[0]!;
    return {
      ...base,
      id: crypto.randomUUID(),
      nombre: '',
      marca: '',
      puntos: 0,
      precio: 0,
      descripcion: '',
      activo: true,
      promoTipo: '',
      promoValor: undefined,
      promoDesde: '',
      promoHasta: '',
      etiqueta: '',
      etiquetaColor: 'marca',
      consideraciones: [],
      especificaciones: [],
      destacado: false,
      creadoEn: new Date().toISOString().slice(0, 10),
      vistas: 0,
      fijarMasVistos: false,
      fijarNovedad: false,
      imagenes: [],
      vigencia: '',
    };
  }
  /** Subcategorías que ofrece la categoría elegida (se administran en la pestaña Categorías y subcategorías). */
  protected subsDe(slug: string) {
    return this.cats().find((c) => c.slug === slug)?.subcategorias ?? [];
  }
  /** Al cambiar de categoría se limpia la subcategoría, porque pertenece a la anterior. */
  protected setCategoriaProducto(slug: string) {
    const c = this.cats().find((x) => x.slug === slug);
    this.setE({ categoria: slug, categoriaLabel: c?.label ?? slug, subcategoria: "", subcategoriaLabel: "" });
  }
  protected setSubcategoria(slug: string) {
    const s = this.subsDe(this.edit()?.categoria ?? "").find((x) => x.slug === slug);
    this.setE({ subcategoria: s?.slug ?? "", subcategoriaLabel: s?.label ?? "" });
  }
  protected setE(p: Partial<ProductoRow>) {
    this.edit.update((e) => (e ? { ...e, ...p } : e));
  }
  private guardarItem(p: ProductoRow, despues?: () => void) {
    this.api.put(`admin/c/productos/${p.id}`, p).subscribe(() => {
      this.pag.recargar();
      despues?.();
    });
  }
  protected toggle(id: string, activo: boolean) {
    const p = this.pag.items().find((x) => x.id === id);
    if (p) this.guardarItem({ ...p, activo });
  }
  protected guardar() {
    const e = this.edit();
    if (!e) return;
    if (this.listaErrores().length) {
      this.intento.set(true);
      setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }
    this.guardarItem(limpiarListas(e), () => {
      this.edit.set(null);
      this.toast.show('Producto guardado');
    });
  }
  protected guardarCat(c: CategoriaEdit) {
    const orig = this.editCat();
    this.cats.update((x) =>
      orig?.label ? x.map((y) => (y.slug === orig.slug ? c : y)) : [...x, c],
    );
    this.admin.guardar('categoriasProducto', this.cats()).subscribe();
    this.editCat.set(null);
    this.toast.show('Categoría guardada');
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
                    <a-pill [tone]="r.soloDinero ? 'warn' : 'muted'">{{ tipoDe(r) }}</a-pill>
                  </td>
                  <td class="det-chip">
                    <a-pill [tone]="vigenciaPill(r).t">{{ vigenciaPill(r).l }}</a-pill>
                    <p class="mt-1 text-xs text-muted-foreground">{{ rangoVigencia(r) }}</p>
                  </td>
                  <td class="text-sm">{{ textoProvincias(r) }}</td>
                  <td>{{ r.categoria }}</td>
                  <td>{{ r.descuento }}</td>
                  <td>
                    {{ r.precio ? usd(r.precio) : r.puntos ? puntos(r.puntos) + ' pts' : '—' }}
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
                  <td><button aBtn variant="ghost" (click)="edit.set({ ...r })">Editar</button></td>
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
          <a-panel title="Regla general del cupón">
            <p class="mb-3 text-sm text-muted-foreground">Se aplica a todos los beneficios que no tengan una regla propia (se define al editar cada beneficio).</p>
            <div class="grid gap-3 sm:grid-cols-3">
              <a-field label="Dura (horas)"
                ><input [class]="input" type="number" min="1" max="720" [value]="general().horas" (input)="setGeneral({ horas: +$any($event.target).value })"
              /></a-field>
              <a-field label="Se puede canjear (veces)"
                ><input [class]="input" type="number" min="0" max="99" [value]="general().limite" (input)="setGeneral({ limite: +$any($event.target).value })"
              /></a-field>
              <a-field label="Espera para volver a canjear (meses)"
                ><input [class]="input" type="number" min="1" max="60" [value]="general().meses" (input)="setGeneral({ meses: +$any($event.target).value })"
              /></a-field>
            </div>
            <p class="mt-3 rounded-xl bg-muted/60 p-3 text-sm" aria-live="polite">{{ resumenRegla(general()) }}</p>
            @if (errGeneral()) { <p role="alert" class="mt-2 text-xs font-medium text-destructive">{{ errGeneral() }}</p> }
            <button aBtn class="mt-4" [disabled]="!!errGeneral()" (click)="guardarGeneral()">Guardar</button>
            <p class="mt-2 text-xs text-muted-foreground">
              Aplica a los cupones que se generen desde ahora. «Se puede canjear» en 0 significa sin límite. La espera cuenta desde el último canje.
            </p>
          </a-panel>
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
            <a-field label="Puntos"
              ><input
                [class]="input"
                type="number"
                [value]="e.puntos ?? 0"
                (input)="setE({ puntos: +$any($event.target).value })"
            /></a-field>
            <a-field label="Precio US$"
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

              <div class="mt-4 flex items-center justify-between gap-3">
                <span class="text-sm font-medium">Usar la regla general del programa</span>
                <a-toggle label="Usar la regla general" [on]="!e.cupon" (onChange)="usarReglaGeneral($event)" />
              </div>
              @if (e.cupon) {
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  <a-field label="Dura (horas)">
                    <input [class]="input" type="number" min="1" max="720" [value]="e.cupon.horas ?? general().horas" (input)="setRegla({ horas: +$any($event.target).value })" />
                  </a-field>
                  <a-field label="Se puede canjear (veces)">
                    <input [class]="input" type="number" min="0" max="99" [value]="e.cupon.limite ?? general().limite" (input)="setRegla({ limite: +$any($event.target).value })" />
                  </a-field>
                  <a-field label="Espera (meses)">
                    <input [class]="input" type="number" min="1" max="60" [value]="e.cupon.meses ?? general().meses" (input)="setRegla({ meses: +$any($event.target).value })" />
                  </a-field>
                </div>
              }
              <p class="mt-3 rounded-xl bg-muted/60 p-3 text-sm" aria-live="polite">{{ resumenRegla(reglaEfectiva(e)) }}</p>
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
            <span class="text-sm font-medium">Solo se paga con dinero</span
            ><a-toggle
              label="Solo dinero"
              [on]="!!e.soloDinero"
              (onChange)="setE({ soloDinero: $event })"
            />
          </div>
          <div class="flex items-center justify-between">
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
  protected readonly puntos = formatPuntos;
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
  /** Regla general del cupón (Cupones y códigos): la que usan los beneficios sin regla propia. */
  protected readonly general = signal<ReglaCupon>({ horas: 3, limite: 0, meses: 3 });
  protected readonly errGeneral = computed(() => errorReglasBeneficio({ cupon: this.general() }));
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
    abrirDesdeUrl((id) => this.api.get<BeneficioRow>(`admin/c/beneficios/${id}`).subscribe((b) => this.edit.set({ ...b })));
    this.api
      .get<{ cupon: Partial<ReglaCupon> }>('config')
      .subscribe((c) => this.general.set(reglaDe(undefined, c.cupon)));
  }

  protected setGeneral(p: Partial<ReglaCupon>) {
    this.general.update((g) => ({ ...g, ...p }));
  }
  protected guardarGeneral() {
    this.api.put('admin/config', { cupon: this.general() }).subscribe({
      next: () => this.toast.show('Regla general del cupón actualizada'),
      error: (e) => this.toast.error(e?.error?.message ?? 'No pudimos guardar la regla.'),
    });
  }

  /** "El cupón dura 24 horas. Se puede canjear 1 vez; para volver a hacerlo hay que esperar 3 meses desde el último canje." */
  protected resumenRegla(r: ReglaCupon): string {
    const horas = `El cupón dura ${r.horas} ${r.horas === 1 ? 'hora' : 'horas'}.`;
    if (r.limite <= 0) return `${horas} Se puede canjear sin límite.`;
    const veces = r.limite === 1 ? '1 vez' : `${r.limite} veces`;
    return `${horas} Cada participante puede canjearlo ${veces}; después debe esperar ${r.meses} ${r.meses === 1 ? 'mes' : 'meses'} desde su último canje para volver a hacerlo.`;
  }
  protected reglaEfectiva(e: BeneficioRow): ReglaCupon {
    return reglaDe(e.cupon, this.general());
  }
  protected usarReglaGeneral(usar: boolean) {
    this.setE({ cupon: usar ? undefined : { ...this.general() } });
  }
  protected setRegla(p: Partial<ReglaCupon>) {
    this.edit.update((e) => (e ? { ...e, cupon: { ...(e.cupon ?? {}), ...p } } : e));
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
    return b.soloDinero
      ? 'Solo dinero'
      : b.tipo === 'compra'
        ? 'Con puntos'
        : b.puntos
          ? 'Con puntos'
          : 'Gratis';
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
      cupon: undefined,
      modoCodigo: 'unico',
      codigoCompartido: undefined,
      usosMaximos: undefined,
      usos: 0,
      provincias: [],
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

/* ------------------------------------------------------------------ */
/* Destinos                                                            */
/* ------------------------------------------------------------------ */
type DestinoRow = Destino & { destacado: boolean; activo: boolean; galeria: string[] };
type CiudadRow = Ciudad & { activo: boolean };
type BannerVuelo = Slide & { activo: boolean };

@Component({
  selector: 'a-destinos-page',
  imports: [OrdenColumnaComponent, 
    IconComponent,
    PageHeaderComponent,
    BtnDirective,
    FieldComponent,
    ToggleComponent,
    PanelComponent,
    ImageUploadComponent,
    DrawerComponent,
    DrawerTitleComponent,
    AdminModalComponent,
    ConfirmComponent,
    PagerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Catálogo de destinos" desc="Destinos recomendados que se muestran en Vuelos.">
      @if (tab() === 'destinos') {
      <button aBtn [disabled]="!pagDest.items().length" (click)="edit.set(nuevo())">
        <app-icon name="Plus" class="h-4 w-4" /> Nuevo destino
      </button>
      }
    </a-header>
    <div class="mb-4 flex flex-wrap gap-2">
      @for (t of tabs; track t.k) {
        <button aBtn [variant]="tab() === t.k ? 'primary' : 'outline'" (click)="tab.set(t.k)">
          {{ t.l }}
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('destinos') {
        <div class="adm-filtros"><div class="adm-busca">
          <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Buscar destino" [class]="input + ' pl-9'" placeholder="Buscar destino, ciudad o país" (input)="pagDest.buscar($any($event.target).value)" />
        </div></div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (d of pagDest.items(); track d.slug) {
            <article class="overflow-hidden rounded-2xl border border-border bg-card">
              <img [src]="d.imagen" [alt]="d.ciudad" class="aspect-[16/10] w-full object-cover" />
              <div class="p-4">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <h3 class="font-bold">{{ d.titulo }}</h3>
                    <p class="text-sm text-muted-foreground">
                      {{ d.ciudad }}, {{ d.pais }} · desde {{ usd(d.desdeUSD) }}
                    </p>
                  </div>
                  <a-toggle
                    label="Activo"
                    [on]="d.activo"
                    (onChange)="toggleDestino(d.slug, $event)"
                  />
                </div>
                <button aBtn variant="outline" class="mt-3 w-full" (click)="edit.set({ ...d })">
                  Editar
                </button>
              </div>
            </article>
          }
        </div>
        <a-pager [p]="pagDest" />
      }
      @case ('ciudades') {
        <div class="adm-filtros"><div class="adm-busca">
          <app-icon name="Search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Buscar ciudad" [class]="input + ' pl-9'" placeholder="Buscar por ciudad, IATA o país" (input)="pagCiu.buscar($any($event.target).value)" />
        </div></div>
        <div class="mb-3 flex justify-end">
          <button
            aBtn
            (click)="
              abrirNuevaCiudad()
            "
          >
            <app-icon name="Plus" class="h-4 w-4" /> Nueva ciudad
          </button>
        </div>
        <div class="adm-wrap">
          <table class="adm-table adm-compacta">
            <thead>
              <tr>
                <th aOrden="codigo" [pag]="pagCiu" etiquetaOrden="Código IATA">Código IATA</th>
                <th aOrden="ciudad" [pag]="pagCiu" etiquetaOrden="Ciudad">Ciudad</th>
                <th aOrden="pais" [pag]="pagCiu" etiquetaOrden="País">País</th>
                <th>En buscador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of pagCiu.items(); track r.codigo) {
                <tr>
                  <td>
                    <b>{{ r.codigo }}</b>
                  </td>
                  <td>{{ r.ciudad }}</td>
                  <td>{{ r.pais }}</td>
                  <td>
                    <a-toggle
                      label="En buscador"
                      [on]="r.activo"
                      (onChange)="toggleCiudad(r.codigo, $event)"
                    />
                  </td>
                  <td>
                    <div class="flex gap-1">
                      <button type="button" data-compact class="adm-accion adm-accion-icono" [attr.aria-label]="'Editar ' + r.ciudad" [title]="'Editar ' + r.ciudad" (click)="abrirEditarCiudad(r)"><app-icon name="Pencil" class="h-4 w-4" /></button><button type="button" data-compact class="adm-accion adm-accion-icono peligro" [attr.aria-label]="'Eliminar ' + r.ciudad" [title]="'Eliminar ' + r.ciudad" (click)="borrarC.set(r)"><app-icon name="Trash2" class="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <a-pager [p]="pagCiu" />
      }
      @case ('banners') {
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Tamaño recomendado: 1920×640 px (3:1)</span
          ><button aBtn (click)="nuevoB.set({ alt: '', img: [], imgMovil: [] })">
            <app-icon name="Plus" class="h-4 w-4" /> Nuevo banner
          </button>
        </div>
        <div class="grid gap-6 md:grid-cols-2">
          @for (s of banners(); track s.id; let i = $index) {
            <a-panel>
              <img
                [src]="s.imagen"
                [alt]="s.alt"
                class="aspect-[3/1] w-full rounded-xl object-cover"
              />
              <div class="mt-3 flex items-center justify-between gap-2">
                <p class="min-w-0 truncate font-semibold">{{ s.alt }}</p>
                <a-toggle label="Activo" [on]="s.activo" (onChange)="toggleBanner(s.id, $event)" />
              </div>
                          <div class="mt-3 flex gap-1">
                <button type="button" aria-label="Mover antes" [disabled]="i === 0" (click)="moverBanner(s.id, -1)" class="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-40"><app-icon name="ArrowUp" class="h-4 w-4" /></button>
                <button type="button" aria-label="Mover después" [disabled]="i === banners().length - 1" (click)="moverBanner(s.id, 1)" class="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-40"><app-icon name="ArrowDown" class="h-4 w-4" /></button>
                <span class="ml-2 self-center text-sm text-muted-foreground">Posición {{ i + 1 }}</span>
                <button aBtn variant="ghost" class="ml-auto" (click)="nuevoB.set({ id: s.id, alt: s.alt, img: [s.imagen], imgMovil: s.imagenMovil ? [s.imagenMovil] : [] })">Editar</button>
                <button aBtn variant="peligro-ghost" (click)="borrarB.set(s)"><app-icon name="Trash2" class="h-4 w-4" /> Eliminar</button>
              </div>            </a-panel>
          }
        </div>
      }
    }

    <a-modal
      [open]="!!editC()"
      [title]="editC()?.orig ? 'Editar ' + editC()!.c.ciudad : 'Nueva ciudad'"
      (closed)="editC.set(null)"
    >
      @if (editC(); as e) {
        <div class="space-y-4">
          @if (e.c.codigo && !eligiendoIata()) {
            <div class="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <span class="grid h-12 min-w-14 place-items-center rounded-lg bg-primary px-2 text-lg font-extrabold text-primary-foreground">{{ e.c.codigo }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ e.c.ciudad }}</p>
                <p class="truncate text-sm text-muted-foreground">{{ e.c.pais }}</p>
              </div>
              <button aBtn variant="outline" (click)="eligiendoIata.set(true)">Cambiar</button>
            </div>
            <p class="text-xs text-muted-foreground">Código, ciudad y país vienen de la lista oficial de aeropuertos (códigos IATA); no se escriben a mano.</p>
          } @else {
            <div class="relative">
              <label class="mb-1.5 block text-sm font-medium" for="busca-iata">Ciudad o aeropuerto</label>
              <input id="busca-iata" type="text" role="combobox" autocomplete="off" [class]="input"
                aria-autocomplete="list" aria-controls="lista-iata" [attr.aria-expanded]="abrirIata()"
                [attr.aria-activedescendant]="abrirIata() && resultadosIata()[activoIata()] ? 'iata-' + resultadosIata()[activoIata()]!.codigo : null"
                placeholder="Escribe una ciudad, un país o un código IATA"
                [value]="buscaIata()" (focus)="abrirIata.set(true)" (blur)="abrirIata.set(false)"
                (input)="buscaIata.set($any($event.target).value); activoIata.set(0); abrirIata.set(true)" (keydown)="teclaIata($event)" />
              @if (abrirIata()) {
                <ul id="lista-iata" role="listbox" aria-label="Ciudades disponibles"
                  class="mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card p-1">
                  @for (a of resultadosIata(); track a.codigo; let i = $index) {
                    <li role="option" [id]="'iata-' + a.codigo" [attr.aria-selected]="i === activoIata()">
                      <button type="button" data-compact tabindex="-1" (mousedown)="$event.preventDefault()" (click)="elegirAeropuerto(a)" (mouseenter)="activoIata.set(i)"
                        [class]="'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ' + (i === activoIata() ? 'bg-muted' : '')">
                        <span class="grid h-9 min-w-12 place-items-center rounded-md bg-primary/10 px-1.5 text-sm font-extrabold text-primary">{{ a.codigo }}</span>
                        <span class="min-w-0 flex-1">
                          <span class="block truncate text-sm font-semibold" [innerHTML]="resaltarIata(a.ciudad)"></span>
                          <span class="block truncate text-xs text-muted-foreground" [innerHTML]="resaltarIata(a.pais)"></span>
                        </span>
                      </button>
                    </li>
                  } @empty {
                    <li class="px-3 py-3 text-sm text-muted-foreground" role="presentation">
                      @if (buscaIata().trim()) { No hay ciudades disponibles que coincidan. Puede que ya estén agregadas. } @else { Ya agregaste todas las ciudades de la lista. }
                    </li>
                  }
                </ul>
              }
              <p class="mt-1.5 text-xs text-muted-foreground">Solo aparecen las ciudades que aún no están en el buscador. Los datos vienen de la lista oficial de códigos IATA.</p>
            </div>
          }
          @if (iataDup()) {
            <p class="text-sm text-destructive">Ya existe una ciudad con ese código IATA.</p>
          }
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="editC.set(null)">Cancelar</button>
            <button
              aBtn
              [disabled]="e.c.codigo.length !== 3 || !e.c.ciudad || !e.c.pais || iataDup()"
              (click)="guardarCiudad()"
            >
              Guardar
            </button>
          </div>
        </div>
      }
    </a-modal>
    <a-confirm
      [open]="!!borrarC()"
      [danger]="true"
      title="¿Eliminar ciudad?"
      confirmLabel="Eliminar"
      (closed)="borrarC.set(null)"
      (confirmed)="eliminarCiudad()"
    >
      Se quitará
      <b class="text-foreground">{{ borrarC()?.ciudad }} ({{ borrarC()?.codigo }})</b> del buscador
      de vuelos.
    </a-confirm>
    <a-confirm [open]="!!borrarB()" [danger]="true" title="¿Eliminar banner?" confirmLabel="Eliminar" (closed)="borrarB.set(null)" (confirmed)="eliminarBanner()">
      Se eliminará «{{ borrarB()?.alt }}» del carrusel de Vuelos y no se puede deshacer. Si solo quieres ocultarlo, desactívalo con el interruptor.
    </a-confirm>
    <a-modal [open]="!!nuevoB()" [title]="nuevoB()?.id ? 'Editar banner de vuelos' : 'Nuevo banner de vuelos'" (closed)="nuevoB.set(null)">
      @if (nuevoB(); as n) {
        <div class="space-y-4">
          <a-field label="Imagen para escritorio">
            <a-image-upload
              aspect="aspect-[3/1]"
              [value]="n.img"
              (valueChange)="nuevoB.set({ ...n, img: $event })"
              [minAncho]="1440" [minAlto]="480" hint="JPG 3:1 · 1920×640 px"
            />
          </a-field>
          <a-field label="Imagen para móvil (opcional)">
            <a-image-upload
              aspect="aspect-square"
              [value]="n.imgMovil"
              (valueChange)="nuevoB.set({ ...n, imgMovil: $event })"
              [minAncho]="720" [minAlto]="720" hint="JPG 1080×1080 px (1:1). En celulares se usa esta; si no la subes, se usa la de escritorio."
            />
          </a-field>
          <a-field label="Texto alternativo"
            ><input
              [class]="input"
              [value]="n.alt"
              (input)="nuevoB.set({ ...n, alt: $any($event.target).value })"
          /></a-field>
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="nuevoB.set(null)">Cancelar</button
            ><button aBtn [disabled]="!n.img.length || !n.alt" (click)="crearBanner(n)">
              {{ n.id ? 'Guardar cambios' : 'Crear banner' }}
            </button>
          </div>
        </div>
      }
    </a-modal>

    <a-drawer [open]="!!edit()" [sucio]="sucio()" maxW="max-w-lg" (closed)="edit.set(null)">
      @if (edit(); as e) {
        <a-drawer-title (closed)="edit.set(null)"
          ><h2 class="text-xl font-bold">{{ e.titulo || 'Nuevo destino' }}</h2></a-drawer-title
        >
        <div class="space-y-4">
          <a-field label="Título"
            ><input
              [class]="input"
              [value]="e.titulo"
              (input)="setE({ titulo: $any($event.target).value })"
          /></a-field>
          <div class="grid grid-cols-3 gap-3">
            <a-field label="Ciudad"
              ><input
                [class]="input"
                [value]="e.ciudad"
                (input)="setE({ ciudad: $any($event.target).value })"
            /></a-field>
            <a-field label="País"
              ><input
                [class]="input"
                [value]="e.pais"
                (input)="setE({ pais: $any($event.target).value })"
            /></a-field>
            <a-field label="IATA"
              ><input
                [class]="input"
                [value]="e.codigo"
                (input)="setE({ codigo: $any($event.target).value })"
            /></a-field>
            <a-field label="Desde US$"
              ><input
                [class]="input"
                type="number"
                [value]="e.desdeUSD"
                (input)="setE({ desdeUSD: +$any($event.target).value })"
            /></a-field>
            <a-field label="Duración"
              ><input
                [class]="input"
                [value]="e.duracion"
                (input)="setE({ duracion: $any($event.target).value })"
            /></a-field>
            <a-field label="Mejor época"
              ><input
                [class]="input"
                [value]="e.mejorEpoca"
                (input)="setE({ mejorEpoca: $any($event.target).value })"
            /></a-field>
          </div>
          <a-field label="Resumen"
            ><input
              [class]="input"
              [value]="e.resumen"
              (input)="setE({ resumen: $any($event.target).value })"
          /></a-field>
          <a-field label="Descripción">
            <textarea
              [class]="input + ' h-28 py-2'"
              [value]="e.descripcion"
              (input)="setE({ descripcion: $any($event.target).value })"
            ></textarea>
          </a-field>
          <a-field label="Imperdibles (uno por línea)">
            <textarea
              [class]="input + ' h-24 py-2'"
              [value]="e.highlights.join('\\n')"
              (input)="setE({ highlights: $any($event.target).value.split('\\n') })"
            ></textarea>
          </a-field>
          <a-field label="Galería (la primera es la portada)"
            ><a-image-upload
              [multiple]="true"
              aspect="aspect-[16/10]"
              [value]="e.galeria"
              (valueChange)="setE({ galeria: $event, imagen: $event[0] || e.imagen })"
              [minAncho]="1280" [minAlto]="720" hint="JPG 16:9 · 1600×900 px"
          /></a-field>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Destacado</span
            ><a-toggle
              label="Destacado"
              [on]="e.destacado"
              (onChange)="setE({ destacado: $event })"
            />
          </div>
          <button aBtn class="w-full" (click)="guardar()">Guardar destino</button>
        </div>
      }
    </a-drawer>
  `,
})
export class DestinosAdminPage {
  private readonly admin = inject(AdminApi);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly usd = formatUSD;
  protected readonly tabs = [
    { k: 'destinos', l: 'Destinos' },
    { k: 'ciudades', l: 'Ciudades del buscador' },
    { k: 'banners', l: 'Banners de vuelos' },
  ] as const;

  private readonly api = inject(ApiService);
  protected readonly pagDest = new Paginado<DestinoRow>(inject(ApiService), 'destinos', 12);
  protected readonly pagCiu = new Paginado<CiudadRow>(inject(ApiService), 'ciudades');
  protected readonly banners = signal<BannerVuelo[]>([]);
  protected readonly tab = signal<'destinos' | 'ciudades' | 'banners'>('destinos');
  protected readonly edit = signal<DestinoRow | null>(null);
  /** Avisa antes de descartar si hay cambios sin guardar. */
  protected readonly sucio = usarSucio(() => this.edit());
  protected readonly editC = signal<{ orig: string | null; c: CiudadRow } | null>(null);
  protected readonly borrarC = signal<CiudadRow | null>(null);
  protected readonly borrarB = signal<BannerVuelo | null>(null);
  protected readonly nuevoB = signal<{ id?: string; alt: string; img: string[]; imgMovil: string[] } | null>(null);
  /** Ya existe en la página visible o la consulta al servidor confirmó que existe. */
  protected readonly iataExiste = signal('');
  protected readonly iataDup = computed(() => {
    const e = this.editC();
    if (!e) return false;
    const cod = e.c.codigo.toUpperCase();
    return !!cod && cod !== e.orig && (this.pagCiu.items().some((x) => x.codigo === cod) || this.iataExiste() === cod);
  });

  constructor() {
    this.pagDest.recargar();
    this.pagCiu.sort.set('ciudad');
    this.pagCiu.recargar();
    this.admin.lista<BannerVuelo>('bannersVuelos').subscribe((r) => this.banners.set(r));
  }

  protected nuevo(): DestinoRow {
    return { ...this.pagDest.items()[0]!, slug: crypto.randomUUID(), ciudad: '', titulo: '', resumen: '' };
  }
  protected setE(p: Partial<DestinoRow>) {
    this.edit.update((e) => (e ? { ...e, ...p } : e));
  }
  /** La ciudad se elige de la lista oficial de aeropuertos (IATA): no se escribe código, ciudad ni país a mano. */
  protected readonly eligiendoIata = signal(false);
  protected readonly buscaIata = signal('');
  protected readonly abrirIata = signal(false);
  protected readonly activoIata = signal(0);
  /** Códigos que ya están en el buscador (todos, no solo los de la página visible). */
  private readonly codigosAgregados = signal<string[]>([]);
  /** Solo las ciudades disponibles: las ya agregadas no se ofrecen. */
  protected readonly resultadosIata = computed(() => buscarAeropuertos(this.buscaIata(), this.codigosAgregados(), 8));
  /** Texto con la coincidencia resaltada (se escapa el HTML antes de marcar). */
  protected resaltarIata(texto: string) {
    const e = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return partesCoincidencia(texto, this.buscaIata()).map((p) => (p.m ? `<mark class="rounded bg-primary/20 text-inherit">${e(p.t)}</mark>` : e(p.t))).join('');
  }
  protected teclaIata(e: KeyboardEvent) {
    const n = this.resultadosIata().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.abrirIata()) this.abrirIata.set(true);
      else if (n) this.activoIata.update((i) => (i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter') {
      const a = this.resultadosIata()[this.activoIata()];
      if (this.abrirIata() && a) {
        e.preventDefault();
        this.elegirAeropuerto(a);
      }
    } else if (e.key === 'Escape' && this.abrirIata()) {
      e.stopPropagation();
      this.abrirIata.set(false);
    }
  }
  private cargarCodigos() {
    this.api.get<CiudadRow[]>('admin/c/ciudades').subscribe((l) => this.codigosAgregados.set(l.map((c) => c.codigo)));
  }  protected abrirNuevaCiudad() {
    this.cargarCodigos();
    this.buscaIata.set('');
    this.activoIata.set(0);
    this.eligiendoIata.set(true);
    this.editC.set({ orig: null, c: { codigo: '', ciudad: '', pais: '', activo: true } });
  }
  protected abrirEditarCiudad(r: CiudadRow) {
    this.cargarCodigos();
    this.buscaIata.set('');
    this.eligiendoIata.set(false);
    this.editC.set({ orig: r.codigo, c: { ...r } });
  }
  protected elegirAeropuerto(a: Aeropuerto) {
    this.setC({ codigo: a.codigo, ciudad: a.ciudad, pais: a.pais });
    this.eligiendoIata.set(false);
  }
  protected setC(p: Partial<CiudadRow>) {
    this.editC.update((e) => (e ? { ...e, c: { ...e.c, ...p } } : e));
  }
  protected toggleDestino(slug: string, activo: boolean) {
    const d = this.pagDest.items().find((r) => r.slug === slug);
    if (d) this.api.put(`admin/c/destinos/${slug}`, { ...d, activo }).subscribe(() => this.pagDest.recargar());
  }
  protected guardar() {
    const e = this.edit();
    if (!e) return;
    this.api.put(`admin/c/destinos/${e.slug}`, e).subscribe(() => {
      this.pagDest.recargar();
      this.edit.set(null);
      this.toast.show('Destino guardado');
    });
  }
  protected toggleCiudad(codigo: string, activo: boolean) {
    const c = this.pagCiu.items().find((y) => y.codigo === codigo);
    if (c) this.api.put(`admin/c/ciudades/${codigo}`, { ...c, activo }).subscribe(() => this.pagCiu.recargar());
  }
  protected guardarCiudad() {
    const e = this.editC();
    if (!e) return;
    const c = { ...e.c, codigo: e.c.codigo.toUpperCase() };
    const terminar = () => {
      this.pagCiu.recargar();
      this.editC.set(null);
      this.toast.show('Ciudad guardada');
    };
    const guardar = () => this.api.put(`admin/c/ciudades/${c.codigo}`, c).subscribe(terminar);
    // El código es la clave: si cambió se elimina el anterior; si es nuevo se confirma en el servidor que no exista.
    if (e.orig && e.orig !== c.codigo) this.api.delete(`admin/c/ciudades/${e.orig}`).subscribe(guardar);
    else if (!e.orig) {
      this.api.get<{ total: number }>('admin/q/ciudades', { f_codigo: c.codigo, size: 1 }).subscribe((r) => {
        if (r.total > 0) this.iataExiste.set(c.codigo);
        else guardar();
      });
    } else guardar();
  }
  protected eliminarCiudad() {
    const b = this.borrarC();
    if (!b) return;
    this.api.delete(`admin/c/ciudades/${b.codigo}`).subscribe(() => {
      this.pagCiu.recargar();
      this.toast.show('Ciudad eliminada');
    });
  }
  /** Reordena los banners de Vuelos: el orden de esta lista es el del carrusel del sitio. */
  protected moverBanner(id: string, d: number) {
    const i = this.banners().findIndex((x) => x.id === id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= this.banners().length) return;
    const n = [...this.banners()];
    [n[i], n[j]] = [n[j]!, n[i]!];
    this.banners.set(n);
    this.admin.guardar('bannersVuelos', n).subscribe();
  }
  protected eliminarBanner() {
    const b = this.borrarB();
    if (!b) return;
    this.banners.update((x) => x.filter((y) => y.id !== b.id));
    this.admin.guardar('bannersVuelos', this.banners()).subscribe();
    this.toast.show('Banner eliminado');
  }
  protected toggleBanner(id: string, activo: boolean) {
    this.banners.update((x) => x.map((y) => (y.id === id ? { ...y, activo } : y)));
    this.admin.guardar('bannersVuelos', this.banners()).subscribe();
  }
  /** Crea un banner o, si trae `id`, guarda los cambios del existente (conserva su posición y si está activo). */
  protected crearBanner(n: { id?: string; alt: string; img: string[]; imgMovil: string[] }) {
    if (n.id) {
      this.banners.update((x) => x.map((y) => (y.id === n.id ? { ...y, imagen: n.img[0]!, imagenMovil: n.imgMovil[0], alt: n.alt } : y)));
    } else {
      this.banners.update((x) => [{ id: crypto.randomUUID(), imagen: n.img[0]!, imagenMovil: n.imgMovil[0], alt: n.alt, activo: true }, ...x]);
    }
    this.admin.guardar('bannersVuelos', this.banners()).subscribe();
    this.nuevoB.set(null);
    this.toast.show(n.id ? 'Banner actualizado' : 'Banner creado');
  }
}
