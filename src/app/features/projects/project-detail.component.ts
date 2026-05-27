import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { UsersService } from '../../core/services/users.service';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from './projects.service';
import { TaskFormModalComponent } from '../../shared/components/task-form-modal/task-form-modal.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly tasksService = inject(TasksService);
  private readonly projectsService = inject(ProjectsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly projectId = signal<string | null>(null);
  readonly project = signal<Project | null>(null);
  readonly projectTasks = signal<Task[]>([]);
  readonly users = signal<User[]>([]);
  readonly projectMemberIds = signal<string[]>([]);
  readonly memberEmailQuery = signal('');
  readonly savingMembers = signal(false);

  readonly canAssignPeople = computed(() => {
    const role = this.authService.role();
    return role === 'GERENTE' || role === 'ADMIN';
  });
  readonly selectedProjectMembers = computed(() =>
    this.users().filter((user) => this.projectMemberIds().includes(user.id))
  );
  readonly filteredUsersForMembers = computed(() => {
    const query = this.memberEmailQuery().trim().toLowerCase();
    const selectedIds = new Set(this.projectMemberIds());
    return this.users().filter(
      (user) => !selectedIds.has(user.id) && (!query || user.email.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.projectId.set(id);
    this.loadProject(id);
    this.loadProjectTasks(id);
    this.loadUsers();
  }

  setMemberEmailQuery(value: string): void {
    this.memberEmailQuery.set(value);
  }

  addMemberToProject(user: User): void {
    if (!this.canAssignPeople()) return;
    this.projectMemberIds.update((ids) => (ids.includes(user.id) ? ids : [...ids, user.id]));
    this.memberEmailQuery.set('');
  }

  removeMemberFromProject(userId: string): void {
    if (!this.canAssignPeople()) return;
    this.projectMemberIds.update((ids) => ids.filter((id) => id !== userId));
  }

  saveProjectMembers(): void {
    const id = this.projectId();
    if (!id || !this.canAssignPeople() || this.savingMembers()) return;

    this.savingMembers.set(true);
    this.projectsService
      .assignMembers(id, this.projectMemberIds())
      .pipe(finalize(() => this.savingMembers.set(false)))
      .subscribe({
        next: (response) => {
          const normalized = this.normalizeProject(response) ?? this.project();
          if (normalized) {
            this.project.set({
              ...normalized,
              memberIds: [...this.projectMemberIds()],
              membersCount: this.projectMemberIds().length
            });
          }
          this.snackBar.open('Miembros del proyecto actualizados.', 'Cerrar', { duration: 2500 });
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.open(error.error?.message ?? 'No se pudieron asignar miembros al proyecto.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  openCreateTaskModal(): void {
    const pid = this.projectId();
    if (!pid) return;
    const ref = this.dialog.open(TaskFormModalComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { projectId: pid }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProjectTasks(pid);
      }
    });
  }

  getUserNameById(userId: string): string {
    return this.users().find((user) => user.id === userId)?.name ?? userId;
  }

  private loadProject(id: string): void {
    this.projectsService.getProjectById(id).subscribe((response) => {
      const normalized = this.extractSingleProject(response);
      if (!normalized) {
        this.snackBar.open('No se pudo cargar el detalle del proyecto.', 'Cerrar', { duration: 3500 });
        return;
      }
      this.project.set(normalized);
      this.projectMemberIds.set([...(normalized.memberIds ?? [])]);
    });
  }

  private loadProjectTasks(projectId: string): void {
    this.tasksService.getTasksByProject(projectId).subscribe((response) => {
      const tasks = this.extractTasks(response);
      this.projectTasks.set(tasks);
    });
  }

  private loadUsers(): void {
    this.usersService.getUsers().subscribe((response) => {
      this.users.set(this.extractUsers(response));
      const currentProject = this.project();
      if (currentProject?.memberIds?.length) {
        this.projectMemberIds.set([...currentProject.memberIds]);
      }
    });
  }

  private extractUsers(response: unknown): User[] {
    if (Array.isArray(response)) {
      return (response as unknown[]).map((item) => this.normalizeUser(item)).filter((user): user is User => !!user);
    }
    const wrapped = response as { data?: unknown; users?: unknown };
    if (Array.isArray(wrapped?.data)) {
      return (wrapped.data as unknown[]).map((item) => this.normalizeUser(item)).filter((user): user is User => !!user);
    }
    if (Array.isArray(wrapped?.users)) {
      return (wrapped.users as unknown[]).map((item) => this.normalizeUser(item)).filter((user): user is User => !!user);
    }
    return [];
  }

  private extractTasks(response: unknown): Task[] {
    if (Array.isArray(response)) {
      return (response as unknown[]).map((item) => this.normalizeTask(item)).filter((task): task is Task => !!task);
    }
    const wrapped = response as { data?: unknown; tasks?: unknown };
    if (Array.isArray(wrapped?.data)) {
      return (wrapped.data as unknown[]).map((item) => this.normalizeTask(item)).filter((task): task is Task => !!task);
    }
    if (Array.isArray(wrapped?.tasks)) {
      return (wrapped.tasks as unknown[]).map((item) => this.normalizeTask(item)).filter((task): task is Task => !!task);
    }
    return [];
  }

  private normalizeUser(raw: unknown): User | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item['id'] ?? item['_id'] ?? '');
    if (!id || !item['name'] || !item['email']) return null;
    return {
      id,
      name: String(item['name']),
      email: String(item['email']),
      role: this.normalizeRole(item['role'] ?? item['roleName'] ?? item['roleId']),
      active: (item['active'] ?? item['isActive'] ?? false) as boolean
    };
  }

  private normalizeRole(rawRole: unknown): 'ADMIN' | 'GERENTE' | 'COLABORADOR' {
    if (typeof rawRole === 'string') {
      const upper = rawRole.toUpperCase();
      if (upper === 'ADMIN' || upper === 'GERENTE' || upper === 'COLABORADOR') return upper;
      if (upper === '1') return 'ADMIN';
      if (upper === '2') return 'GERENTE';
      if (upper === '3') return 'COLABORADOR';
    }
    if (typeof rawRole === 'number') {
      if (rawRole === 1) return 'ADMIN';
      if (rawRole === 2) return 'GERENTE';
      if (rawRole === 3) return 'COLABORADOR';
    }
    return 'COLABORADOR';
  }

  private normalizeProject(raw: unknown): Project | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item['id'] ?? item['_id'] ?? '');
    const name = String(item['name'] ?? item['projectName'] ?? '');
    if (!id || !name) return null;
    const memberIdsRaw = item['memberIds'] ?? item['members'];
    let memberIds: string[] = [];
    if (Array.isArray(memberIdsRaw)) {
      memberIds = memberIdsRaw.map((v: unknown) => String((v as Record<string, unknown>)['id'] ?? (v as Record<string, unknown>)['_id'] ?? v));
    }
    return {
      id,
      name,
      description: String(item['description'] ?? item['details'] ?? ''),
      status: (item['status'] as Project['status']) ?? 'ACTIVE',
      ownerId: String(item['ownerId'] ?? item['owner'] ?? ''),
      membersCount: typeof item['membersCount'] === 'number' ? (item['membersCount'] as number) : memberIds.length,
      memberIds
    };
  }

  private extractSingleProject(response: unknown): Project | null {
    const root = this.normalizeProject(response);
    if (root) return root;
    const wrapped = response as { data?: unknown; project?: unknown };
    return this.normalizeProject(wrapped?.data) ?? this.normalizeProject(wrapped?.project);
  }

  getPriorityLabel(priority: number | undefined): string {
    const labels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Urgente' };
    return labels[priority ?? 2] ?? 'Media';
  }

  private normalizeTask(raw: unknown): Task | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item['id'] ?? item['_id'] ?? '');
    if (!id || !item['title']) return null;
    return {
      id,
      title: String(item['title']),
      description: String(item['description'] ?? ''),
      status: (item['status'] as Task['status']) ?? 'PENDING',
      priority: typeof item['priority'] === 'number' ? item['priority'] as number : 2,
      projectId: String(item['projectId'] ?? this.projectId() ?? ''),
      assigneeIds: ((item['assigneeIds'] ?? []) as Array<string | number>).map((v) => String(v)),
      dueDate: item['dueDate'] as string | undefined
    };
  }
}
