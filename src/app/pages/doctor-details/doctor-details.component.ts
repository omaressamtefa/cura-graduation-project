import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { LoaderService } from '../../core/services/loader/loader.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { DatePipe } from '@angular/common';

interface Patient {
  firstName: string;
  lastName: string;
  id: string;
  gender: string;
  birthDate: string;
  email: string;
  imageUrl?: string;
  createdAt: string;
  department: {
    diagnosis: string;
    treatment: string;
    doctorId: number;
    doctorFirstName: string;
    doctorLastName: string;
  }[];
  [key: string]: any;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  specialty: string;
  email: string;
  imageUrl?: string;
  phoneNumber?: string;
  experience?: string;
  qualifications?: string;
  availability?: string;
  createdAt?: string;
  bloodType?: string;
  departmentDetails?: Patient[];
  [key: string]: any;
}

@Component({
  imports: [DatePipe],
  selector: 'app-doctor-details',
  templateUrl: './doctor-details.component.html',
  styleUrls: ['./doctor-details.component.scss'],
})
export class DoctorDetailsComponent implements OnInit {
  doctor: Doctor | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  role: string | null = null;
  doctorId: string | null = null;
  imageLoadFailed: boolean = false;
  safeImageUrl: SafeUrl | null = null;
  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-doctor.jpg';

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService,
    private loaderService: LoaderService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.role = this.authService.getRole();
    this.doctorId = this.route.snapshot.paramMap.get('id');
    this.checkAuthorization();

    if (!this.doctorId) {
      this.errorMessage = 'Doctor ID not provided.';
      this.toastr.error(
        this.errorMessage ?? 'An unknown error occurred.',
        'Error'
      );
      this.router.navigate(['/']);
      return;
    }

    this.loadDoctorDetails();
  }

  checkAuthorization(): void {
    if (!this.role || (this.role !== 'admin' && this.role !== 'doctor')) {
      this.errorMessage = 'Unauthorized access: Admins or doctors only.';
      this.toastr.error(this.errorMessage, 'Error');
      this.router.navigate(['/']);
    }
  }

  loadDoctorDetails(): void {
    this.isLoading = true;
    this.loaderService.show();
    this.errorMessage = null;
    console.log('Fetching doctor with ID:', this.doctorId);

    this.adminService.getDoctorById(this.doctorId!).subscribe({
      next: (response) => {
        console.log('Raw API Response:', response);
        this.doctor = response.data || null;
        console.log('Fetched Doctor Data:', this.doctor);

        if (!this.doctor) {
          this.errorMessage = `Doctor with ID ${this.doctorId} not found.`;
          this.toastr.error(this.errorMessage, 'Error');
          this.isLoading = false;
          this.loaderService.hide();
          return;
        }

        // Handle image URL
        if (this.doctor.imageUrl) {
          const imageUrl = this.doctor.imageUrl.startsWith('http')
            ? this.doctor.imageUrl
            : `${this.baseApiUrl}${
                this.doctor.imageUrl.startsWith('/') ? '' : '/'
              }${this.doctor.imageUrl}`;
          console.log('Constructed Image URL:', imageUrl);
          this.safeImageUrl = this.sanitizer.bypassSecurityTrustUrl(imageUrl);
          this.testImageUrl(imageUrl);
        } else {
          console.log('No image URL provided, using fallback icon.');
          this.safeImageUrl = this.sanitizer.bypassSecurityTrustUrl(
            this.fallbackImageUrl
          );
          this.imageLoadFailed = true;
        }

        this.loadDepartmentDetails(this.doctorId!);
      },
      error: (error) => {
        console.error('Error in loadDoctorDetails:', error);
        this.errorMessage = error.message || 'Failed to fetch doctor details.';
        this.toastr.error(
          this.errorMessage ?? 'An unknown error occurred.',
          'Error'
        );
        this.isLoading = false;
        this.loaderService.hide();
      },
    });
  }

  private testImageUrl(url: string): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      console.log('Image loaded successfully:', url);
      this.imageLoadFailed = false;
    };
    img.onerror = (error) => {
      console.warn('Failed to load image:', url, error);
      this.imageLoadFailed = true;
      this.safeImageUrl = this.sanitizer.bypassSecurityTrustUrl(
        this.fallbackImageUrl
      );
    };
  }

  loadDepartmentDetails(doctorId: string): void {
    this.adminService.getDoctorDepartment(doctorId).subscribe({
      next: (deptResponse) => {
        if (this.doctor) {
          this.doctor.departmentDetails = deptResponse.data || [];
        }
        console.log('Fetched Department Data:', this.doctor?.departmentDetails);
        this.isLoading = false;
        this.loaderService.hide();
      },
      error: (error) => {
        console.warn('Department fetch failed, using existing data:', error);
        this.isLoading = false;
        this.loaderService.hide();
      },
    });
  }

  editDoctor(id: string): void {
    if (!id || id === '0') {
      this.toastr.error('Invalid doctor ID.', 'Error');
      return;
    }
    this.router.navigate([`/doctors/update/${id}`]);
  }

  deleteDoctor(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to delete this doctor? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteDoctor(id).subscribe({
          next: () => {
            this.toastr.success('Doctor deleted successfully!', 'Success');
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
            this.errorMessage = error.message || 'Failed to delete doctor.';
            this.toastr.error(
              this.errorMessage ?? 'An unknown error occurred.',
              'Error'
            );
          },
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  handleImageError(): void {
    console.warn('Doctor image failed to load, falling back to default image.');
    this.imageLoadFailed = true;
    this.safeImageUrl = this.sanitizer.bypassSecurityTrustUrl(
      this.fallbackImageUrl
    );
  }
}
