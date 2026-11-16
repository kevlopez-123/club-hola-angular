import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { IconComponent } from '../shared/icon.component';
import { CatalogService } from '../core/catalog.service';
import { textoAudiencia } from '../core/banners-audiencia';
import { beneficioPublicable, slideDeBeneficio, type BeneficioParaBanner } from '../core/banner-beneficio';
import { BannerDestacadoComponent } from '../shared/banner-destacado';
import { eventoPublicable, fechaCorta, slideDeEvento, type EventoParaBanner } from '../core/banner-evento';
import { ComboboxComponent } from '../shared/combobox';
import {
  AdminApi,
  AdminModalComponent,
  ConfirmComponent,
  BtnDirective,
  FieldComponent,
  ImageUploadComponent,
  INPUT_CLS,
  PanelComponent,
  PillComponent,
  ToggleComponent,
  ToastService,
  usarSucio,
} from './kit';

/* ------------------------------------------------------------------ */
/* Banners por módulo: la misma pantalla se usa en Home (Contenido),    */
/* Beneficios.                                                         */
/* Se ordenan con las flechas; el orden guardado es el del sitio.       */
/* ------------------------------------------------------------------ */
type Canal = 'Web' | 'App';
type Banner = {
  id?: string;
  key: string;
  imagen: string;
  /** Banner de un beneficio del catálogo (Home y Beneficios): el sitio lo arma con la foto, marca y nombre del beneficio. */
  beneficioId?: string | undefined;
  /** Banner de un evento (Eventos): el sitio lo arma con la foto, categoría, nombre, fecha y lugar del evento. */
  eventoId?: string | undefined;
  /** Versión alternativa para pantallas pequeñas (opcional): si falta, el sitio usa `imagen`. */
  imagenMovil?: string | undefined;
  alt: string;
  to?: string | undefined;
  canal: Canal;
  ubicacion: string;
  activo: boolean;
  inicio: string;
  fin: string;
  /** Niveles (segmentos) a los que se muestra; vacío = a todos. */
  segmentos?: string[] | undefined;
  /** Categorías de interés (favoritos y canjes); vacío = sin filtro por interés. */
  intereses?: string[] | undefined;
};
type BannerEdit = Banner & { img: string[]; imgMovil: string[]; /** Qué se anuncia: un beneficio o evento del catálogo, o una imagen propia (escritorio y celular). */ modo: 'elemento' | 'imagen' };

const HOY = '2026-10-28';
const estadoB = (b: Banner) =>
  !b.activo
    ? { l: 'Pausado', t: 'muted' as const }
    : b.inicio > HOY
      ? { l: 'Programado', t: 'warn' as const }
      : b.fin < HOY
        ? { l: 'Vencido', t: 'bad' as const }
        : { l: 'Publicado', t: 'ok' as const };

