import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChildren } from "@angular/core";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import { ApiService } from "../core/api.service";
import { CatalogService, TEXTOS_INGRESO, type TextosIngreso } from "../core/catalog.service";
import { BrandService } from "../core/brand.service";
import { StoreService } from "../core/store.service";
import { SesionService } from "../core/sesion.service";
import type { Direccion } from "../core/models";
import { IconComponent } from "../shared/icon.component";
import { ciudadesDe, hayCiudadesFijas } from "../core/ubicaciones";
import { limitesNacimiento } from "../core/validaciones";
import { agruparCampos, claveExtra, erroresPerfil } from "../core/validar-perfil";
import { DireccionFormComponent } from "../shared/direccion-form";
import { erroresDireccion } from "../core/validar-direccion";
import { TelefonoInputComponent } from "../shared/telefono-input";
import { FlagComponent } from "../shared/flag.component";
import { LogoComponent, ModalComponent } from "../shared/ui";
import { MarkdownComponent } from "../shared/markdown.component";
import { legalAMarkdown } from "../core/markdown";

const INPUT = "mt-1 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink focus:ring-2 focus:ring-primary/50";
const vacia = (): Omit<Direccion, "id"> => ({ alias: "", recibe: "", telefono: "", direccion: "", distrito: "" });

/* ------------------------------------------------------------------ */
/* Mi perfil                                                           */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-perfil-page",
  imports: [IconComponent, ModalComponent, DireccionFormComponent, TelefonoInputComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <h1 class="text-center text-2xl font-extrabold text-ink lg:text-3xl">Mi perfil</h1>

        <div class="mx-auto mt-6 flex w-fit gap-2 rounded-full bg-card p-1 shadow-[var(--shadow-card)]" role="tablist">
          @for (t of tabs; track t.value) {
            <button type="button" role="tab" [attr.aria-selected]="tab() === t.value" (click)="tab.set(t.value)"
              [class]="'min-h-12 rounded-full px-6 text-base font-semibold transition-colors lg:min-h-14 ' + (tab() === t.value ? 'bg-secondary text-primary' : 'text-ink hover:text-primary')">
              {{ t.label }}
            </button>
          }
        </div>

        <div class="mx-auto mt-8 max-w-3xl">
          @if (tab() === "datos") {
            @if (perfil(); as p) {
              <form class="grid gap-6" (submit)="guardarDatos($event)">
                <section class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]">
                  <h2 class="text-lg font-extrabold text-ink">Mis datos</h2>
                  <dl class="mt-4 grid gap-2 rounded-2xl bg-surface p-5 text-base sm:grid-cols-2">
                    <dt class="text-muted-foreground">Tipo de documento</dt><dd class="font-semibold text-ink">{{ p.tipoDocumento }}</dd>
                    <dt class="text-muted-foreground">Código de participante</dt><dd class="font-semibold text-ink">{{ p.codigoParticipante }}</dd>
                    <dt class="text-muted-foreground">Correo de acceso</dt><dd class="font-semibold text-ink">{{ p.correo }}</dd>
                  </dl>

                  <div class="mt-6 space-y-8">
                    <fieldset>
                      <legend class="text-base font-extrabold text-ink">Datos personales</legend>
                      <div class="mt-3 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label class="text-base font-semibold text-ink" for="pf-nombres">Nombres *</label>
                          <input id="pf-nombres" autocomplete="given-name" maxlength="60" [value]="datos().nombres" (input)="setDato('nombres', $event)" (blur)="tocar('nombres')" [attr.aria-invalid]="!!ver('nombres')" [attr.aria-describedby]="ver('nombres') ? 'err-pf-nombres' : null" [class]="input + (ver('nombres') ? ' ring-2 ring-destructive/70' : '')" />
                          @if (ver('nombres'); as m) { <p id="err-pf-nombres" role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
                        </div>
                        @if (!apellidosSeparados()) {
                          <div>
                            <label class="text-base font-semibold text-ink" for="pf-apellidos">Apellidos *</label>
                            <input id="pf-apellidos" autocomplete="family-name" maxlength="60" [value]="datos().apellidos" (input)="setDato('apellidos', $event)" (blur)="tocar('apellidos')" [attr.aria-invalid]="!!ver('apellidos')" [attr.aria-describedby]="ver('apellidos') ? 'err-pf-apellidos' : null" [class]="input + (ver('apellidos') ? ' ring-2 ring-destructive/70' : '')" />
                            @if (ver('apellidos'); as m) { <p id="err-pf-apellidos" role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
                          </div>
                        }
                        @for (c of grupos().personal; track c.id) { <ng-container [ngTemplateOutlet]="campoTpl" [ngTemplateOutletContext]="{ $implicit: c }" /> }
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend class="text-base font-extrabold text-ink">Contacto</legend>
                      <div class="mt-3 grid gap-4 sm:grid-cols-2">
                        @for (c of grupos().contacto; track c.id) { <ng-container [ngTemplateOutlet]="campoTpl" [ngTemplateOutletContext]="{ $implicit: c }" /> }
                        @if (!campoCelular()) {
                          <div>
                            <label class="text-base font-semibold text-ink" for="pf-telefono">Teléfono *</label>
                            <div class="mt-2"><app-telefono-input inputId="pf-telefono" [valor]="datos().telefono" [invalido]="!!ver('telefono')" [describe]="ver('telefono') ? 'err-pf-telefono' : ''" (valorChange)="setTelefono($event)" (tocado)="tocar('telefono')" /></div>
                            <p class="mt-1 text-sm text-muted-foreground">Solo el número: {{ brand.pais().telefonoDigitos }} dígitos.</p>
                            @if (ver('telefono'); as m) { <p id="err-pf-telefono" role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
                          </div>
                        }
                      </div>
                    </fieldset>

                    @if (grupos().ubicacion.length) {
                      <fieldset>
                        <legend class="text-base font-extrabold text-ink">Ubicación</legend>
                        <div class="mt-3 grid gap-4 sm:grid-cols-2">
                          @for (c of grupos().ubicacion; track c.id) { <ng-container [ngTemplateOutlet]="campoTpl" [ngTemplateOutletContext]="{ $implicit: c }" /> }
                        </div>
                      </fieldset>
                    }

                    @if (grupos().otros.length) {
                      <fieldset>
                        <legend class="text-base font-extrabold text-ink">Otros datos</legend>
                        <div class="mt-3 grid gap-4 sm:grid-cols-2">
                          @for (c of grupos().otros; track c.id) { <ng-container [ngTemplateOutlet]="campoTpl" [ngTemplateOutletContext]="{ $implicit: c }" /> }
                        </div>
                      </fieldset>
                    }
                  </div>

                  <ng-template #campoTpl let-c>
          <div [class]="c.ancho === 'completa' ? 'sm:col-span-2' : ''">
            @switch (c.tipo) {
              @case ("checkbox") {
                <label class="flex min-h-12 items-center gap-3 text-base font-semibold text-ink">
                  <input type="checkbox" [checked]="!!valor(c.id)" (change)="setExtra(c.id, $any($event.target).checked)" class="h-5 w-5 accent-[var(--color-primary)]" />
                  {{ etiqueta(c) }}
                </label>
              }
              @case ("select") {
                <label class="text-base font-semibold text-ink">{{ etiqueta(c) }}
                  @if (c.mapeo === "ciudad" && ciudadFija()) {
                    <select [id]="'pf-' + c.id" [class]="input + ' select-field' + (ver(clave(c.id)) ? ' ring-2 ring-destructive/70' : '')" [disabled]="!provinciaElegida()" [attr.aria-invalid]="!!ver(clave(c.id))" (change)="setExtra(c.id, $any($event.target).value)" (blur)="tocar(clave(c.id))">
                      <option value="" [selected]="!valor(c.id)">{{ provinciaElegida() ? "Selecciona tu ciudad" : "Elige primero la provincia" }}</option>
                      @for (o of ciudadesElegidas(); track o) { <option [value]="o" [selected]="valor(c.id) === o">{{ o }}</option> }
                    </select>
                  } @else {
                    <select [id]="'pf-' + c.id" [class]="input + ' select-field' + (ver(clave(c.id)) ? ' ring-2 ring-destructive/70' : '')" [attr.aria-invalid]="!!ver(clave(c.id))" (change)="cambiarSelect(c, $any($event.target).value)" (blur)="tocar(clave(c.id))">
                      <option value="" [selected]="!valor(c.id)">Selecciona</option>
                      @for (o of c.opciones ?? []; track o) { <option [value]="o" [selected]="valor(c.id) === o">{{ o }}</option> }
                    </select>
                  }
                </label>
              }
              @case ("textarea") {
                <label class="text-base font-semibold text-ink">{{ etiqueta(c) }}
                  <textarea rows="3" maxlength="500" [class]="input + ' h-auto py-3' + (ver(clave(c.id)) ? ' ring-2 ring-destructive/70' : '')" [attr.aria-invalid]="!!ver(clave(c.id))" [value]="valor(c.id) || ''" (input)="setExtra(c.id, $any($event.target).value)" (blur)="tocar(clave(c.id))"></textarea>
                </label>
              }
              @default {
                <label class="text-base font-semibold text-ink">{{ etiqueta(c) }}
                  @if (c.mapeo === "ciudad") {
                    <input maxlength="80" [class]="input + (ver(clave(c.id)) ? ' ring-2 ring-destructive/70' : '')" [attr.aria-invalid]="!!ver(clave(c.id))" [value]="valor(c.id) || ''" (input)="setExtra(c.id, $any($event.target).value)" (blur)="tocar(clave(c.id))" />
                  } @else if ($any(c).tipo === "telefono") {
                    <span class="mt-1 block"><app-telefono-input [inputId]="'pf-' + c.id" [valor]="textoDe(c.id)" [invalido]="!!ver(clave(c.id))" (valorChange)="setExtra(c.id, $event)" (tocado)="tocar(clave(c.id))" /></span>
                  } @else if (c.mapeo === "fecha_nacimiento") {
                    <input [id]="'pf-' + c.id" type="date" [attr.min]="limNac.min" [attr.max]="limNac.max" [class]="input + (ver(clave(c.id)) ? ' ring-2 ring-destructive/70' : '')" [attr.aria-invalid]="!!ver(clave(c.id))" [value]="valor(c.id) || ''" (input)="setExtra(c.id, $any($event.target).value)" (blur)="tocar(clave(c.id))" />
                  } @else {
                    <input [id]="'pf-' + c.id" [type]="tipoInput(c.tipo)" [attr.inputmode]="$any(c).tipo === 'telefono' ? 'tel' : null" [attr.maxlength]="c.tipo === 'fecha' ? null : 100" [class]="input + (ver(clave(c.id)) ? ' ring-2 ring-destructive/70' : '')" [attr.aria-invalid]="!!ver(clave(c.id))" [value]="valor(c.id) || ''" (input)="setExtra(c.id, $any($event.target).value)" (blur)="tocar(clave(c.id))" />
                  }
                </label>
              }
            }
            @if (c.mapeo === "fecha_nacimiento") { <p class="mt-1 text-sm text-muted-foreground">Debes ser mayor de 18 años.</p> }
            @if (c.ayuda) { <p class="mt-1 text-sm text-muted-foreground">{{ c.ayuda }}</p> }
            @if (ver(clave(c.id)); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
          </div>
                  </ng-template>
                </section>

                <section class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]" aria-labelledby="com-titulo">
                  <h2 id="com-titulo" class="text-lg font-extrabold text-ink">Comunicaciones</h2>
                  <label class="mt-4 flex cursor-pointer items-start gap-3 text-base text-ink">
                    <input type="checkbox" class="mt-1 h-5 w-5 accent-[var(--color-primary)]" [checked]="recibeNovedades()" [disabled]="recibeNovedades() === null" (change)="cambiarNovedades($any($event.target).checked)" />
                    <span><b>Quiero recibir novedades y promociones por correo</b><br /><span class="text-sm text-muted-foreground">Puedes cambiarlo cuando quieras. Los avisos de tu cuenta (código de acceso, pedidos, puntos) los recibes siempre.</span></span>
                  </label>
                  @if (errorNovedades()) { <p role="alert" class="mt-2 text-sm font-semibold text-destructive">{{ errorNovedades() }}</p> }
                  @if (novedadesGuardado()) { <p role="status" class="mt-2 text-sm text-ink">Preferencia guardada.</p> }
                </section>

                @if (errorForm()) {
                  <p role="alert" class="rounded-2xl bg-aviso-fondo px-5 py-4 text-base font-semibold text-aviso">{{ errorForm() }}</p>
                }
                @if (guardado()) {
                  <p role="status" class="rounded-2xl bg-lima/20 px-5 py-4 text-base text-ink">Tus cambios se guardaron correctamente.</p>
                }

                <button type="submit" class="min-h-12 rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Guardar cambios</button>
              </form>
            }
          } @else {
            <section class="rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <h2 class="text-lg font-extrabold text-ink">Mis direcciones</h2>
                <button type="button" (click)="editando.set(null); nueva.set(vacia())"
                  class="inline-flex min-h-12 items-center gap-2 rounded-full bg-secondary px-6 text-base font-bold uppercase tracking-wide text-primary lg:min-h-14">
                  <app-icon name="Plus" class="h-5 w-5" /> Agregar nueva dirección
                </button>
              </div>

              <ul class="mt-5 grid gap-4">
                @for (d of store.direcciones(); track d.id) {
                  <li class="flex items-center justify-between gap-4 rounded-2xl border border-border p-5">
                    <div class="min-w-0">
                      <p class="text-base font-extrabold text-ink">{{ d.alias }}</p>
                      <p class="text-base text-muted-foreground">{{ d.direccion }} — {{ d.distrito }}</p>
                      <p class="text-base text-muted-foreground">Recibe: {{ d.recibe }} · {{ d.telefono }}</p>
                      @if (d.lat != null && d.lng != null) {
                        <a [href]="'https://www.openstreetmap.org/?mlat=' + d.lat + '&mlon=' + d.lng + '#map=17/' + d.lat + '/' + d.lng" target="_blank" rel="noreferrer" class="mt-1 inline-flex items-center gap-1 text-base font-semibold text-primary underline"><app-icon name="MapPin" class="h-4 w-4" /> Ver en el mapa</a>
                      }
                    </div>
                    <div class="flex shrink-0 gap-2">
                      <button type="button" [attr.aria-label]="'Editar dirección ' + d.alias" (click)="nueva.set(null); editando.set({ ...d })"
                        class="grid h-12 w-12 place-items-center rounded-full border border-border text-primary hover:border-primary"><app-icon name="Pencil" class="h-5 w-5" /></button>
                      <button type="button" [attr.aria-label]="'Eliminar dirección ' + d.alias" (click)="porEliminar.set(d)"
                        class="grid h-12 w-12 place-items-center rounded-full border border-border text-destructive hover:border-destructive"><app-icon name="Trash2" class="h-5 w-5" /></button>
                    </div>
                  </li>
                }
                @if (store.direcciones().length === 0) {
                  <li class="rounded-2xl bg-surface p-6 text-center text-base text-muted-foreground">Aún no tienes direcciones registradas.</li>
                }
              </ul>

              <app-modal [open]="!!porEliminar()" title="Eliminar dirección" (closed)="porEliminar.set(null)">
                @if (porEliminar(); as d) {
                  <p class="text-base text-ink">¿Seguro que deseas eliminar la dirección <strong>{{ d.alias }}</strong>? Esta acción no se puede deshacer.</p>
                  <p class="mt-2 text-base text-muted-foreground">{{ d.direccion }} — {{ d.distrito }}</p>
                  <div class="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" (click)="porEliminar.set(null)"
                      class="min-h-12 rounded-full border border-border bg-card text-base font-bold uppercase tracking-wide text-ink transition-colors hover:border-primary hover:text-primary lg:min-h-14">Cancelar</button>
                    <button type="button" (click)="store.removeDireccion(d.id); porEliminar.set(null)"
                      class="min-h-12 rounded-full bg-destructive text-base font-bold uppercase tracking-wide text-destructive-foreground transition-transform hover:scale-[1.02] lg:min-h-14">Sí, eliminar</button>
                  </div>
                }
              </app-modal>

              <app-modal [open]="!!form()" [title]="editando() ? 'Editar dirección' : 'Nueva dirección'" (closed)="cerrarForm()">
                @if (form(); as f) {
                  <form class="grid gap-4" (submit)="guardarDireccion($event)">
                    <app-direccion-form [valor]="f" [intento]="intentoDir()" (valorChange)="actualizarForm($event)" />
                    <button type="submit" class="min-h-12 rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Guardar dirección</button>
                  </form>
                }
              </app-modal>
            </section>
          }
        </div>
      </div>
    </div>
  `,
})
export class PerfilPage {
  protected readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  protected readonly input = INPUT;
  protected readonly vacia = vacia;
  protected readonly tabs = [
    { value: "datos", label: "Datos personales" },
    { value: "direcciones", label: "Direcciones de envío" },
  ] as const;

  protected readonly tab = signal<"datos" | "direcciones">("datos");
  protected readonly perfil = this.store.perfil;
  protected readonly guardado = signal(false);
  private readonly catalog = inject(CatalogService);
  /** Campos extra que el admin configura en Admin → Formulario de datos. */
  protected readonly camposExtra = computed(() => this.catalog.config()?.formulario ?? []);
  private readonly extraEditado = signal<Record<string, string | boolean>>({});
  protected readonly errorForm = signal("");
  protected readonly intentoGuardar = signal(false);

  /** Consentimiento de novedades por correo; null mientras carga. Se guarda al marcarlo. */
  protected readonly recibeNovedades = signal<boolean | null>(null);
  protected readonly errorNovedades = signal("");
  protected readonly novedadesGuardado = signal(false);
  private readonly cargaNovedades = this.api.get<{ recibe: boolean }>("me/novedades").subscribe({ next: (r) => this.recibeNovedades.set(r.recibe), error: () => this.errorNovedades.set("No pudimos cargar tu preferencia de novedades.") });
  protected cambiarNovedades(recibe: boolean) {
    this.errorNovedades.set("");
    this.novedadesGuardado.set(false);
    const antes = this.recibeNovedades();
    this.recibeNovedades.set(recibe);
    this.api.put<{ recibe: boolean }>("me/novedades", { recibe }).subscribe({
      next: (r) => { this.recibeNovedades.set(r.recibe); this.novedadesGuardado.set(true); },
      error: () => { this.recibeNovedades.set(antes); this.errorNovedades.set("No pudimos guardar tu preferencia. Inténtalo de nuevo."); },
    });
  }

  protected valor(id: string) {
    const v = this.extraEditado()[id] ?? this.perfil()?.extra?.[id];
    if (v !== undefined) return v;
    // Apellido paterno y materno se completan con los apellidos que ya tiene la cuenta.
    const m = this.camposExtra().find((c) => c.id === id)?.mapeo;
    if (m === "celular") return this.perfil()?.telefono ?? "";
    if (m === "apellido_paterno" || m === "apellido_materno") {
      const [paterno = "", ...resto] = (this.perfil()?.apellidos ?? "").trim().split(/\s+/);
      return m === "apellido_paterno" ? paterno : resto.join(" ");
    }
    return undefined;
  }
  protected textoDe(id: string): string {
    const v = this.valor(id);
    return typeof v === "string" ? v : "";
  }
  /** Con apellido paterno y materno configurados, el campo "Apellidos" sobra: se arma con ellos. */
  protected readonly apellidosSeparados = computed(() => this.camposExtra().some((c) => c.mapeo === "apellido_paterno"));
  /** Si el formulario trae "N.º de celular", ese es el teléfono de la cuenta y no se pide otro. */
  protected readonly campoCelular = computed(() => this.camposExtra().find((c) => c.mapeo === "celular"));
  /** Orden lógico del formulario: datos personales, contacto, ubicación y el resto. */
  protected readonly grupos = computed(() => agruparCampos(this.camposExtra()));
  protected setTelefono(v: string) {
    this.edits.update((x) => ({ ...x, telefono: v }));
  }
  protected setExtra(id: string, v: string | boolean) {
    this.extraEditado.update((x) => ({ ...x, [id]: v }));
  }

  /* ---- Validación en vivo: el error aparece al salir del campo o al intentar guardar ---- */
  protected readonly limNac = limitesNacimiento();
  protected readonly clave = claveExtra;
  private readonly tocados = signal<ReadonlySet<string>>(new Set());
  protected tocar(k: string) {
    if (!this.tocados().has(k)) this.tocados.update((s) => new Set(s).add(k));
  }
  private readonly extraActual = computed(() => {
    const base = { ...(this.perfil()?.extra ?? {}), ...this.extraEditado() } as Record<string, string | boolean | undefined>;
    for (const c of this.camposExtra()) if (base[c.id] === undefined) base[c.id] = this.valor(c.id);
    return base;
  });
  /** Apellidos que se guardan: los de paterno + materno si están configurados. */
  private apellidosFinal() {
    if (!this.apellidosSeparados()) return this.datos().apellidos.trim();
    const v = (m: string) => String(this.extraActual()[this.camposExtra().find((c) => c.mapeo === m)?.id ?? ""] ?? "").trim();
    return `${v("apellido_paterno")} ${v("apellido_materno")}`.trim();
  }
  protected readonly errores = computed(() => erroresPerfil({ ...this.datos(), apellidos: this.apellidosSeparados() ? "x" : this.datos().apellidos, telefono: this.campoCelular() ? "999999990" : this.datos().telefono }, this.extraActual(), this.camposExtra(), this.brand.pais(), this.brand.provinciasEnvio()));
  protected ver(k: string): string {
    return this.intentoGuardar() || this.tocados().has(k) ? (this.errores()[k] ?? "") : "";
  }

  /* ---- Provincia y ciudad en cascada: listas fijas, la ciudad depende de la provincia ---- */
  protected readonly ciudadFija = computed(() => hayCiudadesFijas(this.brand.pais().codigo));
  private readonly campoProvincia = computed(() => this.camposExtra().find((c) => c.mapeo === "provincia"));
  private readonly campoCiudad = computed(() => this.camposExtra().find((c) => c.mapeo === "ciudad"));
  protected readonly provinciaElegida = computed(() => String(this.extraActual()[this.campoProvincia()?.id ?? ""] ?? ""));
  protected readonly ciudadesElegidas = computed(() => ciudadesDe(this.brand.pais().codigo, this.provinciaElegida()));
  /** Al cambiar la provincia, la ciudad elegida deja de valer y se borra. */
  protected cambiarSelect(c: { id: string; mapeo?: string | undefined }, v: string) {
    const antes = String(this.valor(c.id) ?? "");
    this.setExtra(c.id, v);
    if (c.mapeo === "provincia" && v !== antes && this.campoCiudad()) this.setExtra(this.campoCiudad()!.id, "");
  }
  protected etiqueta(c: { etiqueta: string; obligatorio: boolean }) {
    return c.etiqueta + (c.obligatorio ? " *" : "");
  }
  protected tipoInput(t: string) {
    return ({ email: "email", telefono: "tel", numero: "number", fecha: "date" } as Record<string, string>)[t] ?? "text";
  }
  private readonly edits = signal<Partial<{ nombres: string; apellidos: string; telefono: string }>>({});
  protected readonly datos = computed(() => {
    const p = this.perfil();
    return { nombres: p?.nombres ?? "", apellidos: p?.apellidos ?? "", telefono: p?.telefono ?? "", ...this.edits() };
  });

  protected readonly editando = signal<Direccion | null>(null);
  protected readonly nueva = signal<Omit<Direccion, "id"> | null>(null);
  protected readonly porEliminar = signal<Direccion | null>(null);
  protected readonly form = computed<Omit<Direccion, "id"> | null>(() => this.editando() ?? this.nueva());

  protected setDato(k: "nombres" | "apellidos" | "telefono", e: Event) {
    this.edits.update((x) => ({ ...x, [k]: (e.target as HTMLInputElement).value }));
  }
  protected guardarDatos(e: Event) {
    e.preventDefault();
    this.intentoGuardar.set(true);
    const n = Object.keys(this.errores()).length;
    if (n) {
      this.guardado.set(false);
      this.errorForm.set(`Revisa ${n === 1 ? "el campo marcado" : `los ${n} campos marcados`} antes de guardar.`);
      return;
    }
    this.errorForm.set("");
    const extra = Object.fromEntries(Object.entries({ ...(this.perfil()?.extra ?? {}), ...this.extraActual() }).filter(([, v]) => v !== undefined)) as Record<string, string | boolean>;
    const celular = this.campoCelular() ? String(this.extraActual()[this.campoCelular()!.id] ?? "").trim() : "";
    const datos = { ...this.datos(), nombres: this.datos().nombres.trim(), apellidos: this.apellidosFinal(), telefono: this.campoCelular() ? celular : this.datos().telefono.trim() };
    this.api.put("me/perfil", { ...datos, extra }).subscribe({
      next: () => {
        this.store.perfil.update((p) => (p ? { ...p, ...datos, extra } : p));
        this.guardado.set(true);
      },
      error: (er) => { this.guardado.set(false); this.errorForm.set(er?.error?.message ?? "No pudimos guardar tus datos. Inténtalo de nuevo."); },
    });
  }

  protected readonly brand = inject(BrandService);
  protected readonly intentoDir = signal(false);
  protected actualizarForm(v: Omit<Direccion, "id">) {
    const ed = this.editando();
    if (ed) this.editando.set({ ...v, id: ed.id });
    else this.nueva.set(v);
  }
  protected cerrarForm() {
    this.intentoDir.set(false);
    this.editando.set(null);
    this.nueva.set(null);
  }
  protected guardarDireccion(e: Event) {
    e.preventDefault();
    const ed = this.editando();
    const nu = this.nueva();
    const d = ed ?? nu;
    this.intentoDir.set(true);
    if (d && Object.keys(erroresDireccion(d, this.brand.pais(), this.brand.provinciasEnvio())).length) return;
    if (ed) this.store.updateDireccion(ed);
    else if (nu) this.store.addDireccion(nu);
    this.cerrarForm();
  }
}

/* ------------------------------------------------------------------ */
/* Contáctanos                                                         */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-contacto-page",
  imports: [IconComponent, ModalComponent, FlagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-surface py-10 lg:py-14">
      <div class="page-container">
        <div class="grid gap-6 overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)] lg:grid-cols-2 lg:gap-0">
          <div class="p-6 sm:p-9">
            <h1 class="text-center text-xl font-extrabold text-ink sm:text-2xl">¿Alguna pregunta o sugerencia?<br />Ponte en contacto con nosotros</h1>

            <dl class="mt-7 rounded-2xl bg-surface p-5 text-base">
              <div class="flex flex-wrap justify-between gap-2"><dt class="font-semibold text-ink">Nombre completo</dt><dd class="text-muted-foreground">{{ nombreCompleto() }}</dd></div>
              <div class="mt-3 flex flex-wrap justify-between gap-2"><dt class="font-semibold text-ink">Correo electrónico</dt><dd class="text-muted-foreground">{{ perfil()?.correo }}</dd></div>
            </dl>

            <form class="mt-6" (submit)="$event.preventDefault(); enviar()">
              <label for="telefono" class="block text-base font-semibold text-ink">Teléfono</label>
              <div class="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-4">
                <span class="flex items-center gap-2 text-base text-ink"><app-flag [codigo]="brand.pais().codigo" [nombre]="brand.pais().nombre" [ancho]="24" />{{ brand.pais().telefonoPrefijo }}</span>
                <input id="telefono" inputmode="tel" [attr.maxlength]="brand.pais().telefonoDigitos" [value]="telefono()" (input)="onTelefono($event)" placeholder="99 654 3210"
                  class="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none" />
              </div>

              <label for="consulta" class="mt-5 block text-base font-semibold text-ink">Consulta</label>
              <textarea id="consulta" rows="4" maxlength="1000" [value]="consulta()" (input)="consulta.set($any($event.target).value)" placeholder="Escribe aquí"
                class="mt-2 w-full rounded-2xl border border-border bg-surface p-4 text-base text-ink focus:ring-2 focus:ring-primary/50"></textarea>

              <button type="submit" [disabled]="telefono().length < brand.pais().telefonoDigitos || consulta().trim().length < 5"
                class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 lg:min-h-14">
                <app-icon name="Send" class="h-5 w-5" /> Enviar
              </button>
            </form>

            <section class="mt-7 overflow-hidden rounded-2xl bg-surface p-5">
              <h2 class="text-lg font-extrabold text-ink">Contáctanos</h2>
              @if (contacto(); as c) {
                <ul class="mt-4 space-y-3 text-base text-ink">
                  @if (c.horario) { <li class="flex items-start gap-3"><app-icon name="Clock" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span class="min-w-0 break-words">{{ c.horario }}</span></li> }
                  <li class="flex items-start gap-3"><app-icon name="Phone" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span class="min-w-0 break-words">{{ c.telefonos }}</span></li>
                  <li class="flex items-start gap-3"><app-icon name="Mail" class="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span class="min-w-0 break-all">{{ c.correo }}</span></li>
                </ul>
              }
            </section>
          </div>

          <div class="relative min-h-[20rem] lg:min-h-full">
            <img [src]="brand.imagenes().contacto" alt="Asesora BanBif atendiendo consultas desde su laptop" width="1024" height="1280" loading="lazy"
              class="h-full w-full object-cover lg:absolute lg:inset-0" />
          </div>
        </div>
      </div>
    </div>

    <app-modal [open]="enviado()" title="Consulta enviada" (closed)="enviado.set(false)">
      <p class="text-base text-ink">¡Gracias {{ perfil()?.nombres }}! Recibimos tu consulta y te responderemos a {{ perfil()?.correo }} dentro de las próximas 48 horas hábiles.</p>
      <button type="button" (click)="reiniciar()" class="mt-6 min-h-12 w-full rounded-full bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground lg:min-h-14">Entendido</button>
    </app-modal>
  `,
})
export class ContactoPage {
  protected readonly brand = inject(BrandService);
  private readonly store = inject(StoreService);
  private readonly api = inject(ApiService);
  private readonly catalog = inject(CatalogService);
  protected readonly perfil = this.store.perfil;
  /** Datos de la tarjeta Contáctanos (Admin → Configuración → Página Contáctanos); lo que falte usa los de soporte del pie. */
  protected readonly contacto = computed(() => {
    const cfg = this.catalog.config();
    if (!cfg) return undefined;
    return {
      horario: cfg.contacto?.horario?.trim() ?? "",
      telefonos: cfg.contacto?.telefonos?.trim() || cfg.sitio.telefonoPie,
      correo: cfg.contacto?.correo?.trim() || cfg.sitio.correoSoporte,
    };
  });
  protected readonly nombreCompleto = computed(() => (this.perfil() ? `${this.perfil()!.nombres} ${this.perfil()!.apellidos}` : ""));

  protected readonly telefono = signal("");
  protected readonly consulta = signal("");
  protected readonly enviado = signal(false);

  protected onTelefono(e: Event) {
    this.telefono.set((e.target as HTMLInputElement).value.replace(/\D/g, ""));
  }
  protected enviar() {
    this.api.post("contacto", { telefono: this.telefono(), consulta: this.consulta() }).subscribe(() => this.enviado.set(true));
  }
  protected reiniciar() {
    this.enviado.set(false);
    this.consulta.set("");
    this.telefono.set("");
  }
}

/* ------------------------------------------------------------------ */
/* Login (código OTP de 6 dígitos)                                     */
/* ------------------------------------------------------------------ */
@Component({
  selector: "app-login-page",
  imports: [IconComponent, LogoComponent, ModalComponent, MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen bg-surface font-sans lg:grid-cols-2">
      <!-- Banner lateral -->
      <aside class="relative hidden overflow-hidden bg-brand-dark lg:block">
        <img [src]="brand.imagenes().login" [alt]="'Clientes de ' + brand.marca().nombre + ' disfrutando sus beneficios'" width="900" height="1200" class="h-full w-full object-cover" />
        <div class="absolute inset-0 bg-header-gradient opacity-80"></div>
        <div class="absolute inset-x-0 bottom-0 p-10 text-white">
          <p class="text-sm font-semibold uppercase tracking-widest text-white">{{ brand.programa() }}</p>
          <h2 class="mt-3 max-w-md text-3xl font-extrabold leading-tight">{{ txt().tituloLateral }}</h2>
          <p class="mt-4 max-w-md text-base text-white/85">{{ txt().mensajeLateral }}</p>
        </div>
      </aside>

      <!-- Formulario -->
      <main class="flex items-center justify-center px-4 py-10 sm:px-8">
        <div class="w-full max-w-md">
          <div class="flex justify-center px-6 py-4 lg:hidden"><app-logo variant="light" class="h-16" /></div>
          <div class="mt-6 hidden justify-center lg:flex"><app-logo variant="light" class="h-16" /></div>

          <div class="mt-8 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
            @if (paso() > 1) {
              <button type="button" (click)="error.set(''); paso.set(1)" class="mb-4 flex min-h-11 items-center gap-2 text-base font-semibold text-primary">
                <app-icon name="ArrowLeft" class="h-5 w-5" /> Volver
              </button>
            }

            @if (paso() === 1) {
              <form (submit)="continuar($event)">
                <h1 class="text-2xl font-extrabold text-ink">{{ txt().tituloFormulario }}</h1>
                <p class="mt-2 text-base text-muted-foreground">{{ txt().subtituloFormulario }}</p>

                <label for="tipo-doc" class="mt-6 block text-base font-semibold text-ink">Tipo de documento</label>
                <select id="tipo-doc" [value]="tipoVal()" (change)="tipo.set($any($event.target).value); documento.set('')"
                  class="select-field mt-2 h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none focus:ring-2 focus:ring-primary/60">
                  @for (t of tipos(); track t.value) { <option [value]="t.value" [selected]="t.value === tipoVal()">{{ t.label }}</option> }
                </select>

                <label for="num-doc" class="mt-5 block text-base font-semibold text-ink">Número de documento</label>
                <input id="num-doc" [value]="documento()" (input)="onDocumento($event)" [attr.inputmode]="tipoActual()?.numerico ? 'numeric' : 'text'"
                  [placeholder]="txt().placeholderDocumento"
                  class="mt-2 h-14 w-full rounded-2xl border border-border bg-surface px-4 text-base text-ink outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/60" />

                @if (error()) { <p class="mt-3 text-base text-destructive">{{ error() }}</p> }

                <button type="submit" class="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90">Continuar</button>
                @if (txt().notaLegal) { <app-markdown [enLinea]="true" clase="md-corto" [texto]="txt().notaLegal" (ancla)="abrirLegal($event)" /> }
              </form>
            } @else {
              <form (submit)="validar($event)">
                <h1 class="text-2xl font-extrabold text-ink">{{ txt().tituloCodigo }}</h1>
                <div class="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-celeste/15 text-celeste"><app-icon name="Mail" class="h-5 w-5" /></span>
                  <p class="min-w-0 text-base text-muted-foreground">Enviamos un código de 6 dígitos a tu correo <strong class="text-ink">{{ correoOfuscado() }}</strong>.</p>
                </div>

                <div class="mt-6 flex justify-between gap-2">
                  @for (d of codigo(); track $index; let i = $index) {
                    <input #digito [value]="d" (input)="onDigito(i, $event)" (keydown)="onKey(i, $event)" inputmode="numeric" [attr.aria-label]="'Dígito ' + (i + 1)"
                      [class]="'h-14 w-full min-w-0 rounded-2xl border border-border bg-surface text-center text-xl font-bold text-ink outline-none focus:ring-2 focus:ring-primary/60 ' + (d ? 'border-primary' : '')" />
                  }
                </div>

                @if (error()) { <p class="mt-3 text-base text-destructive">{{ error() }}</p> }

                <button type="submit" [disabled]="cargando()"
                  class="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70">
                  @if (cargando()) { <app-icon name="Loader2" class="h-5 w-5 animate-spin" /> Validando… } @else { <app-icon name="Check" class="h-5 w-5" /> Validar e ingresar }
                </button>
                <button type="button" class="mt-3 flex min-h-11 w-full items-center justify-center text-base font-semibold text-primary">Reenviar código</button>
              </form>
            }
          </div>
        </div>
      </main>

      <app-modal [open]="!!legal()" [title]="legal() === 'privacidad' ? 'Política de privacidad' : 'Términos y condiciones'" maxWidth="max-w-3xl" (closed)="legal.set(null)">
        <app-markdown [texto]="textoLegal()" />
      </app-modal>
    </div>
  `,
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly store = inject(StoreService);
  private readonly sesion = inject(SesionService);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly brand = inject(BrandService);
  protected readonly tipos = computed(() => this.brand.pais().documentos);
  private readonly catalogo = inject(CatalogService);
  /** Textos editables en Admin → Configuración → Pantalla de ingreso, con los de la marca ya reemplazados. */
  protected readonly txt = computed(() => {
    const guardados = this.catalogo.config()?.sitio?.ingreso ?? {};
    const r = (s: string) => s.replaceAll("{unidad}", this.brand.unidad()).replaceAll("{banco}", this.brand.marca().nombre).replaceAll("{programa}", this.brand.programa());
    const out = { ...TEXTOS_INGRESO };
    for (const k of Object.keys(out) as (keyof TextosIngreso)[]) {
      const v = guardados[k];
      out[k] = r(!v ? TEXTOS_INGRESO[k] : v);
    }
    if (this.catalogo.config()?.sitio?.ocultarNotaIngreso) out.notaLegal = "";
    return out;
  });

  /** Texto legal abierto en el modal (desde los enlaces de la nota bajo el botón). */
  protected readonly legal = signal<"terminos" | "privacidad" | null>(null);
  protected readonly textoLegal = computed(() => {
    const c = this.catalogo.config()?.contenido;
    return legalAMarkdown(this.legal() === "privacidad" ? c?.privacidad : c?.terminos);
  });
  protected abrirLegal(ancla: string) {
    if (ancla === "terminos" || ancla === "privacidad") this.legal.set(ancla);
  }

  protected readonly paso = signal<1 | 2>(1);
  protected readonly tipo = signal<string | null>(null);
  protected readonly tipoVal = computed(() => this.tipo() ?? this.tipos()[0]?.value ?? "");
  protected readonly tipoActual = computed(() => this.tipos().find((t) => t.value === this.tipoVal()));
  protected readonly documento = signal("");
  protected readonly codigo = signal(["", "", "", "", "", ""]);
  protected readonly error = signal("");
  protected readonly cargando = signal(false);
  private readonly correo = signal("");
  private readonly digitos = viewChildren<ElementRef<HTMLInputElement>>("digito");

  protected readonly correoOfuscado = computed(() => {
    const [nombre = "", dominio = ""] = (this.correo() || this.store.perfil()?.correo || "").split("@");
    return `${nombre.slice(0, 2)}${"*".repeat(Math.max(3, nombre.length - 2))}@${dominio}`;
  });

  constructor() {
    effect(() => {
      if (this.paso() === 2) queueMicrotask(() => this.digitos()[0]?.nativeElement.focus());
    });
  }

  protected onDocumento(e: Event) {
    const max = this.tipoActual()?.digitos ?? 12;
    this.documento.set((e.target as HTMLInputElement).value.slice(0, max));
  }

  protected continuar(e: Event) {
    e.preventDefault();
    this.api.post<{ correo: string }>("auth/otp", { tipo: this.tipoVal(), documento: this.documento() }).subscribe({
      next: (r) => {
        this.error.set("");
        this.correo.set(r.correo);
        this.codigo.set(["", "", "", "", "", ""]);
        this.paso.set(2);
      },
      error: (err) => this.error.set(err.error?.message ?? "No pudimos validar tu documento."),
    });
  }

  protected onDigito(i: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const d = input.value.replace(/\D/g, "").slice(-1);
    input.value = d;
    this.codigo.update((prev) => prev.map((x, idx) => (idx === i ? d : x)));
    if (d && i < 5) this.digitos()[i + 1]?.nativeElement.focus();
  }
  protected onKey(i: number, e: KeyboardEvent) {
    if (e.key === "Backspace" && !this.codigo()[i] && i > 0) this.digitos()[i - 1]?.nativeElement.focus();
  }

  protected validar(e: Event) {
    e.preventDefault();
    this.cargando.set(true);
    this.api.post<{ token: string }>("auth/verificar", { codigo: this.codigo() }).subscribe({
      next: (r) => {
        // El servidor emite el token; desde aquí las peticiones de cuenta lo llevan y las rutas privadas se abren.
        this.sesion.entrar(r.token);
        this.store.init();
        const destino = SesionService.destinoSeguro(this.ruta.snapshot.queryParamMap.get("volver"));
        setTimeout(() => this.router.navigateByUrl(destino), 900);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err.error?.message ?? "Código inválido.");
      },
    });
  }
}
