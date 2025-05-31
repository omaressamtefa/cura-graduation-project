import {
  Component,
  OnInit,
  computed,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface TreatmentHistory {
  doctorFirstName?: string;
  doctorLastName?: string;
  diagnosis?: string;
  treatment?: string;
  doctorId?: number;
}

interface Patient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  birthDate: string | null;
  gender: string | null;
  bloodType: string | null;
  imageUrl: string | null;
  xRayImageUrl: string | null;
  labResultsImageUrl: string | null;
  createdAt: string | null;
  department: Array<TreatmentHistory>;
}

@Component({
  selector: 'app-create-patient',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-patient.component.html',
  styleUrls: ['./create-patient.component.scss'],
})
export class CreatePatientComponent implements OnInit {
  patientForm: FormGroup;
  imageFile: File | null = null;
  xRayImageFile: File | null = null;
  labResultsImageFile: File | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isSubmitting = false;
  doctors: Doctor[] = [];
  today: string;
  showToast = false;
  toastType: 'success' | 'error' = 'error'; // Track toaster type

  authService = inject(AuthService);
  router = inject(Router);
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);

  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('xRayImageInput') xRayImageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('labResultsImageInput')
  labResultsImageInput!: ElementRef<HTMLInputElement>;

  dashboardLink = computed(() => {
    const role = this.authService.role() ?? '';
    const uid = this.authService.userId() ?? '';
    const isLoggedIn = this.authService.isLoggedIn();

    if (!isLoggedIn || !role || !uid) {
      console.log(
        'CreatePatientComponent - dashboardLink - Redirecting to /login'
      );
      return '/login';
    }

    if (role === 'admin') return '/home/admin';
    if (role === 'doctor') return `/home/doctor/${uid}`;
    if (role === 'patient') return `/home/patient/${uid}`;
    return '/home';
  });

  constructor() {
    const today = new Date();
    this.today = today.toISOString().split('T')[0];

    this.patientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['', Validators.required],
      bloodType: ['', Validators.required],
      birthDate: ['', [Validators.required, this.pastDateValidator()]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      doctorId: ['', Validators.required],
      diagnosis: ['', Validators.required],
      treatment: ['', Validators.required],
      image: [null],
      xRayImage: [null],
      labResultsImage: [null],
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      console.log(
        'CreatePatientComponent - ngOnInit - User not logged in, redirecting to /login'
      );
      this.router.navigate(['/login']);
      return;
    }

    this.loadDoctors();
  }

  pastDateValidator() {
    return (control: { value: string }) => {
      if (!control.value) return null;
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today ? null : { futureDate: true };
    };
  }

  loadDoctors(): void {
    this.adminService.getAllDoctors().subscribe({
      next: (response) => {
        this.doctors = response.data || [];
        console.log('Fetched Doctors:', this.doctors);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to load doctors.';
        this.toastType = 'error';
        console.error('Error fetching doctors:', error);
        this.showToast = true;
        setTimeout(() => this.hideToast(), 3000);
      },
    });
  }

  onFileChange(event: Event): void {
    this.handleFileChange(event, 'image', (file) => (this.imageFile = file));
  }

  onXRayFileChange(event: Event): void {
    this.handleFileChange(
      event,
      'xRayImage',
      (file) => (this.xRayImageFile = file)
    );
  }

  onLabResultsFileChange(event: Event): void {
    this.handleFileChange(
      event,
      'labResultsImage',
      (file) => (this.labResultsImageFile = file)
    );
  }

  private handleFileChange(
    event: Event,
    formControlName: string,
    setFile: (file: File | null) => void
  ): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        this.errorMessage = `Invalid file type for ${formControlName
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()}. Only JPG, JPEG, PNG, and GIF are allowed.`;
        this.patientForm.get(formControlName)?.setValue(null);
        setFile(null);
        input.value = '';
        this.toastType = 'error';
        this.showToast = true;
        setTimeout(() => this.hideToast(), 3000);
        return;
      }

      if (file.size > maxSize) {
        this.errorMessage = `${formControlName
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()} file size exceeds the maximum limit of 5MB.`;
        this.patientForm.get(formControlName)?.setValue(null);
        setFile(null);
        input.value = '';
        this.toastType = 'error';
        this.showToast = true;
        setTimeout(() => this.hideToast(), 3000);
        return;
      }

      setFile(file);
      this.patientForm.get(formControlName)?.setValue(file.name);
      this.errorMessage = null;
      console.log(
        `Selected ${formControlName} file:`,
        file.name,
        file.size,
        file.type
      );
    } else {
      this.patientForm.get(formControlName)?.setValue(null);
      setFile(null);
      input.value = '';
      console.log(`Cleared ${formControlName} file selection`);
    }
  }

  onSubmit(): void {
    console.log('Submitting form with data:', this.patientForm.value);
    if (this.patientForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.toastType = 'error';
      console.log('Form is invalid. Errors:', this.patientForm.errors);
      this.markForm();
      this.showToast = true;
      setTimeout(() => this.hideToast(), 3000);
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formData = new FormData();
    formData.append(
      'firstName',
      this.patientForm.get('firstName')?.value || ''
    );
    formData.append('lastName', this.patientForm.get('lastName')?.value || '');
    formData.append('gender', this.patientForm.get('gender')?.value || '');
    formData.append(
      'bloodType',
      this.patientForm.get('bloodType')?.value || ''
    );
    formData.append(
      'birthDate',
      new Date(this.patientForm.get('birthDate')?.value).toISOString() || ''
    );
    formData.append('email', this.patientForm.get('email')?.value || '');
    formData.append('password', this.patientForm.get('password')?.value || '');
    formData.append(
      'doctorId',
      Number(this.patientForm.get('doctorId')?.value).toString() || ''
    );
    formData.append(
      'diagnosis',
      this.patientForm.get('diagnosis')?.value || ''
    );
    formData.append(
      'treatment',
      this.patientForm.get('treatment')?.value || ''
    );

    if (this.imageFile) {
      formData.append('image', this.imageFile, this.imageFile.name);
      console.log(
        'Appending image:',
        this.imageFile.name,
        this.imageFile.size,
        this.imageFile.type
      );
    }
    if (this.xRayImageFile) {
      formData.append('xRayImage', this.xRayImageFile, this.xRayImageFile.name);
      console.log(
        'Appending xRayImage:',
        this.xRayImageFile.name,
        this.xRayImageFile.size,
        this.xRayImageFile.type
      );
    }
    if (this.labResultsImageFile) {
      formData.append(
        'labResultsImage',
        this.labResultsImageFile,
        this.labResultsImageFile.name
      );
      console.log(
        'Appending labResultsImage:',
        this.labResultsImageFile.name,
        this.labResultsImageFile.size,
        this.labResultsImageFile.type
      );
    }

    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`FormData - ${key}:`, value);
    }

    this.adminService
      .createPatient(formData)
      .pipe(
        tap((response) => {
          console.log('Raw API Response:', response);
        }),
        catchError((error) => {
          this.isSubmitting = false;
          let errorMsg = 'An error occurred while creating the patient.';
          if (error.status === 400) {
            errorMsg =
              error.error?.message ||
              'Invalid input data. Check image file compatibility.';
            if (error.error?.errors) {
              console.error('Validation errors:', error.error.errors);
            }
          } else if (error.status === 401) {
            errorMsg = 'Unauthorized: Please log in as an admin.';
          } else if (error.status === 0) {
            errorMsg = 'Network error: Please check your connection.';
          } else {
            errorMsg = error.message || error.statusText || 'Unknown error';
          }
          this.errorMessage = errorMsg;
          this.toastType = 'error';
          console.error('Create patient error:', error);
          this.showToast = true;
          setTimeout(() => this.hideToast(), 3000);
          return throwError('');
        })
      )
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.successMessage =
            response.message || 'Patient registered successfully';
          this.toastType = 'success';
          this.showToast = true;
          console.log('Patient created successfully:', response.data);
          if (
            response.data?.imageUrl ||
            response.data?.xRayImageUrl ||
            response.data?.labResultsImageUrl
          ) {
            console.log('Image URLs stored:', {
              imageUrl: response.data.imageUrl,
              xRayImageUrl: response.data.xRayImageUrl,
              labResultsImageUrl: response.data.labResultsImageUrl,
            });
          }
          setTimeout(() => {
            this.hideToast();
            this.resetForm();
            this.router.navigate([this.dashboardLink()]);
          }, 3000);
        },
        error: () => {
          this.isSubmitting = false;
        },
      });
  }

  cancel(): void {
    console.log(
      'CreatePatientComponent - cancel - Navigating to:',
      this.dashboardLink()
    );
    this.resetForm();
    this.router.navigate([this.dashboardLink()]).then((success) => {
      console.log('Navigation success:', success);
      if (!success) {
        console.log('Navigation failed, redirecting to /login');
        this.router.navigate(['/login']);
      }
    });
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  hideToast(): void {
    this.showToast = false;
    this.errorMessage = null;
    this.successMessage = null;
  }

  private resetForm(): void {
    this.patientForm.reset({
      firstName: '',
      lastName: '',
      gender: '',
      bloodType: '',
      birthDate: '',
      email: '',
      password: '',
      doctorId: '',
      diagnosis: '',
      treatment: '',
      image: null,
      xRayImage: null,
      labResultsImage: null,
    });
    this.imageFile = null;
    this.xRayImageFile = null;
    this.labResultsImageFile = null;
    this.errorMessage = null;
    this.successMessage = null;
    if (this.imageInput?.nativeElement)
      this.imageInput.nativeElement.value = '';
    if (this.xRayImageInput?.nativeElement)
      this.xRayImageInput.nativeElement.value = '';
    if (this.labResultsImageInput?.nativeElement)
      this.labResultsImageInput.nativeElement.value = '';
  }

  private markForm(): void {
    Object.values(this.patientForm.controls).forEach((control) => {
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }
}