@Component({
  selector: 'a-banners-editor',
  imports: [IconComponent, PanelComponent, PillComponent, BtnDirective, FieldComponent, ToggleComponent, ImageUploadComponent, AdminModalComponent, ConfirmComponent, BannerDestacadoComponent, ComboboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-xl border border-border bg-card p-1">
            @for (c of canales; track c) {
              <button
                (click)="canal.set(c)"
                [class]="
                  'h-9 rounded-lg px-4 text-sm font-semibold ' +
                  (canal() === c ? 'bg-primary text-primary-foreground' : '')
                "
              >
                {{ c }}
              </button>
            }
          </div>
          @if (ubicaciones().length > 1) {
            <select aria-label="Ubicación" [class]="input + ' w-auto'" (change)="ubic.set($any($event.target).value)">
              <option>Todas</option>
              @for (u of ubicaciones(); track u) { <option>{{ u }}</option> }
            </select>
          }
          <button aBtn class="ml-auto" (click)="nuevoBanner()">
            <app-icon name="Plus" class="h-4 w-4" /> Nuevo banner
          </button>
        </div>
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          @for (b of lista(); track b.key; let i = $index) {
            <a-panel>
              <div class="relative">
                @if (b.beneficioId || b.eventoId) {
                  <div class="aspect-[3/1] overflow-hidden rounded-xl">
                    @if (slideDe(b); as s) {
                      <app-banner-destacado [slide]="s" modo="desktop" />
                    } @else {
                      <div class="grid h-full place-items-center bg-muted px-3 text-center text-sm text-muted-foreground">Lo que anuncia este banner ya no está disponible: no se muestra en el sitio.</div>
                    }
                  </div>
                } @else {
                  <img
                    [src]="b.imagen"
                    [alt]="b.alt"
                    [class]="
                      (canal() === 'Web' ? 'aspect-[32/10]' : 'aspect-square') +
                      ' w-full rounded-xl object-cover'
                    "
                  />
                }
                <span class="absolute left-2 top-2 rounded-md bg-card px-2 py-0.5 text-xs font-bold"
                  >#{{ i + 1 }}</span
                >
              </div>
              <div class="mt-3 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ titulo(b) }}</p>
                  <div class="mt-1 flex gap-1">
                    <a-pill>{{ b.ubicacion }}</a-pill
                    ><a-pill [tone]="estado(b).t">{{ estado(b).l }}</a-pill>
                  </div>
                  <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><app-icon name="Users" class="h-3.5 w-3.5" /> Se muestra a: <b class="text-foreground">{{ audiencia(b) }}</b></p>
                </div>
                <a-toggle
                  label="Activo"
                  [on]="b.activo"
                  (onChange)="patchB(b.key, { activo: $event })"
                />
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <a-field label="Inicio"
                  ><input
                    type="date"
                    [class]="input"
                    [value]="b.inicio"
                    (input)="patchB(b.key, { inicio: $any($event.target).value })"
                /></a-field>
                <a-field label="Fin"
                  ><input
                    type="date"
                    [class]="input"
                    [value]="b.fin"
                    [min]="b.inicio"
                    (input)="patchB(b.key, { fin: $any($event.target).value })"
                /></a-field>
              </div>
              <div class="mt-3 flex flex-wrap gap-1">
                <button
                  aria-label="Mover antes"
                  (click)="mover(b.key, -1)"
                  class="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted"
                >
                  <app-icon name="ArrowUp" class="h-4 w-4" />
                </button>
                <button
                  aria-label="Mover después"
                  (click)="mover(b.key, 1)"
                  class="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted"
                >
                  <app-icon name="ArrowDown" class="h-4 w-4" />
                </button>
                <button aBtn variant="ghost" (click)="preview.set(b)">
                  <app-icon name="Eye" class="h-4 w-4" /> Vista previa
                </button>
                <button aBtn variant="ghost" (click)="editB.set({ ...b, modo: b.beneficioId || b.eventoId ? 'elemento' : 'imagen', img: b.imagen ? [b.imagen] : [], imgMovil: b.imagenMovil ? [b.imagenMovil] : [] })">
                  Editar
                </button>
                <button aBtn variant="peligro-ghost" class="ml-auto" (click)="borrar.set(b)">
                  <app-icon name="Trash2" class="h-4 w-4" /> Eliminar
                </button>
              </div>
            </a-panel>
          }
        </div>
    <a-modal
      [open]="!!editB()" [sucio]="sucio()"
      [title]="editB()?.key ? 'Editar banner' : 'Nuevo banner · ' + canal()"
      (closed)="editB.set(null)"
    >
      @if (editB(); as e) {
        <div class="space-y-4">
          <div role="group" aria-label="Qué anuncia el banner" class="inline-flex rounded-xl border border-border bg-card p-1">
            @for (m of tiposBanner(); track m.valor) {
              <button type="button" [attr.aria-pressed]="e.modo === m.valor" (click)="setB({ modo: m.valor })"
                [class]="'h-9 rounded-lg px-4 text-sm font-semibold ' + (e.modo === m.valor ? 'bg-primary text-primary-foreground' : '')">{{ m.etiqueta }}</button>
            }
          </div>
          @if (e.modo === 'elemento') {
            <a-field [label]="porEvento() ? 'Evento' : 'Beneficio'">
              <app-combobox [etiqueta]="porEvento() ? 'Evento' : 'Beneficio'" [todas]="porEvento() ? 'Busca por nombre del evento' : 'Busca por marca o nombre'" [opciones]="opciones()" [claseInput]="input + ' pr-20'"
                [value]="etiquetaDe(e)" (valueChange)="elegir($event)" />
            </a-field>
            <p class="-mt-2 text-xs text-muted-foreground">{{ porEvento() ? 'El banner usa la foto del evento, su categoría, nombre, fecha y lugar. Si el evento se despublica o ya pasó, el banner deja de mostrarse solo.' : 'El banner usa la foto del beneficio, su marca, su nombre y su descuento. Si el beneficio se desactiva o vence, el banner deja de mostrarse solo.' }}</p>
            @if (slideEdit(); as s) {
              <div class="space-y-3">
                <div class="aspect-[3/1] overflow-hidden rounded-xl border border-border"><app-banner-destacado [slide]="s" modo="desktop" /></div>
                <div class="mx-auto aspect-[4/3] w-64 overflow-hidden rounded-xl border border-border"><app-banner-destacado [slide]="s" modo="movil" /></div>
              </div>
            }
          } @else {
          <a-field [label]="e.canal === 'Web' ? 'Imagen para escritorio' : 'Imagen del banner'">
            <a-image-upload
              [aspect]="e.canal === 'Web' ? 'aspect-[32/10]' : 'aspect-square'"
              [value]="e.img"
              (valueChange)="setB({ img: $event })"
              [minAncho]="e.canal === 'Web' ? 1440 : 720" [minAlto]="e.canal === 'Web' ? 450 : 720" [hint]="e.canal === 'Web' ? 'JPG 1920×600 px (3:1)' : 'JPG 1080×1080 px'"
            />
          </a-field>
          @if (e.canal === 'Web') {
            <a-field label="Imagen para móvil (opcional)">
              <a-image-upload
                aspect="aspect-square"
                [value]="e.imgMovil"
                (valueChange)="setB({ imgMovil: $event })"
                [minAncho]="720" [minAlto]="720" hint="JPG 1080×1080 px (1:1). En celulares se usa esta; si no la subes, se usa la de escritorio. Si el carrusel también tiene beneficios o eventos, en celular se muestra en 4:3 y se recorta un poco arriba y abajo."
              />
            </a-field>
          }
          <a-field label="Texto alternativo"
            ><input
              [class]="input"
              [value]="e.alt"
              (input)="setB({ alt: $any($event.target).value })"
          /></a-field>
          }
          <div class="grid grid-cols-2 gap-3">
            <a-field label="Canal"
              ><select [class]="input" (change)="setB({ canal: $any($event.target).value })">
                <option [selected]="e.canal === 'Web'">Web</option>
                <option [selected]="e.canal === 'App'">App</option>
              </select></a-field
            >
            <a-field label="Ubicación"
              ><select [class]="input" (change)="setB({ ubicacion: $any($event.target).value })">
                @for (u of ubicaciones(); track u) {
                  <option [selected]="u === e.ubicacion">{{ u }}</option>
                }
              </select></a-field
            >
            <a-field label="Inicio"
              ><input
                type="date"
                [class]="input"
                [value]="e.inicio"
                (input)="setB({ inicio: $any($event.target).value })"
            /></a-field>
            <a-field label="Fin"
              ><input
                type="date"
                [class]="input"
                [value]="e.fin"
                [min]="e.inicio"
                (input)="setB({ fin: $any($event.target).value })"
            /></a-field>
          </div>
          <fieldset class="rounded-2xl border border-border p-4">
            <legend class="px-1 text-sm font-semibold">¿A quién se le muestra?</legend>
            <p class="text-xs text-muted-foreground">Sin marcar nada, lo ve todo el mundo. Los banners dirigidos aparecen primero para quienes cumplen la condición.</p>
            <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nivel (segmento)</p>
            <div class="mt-1 flex flex-wrap gap-2">
              @for (n of niveles(); track n) {
                <button type="button" [attr.aria-pressed]="(e.segmentos ?? []).includes(n)" (click)="alternarAudiencia('segmentos', n)"
                  [class]="'min-h-9 rounded-full border px-3 text-sm font-semibold ' + ((e.segmentos ?? []).includes(n) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')">{{ n }}</button>
              }
            </div>
            <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interés (categorías que marcó como favoritas o canjeó)</p>
            <div class="mt-1 flex flex-wrap gap-2">
              @for (c of categorias(); track c) {
                <button type="button" [attr.aria-pressed]="(e.intereses ?? []).includes(c)" (click)="alternarAudiencia('intereses', c)"
                  [class]="'min-h-9 rounded-full border px-3 text-sm font-semibold ' + ((e.intereses ?? []).includes(c) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')">{{ c }}</button>
              }
            </div>
          </fieldset>
          @if (e.modo === 'imagen') {
            <a-field label="Enlace al hacer clic (opcional)"
              ><input
                [class]="input"
                placeholder="/canjea"
                [value]="e.to ?? ''"
                (input)="setB({ to: $any($event.target).value })"
            /></a-field>
          }
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="editB.set(null)">Cancelar</button>
            <button aBtn [disabled]="e.modo === 'elemento' ? !(e.beneficioId || e.eventoId) : (!e.img.length || !e.alt)" (click)="guardarBanner(e)">
              Guardar banner
            </button>
          </div>
        </div>
      }
    </a-modal>

    <a-confirm [open]="!!borrar()" [danger]="true" title="¿Eliminar banner?" confirmLabel="Eliminar" (closed)="borrar.set(null)" (confirmed)="eliminar()">
      Se eliminará «{{ borrar()?.alt }}» del sitio y no se puede deshacer. Si solo quieres ocultarlo, desactívalo con el interruptor.
    </a-confirm>

    <a-modal
      [wide]="true"
      [open]="!!preview()"
      [title]="
        'Vista previa · ' +
        $safeNavigationMigration(preview()?.canal) +
        ' · ' +
        $safeNavigationMigration(preview()?.ubicacion)
      "
      (closed)="preview.set(null)"
    >
      @if (preview(); as p) {
        @if (p.beneficioId || p.eventoId) {
          @if (slideDe(p); as s) {
            <p class="mb-2 text-sm font-semibold">Escritorio</p>
            <div class="aspect-[3/1] overflow-hidden rounded-xl border border-border"><app-banner-destacado [slide]="s" modo="desktop" /></div>
            <p class="mb-2 mt-5 text-sm font-semibold">Celular</p>
            <div class="mx-auto aspect-[4/3] w-72 max-w-full overflow-hidden rounded-xl border border-border"><app-banner-destacado [slide]="s" modo="movil" /></div>
          } @else {
            <p class="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Lo que anuncia este banner ya no está disponible, así que no se muestra en el sitio.</p>
          }
        } @else if (p.canal === 'Web') {
          <div class="overflow-hidden rounded-xl border border-border">
            <div class="flex h-8 items-center gap-1.5 bg-muted px-3">
              <span class="h-2.5 w-2.5 rounded-full bg-border"></span
              ><span class="h-2.5 w-2.5 rounded-full bg-border"></span
              ><span class="h-2.5 w-2.5 rounded-full bg-border"></span>
            </div>
            <div class="h-10 bg-primary"></div>
            <img [src]="p.imagen" [alt]="p.alt" class="aspect-[32/10] w-full object-cover" />
            <div class="grid grid-cols-4 gap-2 p-3">
              @for (k of [0, 1, 2, 3]; track k) {
                <div class="h-16 rounded-lg bg-muted"></div>
              }
            </div>
          </div>
        } @else {
          <div class="mx-auto w-64 overflow-hidden rounded-[2rem] border-8 border-foreground">
            <div class="h-12 bg-primary"></div>
            <div class="p-3">
              <img
                [src]="p.imagen"
                [alt]="p.alt"
                class="aspect-square w-full rounded-xl object-cover"
              />
              <div class="mt-3 grid grid-cols-2 gap-2">
                @for (k of [0, 1, 2, 3]; track k) {
                  <div class="h-16 rounded-lg bg-muted"></div>
                }
              </div>
            </div>
          </div>
        }
        <p class="mt-3 text-sm text-muted-foreground">
          Visible del {{ p.inicio }} al {{ p.fin }}{{ p.to ? ' · enlaza a ' + p.to : '' }}
        </p>
      }
    </a-modal>
  `,
})
export class BannersEditorComponent {
  /** Ubicaciones del sitio que administra esta pantalla (Home, Canjea, Beneficios…). */
  readonly ubicaciones = input<string[]>(['Home']);
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  protected readonly input = INPUT_CLS;
  private readonly catalog = inject(CatalogService);
  protected readonly niveles = computed(() => this.catalog.niveles().map((n) => n.nombre));
  protected readonly categorias = computed(() => this.catalog.categoriasBeneficio().map((c) => c.label));
  protected readonly audiencia = textoAudiencia;
  protected readonly canales: Canal[] = ['Web', 'App'];
  protected readonly canal = signal<Canal>('Web');
  protected readonly ubic = signal('Todas');
  protected readonly banners = signal<Banner[]>([]);
  protected readonly editB = signal<BannerEdit | null>(null);
  protected readonly sucio = usarSucio(() => this.editB());
  protected readonly preview = signal<Banner | null>(null);

  /** Home y Beneficios anuncian beneficios del catálogo y Eventos anuncia eventos: el sitio arma el banner con su foto y sus datos. */
  /** Solo se ofrecen beneficios y eventos que hoy se pueden anunciar (los demás no saldrían en el sitio). */
  private readonly hoy = new Date().toISOString().slice(0, 10);
  protected readonly porEvento = computed(() => this.ubicaciones().includes('Eventos'));
  protected readonly tiposBanner = computed(() => [
    { valor: 'elemento' as const, etiqueta: this.porEvento() ? 'Evento' : 'Beneficio' },
    { valor: 'imagen' as const, etiqueta: 'Imagen propia' },
  ]);
  protected readonly beneficios = signal<BeneficioParaBanner[]>([]);
  protected readonly eventos = signal<EventoParaBanner[]>([]);
  private readonly categoriasEv = signal<{ slug: string; label: string }[]>([]);
  private readonly marcas = signal<{ nombre: string; logo: string }[]>([]);
  private static readonly etiquetaB = (b: BeneficioParaBanner) => `${b.marca} · ${b.nombre}`;
  private static readonly etiquetaE = (e: EventoParaBanner) => `${e.nombre} · ${fechaCorta(e.fechaISO)}`;
  protected readonly opciones = computed(() =>
    this.porEvento()
      ? this.eventos().filter((e) => eventoPublicable(e, this.hoy)).map(BannersEditorComponent.etiquetaE)
      : this.beneficios().filter((b) => beneficioPublicable(b, this.hoy)).map(BannersEditorComponent.etiquetaB),
  );
  /** Cómo se llama en la lista el beneficio o evento de un banner (vacío si ya no existe). */
  protected etiquetaDe(b: Pick<Banner, 'beneficioId' | 'eventoId'>) {
    if (b.eventoId) {
      const e = this.eventos().find((x) => x.id === b.eventoId);
      return e ? BannersEditorComponent.etiquetaE(e) : '';
    }
    const x = this.beneficios().find((y) => y.id === b.beneficioId);
    return x ? BannersEditorComponent.etiquetaB(x) : '';
  }
  protected elegir(etiqueta: string) {
    if (this.porEvento()) this.setB({ eventoId: this.eventos().find((e) => BannersEditorComponent.etiquetaE(e) === etiqueta)?.id, beneficioId: undefined });
    else this.setB({ beneficioId: this.beneficios().find((b) => BannersEditorComponent.etiquetaB(b) === etiqueta)?.id, eventoId: undefined });
  }
  /** El banner tal como lo arma el sitio (null si ya no se puede mostrar). */
  protected slideDe(b: Banner) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (b.eventoId) return slideDeEvento(b, this.eventos().find((x) => x.id === b.eventoId), this.categoriasEv(), hoy);
    const ben = this.beneficios().find((x) => x.id === b.beneficioId);
    return slideDeBeneficio(b, ben, this.marcas().find((m) => m.nombre === ben?.marca)?.logo ?? '', hoy);
  }
  protected readonly slideEdit = computed(() => {
    const e = this.editB();
    return e && (e.beneficioId || e.eventoId) ? this.slideDe(e) : null;
  });
  protected titulo(b: Banner) {
    return this.etiquetaDe(b) || b.alt || 'Ya no está disponible';
  }
  protected readonly borrar = signal<Banner | null>(null);

  protected readonly lista = computed(() =>
    this.banners().filter(
      (b) => b.canal === this.canal() && this.ubicaciones().includes(b.ubicacion) && (this.ubic() === 'Todas' || b.ubicacion === this.ubic()),
    ),
  );

  constructor() {
    this.admin.lista<Banner>('banners').subscribe((b) => this.banners.set(b));
    this.admin.lista<BeneficioParaBanner & { activo?: boolean }>('beneficios').subscribe((b) => this.beneficios.set(b));
    this.admin.lista<{ nombre: string; logo: string }>('marcas').subscribe((m) => this.marcas.set(m));
    this.admin.lista<EventoParaBanner>('eventos').subscribe((e) => this.eventos.set(e));
    this.admin.lista<{ slug: string; label: string }>('categoriasEvento').subscribe((c) => this.categoriasEv.set(c));
  }

  protected estado = estadoB;
  private persistBanners() {
    this.admin.guardar('banners', this.banners()).subscribe();
  }
  protected patchB(key: string, p: Partial<Banner>) {
    this.banners.update((x) => x.map((y) => (y.key === key ? { ...y, ...p } : y)));
    this.persistBanners();
  }
  protected mover(key: string, d: number) {
    const canal = this.canal();
    const ubic = this.ubic();
    this.banners.update((x) => {
      const i = x.findIndex((y) => y.key === key);
      let j = i + d;
      while (
        j >= 0 &&
        j < x.length &&
        (x[j]!.canal !== canal || (ubic !== 'Todas' && x[j]!.ubicacion !== ubic) || !this.ubicaciones().includes(x[j]!.ubicacion))
      )
        j += d;
      if (j < 0 || j >= x.length) return x;
      const n = [...x];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
    this.persistBanners();
  }
  protected nuevoBanner() {
    this.editB.set({
      key: '',
      imagen: '',
      alt: '',
      to: '',
      canal: this.canal(),
      ubicacion: this.ubic() === 'Todas' ? this.ubicaciones()[0]! : this.ubic(),
      activo: true,
      inicio: HOY,
      fin: '2026-12-31',
      img: [],
      imgMovil: [],
      modo: 'elemento',
    });
  }
  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.banners.update((x) => x.filter((y) => y.key !== b.key));
    this.persistBanners();
    this.toast.show('Banner eliminado');
  }
  protected alternarAudiencia(campo: 'segmentos' | 'intereses', valor: string) {
    const e = this.editB();
    if (!e) return;
    const actual = e[campo] ?? [];
    this.setB({ [campo]: actual.includes(valor) ? actual.filter((x) => x !== valor) : [...actual, valor] });
  }
  protected setB(p: Partial<BannerEdit>) {
    this.editB.update((e) => (e ? { ...e, ...p } : e));
  }
  protected guardarBanner(e: BannerEdit) {
    const { img, imgMovil, ...b } = e;
    const { modo, ...resto } = b;
    // Beneficio o evento: no lleva imágenes propias ni enlace (apunta a su ficha). Imagen propia: sin beneficio ni evento.
    const nb: Banner =
      modo === 'elemento'
        ? { ...resto, imagen: '', imagenMovil: undefined, to: undefined, alt: this.etiquetaDe(resto) }
        : { ...resto, beneficioId: undefined, eventoId: undefined, imagen: img[0]!, imagenMovil: imgMovil[0] };
    this.banners.update((x) =>
      b.key
        ? x.map((y) => (y.key === b.key ? nb : y))
        : [{ ...nb, key: crypto.randomUUID() }, ...x],
    );
    this.persistBanners();
    this.editB.set(null);
    this.toast.show(
      nb.inicio > HOY ? `Banner programado para el ${nb.inicio}` : 'Banner publicado',
    );
  }

}
