import { Injectable, inject } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterStateSnapshot, TitleStrategy } from "@angular/router";
import { BrandService } from "./brand.service";
import { SeoService } from "./seo.service";

/** Los títulos de ruta se escriben con el nombre del programa por defecto; aquí se sustituye por el del tenant. */
@Injectable({ providedIn: "root" })
export class BrandTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly brand = inject(BrandService);
  private readonly seo = inject(SeoService);

  override updateTitle(snapshot: RouterStateSnapshot) {
    const t = this.buildTitle(snapshot) ?? this.brand.programa();
    const titulo = t.replaceAll("Banco Solidario Puntos", this.brand.programa()).replaceAll("Banco Solidario", this.brand.marca().nombre);
    this.title.setTitle(titulo);
    this.seo.aplicar(snapshot.url, titulo);
  }
}