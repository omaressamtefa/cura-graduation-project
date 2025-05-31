import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService, ToastrModule } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-doctor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './update-doctor.component.html',
  styleUrls: ['./update-doctor.component.scss'],
})
export class UpdateDoctorComponent implements OnInit {
  updateDoctorForm: FormGroup;
  doctorId: string | null = null;
  errorMessage: string | null = null;
  doctorFirstName: string | null = null;
  doctorLastName: string | null = null;
  role: string | null = null;
  isDoctorNotFound: boolean = false;
  validSpecialties: string[] = [
    'Cardiology',
    'Neurology',
    'Pediatrics',
    'Orthopedics',
    'Dermatology',
  ];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.updateDoctorForm = this.fb.group({
      FirstName: [{ value: '', disabled: true }, Validators.required],
      LastName: [{ value: '', disabled: true }, Validators.required],
      Email: ['', [Validators.required, Validators.email]],
      Specialty: ['', [Validators.required, this.specialtyValidator()]],
      BirthDate: ['', [Validators.required, this.dateValidator()]],
      Gender: ['', Validators.required],
    });
  }

  dateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const date = new Date(value);
      const today = new Date();
      const minDate = new Date('1900-01-01');

      if (isNaN(date.getTime()) || date > today || date < minDate) {
        return { invalidDate: true };
      }
      return null;
    };
  }

  specialtyValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const isValid = this.validSpecialties.includes(value);
      return isValid ? null : { invalidSpecialty: true };
    };
  }

  ngOnInit(): void {
    this.role = this.authService.getRole();
    this.doctorId = this.route.snapshot.paramMap.get('id');

    console.log('Route Parameter - doctorId:', this.doctorId);

    if (!this.role || this.role !== 'admin') {
      console.warn('Unauthorized role:', this.role);
      this.router.navigate(['/login']);
      return;
    }

    if (
      this.doctorId &&
      this.doctorId !== '0' &&
      !isNaN(Number(this.doctorId))
    ) {
      this.fetchDoctorDetails(this.doctorId);
    } else {
      this.errorMessage = 'Invalid doctor ID provided.';
      console.error('Invalid doctorId:', this.doctorId);
      this.doctorFirstName = 'N/A';
      this.doctorLastName = 'N/A';
      this.isDoctorNotFound = true;
      this.updateDoctorForm.get('FirstName')?.enable();
      this.updateDoctorForm.get('LastName')?.enable();
      this.updateDoctorForm.get('Email')?.enable();
    }
  }

  fetchDoctorDetails(doctorId: string): void {
    console.log('Fetching doctor details for ID:', doctorId);

    this.adminService.getDoctorById(doctorId).subscribe({
      next: (response) => {
        console.log('Doctor Response (Admin):', response);
        const doctor = response.data;
        if (doctor) {
          this.doctorFirstName = doctor.firstName || doctor.first_name || 'N/A';
          this.doctorLastName = doctor.lastName || doctor.last_name || 'N/A';
          this.updateDoctorForm.patchValue({
            FirstName: doctor.firstName || doctor.first_name || '',
            LastName: doctor.lastName || doctor.last_name || '',
            Email: doctor.email || '',
            Specialty: doctor.specialty || '',
            BirthDate:
              doctor.birthDate || doctor.dateOfBirth
                ? new Date(doctor.birthDate || doctor.dateOfBirth)
                    .toISOString()
                    .split('T')[0]
                : '',
            Gender: doctor.gender || '',
          });
        } else {
          this.errorMessage = `Doctor with ID ${doctorId} not found.`;
          this.doctorFirstName = 'N/A';
          this.doctorLastName = 'N/A';
          this.isDoctorNotFound = true;
          this.updateDoctorForm.get('FirstName')?.enable();
          this.updateDoctorForm.get('LastName')?.enable();
          this.updateDoctorForm.get('Email')?.enable();
        }
      },
      error: (err) => {
        console.error('Error fetching doctor details (Admin):', err);
        this.errorMessage = `Failed to load doctor details: ${err.message}`;
        this.doctorFirstName = 'N/A';
        this.doctorLastName = 'N/A';
        this.isDoctorNotFound = true;
        this.updateDoctorForm.get('FirstName')?.enable();
        this.updateDoctorForm.get('LastName')?.enable();
        this.updateDoctorForm.get('Email')?.enable();
      },
    });
  }

  async onSubmit(): Promise<void> {
    if (this.updateDoctorForm.invalid) {
      const specialtyControl = this.updateDoctorForm.get('Specialty');
      if (specialtyControl?.errors?.['invalidSpecialty']) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid Specialty',
          text: 'Specialty must be one of: Cardiology, Neurology, Pediatrics, Orthopedics, Dermatology',
          confirmButtonText: 'OK',
          customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            confirmButton: 'swal2-custom-confirm',
          },
        });
        return;
      }

      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: 'Please fill out all required fields: Specialty, Email, Date of Birth, and Gender.',
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal2-custom-popup',
          title: 'swal2-custom-title',
          confirmButton: 'swal2-custom-confirm',
        },
      });
      this.errorMessage = 'Please fill out all required fields correctly.';
      return;
    }

    // Show SweetAlert2 confirmation dialog
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you really want to update the details for ${this.doctorFirstName} ${this.doctorLastName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update it!',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel',
        icon: 'swal2-custom-icon',
      },
    });

    if (!result.isConfirmed) {
      return; // Cancel the update if user clicks "Cancel"
    }

    const formValue = this.updateDoctorForm.getRawValue();
    const payload = {
      email: formValue.Email,
      specialty: formValue.Specialty,
      birthDate: formValue.BirthDate,
      gender: formValue.Gender,
    };

    console.log('Payload:', payload);

    if (this.doctorId) {
      const formData = new FormData();
      formData.append('email', payload.email);
      formData.append('specialty', payload.specialty);
      formData.append('birthDate', payload.birthDate);
      formData.append('gender', payload.gender);

      this.adminService.updateDoctor(this.doctorId, formData).subscribe({
        next: (response) => {
          console.log('Update Response:', response);
          this.toastr.success('Doctor updated successfully!', 'Success', {
            toastClass: 'ngx-toastr custom-toastr',
          });
          this.errorMessage = null;
          setTimeout(() => {
            this.router.navigate(['/home/admin']);
          }, 2000);
        },
        error: (err) => {
          console.error('Update Error:', err);
          const errorMsg =
            err.error?.message || err.message || 'An unknown error occurred.';
          this.errorMessage = `Failed to update doctor: ${errorMsg}`;
          this.toastr.error('Failed to update doctor.', 'Error', {
            toastClass: 'ngx-toastr custom-toastr',
          });
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/home/admin']);
  }
}
