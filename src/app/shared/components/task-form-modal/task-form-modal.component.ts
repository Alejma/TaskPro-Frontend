import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { Task } from '../../../core/models/task.model';
import { TasksService } from '../../../features/tasks/tasks.service';
import { UsersService } from '../../../core/services/users.service';
import { ProjectsService } from '../../../features/projects/projects.service';

export interface TaskFormData {
  projectId: string;
  task?: Task;
}

const PRIORITY_MAP: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };
const PRIORITY_LABELS: Record<string, string> = { '1': 'Baja', '2': 'Media', '3': 'Alta', '4': 'Urgente' };

@Component({
  selector: 'app-task-form-modal',
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
  templateUrl: './task-form-modal.component.html',
  styleUrls: ['./task-form-modal.component.scss']
})
export class TaskFormModalComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<TaskFormModalComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly usersService = inject(UsersService);
  private readonly projectsService = inject(ProjectsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<TaskFormData>(MAT_DIALOG_DATA);

  readonly isEditing = !!this.data?.task;
  readonly projectRequired = !!this.data?.projectId;
  readonly projects = signal<{ id: string; name: string }[]>([]);
  saving = false;

  readonly usuarios = signal<{ id: string; name: string }[]>([]);
  readonly assignee = signal<{ id: string; name: string } | null>(null);
  readonly userQuery = signal('');
  readonly showDropdown = signal(false);

  readonly filteredUsuarios = computed(() => {
    const q = this.userQuery().trim().toLowerCase();
    return this.usuarios().filter((u) => !q || u.name.toLowerCase().includes(q));
  });

  readonly form = this.fb.nonNullable.group({
    title: [this.data?.task?.title ?? '', Validators.required],
    description: [this.data?.task?.description ?? '', Validators.required],
    status: [(this.data?.task?.status ?? 'PENDING') as 'PENDING' | 'IN_PROGRESS' | 'DONE', Validators.required],
    priority: [String(this.data?.task?.priority ?? '2'), Validators.required],
    dueDate: [this.data?.task?.dueDate ?? ''],
    projectId: [this.data?.projectId ?? '', this.projectRequired ? Validators.required : []]
  });

  readonly priorityLabel = computed(() => PRIORITY_LABELS[this.form.controls.priority.value] ?? 'Media');

  ngOnInit(): void {
    this.usersService.getUsuarios().subscribe({
      next: (list) => this.usuarios.set(list ?? []),
      error: () => this.snackBar.open('No se pudieron cargar los usuarios.', 'Cerrar', { duration: 3000 })
    });
    if (!this.projectRequired) {
      this.projectsService.getProjects().subscribe({
        next: (list) => this.projects.set((list ?? []).map((p) => ({ id: String(p.id), name: p.name }))),
        error: () => this.snackBar.open('No se pudieron cargar los proyectos.', 'Cerrar', { duration: 3000 })
      });
    }
    if (this.data?.task?.assigneeIds?.length) {
      const id = this.data.task.assigneeIds[0];
      this.usersService.getUsuarios().subscribe((list) => {
        const found = (list ?? []).find((u) => u.id === id);
        this.assignee.set(found ?? { id, name: id });
      });
    }
  }

  setUserQuery(value: string): void {
    this.userQuery.set(value);
    this.showDropdown.set(true);
  }

  selectUser(user: { id: string; name: string }): void {
    this.assignee.set(user);
    this.userQuery.set('');
    this.showDropdown.set(false);
  }

  removeAssignee(): void {
    this.assignee.set(null);
  }

  hideDropdown(): void {
    setTimeout(() => this.showDropdown.set(false), 200);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const formValue = this.form.getRawValue();
    const payload = {
      title: formValue.title,
      description: formValue.description,
      status: formValue.status,
      priority: PRIORITY_MAP[formValue.priority] ?? 2,
      dueDate: formValue.dueDate,
      assigneeIds: this.assignee() ? [this.assignee()!.id] : []
    };

    const projectId = this.projectRequired ? this.data.projectId : formValue.projectId;
    if (!projectId) { this.snackBar.open('Selecciona un proyecto.', 'Cerrar', { duration: 3000 }); return; }

    const obs$ = this.isEditing
      ? this.tasksService.updateTask(this.data.task!.id, payload)
      : this.tasksService.createTaskForAllProjects({ ...payload, projectId });

    obs$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: (task) => {
        this.snackBar.open(this.isEditing ? 'Tarea actualizada.' : 'Tarea creada.', 'Cerrar', { duration: 2500 });
        this.dialogRef.close(task);
      },
      error: (error: HttpErrorResponse) => {
        this.snackBar.open(error.error?.message ?? 'Error al guardar la tarea.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
