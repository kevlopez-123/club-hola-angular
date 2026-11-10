import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CatalogService } from '../core/catalog.service';
import type {
  CampoForm,
  ContenidoFaq,
  MenuItem,
  TipoCampo,
} from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { TelefonoInputComponent } from '../shared/telefono-input';
import { BrandService } from '../core/brand.service';
import { agruparCampos, reglaDe } from '../core/validar-perfil';
import { BannersEditorComponent } from './pages-banners';
import {
  AdminApi,
  AdminModalComponent,
  BtnDirective,
  ConfirmComponent,
  FieldComponent,
  ImageUploadComponent,
  INPUT_CLS,
  PageHeaderComponent,
  PanelComponent,
  PillComponent,
  ToggleComponent,
  ToastService,
  ErrorCargaComponent,
} from './kit';

/* ------------------------------------------------------------------ */
/* Contenido (banners, onboarding, secciones del Home, textos)         */
/* ------------------------------------------------------------------ */
type Contenido = {
  faq: ContenidoFaq[];
  faqIntro?: string;
  terminosIntro?: string;
  privacidadIntro?: string;
  terminos: string;
  privacidad: string;
};
type Onboarding = {
  id: string;
  titulo: string;
  texto: string;
  activo: boolean;
  imagen?: string | undefined;
};
type SeccionHome = { s: string; on: boolean };

