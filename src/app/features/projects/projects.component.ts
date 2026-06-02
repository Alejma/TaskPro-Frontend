import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Project } from '../../core/models/project.model';
import { ProjectsService } from './projects.service';
import { ProjectFormModalComponent } from '../../shared/components/project-form-modal/project-form-modal.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly projects = signal<Project[]>([]);

  ngOnInit(): void {
    this.loadProjects();
  }

  openCreateModal(): void {
    const ref = this.dialog.open(ProjectFormModalComponent, {
      width: '500px',
      data: {}
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProjects();
      }
    });
  }

  openEditModal(project: Project): void {
    const ref = this.dialog.open(ProjectFormModalComponent, {
      width: '500px',
      data: { project }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProjects();
      }
    });
  }

  private loadProjects(): void {
    this.projectsService.getProjectsForCurrentUser().subscribe({
      next: (list) => this.projects.set(list),
      error: () => this.projects.set([])
    });
  }
}
