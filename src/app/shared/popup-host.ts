import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from "@angular/core";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { filter } from "rxjs";
import { ApiService } from "../core/api.service";
import { LegalesService } from "../core/legales.service";
import { debeMostrar, type HistorialPopups, type PopupPublico } from "../core/popups";
import { SesionService } from "../core/sesion.service";
import { IconComponent } from "./icon.component";

const LS = "bancosolidario_popups";
const SS = "bancosolidario_popups_sesion";

const leer = <T>(clave: string, def: T, almacen: Storage | undefined): T => {
  try { return JSON.parse(almacen?.getItem(clave) ?? "null") ?? def; } catch { return def; }
};
const guardar = (clave: string, valor: unknown, almacen: Storage | undefined) => {
  try { almacen?.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento: se muestra según la sesión */ }
};
const almacen = (tipo: "local" | "session"): Storage | undefined => {
  try { return tipo === "local" ? localStorage : sessionStorage; } catch { return undefined; }
};

/**
 * Pop-ups del sitio (Admin → Pop-ups): se piden al servidor por página, se muestran de uno en uno respetando la frecuencia de cada
 * uno (una vez por sesión, una sola vez, cada N días o siempre) y nunca tapan el aviso de textos legales. Cuentan vistas, clics y cierres.
 * La app Android usa el mismo `GET popups?canal=app`.
 */
@Component({
  selector: "app-popup-host",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (actual(); as p) {
      <div class="fixed inset-0 z-[90] flex items-center justify-center bg-ink/60 p-4" (keydown)="atrapar($event)">
        <div #caja role="dialog" aria-modal="true" [attr.aria-labelledby]="p.formato === 'imagen' ? null : 'popup-t-' + p.id" [attr.aria-label]="p.formato === 'imagen' ? p.titulo : null" tabindex="-1"
          class="animate-fade-up relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-2xl outline-none">
          <button type="button" aria-label="Cerrar" (click)="cerrar(p)"
            class="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-card/90 text-ink shadow hover:bg-card">
            <app-icon name="X" class="h-5 w-5" />
          </button>
          @if (p.formato === 'imagen') {
            <!-- Solo imagen: la imagen es todo el pop-up y, si tiene enlace, es el botón. -->
            @if (p.enlace && interno(p.enlace)) {
              <a [routerLink]="p.enlace" (click)="clic(p)" class="block"><img [src]="p.imagen" [alt]="p.titulo" class="max-h-[85vh] w-full object-contain" /></a>
            } @else if (p.enlace) {
              <a [href]="p.enlace" target="_blank" rel="noopener noreferrer" (click)="clic(p)" class="block"><img [src]="p.imagen" [alt]="p.titulo" class="max-h-[85vh] w-full object-contain" /></a>
            } @else {
              <img [src]="p.imagen" [alt]="p.titulo" class="max-h-[85vh] w-full object-contain" />
            }
          } @else {
          @if (p.imagen) { <img [src]="p.imagen" alt="" class="aspect-[16/9] w-full object-cover" /> }
          <div class="overflow-y-auto p-6">
            <h2 [id]="'popup-t-' + p.id" class="text-xl font-extrabold text-ink">{{ p.titulo }}</h2>
            @if (p.mensaje) { <p class="mt-3 whitespace-pre-line text-base leading-relaxed text-ink">{{ p.mensaje }}</p> }
            @if (p.boton && p.enlace) {
              @if (interno(p.enlace)) {
                <a [routerLink]="p.enlace" (click)="clic(p)" class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold uppercase tracking-wide text-primary-foreground">{{ p.boton }}</a>
              } @else {
                <a [href]="p.enlace" target="_blank" rel="noopener noreferrer" (click)="clic(p)" class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold uppercase tracking-wide text-primary-foreground">{{ p.boton }}</a>
              }
            }
            <button type="button" (click)="cerrar(p)" class="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-muted-foreground hover:text-ink">Cerrar</button>
          </div>
          }
        </div>
      </div>
    }
  `,
})
export class PopupHostComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly legales = inject(LegalesService);
  private readonly caja = viewChild<ElementRef<HTMLElement>>("caja");

  /** Pendientes de esta página, ya filtrados por frecuencia. */
  private readonly cola = signal<PopupPublico[]>([]);
  private readonly cerrados = signal<Set<string>>(new Set());
  protected readonly actual = computed(() => {
    if (!this.sesion.logged() || this.legales.hayPendientes()) return null;
    return this.cola().find((p) => !this.cerrados().has(p.id)) ?? null;
  });
  private vistoId = "";

  constructor() {
    this.cargar(this.router.url);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => this.cargar(e.urlAfterRedirects));
    // Al mostrarse uno: se anota (frecuencia), se cuenta la vista y el foco pasa al cuadro.
    effect(() => {
      const p = this.actual();
      if (!p || p.id === this.vistoId) return;
      this.vistoId = p.id;
      untracked(() => {
        this.anotar(p);
        this.evento(p, "vista");
        setTimeout(() => this.caja()?.nativeElement.focus({ preventScroll: true }));
      });
    });
  }

  protected interno = (e: string) => e.startsWith("/");

  private cargar(url: string) {
    if (!this.sesion.logged() || url.startsWith("/admin") || url.startsWith("/login")) { this.cola.set([]); return; }
    const pagina = url.split(/[?#]/)[0] === "/" ? "inicio" : "otra";
    this.api.get<PopupPublico[]>("popups", { canal: "web", pagina }).subscribe({
      next: (lista) => {
        const historial = leer<HistorialPopups>(LS, {}, almacen("local"));
        const sesionVistos = new Set(leer<string[]>(SS, [], almacen("session")));
        this.cola.set(lista.filter((p) => debeMostrar(p, historial, Date.now(), sesionVistos)));
        this.cerrados.set(new Set());
        this.vistoId = "";
      },
      error: () => this.cola.set([]), // un pop-up nunca debe estorbar: si falla, no se muestra
    });
  }

  private anotar(p: PopupPublico) {
    const h = leer<HistorialPopups>(LS, {}, almacen("local"));
    h[p.id] = { ultima: Date.now(), vistas: (h[p.id]?.vistas ?? 0) + 1 };
    guardar(LS, h, almacen("local"));
    const s = new Set(leer<string[]>(SS, [], almacen("session")));
    s.add(p.id);
    guardar(SS, [...s], almacen("session"));
  }
  private evento(p: PopupPublico, tipo: "vista" | "clic" | "cierre") {
    this.api.post(`popups/${p.id}/evento`, { canal: "web", tipo }).subscribe({ error: () => undefined });
  }
  private ocultar(p: PopupPublico) {
    this.cerrados.update((c) => new Set(c).add(p.id));
    this.vistoId = "";
  }
  protected cerrar(p: PopupPublico) {
    this.evento(p, "cierre");
    this.ocultar(p);
  }
  protected clic(p: PopupPublico) {
    this.evento(p, "clic");
    this.ocultar(p);
  }

  /** El foco no sale del pop-up mientras está abierto; Escape lo cierra. */
  protected atrapar(e: KeyboardEvent) {
    const p = this.actual();
    if (!p) return;
    if (e.key === "Escape") { e.stopPropagation(); this.cerrar(p); return; }
    if (e.key !== "Tab") return;
    const c = this.caja()?.nativeElement;
    const f = c ? [...c.querySelectorAll<HTMLElement>("a[href],button:not([disabled])")] : [];
    if (!c || !f.length) return;
    const primero = f[0]!;
    const ultimo = f[f.length - 1]!;
    if (!c.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
    else if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }
}
