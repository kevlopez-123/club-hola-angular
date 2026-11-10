import { ChangeDetectionStrategy, Component, computed, inject, input, signal, effect } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { ApiService } from "../core/api.service";
import { CatalogService } from "../core/catalog.service";
import { SeoService } from "../core/seo.service";
import { BrandService } from "../core/brand.service";
import { StoreService } from "../core/store.service";
import { formatFecha, formatUSD } from "../core/format";
import { blobDeDataUrl, descargarBlob, pdfDeTexto } from "../core/pdf-cotizacion";
import type { Cotizacion } from "../core/models";
import { IconComponent } from "../shared/icon.component";
import { LimpiarFiltrosComponent } from "../shared/limpiar-filtros";
import { FlagComponent } from "../shared/flag.component";
import { HeroSliderComponent, ModalComponent } from "../shared/ui";
import { CityComboboxComponent } from "../shared/widgets";

const tiposViaje = [
  { value: "ida-vuelta", label: "Ida y vuelta" },
  { value: "solo-ida", label: "Solo ida" },
] as const;
const clases = [
  { value: "economica", label: "Económica" },
  { value: "ejecutiva", label: "Ejecutiva" },
  { value: "primera", label: "Primera clase" },
] as const;
const tiposDocumento = [
  { value: "cedula", label: "Cédula" },
  { value: "pasaporte", label: "Pasaporte" },
] as const;

const INPUT = "h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50";

type Pasajero = { nombres: string; apellidos: string; tipoDoc: string; numDoc: string; nacimiento: string; asistencia: boolean };
const nuevoPasajero = (): Pasajero => ({ nombres: "", apellidos: "", tipoDoc: "cedula", numDoc: "", nacimiento: "", asistencia: false });

/* ------------------------------------------------------------------ */
/* Cotizar vuelo                                                       */
/* ------------------------------------------------------------------ */
/** Edad cumplida a una fecha de referencia. */
const edadA = (nac: string, ref: string) => {
  const n = new Date(nac + 'T12:00:00');
  const r = new Date(ref + 'T12:00:00');
  let e = r.getFullYear() - n.getFullYear();
  if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) e--;
  return e;
};

