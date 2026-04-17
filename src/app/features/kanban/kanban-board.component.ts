import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { Task, TaskStatus } from '../../core/models/task.model';
import { TasksService } from '../tasks/tasks.service';

type Column = { title: string; status: TaskStatus };

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [DragDropModule, MatCardModule, MatChipsModule],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss']
})
export class KanbanBoardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksService = inject(TasksService);

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
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if (!projectId) return;
    this.tasksService.getKanbanByProject(projectId).subscribe((data) => this.tasksByStatus.set(data));
  }

  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const movedTask = event.container.data[event.currentIndex];
    const targetStatus = event.container.id as TaskStatus;
    this.tasksService.updateTaskStatus(movedTask.id, targetStatus).subscribe();
  }
}
