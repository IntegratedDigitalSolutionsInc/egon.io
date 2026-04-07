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
  DiagramEntry,
  ServerStorageService,
} from '../../services/server-storage.service';

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
  private readonly dialogRef = inject(
    MatDialogRef<ServerLoadDialogComponent>,
  );
  private readonly onLoad: (entry: DiagramEntry) => void =
    inject(MAT_DIALOG_DATA);
  private readonly serverStorageService = inject(ServerStorageService);

  protected diagrams: DiagramEntry[] = [];
  protected loading = true;
  protected error = false;

  ngOnInit(): void {
    this.loadList();
  }

  protected loadList(): void {
    this.loading = true;
    this.error = false;
    this.serverStorageService.listDiagrams().subscribe({
      next: (entries) => {
        this.diagrams = entries;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  protected load(entry: DiagramEntry): void {
    this.onLoad(entry);
    this.dialogRef.close();
  }

  protected delete(id: string): void {
    this.serverStorageService.deleteDiagram(id).subscribe({
      next: () => {
        this.diagrams = this.diagrams.filter((d) => d.id !== id);
      },
    });
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
