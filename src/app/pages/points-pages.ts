import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CatalogService } from "../core/catalog.service";
import { StoreService, type ResultadoCompraPuntos, type ResultadoPasarela } from "../core/store.service";
import { formatPuntos, formatUSD } from "../core/format";
import { ToastService } from "../shared/toast";
import { IconComponent } from "../shared/icon.component";
import { ModalComponent } from "../shared/ui";
import { PaymentGatewayModalComponent } from "../shared/widgets";

const numeros = (v: string) => v.replace(/\D/g, "");

/* ------------------------------------------------------------------ */
/* Compra de puntos                                                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-compra-puntos-page",
  imports: [RouterLink, IconComponent, PaymentGatewayModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (listo() && store.ultimaCompraPuntos(); as u) {
      <div class="bg-surface py-16">
        <div class="page-container">
          <div class="mx-auto max-w-xl rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary"><app-icon name="CheckCircle2" class="h-8 w-8 text-primary" /></span>
            <h1 class="mt-5 text-2xl font-extrabold text-ink">¡Tus puntos ya están acreditados!</h1>
            <p class="mt-3 text-sm text-muted-foreground">Operación {{ u.codigo }} confirmada con tu tarjeta.</p>
            <dl class="mt-6 space-y-2 rounded-2xl bg-surface p-5 text-left text-sm">
              <div class="flex justify-between"><dt class="text-muted-foreground">Puntos comprados</dt><dd class="font-semibold text-ink">{{ puntos(u.cantidad) }}</dd></div>
              <div class="flex justify-between"><dt class="text-muted-foreground">Monto pagado</dt><dd class="font-semibold text-ink">{{ usd(u.monto) }}</dd></div>
              <div class="flex justify-between"><dt class="text-muted-foreground">Nuevo saldo</dt><dd class="font-extrabold text-ink">{{ puntos(store.puntos()) }} puntos</dd></div>
            </dl>
            <div class="mt-7 flex flex-wrap justify-center gap-3">
              <a routerLink="/canjea" class="inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Canjear ahora</a>
              <button type="button" (click)="reiniciar()"
                class="inline-flex min-h-12 items-center rounded-full border border-border px-7 text-base font-bold uppercase tracking-wide text-ink hover:border-primary hover:text-primary lg:min-h-14">
                Comprar más puntos
              </button>
            </div>
          </div>
        </div>
      </div>
    } @else if (resultado()?.estado === 'Fallida') {
      <div class="bg-surface py-16">
        <div class="page-container">
          <div role="alert" class="mx-auto max-w-xl rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10"><app-icon name="AlertTriangle" class="h-8 w-8 text-destructive" /></span>
            <h1 class="mt-5 text-2xl font-extrabold text-ink">No pudimos procesar tu pago</h1>
            <p class="mt-3 text-sm text-muted-foreground">{{ resultado()!.motivo }}. No se realizó ningún cargo y tus puntos no cambiaron.</p>
            <p class="mt-1 text-sm text-muted-foreground">Operación {{ resultado()!.codigo }}</p>
            <div class="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" (click)="reintentar()" class="inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Reintentar pago</button>
              <button type="button" (click)="reiniciar()" class="inline-flex min-h-12 items-center rounded-full border border-border px-7 text-base font-bold uppercase tracking-wide text-ink hover:border-primary hover:text-primary lg:min-h-14">Cambiar monto</button>
            </div>
          </div>
        </div>
      </div>
      <app-payment-gateway-modal [open]="pasarela()" [monto]="compra()?.monto ?? monto()" (closed)="pasarela.set(false)" (resultado)="onResultado($event)" />
    } @else if (resultado()?.estado === 'Pendiente') {
      <div class="bg-surface py-16">
        <div class="page-container">
          <div role="status" class="mx-auto max-w-xl rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary"><app-icon name="Clock" class="h-8 w-8 text-primary" /></span>
            <h1 class="mt-5 text-2xl font-extrabold text-ink">Estamos confirmando tu pago</h1>
            <p class="mt-3 text-sm text-muted-foreground">El banco aún no confirma la operación {{ resultado()!.codigo }}. Cuando lo haga acreditaremos tus puntos y te avisaremos; no necesitas pagar de nuevo.</p>
            <div class="mt-7 flex flex-wrap justify-center gap-3">
              <a routerLink="/notificaciones" class="inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Ver notificaciones</a>
              <button type="button" (click)="reiniciar()" class="inline-flex min-h-12 items-center rounded-full border border-border px-7 text-base font-bold uppercase tracking-wide text-ink hover:border-primary hover:text-primary lg:min-h-14">Volver</button>
            </div>
          </div>
        </div>
      </div>
    } @else if (!reglas().compraActiva) {
      <div class="bg-surface py-16">
        <div class="page-container">
          <div class="mx-auto max-w-xl rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-card)]">
            <h1 class="text-2xl font-extrabold text-ink">La compra de puntos no está disponible por ahora</h1>
            <p class="mt-3 text-sm text-muted-foreground">Vuelve a intentarlo más tarde o canjea con los puntos que ya tienes.</p>
            <a routerLink="/canjea" class="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Ver productos</a>
          </div>
        </div>
      </div>
    } @else {
      <div class="bg-surface py-12">
        <div class="page-container">
          <div class="mx-auto max-w-2xl">
            <h1 class="text-2xl font-extrabold text-ink sm:text-3xl">Compra de puntos</h1>
            <p class="mt-2 text-sm text-muted-foreground">Tienes {{ puntos(store.puntos()) }} puntos. Cada punto cuesta {{ usd(reglas().precio) }}.</p>

            <div class="mt-6 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                @for (p of paquetes(); track p) {
                  <button type="button" (click)="cantidad.set(p)"
                    [class]="'min-h-14 rounded-2xl border px-4 py-4 text-center transition-colors ' + (cantidad() === p ? 'border-primary bg-secondary/40' : 'border-border')">
                    <span class="block text-base font-extrabold text-ink">{{ puntos(p) }}</span>
                    <span class="block text-sm text-muted-foreground">{{ usd(p * reglas().precio) }}</span>
                  </button>
                }
              </div>

              <label class="mt-6 block text-base font-semibold text-ink">
                O ingresa la cantidad exacta de puntos (entre {{ puntos(reglas().min) }} y {{ puntos(reglas().max) }})
                <input type="number" [min]="reglas().min" [max]="reglas().max" step="500" [value]="cantidad()" (input)="cantidad.set(max0($any($event.target).value))"
                  class="mt-1 h-12 w-full rounded-xl border border-border px-4 text-base" />
              </label>

              <div class="mt-6 flex items-center justify-between rounded-2xl bg-surface p-5">
                <span class="flex items-center gap-2 text-base font-semibold text-ink"><app-icon name="Coins" class="h-5 w-5 text-primary" /> Total a pagar</span>
                <span class="text-2xl font-extrabold text-ink">{{ usd(monto()) }}</span>
              </div>

              @if (cantidad() > 0 && !valida()) {
                <p role="alert" class="mt-2 text-sm text-destructive">La cantidad debe estar entre {{ puntos(reglas().min) }} y {{ puntos(reglas().max) }} puntos.</p>
              }
              <button type="button" [disabled]="!valida() || iniciando()" (click)="comprar()"
                class="mt-6 min-h-12 w-full rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 lg:min-h-14">
                Comprar puntos
              </button>
              <p class="mt-3 text-center text-base text-muted-foreground">El cargo se realiza con tu tarjeta de débito o crédito.</p>
            </div>

            <section class="mt-10">
              <h2 class="text-lg font-extrabold text-ink">Consideraciones</h2>
              <ul class="mt-3 list-disc space-y-2 pl-5 text-base text-muted-foreground">
                @for (c of condiciones(); track c) { <li>{{ c }}</li> }
              </ul>
            </section>
          </div>
        </div>
      </div>

      <app-payment-gateway-modal [open]="pasarela()" [monto]="compra()?.monto ?? monto()" (closed)="pasarela.set(false)" (resultado)="onResultado($event)" />
    }
  `,
})
export class CompraPuntosPage {
  protected readonly store = inject(StoreService);
  private readonly catalog = inject(CatalogService);
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  private readonly toast = inject(ToastService);
  protected readonly reglas = this.catalog.reglas;
  /** Opciones rápidas configuradas en el panel (solo las que caen entre el mínimo y el máximo). */
  protected readonly paquetes = computed(() => (this.reglas().paquetes ?? []).filter((p) => p >= this.reglas().min && p <= this.reglas().max));

  protected readonly cantidad = signal(5000);
  protected readonly pasarela = signal(false);
  protected readonly listo = signal(false);
  protected readonly monto = computed(() => this.cantidad() * this.reglas().precio);
  protected readonly valida = computed(() => this.cantidad() >= this.reglas().min && this.cantidad() <= this.reglas().max);
  protected readonly condiciones = computed(() => this.catalog.config()?.condicionesCompra ?? []);

  protected max0(v: string) {
    return Math.max(0, Number(v));
  }
  /** Compra creada en el servidor (pendiente de pago) y resultado de la pasarela. */
  protected readonly compra = signal<{ codigo: string; cantidad: number; monto: number } | null>(null);
  protected readonly resultado = signal<ResultadoCompraPuntos | null>(null);
  protected readonly iniciando = signal(false);

  /** Paso 1: se crea la compra con las reglas validadas por el servidor y se abre la pasarela. */
  protected comprar() {
    this.iniciando.set(true);
    this.store.iniciarCompraPuntos(this.cantidad()).subscribe({
      next: (c) => {
        this.compra.set(c);
        this.iniciando.set(false);
        this.pasarela.set(true);
      },
      error: (e) => {
        this.iniciando.set(false);
        this.toast.error(this.store.mensajeError(e));
      },
    });
  }
  /** Paso 2: la pasarela respondió: se registra y se muestra aprobado, rechazado (con reintento) o pendiente. */
  protected onResultado(r: ResultadoPasarela) {
    const compra = this.compra();
    this.pasarela.set(false);
    if (!compra) return;
    this.store.pagarCompraPuntos(compra, r).subscribe({
      next: (res) => {
        this.resultado.set(res);
        if (res.estado === "Aprobada") this.listo.set(true);
      },
      error: (e) => this.toast.error(this.store.mensajeError(e)),
    });
  }
  protected reintentar() {
    this.pasarela.set(true);
  }
  protected reiniciar() {
    this.resultado.set(null);
    this.compra.set(null);
    this.listo.set(false);
  }
}
