import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { StoreService } from "../core/store.service";
import { AnaliticaService } from "../core/analitica.service";
import { formatUSD } from "../core/format";
import { IconComponent } from "../shared/icon.component";
import { ModalComponent } from "../shared/ui";
import { PaymentGatewayModalComponent } from "../shared/widgets";

/* ------------------------------------------------------------------ */
/* Carrito                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-carrito-page",
  imports: [RouterLink, IconComponent, ModalComponent, PaymentGatewayModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.items().length === 0) {
      <div class="bg-surface py-20">
        <div class="page-container">
          <div class="mx-auto max-w-md rounded-3xl bg-card p-10 text-center shadow-[var(--shadow-card)]">
            <h1 class="text-2xl font-extrabold text-ink">Tu carrito está vacío</h1>
            <p class="mt-3 text-sm text-muted-foreground">Explora el catálogo y descubre beneficios exclusivos para ti.</p>
            <a routerLink="/beneficios" class="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Ver beneficios</a>
          </div>
        </div>
      </div>
    } @else {
      <div class="bg-surface py-10">
        <div class="page-container">
          <h1 class="text-2xl font-extrabold text-ink sm:text-3xl">Tu carrito</h1>

          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div class="space-y-4">
              @for (i of store.items(); track i.id) {
                <article class="grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
                  <img [src]="i.imagen" [alt]="i.nombre" width="160" height="160" class="h-24 w-24 shrink-0 rounded-xl object-cover" />
                  <div class="min-w-0">
                    <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ i.marca }}</p>
                    <h2 class="truncate text-sm font-bold text-ink">{{ i.nombre }}</h2>
                    <p class="mt-1 text-sm font-extrabold text-ink">{{ usd(i.precio * i.cantidad) }}</p>
                    <div class="mt-3 flex flex-wrap items-center gap-3">
                      <div class="flex items-center gap-3 rounded-full border border-border px-3 py-1.5">
                        <button type="button" aria-label="Quitar uno" (click)="store.setCantidad(i.id, i.cantidad - 1)" class="grid h-11 w-11 place-items-center text-ink"><app-icon name="Minus" class="h-4 w-4" /></button>
                        <span class="w-6 text-center text-sm font-bold text-ink">{{ i.cantidad }}</span>
                        <button type="button" aria-label="Agregar uno" (click)="store.setCantidad(i.id, i.cantidad + 1)" class="grid h-11 w-11 place-items-center text-ink"><app-icon name="Plus" class="h-4 w-4" /></button>
                      </div>
                      <button type="button" (click)="store.remove(i.id)" class="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline">
                        <app-icon name="Trash2" class="h-4 w-4" /> Eliminar
                      </button>
                      <span class="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-ink">Digital</span>
                    </div>
                  </div>
                </article>
              }

              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="text-base font-bold text-ink">Correo de entrega</h2>
                <p class="mt-1 text-sm text-muted-foreground">Recibirás tus beneficios digitales en este correo.</p>
                <div class="mt-4 space-y-3">
                  @for (c of store.correos(); track c) {
                    <label [class]="'flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm transition-colors ' + (correo() === c ? 'border-primary bg-secondary/40' : 'border-border')">
                      <input type="radio" name="correo" [checked]="correo() === c" (change)="correoSel.set(c)" />
                      <span class="truncate text-ink">{{ c }}</span>
                    </label>
                  }
                  <button type="button" (click)="modalCorreo.set(true)"
                    class="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
                    <app-icon name="Mail" class="h-4 w-4" /> Agregar otro correo
                  </button>
                </div>
              </section>
            </div>

            <aside class="h-fit rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-6">
              <h2 class="text-base font-bold text-ink">Resumen</h2>
              <div class="mt-4 rounded-2xl border border-primary bg-secondary/40 p-4 text-sm text-ink">
                <p class="font-semibold">Pago con tarjeta del banco</p>
                <p class="mt-1 text-muted-foreground">Los beneficios se pagan con tu tarjeta de débito o crédito del banco.</p>
              </div>

              <div class="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div class="flex justify-between text-muted-foreground"><span>Subtotal ({{ store.totalItems() }} beneficios)</span><span>{{ usd(store.totalMonto()) }}</span></div>
                <div class="flex justify-between text-base font-extrabold text-ink"><span>A pagar con tarjeta</span><span>{{ usd(store.totalMonto()) }}</span></div>
              </div>

              @if (error()) {
                <p role="alert" class="mt-3 rounded-xl bg-aviso-fondo p-3 text-xs font-semibold text-aviso">{{ error() }}</p>
              }

              <button type="button" [disabled]="!correo()" (click)="pagar()"
                class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">
                <app-icon name="CreditCard" class="h-4 w-4" /> Finalizar compra
              </button>
              <p class="mt-3 text-center text-[11px] text-muted-foreground">Todo pago se valida con tu tarjeta de débito o crédito del banco.</p>
            </aside>
          </div>
        </div>
      </div>

      <app-modal [open]="modalCorreo()" title="Agregar correo" (closed)="modalCorreo.set(false)">
        <label class="text-sm font-medium text-ink">
          Correo electrónico
          <input type="email" [value]="nuevoCorreo()" (input)="nuevoCorreo.set($any($event.target).value)" class="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
        </label>
        <button type="button" (click)="guardarCorreo()" class="mt-5 w-full rounded-full bg-primary py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Guardar correo</button>
      </app-modal>

      <app-payment-gateway-modal [open]="pasarela()" [monto]="store.totalMonto()" (closed)="pasarela.set(false)" (pagado)="confirmar($event)" />
    }
  `,
})
export class CarritoPage {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);
  private readonly analitica = inject(AnaliticaService);
  protected readonly usd = formatUSD;
  protected readonly error = signal("");

  protected readonly correoSel = signal<string | null>(null);
  protected readonly modalCorreo = signal(false);
  protected readonly pasarela = signal(false);
  protected readonly nuevoCorreo = signal("");

  protected readonly correo = computed(() => this.correoSel() ?? this.store.correos()[0] ?? "");

  protected guardarCorreo() {
    const c = this.nuevoCorreo().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return;
    this.store.addCorreo(c);
    this.correoSel.set(c);
    this.nuevoCorreo.set("");
    this.modalCorreo.set(false);
  }

  protected pagar() {
    this.error.set("");
    if (!this.correo()) return;
    this.analitica.registrar({ tipo: "inicio_pago" });
    this.pasarela.set(true);
  }

  /** La tarjeta del banco validó el pago: se confirma la compra en el servidor. */
  protected confirmar(tarjeta: string) {
    this.pasarela.set(false);
    this.store
      .finalizarCompra({ items: this.store.items(), montoUSD: this.store.totalMonto(), entrega: `Entrega digital a ${this.correo()}`, tarjeta })
      .subscribe({
        next: () => this.router.navigate(["/gracias"]),
        error: (e) => this.error.set(this.store.mensajeError(e)),
      });
  }
}

