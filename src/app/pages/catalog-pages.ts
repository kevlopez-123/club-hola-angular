import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { fechaLarga, listaTexto } from "../core/cupones";
import { SesionService } from "../core/sesion.service";
import { tieneAcceso } from "../core/mock-api/seed/niveles";
import { RouterLink } from "@angular/router";
import { CatalogService } from "../core/catalog.service";
import { claseEtiqueta } from "../core/promo";
import { StoreService } from "../core/store.service";
import { AnaliticaService } from "../core/analitica.service";
import { BrandService } from "../core/brand.service";
import { SeoService } from "../core/seo.service";
import { formatUSD } from "../core/format";
import type { Beneficio } from "../core/models";
import { IconComponent } from "../shared/icon.component";
import { EstadoErrorComponent } from "../shared/estado-error";
import {
  AddedToCartModalComponent, BenefitCardComponent, HeroSliderComponent, ModalComponent,
  SectionTitleComponent,
} from "../shared/ui";
import {
  BenefitsSectionComponent, CategoryStripComponent, CtaDuoComponent, HomeCategoriesComponent,
  OrdenSelectComponent, SearchFilterBarComponent, type OrdenCatalogo,
} from "../shared/widgets";
import { Countdown } from "../shared/countdown";

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-home-page",
  imports: [HeroSliderComponent, BenefitsSectionComponent, CtaDuoComponent, HomeCategoriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">{{ brand.programa() }}: beneficios y descuentos exclusivos para ti</h1>
    @for (s of secciones(); track s.id) {
      @switch (s.id) {
        @case ("banners") { <app-hero-slider [items]="catalog.bannersHome()" /> }
        @case ("categorias") { <app-home-categories /> }
        @case ("beneficios") { <app-benefits-section /> }
        @case ("cta-duo") { <app-cta-duo /> }
      }
    }
  `,
})
export class HomePage {
  protected readonly catalog = inject(CatalogService);
  protected readonly brand = inject(BrandService);
  /** Orden y visibilidad de la portada: se configuran en Admin → Contenido → Secciones del Home. */
  protected readonly secciones = computed(() => {
    const porDefecto = ["banners", "beneficios", "cta-duo"].map((id) => ({ id, s: id, on: true }));
    return (this.catalog.config()?.seccionesHome ?? porDefecto).filter((s) => s.on);
  });
}

/* ------------------------------------------------------------------ */
/* Catálogo de beneficios (/beneficios)                                */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-beneficios-page",
  imports: [EstadoErrorComponent, HeroSliderComponent, CategoryStripComponent, BenefitCardComponent, OrdenSelectComponent, SearchFilterBarComponent, SectionTitleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero-slider [items]="catalog.bannersBeneficios()" />

    <section class="bg-background py-6">
      <div class="page-container"><app-category-strip [categorias]="catalog.categoriasBeneficio()" [(value)]="categoria" /></div>
    </section>

    @if (mostrarExclusivos) {
    <section class="bg-background pb-10">
      <div class="page-container">
        <app-section-title text="Descubre nuestros beneficios" highlight="exclusivos" />
        <p class="mt-3 text-center text-sm text-muted-foreground">Beneficios especiales que puedes comprar con tu tarjeta del banco.</p>
        <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (b of exclusivos(); track b.id) { <app-benefit-card [beneficio]="b" class="animate-fade-up" /> }
        </div>
      </div>
    </section>
    }

    <section class="bg-surface py-10">
      <div class="page-container">
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <h1 class="min-w-0 text-xl font-extrabold text-ink sm:text-2xl">Disfruta de grandiosos beneficios</h1>
          <app-orden-select [(value)]="orden" />
        </div>
        <div class="mt-5">
          <app-search-filter-bar [(query)]="query" [(marca)]="marca" [marcas]="marcas()" [extrasActivos]="!!provincia()" (limpiado)="provincia.set('')">
            @if (provincias().length > 0) {
              <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Provincia
                <select [value]="provincia()" (change)="provincia.set($any($event.target).value)" aria-label="Provincia"
                  class="select-field mt-1 h-11 w-full rounded-full border border-border bg-card px-4 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="" [selected]="!provincia()">Todas las provincias</option>
                  @for (p of provincias(); track p) {
                    <option [value]="p" [selected]="p === provincia()">{{ p }}</option>
                  }
                </select>
              </label>
            }
          </app-search-filter-bar>
        </div>

        <p class="mt-5 text-sm text-muted-foreground">{{ lista().length }} beneficios disponibles</p>

        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @if (!catalog.cargado() && !catalog.errorCarga()) { <p role="status" class="sr-only">Cargando…</p> @for (n of [1, 2, 3, 4, 5, 6, 7, 8]; track n) { <div class="skeleton h-[26rem] rounded-2xl" aria-hidden="true"></div> } }
          @for (b of lista(); track b.id) { <app-benefit-card [beneficio]="b" [nivel]="2" class="animate-fade-up" /> }
        </div>

        @if (catalog.errorCarga() && !catalog.cargado()) { <app-estado-error (reintentar)="catalog.reintentar()" /> }
        @if (catalog.cargado() && lista().length === 0) {
          <p class="py-16 text-center text-sm text-muted-foreground">No encontramos beneficios con esos filtros. Prueba con otra búsqueda.</p>
        }
      </div>
    </section>
  `,
})
export class BeneficiosPage {
  protected readonly catalog = inject(CatalogService);
  protected readonly categoria = signal<string | null>(null);
  protected readonly orden = signal<OrdenCatalogo>("recomendado");
  protected readonly query = signal("");
  protected readonly marca = signal("");
  /** Provincia elegida en los filtros: muestra lo que está disponible allí (más lo de todo el país). */
  protected readonly provincia = signal("");