@Component({
  selector: 'a-contenido-page',
  imports: [ErrorCargaComponent, RouterLink,
    IconComponent,
    PageHeaderComponent,
    PanelComponent,
    BtnDirective,
    FieldComponent,
    ToggleComponent,
    ImageUploadComponent,
    BannersEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header title="Contenido" desc="Banners del Home, onboarding de la app, secciones del Home, textos legales y menú. Los cambios se publican al guardarlos." />
    @if (errorCarga()) { <a-error-carga (reintentar)="cargar()" /> }
    <div class="mb-4 flex flex-wrap gap-2">
      @for (t of tabs; track t.k) {
        <button aBtn [variant]="tab() === t.k ? 'primary' : 'outline'" (click)="tab.set(t.k)">
          {{ t.l }}
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('banners') {
        <p class="mb-4 text-sm text-muted-foreground">Banners del Home. Los de Productos, Beneficios y Vuelos están en su módulo, en la pestaña Banners.</p>
        <a-banners-editor [ubicaciones]="['Home']" />
      }
      @case ('onboarding') {
        <div class="grid gap-6 md:grid-cols-3">
          @for (o of ob(); track o.id; let i = $index) {
            <a-panel>
              <div class="mb-3">
                <a-image-upload
                  aspect="aspect-[9/16]"
                  [value]="o.imagen ? [o.imagen] : []"
                  (valueChange)="patchO(o.id, { imagen: $event[0] })"
                  [hint]="'Ilustración ' + (i + 1) + ' · 1080×1920 px'"
                  [minAncho]="720"
                  [minAlto]="1280"
                />
              </div>
              <a-field label="Título"
                ><input
                  [class]="input"
                  [value]="o.titulo"
                  (input)="patchO(o.id, { titulo: $any($event.target).value })"
              /></a-field>
              <a-field label="Texto" class="mt-3">
                <textarea
                  [class]="input + ' h-20 py-2'"
                  [value]="o.texto"
                  (input)="patchO(o.id, { texto: $any($event.target).value })"
                ></textarea>
              </a-field>
                            <div class="mt-3 flex gap-1">
                <button type="button" aria-label="Mover antes" [disabled]="i === 0" (click)="moverO(i, -1)" class="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-40"><app-icon name="ArrowUp" class="h-4 w-4" /></button>
                <button type="button" aria-label="Mover después" [disabled]="i === ob().length - 1" (click)="moverO(i, 1)" class="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-muted disabled:opacity-40"><app-icon name="ArrowDown" class="h-4 w-4" /></button>
                <span class="ml-2 self-center text-sm text-muted-foreground">Posición {{ i + 1 }}</span>
              </div>              <div class="mt-3 flex items-center justify-between">
                <span class="text-sm">Visible</span
                ><a-toggle
                  label="Visible"
                  [on]="o.activo"
                  (onChange)="patchO(o.id, { activo: $event })"
                />
              </div>
            </a-panel>
          }
        </div>
      }
      @case ('home') {
        <a-panel title="Orden y visibilidad" class="max-w-2xl">
          <ul class="space-y-2">
            @for (s of secciones(); track s.s; let i = $index) {
              <li class="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                <span class="w-6 text-sm text-muted-foreground">{{ i + 1 }}</span>
                <span class="flex-1 font-medium">{{ s.s }}</span>
                <button
                  aria-label="Subir"
                  (click)="moverSeccion(i, -1)"
                  class="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
                >
                  <app-icon name="ArrowUp" class="h-4 w-4" />
                </button>
                <button
                  aria-label="Bajar"
                  (click)="moverSeccion(i, 1)"
                  class="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"
                >
                  <app-icon name="ArrowDown" class="h-4 w-4" />
                </button>
                <a-toggle label="Visible" [on]="s.on" (onChange)="toggleSeccion(s.s, $event)" />
              </li>
            }
          </ul>
        </a-panel>
      }
      @case ('textos') {
        <div class="mb-4 inline-flex rounded-xl border border-border bg-card p-1">
          @for (x of textosTabs; track x.k) {
            <button
              (click)="textoTab.set(x.k)"
              [class]="
                'h-9 rounded-lg px-4 text-sm font-semibold ' +
                (textoTab() === x.k ? 'bg-primary text-primary-foreground' : '')
              "
            >
              {{ x.l }}
            </button>
          }
        </div>
        @if (contenido(); as c) {
          @if (textoTab() === 'faq') {
            <a-panel title="Preguntas frecuentes">
              <a-field label="Subtítulo de la página" class="mb-4">
                <input [class]="input" [placeholder]="faqIntroBase" [value]="c.faqIntro ?? ''" (input)="setFaqIntro($event)" />
              </a-field>
              <ul class="space-y-4">
                @for (f of c.faq; track $index; let i = $index) {
                  <li class="rounded-xl border border-border p-3">
                    <a-field label="Pregunta"
                      ><input [class]="input" [value]="f.q" (input)="setFaq(i, 'q', $event)"
                    /></a-field>
                    <a-field label="Respuesta" class="mt-2">
                      <textarea
                        [class]="input + ' h-24 py-2'"
                        [value]="f.a"
                        (input)="setFaq(i, 'a', $event)"
                      ></textarea>
                    </a-field>
                    <button aBtn variant="ghost" class="mt-1" (click)="quitarFaq(i)">
                      <app-icon name="Trash2" class="h-4 w-4" /> Quitar
                    </button>
                  </li>
                }
              </ul>
              <div class="mt-4 flex gap-2">
                <button aBtn variant="outline" (click)="agregarFaq()">
                  <app-icon name="Plus" class="h-4 w-4" /> Agregar pregunta</button
                ><button aBtn (click)="guardarContenido()">Guardar</button>
              </div>
            </a-panel>
          } @else {
            <a-panel [title]="textoTab() === 'terminos' ? 'Términos y condiciones' : 'Política de privacidad'">
              <p class="text-sm text-muted-foreground">
                Los textos legales ahora tienen control de versiones: cada cambio se publica como una versión nueva, con su historial, y puede
                pedir a los participantes que la acepten de nuevo. Se editan en su propia sección.
              </p>
              <a class="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" routerLink="/admin/legales">
                Ir a Textos legales
              </a>
            </a-panel>
          }
        }
      }
      @case ('menu') {
        <a-panel title="Menú principal del sitio" class="max-w-3xl">
          <p class="mb-3 text-sm text-muted-foreground">
            Activa u oculta secciones, cambia sus nombres y ordénalas. Las secciones desactivadas
            dejan de ser accesibles en el sitio.
          </p>
          <ul class="space-y-2">
            @for (m of menu(); track m.id; let i = $index) {
              <li class="rounded-xl border border-border p-3">
                <div class="flex items-center gap-2">
                  <input
                    aria-label="Nombre del ítem"
                    [class]="input"
                    [value]="m.label"
                    (input)="setMenu(i, $event)"
                  />
                  <button
                    aria-label="Subir"
                    (click)="moverMenu(i, -1)"
                    class="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
                  >
                    <app-icon name="ArrowUp" class="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Bajar"
                    (click)="moverMenu(i, 1)"
                    class="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
                  >
                    <app-icon name="ArrowDown" class="h-4 w-4" />
                  </button>
                  <a-toggle
                    [label]="'Mostrar ' + m.label"
                    [on]="m.activo"
                    (onChange)="toggleMenu(i, null, $event)"
                  />
                </div>
                @if (m.to) {
                  <p class="mt-1 font-mono text-xs text-muted-foreground">{{ m.to }}</p>
                }
                @if (m.children) {
                  <ul class="mt-2 space-y-2 border-l-2 border-border pl-3">
                    @for (h of m.children; track h.to; let j = $index) {
                      <li class="flex items-center gap-2">
                        <div class="min-w-0 flex-1">
                          <input
                            [attr.aria-label]="'Nombre de ' + h.label"
                            [class]="input"
                            [value]="h.label"
                            (input)="setMenuHijo(i, j, $event)"
                          />
                          <p class="mt-0.5 font-mono text-xs text-muted-foreground">{{ h.to }}</p>
                        </div>
                        <a-toggle
                          [label]="'Mostrar ' + h.label"
                          [on]="h.activo"
                          (onChange)="toggleMenu(i, j, $event)"
                        />
                      </li>
                    }
                  </ul>
                }
              </li>
            }
          </ul>
          <button aBtn class="mt-4" (click)="guardarMenu()">Guardar menú</button>
        </a-panel>
      }
    }

  `,
})
export class ContenidoPage {
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  protected readonly input = INPUT_CLS;
  protected readonly textosTabs = [
    { k: 'faq', l: 'Preguntas frecuentes' },
    { k: 'terminos', l: 'Términos y condiciones' },
    { k: 'privacidad', l: 'Política de privacidad' },
  ] as const;
  protected readonly textoTab = signal<'faq' | 'terminos' | 'privacidad'>('faq');
  protected readonly tabs = [
    { k: 'banners', l: 'Banners del Home' },
    { k: 'onboarding', l: 'Onboarding app' },
    { k: 'home', l: 'Secciones del Home' },
    { k: 'textos', l: 'FAQ y legales' },
    { k: 'menu', l: 'Menú del sitio' },
  ] as const;

  protected readonly tab = signal<'banners' | 'onboarding' | 'home' | 'textos' | 'menu'>('banners');
  protected readonly ob = signal<Onboarding[]>([]);
  protected readonly secciones = signal<SeccionHome[]>([]);

  protected readonly errorCarga = signal(false);
  constructor() {
    this.cargar();
  }
  protected cargar() {
    this.errorCarga.set(false);
    const falla = () => this.errorCarga.set(true);
    this.cargarConfig();
    this.admin.lista<Onboarding>('onboarding').subscribe({ next: (o) => this.ob.set(o), error: falla });
    this.admin.lista<SeccionHome>('seccionesHome').subscribe({ next: (s) => this.secciones.set(s), error: falla });
  }

  /* ---- Textos y menú (se publican en la configuración del sitio) ---- */
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  protected readonly contenido = signal<Contenido | null>(null);
  protected readonly menu = signal<MenuItem[]>([]);
  protected cargarConfig() {
    this.api.get<{ contenido: Contenido; menu: MenuItem[] }>('config').subscribe({
      next: (c) => {
        this.contenido.set(structuredClone(c.contenido));
        this.menu.set(structuredClone(c.menu));
      },
      error: () => this.errorCarga.set(true),
    });
  }
  private publicar(parcial: object, msg: string) {
    this.api.put('admin/config', parcial).subscribe(() => {
      this.toast.show(msg);
      this.catalog.recargarConfig();
    });
  }
  protected guardarContenido() {
    this.publicar({ contenido: this.contenido() }, 'Textos publicados en el sitio');
  }
  private cambiarContenido(fn: (c: Contenido) => void) {
    const c = structuredClone(this.contenido()!);
    fn(c);
    this.contenido.set(c);
  }
  protected readonly faqIntroBase = 'Todo lo que necesitas saber sobre cómo funciona el programa.';
  protected setFaqIntro(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.cambiarContenido((c) => (c.faqIntro = v));
  }
  protected setFaq(i: number, campo: 'q' | 'a', e: Event) {
    this.cambiarContenido((c) => (c.faq[i]![campo] = (e.target as HTMLInputElement).value));
  }
  protected quitarFaq(i: number) {
    this.cambiarContenido((c) => c.faq.splice(i, 1));
  }
  protected agregarFaq() {
    this.cambiarContenido((c) => c.faq.push({ q: 'Nueva pregunta', a: '' }));
  }
  private cambiarMenu(fn: (m: MenuItem[]) => void) {
    const m = structuredClone(this.menu());
    fn(m);
    this.menu.set(m);
  }
  protected setMenu(i: number, e: Event) {
    this.cambiarMenu((m) => (m[i]!.label = (e.target as HTMLInputElement).value));
  }
  protected setMenuHijo(i: number, j: number, e: Event) {
    this.cambiarMenu((m) => (m[i]!.children![j]!.label = (e.target as HTMLInputElement).value));
  }
  protected toggleMenu(i: number, j: number | null, activo: boolean) {
    this.cambiarMenu((m) =>
      j === null ? (m[i]!.activo = activo) : (m[i]!.children![j]!.activo = activo),
    );
  }
  protected moverMenu(i: number, d: number) {
    this.cambiarMenu((m) => {
      const j = i + d;
      if (j < 0 || j >= m.length) return;
      [m[i], m[j]] = [m[j]!, m[i]!];
    });
  }
  protected guardarMenu() {
    this.publicar({ menu: this.menu() }, 'Menú publicado en el sitio');
  }
  /** Reordena las pantallas de bienvenida de la app. */
  protected moverO(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= this.ob().length) return;
    const n = [...this.ob()];
    [n[i], n[j]] = [n[j]!, n[i]!];
    this.ob.set(n);
    this.admin.guardar('onboarding', n).subscribe();
  }
  protected patchO(id: string, p: Partial<Onboarding>) {
    this.ob.update((x) => x.map((y) => (y.id === id ? { ...y, ...p } : y)));
    this.admin.guardar('onboarding', this.ob()).subscribe();
  }
  protected moverSeccion(i: number, d: number) {
    this.secciones.update((x) => {
      const j = i + d;
      if (j < 0 || j >= x.length) return x;
      const n = [...x];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
    this.admin.guardar('seccionesHome', this.secciones()).subscribe();
  }
  protected toggleSeccion(s: string, on: boolean) {
    this.secciones.update((x) => x.map((y) => (y.s === s ? { ...y, on } : y)));
    this.admin.guardar('seccionesHome', this.secciones()).subscribe();
  }
}

/* ------------------------------------------------------------------ */
/* Formulario de datos (constructor de campos)                         */
/* ------------------------------------------------------------------ */
const COMPONENTES: { tipo: TipoCampo; label: string; icon: string }[] = [
  { tipo: 'texto', label: 'Texto corto', icon: 'AlignLeft' },
  { tipo: 'email', label: 'Email', icon: 'AtSign' },
  { tipo: 'telefono', label: 'Teléfono', icon: 'Phone' },
  { tipo: 'numero', label: 'Número', icon: 'Hash' },
  { tipo: 'fecha', label: 'Fecha', icon: 'Calendar' },
  { tipo: 'textarea', label: 'Área de texto', icon: 'AlignLeft' },
  { tipo: 'select', label: 'Lista (select)', icon: 'List' },
  { tipo: 'checkbox', label: 'Casilla (term/cond)', icon: 'CheckSquare' },
];
const MAPEO = [
  { campo: 'apellido_paterno', tipo: 'texto' },
  { campo: 'apellido_materno', tipo: 'texto' },
  { campo: 'email', tipo: 'texto' },
  { campo: 'celular', tipo: 'texto' },
  { campo: 'fecha_nacimiento', tipo: 'fecha' },
  { campo: 'genero', tipo: 'lista' },
  { campo: 'provincia', tipo: 'lista' },
  { campo: 'ciudad', tipo: 'lista' },
  { campo: 'ocupacion', tipo: 'texto' },

];

@Component({
  selector: 'a-formulario-page',
  imports: [
    NgTemplateOutlet,
    TelefonoInputComponent,
    IconComponent,
    PageHeaderComponent,
    BtnDirective,
    FieldComponent,
    ToggleComponent,
    ConfirmComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a-header
      title="Formulario de datos"
      desc="Campos de “Mis datos” del participante, en web y app. “Nombres” siempre está; los apellidos y el teléfono se piden con “Apellido paterno / materno” y “N.º de celular” si los tienes configurados (si no, se piden como campos fijos). Provincia y ciudad son listas fijas en cascada."
    >
      <button aBtn (click)="toast.show('Formulario publicado en web y app (simulado)')">
        Publicar cambios
      </button>
    </a-header>
    <div class="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <!-- Lienzo -->
      <section class="rounded-2xl border border-border bg-muted/50">
        <div
          class="flex items-center justify-between border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <span>Lienzo</span
          ><span
            class="rounded-full bg-card px-2.5 py-1 normal-case tracking-normal text-foreground"
            >{{ totalCampos() }} campos configurados</span
          >
        </div>
        <div class="p-3 md:p-6">
          <div class="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 md:p-7">
            <h3 class="text-2xl font-bold">Mis datos</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Así lo ve el participante en Mi perfil: tus campos se suman a los del sistema, en una sola tarjeta.
            </p>
            <div class="mt-5 rounded-2xl bg-muted/60 p-4">
              <p
                class="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <app-icon name="Lock" class="h-3.5 w-3.5" /> Campos fijos del sistema
              </p>
              <div class="grid gap-3 md:grid-cols-2">
                @for (l of camposSistema(); track l) {
                  <div
                    class="flex h-12 items-center rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground"
                  >
                    {{ l }}
                  </div>
                }
              </div>
            </div>
            <div class="mt-5 space-y-6">
              @for (g of gruposVista(); track g.titulo) {
                @if (g.campos.length) {
                  <fieldset>
                    <legend class="mb-2 text-sm font-extrabold">{{ g.titulo }}</legend>
                    <div class="grid gap-x-4 gap-y-5 md:grid-cols-2">
                      @for (c of g.campos; track c.id) { <ng-container [ngTemplateOutlet]="tarjetaTpl" [ngTemplateOutletContext]="{ $implicit: c }" /> }
                    </div>
                  </fieldset>
                }
              }
              <p class="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                El participante ve los campos en este orden lógico (datos personales, contacto, ubicación y otros). Las flechas de cada campo
                cambian el orden dentro de su grupo y, en “Otros datos”, en el formulario.
              </p>
            </div>
            <ng-template #tarjetaTpl let-c>                <div
                  (click)="selId.set(c.id)"
                  [class]="
                    'group relative cursor-pointer rounded-xl p-1.5 ring-2 transition ' +
                    (c.ancho === 'completa' ? 'md:col-span-2 ' : '') +
                    (selId() === c.id ? 'ring-primary' : 'ring-transparent hover:ring-border')
                  "
                >
                  @switch (c.tipo) {
                    @case ('checkbox') {
                      <div class="flex items-center gap-3 py-2">
                        <span class="h-6 w-6 rounded-md border-2 border-border"></span
                        ><span class="font-semibold">{{ etiqueta(c) }}</span>
                      </div>
                    }
                    @case ('select') {
                      <div>
                        <p class="mb-1 text-sm text-muted-foreground">{{ etiqueta(c) }}@if (c.mapeo === 'provincia' || c.mapeo === 'ciudad') { <span class="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">lista fija</span> }</p>
                        <div
                          class="flex h-12 items-center justify-between rounded-xl border border-border px-3 text-sm"
                        >
                          Selecciona <app-icon name="ChevronDown" class="h-4 w-4" />
                        </div>
                      </div>
                    }
                    @case ('textarea') {
                      <div
                        class="h-24 rounded-xl border border-border px-3 py-3 text-sm text-muted-foreground"
                      >
                        {{ etiqueta(c) }}
                      </div>
                    }
                    @default {
                      <div>
                        @if (c.tipo === 'telefono') {
                          <p class="mb-1 text-sm text-muted-foreground">{{ etiqueta(c) }}</p>
                          <div class="pointer-events-none"><app-telefono-input variante="panel" [inputId]="'prev-' + c.id" /></div>
                        } @else {
                        <div
                          class="flex h-12 items-center justify-between rounded-xl border border-border px-3 text-sm text-muted-foreground"
                        >
                          {{ etiqueta(c) }}
                          @if (c.tipo === 'fecha') {
                            <app-icon name="Calendar" class="h-4 w-4" />
                          }
                        </div>
                        }
                        @if (c.ayuda) {
                          <p class="mt-1 text-xs text-muted-foreground">{{ c.ayuda }}</p>
                        }
                      </div>
                    }
                  }
                  <p class="mt-1.5 text-xs text-muted-foreground">{{ regla(c) }}</p>
                  <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    @if (c.mapeo) {
                      <span
                        class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono font-semibold"
                        ><app-icon name="Database" class="h-3 w-3" />{{ c.mapeo }}</span
                      >
                      <span class="font-mono text-muted-foreground">{{ tipoMapeo(c.mapeo) }}</span>
                    } @else {
                      <span
                        class="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 font-mono font-semibold text-accent-foreground"
                        ><app-icon name="AlertTriangle" class="h-3 w-3" />sin conectar a datos del
                        participante</span
                      >
                    }
                  </div>
                  <div
                    class="absolute -top-3 right-2 flex gap-1 md:hidden md:group-focus-within:flex md:group-hover:flex"
                  >
                    <button
                      data-compact
                      aria-label="Subir"
                      [disabled]="indiceDe(c.id) === 0"
                      (click)="$event.stopPropagation(); mover(c.id, -1)"
                      class="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card shadow-sm hover:bg-muted disabled:opacity-40"
                    >
                      <app-icon name="ArrowUp" class="h-3.5 w-3.5" />
                    </button>
                    <button
                      data-compact
                      aria-label="Bajar"
                      [disabled]="indiceDe(c.id) === campos().length - 1"
                      (click)="$event.stopPropagation(); mover(c.id, 1)"
                      class="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card shadow-sm hover:bg-muted disabled:opacity-40"
                    >
                      <app-icon name="ArrowDown" class="h-3.5 w-3.5" />
                    </button>
                    <button
                      data-compact
                      aria-label="Eliminar"
                      (click)="$event.stopPropagation(); borrar.set(c.id)"
                      class="grid h-7 w-7 place-items-center rounded-lg border border-border bg-card shadow-sm hover:bg-muted"
                    >
                      <app-icon name="Trash2" class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
            </ng-template>
            <button
              class="mt-6 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
            >
              Guardar
            </button>
          </div>
        </div>
      </section>

      <div class="space-y-5 lg:sticky lg:top-20">
        <!-- Propiedades -->
        <aside class="rounded-2xl border border-border bg-card p-4">
          <div class="mb-4 flex items-start gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-muted"
              ><app-icon name="SlidersHorizontal" class="h-5 w-5"
            /></span>
            <div>
              <h2 class="font-semibold">Propiedades</h2>
              <p class="text-xs text-muted-foreground">Edita el campo seleccionado.</p>
            </div>
          </div>
          @if (sel(); as s) {
            <div class="space-y-4">
              <a-field label="Etiqueta"
                ><input
                  [class]="input"
                  [value]="s.etiqueta"
                  (input)="patch({ etiqueta: $any($event.target).value })"
              /></a-field>
              <a-field label="Texto de ayuda"
                ><input
                  [class]="input"
                  [value]="s.ayuda ?? ''"
                  (input)="patch({ ayuda: $any($event.target).value })"
                  placeholder="Opcional"
              /></a-field>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Obligatorio</span
                ><a-toggle
                  label="Obligatorio"
                  [on]="s.obligatorio"
                  (onChange)="patch({ obligatorio: $event })"
                />
              </div>
              <a-field label="Ancho">
                <div class="grid grid-cols-2 gap-2">
                  @for (a of anchos; track a.v) {
                    <button
                      (click)="patch({ ancho: a.v })"
                      [class]="
                        'h-11 rounded-xl border text-sm font-semibold ' +
                        (s.ancho === a.v ? 'border-primary bg-primary/10' : 'border-border')
                      "
                    >
                      {{ a.l }}
                    </button>
                  }
                </div>
              </a-field>
              <a-field label="Guardar en dato del participante">
                <select
                  [class]="input"
                  (change)="patch({ mapeo: $any($event.target).value || undefined })"
                >
                  <option value="" [selected]="!s.mapeo">— Sin conectar —</option>
                  @for (m of mapeo; track m.campo) {
                    <option [value]="m.campo" [selected]="m.campo === s.mapeo" [disabled]="mapeoUsado(m.campo)">
                      {{ m.campo }} ({{ m.tipo }})
                    </option>
                  }
                </select>
              </a-field>
              @if (s.mapeo && mapeoUsado(s.mapeo)) {
                <p role="alert" class="text-sm font-semibold text-destructive">Otro campo ya está conectado a este dato: elige uno distinto.</p>
              }
              <p class="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><b class="text-foreground">Se valida así:</b> {{ regla(s) }}</p>
              @if (s.mapeo === 'provincia' || s.mapeo === 'ciudad') {
                <p class="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                  Provincia y ciudad son listas fijas y dependen una de otra: primero se elige la provincia (solo las que tienen envío, que se configuran en
                  Marca y localización) y luego su ciudad. No se editan a mano.
                </p>
              } @else if (s.tipo === 'select') {
                <a-field label="Opciones (una por línea)">
                  <textarea
                    [class]="input + ' h-32 py-2'"
                    [value]="(s.opciones ?? []).join('\\n')"
                    (input)="patch({ opciones: $any($event.target).value.split('\\n') })"
                  ></textarea>
                </a-field>
              }
              <button aBtn variant="peligro" class="w-full" (click)="borrar.set(s.id)">
                <app-icon name="Trash2" class="h-4 w-4" /> Eliminar campo
              </button>
            </div>
          } @else {
            <p class="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
              Selecciona un campo para editar sus propiedades.
            </p>
          }
        </aside>

        <!-- Componentes -->
        <aside class="rounded-2xl border border-border bg-card p-4">
          <div class="mb-3 flex items-start gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-muted"
              ><app-icon name="LayoutGrid" class="h-5 w-5"
            /></span>
            <div>
              <h2 class="font-semibold">Componentes</h2>
              <p class="text-xs text-muted-foreground">Agrega al final del formulario.</p>
            </div>
          </div>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            @for (c of componentes; track c.tipo) {
              <button
                (click)="add(c.tipo, c.label)"
                class="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted"
              >
                <app-icon [name]="c.icon" class="h-4 w-4 text-muted-foreground" /> {{ c.label }}
                <app-icon name="Plus" class="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            }
          </div>
        </aside>
      </div>
    </div>

    <a-confirm
      [open]="!!borrar()"
      [danger]="true"
      title="¿Eliminar campo?"
      confirmLabel="Eliminar"
      (closed)="borrar.set(null)"
      (confirmed)="eliminar()"
    >
      Se quitará “{{ nombreBorrar() }}” del formulario. Los datos ya guardados de los participantes
      no se borran.
    </a-confirm>
  `,
})
export class FormularioPage {
  protected readonly toast = inject(ToastService);
  private readonly admin = inject(AdminApi);
  protected readonly input = INPUT_CLS;
  protected readonly componentes = COMPONENTES;
  protected readonly mapeo = MAPEO;
  protected readonly anchos = [
    { v: 'media' as const, l: 'Media' },
    { v: 'completa' as const, l: 'Completa' },
  ];

  protected readonly campos = signal<CampoForm[]>([]);
  /** Nombres siempre se pide; apellidos y teléfono solo como campo fijo si no hay apellido paterno ni celular configurados. */
  protected readonly totalCampos = computed(() => this.campos().length + 1 + (this.campos().some((c) => c.mapeo === "apellido_paterno") ? 0 : 1) + (this.campos().some((c) => c.mapeo === "celular") ? 0 : 1));
  private readonly brand = inject(BrandService);
  /** Campos fijos que siempre se piden: nombres, y apellidos o teléfono solo si no hay campos configurados para ellos. */
  protected readonly camposSistema = computed(() => [
    "Nombres",
    ...(this.campos().some((c) => c.mapeo === "apellido_paterno") ? [] : ["Apellidos"]),
    ...(this.campos().some((c) => c.mapeo === "celular") ? [] : ["Teléfono"]),
  ]);
  /** Los campos como los ve el participante: en grupos y orden lógico. */
  protected readonly gruposVista = computed(() => {
    const g = agruparCampos(this.campos());
    return [
      { titulo: "Datos personales", campos: g.personal },
      { titulo: "Contacto", campos: g.contacto },
      { titulo: "Ubicación", campos: g.ubicacion },
      { titulo: "Otros datos", campos: g.otros },
    ];
  });
  protected indiceDe(id: string) {
    return this.campos().findIndex((c) => c.id === id);
  }
  protected regla(c: CampoForm) {
    return reglaDe(c, this.brand.pais());
  }
  /** Un dato del participante solo puede estar conectado a un campo. */
  protected mapeoUsado(campo: string) {
    return this.campos().some((c) => c.id !== this.selId() && c.mapeo === campo);
  }
  protected readonly selId = signal<string | null>(null);
  protected readonly borrar = signal<string | null>(null);
  protected readonly sel = computed(() => this.campos().find((c) => c.id === this.selId()) ?? null);
  protected readonly nombreBorrar = computed(
    () => this.campos().find((c) => c.id === this.borrar())?.etiqueta ?? '',
  );

  constructor() {
    this.admin.lista<CampoForm>('campos').subscribe((c) => this.campos.set(c));
  }

  protected etiqueta(c: CampoForm) {
    return c.etiqueta + (c.obligatorio ? ' *' : '');
  }
  protected tipoMapeo(campo: string) {
    return MAPEO.find((m) => m.campo === campo)?.tipo;
  }
  private persistir() {
    this.admin.guardar('campos', this.campos()).subscribe();
  }
  protected add(tipo: TipoCampo, label: string) {
    const c: CampoForm = {
      id: crypto.randomUUID(),
      tipo,
      etiqueta: label,
      obligatorio: false,
      ancho: tipo === 'textarea' || tipo === 'checkbox' ? 'completa' : 'media',
      opciones: tipo === 'select' ? ['Opción 1', 'Opción 2'] : undefined,
    };
    this.campos.update((x) => [...x, c]);
    this.selId.set(c.id);
    this.persistir();
  }
  protected patch(p: Partial<CampoForm>) {
    const id = this.selId();
    this.campos.update((x) => x.map((c) => (c.id === id ? { ...c, ...p } : c)));
    this.persistir();
  }
  protected mover(id: string, d: -1 | 1) {
    this.campos.update((x) => {
      const i = x.findIndex((c) => c.id === id);
      const j = i + d;
      if (j < 0 || j >= x.length) return x;
      const n = [...x];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });
    this.persistir();
  }
  protected eliminar() {
    const id = this.borrar();
    if (!id) return;
    this.campos.update((x) => x.filter((c) => c.id !== id));
    if (this.selId() === id) this.selId.set(null);
    this.persistir();
    this.toast.show('Campo eliminado');
  }
}