/* ------------------------------------------------------------------ */
/* Gracias                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-gracias-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-12">
      <div class="page-container">
        <div class="mx-auto max-w-3xl rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)] sm:p-10">
          <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary"><app-icon name="CheckCircle2" class="h-8 w-8 text-primary" /></span>
          <h1 class="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">¡Gracias por tu compra!</h1>
          @if (store.ultimaOrden(); as o) {
            <p class="mt-3 text-sm text-muted-foreground">
              Tu orden {{ o.codigo }} fue confirmada el {{ o.fecha }}{{ o.hora ? " a las " + o.hora : "" }}. Te enviamos tus beneficios por correo; revisa también tu carpeta de spam.
            </p>

            <div class="mt-7 text-left">
              <div class="space-y-3">
                @for (i of o.items; track i.id) {
                  <div class="flex items-center gap-4 rounded-2xl bg-surface p-3">
                    <img [src]="i.imagen" [alt]="i.nombre" width="120" height="120" class="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-ink">{{ i.nombre }}</p>
                      <p class="text-xs text-muted-foreground">{{ i.marca }} · x{{ i.cantidad }}</p>
                    </div>
                    <p class="shrink-0 text-sm font-extrabold text-ink">{{ usd(i.precio * i.cantidad) }}</p>
                  </div>
                }
              </div>

              <dl class="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div class="flex justify-between"><dt class="text-muted-foreground">Pagado con tarjeta</dt><dd class="font-semibold text-ink">{{ usd(o.montoUSD) }}</dd></div>
                <div class="flex justify-between"><dt class="text-muted-foreground">Entrega</dt><dd class="max-w-[60%] text-right font-semibold text-ink">{{ o.entrega }}</dd></div>
              </dl>
            </div>
          } @else {
            <p class="mt-3 text-sm text-muted-foreground">Tu compra fue confirmada. Revisa tu correo para ver tus beneficios.</p>
          }

          <div class="mt-7 flex flex-wrap justify-center gap-3">
            @if (store.ultimaOrden(); as o) {
              <a [routerLink]="['/mis-compras', o.codigo]" class="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-7 py-3 text-center text-base font-bold uppercase tracking-wide text-ink hover:border-primary hover:text-primary">Ver mi compra</a>
            }
            <a routerLink="/beneficios" class="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 text-center text-base font-bold uppercase tracking-wide text-primary-foreground">Seguir explorando</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class GraciasPage {
  protected readonly store = inject(StoreService);
  protected readonly usd = formatUSD;
}
