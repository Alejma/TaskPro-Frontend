import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AppNotification, NotificationType } from '../../../core/models/notification.model';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.scss']
})
export class NotificationsPanelComponent {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly notifications = this.notificationsService.notifications;

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  openNotification(notification: AppNotification): void {
    this.notificationsService.markAsRead(notification.id);
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    }
  }

  viewAll(): void {
    this.router.navigate(['/dashboard']);
  }

  showAvatar(notification: AppNotification): boolean {
    return !!notification.actorInitials && (notification.type === 'assignment' || notification.type === 'share');
  }

  getIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      comment: 'chat_bubble_outline',
      assignment: 'person',
      deadline: 'schedule',
      share: 'folder_shared',
      completed: 'check_circle'
    };
    return icons[type];
  }

  getRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return 'Reciente';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? 'hace 1 hora' : `hace ${hours} horas`;

    const days = Math.floor(hours / 24);
    return days === 1 ? 'hace 1 día' : `hace ${days} días`;
  }
}
