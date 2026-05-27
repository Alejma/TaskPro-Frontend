import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { Project } from '../../../core/models/project.model';
import { ProjectsService } from '../../../features/projects/projects.service';

export interface ProjectFormData {
  project?: Project;
}

@Component({
  selector: 'app-project-form-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './project-form-modal.component.html',
  styleUrls: ['./project-form-modal.component.scss']
})
export class ProjectFormModalComponent {
  private readonly dialogRef = inject(MatDialogRef<ProjectFormModalComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly projectsService = inject(ProjectsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<ProjectFormData>(MAT_DIALOG_DATA);

  readonly isEditing = !!this.data?.project;
  readonly saving = false;

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.project?.name ?? '', Validators.required],
    description: [this.data?.project?.description ?? '', Validators.required],
    status: [(this.data?.project?.status ?? 'ACTIVE') as 'ACTIVE' | 'PAUSED' | 'DONE', Validators.required]
  });

  submit(): void {
    if (this.form.invalid) return;
    const payload = this.form.getRawValue();

    const obs$ = this.isEditing
      ? this.projectsService.updateProject(this.data.project!.id, payload)
      : this.projectsService.createProject(payload);

    obs$.pipe(finalize(() => {})).subscribe({
      next: (response) => {
        this.snackBar.open(this.isEditing ? 'Proyecto actualizado.' : 'Proyecto creado.', 'Cerrar', { duration: 2500 });
        this.dialogRef.close(response);
      },
      error: (error: HttpErrorResponse) => {
        this.snackBar.open(error.error?.message ?? 'Error al guardar el proyecto.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
