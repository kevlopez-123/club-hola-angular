import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from "@angular/core";
import {
  CATEGORIAS_CUOTAS,
  COMERCIOS_CUOTAS,
  CUOTAS_DISPONIBLES,
  TEXTO_CONDICIONES,
  URL_PROGRAMA_CUOTAS,
  filtrarComercios,
  type ComercioCuotas,
  type Cuotas,
  type Modalidad,
} from "../core/cuotas-sin-intereses";
import { IconComponent } from "../shared/icon.component";

const POR_PAGINA = 24;

/** Comercios que se destacan en el slider de la página (los de más cuotas o más conocidos). */
const DESTACADOS = ["BanBifMall", "Ishop", "Despegar", "Claro", "Decameron", "PATAGONIA"];
const ROTACION_MS = 5000;

/* ------------------------------------------------------------------ */
/* Slider de comercios destacados                                       */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-cuotas-banner",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b0e17] via-[#141925] to-[#0b0e17] text-white shadow-lg" aria-roledescription="carrusel" aria-label="Comercios destacados" (mouseenter)="pausa.set(true)" (mouseleave)="pausa.set(false)" (focusin)="pausa.set(true)" (focusout)="pausa.set(false)">
      <!-- Formas decorativas en tonos de morado claro -->
      <div aria-hidden="true" class="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-primary/40 blur-3xl"></div>
      <div aria-hidden="true" class="pointer-events-none absolute -bottom-28 right-1/4 h-80 w-80 rounded-full bg-primary/50 blur-3xl"></div>
      <div aria-hidden="true" class="pointer-events-none absolute right-10 top-8 h-24 w-24 rounded-full border-2 border-primary/40"></div>

      <div class="relative flex transition-transform duration-500 ease-out motion-reduce:transition-none" [style.transform]="'translateX(-' + actual() * 100 + '%)'">
        @for (c of slides; track c.nombre; let i = $index) {
          <article class="grid min-h-[22rem] w-full shrink-0 items-center gap-6 px-6 pb-16 pt-8 sm:min-h-[19rem] sm:grid-cols-[1fr_auto_1fr] sm:gap-8 sm:px-16 sm:pb-14 lg:grid-cols-[1fr_auto_1fr] lg:gap-14" [attr.aria-hidden]="i !== actual()" [attr.inert]="i !== actual() ? '' : null">
            <div class="order-2 sm:order-1">
              <span class="inline-flex items-center gap-2 rounded-full bg-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
                <app-icon [name]="c.modalidad === 'online' ? 'Link2' : 'CreditCard'" class="h-4 w-4" />
                {{ c.modalidad === "online" ? "Compra online" : "Pago en tiendas" }}
              </span>
              <h2 class="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">{{ c.nombre }}</h2>
              <p class="mt-1 text-sm opacity-80">{{ c.categorias.join(" · ") }}</p>
              <p class="mt-3 text-base sm:hidden"><strong class="text-lima">{{ c.cuotas }} cuotas</strong> sin intereses</p>
              <a [href]="c.detalle" target="_blank" rel="noreferrer" class="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-lima px-7 text-base font-bold text-[#141925] shadow transition hover:brightness-95">
                Ver detalles <app-icon name="ExternalLink" class="h-4 w-4" />
              </a>
            </div>
            <div class="order-3 hidden text-center sm:block lg:order-2" aria-hidden="true">
              <p class="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Hasta</p>
              <p class="bg-gradient-to-b from-white to-primary/60 bg-clip-text text-[7rem] font-black leading-none text-transparent lg:text-[9rem]">{{ c.cuotas }}</p>
              <p class="-mt-1 text-lg font-bold">cuotas sin intereses</p>
            </div>
            <div class="order-1 flex h-36 items-center justify-center rounded-3xl bg-white p-5 shadow-xl shadow-primary/40 ring-8 ring-primary/30 sm:order-3 sm:h-48 sm:w-full sm:max-w-64 sm:justify-self-end lg:max-w-72 sm:-rotate-2">
              <img [src]="c.logo" [alt]="'Logo de ' + c.nombre" class="max-h-full max-w-full object-contain" />
            </div>
          </article>
        }
      </div>

      <button type="button" (click)="ir(actual() - 1)" aria-label="Anterior" class="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white hover:text-ink sm:flex">
        <app-icon name="ChevronLeft" class="h-5 w-5" />
      </button>
      <button type="button" (click)="ir(actual() + 1)" aria-label="Siguiente" class="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white hover:text-ink sm:flex">
        <app-icon name="ChevronRight" class="h-5 w-5" />
      </button>

      <div class="absolute bottom-5 left-6 flex items-center gap-2 sm:left-16">
        @for (c of slides; track c.nombre; let i = $index) {
          <button type="button" data-compact (click)="ir(i)" [attr.aria-label]="'Ir al banner ' + (i + 1)" [attr.aria-current]="i === actual()" class="group flex h-6 items-center">
            <span [class]="'block h-2.5 rounded-full transition-all ' + (i === actual() ? 'w-8 bg-lima' : 'w-2.5 bg-white/50 group-hover:bg-white/80')"></span>
          </button>
        }
      </div>
    </section>
  `,
})
export class CuotasBanner {
  protected readonly slides = DESTACADOS.map((n) => COMERCIOS_CUOTAS.find((c) => c.nombre === n)).filter((c): c is ComercioCuotas => !!c);
  protected readonly actual = signal(0);
  protected readonly pausa = signal(false);

  constructor() {
    const t = setInterval(() => {
      if (!this.pausa() && !matchMedia("(prefers-reduced-motion: reduce)").matches) this.ir(this.actual() + 1);
    }, ROTACION_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }
  protected ir(i: number) {
    const n = this.slides.length;
    this.actual.set(((i % n) + n) % n);
  }
}

/* ------------------------------------------------------------------ */
/* Cuotas sin intereses (/cuotas-sin-intereses): comercios afiliados    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-cuotas-page",
  imports: [IconComponent, CuotasBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <app-cuotas-banner class="mb-10 block" />
        <div class="max-w-3xl">
          <h1 class="text-3xl font-extrabold text-ink lg:text-4xl">Cuotas sin intereses</h1>
          <p class="mt-3 text-lg text-muted-foreground">
            Compra en los comercios afiliados con tu tarjeta de crédito BanBif y paga en cuotas, sin intereses, hasta en 24 meses.
          </p>
        </div>

        <div class="mt-8 grid gap-3 md:grid-cols-[1fr_14rem_14rem]">
          <div class="relative">
            <app-icon name="Search" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              [value]="texto()"
              (input)="texto.set($any($event.target).value); pagina.set(1)"
              placeholder="Busca un comercio"
              aria-label="Buscar comercio"
              class="h-12 w-full rounded-xl border border-border bg-card pl-12 pr-3 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select aria-label="Número de cuotas" (change)="setCuotas(+$any($event.target).value)" class="h-12 w-full rounded-xl border border-border bg-card px-3 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50">
            <option value="0" [selected]="cuotas() === 0">Número de cuotas</option>
            @for (n of cuotasDisponibles; track n) { <option [value]="n" [selected]="cuotas() === n">{{ n }} cuotas</option> }
          </select>
          <select aria-label="Categoría" (change)="setCategoria($any($event.target).value)" class="h-12 w-full rounded-xl border border-border bg-card px-3 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50">
            <option value="" [selected]="categoria() === ''">Categoría</option>
            @for (c of categorias; track c) { <option [value]="c" [selected]="categoria() === c">{{ c }}</option> }
          </select>
        </div>

        <p class="mt-6 text-sm text-muted-foreground" aria-live="polite">
          {{ filtrados().length }} {{ filtrados().length === 1 ? "comercio" : "comercios" }}
        </p>

        @if (filtrados().length === 0) {
          <div class="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p class="text-lg font-bold text-ink">No encontramos comercios con esos filtros</p>
            <button type="button" (click)="limpiar()" class="mt-4 inline-flex h-11 items-center rounded-full border border-primary px-6 text-sm font-semibold text-primary hover:bg-secondary">Quitar filtros</button>
          </div>
        } @else {
          <ul class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            @for (c of visibles(); track c.nombre) {
              <li class="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div class="relative flex h-36 items-center justify-center bg-white p-4">
                  @if (!sinLogo().has(c.nombre)) {
                    <img [src]="c.logo" [alt]="'Logo de ' + c.nombre" loading="lazy" (error)="logoRoto(c.nombre)" class="max-h-full max-w-full object-contain" />
                  } @else {
                    <span class="text-center text-xl font-extrabold text-ink">{{ c.nombre }}</span>
                  }
                  <span class="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Hasta {{ c.cuotas }} cuotas</span>
                </div>
                <div class="flex flex-1 flex-col p-4">
                  <h2 class="text-lg font-bold text-ink">{{ c.nombre }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ c.categorias.join(" · ") }}</p>
                  <p class="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-ink">
                    <app-icon [name]="c.modalidad === 'online' ? 'Link2' : 'CreditCard'" class="h-4 w-4" />
                    {{ c.modalidad === "online" ? "Online" : "Pago en tiendas" }}
                  </p>
                  <a
                    [href]="c.detalle"
                    target="_blank"
                    rel="noreferrer"
                    class="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90"
                    [attr.aria-label]="'Ver detalles de ' + c.nombre + ' en BanBif (se abre en otra pestaña)'"
                  >
                    Ver detalles <app-icon name="ExternalLink" class="h-4 w-4" />
                  </a>
                </div>
              </li>
            }
          </ul>
          @if (visibles().length < filtrados().length) {
            <div class="mt-8 text-center">
              <button type="button" (click)="pagina.set(pagina() + 1)" class="inline-flex h-12 items-center rounded-full border border-primary px-8 text-base font-semibold text-primary hover:bg-secondary">Ver más comercios</button>
            </div>
          }
        }

        <section class="mt-12 rounded-2xl border border-border bg-card p-6" aria-labelledby="cond">
          <h2 id="cond" class="text-xl font-bold text-ink">Condiciones</h2>
          <ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            @for (t of condiciones; track t) { <li>{{ t }}</li> }
          </ul>
          <a [href]="programa" target="_blank" rel="noreferrer" class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Conoce más en BanBif <app-icon name="ExternalLink" class="h-4 w-4" />
          </a>
        </section>
      </div>
    </section>
  `,
})
export class CuotasSinInteresesPage {
  protected readonly cuotasDisponibles = CUOTAS_DISPONIBLES;
  protected readonly categorias = CATEGORIAS_CUOTAS;
  protected readonly condiciones = TEXTO_CONDICIONES;
  protected readonly programa = URL_PROGRAMA_CUOTAS;

  protected readonly texto = signal("");
  protected readonly modalidad = signal<Modalidad | "">("");
  protected readonly cuotas = signal<Cuotas | 0>(0);
  protected readonly categoria = signal("");
  protected readonly pagina = signal(1);
  protected readonly sinLogo = signal<ReadonlySet<string>>(new Set());

  protected readonly filtrados = computed(() =>
    filtrarComercios(COMERCIOS_CUOTAS, { texto: this.texto(), categoria: this.categoria(), cuotas: this.cuotas(), modalidad: this.modalidad() }),
  );
  protected readonly visibles = computed<ComercioCuotas[]>(() => this.filtrados().slice(0, this.pagina() * POR_PAGINA));

  protected setCuotas(n: number) {
    this.cuotas.set(n as Cuotas | 0);
    this.pagina.set(1);
  }
  protected setCategoria(c: string) {
    this.categoria.set(c);
    this.pagina.set(1);
  }
  protected limpiar() {
    this.texto.set("");
    this.modalidad.set("");
    this.cuotas.set(0);
    this.categoria.set("");
    this.pagina.set(1);
  }
  protected logoRoto(nombre: string) {
    this.sinLogo.update((s) => new Set(s).add(nombre));
  }
}
