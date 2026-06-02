import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReportExportService, ReportFormat } from '../../../core/services/report-export.service';
import { DashboardMetrics } from '../../../features/dashboard/dashboard.service';

export interface ReportsModalData {
  metrics: DashboardMetrics;
}

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  if (!start || !end) return null;
  return new Date(start) <= new Date(end) ? null : { invalidRange: true };
}

@Component({
  selector: 'app-reports-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './reports-modal.component.html',
  styleUrls: ['./reports-modal.component.scss']
})
export class ReportsModalComponent {
  private readonly dialogRef = inject(MatDialogRef<ReportsModalComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly reportExportService = inject(ReportExportService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<ReportsModalData>(MAT_DIALOG_DATA);

  readonly exporting = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      projectId: ['all', Validators.required],
      startDate: [this.toInputDate(this.startOfYear()), Validators.required],
      endDate: [this.toInputDate(this.endOfYear()), Validators.required],
      format: ['pdf' as ReportFormat, Validators.required]
    },
    { validators: dateRangeValidator }
  );

  selectFormat(format: ReportFormat): void {
    this.form.patchValue({ format });
  }

  export(): void {
    if (this.form.invalid) return;

    const { projectId, startDate, endDate, format } = this.form.getRawValue();
    const projectName =
      projectId === 'all'
        ? 'Reporte general'
        : this.data.metrics.projects.find((project) => String(project.id) === String(projectId))?.name ?? 'Proyecto';

    this.exporting.set(true);

    try {
      this.reportExportService.export({
        metrics: this.data.metrics,
        projectId: String(projectId),
        projectName,
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T23:59:59`),
        format
      });
      this.snackBar.open('Reporte exportado correctamente.', 'Cerrar', { duration: 2500 });
      this.dialogRef.close(true);
    } catch {
      this.snackBar.open('No se pudo generar el reporte.', 'Cerrar', { duration: 3500 });
    } finally {
      this.exporting.set(false);
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
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
}
