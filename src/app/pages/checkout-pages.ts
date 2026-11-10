import { BrandService } from "../core/brand.service";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { StoreService, type ResultadoPasarela } from "../core/store.service";
import { AnaliticaService } from "../core/analitica.service";
import { CatalogService } from "../core/catalog.service";
import { formatPuntos, formatUSD } from "../core/format";
import type { Direccion } from "../core/models";
import { IconComponent } from "../shared/icon.component";
import { DireccionFormComponent } from "../shared/direccion-form";
import { erroresDireccion } from "../core/validar-direccion";
import { ModalComponent } from "../shared/ui";
import { ToastService } from "../shared/toast";
import { PaymentGatewayModalComponent } from "../shared/widgets";

type Modo = "puntos" | "mixto" | "dinero";

/* ------------------------------------------------------------------ */
/* Carrito                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-carrito-page",
  imports: [RouterLink, IconComponent, ModalComponent, PaymentGatewayModalComponent, DireccionFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.items().length === 0) {
      <div class="bg-surface py-20">
        <div class="page-container">
          <div class="mx-auto max-w-md rounded-3xl bg-card p-10 text-center shadow-[var(--shadow-card)]">
            <h1 class="text-2xl font-extrabold text-ink">Tu carrito está vacío</h1>
            <p class="mt-3 text-sm text-muted-foreground">Explora el catálogo y canjea tus puntos por increíbles premios.</p>
            <a routerLink="/canjea" class="mt-6 inline-block rounded-full bg-primary px-8 py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Ver productos</a>
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
                    <p class="mt-1 text-sm font-extrabold text-ink">{{ i.soloDinero ? usd(i.precio * i.cantidad) : puntos(i.puntos * i.cantidad) + " puntos" }}</p>
                    <div class="mt-3 flex flex-wrap items-center gap-3">
                      <div class="flex items-center gap-3 rounded-full border border-border px-3 py-1.5">
                        <button type="button" aria-label="Quitar uno" (click)="store.setCantidad(i.id, i.cantidad - 1)" class="grid h-11 w-11 place-items-center text-ink"><app-icon name="Minus" class="h-4 w-4" /></button>
                        <span class="w-6 text-center text-sm font-bold text-ink">{{ i.cantidad }}</span>
                        <button type="button" aria-label="Agregar uno" (click)="store.setCantidad(i.id, i.cantidad + 1)" class="grid h-11 w-11 place-items-center text-ink"><app-icon name="Plus" class="h-4 w-4" /></button>
                      </div>
                      <button type="button" (click)="store.remove(i.id)" class="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline">
                        <app-icon name="Trash2" class="h-4 w-4" /> Eliminar
                      </button>
                      <span class="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-ink">{{ i.digital ? "Digital" : "Envío físico" }}</span>
                      @if (i.soloDinero) {
                        <span class="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-primary">Solo con tarjeta</span>
                      }
                    </div>
                  </div>
                </article>
              }

              <section class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 class="text-base font-bold text-ink">{{ hayFisicos() ? "Dirección de envío" : "Correo de entrega" }}</h2>

                @if (hayFisicos()) {
                  <div class="mt-4 space-y-3">
                    @for (d of store.direcciones(); track d.id) {
                      <label [class]="'flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ' + (direccionId() === d.id ? 'border-primary bg-secondary/40' : 'border-border')">
                        <input type="radio" name="direccion" [checked]="direccionId() === d.id" (change)="direccionSel.set(d.id)" class="mt-0.5" />
                        <span class="min-w-0 text-sm">
                          <span class="block font-bold text-ink">{{ d.alias }} · {{ d.recibe }}</span>
                          <span class="block text-muted-foreground">{{ d.direccion }} — {{ d.distrito }}</span>
                          <span class="block text-muted-foreground">{{ d.telefono }}</span>
                          @if (d.lat != null && d.lng != null) {
                            <a [href]="'https://www.openstreetmap.org/?mlat=' + d.lat + '&mlon=' + d.lng + '#map=17/' + d.lat + '/' + d.lng" target="_blank" rel="noreferrer" (click)="$event.stopPropagation()" class="mt-1 inline-flex items-center gap-1 text-primary underline"><app-icon name="MapPin" class="h-3.5 w-3.5" /> Ver en el mapa</a>
                          }
                        </span>
                      </label>
                    }
                    <button type="button" (click)="modalDireccion.set(true)"
                      class="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
                      <app-icon name="MapPin" class="h-4 w-4" /> Agregar nueva dirección
                    </button>
                  </div>
                } @else {
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
                }
              </section>
            </div>

            <aside class="h-fit rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-6">
              <h2 class="text-base font-bold text-ink">Resumen</h2>
              <p class="mt-2 text-sm text-muted-foreground">Tienes {{ puntos(store.puntos()) }} puntos disponibles</p>

              @if (haySoloDinero()) {
                <div class="mt-4 rounded-2xl border border-primary bg-secondary/40 p-4 text-sm text-ink">
                  <p class="font-semibold">Pago solo con tarjeta</p>
                  <p class="mt-1 text-muted-foreground">Tu carrito incluye un beneficio exclusivo que no es canjeable con puntos, así que el total se paga con tu tarjeta de débito o crédito.</p>
                </div>
              } @else {
                <div class="mt-4 grid gap-2">
                  @for (m of modos(); track m.value) {
                    <button type="button" (click)="modo.set(m.value)"
                      [class]="'min-h-[56px] rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ' + (modo() === m.value ? 'border-primary bg-secondary/40 text-primary' : 'border-border text-ink')">
                      {{ m.label }}
                      @if (m.value === "dinero") {
                        <span class="mt-0.5 block text-xs font-normal text-muted-foreground">No usas puntos: pagas {{ usd(puntosADolares(store.totalPuntos())) }} con tu tarjeta.</span>
                      }
                    </button>
                  }
                </div>
              }

              @if (modoEfectivo() === "mixto") {
                <div class="mt-4">
                  <label for="puntos-usar" class="text-sm font-semibold text-ink">Puntos a canjear</label>
                  <input id="puntos-usar" type="range" min="0" [max]="puntosMax()" step="100" [value]="puntosAplicados()" (input)="puntosUsados.set(+$any($event.target).value)"
                    class="mt-2 w-full accent-[var(--color-primary)]" />
                  <input type="number" min="0" [max]="puntosMax()" [value]="puntosAplicados()" (input)="onPuntosInput($event)"
                    class="mt-2 w-full rounded-xl border border-border px-4 py-2 text-sm text-ink" />
                  <p class="mt-2 text-xs text-muted-foreground">Equivalencia: {{ porDolar() }} puntos = $1.00</p>
                </div>
              }

              <div class="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div class="flex justify-between text-muted-foreground"><span>Total en puntos</span><span>{{ puntos(store.totalPuntos()) }}</span></div>
                <div class="flex justify-between font-semibold text-ink"><span>Puntos a canjear</span><span>{{ puntos(totales().puntosFinal) }}</span></div>
                <div class="flex justify-between text-base font-extrabold text-ink"><span>A pagar con tarjeta</span><span>{{ usd(totales().montoUSD) }}</span></div>
              </div>

              @if (puntosInsuficientes()) {
                <p class="mt-3 rounded-xl bg-aviso-fondo p-3 text-xs text-aviso">No te alcanzan los puntos para pagar todo. Elige la opción mixta o compra más puntos.</p>
              }

              @if (error()) {
                <p role="alert" class="mt-3 rounded-xl bg-aviso-fondo p-3 text-xs font-semibold text-aviso">{{ error() }}</p>
              }

              <button type="button" [disabled]="puntosInsuficientes()" (click)="pagar()"
                class="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50">
                <app-icon name="CreditCard" class="h-4 w-4" /> Finalizar compra
              </button>
              <p class="mt-3 text-center text-[11px] text-muted-foreground">Todo pago se valida con tu tarjeta de débito o crédito.</p>
            </aside>
          </div>
        </div>
      </div>

      <app-modal [open]="modalDireccion()" title="Nueva dirección" (closed)="modalDireccion.set(false)">
        <div class="grid gap-3">
          <app-direccion-form [valor]="form()" [intento]="intentoDir()" [compacto]="true" (valorChange)="form.set($event)" />
          @if (errorDir()) { <p role="alert" class="text-sm font-semibold text-aviso">{{ errorDir() }}</p> }
          <button type="button" (click)="guardarDireccion()" class="mt-2 rounded-full bg-primary py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Guardar dirección</button>
        </div>
      </app-modal>

      <app-modal [open]="modalCorreo()" title="Agregar correo" (closed)="modalCorreo.set(false)">
        <label class="text-sm font-medium text-ink">
          Correo electrónico
          <input type="email" [value]="nuevoCorreo()" (input)="nuevoCorreo.set($any($event.target).value)" class="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
        </label>
        <button type="button" (click)="guardarCorreo()" class="mt-5 w-full rounded-full bg-primary py-3 text-base font-bold uppercase tracking-wide text-primary-foreground">Guardar correo</button>
      </app-modal>

      <app-payment-gateway-modal [open]="pasarela()" [monto]="totales().montoUSD" (closed)="pasarela.set(false)" (resultado)="onPagoOrden($event)" />
    }
  `,
})
export class CarritoPage {
  protected readonly store = inject(StoreService);
  private readonly router = inject(Router);
  private readonly analitica = inject(AnaliticaService);
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  private readonly catalog = inject(CatalogService);
  protected readonly porDolar = computed(() => this.catalog.reglas().porDolar);
  protected readonly puntosADolares = (p: number) => p / this.porDolar();
  protected readonly error = signal("");
  protected readonly errorDir = signal("");
  protected readonly brand = inject(BrandService);

  /** "Pagar solo con dinero" se puede deshabilitar desde Admin → Reglas de puntos. */
  protected readonly modos = computed<{ value: Modo; label: string }[]>(() =>
    [
      { value: "puntos" as Modo, label: "Pagar todo con puntos" },
      { value: "mixto" as Modo, label: "Pagar con puntos + tarjeta" },
      { value: "dinero" as Modo, label: "Pagar solo con dinero" },
    ].filter((m) => m.value !== "dinero" || this.catalog.reglas().soloDinero),
  );

  protected readonly modo = signal<Modo>("puntos");
  protected readonly puntosUsados = signal(0);
  protected readonly direccionSel = signal<string | null>(null);
  protected readonly correoSel = signal<string | null>(null);
  protected readonly modalDireccion = signal(false);
  protected readonly modalCorreo = signal(false);
  protected readonly pasarela = signal(false);
  protected readonly nuevoCorreo = signal("");
  protected readonly form = signal<Omit<Direccion, "id">>({ alias: "", recibe: "", telefono: "", direccion: "", distrito: "" });

  protected readonly direccionId = computed(() => this.direccionSel() ?? this.store.direcciones()[0]?.id ?? "");
  protected readonly correo = computed(() => this.correoSel() ?? this.store.correos()[0] ?? "");

  protected readonly hayFisicos = computed(() => this.store.items().some((i) => !i.digital));
  protected readonly haySoloDinero = computed(() => this.store.items().some((i) => i.soloDinero));
  protected readonly puntosMax = computed(() => Math.min(this.store.totalPuntos(), this.store.puntos()));
  protected readonly modoEfectivo = computed<Modo>(() => (this.haySoloDinero() ? "dinero" : this.modo()));
  protected readonly puntosAplicados = computed(() => Math.min(this.puntosUsados(), this.puntosMax()));
  private readonly totalUsdFijo = computed(() => this.store.items().filter((i) => i.soloDinero).reduce((a, i) => a + i.precio * i.cantidad, 0));

  protected readonly totales = computed(() => {
    const total = this.store.totalPuntos();
    const fijo = this.totalUsdFijo();
    switch (this.modoEfectivo()) {
      case "puntos":
        return { puntosFinal: total, montoUSD: fijo };
      case "dinero":
        return { puntosFinal: 0, montoUSD: fijo + this.puntosADolares(total) };
      default: {
        const usados = this.puntosAplicados();
        return { puntosFinal: usados, montoUSD: fijo + this.puntosADolares(total - usados) };
      }
    }
  });

  protected readonly puntosInsuficientes = computed(() => this.modoEfectivo() === "puntos" && this.store.totalPuntos() > this.store.puntos());

  protected onPuntosInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    this.puntosUsados.set(Math.min(this.puntosMax(), Math.max(0, v)));
  }
  protected readonly intentoDir = signal(false);
  protected guardarDireccion() {
    const f = this.form();
    this.errorDir.set("");
    this.intentoDir.set(true);
    if (Object.keys(erroresDireccion(f, this.brand.pais(), this.brand.provinciasEnvio())).length) {
      this.errorDir.set("Revisa los campos marcados antes de guardar la dirección.");
      return;
    }
    const id = this.store.addDireccion({
      alias: f.alias.trim(),
      recibe: f.recibe.trim(),
      telefono: f.telefono,
      direccion: f.direccion.trim(),
      distrito: f.distrito,
      provincia: f.provincia!,
      ...(f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng } : {}),
    });
    this.direccionSel.set(id);
    this.form.set({ alias: "", recibe: "", telefono: "", direccion: "", distrito: "" });
    this.intentoDir.set(false);
    this.modalDireccion.set(false);
  }
  protected guardarCorreo() {
    const c = this.nuevoCorreo();
    if (!c.includes("@")) return;
    this.store.addCorreo(c);
    this.correoSel.set(c);
    this.nuevoCorreo.set("");
    this.modalCorreo.set(false);
  }

  protected confirmar() {
    const t = this.totales();
    const entrega = this.hayFisicos()
      ? `Envío a ${this.store.direcciones().find((d) => d.id === this.direccionId())?.direccion ?? "dirección seleccionada"}`
      : `Entrega digital a ${this.correo()}`;
    this.error.set("");
    this.store.finalizarCompra({ items: this.store.items(), puntosUsados: t.puntosFinal, montoUSD: t.montoUSD, entrega }).subscribe({
      next: () => this.router.navigate(["/gracias"]),
      error: (e) => this.error.set(this.store.mensajeError(e)),
    });
  }

  protected pagar() {
    const dir = this.store.direcciones().find((d) => d.id === this.direccionId());
    if (this.hayFisicos() && dir && !this.brand.envioPosible(dir)) {
      this.error.set("No hacemos envíos a la provincia de la dirección elegida. Elige otra dirección o actualiza su provincia.");
      return;
    }
    this.analitica.registrar({ tipo: "inicio_pago" });
    if (this.totales().montoUSD > 0) this.pasarela.set(true);
    else this.confirmar();
  }
  /** Pago del saldo en dinero: solo si la pasarela aprueba se confirma el canje; si no, el carrito queda intacto para reintentar. */
  protected onPagoOrden(r: ResultadoPasarela) {
    this.pasarela.set(false);
    if (r.resultado === "aprobado") this.confirmar();
    else if (r.resultado === "pendiente") this.error.set("El banco aún no confirma el pago. No se hizo el canje ni ningún cargo: espera unos minutos y vuelve a intentar.");
    else this.error.set(`${r.motivo ?? "El pago fue rechazado"}. No se hizo ningún cargo; revisa tu tarjeta o prueba con otra.`);
  }
}

