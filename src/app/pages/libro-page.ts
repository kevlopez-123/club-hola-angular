import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { BrandService } from "../core/brand.service";
import { guardarArchivo } from "../core/descargas";
import { hojaReclamacion, LIMITES_RECLAMACION, reclamacionInicial, validarReclamacion, type Reclamacion } from "../core/reclamaciones";
import { IconComponent } from "../shared/icon.component";

const CAMPO = "h-12 w-full rounded-xl border border-border bg-card px-3 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50";
const AREA = "min-h-28 w-full rounded-xl border border-border bg-card px-3 py-2 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50";

/* ------------------------------------------------------------------ */
/* Libro de Reclamaciones (/libro-reclamaciones, sin iniciar sesión)    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-libro-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="mx-auto max-w-4xl">
          <h1 class="text-3xl font-extrabold text-ink">Libro de Reclamaciones</h1>
          <p class="mt-2 text-muted-foreground">Hoja de reclamación · {{ proveedor }}</p>

          @if (hoja(); as h) {
            <section class="mt-8" aria-live="polite">
              <app-icon name="CheckCircle2" class="h-10 w-10 text-primary" />
              <h2 class="mt-3 text-2xl font-bold text-ink">Hoja de reclamación</h2>
              <p class="mt-2 text-muted-foreground">{{ h.numero }} · {{ h.fecha }} (Lima)</p>
              <p class="mt-3 text-muted-foreground">Conserva una copia de tu hoja de reclamación.</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button type="button" (click)="descargar()" class="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground"><app-icon name="Download" class="h-5 w-5" /> Descargar constancia</button>
                <button type="button" (click)="hoja.set(null)" class="inline-flex h-12 items-center rounded-full border border-primary px-6 text-base font-semibold text-primary hover:bg-secondary">Volver al formulario</button>
              </div>
              <pre class="mt-8 whitespace-pre-wrap break-words rounded-2xl border border-border bg-card p-5 font-sans text-sm leading-relaxed text-ink">{{ h.texto }}</pre>
            </section>
          } @else {
            <form (submit)="enviar($event)" novalidate class="mt-8 space-y-8">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 text-sm text-muted-foreground">
                <span class="flex items-center gap-2"><app-icon name="FileText" class="h-5 w-5" /> Libro de Reclamaciones virtual</span>
                <span>Los campos con * son obligatorios</span>
              </div>

              <fieldset>
                <legend class="mb-5 text-xl font-bold text-ink">1. Identificación del consumidor</legend>
                <div class="grid gap-5 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <label for="nombre" class="mb-2 block text-sm font-semibold text-ink">Nombre y apellidos *</label>
                    <input id="nombre" [class]="campo" [attr.maxlength]="lim.nombre" [value]="d().nombre" (input)="set({ nombre: val($event) })" [attr.aria-invalid]="!!err()['nombre']" />
                    @if (err()['nombre']) { <p class="mt-1 text-sm text-destructive">{{ err()['nombre'] }}</p> }
                  </div>
                  <div>
                    <label for="tipoDocumento" class="mb-2 block text-sm font-semibold text-ink">Tipo de documento *</label>
                    <select id="tipoDocumento" [class]="campo" (change)="set({ tipoDocumento: $any(val($event)) })">
                      @for (t of tiposDocumento; track t) { <option [selected]="d().tipoDocumento === t">{{ t }}</option> }
                    </select>
                  </div>
                  <div>
                    <label for="documento" class="mb-2 block text-sm font-semibold text-ink">Número de documento *</label>
                    <input id="documento" [class]="campo" [attr.maxlength]="lim.documento" [value]="d().documento" (input)="set({ documento: val($event) })" [attr.aria-invalid]="!!err()['documento']" />
                    @if (err()['documento']) { <p class="mt-1 text-sm text-destructive">{{ err()['documento'] }}</p> }
                  </div>
                  <div class="sm:col-span-2">
                    <label for="domicilio" class="mb-2 block text-sm font-semibold text-ink">Domicilio (dirección, distrito, provincia y departamento) *</label>
                    <input id="domicilio" [class]="campo" [attr.maxlength]="lim.domicilio" [value]="d().domicilio" (input)="set({ domicilio: val($event) })" [attr.aria-invalid]="!!err()['domicilio']" />
                    @if (err()['domicilio']) { <p class="mt-1 text-sm text-destructive">{{ err()['domicilio'] }}</p> }
                  </div>
                  <div>
                    <label for="telefono" class="mb-2 block text-sm font-semibold text-ink">Teléfono *</label>
                    <input id="telefono" type="tel" [class]="campo" [attr.maxlength]="lim.telefono" [value]="d().telefono" (input)="set({ telefono: val($event) })" [attr.aria-invalid]="!!err()['telefono']" />
                    @if (err()['telefono']) { <p class="mt-1 text-sm text-destructive">{{ err()['telefono'] }}</p> }
                  </div>
                  <div>
                    <label for="correo" class="mb-2 block text-sm font-semibold text-ink">Correo electrónico *</label>
                    <input id="correo" type="email" [class]="campo" [attr.maxlength]="lim.correo" [value]="d().correo" (input)="set({ correo: val($event) })" [attr.aria-invalid]="!!err()['correo']" />
                    @if (err()['correo']) { <p class="mt-1 text-sm text-destructive">{{ err()['correo'] }}</p> }
                  </div>
                  <label class="flex items-center gap-3 text-sm text-ink sm:col-span-2"><input type="checkbox" class="h-4 w-4 accent-primary" [checked]="d().menor" (change)="set({ menor: $any($event.target).checked })" /> El consumidor es menor de edad</label>
                  @if (d().menor) {
                    <div class="sm:col-span-2">
                      <label for="representante" class="mb-2 block text-sm font-semibold text-ink">Nombre, documento, domicilio y contacto del padre, madre o representante *</label>
                      <input id="representante" [class]="campo" [attr.maxlength]="lim.representante" [value]="d().representante" (input)="set({ representante: val($event) })" />
                      @if (err()['representante']) { <p class="mt-1 text-sm text-destructive">{{ err()['representante'] }}</p> }
                    </div>
                  }
                </div>
              </fieldset>

              <fieldset class="border-t border-border pt-7">
                <legend class="mb-5 text-xl font-bold text-ink">2. Identificación del bien contratado</legend>
                <div class="grid gap-5 sm:grid-cols-2">
                  <div>
                    <span class="mb-3 block text-sm font-semibold text-ink">Tipo de bien *</span>
                    <div class="flex gap-6">
                      @for (v of bienes; track v) {
                        <label class="flex items-center gap-2 text-sm text-ink"><input type="radio" name="bien" class="accent-primary" [checked]="d().bien === v" (change)="set({ bien: v })" /> {{ v }}</label>
                      }
                    </div>
                  </div>
                  <div>
                    <label for="monto" class="mb-2 block text-sm font-semibold text-ink">Monto reclamado (S/, opcional)</label>
                    <input id="monto" inputmode="decimal" [class]="campo" [attr.maxlength]="lim.monto" [value]="d().monto" (input)="set({ monto: val($event) })" />
                    @if (err()['monto']) { <p class="mt-1 text-sm text-destructive">{{ err()['monto'] }}</p> }
                  </div>
                  <div class="sm:col-span-2">
                    <label for="descripcion" class="mb-2 block text-sm font-semibold text-ink">Descripción del bien o servicio *</label>
                    <textarea id="descripcion" [class]="area" [attr.maxlength]="lim.descripcion" [value]="d().descripcion" (input)="set({ descripcion: val($event) })"></textarea>
                    @if (err()['descripcion']) { <p class="mt-1 text-sm text-destructive">{{ err()['descripcion'] }}</p> }
                  </div>
                </div>
              </fieldset>

              <fieldset class="border-t border-border pt-7">
                <legend class="mb-5 text-xl font-bold text-ink">3. Detalle de la reclamación y pedido</legend>
                <div class="space-y-5">
                  <div class="grid gap-4 sm:grid-cols-2">
                    @for (v of tipos; track v.v) {
                      <label class="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                        <input type="radio" name="tipo" class="mt-1 accent-primary" [checked]="d().tipo === v.v" (change)="set({ tipo: v.v })" />
                        <span class="min-w-0"><strong class="block text-ink">{{ v.v }}</strong><span class="mt-1 block text-sm text-muted-foreground">{{ v.ayuda }}</span></span>
                      </label>
                    }
                  </div>
                  <div>
                    <label for="detalle" class="mb-2 block text-sm font-semibold text-ink">Detalle del reclamo o queja *</label>
                    <textarea id="detalle" [class]="area" [attr.maxlength]="lim.detalle" [value]="d().detalle" (input)="set({ detalle: val($event) })"></textarea>
                    @if (err()['detalle']) { <p class="mt-1 text-sm text-destructive">{{ err()['detalle'] }}</p> }
                  </div>
                  <div>
                    <label for="pedido" class="mb-2 block text-sm font-semibold text-ink">Pedido concreto del consumidor *</label>
                    <textarea id="pedido" [class]="area" [attr.maxlength]="lim.pedido" [value]="d().pedido" (input)="set({ pedido: val($event) })"></textarea>
                    @if (err()['pedido']) { <p class="mt-1 text-sm text-destructive">{{ err()['pedido'] }}</p> }
                  </div>
                </div>
              </fieldset>

              <section class="border-t border-border pt-7">
                <h2 class="text-xl font-bold text-ink">4. Observaciones y acciones del proveedor</h2>
                <p class="mt-3 text-sm text-muted-foreground">Se completan por el proveedor al atender la reclamación. Fecha de respuesta: pendiente.</p>
              </section>

              <div class="space-y-4 border-t border-border pt-6 text-sm text-muted-foreground">
                <p>El proveedor debe responder los reclamos y quejas en un plazo máximo de 15 días hábiles, improrrogables.</p>
                <p>La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para presentar una denuncia ante Indecopi.</p>
                <label class="flex items-start gap-3 text-ink">
                  <input id="conformidad" type="checkbox" class="mt-1 h-4 w-4 shrink-0 accent-primary" [checked]="d().conformidad" (change)="set({ conformidad: $any($event.target).checked })" />
                  <span>Declaro que la información ingresada es correcta y he leído la <a routerLink="/privacidad" target="_blank" class="text-primary underline">Política de Privacidad</a>. *</span>
                </label>
                @if (err()['conformidad']) { <p class="text-destructive">{{ err()['conformidad'] }}</p> }
              </div>
              @if (falla()) { <p role="alert" class="text-sm font-semibold text-destructive">{{ falla() }}</p> }
              <button type="submit" [disabled]="enviando()" class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground disabled:opacity-60 sm:w-auto"><app-icon name="FileText" class="h-5 w-5" /> Enviar reclamación</button>
            </form>
          }
        </div>
      </div>
    </section>
  `,
})
export class LibroReclamacionesPage {
  private readonly api = inject(ApiService);
  private readonly brand = inject(BrandService);
  protected readonly campo = CAMPO;
  protected readonly area = AREA;
  protected readonly lim = LIMITES_RECLAMACION;
  protected readonly tiposDocumento = ["DNI", "CE", "Pasaporte"] as const;
  protected readonly bienes = ["Producto", "Servicio"] as const;
  protected readonly tipos = [
    { v: "Reclamo" as const, ayuda: "Disconformidad relacionada con el producto o servicio." },
    { v: "Queja" as const, ayuda: "Disconformidad con la atención, no relacionada directamente con el producto o servicio." },
  ];
  protected readonly proveedor = "Motiva Soluciones S.A.C.";
  protected readonly d = signal<Reclamacion>(reclamacionInicial());
  protected readonly err = signal<Record<string, string>>({});
  protected readonly hoja = signal<{ numero: string; fecha: string; texto: string } | null>(null);
  protected readonly enviando = signal(false);
  protected readonly falla = signal("");

  protected val(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
  protected set(p: Partial<Reclamacion>) {
    this.d.update((x) => ({ ...x, ...p }));
  }
  protected enviar(ev: Event) {
    ev.preventDefault();
    const errores = validarReclamacion(this.d());
    this.err.set(errores);
    const primero = Object.keys(errores)[0];
    if (primero) { requestAnimationFrame(() => document.getElementById(primero)?.focus()); return; }
    this.falla.set("");
    this.enviando.set(true);
    this.api.post<{ numero: string; fecha: string }>("reclamaciones", this.d()).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.hoja.set({ numero: r.numero, fecha: r.fecha, texto: hojaReclamacion(this.d(), r.numero, r.fecha, this.proveedor) });
        this.d.set(reclamacionInicial());
        window.scrollTo({ top: 0 });
      },
      error: (e) => { this.enviando.set(false); this.falla.set(e?.error?.message ?? "No pudimos registrar tu reclamación. Inténtalo otra vez."); },
    });
  }
  protected descargar() {
    const h = this.hoja();
    if (h) guardarArchivo(new Blob([h.texto], { type: "text/plain;charset=utf-8" }), `hoja-reclamacion-${h.numero}.txt`);
  }
}
