import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  loading = false;
  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.authService.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        const normalized = this.authService.normalizeLoginResponse(response);
        if (!normalized) {
          this.snackBar.open('Login correcto, pero la respuesta no tiene token/usuario válido.', 'Cerrar', {
            duration: 5000
          });
          this.loading = false;
          return;
        }
        this.authService.saveSession(normalized);
        this.authService.navigateByRole(normalized.user.role);
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message ?? 'Error al iniciar sesión. Verifica tus credenciales.';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        this.loading = false;
      },
    });
  }
}
