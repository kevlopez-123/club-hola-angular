import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import type { Observable } from "rxjs";
import { environment } from "../../environments/environment";

/** Cliente HTTP delgado. Todas las rutas son relativas a `environment.apiBase`. */
@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = environment.apiBase;

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(`${this.base}/${path}`, { params: params ? new HttpParams({ fromObject: params as any }) : undefined });
  }
  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(`${this.base}/${path}`, body);
  }
  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(`${this.base}/${path}`, body);
  }
  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(`${this.base}/${path}`, body);
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}/${path}`);
  }
}
