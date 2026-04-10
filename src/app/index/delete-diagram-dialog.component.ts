import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-delete-diagram-dialog',
  standalone: true,
  imports: [MatButton, MatDialogActions, MatDialogContent],
  template: `
    <mat-dialog-content>
      <h2>Delete diagram</h2>
      <p>Are you sure you want to delete <strong>{{ data.name }}</strong>? This cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button (click)="close()">Cancel</button>
      <button mat-flat-button color="warn" (click)="confirm()">Delete</button>
    </mat-dialog-actions>
  `,
})
export class DeleteDiagramDialogComponent {
  readonly data = inject<{ name: string }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DeleteDiagramDialogComponent>);

  confirm(): void {
    this.dialogRef.close(true);
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