  protected readonly marcas = computed(() => [...new Set(this.catalog.beneficios().map((b) => b.marca))].sort());
  /** Provincias que aparecen en alguno de los beneficios (los que no indican provincia valen para todo el país). */
  protected readonly provincias = computed(() => [...new Set(this.catalog.beneficios().flatMap((b) => b.provincias ?? []))].sort((a, b) => a.localeCompare(b, "es")));
  /** Sección "Descubre nuestros beneficios exclusivos": oculta por ahora. Poner en true para volver a mostrarla. */
  protected readonly mostrarExclusivos = false;
  protected readonly exclusivos = computed(() => this.catalog.beneficios().filter((b) => b.tipo === "compra"));

  protected readonly lista = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.categoria();
    const marca = this.marca();
    let out = this.catalog.beneficios().filter((b) => {
      const okCat = !cat || b.categoriaSlug === cat;
      const okMarca = !marca || b.marca === marca;
      const okQuery = !q || `${b.marca} ${b.nombre} ${b.categoria}`.toLowerCase().includes(q);
      const prov = this.provincia();
      const okProv = !prov || !b.provincias?.length || b.provincias.includes(prov);
      return okCat && okMarca && okQuery && okProv;
    });
    const orden = this.orden();
    if (orden === "az") out = [...out].sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (orden === "precio-asc") out = [...out].sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0));
    if (orden === "precio-desc") out = [...out].sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0));
    return out;
  });
}

