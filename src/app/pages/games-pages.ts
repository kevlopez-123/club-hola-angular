import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { StoreService } from "../core/store.service";
import { normalizarCodigo, type EstadoRuleta, type Premio, type ResultadoJuego } from "../core/juegos";
import { IconComponent } from "../shared/icon.component";
import { ModalComponent } from "../shared/ui";

type PremioGanado = ResultadoJuego["premio"];

const COLORES = ["var(--primary)", "var(--celeste)", "#513a73", "#437bd5"];

/** Ventana con el resultado (la comparten la ruleta y el código). */
@Component({
  selector: "app-premio-modal",
  imports: [IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (premio(); as p) {
      <app-modal [title]="p.tipo === 'nada' ? '¡Casi!' : '¡Felicitaciones!'" (closed)="closed.emit()">
        <div class="text-center">
          <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lima">
            <app-icon [name]="p.tipo === 'nada' ? 'Gift' : 'Trophy'" class="h-8 w-8 text-ink" />
          </span>
          <h3 class="mt-5 text-xl font-extrabold text-ink">{{ p.label }}</h3>
          <p class="mt-3 text-base text-muted-foreground">{{ p.detalle }}</p>
          @if (p.tipo !== 'nada') {
            <p class="mt-5 rounded-2xl bg-secondary px-5 py-4 text-left text-base text-ink">
              Tu premio es digital. Recibirás el cupón, vale, gift card o invitación en tu correo de entrega. Revisa también tu carpeta de spam.
            </p>
          }
          <button type="button" (click)="closed.emit()"
            class="mt-6 min-h-12 w-full rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Entendido</button>
        </div>
      </app-modal>
    }
  `,
})
export class PremioModalComponent {
  readonly premio = input<PremioGanado | null>(null);
  readonly closed = output<void>();
}

/* ------------------------------------------------------------------ */
/* Spin & Win                                                          */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-spin-win-page",
  imports: [IconComponent, PremioModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="mx-auto max-w-3xl text-center">
          <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">¡Gira la ruleta ganadora!</h1>
          <span class="mx-auto mt-3 block h-1 w-28 rounded-full bg-lima"></span>
          @if (estado(); as e) {
            <p class="mx-auto mt-5 max-w-xl text-base text-muted-foreground lg:text-lg">Tienes {{ e.girosMax }} giros a la semana.</p>
            <p class="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 rounded-full bg-card px-5 py-4 text-base text-ink shadow-[var(--shadow-card)]">
              <app-icon name="Info" class="h-5 w-5 shrink-0 text-primary" />
              @if (bloqueada()) { Usaste tus {{ e.girosMax }} giros. Vuelve el {{ e.proximaFecha }}. }
              @else { Te quedan {{ e.restantes }} de {{ e.girosMax }} giros esta semana. }
            </p>

            <div class="relative mx-auto mt-10 aspect-square w-full max-w-[26rem]">
              <span aria-hidden="true" class="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-ink"></span>
              <div class="relative h-full w-full overflow-hidden rounded-full shadow-[var(--shadow-card)] ring-8 ring-primary/20"
                [style.background]="fondo()" [style.transform]="'rotate(' + rotacion() + 'deg)'"
                [style.transition]="girando() ? 'transform 4s cubic-bezier(0.16, 1, 0.3, 1)' : null">
                @for (p of e.premios; track p.id; let i = $index) {
                  <div class="absolute bottom-1/2 left-1/2 h-1/2 w-24 origin-bottom" [style.transform]="'translateX(-50%) rotate(' + (i * angulo() + angulo() / 2) + 'deg)'">
                    <span class="absolute left-1/2 top-4 w-24 -translate-x-1/2 text-center text-xs font-extrabold leading-tight text-white drop-shadow sm:text-sm">{{ p.label }}</span>
                  </div>
                }
              </div>
              <button type="button" (click)="girar()" [disabled]="girando() || bloqueada()"
                class="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card text-base font-extrabold uppercase tracking-wide text-primary shadow-xl transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70 sm:h-28 sm:w-28">
                {{ girando() ? "..." : "Girar" }}
              </button>
            </div>
            @if (error()) { <p role="alert" class="mt-6 text-base font-semibold text-destructive">{{ error() }}</p> }
          } @else {
            <p role="status" class="mt-10 text-base text-muted-foreground">Cargando la ruleta…</p>
          }
          <p class="mt-8 text-base text-muted-foreground">Todos los premios son digitales: cupones, vales, gift cards e invitaciones.</p>
        </div>
      </div>
    </div>
    <app-premio-modal [premio]="premio()" (closed)="premio.set(null)" />
  `,
})
export class SpinWinPage {
  private readonly api = inject(ApiService);
  private readonly store = inject(StoreService);
  protected readonly estado = signal<EstadoRuleta | null>(null);
  protected readonly rotacion = signal(0);
  protected readonly girando = signal(false);
  protected readonly premio = signal<PremioGanado | null>(null);
  protected readonly error = signal("");

  protected readonly sectores = computed(() => Math.max(1, this.estado()?.premios.length ?? 1));
  protected readonly angulo = computed(() => 360 / this.sectores());
  protected readonly bloqueada = computed(() => (this.estado()?.restantes ?? 0) <= 0);
  protected readonly fondo = computed(() => {
    const n = this.sectores();
    const a = 360 / n;
    return `conic-gradient(${Array.from({ length: n }, (_, i) => `${COLORES[i % COLORES.length]} ${i * a}deg ${(i + 1) * a}deg`).join(", ")})`;
  });

  constructor() {
    this.api.get<EstadoRuleta>("juegos/ruleta").subscribe({ next: (e) => this.estado.set(e), error: () => this.error.set("No pudimos cargar la ruleta. Inténtalo otra vez.") });
  }

  protected girar() {
    if (this.girando() || this.bloqueada() || !this.store.exigirSesion()) return;
    this.error.set("");
    this.api.post<{ premio: PremioGanado; estado: EstadoRuleta }>("juegos/ruleta/girar", {}).subscribe({
      next: (r) => {
        const actual = this.estado();
        const idx = Math.max(0, (actual?.premios ?? []).findIndex((p) => p.id === r.premio.id));
        const a = this.angulo();
        const objetivo = 360 * 6 - (idx * a + a / 2);
        this.girando.set(true);
        this.rotacion.update((prev) => prev + objetivo - (prev % 360));
        setTimeout(() => {
          this.girando.set(false);
          this.estado.set(r.estado);
          this.premio.set(r.premio);
        }, 4200);
      },
      error: (e) => {
        this.error.set(this.store.mensajeError(e));
        this.api.get<EstadoRuleta>("juegos/ruleta").subscribe((x) => this.estado.set(x));
      },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Lucky Code                                                          */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-lucky-code-page",
  imports: [IconComponent, PremioModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="mx-auto max-w-xl text-center">
          <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Código promocional</h1>
          <span class="mx-auto mt-3 block h-1 w-40 rounded-full bg-lima"></span>

          <form class="mt-8 rounded-3xl bg-card p-7 shadow-[var(--shadow-card)] sm:p-9" (submit)="$event.preventDefault(); validar()">
            <span class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary"><app-icon name="Gift" class="h-10 w-10 text-primary" /></span>
            <h2 class="mt-5 text-xl font-extrabold text-ink sm:text-2xl">¡Valida tu código para ganar premios increíbles!</h2>

            <label for="codigo" class="sr-only">Código promocional</label>
            <input id="codigo" [value]="codigo()" (input)="alEscribir($any($event.target).value)" placeholder="76BC - H49A - 547F - WBB2" autocomplete="off"
              class="mt-6 h-14 w-full rounded-2xl border border-border bg-surface px-5 text-center text-base uppercase tracking-wide text-ink focus:ring-2 focus:ring-primary/50" />

            <div class="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
              <label class="flex items-center gap-3 text-base text-ink">
                <input type="checkbox" [checked]="robot()" (change)="robot.set($any($event.target).checked)" class="h-6 w-6 rounded border-border accent-[var(--primary)]" />
                No soy un robot
              </label>
              <span class="text-xs leading-tight text-muted-foreground">reCAPTCHA<br />Privacidad · Términos</span>
            </div>

            @if (error()) { <p role="alert" class="mt-4 text-base text-destructive">{{ error() }}</p> }

            <button type="submit" [disabled]="!codigo().trim() || !robot() || validando()"
              class="mt-6 min-h-12 w-full rounded-full bg-primary text-base font-bold text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-14">
              {{ validando() ? "Validando…" : "Validar mi código" }}
            </button>
          </form>
        </div>
      </div>
    </div>
    <app-premio-modal [premio]="premio()" (closed)="premio.set(null)" />
  `,
})
export class LuckyCodePage {
  private readonly api = inject(ApiService);
  private readonly store = inject(StoreService);
  protected readonly codigo = signal("");
  protected readonly robot = signal(false);
  protected readonly error = signal("");
  protected readonly validando = signal(false);
  protected readonly premio = signal<PremioGanado | null>(null);

  protected alEscribir(v: string) {
    this.codigo.set(normalizarCodigo(v).slice(0, 19));
  }

  protected validar() {
    if (!this.codigo().trim() || !this.robot() || this.validando() || !this.store.exigirSesion()) return;
    this.error.set("");
    this.validando.set(true);
    this.api.post<ResultadoJuego>("juegos/codigo", { codigo: this.codigo() }).subscribe({
      next: (r) => {
        this.validando.set(false);
        this.premio.set(r.premio);
        this.codigo.set("");
        this.robot.set(false);
      },
      error: (e) => {
        this.validando.set(false);
        this.error.set(this.store.mensajeError(e, "No pudimos validar el código. Inténtalo otra vez."));
      },
    });
  }
}

export type { Premio };
