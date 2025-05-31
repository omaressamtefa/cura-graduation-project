import { Component, OnInit, computed, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2'; // Import SweetAlert2

@Component({
  selector: 'app-create-doctor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-doctor.component.html',
  styleUrls: ['./create-doctor.component.scss'],
})
export class CreateDoctorComponent implements OnInit {
  doctorForm: FormGroup;
  specialties: string[] = [
    'Cardiology',
    'Neurology',
    'Pediatrics',
    'Orthopedics',
    'Dermatology',
  ];
  imageFile: File | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;

  // Inject services
  authService = inject(AuthService);
  router = inject(Router);

  // Compute dashboard link based on role and userId
  dashboardLink = computed(() => {
    const role = this.authService.role() ?? '';
    const uid = this.authService.userId() ?? '';
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('CreateDoctorComponent - dashboardLink - Role:', role);
    console.log('CreateDoctorComponent - dashboardLink - UserId:', uid);
    console.log(
      'CreateDoctorComponent - dashboardLink - IsLoggedIn:',
      isLoggedIn
    );

    if (!isLoggedIn || !role || !uid) {
      console.log(
        'CreateDoctorComponent - dashboardLink - Redirecting to /login'
      );
      return '/login';
    }

    if (role === 'admin') return '/home/admin';
    if (role === 'doctor') return `/home/doctor/${uid}`;
    if (role === 'patient') return `/home/patient/${uid}`;
    return '/home';
  });

  constructor(private fb: FormBuilder, private adminService: AdminService) {
    this.doctorForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['', Validators.required],
      birthDate: ['', Validators.required],
      specialty: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      image: [null],
    });
  }

  ngOnInit(): void {
    // Check authentication on init
    if (!this.authService.isLoggedIn()) {
      console.log(
        'CreateDoctorComponent - ngOnInit - User not logged in, redirecting to /login'
      );
      this.router.navigate(['/login']);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        this.errorMessage =
          'Invalid file type. Only JPG, JPEG, PNG, and GIF are allowed.';
        this.doctorForm.get('image')?.setValue(null);
        return;
      }

      if (file.size > maxSize) {
        this.errorMessage = 'File size exceeds the maximum limit of 5MB.';
        this.doctorForm.get('image')?.setValue(null);
        return;
      }

      this.imageFile = file;
      this.errorMessage = null;
    }
  }

  onSubmit(): void {
    if (this.doctorForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.doctorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formData = new FormData();
    formData.append('FirstName', this.doctorForm.get('firstName')?.value);
    formData.append('LastName', this.doctorForm.get('lastName')?.value);
    formData.append('Gender', this.doctorForm.get('gender')?.value);
    formData.append(
      'BirthDate',
      new Date(this.doctorForm.get('birthDate')?.value).toISOString()
    );
    formData.append('Specialty', this.doctorForm.get('specialty')?.value);
    formData.append('Email', this.doctorForm.get('email')?.value);
    formData.append('Password', this.doctorForm.get('password')?.value);
    if (this.imageFile) {
      formData.append('Image', this.imageFile);
    }

    this.adminService
      .createDoctor(formData)
      .pipe(
        catchError((error) => {
          this.isSubmitting = false;
          this.errorMessage =
            error.message || 'An error occurred while creating the doctor.';
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.successMessage =
            response.message || 'Doctor registered successfully';

          // Show SweetAlert2 on success
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: this.successMessage ?? '',
            confirmButtonText: 'Back to Dashboard',
            confirmButtonColor: '#3b82f6',
            customClass: {
              popup: 'animated fadeInDown',
              title: 'text-xl font-bold',
              confirmButton: 'bg-blue-600 hover:bg-blue-700',
            },
            timer: 5000, // Auto-close after 5 seconds
            timerProgressBar: true,
            didOpen: () => {
              Swal.showLoading(); // Show loading animation initially
              setTimeout(() => {
                Swal.hideLoading(); // Hide loading after a brief moment
              }, 500);
            },
          }).then((result) => {
            if (
              result.isConfirmed ||
              result.dismiss === Swal.DismissReason.timer
            ) {
              this.doctorForm.reset();
              this.imageFile = null;
              this.router.navigate([this.dashboardLink()]);
            }
          });
        },
        error: () => {
          this.isSubmitting = false;
        },
      });
  }

  cancel(): void {
    console.log(
      'CreateDoctorComponent - cancel - Navigating to:',
      this.dashboardLink()
    );
    this.doctorForm.reset();
    this.imageFile = null;
    this.errorMessage = null;
    this.successMessage = null;
    this.router.navigate([this.dashboardLink()]).then((success) => {
      console.log(
        'CreateDoctorComponent - cancel - Navigation success:',
        success
      );
      if (!success) {
        console.log(
          'CreateDoctorComponent - cancel - Navigation failed, redirecting to /login'
        );
        this.router.navigate(['/login']);
      }
    });
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }
}
