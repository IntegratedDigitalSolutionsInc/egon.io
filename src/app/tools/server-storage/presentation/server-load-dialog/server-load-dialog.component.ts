import { Component, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DiagramVersion,
  ServerStorageService,
} from '../../services/server-storage.service';
import { CurrentDiagramService } from '../../services/current-diagram.service';

@Component({
  selector: 'app-server-load-dialog',
  templateUrl: './server-load-dialog.component.html',
  styleUrls: ['./server-load-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class ServerLoadDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ServerLoadDialogComponent>);
  private readonly onLoad: (payload: { content: unknown; name: string }) => void =
    inject(MAT_DIALOG_DATA);
  private readonly serverStorageService = inject(ServerStorageService);
  private readonly currentDiagramService = inject(CurrentDiagramService);

  protected readonly diagramId = this.currentDiagramService.currentDiagramId;
  protected readonly diagramName = this.currentDiagramService.currentDiagramName ?? 'diagram';

  protected versions: DiagramVersion[] = [];
  protected loading = true;
  protected error = false;
  protected loadingVersion = false;

  ngOnInit(): void {
    if (this.diagramId) {
      this.loadVersions();
    } else {
      this.loading = false;
    }
  }

  protected loadVersions(): void {
    this.loading = true;
    this.error = false;
    this.serverStorageService.listVersions(this.diagramId!).subscribe({
      next: (versions) => {
        this.versions = versions;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  protected loadVersion(version: DiagramVersion): void {
    this.loadingVersion = true;
    this.serverStorageService
      .loadDiagramVersion(this.diagramId!, version.hash)
      .subscribe({
        next: (content) => {
          this.onLoad({ content, name: this.diagramName });
          this.dialogRef.close();
        },
        error: () => {
          this.loadingVersion = false;
        },
      });
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
