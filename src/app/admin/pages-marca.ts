import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from "@angular/core";
import { ApiService } from "../core/api.service";
import { BrandService } from "../core/brand.service";
import { FlagComponent } from "../shared/flag.component";
import { IconComponent } from "../shared/icon.component";
import { LISTA_PAISES, normalizarTenant, paisPorCodigo } from "../tenants/presets";
import type { DocumentoIdentidad, Provincia, TenantConfig } from "../tenants/tenant.types";
import { BtnDirective, FieldComponent, INPUT_CLS, PanelComponent, ToastService, ToggleComponent, avisoTamano, medirImagen } from "./kit";

const MAX_IMAGEN = 1_500_000; // bytes

type ClaveImagen = "logoClaro" | "logoOscuro" | "favicon" | "login" | "contacto" | "ctaCatalogo" | "ctaContacto";

/**
 * Editor de marca y localización: todo lo necesario para reutilizar la plataforma en otro cliente o país.
 * Los cambios se previsualizan en vivo y se publican con "Guardar marca".
 */
@Component({
  selector: "a-marca-editor",
  imports: [PanelComponent, FieldComponent, BtnDirective, IconComponent, FlagComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (t(); as t) {
      <a-panel title="Marca y localización" class="lg:col-span-2">
        <div actions class="flex flex-wrap gap-2">
          <button aBtn variant="outline" (click)="exportar()"><app-icon name="Download" class="h-4 w-4" /> Exportar JSON</button>
          <label class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted">
            <app-icon name="Upload" class="h-4 w-4" /> Importar JSON
            <input type="file" accept="application/json,.json" class="sr-only" aria-label="Importar configuración de marca" (change)="importar($any($event.target).files?.[0])" />
          </label>
        </div>

        <p class="mb-4 text-sm text-muted-foreground">Define la identidad del cliente. Los cambios se ven al instante en este panel y se publican en el sitio al guardar.</p>

        <!-- Identidad -->
        <h3 class="mb-2 font-semibold">Identidad</h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a-field label="Nombre de la empresa"><input [class]="input" [value]="t.marca.nombre" (input)="set('marca', 'nombre', $event)" /></a-field>
          <a-field label="Nombre del programa"><input [class]="input" [value]="t.marca.programa" (input)="set('marca', 'programa', $event)" /></a-field>
          <a-field label="Unidad del programa (puntos, millas…)"><input [class]="input" [value]="t.marca.unidadPuntos" (input)="set('marca', 'unidadPuntos', $event)" /></a-field>
          <a-field label="Texto legal del pie"><input [class]="input" [value]="t.marca.derechos" (input)="set('marca', 'derechos', $event)" /></a-field>
        </div>

        <!-- Colores -->
        <h3 class="mb-2 mt-6 font-semibold">Colores y tipografía</h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (c of colores; track c.k) {
            <a-field [label]="c.l">
              <div class="flex gap-2">
                <input type="color" [attr.aria-label]="c.l" [value]="t.tema[c.k]" (input)="set('tema', c.k, $event)" class="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border" />
                <input [class]="input + ' font-mono uppercase'" [attr.aria-label]="c.l + ' (hex)'" [value]="t.tema[c.k]" maxlength="7" (input)="setHex(c.k, $event)" />
              </div>
            </a-field>
          }
          <div><a-field label="Fuente (Google Fonts)"><input [class]="input" [value]="t.tema.fuente" (input)="setFuente($event)" /></a-field>
            @if (brand.fuenteEstado() === 'error') { <p role="alert" class="mt-1 text-xs font-medium text-destructive">No se encontró esa fuente en Google Fonts. Escribe el nombre exacto, por ejemplo Poppins, Inter u Open Sans.</p> }
            @else if (brand.fuenteEstado() === 'cargando') { <p role="status" class="mt-1 text-xs text-muted-foreground">Cargando fuente…</p> }
            @else { <p class="mt-1 text-xs text-muted-foreground">Nombre exacto como aparece en fonts.google.com.</p> }
          </div>
          <a-field label="Redondeo de esquinas ({{ t.tema.radio }} rem)">
            <input type="range" min="0" max="1.5" step="0.25" [value]="t.tema.radio" (input)="setRadio($event)" class="mt-3 w-full accent-[var(--color-primary)]" aria-label="Redondeo de esquinas" />
          </a-field>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4" aria-label="Vista previa de la marca">
          <span class="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Botón principal</span>
          <span class="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-primary">Secundario</span>
          <span class="rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground">Tarjeta · {{ t.marca.programa }}</span>
        </div>

        <!-- Logos e imágenes -->
        <h3 class="mb-2 mt-6 font-semibold">Logos e imágenes</h3>
        <p class="mb-3 text-sm text-muted-foreground">Sube una imagen (máx. 1,5 MB) o pega una URL. Sin logo se muestra el nombre de la empresa.</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of imagenes; track i.k) {
            <div class="rounded-2xl border border-border p-3">
              <p class="text-sm font-medium">{{ i.l }}</p>
              <p class="mb-2 text-xs text-muted-foreground">Mínimo recomendado: {{ i.min[0] }} × {{ i.min[1] }} px</p>
              <div [class]="'mb-2 grid h-24 place-items-center overflow-hidden rounded-xl border border-border ' + (i.fondo ? 'bg-primary' : 'bg-muted')">
                @if (valorImagen(i.k)) { <img [src]="valorImagen(i.k)" [alt]="i.l" class="max-h-full max-w-full object-contain" /> } @else { <span class="text-xs text-muted-foreground">Sin imagen</span> }
              </div>
              <input [class]="input + ' mb-2'" [attr.aria-label]="i.l + ' (URL)'" placeholder="https://…" [value]="urlImagen(i.k)" (input)="setImagen(i.k, $any($event.target).value)" />
              <label class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted">
                <app-icon name="Upload" class="h-4 w-4" /> Subir
                <input type="file" accept="image/*" class="sr-only" [attr.aria-label]="'Subir ' + i.l" (change)="subir(i.k, $any($event.target).files?.[0], i.min)" />
              </label>
              @if (avisosImg()[i.k]) { <p role="status" class="mt-2 text-xs font-medium text-destructive">{{ avisosImg()[i.k] }}</p> }
            </div>
          }
        </div>

        <!-- País -->
        <h3 class="mb-2 mt-6 font-semibold">País y moneda</h3>
        <p class="mb-3 text-sm text-muted-foreground">Al elegir un país se cargan sus datos oficiales (código, moneda, prefijo y dígitos del celular, provincias). Esos datos no se editan; sí puedes agregar tipos de documento y decidir a qué provincias hay envío.</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a-field label="País">
            <div class="flex items-center gap-2">
              <app-flag [codigo]="t.pais.codigo" [nombre]="t.pais.nombre" [ancho]="32" />
              <select [class]="input" aria-label="País" (change)="cambiarPais($any($event.target).value)">
                @for (p of paises; track p.codigo) { <option [value]="p.codigo" [selected]="p.codigo === t.pais.codigo">{{ p.nombre }}</option> }
              </select>
            </div>
          </a-field>
        </div>
        <dl class="mt-4 grid gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5" aria-label="Datos del país (solo lectura)">
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código ISO</dt><dd class="mt-0.5 font-medium">{{ t.pais.codigo }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moneda</dt><dd class="mt-0.5 font-medium">{{ t.pais.moneda.codigo }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Símbolo</dt><dd class="mt-0.5 font-medium">{{ t.pais.moneda.simbolo }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prefijo telefónico</dt><dd class="mt-0.5 font-medium">{{ t.pais.telefonoPrefijo }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dígitos del celular</dt><dd class="mt-0.5 font-medium">{{ t.pais.telefonoDigitos }}</dd></div>
        </dl>
        <p class="mt-2 text-xs text-muted-foreground">Ejemplo con la configuración actual: {{ ejemploMonto() }} · {{ ejemploTelefono() }}</p>

        <h4 class="mb-2 mt-5 text-sm font-semibold">Documentos de identidad aceptados en el ingreso</h4>
        <ul class="space-y-3">
          @for (d of t.pais.documentos; track $index; let i = $index) {
            <li class="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div class="mb-3 flex items-center justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documento {{ i + 1 }}</span>
                <button aBtn variant="ghost" [attr.aria-label]="'Quitar documento ' + (d.label || i + 1)" [disabled]="t.pais.documentos.length <= 1" (click)="quitarDoc(i)" class="text-destructive"><app-icon name="Trash2" class="h-4 w-4" /> Quitar</button>
              </div>
              <div class="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <a-field label="Nombre del documento"><input [class]="input" [value]="d.label" (input)="setDoc(i, 'label', $event)" /></a-field>
                <a-field label="Dígitos"><input [class]="input" type="number" min="4" max="20" [value]="d.digitos" (input)="setDoc(i, 'digitos', $event)" /></a-field>
                <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" [checked]="d.numerico" (change)="setDocNum(i, $any($event.target).checked)" /> Solo números</label>
              </div>
            </li>
          }
        </ul>
        <button aBtn variant="outline" class="mt-3" (click)="agregarDoc()"><app-icon name="Plus" class="h-4 w-4" /> Agregar documento</button>

        <!-- Provincias -->
        <h3 class="mb-1 mt-6 font-semibold">Provincias con envío</h3>
        <p class="mb-3 text-sm text-muted-foreground">La lista es la oficial del país y no se edita; marca solo a cuáles provincias hacen envío. Las activas se ofrecen en las direcciones de entrega y en el formulario de datos. {{ conEnvio() }} de {{ t.pais.provincias.length }} con envío.</p>
        <div class="mb-3 flex flex-wrap gap-2">
          <button aBtn variant="outline" (click)="todasProvincias(true)">Activar todas</button>
          <button aBtn variant="peligro" (click)="todasProvincias(false)">Desactivar todas</button>
        </div>
        <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          @for (p of t.pais.provincias; track $index; let i = $index) {
            <li class="flex items-center gap-2 rounded-xl border border-border p-2">
              <span class="min-w-0 flex-1 truncate px-1 text-sm font-medium">{{ p.nombre }}</span>
              <a-toggle [label]="'Envío a ' + p.nombre" [on]="p.envio" (onChange)="setEnvio(i, $event)" />
            </li>
          }
        </ul>

        <div class="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
          <button aBtn (click)="guardar()">Guardar marca</button>
          <button aBtn variant="outline" (click)="descartar()">Descartar cambios</button>
          @if (sucio()) { <p role="status" class="self-center text-sm font-semibold text-foreground">● Tienes cambios sin guardar</p> }
        </div>
      </a-panel>
    }
  `,
})
export class MarcaEditorComponent {
  private readonly api = inject(ApiService);
  private readonly brand = inject(BrandService);
  private readonly toast = inject(ToastService);
  protected readonly input = INPUT_CLS;
  protected readonly paises = LISTA_PAISES;
  protected readonly colores = [
    { k: "primario", l: "Color principal" }, { k: "textoPrimario", l: "Letra de botones primarios" }, { k: "texto", l: "Color del texto" }, { k: "fondo", l: "Fondo de página" }, { k: "superficie", l: "Fondo de secciones" },
  ] as const;
  /** `min` = tamaño mínimo recomendado en px (ancho, alto). */
  protected readonly imagenes: { k: ClaveImagen; l: string; fondo?: boolean; min: [number, number] }[] = [
    { k: "logoClaro", l: "Logo para fondo claro", min: [400, 100] }, { k: "logoOscuro", l: "Logo para fondo de color", fondo: true, min: [400, 100] }, { k: "favicon", l: "Favicon", min: [64, 64] },
    { k: "login", l: "Imagen del ingreso", min: [1200, 800] }, { k: "contacto", l: "Imagen de Contáctanos", min: [1000, 700] }, { k: "ctaCatalogo", l: "Imagen CTA Catálogo", min: [1200, 600] }, { k: "ctaContacto", l: "Imagen CTA Contacto", min: [1200, 600] },
  ];
  /** Aviso de tamaño por imagen subida. */
  protected readonly avisosImg = signal<Partial<Record<ClaveImagen, string>>>({});

  /** Copia editable del tenant; se previsualiza en vivo. */
  protected readonly t = signal<TenantConfig | null>(null);
  private original: TenantConfig | null = null;
  /** Foto de lo último guardado, para avisar si hay cambios sin publicar. */
  private readonly guardada = signal("");
  protected readonly sucio = computed(() => !!this.t() && !!this.guardada() && JSON.stringify(this.t()) !== this.guardada());
  @HostListener("window:beforeunload", ["$event"])
  protected antesDeSalir(e: BeforeUnloadEvent) {
    if (this.sucio()) e.preventDefault(); // el navegador pregunta antes de cerrar la pestaña
  }

  protected readonly conEnvio = computed(() => this.t()?.pais.provincias.filter((p) => p.envio).length ?? 0);
  protected readonly ejemploMonto = computed(() => {
    const p = this.t()?.pais;
    return p ? `${p.moneda.simbolo}${(1234.5).toLocaleString(p.locale || "es", { minimumFractionDigits: 2 })} ${p.moneda.codigo}` : "";
  });
  protected readonly ejemploTelefono = computed(() => {
    const p = this.t()?.pais;
    return p ? `${p.telefonoPrefijo} ${"9".repeat(p.telefonoDigitos)}` : "";
  });

  constructor() {
    this.api.get<TenantConfig>("tenant").subscribe((x) => {
      this.original = structuredClone(x);
      this.guardada.set(JSON.stringify(x));
      this.t.set(structuredClone(x));
    });
  }

  private actualizar(fn: (t: TenantConfig) => void) {
    const t = structuredClone(this.t()!);
    fn(t);
    this.t.set(t);
    this.brand.previsualizar(t);
  }
  protected set(grupo: "marca" | "tema" | "pais", campo: string, e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.actualizar((t) => ((t[grupo] as unknown as Record<string, unknown>)[campo] = campo === "codigo" ? v.toUpperCase() : v));
  }
  protected setHex(campo: "primario" | "textoPrimario" | "texto" | "fondo" | "superficie", e: Event) {
    let v = (e.target as HTMLInputElement).value.trim();
    if (!v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) this.actualizar((t) => (t.tema[campo] = v.toLowerCase()));
  }
  protected setRadio(e: Event) {
    this.actualizar((t) => (t.tema.radio = +(e.target as HTMLInputElement).value));
  }
  protected setFuente(e: Event) {
    const f = (e.target as HTMLInputElement).value;
    this.actualizar((t) => {
      t.tema.fuente = f;
      t.tema.fuenteUrl = f.trim() ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.trim()).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap` : "";
    });
  }
  protected setDoc(i: number, campo: "label" | "digitos", e: Event) {
    const v = (e.target as HTMLInputElement).value;
    this.actualizar((t) => {
      const d = t.pais.documentos[i] as DocumentoIdentidad;
      if (campo === "label") d.label = v;
      else d.digitos = Math.max(4, +v || 10);
    });
  }
  protected setDocNum(i: number, v: boolean) {
    this.actualizar((t) => (t.pais.documentos[i]!.numerico = v));
  }
  protected quitarDoc(i: number) {
    this.actualizar((t) => t.pais.documentos.splice(i, 1));
  }
  protected agregarDoc() {
    this.actualizar((t) => t.pais.documentos.push({ value: `doc${Date.now()}`, label: "Nuevo documento", digitos: 10, numerico: true }));
  }

  /* ---- imágenes ---- */
  protected valorImagen(k: ClaveImagen) {
    const t = this.t()!;
    return k === "logoClaro" || k === "logoOscuro" || k === "favicon" ? t.marca[k] : t.imagenes[k];
  }
  protected urlImagen(k: ClaveImagen) {
    const v = this.valorImagen(k);
    return v.startsWith("data:") ? "(imagen subida)" : v;
  }
  protected setImagen(k: ClaveImagen, v: string) {
    this.actualizar((t) => (k === "logoClaro" || k === "logoOscuro" || k === "favicon" ? (t.marca[k] = v) : (t.imagenes[k] = v)));
  }
  protected subir(k: ClaveImagen, f?: File, min?: [number, number]) {
    if (!f) return;
    if (f.size > MAX_IMAGEN) return this.toast.error("La imagen supera 1,5 MB. Usa una más liviana o pega una URL.");
    const r = new FileReader();
    r.onload = async () => {
      const src = String(r.result);
      this.setImagen(k, src);
      const aviso = min ? avisoTamano(await medirImagen(src), min[0], min[1]) : "";
      this.avisosImg.update((a) => ({ ...a, [k]: aviso }));
    };
    r.readAsDataURL(f);
  }

  /* ---- plantillas, guardar, exportar/importar ---- */
  /** Cambia de país: aplica su código, bandera, moneda, símbolo, prefijo, dígitos del celular, documentos y provincias. */
  protected cambiarPais(codigo: string) {
    this.actualizar((t) => (t.pais = paisPorCodigo(codigo)));
  }
  protected setEnvio(i: number, envio: boolean) {
    this.actualizar((t) => ((t.pais.provincias[i] as Provincia).envio = envio));
  }
  protected todasProvincias(envio: boolean) {
    this.actualizar((t) => t.pais.provincias.forEach((p) => (p.envio = envio)));
  }
  protected guardar() {
    const t = this.t()!;
    this.api.put("admin/config", { tenant: t }).subscribe(() => {
      this.original = structuredClone(t);
      this.guardada.set(JSON.stringify(t));
      this.toast.show("Marca publicada en el sitio y el panel");
    });
  }
  protected descartar() {
    if (!this.original) return;
    this.t.set(structuredClone(this.original));
    this.brand.previsualizar(structuredClone(this.original));
  }
  protected exportar() {
    const t = this.t()!;
    const url = URL.createObjectURL(new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenant-${t.id || "marca"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  protected importar(f?: File) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const x = JSON.parse(String(r.result)) as TenantConfig;
        if (!x?.marca?.nombre || !x?.tema?.primario || !x?.pais?.moneda) throw new Error("estructura");
        const t = normalizarTenant(x);
        this.t.set(t);
        this.brand.previsualizar(t);
        this.toast.show("Configuración importada. Revisa y guarda para publicarla.");
      } catch {
        this.toast.error("El archivo no es una configuración de marca válida.");
      }
    };
    r.readAsText(f);
  }
}
