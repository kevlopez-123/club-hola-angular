import { ChangeDetectionStrategy, Component, input, output, signal } from "@angular/core";
import { IconComponent } from "../shared/icon.component";
import { INPUT_CLS } from "./kit";

/** Campo de contraseña con botón para mostrarla u ocultarla. El nombre accesible del campo lo da su etiqueta (`for`). */
@Component({
  selector: "a-clave-input",
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "relative block" },
  template: `
    <input [id]="inputId()" [class]="input + ' pr-12'" [type]="ver() ? 'text' : 'password'" [attr.autocomplete]="autocompletar()" [value]="valor()"
      [attr.aria-describedby]="describe() || null" [attr.aria-invalid]="invalido()" (input)="valorChange.emit($any($event.target).value)" (blur)="tocado.emit()" />
    <button type="button" (click)="ver.set(!ver())" [attr.aria-pressed]="ver()" [attr.aria-label]="(ver() ? 'Ocultar ' : 'Mostrar ') + 'clave: ' + nombre()" [title]="ver() ? 'Ocultar' : 'Mostrar'"
      class="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
      <app-icon [name]="ver() ? 'EyeOff' : 'Eye'" class="h-5 w-5" />
    </button>
  `,
})
export class ClaveInputComponent {
  protected readonly input = INPUT_CLS;
  readonly inputId = input.required<string>();
  readonly valor = input("");
  /** Para el botón: de cuál contraseña se trata. */
  readonly nombre = input("");
  readonly autocompletar = input("current-password");
  readonly invalido = input(false);
  readonly describe = input("");
  readonly valorChange = output<string>();
  readonly tocado = output<void>();
  protected readonly ver = signal(false);
}
