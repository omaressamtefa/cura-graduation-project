import {
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth/auth.service';
import { AdminService } from '../../core/services/admin/admin.service';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  email?: string;
  imageUrl?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-allpatients',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './allpatients.component.html',
  styleUrls: ['./allpatients.component.scss'],
})
export class AllpatientsComponent implements OnInit, OnChanges {
  @Input() searchTerm: string = '';
  @Output() filteredPatientsChange = new EventEmitter<any[]>();
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  isLoadingPatients: boolean = false;
  hasErrorPatients: boolean = false;
  errorMessagePatients: string = '';
  imageLoadFailedMap: { [key: string]: boolean } = {};
  safeImageUrlMap: { [key: string]: SafeUrl | null } = {};
  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-patient.jpg';

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 5;
  totalItems: number = 0;
  totalPages: number = 0;

  constructor(
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchPatients();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchTerm']) {
      this.currentPage = 1; // Reset to first page on search
      this.onSearchChange();
      this.fetchPatients();
    }
  }

  fetchPatients(): void {
    this.isLoadingPatients = true;
    this.hasErrorPatients = false;
    this.errorMessagePatients = '';

    this.adminService
      .getAllPatients(this.currentPage, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response) => {
          const patients = Array.isArray(response)
            ? response
            : response?.data || [];
          this.totalItems = response?.totalCount || patients.length;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.patients = patients;
          this.filteredPatients = [...this.patients];

          this.filteredPatients.forEach((patient) => {
            this.processPatientImage(patient);
          });

          this.isLoadingPatients = false;
          this.filteredPatientsChange.emit(this.filteredPatients);
        },
        error: (error) => {
          this.isLoadingPatients = false;
          this.hasErrorPatients = true;
          this.errorMessagePatients =
            error.message || 'An error occurred while loading patients.';
          this.filteredPatientsChange.emit([]);
          console.error('Error fetching patients:', error);
        },
      });
  }

  private processPatientImage(patient: Patient): void {
    if (patient.imageUrl) {
      const imageUrl = patient.imageUrl.startsWith('http')
        ? patient.imageUrl
        : `${this.baseApiUrl}${patient.imageUrl.startsWith('/') ? '' : '/'}${
            patient.imageUrl
          }`;
      this.safeImageUrlMap[patient.id] =
        this.sanitizer.bypassSecurityTrustUrl(imageUrl);
      this.testImageUrl(patient.id, imageUrl);
    } else {
      this.safeImageUrlMap[patient.id] = this.sanitizer.bypassSecurityTrustUrl(
        this.fallbackImageUrl
      );
      this.imageLoadFailedMap[patient.id] = true;
    }
  }

  private testImageUrl(patientId: string, url: string): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      this.imageLoadFailedMap[patientId] = false;
    };
    img.onerror = () => {
      this.imageLoadFailedMap[patientId] = true;
      this.safeImageUrlMap[patientId] = this.sanitizer.bypassSecurityTrustUrl(
        this.fallbackImageUrl
      );
    };
  }

  handleImageError(patientId: string): void {
    this.imageLoadFailedMap[patientId] = true;
    this.safeImageUrlMap[patientId] = this.sanitizer.bypassSecurityTrustUrl(
      this.fallbackImageUrl
    );
  }

  onSearchChange(): void {
    if (!this.searchTerm) {
      this.filteredPatients = [...this.patients];
    } else {
      const searchTermLower = this.searchTerm.toLowerCase();
      this.filteredPatients = this.patients.filter(
        (patient) =>
          `${patient.firstName} ${patient.lastName}`
            .toLowerCase()
            .includes(searchTermLower) ||
          patient.email?.toLowerCase().includes(searchTermLower)
      );
    }
    this.filteredPatients.forEach((patient) => {
      if (!this.safeImageUrlMap[patient.id]) {
        this.processPatientImage(patient);
      }
    });
    this.filteredPatientsChange.emit(this.filteredPatients);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchPatients();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchPatients();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchPatients();
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

  createPatient(): void {
    this.router.navigate(['/patients/create']);
  }

  viewPatient(id: string): void {
    this.router.navigate([`/patients/${id}`]);
  }

  updatePatient(patientId: string): void {
    this.router.navigate([`/patients/update/${patientId}`]);
  }

  deletePatient(id: string): void {
    const patient = this.filteredPatients.find((p) => p.id === id);
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : 'this patient';

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you really want to delete ${patientName}? This action cannot be undone.`,
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
        this.adminService.deletePatient(id).subscribe({
          next: () => {
            this.toastr.success('Patient deleted successfully!', 'Success');
            this.fetchPatients();
          },
          error: (error) => {
            console.error('Error deleting patient:', error);
            this.toastr.error(
              'Failed to delete patient. Please try again.',
              'Error'
            );
          },
        });
      } else {
        this.toastr.info('Deletion cancelled.', 'Info');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
