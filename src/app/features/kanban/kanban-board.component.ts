import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Task, TaskStatus } from '../../core/models/task.model';
import { User } from '../../core/models/user.model';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../../core/services/users.service';

type Column = { title: string; status: TaskStatus };

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatCardModule, MatChipsModule, MatTooltipModule, MatIconModule, MatButtonModule, MatSnackBarModule, ConfirmDialogComponent],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss']
})
export class KanbanBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksService = inject(TasksService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private projectId = '';

  readonly users = signal<User[]>([]);

  readonly columns: Column[] = [
    { title: 'Pendiente', status: 'PENDING' },
    { title: 'En proceso', status: 'IN_PROGRESS' },
    { title: 'Finalizada', status: 'DONE' }
  ];

  readonly dropListIds = this.columns.map((col) => col.status);
  readonly tasksByStatus = signal<Record<TaskStatus, Task[]>>({
    PENDING: [],
    IN_PROGRESS: [],
    DONE: []
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');
    if (!id) return;
    this.projectId = id;
    
    // Load users
    this.usersService.getUsers().subscribe({
      next: (response) => {
        const users = this.extractUsers(response);
        this.users.set(users);
      },
      error: (err) => console.error('Error cargando usuarios:', err)
    });
    
    // First try to get kanban data, fall back to getTasksByProject if it fails
    this.tasksService.getKanbanByProject(id).subscribe({
      next: (data) => {
        const normalized = this.normalizeKanbanData(data);
        this.tasksByStatus.set(normalized);
      },
      error: (err) => {
        // If kanban endpoint fails, use getTasksByProject and organize by status
        this.tasksService.getTasksByProject(id).subscribe({
          next: (tasks) => {
            const normalized = this.groupAndNormalizeTasks(tasks);
            this.tasksByStatus.set(normalized);
          },
          error: (err2) => console.error('Error también en getTasksByProject:', err2)
        });
      }
    });
  }

  private normalizeKanbanData(data: Record<TaskStatus, unknown[]>): Record<TaskStatus, Task[]> {
    const result: Record<TaskStatus, Task[]> = {
      PENDING: [],
      IN_PROGRESS: [],
      DONE: []
    };
    
    // Handle if data itself is wrapped in a response object
    const unwrapped = (data as any)?.data ?? data;
    
    console.log('Normalizando datos kanban. Unwrapped:', unwrapped);
    
    Object.keys(result).forEach(status => {
      let tasks = unwrapped[status as TaskStatus];
      console.log(`Procesando status ${status}, tareas iniciales:`, tasks);
      
      // Handle if tasks is wrapped in another object
      if (tasks && typeof tasks === 'object' && !Array.isArray(tasks)) {
        console.log(`  Status ${status}: tasks es objeto, intentando desenvuelvo...`);
        tasks = (tasks as any)?.data ?? (tasks as any)?.tasks;
        console.log(`  Status ${status}: después de desenvuelvo:`, tasks);
      }
      
      if (Array.isArray(tasks)) {
        console.log(`  Status ${status}: tengo array de ${tasks.length} tareas`);
        result[status as TaskStatus] = (tasks as unknown[])
          .map((task, idx) => {
            const normalized = this.normalizeTask(task);
            console.log(`    Task ${idx}:`, { original: task, normalized });
            return normalized;
          })
          .filter((task): task is Task => !!task);
      } else {
        console.log(`  Status ${status}: NO es array, skipping`);
      }
    });
    
    console.log('Resultado final normalizado:', result);
    return result;
  }

  private groupAndNormalizeTasks(tasks: unknown[]): Record<TaskStatus, Task[]> {
    const result: Record<TaskStatus, Task[]> = {
      PENDING: [],
      IN_PROGRESS: [],
      DONE: []
    };
    
    console.log('Groupando y normalizando', tasks.length, 'tareas');
    
    (tasks as unknown[]).forEach((taskItem, idx) => {
      const normalized = this.normalizeTask(taskItem);
      console.log(`Task ${idx}:`, { original: taskItem, normalized });
      if (normalized) {
        result[normalized.status].push(normalized);
        console.log(`  ✓ Added to ${normalized.status}`);
      } else {
        console.log(`  ✗ Normalization failed`);
      }
    });
    
    console.log('Resultado groupado:', result);
    return result;
  }

  private normalizeTask(raw: unknown): Task | null {
    if (!raw || typeof raw !== 'object') {
      console.log('    ✗ Invalid raw:', raw);
      return null;
    }
    const item = raw as {
      id?: string | number;
      _id?: string | number;
      title?: string;
      description?: string;
      desc?: string;
      status?: 'PENDING' | 'IN_PROGRESS' | 'DONE' | string | number;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string | number;
      projectId?: string | number;
      assigneeIds?: Array<string | number>;
      dueDate?: string;
    };
    const id = item.id ?? item._id;
    if (!id || !item.title) {
      console.log('    ✗ Missing id or title:', { id, title: item.title });
      return null;
    }
    
    // Convert priority number to string
    const priority = this.normalizePriority(item.priority);

    // Convert status if it's a number
    const status = this.normalizeStatus(item.status);

    const description = item.description ?? item.desc ?? '';

    // Derive assignee IDs from multiple possible backend shapes:
    // - direct `assigneeIds` array
    // - relation arrays like `TaskAssignments`, `taskAssignments`, `assignments`
    // - nested objects containing `userId` or `user.id`
    const possibleAssignmentFields = (item as any).assigneeIds ?? (item as any).TaskAssignments ?? (item as any).taskAssignments ?? (item as any).assignments ?? (item as any).assignees ?? (item as any).taskAssignment ?? [];

    const assigneeIds: string[] = [];
    if (Array.isArray(possibleAssignmentFields)) {
      possibleAssignmentFields.forEach((entry) => {
        if (entry == null) return;
        if (typeof entry === 'string' || typeof entry === 'number') {
          assigneeIds.push(String(entry));
          return;
        }
        // entry is an object: try multiple common shapes
        const e = entry as any;
        const candidate = e.userId ?? e.user_id ?? e.user?.id ?? e.user?._id ?? e.UserId ?? e.userId;
        if (candidate != null) {
          assigneeIds.push(String(candidate));
          return;
        }
        // Some backends return an embedded user object directly in assignments
        if (e.id != null) {
          assigneeIds.push(String(e.id));
          return;
        }
      });
    }
    
    const normalized = {
      id: String(id),
      title: item.title,
      description: description,
      status: status,
      priority: priority,
      projectId: String(item.projectId ?? this.projectId ?? ''),
      assigneeIds: assigneeIds,
      dueDate: item.dueDate
    };
    console.log('    ✓ Task normalized:', {
      id: normalized.id,
      title: normalized.title,
      description: normalized.description.substring(0, 30),
      status: normalized.status,
      priority: normalized.priority,
      assigneeIds: normalized.assigneeIds  // <-- Mostrar explícitamente
    });
    return normalized;
  }

  private normalizePriority(priority: unknown): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (typeof priority === 'string') {
      const upper = priority.toUpperCase();
      if (upper === 'LOW' || upper === 'MEDIUM' || upper === 'HIGH' || upper === 'URGENT') {
        return upper as any;
      }
      // Try to map string numbers
      if (upper === '1') return 'LOW';
      if (upper === '2') return 'MEDIUM';
      if (upper === '3') return 'HIGH';
      if (upper === '4') return 'URGENT';
    }
    if (typeof priority === 'number') {
      if (priority === 1) return 'LOW';
      if (priority === 2) return 'MEDIUM';
      if (priority === 3) return 'HIGH';
      if (priority === 4) return 'URGENT';
    }
    return 'MEDIUM'; // default
  }

  private normalizeStatus(status: unknown): TaskStatus {
    if (typeof status === 'string') {
      const upper = status.toUpperCase();
      if (upper === 'PENDING' || upper === 'IN_PROGRESS' || upper === 'DONE') {
        return upper as TaskStatus;
      }
      if (upper === '1') return 'PENDING';
      if (upper === '2') return 'IN_PROGRESS';
      if (upper === '3') return 'DONE';
    }
    if (typeof status === 'number') {
      if (status === 1) return 'PENDING';
      if (status === 2) return 'IN_PROGRESS';
      if (status === 3) return 'DONE';
    }
    return 'PENDING'; // default
  }

  getUserNameById(userId: string): string {
    const user = this.users().find((user) => user.id === userId);
    return user?.name ?? 'Sin usuario';
  }

  get canDelete(): boolean {
    const role = this.authService.role();
    return role === 'ADMIN' || role === 'GERENTE';
  }

  onDeleteTask(taskId: string, status: TaskStatus): void {
    if (!taskId) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: '¿Eliminar esta tarea? Esta acción no se puede deshacer.' },
      width: '360px'
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.tasksService.deleteTask(taskId).subscribe({
        next: () => {
          const current = { ...this.tasksByStatus() } as Record<TaskStatus, Task[]>;
          current[status] = current[status].filter(t => t.id !== taskId);
          this.tasksByStatus.set(current);
          console.log('Tarea eliminada:', taskId);
          this.snackBar.open('Tarea eliminada', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom'
          });
        },
        error: (err) => {
          console.error('Error eliminando tarea:', err);
          this.snackBar.open('No se pudo eliminar la tarea', 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom'
          });
        }
      });
    });
  }

  getUserInitials(userId: string): string {
    const user = this.users().find((u) => u.id === userId);
    if (!user) {
      console.log('Usuario no encontrado para iniciales, ID:', userId);
      return '?';
    }
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }

  getAvatarColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  getPriorityClass(priority: string | undefined): string {
    if (!priority) return 'priority-medium';
    const normalized = String(priority).toLowerCase();
    if (normalized === 'low' || normalized === 'media' || normalized === 'high' || normalized === 'urgent') {
      return 'priority-' + normalized;
    }
    return 'priority-medium';
  }

  getAssignees(assigneeIds: string[]): User[] {
    return assigneeIds
      .map(id => this.users().find(u => u.id === id))
      .filter((user): user is User => !!user);
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

  private normalizeUser(raw: unknown): User | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as {
      id?: string | number;
      _id?: string | number;
      name?: string;
      email?: string;
      role?: string;
      roleName?: string;
      roleId?: string | number;
      active?: boolean;
      isActive?: boolean;
    };
    const id = item.id ?? item._id;
    if (!id || !item.name || !item.email) return null;
    const normalized = {
      id: String(id),
      name: item.name,
      email: item.email,
      role: (item.role ?? item.roleName ?? item.roleId) as any,
      active: item.active ?? item.isActive ?? false
    };
    console.log('Usuario normalizado:', normalized);
    return normalized;
  }

  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // Store the original state in case we need to revert
    const previousContainerData = [...event.previousContainer.data];
    const containerData = [...event.container.data];

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const movedTask = event.container.data[event.currentIndex];
    const targetStatus = event.container.id as TaskStatus;
    
    console.log('Moviendo tarea:', movedTask.id, 'a status:', targetStatus);
    console.log('Task details:', { 
      title: movedTask.title, 
      assigneeIds: movedTask.assigneeIds,
      currentUsers: this.users().map(u => ({ id: u.id, name: u.name }))
    });
    
    this.tasksService.updateTaskStatus(movedTask.id, targetStatus).subscribe({
      next: (response) => {
        console.log('Tarea actualizada correctamente:', response);
      },
      error: (error) => {
        console.error('Error al actualizar tarea:', error);
        // Revert the change if update fails
        transferArrayItem(
          event.container.data,
          event.previousContainer.data,
          event.currentIndex,
          event.previousIndex
        );
      }
    });
  }
}