@Component({
  selector: "app-vuelos-page",
  imports: [RouterLink, IconComponent, HeroSliderComponent, ModalComponent, CityComboboxComponent, FlagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hero-slider [items]="catalog.bannersVuelos()" />

    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <header class="max-w-3xl">
          <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Cotiza tu ticket aéreo</h1>
          <p class="mt-2 text-base text-muted-foreground">
            Completa los datos de tu viaje y de los pasajeros. Una ejecutiva de Motiva Soluciones te enviará la cotización dentro de las siguientes 48 horas.
          </p>
        </header>

        <section class="mt-7 rounded-3xl bg-card p-5 shadow-[var(--shadow-card)] sm:p-7">
          <ol class="mb-6 flex flex-wrap items-center gap-3">
            @for (p of pasos; track p; let i = $index) {
              <li class="flex items-center gap-2">
                <span [class]="'grid h-8 w-8 place-items-center rounded-full text-sm font-bold ' + (paso() === i + 1 || paso() > i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')">
                  @if (paso() > i + 1) { <app-icon name="Check" class="h-4 w-4" /> } @else { {{ i + 1 }} }
                </span>
                <span [class]="'text-base ' + (paso() === i + 1 ? 'font-bold text-ink' : 'text-muted-foreground')">{{ p }}</span>
                @if (i === 0) { <span class="hidden h-px w-10 bg-border sm:block"></span> }
              </li>
            }
          </ol>

          @if (paso() === 1) {
            <form novalidate (submit)="continuar1($event)">
              <div class="grid gap-4 sm:grid-cols-3">
                <div>
                  <label for="tipo-viaje" class="block text-base font-semibold text-ink">Tipo de viaje</label>
                  <select id="tipo-viaje" [value]="tipoViaje()" (change)="tipoViaje.set($any($event.target).value)" [class]="'mt-2 ' + input">
                    @for (t of tiposViaje; track t.value) { <option [value]="t.value" [selected]="t.value === tipoViaje()">{{ t.label }}</option> }
                  </select>
                </div>
                <div>
                  <label for="clase" class="block text-base font-semibold text-ink">Clase</label>
                  <select id="clase" [value]="clase()" (change)="clase.set($any($event.target).value)" [class]="'mt-2 ' + input">
                    @for (c of clases; track c.value) { <option [value]="c.value" [selected]="c.value === clase()">{{ c.label }}</option> }
                  </select>
                </div>
                <div>
                  <span class="block text-base font-semibold text-ink">Pasajeros</span>
                  <div class="mt-2 flex h-14 items-center justify-between rounded-2xl border border-border bg-surface px-3">
                    <button type="button" aria-label="Quitar pasajero" (click)="setCant(cantidad() - 1)" [disabled]="cantidad() <= 1"
                      class="grid h-11 w-11 place-items-center rounded-full bg-muted text-ink disabled:opacity-40"><app-icon name="Minus" class="h-4 w-4" /></button>
                    <span class="flex items-center gap-2 text-base font-bold text-ink"><app-icon name="Users" class="h-4 w-4 text-primary" />{{ cantidad() }}</span>
                    <button type="button" aria-label="Agregar pasajero" (click)="setCant(cantidad() + 1)" [disabled]="cantidad() >= 9"
                      class="grid h-11 w-11 place-items-center rounded-full bg-muted text-ink disabled:opacity-40"><app-icon name="Plus" class="h-4 w-4" /></button>
                  </div>
                </div>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <app-city-combobox label="Ciudad de origen" [(value)]="origen" [excluir]="destino()" />
                <app-city-combobox label="Ciudad de destino" [(value)]="destino" [excluir]="origen()" />
                <div>
                  <label for="ida" class="block text-base font-semibold text-ink">Fecha de ida</label>
                  <input id="ida" type="date" [min]="hoy" [value]="ida()" (input)="ida.set($any($event.target).value)" (blur)="tocar('ida')" [attr.aria-invalid]="!!ver('ida')" [class]="'mt-2 ' + input + (ver('ida') ? ' ring-2 ring-destructive/70' : '')" />
                  @if (ver('ida'); as m) { <p role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
                </div>
                <div>
                  <label for="regreso" class="block text-base font-semibold text-ink">Fecha de regreso</label>
                  <input id="regreso" type="date" [min]="ida() || hoy" [value]="idaVuelta() ? regreso() : ''" [disabled]="!idaVuelta()"
                    (input)="regreso.set($any($event.target).value)" (blur)="tocar('regreso')" [attr.aria-invalid]="!!ver('regreso')" [class]="'mt-2 ' + input + ' disabled:cursor-not-allowed disabled:opacity-50' + (ver('regreso') ? ' ring-2 ring-destructive/70' : '')" />
                  @if (ver('regreso'); as m) { <p role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
                </div>
              </div>

              @if (ver('origen'); as m) { <p role="alert" class="mt-3 text-sm font-semibold text-destructive">{{ m }}</p> }
              @if (ver('destino'); as m) { <p role="alert" class="mt-3 text-sm font-semibold text-destructive">{{ m }}</p> }

              @if (resumenVisible()) {
                <div role="status" aria-live="polite" class="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <p class="font-bold text-destructive">Revisa {{ listaErrores().length }} {{ listaErrores().length === 1 ? "campo" : "campos" }} antes de continuar:</p>
                  <ul class="mt-2 list-disc space-y-1 pl-5 text-ink">
                    @for (e of listaErrores(); track e.k) { <li><b>{{ e.etiqueta }}:</b> {{ e.msg }}</li> }
                  </ul>
                </div>
              }

              <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
                <p class="flex items-center gap-2 text-base text-muted-foreground"><app-icon name="Plane" class="h-5 w-5 text-primary" /> {{ resumen() }}</p>
                <button type="submit"
                  class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto lg:min-h-14">
                  Continuar <app-icon name="ArrowRight" class="h-5 w-5" />
                </button>
              </div>
            </form>
          } @else {
            <form novalidate (submit)="continuar2($event)">
              <div class="rounded-2xl bg-surface p-4 text-base text-ink">
                <p class="font-bold">{{ resumen() }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                  <app-icon name="CalendarDays" class="h-4 w-4" /> Ida {{ ida() }}{{ idaVuelta() && regreso() ? " · Regreso " + regreso() : "" }}
                </p>
              </div>

              <div class="mt-5 grid gap-5">
                @for (p of pasajeros(); track $index; let i = $index) {
                  <fieldset class="rounded-2xl border border-border p-4 sm:p-5">
                    <legend class="px-2 text-base font-extrabold text-ink">Pasajero {{ i + 1 }}</legend>
                    <div class="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label [for]="'nom-' + i" class="block text-base font-semibold text-ink">Nombres</label>
                        <input [id]="'nom-' + i" [value]="p.nombres" maxlength="60" (input)="actualizar(i, 'nombres', $any($event.target).value)" [attr.aria-invalid]="!!ver('nom-' + i)" [attr.aria-describedby]="ver('nom-' + i) ? 'err-' + 'nom-' + i : null" (blur)="tocar('nom-' + i)" [class]="'mt-2 ' + input + (ver('nom-' + i) ? ' ring-2 ring-destructive/70' : '')" />
                        @if (ver('nom-' + i); as m) { <p [id]="'err-' + 'nom-' + i" role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
                      </div>
                      <div>
                        <label [for]="'ape-' + i" class="block text-base font-semibold text-ink">Apellidos</label>
                        <input [id]="'ape-' + i" [value]="p.apellidos" maxlength="60" (input)="actualizar(i, 'apellidos', $any($event.target).value)" [attr.aria-invalid]="!!ver('ape-' + i)" [attr.aria-describedby]="ver('ape-' + i) ? 'err-' + 'ape-' + i : null" (blur)="tocar('ape-' + i)" [class]="'mt-2 ' + input + (ver('ape-' + i) ? ' ring-2 ring-destructive/70' : '')" />
                        @if (ver('ape-' + i); as m) { <p [id]="'err-' + 'ape-' + i" role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
                      </div>
                      <div>
                        <label [for]="'tdoc-' + i" class="block text-base font-semibold text-ink">Tipo de documento</label>
                        <select [id]="'tdoc-' + i" [value]="p.tipoDoc" (change)="actualizar(i, 'tipoDoc', $any($event.target).value)" [class]="'mt-2 ' + input">
                          @for (t of tiposDocumento; track t.value) { <option [value]="t.value" [selected]="t.value === p.tipoDoc">{{ t.label }}</option> }
                        </select>
                      </div>
                      <div>
                        <label [for]="'ndoc-' + i" class="block text-base font-semibold text-ink">Número de documento</label>
                        <input [id]="'ndoc-' + i" [value]="p.numDoc" maxlength="20" [attr.inputmode]="p.tipoDoc === 'cedula' ? 'numeric' : 'text'"
                          (input)="actualizarDoc(i, p.tipoDoc, $any($event.target).value)" [attr.aria-invalid]="!!ver('ndoc-' + i)" [attr.aria-describedby]="ver('ndoc-' + i) ? 'err-' + 'ndoc-' + i : null" (blur)="tocar('ndoc-' + i)" [class]="'mt-2 ' + input + (ver('ndoc-' + i) ? ' ring-2 ring-destructive/70' : '')" />
                        @if (ver('ndoc-' + i); as m) { <p [id]="'err-' + 'ndoc-' + i" role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
                      </div>
                      <div>
                        <label [for]="'nac-' + i" class="block text-base font-semibold text-ink">Fecha de nacimiento</label>
                        <input [id]="'nac-' + i" type="date" [max]="hoy" [value]="p.nacimiento" (input)="actualizar(i, 'nacimiento', $any($event.target).value)" [attr.aria-invalid]="!!ver('nac-' + i)" [attr.aria-describedby]="ver('nac-' + i) ? 'err-' + 'nac-' + i : null" (blur)="tocar('nac-' + i)" [class]="'mt-2 ' + input + (ver('nac-' + i) ? ' ring-2 ring-destructive/70' : '')" />
                        @if (ver('nac-' + i); as m) { <p [id]="'err-' + 'nac-' + i" role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
                      </div>
                      <!-- Se alinea con el campo de fecha (no con el mensaje de error que lo alarga): el espaciador ocupa el alto de la etiqueta -->
                      <div>
                        <span class="block text-base font-semibold" aria-hidden="true">&nbsp;</span>
                        <label class="mt-2 flex min-h-12 items-center lg:min-h-14 gap-3 rounded-2xl bg-surface px-4 text-base text-ink">
                          <input type="checkbox" [checked]="p.asistencia" (change)="actualizar(i, 'asistencia', $any($event.target).checked)" class="h-5 w-5 accent-[var(--color-primary)]" />
                          Discapacitado y requiere asistencia
                        </label>
                      </div>
                    </div>
                  </fieldset>
                }
              </div>

              @if (resumenVisible()) {
                <div role="status" aria-live="polite" class="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <p class="font-bold text-destructive">Revisa {{ listaErrores().length }} {{ listaErrores().length === 1 ? "campo" : "campos" }} antes de continuar:</p>
                  <ul class="mt-2 list-disc space-y-1 pl-5 text-ink">
                    @for (e of listaErrores(); track e.k) { <li><b>{{ e.etiqueta }}:</b> {{ e.msg }}</li> }
                  </ul>
                </div>
              }

              <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button type="button" (click)="paso.set(1)"
                  class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border px-8 text-base font-bold text-ink lg:min-h-14">
                  <app-icon name="ArrowLeft" class="h-5 w-5" /> Volver
                </button>
                <button type="submit"
                  class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-14">
                  Cotizar
                </button>
              </div>
            </form>
          }
        </section>

        <section class="mt-12">
          <h2 class="text-xl font-extrabold text-ink lg:text-2xl">Destinos recomendados</h2>
          <p class="mt-2 text-base text-muted-foreground">Inspírate con los destinos favoritos de nuestros clientes.</p>
          <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            @for (d of catalog.destinos(); track d.slug) {
              <article class="card-elevate flex h-full flex-col overflow-hidden rounded-2xl bg-card">
                <a [routerLink]="['/vuelos/destinos', d.slug]" class="block overflow-hidden">
                  <img [src]="d.imagen" [alt]="d.ciudad + ', ' + d.pais" width="1024" height="768" loading="lazy" class="h-44 w-full object-cover transition-transform duration-500 hover:scale-105" />
                </a>
                <div class="flex flex-1 flex-col p-4">
                  <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ d.pais }}</p>
                  <h3 class="mt-1 text-base font-extrabold text-ink">{{ d.ciudad }}</h3>
                  <p class="mt-2 line-clamp-3 flex-1 text-base text-muted-foreground">{{ d.resumen }}</p>
                  <p class="mt-3 text-base font-bold text-primary">Desde \${{ d.desdeUSD }}</p>
                  <a [routerLink]="['/vuelos/destinos', d.slug]"
                    class="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">Ver detalles</a>
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </div>

    <app-modal [open]="contactoOpen()" title="Datos de contacto" (closed)="contactoOpen.set(false)">
      <p class="text-base text-muted-foreground">Recibirás todas las notificaciones de tu cotización en estos datos.</p>
      <form class="mt-5" novalidate (submit)="confirmarContacto($event)">
        <label for="cot-correo" class="block text-base font-semibold text-ink">Correo electrónico</label>
        <input id="cot-correo" type="email" [value]="correo()" maxlength="255" (input)="correoEditado.set($any($event.target).value)" (blur)="tocar('correo')" [attr.aria-invalid]="!!ver('correo')" [class]="'mt-2 ' + input + (ver('correo') ? ' ring-2 ring-destructive/70' : '')" />
        @if (ver('correo'); as m) { <p role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
        <label for="cot-tel" class="mt-4 block text-base font-semibold text-ink">Número de teléfono</label>
        <div class="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-4">
          <span class="flex items-center gap-2 text-base text-ink"><app-flag [codigo]="brand.pais().codigo" [nombre]="brand.pais().nombre" [ancho]="24" />{{ brand.pais().telefonoPrefijo }}</span>
          <input id="cot-tel" inputmode="tel" [attr.maxlength]="brand.pais().telefonoDigitos" [value]="telefono()" (input)="onTelefono($event)" (blur)="tocar('tel')" [attr.aria-invalid]="!!ver('tel')" placeholder="99 654 3210"
            class="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none" />
        </div>
        @if (ver('tel'); as m) { <p role="alert" class="mt-1.5 text-sm font-semibold text-destructive">{{ m }}</p> }
        <button type="submit"
          class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-14">
          Solicitar cotización
        </button>
      </form>
    </app-modal>

    <app-modal [open]="codigoOk() !== null" title="¡Solicitud enviada!" (closed)="reiniciar()">
      <div class="text-center">
        <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary"><app-icon name="Check" class="h-8 w-8 text-secondary-foreground" /></span>
        <p class="mt-4 text-base text-ink">Tu solicitud <strong>{{ codigoOk() }}</strong> fue enviada correctamente.</p>
        <p class="mt-2 text-base text-muted-foreground">
          Una ejecutiva de Motiva Soluciones se comunicará contigo dentro de las siguientes 48 horas al correo <strong class="text-ink">{{ correo() }}</strong>.
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" (click)="reiniciar()" class="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-border text-base font-bold text-ink lg:min-h-14">Nueva cotización</button>
          <a routerLink="/vuelos/cotizaciones" (click)="reiniciar()" class="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground lg:min-h-14">Ver mis cotizaciones</a>
        </div>
      </div>
    </app-modal>
  `,
})
export class VuelosPage {
  protected readonly brand = inject(BrandService);
  protected readonly catalog = inject(CatalogService);
  private readonly api = inject(ApiService);
  private readonly store = inject(StoreService);

  protected readonly input = INPUT;
  protected readonly tiposViaje = tiposViaje;
  protected readonly clases = clases;
  protected readonly tiposDocumento = tiposDocumento;
  protected readonly pasos = ["Datos del viaje", "Pasajeros"];
  protected readonly hoy = new Date().toISOString().slice(0, 10);

  protected readonly paso = signal<1 | 2>(1);
  protected readonly tipoViaje = signal<string>("ida-vuelta");
  protected readonly clase = signal<string>("economica");
  protected readonly origen = signal("UIO");
  protected readonly destino = signal("MIA");
  protected readonly ida = signal("");
  protected readonly regreso = signal("");
  protected readonly cantidad = signal(1);
  protected readonly pasajeros = signal<Pasajero[]>([nuevoPasajero()]);

  protected readonly contactoOpen = signal(false);
  protected readonly correoEditado = signal<string | null>(null);
  protected readonly correo = computed(() => this.correoEditado() ?? this.store.perfil()?.correo ?? "");
  protected readonly telefono = signal("");
  protected readonly codigoOk = signal<string | null>(null);

  protected readonly idaVuelta = computed(() => this.tipoViaje() === "ida-vuelta");

  /** Mensajes de error por campo (clave = id del campo). Se recalculan en cada cambio: validación en tiempo real. */
  protected readonly errores1 = computed(() => {
    const e: Record<string, string> = {};
    if (!this.origen()) e["origen"] = "Elige la ciudad de origen.";
    if (!this.destino()) e["destino"] = "Elige la ciudad de destino.";
    else if (this.origen() === this.destino()) e["destino"] = "El destino debe ser distinto del origen.";
    if (!this.ida()) e["ida"] = "Elige la fecha de ida.";
    else if (this.ida() < this.hoy) e["ida"] = "La fecha de ida no puede ser anterior a hoy.";
    if (this.idaVuelta()) {
      if (!this.regreso()) e["regreso"] = "Elige la fecha de regreso.";
      else if (this.ida() && this.regreso() < this.ida()) e["regreso"] = "El regreso no puede ser anterior a la ida.";
    }
    return e;
  });
  protected readonly errores2 = computed(() => {
    const e: Record<string, string> = {};
    const ps = this.pasajeros();
    const ref = this.ida() || this.hoy;
    const claves = ps.map((p) => p.numDoc.trim().toUpperCase());
    ps.forEach((p, i) => {
      const nombre = (v: string, vacio: string) => (!v.trim() ? vacio : v.trim().length < 2 ? "Escribe al menos 2 letras." : !/^[\p{L}\s'.-]+$/u.test(v.trim()) ? "Usa solo letras." : "");
      const n = nombre(p.nombres, "Escribe los nombres.");
      const a = nombre(p.apellidos, "Escribe los apellidos.");
      if (n) e[`nom-${i}`] = n;
      if (a) e[`ape-${i}`] = a;
      const doc = p.numDoc.trim();
      if (!doc) e[`ndoc-${i}`] = "Escribe el número de documento.";
      else if (p.tipoDoc === "cedula" && !/^\d{10}$/.test(doc)) e[`ndoc-${i}`] = "La cédula debe tener 10 dígitos.";
      else if (doc.length < 6) e[`ndoc-${i}`] = "El documento debe tener al menos 6 caracteres.";
      else {
        const otro = claves.findIndex((k, j) => j !== i && k === claves[i]);
        if (otro >= 0) e[`ndoc-${i}`] = `Este documento ya está en el pasajero ${otro + 1}; no puede repetirse.`;
      }
      if (!p.nacimiento) e[`nac-${i}`] = "Indica la fecha de nacimiento.";
      else if (p.nacimiento > this.hoy) e[`nac-${i}`] = "La fecha de nacimiento no puede ser futura.";
    });
    const todasFechas = ps.every((p) => p.nacimiento && p.nacimiento <= this.hoy);
    if (todasFechas && !ps.some((p) => edadA(p.nacimiento, ref) >= 18)) e["nac-0"] = e["nac-0"] ?? "Al menos un pasajero debe ser mayor de 18 años.";
    if (todasFechas && !ps.some((p) => edadA(p.nacimiento, ref) >= 18)) e["adulto"] = "Al menos un pasajero debe ser mayor de 18 años.";
    return e;
  });
  protected readonly erroresContacto = computed(() => {
    const e: Record<string, string> = {};
    if (!this.correo().trim()) e["correo"] = "Escribe tu correo electrónico.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo().trim())) e["correo"] = "El correo no es válido (ej. nombre@correo.com).";
    const dig = this.telefono().replace(/\D/g, "").length;
    if (!dig) e["tel"] = "Escribe tu número de teléfono.";
    else if (dig < this.brand.pais().telefonoDigitos) e["tel"] = `El teléfono debe tener ${this.brand.pais().telefonoDigitos} dígitos (faltan ${this.brand.pais().telefonoDigitos - dig}).`;
    return e;
  });
  protected readonly paso1Valido = computed(() => Object.keys(this.errores1()).length === 0);
  protected readonly paso2Valido = computed(() => Object.keys(this.errores2()).length === 0);
  protected readonly contactoValido = computed(() => Object.keys(this.erroresContacto()).length === 0);

  /** Campos que la persona ya tocó (al salir de ellos) o todos, tras intentar avanzar. */
  private readonly tocados = signal<ReadonlySet<string>>(new Set());
  private readonly intento = signal(false);
  protected tocar(k: string) {
    this.tocados.update((s) => new Set(s).add(k));
  }
  private readonly erroresActuales = computed(() =>
    this.contactoOpen() ? this.erroresContacto() : this.paso() === 1 ? this.errores1() : this.errores2(),
  );
  protected ver(k: string): string {
    const e = this.erroresActuales()[k];
    return e && (this.intento() || this.tocados().has(k)) ? e : "";
  }
  private etiquetaDe(k: string) {
    const fijas: Record<string, string> = { origen: "Ciudad de origen", destino: "Ciudad de destino", ida: "Fecha de ida", regreso: "Fecha de regreso", adulto: "Pasajeros", correo: "Correo electrónico", tel: "Teléfono" };
    if (fijas[k]) return fijas[k]!;
    const [campo, i] = k.split("-");
    const nombres: Record<string, string> = { nom: "Nombres", ape: "Apellidos", ndoc: "Número de documento", nac: "Fecha de nacimiento" };
    return `Pasajero ${Number(i) + 1} · ${nombres[campo!] ?? campo}`;
  }
  /** Lista viva de lo que falta o está mal (solo del paso en curso). */
  protected readonly listaErrores = computed(() =>
    Object.entries(this.erroresActuales())
      .filter(([k]) => !(k === "nac-0" && this.erroresActuales()["adulto"]))
      .map(([k, msg]) => ({ k, etiqueta: this.etiquetaDe(k), msg })),
  );
  protected readonly resumenVisible = computed(() => this.listaErrores().length > 0 && (this.intento() || this.tocados().size > 0));
  private enfocarPrimero() {
    const k = this.listaErrores()[0]?.k;
    setTimeout(() => document.getElementById(k === "adulto" ? "nac-0" : (k ?? ""))?.focus());
  }
  protected continuar1(e: Event) {
    e.preventDefault();
    if (!this.paso1Valido()) {
      this.intento.set(true);
      return this.enfocarPrimero();
    }
    this.intento.set(false);
    this.tocados.set(new Set());
    this.paso.set(2);
  }
  protected continuar2(e: Event) {
    e.preventDefault();
    if (!this.paso2Valido()) {
      this.intento.set(true);
      return this.enfocarPrimero();
    }
    this.intento.set(false);
    this.tocados.set(new Set());
    this.contactoOpen.set(true);
  }
  protected confirmarContacto(e: Event) {
    e.preventDefault();
    if (!this.contactoValido()) {
      this.intento.set(true);
      return this.enfocarPrimero();
    }
    this.enviar();
  }  protected readonly resumen = computed(() => {
    const c = this.cantidad();
    const clase = clases.find((x) => x.value === this.clase())?.label;
    return `${this.origen() ? this.catalog.labelCiudad(this.origen()) : "Origen"} → ${this.destino() ? this.catalog.labelCiudad(this.destino()) : "Destino"} · ${clase} · ${c} ${c === 1 ? "pasajero" : "pasajeros"}`;
  });

  protected onTelefono(e: Event) {
    this.telefono.set((e.target as HTMLInputElement).value.replace(/\D/g, ""));
  }

  protected setCant(n: number) {
    const v = Math.max(1, Math.min(9, n));
    this.cantidad.set(v);
    this.pasajeros.update((prev) => {
      const copia = [...prev];
      while (copia.length < v) copia.push(nuevoPasajero());
      return copia.slice(0, v);
    });
  }

  protected actualizar(i: number, campo: keyof Pasajero, valor: string | boolean) {
    this.pasajeros.update((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }
  protected actualizarDoc(i: number, tipoDoc: string, valor: string) {
    this.actualizar(i, "numDoc", tipoDoc === "cedula" ? valor.replace(/\D/g, "").slice(0, 10) : valor);
  }

  protected enviar() {
    const idaVuelta = this.idaVuelta();
    this.api
      .post<Cotizacion>("me/cotizaciones", {
        origen: this.origen(),
        destino: this.destino(),
        tipoViaje: tiposViaje.find((t) => t.value === this.tipoViaje())!.label,
        clase: clases.find((c) => c.value === this.clase())!.label,
        pasajeros: this.cantidad(),
        pasajerosDetalle: this.pasajeros().map((p) => ({ ...p, nombres: p.nombres.trim(), apellidos: p.apellidos.trim(), numDoc: p.numDoc.trim() })),
        salida: this.ida(),
        ...(idaVuelta && this.regreso() ? { regreso: this.regreso() } : {}),
      })
      .subscribe((c) => {
        this.contactoOpen.set(false);
        this.codigoOk.set(c.codigo);
      });
  }

  protected reiniciar() {
    this.codigoOk.set(null);
    this.paso.set(1);
    this.ida.set("");
    this.regreso.set("");
    this.setCant(1);
    this.pasajeros.set([nuevoPasajero()]);
    this.telefono.set("");
  }
}

/* ------------------------------------------------------------------ */
/* Mis cotizaciones                                                    */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-cotizaciones-page",
  imports: [RouterLink, IconComponent, LimpiarFiltrosComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-ink lg:text-3xl">Historial de cotizaciones</h1>
            <p class="mt-2 max-w-2xl text-base text-muted-foreground">Revisa el estado de cada solicitud de ticket aéreo.</p>
          </div>
          <a routerLink="/vuelos" class="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">
            <app-icon name="Plane" class="h-5 w-5" /> Nueva cotización
          </a>
        </div>

        <div class="mt-7 grid items-end gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div class="sm:col-span-2 lg:col-span-1">
            <label for="buscar-cot" class="block text-sm font-semibold text-muted-foreground">Buscar</label>
            <div class="relative mt-1.5">
              <input id="buscar-cot" type="search" [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Código, destino o estado" [class]="input + ' pr-12'" />
              <app-icon name="Search" class="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
            </div>
          </div>
          <div>
            <label for="desde" class="block text-sm font-semibold text-muted-foreground">Desde</label>
            <input id="desde" type="date" [value]="desde()" (input)="desde.set($any($event.target).value)" [class]="'mt-1.5 ' + input" />
          </div>
          <div>
            <label for="hasta" class="block text-sm font-semibold text-muted-foreground">Hasta</label>
            <input id="hasta" type="date" [value]="hasta()" (input)="hasta.set($any($event.target).value)" [class]="'mt-1.5 ' + input" />
          </div>
          <app-limpiar-filtros [activo]="!!q() || !!desde() || !!hasta()" (limpiar)="q.set(''); desde.set(''); hasta.set('')" />
        </div>

        <div class="mt-6 grid gap-4">
          @for (c of lista(); track c.codigo) {
            <article class="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]" [attr.aria-label]="'Cotización ' + c.codigo">
              <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div class="min-w-0">
                  <p class="text-base text-muted-foreground">Cotización {{ c.codigo }} · Solicitada el {{ fecha(c.fecha) }}</p>
                  <h2 class="mt-1 flex flex-wrap items-center gap-2 text-base font-extrabold text-ink">
                    {{ catalog.labelCiudad(c.origen) }} <app-icon name="Plane" class="h-4 w-4 text-primary" /> {{ catalog.labelCiudad(c.destino) }}
                  </h2>
                  <p class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted-foreground">
                    <span class="flex items-center gap-2"><app-icon name="CalendarDays" class="h-4 w-4" /> {{ fecha(c.salida) }}{{ c.regreso ? " – " + fecha(c.regreso) : "" }}</span>
                    <span class="flex items-center gap-2"><app-icon name="Users" class="h-4 w-4" /> {{ c.pasajeros }}</span>
                    <span>{{ c.tipoViaje }} · {{ c.clase }}</span>
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span [class]="'rounded-full px-4 py-1.5 text-sm font-bold ' + estadoCls[c.estado]">{{ c.estado }}</span>
                  <button type="button" (click)="alternar(c.codigo)" [attr.aria-expanded]="abierta() === c.codigo"
                    class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-base font-bold text-primary">
                    <app-icon name="FileText" class="h-5 w-5" />
                    {{ abierta() === c.codigo ? "Ocultar detalle" : "Ver detalle" }}
                  </button>
                </div>
              </div>

              @if (abierta() === c.codigo) {
                <div class="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-2 xl:grid-cols-3">
                  <section class="space-y-4 rounded-2xl bg-surface p-4 text-base" aria-label="Atención y cotización">
                    <div>
                      <h3 class="font-extrabold text-ink">Atención</h3>
                      <p class="mt-1 text-muted-foreground">Atendida por: <strong class="text-ink">{{ c.ejecutiva || "Aún sin asignar" }}</strong></p>
                      <p class="mt-1 text-sm text-muted-foreground">Tu ejecutiva te escribirá por correo o WhatsApp. Si tienes una consulta, escríbenos:</p>
                      <div class="mt-3 flex flex-wrap gap-2">
                        @if (waUrl(c); as wa) {
                          <a [href]="wa" target="_blank" rel="noopener noreferrer"
                            class="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white hover:opacity-90"><app-icon name="MessageSquare" class="h-4 w-4" /> WhatsApp</a>
                        }
                        @if (correoSoporte(); as mail) {
                          <a [href]="mailtoUrl(c, mail)" class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-primary"><app-icon name="Mail" class="h-4 w-4" /> Correo</a>
                        }
                      </div>
                    </div>
                    @if (c.monto) {
                      <div class="rounded-xl bg-secondary p-4 text-ink">
                        <h3 class="font-extrabold">Cotización adjunta</h3>
                        <p class="mt-1">Valor: <strong>{{ usd(c.monto) }}</strong> · validez de 72 horas</p>
                        <button type="button" (click)="descargarPdf(c)" class="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground">
                          <app-icon name="Download" class="h-4 w-4 shrink-0" /> <span class="min-w-0 truncate">Descargar {{ c.pdf || ("cotizacion-" + c.codigo + ".pdf") }}</span>
                        </button>
                      </div>
                    }
                  </section>

                  <section class="rounded-2xl bg-surface p-4 text-base" aria-label="Pasajeros">
                    <h3 class="font-extrabold text-ink">Pasajeros ({{ c.pasajerosDetalle.length }})</h3>
                    <ul class="mt-2 divide-y divide-border">
                      @for (p of c.pasajerosDetalle; track $index) {
                        <li class="py-2">
                          <p class="font-semibold text-ink">{{ p.nombres }} {{ p.apellidos }}</p>
                          <p class="text-sm text-muted-foreground">{{ p.numDoc }}@if (p.asistencia) { · <span class="font-semibold text-ink">requiere asistencia</span> }</p>
                        </li>
                      }
                    </ul>
                  </section>

                  <section class="rounded-2xl bg-surface p-4 text-base md:col-span-2 xl:col-span-1" aria-label="Seguimiento">
                    <h3 class="font-extrabold text-ink">Seguimiento</h3>
                    <ol class="mt-3 space-y-3 border-l-2 border-border pl-4">
                      @for (h of c.historial; track $index; let ult = $last) {
                        <li class="relative">
                          <span [class]="'absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ' + (ult ? 'bg-primary' : 'bg-muted-foreground/40')"></span>
                          <p [class]="ult ? 'font-bold text-ink' : 'font-semibold text-ink'">{{ h.estado }}</p>
                          <p class="text-sm text-muted-foreground">{{ hora(h.fecha) }}</p>
                        </li>
                      }
                    </ol>
                    @if (c.estado === "Cerrada") {
                      <p class="mt-3 text-base text-muted-foreground">Esta cotización está cerrada. Puedes <a routerLink="/vuelos" class="font-bold text-primary underline">crear una nueva</a>.</p>
                    }
                  </section>
                </div>
              }            </article>
          }
          @if (lista().length === 0) {
            <p class="rounded-2xl bg-card p-8 text-center text-base text-muted-foreground">No encontramos cotizaciones con esos criterios.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class CotizacionesPage {
  protected readonly catalog = inject(CatalogService);
  private readonly api = inject(ApiService);
  private readonly cotizaciones = signal<Cotizacion[]>([]);
  protected readonly usd = formatUSD;
  protected readonly abierta = signal<string | null>(null);
  protected readonly input = "h-12 w-full rounded-2xl border border-border bg-card px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/50";
  protected hora(iso: string) {
    return new Date(iso).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  protected alternar(codigo: string) {
    this.abierta.set(this.abierta() === codigo ? null : codigo);
  }
  /** La comunicación con la ejecutiva es por WhatsApp o correo: se usan los datos de soporte del programa. */
  protected waUrl(c: Cotizacion) {
    const n = (this.catalog.config()?.sitio.whatsapp ?? "").replace(/\D/g, "");
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(`Hola, escribo por mi cotización ${c.codigo} (${this.catalog.labelCiudad(c.origen)} → ${this.catalog.labelCiudad(c.destino)}).`)}` : "";
  }
  protected readonly correoSoporte = computed(() => this.catalog.config()?.sitio.correoSoporte ?? "");
  protected mailtoUrl(c: Cotizacion, correo: string) {
    return `mailto:${correo}?subject=${encodeURIComponent("Mi cotización " + c.codigo)}`;
  }
  /**
   * Descarga la cotización: el PDF que adjuntó la ejecutiva (si está guardado) o, en la demostración, un PDF generado con los datos
   * de la cotización. Así el botón siempre funciona, incluso con las cotizaciones de ejemplo.
   */
  protected descargarPdf(c: Cotizacion) {
    const nombre = c.pdf || `cotizacion-${c.codigo}.pdf`;
    const u = c.pdfUrl ?? "";
    if (/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(u)) return descargarBlob(blobDeDataUrl(u), nombre);
    if (/^https?:\/\//.test(u)) return void window.open(u, "_blank", "noopener");
    const ruta = `${this.catalog.labelCiudad(c.origen)} -> ${this.catalog.labelCiudad(c.destino)}`;
    descargarBlob(
      pdfDeTexto(`Cotizacion ${c.codigo}`, [
        `## ${ruta}`,
        `Tipo de viaje: ${c.tipoViaje} - Clase: ${c.clase}`,
        `Salida: ${c.salida}${c.regreso ? `   Regreso: ${c.regreso}` : ""}`,
        "",
        "## Pasajeros",
        ...c.pasajerosDetalle.map((p) => `${p.nombres} ${p.apellidos} - ${p.numDoc}`),
        "",
        "## Cotizacion",
        c.monto ? `Valor total: ${formatUSD(c.monto)}` : "Valor: por confirmar",
        "Validez: 72 horas desde su envio.",
        c.ejecutiva ? `Atendida por: ${c.ejecutiva}` : "",
        "",
        "Documento generado por la plataforma (demostracion).",
      ]),
      nombre,
    );
  }
  protected readonly fecha = formatFecha;
  protected readonly estadoCls: Record<string, string> = {
    Enviada: "bg-muted text-ink",
    "En revisión": "bg-secondary text-secondary-foreground",
    Cotizada: "bg-primary text-primary-foreground",
    Cerrada: "bg-muted text-muted-foreground",
  };

  protected readonly q = signal("");
  protected readonly desde = signal("");
  protected readonly hasta = signal("");

  constructor() {
    this.api.get<Cotizacion[]>("me/cotizaciones").subscribe({ next: (c) => this.cotizaciones.set(c), error: () => undefined });
  }

  protected readonly lista = computed(() => {
    const t = this.q().trim().toLowerCase();
    return this.cotizaciones().filter((c) => {
      const texto = `${c.codigo} ${this.catalog.labelCiudad(c.origen)} ${this.catalog.labelCiudad(c.destino)} ${c.clase} ${c.estado}`.toLowerCase();
      if (t && !texto.includes(t)) return false;
      if (this.desde() && c.fecha < this.desde()) return false;
      if (this.hasta() && c.fecha > this.hasta()) return false;
      return true;
    });
  });
}

/* ------------------------------------------------------------------ */
/* Detalle de destino                                                  */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-destino-page",
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (destino(); as destino) {
      <div class="bg-surface pb-14">
        <section class="relative">
          <img [src]="destino.imagen" [alt]="destino.ciudad + ', ' + destino.pais" width="1920" height="640" class="h-72 w-full object-cover sm:h-96 lg:h-[460px]" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10"></div>
          <div class="page-container absolute inset-x-0 bottom-0 pb-8">
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">{{ destino.pais }}</p>
            <h1 class="mt-2 max-w-3xl text-3xl font-extrabold text-primary-foreground lg:text-5xl">{{ destino.titulo }}</h1>
            <p class="mt-3 max-w-2xl text-base text-primary-foreground/90">{{ destino.resumen }}</p>
          </div>
        </section>

        <div class="page-container pt-8">
          <a routerLink="/vuelos" class="inline-flex items-center gap-2 text-base font-semibold text-primary"><app-icon name="ArrowLeft" class="h-4 w-4" /> Volver a Vuelos</a>

          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
              <h2 class="text-xl font-extrabold text-ink lg:text-2xl">Sobre el destino</h2>
              <p class="mt-3 text-base leading-relaxed text-muted-foreground">{{ destino.descripcion }}</p>

              <h2 class="mt-8 text-xl font-extrabold text-ink lg:text-2xl">Qué no te puedes perder</h2>
              <ul class="mt-4 grid gap-3 sm:grid-cols-2">
                @for (h of destino.highlights; track h) {
                  <li class="flex items-start gap-3 rounded-2xl bg-surface p-4 text-base text-ink"><app-icon name="Check" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {{ h }}</li>
                }
              </ul>
            </div>

            <aside class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
              <p class="text-base text-muted-foreground">Tarifas referenciales desde</p>
              <p class="mt-1 text-3xl font-extrabold text-primary">\${{ destino.desdeUSD }}</p>
              <p class="text-sm text-muted-foreground">por pasajero, ida y vuelta</p>

              <dl class="mt-5 grid gap-3">
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4">
                  <dt class="flex items-center gap-2 text-base text-muted-foreground"><app-icon name="Plane" class="h-4 w-4 text-primary" /> Vuelo</dt>
                  <dd class="text-right text-base font-bold text-ink">{{ destino.duracion }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4">
                  <dt class="flex items-center gap-2 text-base text-muted-foreground"><app-icon name="Clock" class="h-4 w-4 text-primary" /> Código</dt>
                  <dd class="text-right text-base font-bold text-ink">{{ destino.codigo }}</dd>
                </div>
                <div class="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4">
                  <dt class="flex items-center gap-2 text-base text-muted-foreground"><app-icon name="CalendarDays" class="h-4 w-4 text-primary" /> Mejor época</dt>
                  <dd class="text-right text-base font-bold text-ink">{{ destino.mejorEpoca }}</dd>
                </div>
              </dl>

              <a routerLink="/vuelos" class="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Cotizar este destino</a>
            </aside>
          </div>
        </div>
      </div>
    } @else if (cargado()) {
      <div class="bg-surface py-16">
        <div class="page-container">
          <h1 class="text-2xl font-extrabold text-ink">Destino no encontrado</h1>
          <a routerLink="/vuelos" class="mt-5 inline-flex min-h-12 items-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground lg:min-h-14">Volver a Vuelos</a>
        </div>
      </div>
    }
  `,
})
export class DestinoPage {
  private readonly catalog = inject(CatalogService);
  readonly slug = input.required<string>();
  protected readonly destino = computed(() => this.catalog.destinos().find((d) => d.slug === this.slug()));
  private readonly seo = inject(SeoService);
  private readonly seoDestino = effect(() => {
    const d = this.destino();
    if (!d) return;
    this.seo.detalle({
      titulo: `Vuelos a ${d.ciudad}, ${d.pais} | {programa}`,
      descripcion: (d.resumen || d.descripcion).slice(0, 300),
      imagen: d.imagen,
    });
  });
  protected readonly cargado = computed(() => this.catalog.destinos().length > 0);
}
