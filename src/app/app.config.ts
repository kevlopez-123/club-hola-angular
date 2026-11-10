import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { mockApiInterceptor } from './core/mock-api/mock-api.interceptor';
import { authInterceptor, erroresInterceptor, versionesInterceptor } from './core/http.interceptors';
import { environment } from '../environments/environment';
import { ManejadorErrores } from './core/errores';
import { StoreService } from './core/store.service';
import { BrandService } from './core/brand.service';
import { BrandTitleStrategy } from './core/brand-title.strategy';
import { TitleStrategy } from '@angular/router';
import { iniciarTablasComoTarjetas } from './core/table-cards';
import { iniciarSelectoresPropios } from './core/custom-select';
import { iniciarCalendariosPropios } from './core/custom-date';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ManejadorErrores },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // Orden: token, errores/reintentos y (solo si `environment.usarMock`) la MockAPI. Backend real: ver src/environments/environment.ts.
    provideHttpClient(withXhr(), withInterceptors([authInterceptor, versionesInterceptor, erroresInterceptor, ...(environment.usarMock ? [mockApiInterceptor] : [])])),
    { provide: TitleStrategy, useClass: BrandTitleStrategy },
    // La marca se carga antes del primer render para no mostrar colores/logos por defecto.
    provideAppInitializer(() => inject(BrandService).cargar()),
    provideAppInitializer(() => inject(StoreService).init()),
    provideAppInitializer(() => iniciarTablasComoTarjetas()),
    provideAppInitializer(() => iniciarSelectoresPropios()),
    provideAppInitializer(() => iniciarCalendariosPropios()),
  ],
};
