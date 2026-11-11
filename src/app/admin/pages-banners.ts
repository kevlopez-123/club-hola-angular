import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { IconComponent } from '../shared/icon.component';
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
  /** Versión alternativa para pantallas pequeñas (opcional): si falta, el sitio usa `imagen`. */
  imagenMovil?: string | undefined;
  alt: string;
  to?: string | undefined;
  /** Texto del banner estilo Club Hola (opcional): si hay título, el banner muestra marca, título, descuento y botón. */
  marca?: string | undefined;
  titulo?: string | undefined;
  descuento?: string | undefined;
  cta?: string | undefined;
  canal: Canal;
  ubicacion: string;
  activo: boolean;
  inicio: string;
  fin: string;
};
type BannerEdit = Banner & { img: string[]; imgMovil: string[] };

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
  imports: [IconComponent, PanelComponent, PillComponent, BtnDirective, FieldComponent, ToggleComponent, ImageUploadComponent, AdminModalComponent, ConfirmComponent],
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
          <span class="text-sm text-muted-foreground">{{
            canal() === 'Web' ? '1920×600 (32:10)' : '1080×1080 (1:1)'
          }}</span>
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
                <img
                  [src]="b.imagen"
                  [alt]="b.alt"
                  [class]="
                    (canal() === 'Web' ? 'aspect-[32/10]' : 'aspect-square') +
                    ' w-full rounded-xl object-cover'
                  "
                />
                <span class="absolute left-2 top-2 rounded-md bg-card px-2 py-0.5 text-xs font-bold"
                  >#{{ i + 1 }}</span
                >
              </div>
              <div class="mt-3 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ b.alt }}</p>
                  <div class="mt-1 flex gap-1">
                    <a-pill>{{ b.ubicacion }}</a-pill
                    ><a-pill [tone]="estado(b).t">{{ estado(b).l }}</a-pill>
                  </div>
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
                <button aBtn variant="ghost" (click)="editB.set({ ...b, img: [b.imagen], imgMovil: b.imagenMovil ? [b.imagenMovil] : [] })">
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
                [minAncho]="720" [minAlto]="720" hint="JPG 1080×1080 px (1:1). En celulares se usa esta; si no la subes, se usa la de escritorio."
              />
            </a-field>
          }
          <div class="grid grid-cols-2 gap-3">
            <a-field label="Marca (opcional)"><input [class]="input" maxlength="40" [value]="e.marca ?? ''" (input)="setB({ marca: $any($event.target).value })" /></a-field>
            <a-field label="Descuento (opcional)"><input [class]="input" maxlength="8" placeholder="25%" [value]="e.descuento ?? ''" (input)="setB({ descuento: $any($event.target).value })" /></a-field>
            <a-field label="Título (activa el estilo con texto)"><input [class]="input" maxlength="60" [value]="e.titulo ?? ''" (input)="setB({ titulo: $any($event.target).value })" /></a-field>
            <a-field label="Texto del botón"><input [class]="input" maxlength="24" placeholder="Conoce más" [value]="e.cta ?? ''" (input)="setB({ cta: $any($event.target).value })" /></a-field>
          </div>
          <a-field label="Texto alternativo"
            ><input
              [class]="input"
              [value]="e.alt"
              (input)="setB({ alt: $any($event.target).value })"
          /></a-field>
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
          <a-field label="Enlace al hacer clic (opcional)"
            ><input
              [class]="input"
              placeholder="/canjea"
              [value]="e.to ?? ''"
              (input)="setB({ to: $any($event.target).value })"
          /></a-field>
          <div class="flex justify-end gap-2">
            <button aBtn variant="outline" (click)="editB.set(null)">Cancelar</button>
            <button aBtn [disabled]="!e.img.length || !e.alt" (click)="guardarBanner(e)">
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
        @if (p.canal === 'Web') {
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
  protected readonly canales: Canal[] = ['Web', 'App'];
  protected readonly canal = signal<Canal>('Web');
  protected readonly ubic = signal('Todas');
  protected readonly banners = signal<Banner[]>([]);
  protected readonly editB = signal<BannerEdit | null>(null);
  protected readonly sucio = usarSucio(() => this.editB());
  protected readonly preview = signal<Banner | null>(null);
  protected readonly borrar = signal<Banner | null>(null);

  protected readonly lista = computed(() =>
    this.banners().filter(
      (b) => b.canal === this.canal() && this.ubicaciones().includes(b.ubicacion) && (this.ubic() === 'Todas' || b.ubicacion === this.ubic()),
    ),
  );

  constructor() {
    this.admin.lista<Banner>('banners').subscribe((b) => this.banners.set(b));
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
    });
  }
  protected eliminar() {
    const b = this.borrar();
    if (!b) return;
    this.banners.update((x) => x.filter((y) => y.key !== b.key));
    this.persistBanners();
    this.toast.show('Banner eliminado');
  }
  protected setB(p: Partial<BannerEdit>) {
    this.editB.update((e) => (e ? { ...e, ...p } : e));
  }
  protected guardarBanner(e: BannerEdit) {
    const { img, imgMovil, ...b } = e;
    const nb: Banner = { ...b, imagen: img[0]!, imagenMovil: imgMovil[0] };
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
