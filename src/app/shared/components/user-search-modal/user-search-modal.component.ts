import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { UsersService } from '../../../core/services/users.service';

export interface UserSearchResult {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-search-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './user-search-modal.component.html',
  styleUrls: ['./user-search-modal.component.scss']
})
export class UserSearchModalComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<UserSearchModalComponent>);
  private readonly usersService = inject(UsersService);
  readonly data = inject<{ selectedIds?: string[] }>(MAT_DIALOG_DATA);

  readonly query = signal('');
  readonly usuarios = signal<UserSearchResult[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedIds = signal<Set<string>>(new Set(this.data?.selectedIds ?? []));

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.usuarios().filter((u) => !q || u.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.usersService.getUsuarios().subscribe({
      next: (list) => {
        this.usuarios.set(list ?? []);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? err.message ?? 'Error al cargar usuarios');
        this.loading.set(false);
      }
    });
  }

  toggle(user: UserSearchResult): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(user.id)) next.delete(user.id);
      else next.add(user.id);
      return next;
    });
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  confirm(): void {
    const selected = this.usuarios().filter((u) => this.selectedIds().has(u.id));
    this.dialogRef.close(selected);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
