import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  DiagramEntry,
  ServerStorageService,
} from '../tools/server-storage/services/server-storage.service';
import { CurrentDiagramService } from '../tools/server-storage/services/current-diagram.service';
import { DeleteDiagramDialogComponent } from './delete-diagram-dialog.component';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatToolbarModule,
  ],
})
export class IndexComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly serverStorageService = inject(ServerStorageService);
  private readonly currentDiagramService = inject(CurrentDiagramService);
  private readonly dialog = inject(MatDialog);

  diagrams: DiagramEntry[] = [];
  loading = true;
  error = false;

  get activeDiagrams(): DiagramEntry[] {
    return this.diagrams.filter((d) => !d.archived);
  }

  get archivedDiagrams(): DiagramEntry[] {
    return this.diagrams.filter((d) => d.archived);
  }

  ngOnInit(): void {
    this.loadDiagrams();
  }

  loadDiagrams(): void {
    this.loading = true;
    this.error = false;
    this.serverStorageService.listDiagrams().subscribe({
      next: (diagrams) => {
        this.diagrams = diagrams.sort(
          (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
        );
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  openDiagram(entry: DiagramEntry): void {
    this.currentDiagramService.setCurrentDiagram(entry.id);
    this.router.navigate(['/editor'], { state: { loadEntry: entry } });
  }

  viewPresentation(entry: DiagramEntry): void {
    window.open(this.serverStorageService.getPresentationUrl(entry.id), '_blank');
  }

  newDiagram(): void {
    this.currentDiagramService.clearCurrentDiagram();
    this.router.navigate(['/editor'], { state: { newDiagram: true } });
  }

  deleteDiagram(entry: DiagramEntry, event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(DeleteDiagramDialogComponent, {
      data: { name: entry.name },
      width: '400px',
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.serverStorageService.deleteDiagram(entry.id).subscribe({
          next: () => this.loadDiagrams(),
        });
      }
    });
  }

  archiveDiagram(entry: DiagramEntry, event: MouseEvent): void {
    event.stopPropagation();
    this.serverStorageService.archiveDiagram(entry.id).subscribe({
      next: () => this.loadDiagrams(),
    });
  }

  unarchiveDiagram(entry: DiagramEntry, event: MouseEvent): void {
    event.stopPropagation();
    this.serverStorageService.unarchiveDiagram(entry.id).subscribe({
      next: () => this.loadDiagrams(),
    });
  }
}
