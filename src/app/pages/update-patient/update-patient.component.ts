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
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-patient',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './update-patient.component.html',
  styleUrls: ['./update-patient.component.scss'],
})
export class UpdatePatientComponent implements OnInit {
  updatePatientForm: FormGroup;
  patientId: string | null = null;
  doctorId: string | null = null;
  errorMessage: string | null = null;
  patientFirstName: string | null = null;
  patientLastName: string | null = null;
  role: string | null = null;
  isPatientNotFound: boolean = false;
  maxFileSize: number = 5 * 1024 * 1024; // 5MB in bytes
  doctors: any[] = [];
  bloodTypes: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.updatePatientForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        birthDate: ['', [Validators.required]],
        age: ['', [Validators.required, Validators.min(0)]],
        bloodType: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: [''],
        doctorId: ['', [Validators.required]],
        diagnosis: [''],
        treatment: [''],
        notes: ['', Validators.required],
        image: [null],
        xRayImage: [null],
        labResultsImage: [null],
      },
      { validators: this.fileValidator }
    );
  }

  fileValidator(group: AbstractControl): ValidationErrors | null {
    const image = group.get('image')?.value;
    const xRayImage = group.get('xRayImage')?.value;
    const labResultsImage = group.get('labResultsImage')?.value;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (image) {
      console.log('Profile Image Details:', {
        name: image.name,
        type: image.type,
        size: image.size,
      });
      if (!allowedTypes.includes(image.type) || image.size > maxSize) {
        return { invalidImage: true };
      }
    }
    if (xRayImage) {
      console.log('X-Ray Image Details:', {
        name: xRayImage.name,
        type: xRayImage.type,
        size: xRayImage.size,
      });
      if (!allowedTypes.includes(xRayImage.type) || xRayImage.size > maxSize) {
        return { invalidXRayImage: true };
      }
    }
    if (labResultsImage) {
      console.log('Lab Results Image Details:', {
        name: labResultsImage.name,
        type: labResultsImage.type,
        size: labResultsImage.size,
      });
      if (
        !allowedTypes.includes(labResultsImage.type) ||
        labResultsImage.size > maxSize
      ) {
        return { invalidLabResultsImage: true };
      }
    }
    return null;
  }

  ngOnInit(): void {
    this.role = this.authService.getRole();
    this.patientId = this.route.snapshot.paramMap.get('patientId');
    this.doctorId = this.authService.getUserId();

    if (!this.role || (this.role !== 'admin' && this.role !== 'doctor')) {
      this.toastr.error('Unauthorized access.', 'Error');
      this.router.navigate(['/login']);
      return;
    }

    this.loadDoctors();

    if (this.role === 'doctor' && this.doctorId) {
      this.updatePatientForm.patchValue({ doctorId: this.doctorId });
      this.disableFieldsExceptNotes();
    } else if (this.role === 'admin') {
      this.enableAllFields();
      this.updatePatientForm
        .get('diagnosis')
        ?.setValidators([Validators.required]);
      this.updatePatientForm
        .get('treatment')
        ?.setValidators([Validators.required]);
      this.updatePatientForm.get('notes')?.clearValidators();
      this.updatePatientForm.get('notes')?.updateValueAndValidity();
    }

    if (this.patientId && !isNaN(Number(this.patientId))) {
      this.fetchPatientDetails(this.patientId);
    } else {
      this.errorMessage = 'Invalid patient ID provided.';
      this.isPatientNotFound = true;
      this.patientFirstName = 'N/A';
      this.patientLastName = 'N/A';
    }
  }

  private loadDoctors(): void {
    this.adminService.getAllDoctors().subscribe({
      next: (response) => {
        this.doctors = response.data || [];
        if (this.role === 'doctor' && this.doctorId) {
          const currentDoctor = this.doctors.find(
            (d) => String(d.id) === String(this.doctorId)
          );
          if (currentDoctor) {
            this.updatePatientForm.patchValue({ doctorId: this.doctorId });
          }
        }
      },
      error: (err) => {
        console.error('Error fetching doctors:', err);
        this.toastr.error('Failed to load doctors.', 'Error');
      },
    });
  }

  private disableFieldsExceptNotes(): void {
    const fieldsToDisable = [
      'firstName',
      'lastName',
      'birthDate',
      'age',
      'bloodType',
      'email',
      'password',
      'doctorId',
      'diagnosis',
      'treatment',
      'image',
      'xRayImage',
      'labResultsImage',
    ];
    fieldsToDisable.forEach((field) => {
      this.updatePatientForm.get(field)?.disable();
    });
    this.updatePatientForm.get('notes')?.enable();
  }

  private enableAllFields(): void {
    const fieldsToEnable = [
      'firstName',
      'lastName',
      'birthDate',
      'age',
      'bloodType',
      'email',
      'password',
      'doctorId',
      'diagnosis',
      'treatment',
      'notes',
      'image',
      'xRayImage',
      'labResultsImage',
    ];
    fieldsToEnable.forEach((field) => {
      this.updatePatientForm.get(field)?.enable();
    });
  }

  fetchPatientDetails(patientId: string): void {
    const observable =
      this.role === 'doctor' && this.doctorId
        ? this.adminService.getPatientsByDoctor(Number(this.doctorId))
        : this.adminService.getPatientById(patientId);

    observable.subscribe({
      next: (response) => {
        const patient =
          this.role === 'doctor'
            ? response.data.find((p: any) => String(p.id) === String(patientId))
            : response.data;

        if (patient) {
          this.patientFirstName =
            patient.firstName || patient.first_name || 'N/A';
          this.patientLastName = patient.lastName || patient.last_name || 'N/A';
          this.updatePatientForm.patchValue({
            firstName: patient.firstName || patient.first_name || '',
            lastName: patient.lastName || patient.last_name || '',
            birthDate: patient.birthDate || '',
            age: patient.age || '',
            bloodType: patient.bloodType || '',
            email: patient.email || '',
            doctorId: patient.department?.[0]?.doctorId || this.doctorId || '',
            diagnosis: patient.department?.[0]?.diagnosis || '',
            treatment: patient.department?.[0]?.treatment || '',
            notes: patient.notes || patient.department?.[0]?.notes || '',
          });
          if (this.role === 'doctor') {
            this.disableFieldsExceptNotes();
          }
        } else {
          this.errorMessage = `Patient with ID ${patientId} not found.`;
          this.isPatientNotFound = true;
          this.patientFirstName = 'N/A';
          this.patientLastName = 'N/A';
        }
      },
      error: (err) => {
        console.error('Error fetching patient details:', err);
        this.errorMessage = `Failed to load patient details: ${err.message}`;
        this.isPatientNotFound = true;
        this.patientFirstName = 'N/A';
        this.patientLastName = 'N/A';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  onFileChange(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.updatePatientForm.get(controlName)?.setValue(file);
    } else {
      this.updatePatientForm.get(controlName)?.setValue(null);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.updatePatientForm.invalid) {
      this.toastr.warning(
        'Please fill out all required fields correctly.',
        'Warning'
      );
      this.updatePatientForm.markAllAsTouched();
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to update the details for ${this.patientFirstName} ${this.patientLastName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    if (this.patientId) {
      if (this.role === 'doctor') {
        this.updatePatientDoctor();
      } else {
        this.updatePatientAdmin();
      }
    }
  }

  updatePatientDoctor(): void {
    const formValue = this.updatePatientForm.getRawValue();
    const formData = new FormData();
    formData.append('notes', formValue.notes || '');
    console.log('Doctor FormData:', formData);

    this.adminService
      .updatePatientByDoctor(this.patientId!, formData)
      .subscribe({
        next: (response) => {
          console.log('Update Response (Doctor):', response);
          this.toastr.success('Patient updated successfully!', 'Success');
          this.errorMessage = null;
          setTimeout(() => this.goBack(), 2000);
        },
        error: (err) => {
          console.error('Update Error (Doctor):', err);
          const errorMsg =
            err.error?.message || err.message || 'An unknown error occurred.';
          this.errorMessage = `Failed to update patient: ${errorMsg}`;
          this.toastr.error(this.errorMessage, 'Error');
          if (err.error && typeof err.error === 'object') {
            console.error('Detailed error response:', err.error);
          }
        },
      });
  }

  updatePatientAdmin(): void {
    const formValue = this.updatePatientForm.getRawValue();
    const formData = new FormData();
    formData.append('firstName', formValue.firstName || '');
    formData.append('lastName', formValue.lastName || '');
    formData.append('birthDate', formValue.birthDate || '');
    formData.append('age', formValue.age || '');
    formData.append('bloodType', formValue.bloodType || '');
    formData.append('email', formValue.email || '');
    formData.append('password', formValue.password || '');
    formData.append('doctorId', formValue.doctorId || '');
    formData.append('diagnosis', formValue.diagnosis || '');
    formData.append('treatment', formValue.treatment || '');
    formData.append('notes', formValue.notes || '');

    // Append images only if they are selected
    if (formValue.image) {
      formData.append('image', formValue.image, formValue.image.name);
      console.log(
        'Appending image:',
        formValue.image.name,
        formValue.image.size,
        formValue.image.type
      );
    } else {
      console.log('No profile image selected for update');
    }
    if (formValue.xRayImage) {
      formData.append(
        'xRayImage',
        formValue.xRayImage,
        formValue.xRayImage.name
      );
      console.log(
        'Appending xRayImage:',
        formValue.xRayImage.name,
        formValue.xRayImage.size,
        formValue.xRayImage.type
      );
    } else {
      console.log('No X-Ray image selected for update');
    }
    if (formValue.labResultsImage) {
      formData.append(
        'labResultsImage',
        formValue.labResultsImage,
        formValue.labResultsImage.name
      );
      console.log(
        'Appending labResultsImage:',
        formValue.labResultsImage.name,
        formValue.labResultsImage.size,
        formValue.labResultsImage.type
      );
    } else {
      console.log('No Lab Results image selected for update');
    }

    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(
        `FormData - ${key}:`,
        value instanceof File ? value.name : value
      );
    }

    this.adminService.updatePatient(this.patientId!, formData).subscribe({
      next: (response) => {
        console.log('Update Response (Admin):', response);
        this.toastr.success('Patient updated successfully!', 'Success');
        this.errorMessage = null;
        setTimeout(() => this.goBack(), 2000);
      },
      error: (err) => {
        console.error('Update Error (Admin):', err);
        let errorMsg =
          err.error?.message || err.message || 'An unknown error occurred.';
        if (err.status === 400) {
          errorMsg =
            err.error?.message ||
            'Failed to save image. Check file compatibility.';
          if (err.error?.errors) {
            console.error('Validation errors:', err.error.errors);
            errorMsg +=
              ' Validation details: ' + JSON.stringify(err.error.errors);
          }
        } else if (err.status === 401) {
          errorMsg = 'Unauthorized: Please log in as an admin.';
        }
        this.errorMessage = `Failed to update patient: ${errorMsg}`;
        this.toastr.error(this.errorMessage, 'Error');
        if (err.error && typeof err.error === 'object') {
          console.error('Detailed error response:', err.error);
        }
      },
    });
  }

  goBack(): void {
    if (this.role === 'doctor' && this.doctorId) {
      this.router.navigate([`/home/doctor/${this.doctorId}`]);
    } else {
      this.router.navigate(['/home/admin']);
    }
  }
}
