import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LoaderService } from '../../core/services/loader/loader.service';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

interface User {
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
  specialty?: string | null;
  department?: Array<{
    doctorFirstName?: string;
    doctorLastName?: string;
    diagnosis?: string;
    treatment?: string;
    doctorId?: number;
  }>;
  [key: string]: any;
}

@Component({
  selector: 'app-user-profile',
  imports: [TitleCasePipe, DatePipe],
  standalone: true,
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  role: string | null = null;
  userId: string | null = null;
  loggedInUserId: string | null = null;
  loggedInRole: string | null = null;
  isLoading: boolean = true;
  errorMessage: string | null = null;
  departmentError: string | null = null;
  numberOfPatients: number = 0;
  safeImageUrl: SafeUrl | null = null;
  safeXRayImageUrl: SafeUrl | null = null;
  safeLabResultsImageUrl: SafeUrl | null = null;
  imageLoadFailed: boolean = false;
  xRayImageLoadFailed: boolean = false;
  labResultsImageLoadFailed: boolean = false;
  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-user.jpg';

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer,
    private loaderService: LoaderService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loggedInRole = this.authService.getRole();
    this.loggedInUserId = localStorage.getItem('userId');
    this.route.paramMap.subscribe((params) => {
      this.role = params.get('role');
      this.userId = params.get('id');
      this.checkAuthorization();
      this.loadUserDetails();
    });
  }

  checkAuthorization(): void {
    if (!this.role || !this.userId) {
      this.errorMessage = 'Invalid user ID or role.';
      this.toastr.error(this.errorMessage, 'Error');
      this.isLoading = false;
      this.loaderService.hide();
      this.router.navigate(['/']);
      return;
    }

    if (
      this.loggedInRole === 'patient' &&
      this.role === 'patient' &&
      this.loggedInUserId !== this.userId
    ) {
      this.errorMessage = 'Unauthorized: You can only view your own profile.';
      this.toastr.error(this.errorMessage, 'Error');
      this.isLoading = false;
      this.loaderService.hide();
      this.router.navigate(['/']);
    }

    if (
      this.loggedInRole === 'doctor' &&
      this.role !== 'patient' &&
      this.loggedInUserId !== this.userId
    ) {
      this.errorMessage =
        'Unauthorized: Doctors can only view patient profiles or their own.';
      this.toastr.error(this.errorMessage, 'Error');
      this.isLoading = false;
      this.loaderService.hide();
      this.router.navigate(['/']);
    }
  }

  loadUserDetails(): void {
    if (!this.userId || !this.role) {
      this.errorMessage = 'Invalid user ID or role.';
      this.toastr.error(this.errorMessage, 'Error');
      this.isLoading = false;
      this.loaderService.hide();
      return;
    }

    this.isLoading = true;
    this.loaderService.show();
    this.errorMessage = null;
    this.departmentError = null;

    let requests: any[] = [];

    if (this.role === 'patient') {
      requests.push(this.adminService.getPatientById(this.userId));
    } else {
      requests.push(this.adminService.getUserDetails());
      if (this.role === 'doctor') {
        requests.push(this.adminService.getDoctorPatients(this.userId));
      }
    }

    forkJoin(requests).subscribe({
      next: (responses: any[]) => {
        if (this.role === 'patient') {
          this.user = responses[0].data || null;
          if (!this.user) {
            this.errorMessage = `Patient with ID ${this.userId} not found.`;
            this.toastr.error(this.errorMessage, 'Error');
            this.isLoading = false;
            this.loaderService.hide();
            return;
          }

          // Check department data for patients
          if (!this.user.department || this.user.department.length === 0) {
            this.departmentError =
              'No treatment history available for this patient.';
            this.user.department = [];
          }
        } else {
          this.user = responses[0].user || null;
          if (this.role === 'doctor') {
            this.numberOfPatients = responses[1]?.length || 0;
          }
          if (!this.user) {
            this.errorMessage = `${this.role} with ID ${this.userId} not found.`;
            this.toastr.error(this.errorMessage, 'Error');
            this.isLoading = false;
            this.loaderService.hide();
            return;
          }
        }

        // Handle profile image URL
        if (this.user.imageUrl) {
          const imageUrl = this.user.imageUrl.startsWith('http')
            ? this.user.imageUrl
            : `${this.baseApiUrl}${
                this.user.imageUrl.startsWith('/') ? '' : '/'
              }${this.user.imageUrl}`;
          this.setSafeImageUrl(imageUrl);
          this.testImageUrl(imageUrl, 'profile');
        } else {
          this.setSafeImageUrl(this.fallbackImageUrl);
          this.imageLoadFailed = true;
        }

        // Handle X-ray and Lab Results images (only for patients)
        if (this.role === 'patient') {
          if (this.user.xRayImageUrl) {
            const xRayImageUrl = this.user.xRayImageUrl.startsWith('http')
              ? this.user.xRayImageUrl
              : `${this.baseApiUrl}${
                  this.user.xRayImageUrl.startsWith('/') ? '' : '/'
                }${this.user.xRayImageUrl}`;
            this.setSafeXRayImageUrl(xRayImageUrl);
            this.testImageUrl(xRayImageUrl, 'xRay');
          } else {
            this.xRayImageLoadFailed = true;
          }

          if (this.user.labResultsImageUrl) {
            const labResultsImageUrl = this.user.labResultsImageUrl.startsWith(
              'http'
            )
              ? this.user.labResultsImageUrl
              : `${this.baseApiUrl}${
                  this.user.labResultsImageUrl.startsWith('/') ? '' : '/'
                }${this.user.labResultsImageUrl}`;
            this.setSafeLabResultsImageUrl(labResultsImageUrl);
            this.testImageUrl(labResultsImageUrl, 'labResults');
          } else {
            this.labResultsImageLoadFailed = true;
          }
        }

        this.isLoading = false;
        this.loaderService.hide();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load user details: ' + error.message;
        this.toastr.error(this.errorMessage, 'Error');
        this.isLoading = false;
        this.loaderService.hide();
      },
    });
  }

  setSafeImageUrl(url: string | null): void {
    this.safeImageUrl = url ? this.sanitizer.bypassSecurityTrustUrl(url) : null;
  }

  setSafeXRayImageUrl(url: string | null): void {
    this.safeXRayImageUrl = url
      ? this.sanitizer.bypassSecurityTrustUrl(url)
      : null;
  }

  setSafeLabResultsImageUrl(url: string | null): void {
    this.safeLabResultsImageUrl = url
      ? this.sanitizer.bypassSecurityTrustUrl(url)
      : null;
  }

  private testImageUrl(
    url: string,
    type: 'profile' | 'xRay' | 'labResults'
  ): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      if (type === 'profile') this.imageLoadFailed = false;
      if (type === 'xRay') this.xRayImageLoadFailed = false;
      if (type === 'labResults') this.labResultsImageLoadFailed = false;
    };
    img.onerror = () => {
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
    this.imageLoadFailed = true;
    this.setSafeImageUrl(this.fallbackImageUrl);
  }

  handleXRayImageError(): void {
    this.xRayImageLoadFailed = true;
    this.setSafeXRayImageUrl(null);
  }

  handleLabResultsImageError(): void {
    this.labResultsImageLoadFailed = true;
    this.setSafeLabResultsImageUrl(null);
  }

  getProfileTitle(): string {
    if (this.role === 'admin') return 'Admin Profile';
    if (this.role === 'doctor') return 'Doctor Profile';
    return 'Patient Profile';
  }

  getDisplayName(): string {
    if (!this.user) return 'Unknown';
    if (this.role === 'admin') return 'Admin';
    return `${this.user.firstName || 'Unknown'} ${
      this.user.lastName || 'Unknown'
    }`;
  }

  editUser(id: string): void {
    if (!id || id === '0') {
      this.toastr.error('Invalid user ID.', 'Error');
      return;
    }
    if (this.role === 'patient') {
      this.router.navigate([`/patients/update/${id}`]);
    } else if (this.role === 'doctor') {
      this.router.navigate([`/doctors/update/${id}`]);
    }
  }

  deleteUser(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you really want to delete this ${this.role}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        let deleteObservable;
        if (this.role === 'patient') {
          deleteObservable =
            this.loggedInRole === 'doctor'
              ? this.adminService.deletePatientByDoctor(id)
              : this.adminService.deletePatient(id);
        } else if (this.role === 'doctor') {
          deleteObservable = this.adminService.deleteDoctor(id);
        } else {
          this.toastr.error(
            'Admins cannot be deleted through this interface.',
            'Error'
          );
          return;
        }

        deleteObservable.subscribe({
          next: () => {
            this.toastr.success(
              `${this.role} deleted successfully!`,
              'Success'
            );
            const userId = this.authService.getUserId();
            if (this.loggedInRole === 'admin') {
              this.router.navigate(['/home/admin']);
            } else if (this.loggedInRole === 'doctor' && userId) {
              this.router.navigate([`/home/doctor/${userId}`]);
            } else {
              this.router.navigate(['/home']);
            }
          },
          error: (error) => {
            this.errorMessage = error.message;
            this.toastr.error(`Failed to delete ${this.role}.`, 'Error');
          },
        });
      }
    });
  }
}
