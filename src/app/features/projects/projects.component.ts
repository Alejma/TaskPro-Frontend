import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { Project } from '../../core/models/project.model';
import { ProjectsService } from './projects.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly projects = signal<Project[]>([]);
  readonly editingProjectId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    status: ['ACTIVE' as 'ACTIVE' | 'PAUSED' | 'DONE', Validators.required]
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa nombre, descripción y estado del proyecto.', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.saving()) return;

    const editingId = this.editingProjectId();
    this.saving.set(true);
    if (editingId) {
      this.projectsService
        .updateProject(editingId, this.form.getRawValue())
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (updated) => {
            const project = this.extractSingleProject(updated);
            if (project) {
              this.projects.update((current) => current.map((p) => (p.id === project.id ? project : p)));
            }
            this.cancelEdit();
            this.loadProjects();
            this.snackBar.open('Proyecto actualizado correctamente.', 'Cerrar', { duration: 2500 });
          },
          error: (error: HttpErrorResponse) => {
            this.snackBar.open(error.error?.message ?? 'No se pudo actualizar el proyecto.', 'Cerrar', {
              duration: 4000
            });
          }
        });
      return;
    }

    this.projectsService
      .createProject(this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (created) => {
          const project = this.extractSingleProject(created);
          if (project) {
            this.projects.update((current) => [project, ...current.filter((p) => p.id !== project.id)]);
          }
          this.form.reset({ name: '', description: '', status: 'ACTIVE' });
          this.loadProjects();
          this.snackBar.open('Proyecto creado correctamente.', 'Cerrar', { duration: 2500 });
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.open(error.error?.message ?? 'No se pudo crear el proyecto.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  edit(project: Project): void {
    this.editingProjectId.set(project.id);
    this.form.patchValue({
      name: project.name,
      description: project.description,
      status: project.status
    });
  }

  cancelEdit(): void {
    this.editingProjectId.set(null);
    this.form.reset({ name: '', description: '', status: 'ACTIVE' });
  }

  private loadProjects(): void {
    this.projectsService.getProjects().subscribe((response) => {
      this.projects.set(this.extractProjects(response));
    });
  }

  private extractProjects(response: unknown): Project[] {
    if (Array.isArray(response)) {
      return (response as unknown[])
        .map((item) => this.normalizeProject(item))
        .filter((project): project is Project => !!project);
    }

    const wrapped = response as { data?: unknown; projects?: unknown };
    if (Array.isArray(wrapped?.data)) {
      return (wrapped.data as unknown[])
        .map((item) => this.normalizeProject(item))
        .filter((project): project is Project => !!project);
    }
    if (Array.isArray(wrapped?.projects)) {
      return (wrapped.projects as unknown[])
        .map((item) => this.normalizeProject(item))
        .filter((project): project is Project => !!project);
    }

    return [];
  }

  private extractSingleProject(response: unknown): Project | null {
    const root = this.normalizeProject(response);
    if (root) return root;

    const wrapped = response as { data?: unknown; project?: unknown };
    const fromData = this.normalizeProject(wrapped?.data);
    if (fromData) return fromData;
    const fromProject = this.normalizeProject(wrapped?.project);
    if (fromProject) return fromProject;

    return null;
  }

  private normalizeProject(raw: unknown): Project | null {
    if (!raw || typeof raw !== 'object') return null;

    const item = raw as {
      id?: string | number;
      _id?: string | number;
      name?: string;
      projectName?: string;
      description?: string;
      details?: string;
      status?: 'ACTIVE' | 'PAUSED' | 'DONE';
      ownerId?: string | number;
      owner?: string | number;
      membersCount?: number;
      members?: unknown[];
    };

    const id = item.id ?? item._id;
    const name = item.name ?? item.projectName;
    const description = item.description ?? item.details ?? '';
    if (!id || !name) return null;

    return {
      id: String(id),
      name,
      description,
      status: item.status ?? 'ACTIVE',
      ownerId: String(item.ownerId ?? item.owner ?? ''),
      membersCount: typeof item.membersCount === 'number' ? item.membersCount : Array.isArray(item.members) ? item.members.length : 0
    };
  }
}
