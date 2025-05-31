import { Component, OnInit } from '@angular/core';
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
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  login() {
    this.errorMessage = '';
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please provide valid credentials.';
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (res) => {
        console.log('Login response:', res);
        this.isLoading = false;
        this.toastr.success('Login successful!', 'Welcome to Cura');

        // Get role and userId from AuthService after login
        const role = this.authService.getRole();
        const userId = this.authService.getUserId();

        console.log('LoginComponent - Role after login:', role);
        console.log('LoginComponent - UserId after login:', userId);

        // Navigate based on role and userId
        if (role && userId) {
          if (role === 'admin') {
            this.router.navigate(['/home/admin']);
          } else if (role === 'doctor') {
            this.router.navigate([`/home/doctor/${userId}`]);
          } else if (role === 'patient') {
            this.router.navigate([`/home/patient/${userId}`]);
          } else {
            console.warn('LoginComponent - Unknown role:', role);
            this.router.navigate(['/home']);
          }
        } else {
          console.error('LoginComponent - Role or UserId not set after login');
          this.errorMessage = 'Failed to determine user role or ID.';
          this.toastr.error(this.errorMessage, 'Navigation Failed');
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || 'Authentication failed. Please try again.';
        this.isLoading = false;
        this.toastr.error(this.errorMessage, 'Login Failed');
        console.error('LoginComponent - Login error:', err);
      },
    });
  }

  validateField(field: string) {
    const control = this.loginForm.get(field);
    if (control) {
      control.markAsTouched();
    }
  }
}
