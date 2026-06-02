import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ProjectsService } from '../../features/projects/projects.service';
import { NotificationsPanelComponent } from './notifications-panel/notifications-panel.component';
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
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    NotificationsPanelComponent
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly notificationsService = inject(NotificationsService);

  readonly isAdmin = computed(() => this.authService.role() === 'ADMIN');
  readonly canAccessTasksModule = computed(() => {
    const role = this.authService.role();
    return role === 'ADMIN' || role === 'GERENTE';
  });
  readonly userName = computed(() => this.authService.user()?.name ?? 'Usuario');
  readonly userInitials = computed(() => this.getInitials(this.userName()));
  readonly unreadNotifications = this.notificationsService.unreadCount;
  readonly projects = signal<Project[]>([]);
  readonly expandedProjectId = signal<string | null>(null);
  readonly sidenavOpened = signal(true);

  ngOnInit(): void {
    this.loadProjects();
    this.notificationsService.load();
  }

  toggleProject(id: string): void {
    this.expandedProjectId.update((current) => current === id ? null : id);
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase() || 'U';
  }

  private loadProjects(): void {
    this.projectsService.getProjectsForCurrentUser().subscribe({
      next: (list) => this.projects.set(list),
      error: () => this.projects.set([])
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
