import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin/admin.service';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr'; // Added ToastrService
import Swal from 'sweetalert2'; // Already imported

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  specialty?: string;
  email?: string;
  imageUrl?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-alldoctors',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './alldoctors.component.html',
  styleUrls: ['./alldoctors.component.scss'],
})
export class AlldoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  searchTerm: string = '';
  isLoadingDoctors: boolean = false;
  hasErrorDoctors: boolean = false;
  errorMessageDoctors: string = '';
  imageLoadFailedMap: { [key: string]: boolean } = {};
  safeImageUrlMap: { [key: string]: SafeUrl | null } = {};
  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-doctor.jpg';

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 5;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private adminService: AdminService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService // Added ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchDoctors();
  }

  fetchDoctors(): void {
    this.isLoadingDoctors = true;
    this.hasErrorDoctors = false;
    this.errorMessageDoctors = '';

    this.adminService
      .getAllDoctors(this.currentPage, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response) => {
          const doctors = Array.isArray(response)
            ? response
            : response?.data || [];
          this.totalItems = response?.totalCount || doctors.length;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.doctors = doctors;
          this.filteredDoctors = [...this.doctors];

          this.filteredDoctors.forEach((doctor) => {
            this.processDoctorImage(doctor);
          });

          this.isLoadingDoctors = false;
        },
        error: (error) => {
          this.isLoadingDoctors = false;
          this.hasErrorDoctors = true;
          this.errorMessageDoctors =
            error.message || 'An error occurred while loading doctors.';
        },
      });
  }

  private processDoctorImage(doctor: Doctor): void {
    if (doctor.imageUrl) {
      const imageUrl = doctor.imageUrl.startsWith('http')
        ? doctor.imageUrl
        : `${this.baseApiUrl}${doctor.imageUrl.startsWith('/') ? '' : '/'}${
            doctor.imageUrl
          }`;
      this.safeImageUrlMap[doctor.id] =
        this.sanitizer.bypassSecurityTrustUrl(imageUrl);
      this.testImageUrl(doctor.id, imageUrl);
    } else {
      this.safeImageUrlMap[doctor.id] = this.sanitizer.bypassSecurityTrustUrl(
        this.fallbackImageUrl
      );
      this.imageLoadFailedMap[doctor.id] = true;
    }
  }

  private testImageUrl(doctorId: string, url: string): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      this.imageLoadFailedMap[doctorId] = false;
    };
    img.onerror = (error) => {
      this.imageLoadFailedMap[doctorId] = true;
      this.safeImageUrlMap[doctorId] = this.sanitizer.bypassSecurityTrustUrl(
        this.fallbackImageUrl
      );
    };
  }

  handleImageError(doctorId: string): void {
    this.imageLoadFailedMap[doctorId] = true;
    this.safeImageUrlMap[doctorId] = this.sanitizer.bypassSecurityTrustUrl(
      this.fallbackImageUrl
    );
  }

  onSearchChange(): void {
    if (!this.searchTerm) {
      this.filteredDoctors = [...this.doctors];
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredDoctors = this.doctors.filter(
        (doctor) =>
          `${doctor.firstName} ${doctor.lastName}`
            .toLowerCase()
            .includes(searchTermLower) ||
          doctor.email?.toLowerCase().includes(searchTermLower) ||
          doctor.specialty?.toLowerCase().includes(searchTermLower)
      );
    }
    this.filteredDoctors.forEach((doctor) => {
      if (!this.safeImageUrlMap[doctor.id]) {
        this.processDoctorImage(doctor);
      }
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchDoctors();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchDoctors();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchDoctors();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, this.currentPage + half);

    if (end - start + 1 < maxVisiblePages) {
      if (start === 1) {
        end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      } else {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  createDoctor(): void {
    this.router.navigate(['/doctors/create']);
  }

  viewDoctor(id: string): void {
    this.router.navigate([`/doctors/${id}`]);
  }

  updateDoctor(doctorId: string): void {
    this.router.navigate([`/doctors/update/${doctorId}`]);
  }

  deleteDoctor(id: string): void {
    const doctor = this.filteredDoctors.find((d) => d.id === id);
    const doctorName = doctor
      ? `Dr. ${doctor.firstName} ${doctor.lastName}`
      : 'this doctor';

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you really want to delete ${doctorName}? This action cannot be undone.`,
      icon: 'warning',
      iconHtml:
        '<i class="fas fa-exclamation-triangle" style="color: #f4a261;"></i>',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'custom-swal-popup',
        confirmButton: 'custom-swal-confirm',
        cancelButton: 'custom-swal-cancel',
      },
      didOpen: () => {
        const popup = Swal.getPopup();
        if (popup) {
          popup.style.borderRadius = '0.5rem';
          popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteDoctor(id).subscribe({
          next: () => {
            this.toastr.success('Doctor deleted successfully!', 'Success');
            this.fetchDoctors();
          },
          error: (error) => {
            console.error('Error deleting doctor:', error);
            this.toastr.error(
              'Failed to delete doctor. Please try again.',
              'Error'
            );
          },
        });
      } else {
        this.toastr.info('Deletion cancelled.', 'Info');
      }
    });
  }
}
