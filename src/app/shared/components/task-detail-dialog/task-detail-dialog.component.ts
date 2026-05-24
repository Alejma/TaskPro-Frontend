import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Task, TaskStatus } from '../../../core/models/task.model';
import { User } from '../../../core/models/user.model';

export interface TaskDetailDialogData {
  task: Task;
  users: User[];
}

@Component({
  selector: 'app-task-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule],
  templateUrl: './task-detail-dialog.component.html',
  styleUrls: ['./task-detail-dialog.component.scss']
})
export class TaskDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<TaskDetailDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as TaskDetailDialogData;

  get task(): Task {
    return this.data.task;
  }

  get assignees(): User[] {
    return this.data.task.assigneeIds
      .map((id) => this.data.users.find((user) => user.id === id))
      .filter((user): user is User => !!user);
  }

  close(): void {
    this.dialogRef.close();
  }

  statusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      PENDING: 'Pendiente',
      IN_PROGRESS: 'En proceso',
      DONE: 'Finalizada'
    };
    return labels[status] ?? status;
  }

  priorityLabel(priority: Task['priority']): string {
    const labels: Record<Task['priority'], string> = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
      URGENT: 'Urgente'
    };
    return labels[priority] ?? priority;
  }

  priorityClass(priority: Task['priority']): string {
    return `priority-${priority.toLowerCase()}`;
  }
}