/* ------------------------------------------------------------------ */
/* Detalle de beneficio (/beneficios/:id)                              */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-beneficio-detalle-page",
  imports: [RouterLink, IconComponent, ModalComponent, AddedToCartModalComponent, Countdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (beneficio(); as beneficio) {
      <div class="bg-surface py-8">
        <div class="page-container">
          <a routerLink="/beneficios" class="inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-primary">
            <app-icon name="ArrowLeft" class="h-4 w-4" /> Volver al catálogo
          </a>

          <article class="mt-5 grid gap-8 rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] lg:grid-cols-2 lg:p-8">
            <div class="galeria-fija">
              <img [src]="beneficio.galeria[foto()]" [alt]="beneficio.nombre" width="900" height="900" class="mx-auto aspect-square w-full rounded-2xl object-cover" />
              @if (beneficio.galeria.length > 1) {
                <div class="mt-4 flex gap-3">
                  @for (g of beneficio.galeria; track g; let i = $index) {
                    <button type="button" (click)="foto.set(i)" [attr.aria-label]="'Ver foto ' + (i + 1)"
                      [class]="'h-20 w-20 overflow-hidden rounded-xl border-2 transition-colors ' + (i === foto() ? 'border-primary' : 'border-transparent')">
                      <img [src]="g" alt="" width="160" height="160" class="h-full w-full object-cover" />
                    </button>
                  }
                </div>
              }
            </div>

            <div>
              <h1 class="text-2xl font-extrabold text-ink sm:text-3xl">{{ beneficio.nombre }}</h1>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="inline-block rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-primary">{{ beneficio.categoria }}</span>
                @if (beneficio.etiqueta) { <span [class]="'inline-block rounded-full px-4 py-1.5 text-sm font-bold ' + claseEtiqueta(beneficio.etiquetaColor)">{{ beneficio.etiqueta }}</span> }
                @if (beneficio.promoEtiqueta) { <span class="inline-block rounded-full bg-destructive px-4 py-1.5 text-sm font-bold text-destructive-foreground">{{ beneficio.promoEtiqueta }}</span> }
              </div>
              <p class="mt-4 text-sm leading-relaxed text-muted-foreground">{{ beneficio.descripcion }}</p>

              @if (datosReglas(); as d) {
                <ul class="mt-4 space-y-1.5 text-sm text-ink" aria-label="Condiciones del beneficio">
                  @for (l of d; track l) { <li class="flex items-start gap-2"><app-icon name="CheckCircle2" class="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{{ l }}</span></li> }
                </ul>
              }

              <div class="my-5 border-t border-border"></div>

              <div class="flex items-center gap-3">
                @if (catalog.marcaPorNombre(beneficio.marca)?.logo; as logo) {
                  <img [src]="logo" [alt]="beneficio.marca" class="h-12 w-12 rounded-full border border-border bg-white object-contain p-1" />
                } @else {
                  <span class="grid h-12 w-12 place-items-center rounded-full bg-secondary text-sm font-extrabold text-primary">{{ beneficio.marca.slice(0, 2).toUpperCase() }}</span>
                }
                <div class="min-w-0">
                  <p class="text-sm font-semibold uppercase text-ink">{{ beneficio.marca }}</p>
                  <a [href]="catalog.marcaPorNombre(beneficio.marca)?.web || beneficio.marcaUrl" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-sm text-celeste hover:underline">
                    Visitar página web <app-icon name="Link2" class="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div class="mt-6 rounded-2xl bg-surface p-5">
                <h2 class="text-base font-bold text-ink">Para usar este beneficio</h2>
                <ol class="mt-3 space-y-2.5">
                  @for (paso of beneficio.pasos; track paso; let i = $index) {
                    <li class="flex items-center gap-3 text-sm text-ink">
                      <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{{ i + 1 }}</span>
                      {{ paso }}
                    </li>
                  }
                </ol>
              </div>

              @if (faltaNivel(); as nv) {
                <div role="status" class="mt-6 rounded-2xl border border-aviso-borde bg-aviso-fondo p-5">
                  <p class="flex items-start gap-2 text-sm font-semibold text-aviso"><app-icon name="Lock" class="mt-0.5 h-5 w-5 shrink-0" /> <span>Este beneficio está disponible desde el nivel {{ nv }}. Tu nivel actual es {{ store.usuario().nivel }}.</span></p>
                  <a routerLink="/mi-nivel" class="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">Ver mi nivel</a>
                </div>
              } @else if (beneficio.tipo === "compra") {
                <div class="mt-6 rounded-2xl border border-border p-5">
                  <p class="text-lg font-extrabold text-ink">{{ usd(beneficio.precio ?? 0) }}@if (beneficio.precioOriginal) { <s class="ml-2 text-sm font-medium text-muted-foreground">{{ usd(beneficio.precioOriginal) }}</s> }</p>
                  <p class="mt-2 text-sm text-muted-foreground">Lo pagas con tu tarjeta de débito o crédito del banco y recibes el beneficio por correo.</p>
                  <button type="button" (click)="agregarAlCarrito()"
                    class="mt-4 w-full rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02]">
                    Agregar al carrito
                  </button>
                </div>
              } @else if (beneficio.tipo === "informativo") {
                <div class="mt-6 rounded-2xl border border-border p-5 text-center">
                  <p class="text-sm text-muted-foreground">Tu código de descuento</p>
                  <p class="mt-2 select-all rounded-2xl bg-secondary px-5 py-4 text-2xl font-extrabold tracking-wider text-ink">{{ beneficio.codigoDescuento }}</p>
                  <button type="button" (click)="copiar(beneficio.codigoDescuento ?? '')"
                    class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wide text-primary-foreground">
                    <app-icon [name]="copiado() ? 'Check' : 'Copy'" class="h-4 w-4" /> {{ copiado() ? "Copiado" : "Copiar código" }}
                  </button>
                  <p class="mt-3 text-xs text-muted-foreground">Pega este código en la web o app del comercio antes de pagar.</p>
                </div>
              } @else if (cuponActivo(); as cupon) {
                <div class="mt-6">
                  <div class="mx-auto max-w-xs overflow-hidden rounded-2xl border border-border">
                    <div class="h-2 bg-primary"></div>
                    <div class="p-5 text-center">
                      <p class="text-sm text-ink">Presenta este QR a un encargado del local.</p>
                      <p class="mt-4 text-sm text-muted-foreground">Te quedan:</p>
                      <div class="mt-2"><app-countdown [expira]="cupon.expira" /></div>
                      @if (!beneficio.cuponSinQr) {
                        <img [src]="'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + cupon.codigo" [alt]="'Código QR ' + cupon.codigo"
                          width="220" height="220" class="mx-auto mt-5 h-48 w-48" />
                      }
                      <p class="mt-2 text-lg font-extrabold text-ink">{{ cupon.codigo }}</p>
                    </div>
                  </div>
                  <div class="mt-4 flex justify-center gap-3">
                    <button type="button" aria-label="Descargar cupón" class="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary"><app-icon name="Download" class="h-4 w-4" /></button>
                    <button type="button" aria-label="Imprimir cupón" class="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary"><app-icon name="Printer" class="h-4 w-4" /></button>
                  </div>
                  <p class="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-ink">
                    <app-icon name="CheckCircle2" class="h-4 w-4 text-primary" /> Cupón generado. Este beneficio queda bloqueado hasta que expire.
                  </p>
                </div>
              } @else if (bloqueo(); as b) {
                <div role="status" class="mt-6 rounded-2xl border border-aviso-borde bg-aviso-fondo p-5">
                  <p class="flex items-start gap-2 text-sm font-semibold text-aviso"><app-icon name="AlertCircle" class="mt-0.5 h-5 w-5 shrink-0" /> <span>{{ b.mensaje }}</span></p>
                  @if (b.estado === "falta_provincia") {
                    <a routerLink="/perfil" class="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">Completar mis datos</a>
                  }
                </div>
                <button type="button" disabled class="mt-4 w-full cursor-not-allowed rounded-full bg-muted py-3.5 text-base font-bold uppercase tracking-wide text-muted-foreground">Generar cupón</button>
              } @else {
                <button type="button" (click)="confirmar.set(true)"
                  class="mt-6 w-full rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02]">
                  Generar cupón
                </button>
              }
            </div>
          </article>

          <section class="mt-6 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] lg:p-8">
            <h2 class="text-lg font-bold text-ink">Especificaciones</h2>
            <ul class="mt-4 space-y-1.5 text-sm text-ink">
              @for (e of beneficio.especificaciones; track e) { <li>• {{ e }}</li> }
            </ul>
          </section>

          <section class="mt-6 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] lg:p-8">
            <h2 class="text-lg font-bold text-ink">Términos y condiciones</h2>
            <p class="mt-4 text-sm leading-relaxed text-ink">{{ beneficio.terminos }}</p>
          </section>
        </div>
      </div>

      <app-modal [open]="confirmar()" title="Generar Cupón" (closed)="confirmar.set(false)">
        <p class="text-base text-ink">Estás a punto de generar un cupón para:</p>
        <p class="mt-3 rounded-2xl bg-muted px-5 py-4 text-lg font-semibold uppercase text-ink">{{ beneficio.marca }}</p>

        <div class="mt-5 rounded-2xl border border-aviso-borde bg-aviso-fondo p-5">
          <p class="flex items-center gap-2 text-base font-bold text-aviso"><app-icon name="AlertCircle" class="h-5 w-5" /> Importante</p>
          <ul class="mt-3 space-y-2 text-sm text-aviso">
            <li>• El cupón tendrá una validez de {{ horasCupon() }} {{ horasCupon() === 1 ? "hora" : "horas" }}</li>
            @if (reglaTexto(); as r) { <li>• {{ r }}</li> }
            <li>• Solo puedes tener un cupón activo a la vez</li>
            <li>• Debes presentarlo en el establecimiento junto con tu cédula de identidad</li>
          </ul>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" (click)="confirmar.set(false)"
            class="rounded-full bg-muted px-6 py-3 text-base font-bold uppercase tracking-wide text-ink transition-colors hover:bg-secondary">Cancelar</button>
          <button type="button" (click)="store.generarCupon(beneficio.id); confirmar.set(false)"
            class="rounded-full bg-primary px-6 py-3 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02]">Generar cupón</button>
        </div>
      </app-modal>

      <app-added-to-cart-modal [producto]="agregado() ? itemAgregado(beneficio) : null" (closed)="agregado.set(false)" />
    } @else if (catalog.cargado()) {
      <div class="bg-surface py-24 text-center">
        <h1 class="text-2xl font-extrabold text-ink">Beneficio no disponible</h1>
        <a routerLink="/beneficios" class="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Volver al catálogo</a>
      </div>
    }
  `,
})
export class BeneficioDetallePage {
  protected readonly catalog = inject(CatalogService);
  protected readonly store = inject(StoreService);
  readonly id = input.required<string>();
  private readonly api = inject(ApiService);
  private readonly sesion = inject(SesionService);
  /** Horas de validez del cupón: las de este beneficio (o las generales del programa si no tiene regla propia). */
  protected readonly horasCupon = computed(() => this.beneficio()?.reglaCupon?.horas || this.catalog.config()?.cupon?.horas || 3);
  /** Qué le toca a este participante con este beneficio: disponible o el motivo por el que no puede canjearlo ahora. */
  protected readonly estado = signal<{ estado: string; mensaje: string } | null>(null);
  protected readonly bloqueo = computed(() => { const e = this.estado(); return e && e.estado !== "disponible" ? e : null; });
  private readonly cargarEstado = effect(() => {
    const b = this.beneficio();
    this.store.cupones(); // al generar un cupón se vuelve a preguntar (puede quedar bloqueado por el límite)
    if (!b || b.tipo === "compra" || !this.sesion.logged()) { this.estado.set(null); return; }
    this.api.get<{ estado: string; mensaje: string }>(`me/cupones/estado/${b.id}`).subscribe({ next: (e) => this.estado.set(e), error: () => this.estado.set(null) });
  });
  /** Lo que se le cuenta al participante antes de canjear: vigencia, provincias y cuántas veces puede hacerlo. */
  protected readonly datosReglas = computed(() => {
    const b = this.beneficio();
    if (!b) return null;
    const l: string[] = [];
    if (b.hasta) l.push(`Válido hasta el ${fechaLarga(b.hasta)}`);
    if (b.desde && b.vigencia === "programado") l.push(`Disponible desde el ${fechaLarga(b.desde)}`);
    if (b.provincias?.length) l.push(`Disponible en ${listaTexto(b.provincias)}`);
    const r = this.reglaTexto();
    if (r && b.tipo !== "compra") l.push(r);
    return l.length ? l : null;
  });
  /** "Puedes canjearlo 1 vez; para volver a hacerlo debes esperar 3 meses desde tu último canje." (vacío si no hay límite) */
  protected readonly reglaTexto = computed(() => {
    const r = this.beneficio()?.reglaCupon;
    if (!r || r.limite <= 0) return "";
    return `Puedes canjearlo ${r.limite === 1 ? "1 vez" : r.limite + " veces"}; después debes esperar ${r.meses} ${r.meses === 1 ? "mes" : "meses"} desde tu último canje para volver a hacerlo`;
  });
  protected readonly usd = formatUSD;
  protected readonly claseEtiqueta = claseEtiqueta;
  /** Nivel mínimo que pide el beneficio cuando el participante aún no lo alcanza (null si puede acceder). */
  protected readonly faltaNivel = computed(() => {
    const b = this.beneficio();
    if (!b?.nivelMinimo || !this.sesion.logged()) return null;
    return tieneAcceso(this.catalog.niveles(), this.store.usuario().nivel, b.nivelMinimo) ? null : b.nivelMinimo;
  });
  protected readonly copiado = signal(false);
  protected copiar(texto: string) {
    void navigator.clipboard?.writeText(texto).catch(() => undefined);
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  protected readonly foto = signal(0);
  protected readonly confirmar = signal(false);
  protected readonly agregado = signal(false);

  /** Un beneficio programado o vencido no está en el catálogo, pero su ficha sigue abierta para explicar por qué no se puede canjear. */
  private readonly fueraDelCatalogo = signal<Beneficio | undefined>(undefined);
  protected readonly beneficio = computed(() => this.catalog.beneficioPorId(this.id()) ?? this.fueraDelCatalogo());
  private readonly cargarFuera = effect(() => {
    const id = this.id();
    if (!this.catalog.cargado() || this.catalog.beneficioPorId(id)) return;
    this.api.get<Beneficio>(`catalogo/beneficios/${id}`).subscribe({ next: (b) => this.fueraDelCatalogo.set(b), error: () => this.fueraDelCatalogo.set(undefined) });
  });
  private readonly seo = inject(SeoService);
  private readonly analitica = inject(AnaliticaService);
  private vistoId = "";
  private readonly vista = effect(() => {
    const b = this.beneficio();
    if (!b || b.id === this.vistoId) return;
    this.vistoId = b.id;
    this.analitica.registrar({ tipo: "ver_item", itemId: b.id, itemTipo: "beneficio" });
  });
  private readonly seoBeneficio = effect(() => {
    const b = this.beneficio();
    if (!b) return;
    this.seo.detalle({
      titulo: `${b.nombre} en ${b.marca} | {programa}`,
      descripcion: (b.descripcion || `${b.nombre} en ${b.marca}: beneficio exclusivo para clientes de {banco}.`).slice(0, 300),
      imagen: b.imagen,
    });
  });
  protected readonly cupon = computed(() => this.store.cupones()[this.id()]);
  /** El QR se muestra mientras el cupón no haya vencido; vencido, vuelve el botón o el motivo del bloqueo. */
  protected readonly cuponActivo = computed(() => { const c = this.cupon(); return c && c.expira > Date.now() ? c : null; });

  protected itemAgregado(b: { id: string; marca: string; nombre: string; imagen: string; precio?: number | undefined }) {
    return { id: b.id, marca: b.marca, nombre: b.nombre, imagen: b.imagen, precio: b.precio ?? 0 };
  }

  protected agregarAlCarrito() {
    const b = this.beneficio();
    if (!b) return;
    this.store.add({
      id: b.id,
      tipo: "beneficio",
      nombre: b.nombre,
      marca: b.marca,
      imagen: b.imagen,
      precio: b.precio ?? 0,
      digital: true,
    });
    this.agregado.set(true);
  }
}

/* ------------------------------------------------------------------ */
/* Búsqueda (/buscar?q=)                                               */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-buscar-page",
  imports: [EstadoErrorComponent, BenefitCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Resultados para “{{ q() }}”</h1>
        <p class="mt-2 text-base text-muted-foreground">{{ bens().length }} coincidencias en beneficios.</p>

        @if (bens().length > 0) {
          <section class="mt-10">
            <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              @for (b of bens(); track b.id) { <app-benefit-card [beneficio]="b" [nivel]="2" /> }
            </div>
          </section>
        }

        @if (catalog.errorCarga() && !catalog.cargado()) { <app-estado-error (reintentar)="catalog.reintentar()" /> }
        @if (catalog.cargado() && bens().length === 0) {
          <p class="mt-10 rounded-2xl bg-card p-8 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">
            No encontramos resultados. Intenta con otra marca o categoría.
          </p>
        }
      </div>
    </div>
  `,
})
export class BuscarPage {
  protected readonly catalog = inject(CatalogService);
  /** Query param `q` (enlazado por withComponentInputBinding). */
  readonly q = input("");

  private readonly t = computed(() => this.q().trim().toLowerCase());
  protected readonly bens = computed(() =>
    this.catalog.beneficios().filter((b) => `${b.nombre} ${b.marca} ${b.categoria}`.toLowerCase().includes(this.t())),
  );
}

/* ------------------------------------------------------------------ */
/* Favoritos                                                           */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-favoritos-page",
  imports: [BenefitCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Mis favoritos</h1>
        <p class="mt-2 text-base text-muted-foreground">{{ bens().length }} elementos guardados.</p>

        @if (bens().length > 0) {
          <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            @for (b of bens(); track b.id) { <app-benefit-card [beneficio]="b" [nivel]="2" /> }
          </div>
        } @else {
          <p class="mt-10 rounded-2xl bg-card p-8 text-center text-base text-muted-foreground shadow-[var(--shadow-card)]">
            Todavía no tienes favoritos. Toca el corazón en cualquier beneficio.
          </p>
        }
      </div>
    </div>
  `,
})
export class FavoritosPage {
  private readonly catalog = inject(CatalogService);
  private readonly store = inject(StoreService);
  protected readonly bens = computed(() => this.catalog.beneficios().filter((b) => this.store.favoritos().includes(b.id)));
}
