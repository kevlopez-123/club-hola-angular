import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BrandService } from "../core/brand.service";
import { ConsentimientoService } from "../core/consentimiento.service";

/** Aviso de cookies con preferencias (esenciales siempre activas; analítica y marketing opcionales). */
@Component({
  selector: "app-cookies",
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (c.abierto()) {
      <section role="dialog" aria-labelledby="ck-titulo" aria-modal="false" class="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-card p-4 shadow-[0_-8px_30px_rgba(0,0,0,.12)] sm:p-5">
        <div class="mx-auto max-w-5xl">
          <h2 id="ck-titulo" class="text-base font-bold text-ink">Tu privacidad en {{ brand.programa() }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Usamos cookies esenciales para que el sitio funcione (sesión, carrito) y, solo si lo permites, cookies de analítica y marketing para mejorar tu experiencia.
            Puedes cambiar tu elección cuando quieras. Más información en la <a routerLink="/privacidad" class="font-semibold text-primary underline">política de privacidad</a>.
          </p>
          @if (detalle()) {
            <div class="mt-3 grid gap-2 text-sm">
              <label class="flex items-start gap-3 rounded-xl border border-border p-3 opacity-80">
                <input type="checkbox" checked disabled class="mt-1 h-4 w-4" aria-label="Cookies esenciales (siempre activas)" />
                <span><b>Esenciales</b> · siempre activas. Mantienen tu sesión, tu carrito y tus preferencias.</span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" class="mt-1 h-4 w-4" aria-label="Cookies de analítica" [checked]="analitica()" (change)="analitica.set($any($event.target).checked)" />
                <span><b>Analítica</b> · nos ayuda a entender qué secciones se usan para mejorarlas.</span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                <input type="checkbox" class="mt-1 h-4 w-4" aria-label="Cookies de marketing" [checked]="marketing()" (change)="marketing.set($any($event.target).checked)" />
                <span><b>Marketing</b> · muestran ofertas y beneficios acordes a tus intereses.</span>
              </label>
            </div>
          }
          <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
            @if (!detalle()) {
              <button type="button" class="min-h-11 rounded-full px-5 text-sm font-bold text-ink hover:bg-muted" (click)="detalle.set(true)">Configurar</button>
              <button type="button" class="min-h-11 rounded-full border border-border px-5 text-sm font-bold text-ink hover:bg-muted" (click)="c.soloEsenciales()">Solo esenciales</button>
              <button type="button" class="min-h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90" (click)="c.aceptarTodo()">Aceptar todas</button>
            } @else {
              <button type="button" class="min-h-11 rounded-full border border-border px-5 text-sm font-bold text-ink hover:bg-muted" (click)="c.soloEsenciales()">Solo esenciales</button>
              <button type="button" class="min-h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90" (click)="c.guardar(analitica(), marketing())">Guardar mi elección</button>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class CookiesComponent {
  protected readonly brand = inject(BrandService);
  protected readonly c = inject(ConsentimientoService);
  protected readonly detalle = signal(false);
  protected readonly analitica = signal(this.c.analitica());
  protected readonly marketing = signal(this.c.marketing());
}