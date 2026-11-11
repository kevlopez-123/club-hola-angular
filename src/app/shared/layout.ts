import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from "@angular/core";
import { LegalesService } from "../core/legales.service";
import { PopupHostComponent } from "./popup-host";
import { MarkdownComponent } from "./markdown.component";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";
import { IconComponent } from "./icon.component";
import { LogoComponent } from "./ui";
import { StoreService } from "../core/store.service";
import { CatalogService, PIE_ATENCION, PIE_INFORMACION } from "../core/catalog.service";
import { BrandService } from "../core/brand.service";
import { ToasterComponent } from "./toast";
import { CampanitaComponent } from "./notificaciones";
import { SesionService } from "../core/sesion.service";
import { ConsentimientoService } from "../core/consentimiento.service";

type Resultado = { id: string; nombre: string; marca: string; imagen: string; tipo: "beneficio" };

/* ------------------------------------------------------------------ */
/* Buscador del header                                                 */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-search-box",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <form role="search" (submit)="$event.preventDefault(); irABusqueda()">
        <input type="search" [value]="q()" (input)="onInput($event)" (focus)="abierto.set(true)"
          placeholder="Buscar aquí" aria-label="Buscar beneficios"
          class="h-12 w-full rounded-full bg-background pl-5 pr-12 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60" />
        <button type="submit" aria-label="Buscar"
          class="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ink">
          <app-icon name="Search" class="h-5 w-5" />
        </button>
      </form>

      @if (abierto() && q().trim().length >= 2) {
        <div class="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl bg-card p-2 shadow-[0_18px_40px_-16px_rgba(20,25,37,0.45)]">
          @if (resultados().length === 0) {
            <p class="px-3 py-4 text-base text-muted-foreground">Sin resultados para “{{ q() }}”.</p>
          }
          @for (r of resultados(); track r.tipo + r.id) {
            <a [routerLink]="['/beneficios', r.id]" (click)="cerrar()"
              class="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted">
              <img [src]="r.imagen" alt="" class="h-10 w-10 shrink-0 rounded-lg object-cover" />
              <span class="min-w-0">
                <span class="block truncate text-base font-semibold text-ink">{{ r.nombre }}</span>
                <span class="block text-sm text-muted-foreground">{{ r.marca }} · Beneficio</span>
              </span>
            </a>
          }
          @if (resultados().length > 0) {
            <button type="button" (click)="irABusqueda()"
              class="mt-1 flex min-h-11 w-full items-center justify-center rounded-xl bg-muted text-base font-semibold text-primary">
              Ver todos los resultados
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class SearchBoxComponent {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);

  protected readonly q = signal("");
  protected readonly abierto = signal(false);

  protected readonly resultados = computed<Resultado[]>(() => {
    const t = this.q().trim().toLowerCase();
    if (t.length < 2) return [];
    const bens = this.catalog.beneficios()
      .filter((b) => `${b.nombre} ${b.marca} ${b.categoria}`.toLowerCase().includes(t))
      .slice(0, 5)
      .map((b): Resultado => ({ id: b.id, nombre: b.nombre, marca: b.marca, imagen: b.imagen, tipo: "beneficio" }));
    return bens;
  });

  @HostListener("document:mousedown", ["$event"])
  protected onDocClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target as Node)) this.abierto.set(false);
  }

  protected onInput(e: Event) {
    this.q.set((e.target as HTMLInputElement).value);
    this.abierto.set(true);
  }
  protected cerrar() {
    this.abierto.set(false);
    this.q.set("");
  }
  protected irABusqueda() {
    const q = this.q().trim();
    if (!q) return;
    this.abierto.set(false);
    this.router.navigate(["/buscar"], { queryParams: { q } });
  }
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-site-header",
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent, SearchBoxComponent, CampanitaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header [class]="'sticky top-0 z-50 bg-header-gradient shadow-header' + (compacto() ? ' header-compacto' : '')">
      <div class="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <!-- Fila superior -->
        <div [class]="'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 transition-[padding] duration-200 motion-reduce:transition-none lg:flex lg:gap-6 ' + (compacto() ? 'py-1.5' : 'py-3')">
          <a routerLink="/" class="flex shrink-0 items-center" aria-label="Ir al inicio">
            <app-logo [class]="'transition-[height] duration-200 motion-reduce:transition-none ' + (compacto() ? 'h-8' : 'h-8 sm:h-12 lg:h-10 xl:h-12')" />
          </a>

          <div class="hidden min-w-0 items-center gap-3 lg:flex">
            @if (sesion.logged()) {
            @if (!compacto()) { <span class="hidden whitespace-nowrap text-base text-white/90 xl:inline">Hola {{ store.usuario().nombre }}</span> }
            <a routerLink="/mi-nivel"
              class="hdr-pildora flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-base text-white transition-colors hover:bg-white/20">
              <app-icon name="Gem" class="h-4 w-4 text-white" />
              Nivel {{ store.usuario().nivel }}
            </a>
            }
          </div>

          <div class="ml-auto hidden shrink-0 items-center gap-3 lg:flex xl:gap-4">
            @if (sesion.logged()) {
            }
            @if (sesion.logged()) { <app-search-box class="w-[150px] xl:w-[300px]" /> }
            @if (sesion.logged()) {
            <div class="flex items-center gap-1 text-white">
              <app-campanita />
              @for (a of acciones(); track a.label) {
                @if (!a.soloMovil) {
                <a [routerLink]="a.to" [attr.aria-label]="a.label" [title]="a.label" (click)="salirSi(a.salir, $event)"
                  class="hdr-icono relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-white/15 xl:h-12 xl:w-12">
                  <app-icon [name]="a.icon" class="h-6 w-6" />
                  @if (a.badge) {
                    <span class="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-extrabold text-ink shadow ring-2 ring-primary">{{ a.badge }}</span>
                  }
                </a>
                }
              }
            </div>
            } @else {
              <a routerLink="/login" [queryParams]="volver()" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-base font-bold text-ink transition-colors hover:bg-white/90"><app-icon name="User" class="h-5 w-5" /> Ingresar</a>
            }
          </div>

          <button type="button" [attr.aria-label]="open() ? 'Cerrar menú' : 'Abrir menú'" [attr.aria-expanded]="open()"
            (click)="open.set(!open())"
            class="grid h-11 w-11 place-items-center justify-self-end rounded-full text-white lg:hidden">
            <app-icon [name]="open() ? 'X' : 'Menu'" class="h-7 w-7" />
          </button>
        </div>

        <!-- Buscador móvil -->
        @if (sesion.logged()) { <div class="pb-3 lg:hidden"><app-search-box /></div> }

        <!-- Navegación desktop -->
        <div class="hidden border-t border-white/15 lg:block">
          <nav class="hidden items-center gap-6 lg:flex">
            @for (item of nav(); track item.label) {
              <div class="group relative">
                @if (item.children) {
                  <button type="button"
                    [class]="'flex items-center gap-1 text-base font-medium text-white/85 transition-colors hover:text-white ' + (compacto() ? 'min-h-10 py-1.5' : 'min-h-11 py-3')">
                    {{ item.label }}
                    <app-icon name="ChevronDown" class="h-4 w-4" />
                  </button>
                  <div class="invisible absolute left-0 top-full z-50 w-64 translate-y-1 rounded-2xl bg-card p-2 opacity-0 shadow-[0_18px_40px_-16px_rgba(20,25,37,0.35)] transition-all group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    @for (child of item.children; track child.label) {
                      <a [routerLink]="child.to"
                        class="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-base text-foreground transition-colors hover:bg-muted hover:text-primary">
                        {{ child.label }}
                      </a>
                    }
                  </div>
                } @else {
                  <a [routerLink]="item.to" routerLinkActive="text-white font-bold" [routerLinkActiveOptions]="{ exact: item.to === '/' }"
                    [class]="'flex items-center gap-1 text-base font-medium text-white/85 transition-colors hover:text-white ' + (compacto() ? 'min-h-10 py-1.5' : 'min-h-11 py-3')">
                    {{ item.label }}
                  </a>
                }
              </div>
            }
          </nav>
        </div>
      </div>

      <!-- Drawer móvil -->
      @if (open()) {
        <div class="max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain border-t border-white/15 bg-brand-dark px-4 pb-6 pt-4 lg:hidden">
          @if (!sesion.logged()) {
            <a routerLink="/login" [queryParams]="volver()" (click)="open.set(false)" class="mb-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-base font-bold text-ink"><app-icon name="User" class="h-5 w-5" /> Ingresar</a>
          } @else {
          <div class="mb-5 flex flex-wrap items-center gap-3">
            <span class="w-full text-base text-white/90">Hola {{ store.usuario().nombre }}</span>
            <a routerLink="/mi-nivel" (click)="open.set(false)"
              class="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-base text-white transition-colors hover:bg-white/20">
              <app-icon name="Gem" class="h-4 w-4 text-celeste" />
              Nivel {{ store.usuario().nivel }}
            </a>
          </div>
          }

          <nav class="flex flex-col">
            @for (item of nav(); track item.label) {
              <div class="border-b border-white/10">
                @if (item.children) {
                  <button type="button" (click)="submenu.set(submenu() === item.label ? null : item.label)"
                    [attr.aria-expanded]="submenu() === item.label"
                    class="flex min-h-12 w-full items-center justify-between py-3 text-left text-base font-medium text-white">
                    {{ item.label }}
                    <app-icon name="ChevronDown" [class]="'h-4 w-4 transition-transform ' + (submenu() === item.label ? 'rotate-180' : '')" />
                  </button>
                  @if (submenu() === item.label) {
                    <div class="pb-2 pl-3">
                      @for (child of item.children; track child.label) {
                        <a [routerLink]="child.to" (click)="open.set(false)"
                          class="flex min-h-11 w-full items-center py-2 text-base text-white/80">{{ child.label }}</a>
                      }
                    </div>
                  }
                } @else {
                  <a [routerLink]="item.to" (click)="open.set(false)"
                    class="flex min-h-12 w-full items-center py-3 text-base font-medium text-white">{{ item.label }}</a>
                }
              </div>
            }
          </nav>

          @if (sesion.logged()) {
          <div class="mt-6 grid grid-cols-2 gap-3">
            @for (a of acciones(); track a.label) {
              <a [routerLink]="a.to" (click)="open.set(false); salirSi(a.salir, $event)"
                class="flex min-h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left text-base font-medium text-white transition-colors hover:bg-white/20">
                <span class="relative">
                  <app-icon [name]="a.icon" class="h-5 w-5" />
                  @if (a.badge) {
                    <span class="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-extrabold text-ink shadow ring-2 ring-primary">{{ a.badge }}</span>
                  }
                </span>
                {{ a.label }}
              </a>
            }
          </div>
          }
        </div>
      }
    </header>
  `,
})
export class SiteHeaderComponent {
  protected readonly store = inject(StoreService);
  protected readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  /** Al ingresar desde el encabezado se vuelve a la página actual. */
  protected readonly volver = () => (this.router.url && this.router.url !== "/" && !this.router.url.startsWith("/login") ? { volver: this.router.url } : {});
  /** "Cerrar sesión" borra el token y recarga en /login (no es una navegación normal). */
  protected salirSi(salir: boolean, e: Event) {
    if (!salir) return;
    e.preventDefault();
    this.sesion.salir();
  }
  private readonly catalog = inject(CatalogService);
  /** Menú publicado desde Admin → Contenido → Menú (solo ítems activos). */
  /** Sin sesión no hay menú: el sitio solo se explora iniciando sesión. */
  protected readonly nav = computed(() => (this.sesion.logged() ? this.catalog.menu() : []));
  protected readonly open = signal(false);
  protected readonly submenu = signal<string | null>(null);

  /**
   * Encabezado compacto al bajar. Dos umbrales (se compacta pasando 80 px y se expande por debajo de 20 px) para que el cambio
   * de alto no provoque un parpadeo en el límite; y solo si la página tiene recorrido de sobra (si no, al encoger el alto
   * la página dejaría de scrollear y el encabezado se expandiría otra vez).
   */
  protected readonly compacto = signal(false);
  @HostListener("window:scroll")
  protected alScroll() {
    const y = window.scrollY;
    const recorrido = document.documentElement.scrollHeight - window.innerHeight;
    if (!this.compacto() && y > 80 && recorrido > 260) this.compacto.set(true);
    else if (this.compacto() && y < 20) this.compacto.set(false);
  }

  protected readonly acciones = computed(() => [
    { label: "Carrito", icon: "ShoppingCart", to: "/carrito", badge: this.store.totalItems(), soloMovil: false, salir: false },
    { label: "Notificaciones", icon: "Bell", to: "/notificaciones", badge: this.store.noLeidas(), soloMovil: true, salir: false },
    { label: "Favoritos", icon: "Heart", to: "/favoritos", badge: 0, soloMovil: false, salir: false },
    { label: "Mi perfil", icon: "User", to: "/perfil", badge: 0, soloMovil: false, salir: false },
    { label: "Cerrar sesión", icon: "LogOut", to: "/login", badge: 0, soloMovil: false, salir: true },
  ]);
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-site-footer",
  imports: [RouterLink, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-brand-red text-white">
      <div class="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
        <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <app-logo class="h-16" />
            <div class="mt-5 flex gap-3">
              @for (s of socials(); track s.label) {
                <a [href]="s.url" target="_blank" rel="noopener noreferrer" [attr.aria-label]="s.label"
                  class="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-primary">
                  <app-icon [name]="s.icon" class="h-4 w-4" />
                </a>
              }
            </div>
          </div>

          <div>
            <h3 class="text-sm font-bold uppercase tracking-wide">Contáctanos</h3>
            <p class="mt-4 flex gap-2 text-sm text-white/80"><app-icon name="Mail" class="mt-0.5 h-4 w-4 shrink-0" /><span class="min-w-0 break-words">{{ sitio()?.correoSoporte }}</span></p>
            <p class="mt-3 flex gap-2 text-sm text-white/80"><app-icon name="Phone" class="mt-0.5 h-4 w-4 shrink-0" /><span>{{ sitio()?.telefonoPie }}</span></p>
            @if (sitio()?.ciudadesPie ?? "Quito · Guayaquil · Cuenca"; as ciudades) {
              <p class="mt-3 flex gap-2 text-sm text-white/80"><app-icon name="MapPin" class="mt-0.5 h-4 w-4 shrink-0" /><span>{{ ciudades }}</span></p>
            }
          </div>

          <div>
            <h3 class="text-sm font-bold uppercase tracking-wide">Información</h3>
            <ul class="mt-2 text-sm text-white/70">
              @for (l of informacion(); track $index) {
                <li>@if (externo(l.to)) { <a [href]="l.to" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-white">{{ l.label }}</a> } @else { <a [routerLink]="l.to" class="transition-colors hover:text-white">{{ l.label }}</a> }</li>
                @if (l.to === "/privacidad") { <li><button type="button" class="text-left text-sm transition-colors hover:text-white" (click)="consentimiento.abrir()">Preferencias de cookies</button></li> }
              }
              @if (!hayPrivacidad()) { <li><button type="button" class="text-left text-sm transition-colors hover:text-white" (click)="consentimiento.abrir()">Preferencias de cookies</button></li> }
            </ul>
          </div>

          <div>
            <h3 class="text-sm font-bold uppercase tracking-wide">Atención al cliente</h3>
            <ul class="mt-2 text-sm text-white/70">
              <li><a [href]="sitio()?.agenciasUrl || 'https://www.banco-solidario.com'" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-white">{{ sitio()?.agenciasTexto || "Encuentra tu agencia " + brand.marca().nombre }}</a></li>
              @for (l of atencion(); track $index) {
                <li>@if (externo(l.to)) { <a [href]="l.to" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-white">{{ l.label }}</a> } @else { <a [routerLink]="l.to" class="transition-colors hover:text-white">{{ l.label }}</a> }</li>
              }
            </ul>
          </div>
        </div>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-center text-sm text-white/80">
          <span>{{ brand.marca().derechos }}</span>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  protected readonly consentimiento = inject(ConsentimientoService);
  private readonly catalog = inject(CatalogService);
  protected readonly brand = inject(BrandService);
  protected readonly sitio = computed(() => this.catalog.config()?.sitio);
  /** Enlaces del pie: los configurados en Admin → Configuración → Enlaces del pie, o los de siempre. */
  protected readonly informacion = computed(() => (this.sitio()?.pie?.informacion?.length ? this.sitio()!.pie!.informacion! : PIE_INFORMACION));
  protected readonly atencion = computed(() => (this.sitio()?.pie?.atencion?.length ? this.sitio()!.pie!.atencion! : PIE_ATENCION));
  /** Si el admin quitó el enlace a la política de privacidad, el botón de cookies se muestra igual al final de la lista. */
  protected readonly hayPrivacidad = computed(() => this.informacion().some((l) => l.to === "/privacidad"));
  protected externo(to: string) {
    return /^https?:\/\//i.test(to);
  }
  private readonly todas = [
    { key: "facebook", icon: "Facebook", label: "Facebook" },
    { key: "x", icon: "Twitter", label: "X" },
    { key: "linkedin", icon: "Linkedin", label: "LinkedIn" },
    { key: "instagram", icon: "Instagram", label: "Instagram" },
    { key: "tiktok", icon: "Music2", label: "TikTok" },
    { key: "youtube", icon: "Youtube", label: "YouTube" },
  ];
  /** Solo se muestran las redes que el admin configuró. */
  protected readonly socials = computed(() => this.todas.map((s) => ({ ...s, url: this.sitio()?.redes[s.key] ?? "" })).filter((s) => s.url));
}

/* ------------------------------------------------------------------ */
/* WhatsApp                                                            */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-whatsapp-fab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [href]="enlace()" target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp"
      class="fixed bottom-6 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110">
      <svg role="img" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" class="h-7 w-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.465 3.49" />
      </svg>
    </a>
  `,
})
export class WhatsappFabComponent {
  private readonly catalog = inject(CatalogService);
  protected readonly enlace = computed(() => `https://wa.me/${(this.catalog.config()?.sitio.whatsapp ?? "").replace(/\D/g, "")}`);
}

