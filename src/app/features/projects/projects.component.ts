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

  private normalizeProject(raw: unknown): Project | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item['id'] ?? item['_id'] ?? '');
    const name = String(item['name'] ?? item['projectName'] ?? '');
    if (!id || !name) return null;
    const membersRaw = item['members'];
    return {
      id,
      name,
      description: String(item['description'] ?? item['details'] ?? ''),
      status: (item['status'] as Project['status']) ?? 'ACTIVE',
      ownerId: String(item['ownerId'] ?? item['owner'] ?? ''),
      membersCount: typeof item['membersCount'] === 'number' ? (item['membersCount'] as number) : Array.isArray(membersRaw) ? membersRaw.length : 0
    };
  }
}
