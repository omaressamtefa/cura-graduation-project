import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { LoaderService } from '../../core/services/loader/loader.service';
import { DatePipe } from '@angular/common';

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
  notes: string | null;
  department: Array<{
    doctorFirstName?: string;
    doctorLastName?: string;
    diagnosis?: string;
    treatment?: string;
    notes?: string;
    doctorId?: number;
  }>;
}

@Component({
  imports: [DatePipe],
  selector: 'app-patient-details',
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss'],
})
export class PatientDetailsComponent implements OnInit {
  patient: Patient | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  departmentError: string | null = null;
  role: string | null = null;
  safeImageUrl: SafeUrl | null = null;
  safeXRayImageUrl: SafeUrl | null = null;
  safeLabResultsImageUrl: SafeUrl | null = null;
  imageLoadFailed: boolean = false;
  xRayImageLoadFailed: boolean = false;
  labResultsImageLoadFailed: boolean = false;
  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-patient.jpg';

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.role = this.authService.getRole();
    this.checkAuthorization();
    this.loadPatient();
  }

  checkAuthorization(): void {
    if (!this.role || (this.role !== 'admin' && this.role !== 'doctor')) {
      this.errorMessage = 'Unauthorized access: Admins or doctors only.';
      this.toastr.error(
        this.errorMessage ?? 'An unknown error occurred.',
        'Error'
      );
      this.router.navigate(['/']);
    }
  }

  loadPatient(): void {
    this.isLoading = true;
    this.loaderService.show();
    this.errorMessage = null;
    this.departmentError = null;
    const patientId = this.route.snapshot.paramMap.get('id');
    if (!patientId) {
      this.errorMessage = 'Patient ID not provided.';
      this.toastr.error(this.errorMessage, 'Error');
      this.isLoading = false;
      this.loaderService.hide();
      this.router.navigate(['/']);
      return;
    }

    this.adminService.getPatientById(patientId).subscribe({
      next: (response) => {
        this.patient = response.data || null;
        console.log('Full API Response for getPatientById:', response);
        console.log('Fetched Patient Data:', this.patient);

        if (!this.patient) {
          this.errorMessage = `Patient with ID ${patientId} not found.`;
          this.toastr.error(this.errorMessage, 'Error');
          this.isLoading = false;
          this.loaderService.hide();
          return;
        }

        if (this.patient.imageUrl) {
          const imageUrl = this.patient.imageUrl.startsWith('http')
            ? this.patient.imageUrl
            : `${this.baseApiUrl}${
                this.patient.imageUrl.startsWith('/') ? '' : '/'
              }${this.patient.imageUrl}`;
          console.log('Constructed Profile Image URL:', imageUrl);
          this.setSafeImageUrl(imageUrl);
          this.testImageUrl(imageUrl, 'profile');
        } else {
          console.log('No profile image URL provided, using fallback image.');
          this.setSafeImageUrl(this.fallbackImageUrl);
          this.imageLoadFailed = true;
        }

        if (this.patient.xRayImageUrl) {
          const xRayImageUrl = this.patient.xRayImageUrl.startsWith('http')
            ? this.patient.xRayImageUrl
            : `${this.baseApiUrl}${
                this.patient.xRayImageUrl.startsWith('/') ? '' : '/'
              }${this.patient.xRayImageUrl}`;
          console.log('Constructed X-Ray Image URL:', xRayImageUrl);
          this.setSafeXRayImageUrl(xRayImageUrl);
          this.testImageUrl(xRayImageUrl, 'xRay');
        } else {
          console.log('No X-Ray image URL provided.');
          this.xRayImageLoadFailed = true;
        }

        if (this.patient.labResultsImageUrl) {
          const labResultsImageUrl = this.patient.labResultsImageUrl.startsWith(
            'http'
          )
            ? this.patient.labResultsImageUrl
            : `${this.baseApiUrl}${
                this.patient.labResultsImageUrl.startsWith('/') ? '' : '/'
              }${this.patient.labResultsImageUrl}`;
          console.log('Constructed Lab Results Image URL:', labResultsImageUrl);
          this.setSafeLabResultsImageUrl(labResultsImageUrl);
          this.testImageUrl(labResultsImageUrl, 'labResults');
        } else {
          console.log('No Lab Results image URL provided.');
          this.labResultsImageLoadFailed = true;
        }

        if (!this.patient.department) {
          this.patient.department = [];
          this.departmentError =
            'No treatment history available for this patient.';
          console.log('No department data found, initializing empty array.');
        }

        if (
          this.patient.department &&
          this.patient.department.length > 0 &&
          this.patient.department[0].notes
        ) {
          this.patient.notes = this.patient.department[0].notes;
        } else if (this.patient.notes) {
          this.patient.department = [{ notes: this.patient.notes }];
        } else {
          this.patient.notes = this.patient.department[0]?.notes || null;
        }

        this.isLoading = false;
        this.loaderService.hide();
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to fetch patient data.';
        console.error('Error fetching patient data:', error);
        this.toastr.error(
          this.errorMessage ?? 'An unknown error occurred.',
          'Error'
        );
        this.isLoading = false;
        this.loaderService.hide();
      },
    });
  }

  setSafeImageUrl(url: string | null): void {
    if (url) {
      this.safeImageUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    } else {
      this.safeImageUrl = null;
    }
  }

  setSafeXRayImageUrl(url: string | null): void {
    if (url) {
      this.safeXRayImageUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    } else {
      this.safeXRayImageUrl = null;
    }
  }

  setSafeLabResultsImageUrl(url: string | null): void {
    if (url) {
      this.safeLabResultsImageUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    } else {
      this.safeLabResultsImageUrl = null;
    }
  }

  private testImageUrl(
    url: string,
    type: 'profile' | 'xRay' | 'labResults'
  ): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      console.log(`${type} image loaded successfully:`, url);
      if (type === 'profile') this.imageLoadFailed = false;
      if (type === 'xRay') this.xRayImageLoadFailed = false;
      if (type === 'labResults') this.labResultsImageLoadFailed = false;
    };
    img.onerror = (error) => {
      console.warn(`Failed to load ${type} image:`, url, error);
      if (type === 'profile') {
        this.imageLoadFailed = true;
        this.setSafeImageUrl(this.fallbackImageUrl);
      } else if (type === 'xRay') {
        this.xRayImageLoadFailed = true;
        this.setSafeXRayImageUrl(null);
      } else if (type === 'labResults') {
        this.labResultsImageLoadFailed = true;
        this.setSafeLabResultsImageUrl(null);
      }
    };
  }

  handleImageError(): void {
    console.warn(
      'Patient profile image failed to load, falling back to default image.'
    );
    this.imageLoadFailed = true;
    this.setSafeImageUrl(this.fallbackImageUrl);
  }

  handleXRayImageError(): void {
    console.warn('Patient X-Ray image failed to load.');
    this.xRayImageLoadFailed = true;
    this.setSafeXRayImageUrl(null);
  }

  handleLabResultsImageError(): void {
    console.warn('Patient Lab Results image failed to load.');
    this.labResultsImageLoadFailed = true;
    this.setSafeLabResultsImageUrl(null);
  }

  editPatient(id: string): void {
    if (!id || id === '0') {
      this.toastr.error('Invalid patient ID.', 'Error');
      return;
    }
    this.router.navigate([`/patients/update/${id}`]);
  }

  deletePatient(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to delete this patient? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#860d9e',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        const deleteObservable =
          this.role === 'doctor'
            ? this.adminService.deletePatientByDoctor(id)
            : this.adminService.deletePatient(id);

        deleteObservable.subscribe({
          next: () => {
            this.toastr.success('Patient deleted successfully!', 'Success');
            const userId = this.authService.getUserId();
            if (this.role === 'admin') {
              this.router.navigate(['/home/admin']);
            } else if (this.role === 'doctor' && userId) {
              this.router.navigate([`/home/doctor/${userId}`]);
            } else {
              this.router.navigate(['/home']);
            }
          },
          error: (error) => {
            this.errorMessage = error.message || 'Failed to delete patient.';
            this.toastr.error(
              this.errorMessage ?? 'An unknown error occurred.',
              'Error'
            );
          },
        });
      }
    });
  }
}
