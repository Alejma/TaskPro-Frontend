import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { AuthService } from '../../core/services/auth.service';
import { ProjectsService } from '../../features/projects/projects.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    NgIf,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);

  readonly isAdmin = computed(() => this.authService.role() === 'ADMIN');
  readonly userName = computed(() => this.authService.user()?.name ?? 'Usuario');
  readonly projects = signal<Project[]>([]);
  readonly expandedProjectId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProjects();
  }

  toggleProject(id: string): void {
    this.expandedProjectId.update((current) => current === id ? null : id);
  }

  private loadProjects(): void {
    this.projectsService.getProjects().subscribe((response) => {
      const list = this.extractProjects(response);
      this.projects.set(list);
    });
  }

  private extractProjects(response: unknown): Project[] {
    if (Array.isArray(response)) {
      return (response as unknown[])
        .map((item) => this.normalizeProject(item))
        .filter((p): p is Project => !!p);
    }
    const wrapped = response as { data?: unknown; projects?: unknown };
    if (Array.isArray(wrapped?.data)) {
      return (wrapped.data as unknown[])
        .map((item) => this.normalizeProject(item))
        .filter((p): p is Project => !!p);
    }
    if (Array.isArray(wrapped?.projects)) {
      return (wrapped.projects as unknown[])
        .map((item) => this.normalizeProject(item))
        .filter((p): p is Project => !!p);
    }
    return [];
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
