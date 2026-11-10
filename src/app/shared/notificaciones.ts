import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { filter, interval } from "rxjs";
import { StoreService } from "../core/store.service";
import { haceTiempo } from "../core/tiempo";
import type { Notificacion } from "../core/models";
import { IconComponent } from "./icon.component";

export const ICONO_NOTIFICACION: Record<Notificacion["tipo"], string> = {
  pedido: "ShoppingBag", puntos: "Coins", beneficio: "Ticket", vuelo: "PlaneTakeoff", cuenta: "ShieldCheck", info: "Info",
};

/** Campanita del encabezado: contador de avisos sin leer y lista desplegable. */
@Component({
  selector: "app-campanita",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:click)": "fuera($event)", "(document:keydown.escape)": "abierto.set(false)" },
  template: `
    <div class="relative">
      <button type="button" data-compact (click)="alternar()" [attr.aria-expanded]="abierto()" aria-haspopup="true"
        [attr.aria-label]="store.noLeidas() ? 'Notificaciones, ' + store.noLeidas() + ' sin leer' : 'Notificaciones'"
        class="relative grid h-10 w-10 place-items-center rounded-full text-white transition-colors hover:bg-white/15 xl:h-12 xl:w-12">
        <app-icon name="Bell" class="h-6 w-6" />
        @if (store.noLeidas()) {
          <span aria-hidden="true" class="absolute right-1 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-extrabold text-ink shadow ring-2 ring-primary">{{ store.noLeidas() > 9 ? '9+' : store.noLeidas() }}</span>
        }
      </button>
      @if (abierto()) {
        <div role="region" aria-label="Lista de notificaciones" class="absolute right-0 top-full z-[60] mt-2 w-[22rem] max-w-[92vw] overflow-hidden rounded-2xl bg-card text-ink shadow-[0_18px_40px_-12px_rgba(20,25,37,0.4)]">
          <div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 class="text-base font-bold">Notificaciones</h2>
            @if (store.noLeidas()) { <button type="button" class="text-sm font-semibold text-primary hover:underline" (click)="store.marcarLeidas()">Marcar todas como leídas</button> }
          </div>
          <ul class="max-h-[26rem] divide-y divide-border overflow-y-auto">
            @for (n of recientes(); track n.id) {
              <li>
                <a [routerLink]="n.enlace || '/notificaciones'" (click)="abrir(n)" class="flex gap-3 px-4 py-3 hover:bg-muted" [class.bg-primary/5]="!n.leida">
                  <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><app-icon [name]="icono[n.tipo]" class="h-4 w-4" /></span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm" [class.font-bold]="!n.leida" [class.font-medium]="n.leida">{{ n.titulo }}</span>
                    <span class="block text-sm text-muted-foreground">{{ n.texto }}</span>
                    <span class="mt-0.5 block text-xs text-muted-foreground">{{ tiempo(n.fecha) }}</span>
                  </span>
                  @if (!n.leida) { <span class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Sin leer"></span> }
                </a>
              </li>
            } @empty {
              <li class="px-4 py-10 text-center text-sm text-muted-foreground">No tienes notificaciones.</li>
            }
          </ul>
          <a routerLink="/notificaciones" (click)="abierto.set(false)" class="block border-t border-border px-4 py-3 text-center text-sm font-bold text-primary hover:bg-muted">Ver todas</a>
        </div>
      }
    </div>
  `,
})
export class CampanitaComponent {
  protected readonly store = inject(StoreService);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  protected readonly abierto = signal(false);
  protected readonly icono = ICONO_NOTIFICACION;
  protected readonly tiempo = haceTiempo;
  protected recientes = () => this.store.notificaciones().slice(0, 6);

  constructor() {
    // Se actualiza al navegar y cada 30 s (con la API real sería un push o un sondeo corto).
    const nav = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    effect(() => {
      nav();
      this.store.cargarNotificaciones();
    });
    const tick = toSignal(interval(30_000));
    effect(() => {
      tick();
      this.store.cargarNotificaciones();
    });
  }
  protected alternar() {
    this.abierto.update((a) => !a);
    if (this.abierto()) this.store.cargarNotificaciones();
  }
  protected abrir(n: Notificacion) {
    if (!n.leida) this.store.marcarLeidas([n.id]);
    this.abierto.set(false);
  }
  protected fuera(e: Event) {
    if (this.abierto() && !this.el.nativeElement.contains(e.target as Node)) this.abierto.set(false);
  }
}