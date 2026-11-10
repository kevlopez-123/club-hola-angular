import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { BrandService } from "../core/brand.service";
import type { Direccion } from "../core/models";
import { ciudadCoincidente, ciudadesDe, hayCiudadesFijas } from "../core/ubicaciones";
import { erroresDireccion } from "../core/validar-direccion";
import { MapPickerComponent, type ZonaMapa } from "./map-picker";
import { TelefonoInputComponent } from "./telefono-input";

export type DatosDireccion = Omit<Direccion, "id">;

/**
 * Campos de una dirección de envío, iguales en Mi perfil y en el checkout: alias, quién recibe, teléfono con bandera,
 * dirección, provincia → ciudad (listas fijas en cascada) y mapa. Valida al salir de cada campo y, con `intento`, todos a la vez.
 * El mapa sugiere dirección, provincia y ciudad sin pisar lo que la persona ya eligió.
 */
@Component({
  selector: "app-direccion-form",
  imports: [TelefonoInputComponent, MapPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="'grid gap-4 ' + (compacto() ? 'text-sm' : 'text-base')">
      <div>
        <label class="font-semibold text-ink" [attr.for]="id('alias')">Alias (Casa, Oficina)</label>
        <input [id]="id('alias')" maxlength="30" autocomplete="off" [value]="valor().alias" (input)="cambiar({ alias: $any($event.target).value })" (blur)="tocar('alias')"
          [attr.aria-invalid]="!!ver('alias')" [class]="campo('alias')" />
        @if (ver('alias'); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
      </div>
      <div>
        <label class="font-semibold text-ink" [attr.for]="id('recibe')">¿Quién recibe?</label>
        <input [id]="id('recibe')" maxlength="60" autocomplete="name" [value]="valor().recibe" (input)="cambiar({ recibe: $any($event.target).value })" (blur)="tocar('recibe')"
          [attr.aria-invalid]="!!ver('recibe')" [class]="campo('recibe')" />
        @if (ver('recibe'); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
      </div>
      <div>
        <label class="font-semibold text-ink" [attr.for]="id('telefono')">Teléfono de contacto</label>
        <div class="mt-1"><app-telefono-input [variante]="compacto() ? 'compacto' : 'sitio'" [inputId]="id('telefono')" [valor]="valor().telefono" [invalido]="!!ver('telefono')" (valorChange)="cambiar({ telefono: $event })" (tocado)="tocar('telefono')" /></div>
        @if (ver('telefono'); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
      </div>
      <div>
        <label class="font-semibold text-ink" [attr.for]="id('direccion')">Dirección</label>
        <input [id]="id('direccion')" maxlength="150" autocomplete="street-address" [value]="valor().direccion" (input)="cambiar({ direccion: $any($event.target).value })" (blur)="tocar('direccion')"
          [attr.aria-invalid]="!!ver('direccion')" [class]="campo('direccion')" />
        @if (ver('direccion'); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
      </div>
      <div>
        <label class="font-semibold text-ink" [attr.for]="id('provincia')">Provincia</label>
        <select [id]="id('provincia')" [attr.aria-invalid]="!!ver('provincia')" (change)="elegirProvincia($any($event.target).value)" (blur)="tocar('provincia')" [class]="campo('provincia') + ' select-field'">
          <option value="">Selecciona una provincia</option>
          @for (p of provincias(); track p) { <option [value]="p" [selected]="p === valor().provincia">{{ p }}</option> }
        </select>
        @if (ver('provincia'); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
      </div>
      <div>
        <label class="font-semibold text-ink" [attr.for]="id('distrito')">Ciudad</label>
        @if (ciudadFija()) {
          <select [id]="id('distrito')" [disabled]="!valor().provincia" [attr.aria-invalid]="!!ver('distrito')" (change)="cambiar({ distrito: $any($event.target).value })" (blur)="tocar('distrito')" [class]="campo('distrito') + ' select-field'">
            <option value="" [selected]="!valor().distrito">{{ valor().provincia ? "Selecciona tu ciudad" : "Elige primero la provincia" }}</option>
            @for (c of ciudades(); track c) { <option [value]="c" [selected]="c === valor().distrito">{{ c }}</option> }
          </select>
        } @else {
          <input [id]="id('distrito')" maxlength="80" [value]="valor().distrito" (input)="cambiar({ distrito: $any($event.target).value })" (blur)="tocar('distrito')" [attr.aria-invalid]="!!ver('distrito')" [class]="campo('distrito')" />
        }
        @if (ver('distrito'); as m) { <p role="alert" class="mt-1 text-sm font-semibold text-destructive">{{ m }}</p> }
      </div>
      <div>
        <p class="mb-2 font-semibold text-ink">Ubica tu dirección en el mapa (opcional)</p>
        <app-map-picker [lat]="valor().lat" [lng]="valor().lng" [zona]="zona()" (ubicacionCambia)="cambiar($event)" (sugerencia)="sugerir($event)" />
      </div>
    </div>
  `,
})
export class DireccionFormComponent {
  private static n = 0;
  private readonly uid = `dir${++DireccionFormComponent.n}`;
  private readonly brand = inject(BrandService);
  readonly valor = input.required<DatosDireccion>();
  /** Muestra todos los errores (al intentar guardar). */
  readonly intento = input(false);
  /** Texto más chico (checkout). */
  readonly compacto = input(false);
  readonly valorChange = output<DatosDireccion>();

  private readonly tocados = signal<ReadonlySet<string>>(new Set());
  protected readonly errores = computed(() => erroresDireccion(this.valor(), this.brand.pais(), this.brand.provinciasEnvio()));
  protected readonly ciudadFija = computed(() => hayCiudadesFijas(this.brand.pais().codigo));
  protected readonly ciudades = computed(() => ciudadesDe(this.brand.pais().codigo, this.valor().provincia ?? ""));
  /** Provincias con envío; si la guardada ya no lo tiene, se muestra para poder cambiarla. */
  protected readonly provincias = computed(() => {
    const l = this.brand.provinciasEnvio();
    const actual = this.valor().provincia;
    return actual && !l.includes(actual) ? [actual, ...l] : l;
  });
  /** El mapa se centra en la ciudad elegida o, si solo hay provincia, en la provincia. */
  protected readonly zona = computed<ZonaMapa | null>(() => {
    const v = this.valor();
    const quitar = (s: string) => s.replace(/\s*\(.*\)/, "").trim();
    const pais = this.brand.pais().nombre;
    if (v.provincia && v.distrito) return { texto: `${quitar(v.distrito)}, ${v.provincia}, ${pais}`, zoom: 13 };
    if (v.provincia) return { texto: `${v.provincia}, ${pais}`, zoom: 9 };
    return null;
  });
  private ultimaSugerencia = { direccion: "", ciudad: "" };
  /** Último valor emitido: el mapa avisa ubicación y sugerencia seguidas, antes de que el padre actualice el valor. */
  private pendiente: DatosDireccion | null = null;
  private actual() {
    return this.pendiente ?? this.valor();
  }
  private emitir(n: DatosDireccion) {
    this.pendiente = n;
    this.valorChange.emit(n);
  }

  constructor() {
    effect(() => {
      this.valor();
      this.pendiente = null;
    });
    // Direcciones guardadas con la ciudad escrita a mano ("Quito, Pichincha"): se llevan a la ciudad de la lista que corresponde.
    effect(() => {
      const v = this.valor();
      if (!this.ciudadFija() || !v.provincia || !v.distrito || this.ciudades().includes(v.distrito)) return;
      const c = ciudadCoincidente(this.brand.pais().codigo, v.provincia, v.distrito);
      if (c) this.emitir({ ...v, distrito: c });
    });
  }

  protected id(k: string) {
    return `${this.uid}-${k}`;
  }
  protected campo(k: string) {
    const base = this.compacto()
      ? "mt-1 w-full rounded-xl border bg-card px-4 py-2.5 text-sm text-ink focus:ring-2 focus:ring-primary/50 "
      : "mt-1 h-12 w-full rounded-2xl border bg-surface px-4 text-base text-ink focus:ring-2 focus:ring-primary/50 ";
    return base + (this.ver(k) ? "border-destructive ring-2 ring-destructive/70" : "border-border");
  }
  protected tocar(k: string) {
    if (!this.tocados().has(k)) this.tocados.update((s) => new Set(s).add(k));
  }
  protected ver(k: string): string {
    return this.intento() || this.tocados().has(k) ? (this.errores()[k] ?? "") : "";
  }
  protected cambiar(c: Partial<DatosDireccion>) {
    this.emitir({ ...this.actual(), ...c });
  }
  /** Al cambiar de provincia, la ciudad anterior ya no vale. */
  protected elegirProvincia(p: string) {
    const v = this.actual();
    this.cambiar({ provincia: p, distrito: p === v.provincia || !this.ciudadFija() ? v.distrito : "" });
  }
  /** Completa dirección, provincia y ciudad con lo que devuelve el mapa, sin pisar lo que la persona ya eligió. */
  protected sugerir(s: { direccion: string; distrito: string }) {
    const v = this.actual();
    const prev = this.ultimaSugerencia;
    const p = this.brand.provinciaEn(s.distrito);
    const provincia = v.provincia || (this.brand.provinciasEnvio().includes(p) ? p : "");
    let distrito = v.distrito;
    if (this.ciudadFija()) {
      const c = ciudadCoincidente(this.brand.pais().codigo, provincia, s.distrito);
      if (c && (!v.distrito || v.distrito === prev.ciudad || provincia !== v.provincia)) distrito = c;
    } else if (!v.distrito || v.distrito === prev.ciudad) distrito = s.distrito;
    this.emitir({
      ...v,
      direccion: !v.direccion || v.direccion === prev.direccion ? s.direccion : v.direccion,
      provincia,
      distrito,
    });
    this.ultimaSugerencia = { direccion: s.direccion, ciudad: distrito };
  }
}
