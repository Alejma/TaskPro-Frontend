import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { AuditLogEntry } from '../../../core/models/audit-log.model';

export interface AuditHistoryModalData {
  logs: AuditLogEntry[];
  users: { id: string; name: string }[];
}

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  if (!start || !end) return null;
  return new Date(start) <= new Date(end) ? null : { invalidRange: true };
}

@Component({
  selector: 'app-audit-history-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './audit-history-modal.component.html',
  styleUrls: ['./audit-history-modal.component.scss']
})
export class AuditHistoryModalComponent {
  private readonly dialogRef = inject(MatDialogRef<AuditHistoryModalComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<AuditHistoryModalData>(MAT_DIALOG_DATA);

  readonly displayedColumns = ['createdAt', 'user', 'action', 'details'];
  readonly users = this.data.users;

  readonly form = this.fb.nonNullable.group(
    {
      userId: ['all'],
      startDate: [this.toInputDate(this.startOfYear())],
      endDate: [this.toInputDate(this.endOfYear())]
    },
    { validators: dateRangeValidator }
  );

  private readonly filterVersion = signal(0);

  readonly filteredLogs = computed(() => {
    this.filterVersion();
    const { userId, startDate, endDate } = this.form.getRawValue();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return this.data.logs.filter((log) => {
      const logDate = new Date(log.createdAt);
      if (userId !== 'all' && String(log.userId) !== String(userId)) return false;
      if (start && logDate < start) return false;
      if (end && logDate > end) return false;
      return true;
    });
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.filterVersion.update((v) => v + 1));
  }

  close(): void {
    this.dialogRef.close();
  }

  clearFilters(): void {
    this.form.reset({
      userId: 'all',
      startDate: this.toInputDate(this.startOfYear()),
      endDate: this.toInputDate(this.endOfYear())
    });
  }

  exportLogs(): void {
    const rows = this.filteredLogs();
    if (!rows.length) return;

    const sheet = XLSX.utils.json_to_sheet(
      rows.map((log) => ({
        'Fecha y Hora': this.formatDateTime(log.createdAt),
        Usuario: log.userName,
        Acción: log.actionLabel,
        Detalles: log.details
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Auditoria');
    XLSX.writeFile(workbook, `taskpro-audit-logs-${this.formatFileDate(new Date())}.xlsx`);
    this.snackBar.open('Logs exportados correctamente.', 'Cerrar', { duration: 2500 });
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase() || 'U';
  }

  private startOfYear(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  }

  private endOfYear(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), 11, 31);
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatFileDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
