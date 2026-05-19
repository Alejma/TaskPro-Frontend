import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="icon-wrap">
        <div class="confirm-icon">
          <mat-icon>delete</mat-icon>
        </div>
      </div>
      <h2 class="title">Eliminar tarea</h2>
      <p class="message">{{ data?.message ?? '¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.' }}</p>
      <div class="actions">
        <button mat-stroked-button class="cancel" (click)="onClose(false)">Cancelar</button>
        <button mat-flat-button color="warn" class="confirm" (click)="onClose(true)">Eliminar</button>
      </div>
    </div>
  `,
  styles: [
    `:host { display: block; }
    .confirm-dialog { padding: 20px 24px; display:flex; flex-direction:column; align-items:center; gap:12px; min-width:320px; max-width:420px; }
    .icon-wrap { width:100%; display:flex; justify-content:center; }
    .confirm-icon { background: rgba(244, 67, 54, 0.08); color:#c62828; border-radius:50%; width:56px; height:56px; display:flex; align-items:center; justify-content:center; box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
    .confirm-icon mat-icon { font-size:28px; }
    .title { margin:0; font-size:18px; font-weight:600; color:#222; }
    .message { margin:0; color:#555; font-size:14px; text-align:center; line-height:1.4; }
    .actions { display:flex; gap:12px; width:100%; justify-content:flex-end; margin-top:6px; }
    .actions .cancel { border-color: #e0e0e0; }
    @media (max-width:420px) { .confirm-dialog { padding:16px; min-width:260px; } .actions { justify-content:center; } }
    `
  ]
})
export class ConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as { message?: string } | null;

  onClose(result: boolean) {
    this.dialogRef.close(result);
  }
}
