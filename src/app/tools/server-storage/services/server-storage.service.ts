import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MatDialogConfig } from '@angular/material/dialog';
import { DialogService } from 'src/app/domain/services/dialog.service';
import { ServerLoadDialogComponent } from '../presentation/server-load-dialog/server-load-dialog.component';
import { environment } from 'src/environments/environment';

export interface DiagramEntry {
  id: string;
  name: string;
  savedAt: string;
  hasPresentation?: boolean;
  archived?: boolean;
}

export interface DiagramVersion {
  hash: string;
  date: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServerStorageService {
  private readonly http = inject(HttpClient);
  private readonly dialogService = inject(DialogService);

  private readonly apiUrl = environment.serverStorageApiUrl;

  listDiagrams(): Observable<DiagramEntry[]> {
    return this.http.get<DiagramEntry[]>(`${this.apiUrl}/diagrams`);
  }

  saveDiagram(
    name: string,
    content: unknown,
    options?: { diagramId?: string; html?: string },
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.apiUrl}/diagrams`, {
      name,
      content,
      diagramId: options?.diagramId,
      html: options?.html,
    });
  }

  loadDiagramContent(id: string): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/diagrams/${id}`);
  }

  listVersions(id: string): Observable<DiagramVersion[]> {
    return this.http.get<DiagramVersion[]>(
      `${this.apiUrl}/diagrams/${id}/versions`,
    );
  }

  loadDiagramVersion(id: string, hash: string): Observable<unknown> {
    return this.http.get<unknown>(
      `${this.apiUrl}/diagrams/${id}/versions/${hash}`,
    );
  }

  getPresentationUrl(id: string): string {
    return `${this.apiUrl}/diagrams/${id}/presentation`;
  }

  deleteDiagram(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/diagrams/${id}`);
  }

  archiveDiagram(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/diagrams/${id}/archive`, {});
  }

  unarchiveDiagram(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/diagrams/${id}/unarchive`, {});
  }

  openLoadDialog(onLoad: (payload: { content: unknown; name: string }) => void): void {
    const config = new MatDialogConfig();
    config.disableClose = false;
    config.autoFocus = true;
    config.width = '500px';
    config.data = onLoad;
    this.dialogService.openDialog(ServerLoadDialogComponent, config);
  }
}
