import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent {
  step: number = 1;
  requestForm: FormGroup;
  resetForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  email: string = '';
  resetCode: string = '';
  newPassword: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group({
      resetCode: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
    });

    const storedEmail = this.authService.getForgotPasswordEmail();
    if (storedEmail) {
      this.email = storedEmail;
      this.step = 2;
    }
  }

  nextStep() {
    if (this.step === 1 && this.requestForm.valid) {
      this.isLoading = true;
      this.email = this.requestForm.get('email')?.value;
      this.authService.requestPasswordReset(this.email).subscribe({
        next: () => {
          this.isLoading = false;
          this.step = 2;
          this.toastr.info(
            'Reset code sent! Check your email.',
            'Password Reset'
          );
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err.error?.message || 'Failed to send reset code. Try again.';
        },
      });
    } else if (this.step === 2 && this.resetForm.valid) {
      this.isLoading = true;
      this.resetCode = this.resetForm.get('resetCode')?.value;
      this.newPassword = this.resetForm.get('newPassword')?.value;
      this.email = this.authService.getForgotPasswordEmail() || '';

      if (!this.email) {
        this.isLoading = false;
        this.errorMessage =
          'Email is missing. Please start the forgot password process again.';
        this.step = 1;
        return;
      }

      this.authService
        .resetPassword(this.email, this.resetCode, this.newPassword)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.step = 3;
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage =
              err.error?.message || 'Failed to reset password. Try again.';
          },
        });
    } else if (this.step === 3) {
      this.step = 4;
    } else if (this.step === 4) {
      this.toastr.success('Password reset successful!', 'Success');
      this.authService.clearForgotPasswordEmail(); // Clear email after success
      this.router.navigate(['/login']);
    }
  }

  prevStep() {
    if (this.step > 1) {
      this.step--;
      this.errorMessage = '';
    }
  }

  validateField(form: FormGroup, field: string) {
    const control = form.get(field);
    if (control) {
      control.markAsTouched();
    }
  }
}