/* ------------------------------------------------------------------ */
/* Aceptación de Términos y Política de privacidad: solo en el primer ingreso */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-legales-gate",
  imports: [MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:keydown)": "atrapar($event)" },
  template: `
    @if (legales.hayPendientes()) {
      <div class="fixed inset-0 z-[80] grid place-items-center bg-foreground/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="legales-titulo" aria-describedby="legales-desc">
        <div #caja tabindex="-1" class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl outline-none">
          <div class="shrink-0 border-b border-border px-6 py-4">
            <h2 id="legales-titulo" class="text-xl font-bold text-foreground">{{ titulo }}</h2>
            <p id="legales-desc" class="mt-1 text-sm text-muted-foreground">{{ subtitulo }}</p>
          </div>
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            @for (p of legales.pendientes(); track p.tipo) {
              <section class="rounded-xl border border-border p-4" [attr.aria-label]="p.nombre">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 class="font-semibold text-foreground">{{ p.nombre }}</h3>
                  <span class="text-xs text-muted-foreground">Versión {{ p.version }} · vigente desde {{ fecha(p.vigenteDesde) }}</span>
                </div>
                <button type="button" class="mt-3 text-sm font-semibold text-primary underline-offset-2 hover:underline" [attr.aria-expanded]="abierto() === p.tipo" (click)="abierto.set(abierto() === p.tipo ? '' : p.tipo)">
                  {{ abierto() === p.tipo ? 'Ocultar el texto' : 'Leer el texto completo' }}
                </button>
                @if (abierto() === p.tipo) {
                  <div class="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-4"><app-markdown [texto]="p.texto" /></div>
                }
                <label class="mt-3 flex cursor-pointer items-start gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <input type="checkbox" class="mt-0.5 h-5 w-5 shrink-0" [checked]="aceptados().has(p.tipo)" (change)="marcar(p.tipo, $any($event.target).checked)" />
                  <span>{{ declaracion(p.tipo) }}</span>
                </label>
              </section>
            }
            @if (legales.error()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ legales.error() }}</p> }
          </div>
          <div class="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
            <button type="button" class="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted" (click)="sesion.salir()">Cerrar sesión</button>
            <button type="button" class="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" [disabled]="!todoAceptado() || legales.enviando()" (click)="aceptar()">
              {{ legales.enviando() ? 'Guardando…' : 'Aceptar y continuar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class LegalesGateComponent {
  protected readonly legales = inject(LegalesService);
  protected readonly sesion = inject(SesionService);
  /** Cada documento se acepta por separado: hace falta marcar todos para continuar. */
  protected readonly aceptados = signal<ReadonlySet<string>>(new Set());
  protected readonly todoAceptado = computed(() => this.legales.pendientes().length > 0 && this.legales.pendientes().every((p) => this.aceptados().has(p.tipo)));
  protected readonly abierto = signal("");
  protected marcar(tipo: string, si: boolean) {
    this.aceptados.update((s) => { const n = new Set(s); if (si) n.add(tipo); else n.delete(tipo); return n; });
  }
  protected declaracion(tipo: string) {
    return tipo === "privacidad"
      ? "He leído y acepto la Política de privacidad y autorizo el uso y tratamiento de mis datos personales."
      : "He leído y acepto los Términos y condiciones de uso.";
  }
  private readonly caja = viewChild<ElementRef<HTMLElement>>("caja");
  /** Solo aparece en el primer ingreso: una vez aceptado, no vuelve a salir. */
  protected readonly titulo = "Antes de continuar";
  protected readonly subtitulo = "Es tu primer ingreso: para usar tu cuenta necesitamos que aceptes los Términos y condiciones y la Política de privacidad (uso y tratamiento de tus datos). Solo te lo pediremos esta vez.";
  protected fecha = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

  constructor() {
    effect(() => {
      if (this.legales.hayPendientes()) setTimeout(() => this.caja()?.nativeElement.focus({ preventScroll: true }));
      else this.aceptados.set(new Set());
    });
  }
  protected aceptar() {
    if (this.todoAceptado()) this.legales.aceptar();
  }
  /** El foco no sale del aviso mientras esté abierto. */
  protected atrapar(e: KeyboardEvent) {
    if (e.key !== "Tab" || !this.legales.hayPendientes()) return;
    const c = this.caja()?.nativeElement;
    if (!c) return;
    const f = [...c.querySelectorAll<HTMLElement>("button:not([disabled]),input,[tabindex]:not([tabindex='-1'])")];
    if (!f.length) return;
    const primero = f[0]!;
    const ultimo = f[f.length - 1]!;
    if (!c.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
    else if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }
}

/* ------------------------------------------------------------------ */
/* Layout del sitio del participante (ruta padre)                      */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-site-layout",
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, WhatsappFabComponent, ToasterComponent, LegalesGateComponent, PopupHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col bg-background font-sans">
      <a href="#contenido" class="skip-link" (click)="saltar($event)">Saltar al contenido</a>
      <app-site-header />
      <main id="contenido" tabindex="-1" class="flex-1 bg-surface outline-none"><router-outlet /></main>
      <app-site-footer />
      <app-whatsapp-fab />
      <a-toaster />
      <app-legales-gate />
      <app-popup-host />
    </div>
  `,
})
export class SiteLayoutComponent {
  /** El enlace lleva el foco al contenido sin recargar la ruta. */
  protected saltar(e: Event) {
    e.preventDefault();
    document.getElementById("contenido")?.focus();
  }
  constructor() {
    // Al volver del panel de administración se muestra lo último que se publicó.
    inject(CatalogService).refrescar();
    const legales = inject(LegalesService);
    legales.refrescar();
    // Tras cada navegación el foco pasa al contenido, para quien usa teclado o lector de pantalla.
    let primera = true;
    inject(Router).events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      legales.refrescar(); // también detecta una versión programada que ya entró en vigor

      if (primera) return void (primera = false);
      document.getElementById("contenido")?.focus({ preventScroll: true });
    });
  }
}
