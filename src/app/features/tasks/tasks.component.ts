import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Task } from '../../core/models/task.model';
import { TasksService } from './tasks.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksService = inject(TasksService);
  private readonly fb = inject(FormBuilder);

  readonly tasks = signal<Task[]>([]);
  readonly editingTaskId = signal<string | null>(null);
  projectId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    status: ['PENDING' as 'PENDING' | 'IN_PROGRESS' | 'DONE', Validators.required],
    priority: ['MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', Validators.required],
    assigneeIdsText: ['']
  });

  ngOnInit(): void {
    this.projectId = this.route.snapshot.queryParamMap.get('projectId');
    if (this.projectId) {
      this.loadTasks();
    }
  }

  create(): void {
    if (!this.projectId || this.form.invalid) return;
    const payload = {
      title: this.form.controls.title.value,
      description: this.form.controls.description.value,
      status: this.form.controls.status.value,
      priority: this.form.controls.priority.value,
      assigneeIds: this.form.controls.assigneeIdsText.value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    };

    const editingId = this.editingTaskId();
    if (editingId) {
      this.tasksService.updateTask(editingId, payload).subscribe(() => {
        this.cancelEdit();
        this.loadTasks();
      });
      return;
    }

    this.tasksService.createTask(this.projectId, payload).subscribe(() => {
      this.form.reset({
        title: '',
        description: '',
        status: 'PENDING',
        priority: 'MEDIUM',
        assigneeIdsText: ''
      });
      this.loadTasks();
    });
  }

  edit(task: Task): void {
    this.editingTaskId.set(task.id);
    this.form.patchValue({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeIdsText: task.assigneeIds.join(', ')
    });
  }

  cancelEdit(): void {
    this.editingTaskId.set(null);
    this.form.reset({
      title: '',
      description: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      assigneeIdsText: ''
    });
  }

  private loadTasks(): void {
    if (!this.projectId) return;
    this.tasksService.getTasksByProject(this.projectId).subscribe((tasks) => this.tasks.set(tasks));
  }
}