/* ------------------------------------------------------------------ */
/* Gracias                                                             */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-gracias-page",
  imports: [RouterLink, IconComponent, PaymentGatewayModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-12">
      <div class="page-container">
        <div class="mx-auto max-w-3xl rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)] sm:p-10">
          <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary"><app-icon name="CheckCircle2" class="h-8 w-8 text-primary" /></span>
          <h1 class="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">¡Gracias por tu canje!</h1>
          <p class="mt-3 text-sm text-muted-foreground">
            {{ store.ultimaOrden() ? "Tu orden " + store.ultimaOrden()!.codigo + " fue confirmada el " + store.ultimaOrden()!.fecha + (store.ultimaOrden()!.hora ? " a las " + store.ultimaOrden()!.hora : "") + "." : "Aquí verás el resumen de tu canje cuando finalices una compra." }}
          </p>

          @if (store.ultimaOrden(); as o) {
            <div class="mt-7 text-left">
              <div class="space-y-3">
                @for (i of o.items; track i.id) {
                  <div class="flex items-center gap-4 rounded-2xl bg-surface p-3">
                    <img [src]="i.imagen" [alt]="i.nombre" width="120" height="120" class="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-bold text-ink">{{ i.nombre }}</p>
                      <p class="text-xs text-muted-foreground">{{ i.marca }} · x{{ i.cantidad }}</p>
                    </div>
                    <p class="shrink-0 text-sm font-extrabold text-ink">{{ puntos(i.puntos * i.cantidad) }} pts</p>
                  </div>
                }
              </div>

              <dl class="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div class="flex justify-between"><dt class="text-muted-foreground">Puntos canjeados</dt><dd class="font-semibold text-ink">{{ puntos(o.puntosUsados) }}</dd></div>
                <div class="flex justify-between"><dt class="text-muted-foreground">Pagado con tarjeta</dt><dd class="font-semibold text-ink">{{ usd(o.montoUSD) }}</dd></div>
                <div class="flex justify-between"><dt class="text-muted-foreground">Entrega</dt><dd class="max-w-[60%] text-right font-semibold text-ink">{{ o.entrega }}</dd></div>
                <div class="flex justify-between"><dt class="text-muted-foreground">Puntos disponibles</dt><dd class="font-semibold text-ink">{{ puntos(store.puntos()) }}</dd></div>
              </dl>
            </div>
          }

          <div class="mt-7 flex flex-wrap justify-center gap-3">
            @if (store.ultimaOrden(); as o) {
              <a [routerLink]="['/mis-compras', o.codigo]" class="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-7 py-3 text-center text-base font-bold uppercase tracking-wide text-ink hover:border-primary hover:text-primary">Ver detalle del pedido</a>
            }
            <a routerLink="/canjea" class="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 py-3 text-center text-base font-bold uppercase tracking-wide text-primary-foreground">Seguir canjeando</a>
            <a routerLink="/beneficios" class="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-7 py-3 text-center text-base font-bold uppercase tracking-wide text-ink hover:border-primary hover:text-primary">Ver beneficios</a>
          </div>
        </div>

        <section class="mx-auto mt-8 max-w-3xl rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-10">
          <h2 class="flex items-center gap-2 text-xl font-extrabold text-ink"><app-icon name="Sparkles" class="h-5 w-5 text-primary" /> ¿Te faltan puntos? Cómpralos aquí</h2>
          <p class="mt-2 text-sm text-muted-foreground">Cada punto cuesta {{ usd(reglas().precio) }} y se acredita al instante.</p>
          <div class="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label class="text-sm font-medium text-ink">
              Cantidad de puntos (entre {{ puntos(reglas().min) }} y {{ puntos(reglas().max) }})
              <input type="number" [min]="reglas().min" step="500" [value]="cantidad()" (input)="cantidad.set(max0($any($event.target).value))" class="mt-1 w-full rounded-xl border border-border px-4 py-3 text-sm" />
            </label>
            <div class="text-right">
              <p class="text-xs text-muted-foreground">Total a pagar</p>
              <p class="text-2xl font-extrabold text-ink">{{ usd(monto()) }}</p>
            </div>
          </div>
          <button type="button" [disabled]="!valida()" (click)="comprar()"
            class="mt-5 w-full rounded-full bg-primary py-3.5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50">
            Comprar puntos
          </button>
          <p class="mt-3 text-center text-xs text-muted-foreground">
            ¿Prefieres el módulo completo? <a routerLink="/mis-puntos/compra" class="font-semibold text-primary hover:underline">Ir a compra de puntos</a>
          </p>
        </section>
      </div>
    </div>

    <app-payment-gateway-modal [open]="pasarela()" [monto]="monto()" (closed)="pasarela.set(false)" (resultado)="onResultado($event)" />
  `,
})
export class GraciasPage {
  protected readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  protected readonly puntos = formatPuntos;
  protected readonly usd = formatUSD;
  private readonly catalog = inject(CatalogService);
  protected readonly reglas = this.catalog.reglas;
  protected readonly cantidad = signal(5000);
  protected readonly pasarela = signal(false);
  protected readonly monto = computed(() => this.cantidad() * this.reglas().precio);
  protected readonly valida = computed(() => this.reglas().compraActiva && this.cantidad() >= this.reglas().min && this.cantidad() <= this.reglas().max);

  protected max0(v: string) {
    return Math.max(0, Number(v));
  }
  private compra: { codigo: string; cantidad: number; monto: number } | null = null;
  /** Se crea la compra en el servidor y se abre la pasarela. */
  protected comprar() {
    this.store.iniciarCompraPuntos(this.cantidad()).subscribe({
      next: (c) => {
        this.compra = c;
        this.pasarela.set(true);
      },
      error: (e) => this.toast.error(this.store.mensajeError(e)),
    });
  }
  /** Resultado de la pasarela: aprobado acredita; rechazado o pendiente se explican (no se pierde nada). */
  protected onResultado(r: ResultadoPasarela) {
    this.pasarela.set(false);
    if (!this.compra) return;
    this.store.pagarCompraPuntos(this.compra, r).subscribe({
      next: (res) => {
        if (res.estado === "Aprobada") this.toast.show(`Acreditamos ${formatPuntos(this.compra!.cantidad)} puntos`);
        else if (res.estado === "Pendiente") this.toast.show("Estamos confirmando tu pago; te avisaremos cuando se acrediten los puntos");
        else this.toast.error(`${res.motivo ?? "El pago no se completó"}. No se hizo ningún cargo; puedes reintentar.`);
      },
      error: (e) => this.toast.error(this.store.mensajeError(e)),
    });
  }
}
