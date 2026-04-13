import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-import-confirm-dialog',
  standalone: true,
  imports: [MatButton, MatDialogActions, MatDialogContent],
  template: `
    <mat-dialog-content>
      <h2>Replace diagram</h2>
      <p>Importing will replace the current diagram. Do you want to continue?</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button (click)="close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="confirm()">Continue</button>
    </mat-dialog-actions>
  `,
})
export class ImportConfirmDialogComponent {
  readonly fn = inject<() => void>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ImportConfirmDialogComponent>);

  confirm(): void {
    this.fn();
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
