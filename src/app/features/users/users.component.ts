import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { Role } from '../../core/models/auth.model';
import { User } from '../../core/models/user.model';
import { UsersService } from '../../core/services/users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSlideToggleModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = signal<User[]>([]);
  readonly editingUserId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly columns = ['name', 'email', 'role', 'active', 'actions'];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['COLABORADOR' as Role, Validators.required]
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  create(): void {
    const editingId = this.editingUserId();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Completa correctamente nombre, email, contraseña y rol.', 'Cerrar', {
        duration: 3000
      });
      return;
    }
    if (this.saving()) return;

    this.saving.set(true);
    if (editingId) {
      const { name, email, role, password } = this.form.getRawValue();
      this.usersService
        .updateUser(editingId, {
          name,
          email,
          roleName: role,
          ...(password ? { password } : {})
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.cancelEdit();
            this.loadUsers();
            this.snackBar.open('Usuario actualizado correctamente.', 'Cerrar', { duration: 2500 });
          },
          error: (error: HttpErrorResponse) => {
            this.snackBar.open(error.error?.message ?? 'No se pudo actualizar el usuario.', 'Cerrar', {
              duration: 4000
            });
          }
        });
      return;
    }

    this.usersService
      .createUser({
        name: this.form.controls.name.value,
        email: this.form.controls.email.value,
        password: this.form.controls.password.value,
        roleName: this.form.controls.role.value,
        active: true
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (created) => {
          const createdUser = this.extractSingleUser(created);
          if (createdUser) {
            this.users.update((current) => [createdUser, ...current.filter((u) => u.id !== createdUser.id)]);
          }
          this.form.reset({ name: '', email: '', password: '', role: 'COLABORADOR' });
          this.loadUsers();
          this.snackBar.open('Usuario creado correctamente.', 'Cerrar', { duration: 2500 });
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.open(error.error?.message ?? 'No se pudo crear el usuario.', 'Cerrar', {
            duration: 4000
          });
        }
      });
  }

  toggle(user: User): void {
    this.usersService.toggleUserStatus(user.id, !user.active).subscribe(() => this.loadUsers());
  }

  edit(user: User): void {
    this.editingUserId.set(user.id);
    this.form.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: this.normalizeRole(user.role)
    });
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
    this.form.reset({ name: '', email: '', password: '', role: 'COLABORADOR' });
  }

  private loadUsers(): void {
    this.usersService.getUsers().subscribe((response) => {
      this.users.set(this.extractUsers(response));
    });
  }

  private extractUsers(response: unknown): User[] {
    if (Array.isArray(response)) {
      return (response as unknown[]).map((item) => this.normalizeUser(item)).filter((user): user is User => !!user);
    }

    const wrapped = response as { data?: unknown; users?: unknown };
    if (Array.isArray(wrapped?.data)) {
      return (wrapped.data as unknown[])
        .map((item) => this.normalizeUser(item))
        .filter((user): user is User => !!user);
    }
    if (Array.isArray(wrapped?.users)) {
      return (wrapped.users as unknown[])
        .map((item) => this.normalizeUser(item))
        .filter((user): user is User => !!user);
    }

    return [];
  }

  private extractSingleUser(response: unknown): User | null {
    const normalizedRoot = this.normalizeUser(response);
    if (normalizedRoot) {
      return normalizedRoot;
    }

    const wrapped = response as { data?: unknown; user?: unknown };
    const dataUser = this.normalizeUser(wrapped?.data);
    if (dataUser) {
      return dataUser;
    }

    const nestedUser = this.normalizeUser(wrapped?.user);
    if (nestedUser) {
      return nestedUser;
    }

    return null;
  }

  private normalizeUser(raw: unknown): User | null {
    if (!raw || typeof raw !== 'object') return null;

    const item = raw as {
      id?: string | number;
      _id?: string | number;
      name?: string;
      email?: string;
      role?: unknown;
      roleName?: unknown;
      roleId?: unknown;
      active?: boolean;
      isActive?: boolean;
    };

    const id = item.id ?? item._id;
    if (!id || !item.name || !item.email) return null;

    return {
      id: String(id),
      name: item.name,
      email: item.email,
      role: this.normalizeRole(item.role ?? item.roleName ?? item.roleId),
      active: item.active ?? item.isActive ?? false
    };
  }

  private normalizeRole(rawRole: unknown): Role {
    if (typeof rawRole === 'string') {
      const upper = rawRole.toUpperCase();
      if (upper === 'ADMIN' || upper === 'GERENTE' || upper === 'COLABORADOR') {
        return upper;
      }
      if (upper === '1') return 'ADMIN';
      if (upper === '2') return 'GERENTE';
      if (upper === '3') return 'COLABORADOR';
    }

    if (typeof rawRole === 'number') {
      if (rawRole === 1) return 'ADMIN';
      if (rawRole === 2) return 'GERENTE';
      if (rawRole === 3) return 'COLABORADOR';
    }

    if (rawRole && typeof rawRole === 'object') {
      const roleObject = rawRole as {
        id?: number | string;
        roleId?: number | string;
        name?: string;
        roleName?: string;
      };
      return this.normalizeRole(roleObject.roleName ?? roleObject.name ?? roleObject.roleId ?? roleObject.id);
    }

    return 'COLABORADOR';
  }
}
