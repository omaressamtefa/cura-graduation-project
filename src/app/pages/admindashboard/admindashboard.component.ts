import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './admindashboard.component.html',
  styleUrls: ['./admindashboard.component.scss'],
})
export class AdmindashboardComponent implements OnInit, AfterViewInit {
  searchTermDoctors: string = '';
  searchTermPatients: string = '';

  doctors: any[] = [];
  filteredDoctors: any[] = [];
  isLoadingDoctors: boolean = false;
  hasErrorDoctors: boolean = false;
  errorMessageDoctors: string = '';

  patients: any[] = [];
  filteredPatients: any[] = [];
  isLoadingPatients: boolean = false;
  hasErrorPatients: boolean = false;
  errorMessagePatients: string = '';

  role: string | null = null;

  totalDoctors: number = 0;
  totalPatients: number = 0;
  appointments: number;

  safeImageUrlMapDoctors: { [key: string]: SafeUrl } = {};
  imageLoadFailedMapDoctors: { [key: string]: boolean } = {};

  safeImageUrlMapPatients: { [key: string]: SafeUrl } = {};
  imageLoadFailedMapPatients: { [key: string]: boolean } = {};

  // Chart reference
  @ViewChild('systemChart') systemChart!: ElementRef<HTMLCanvasElement>;
  private chartInstance: Chart | undefined;

  private baseApiUrl: string = 'https://cura.runasp.net';
  private fallbackImageUrl: string = '/assets/images/default-user.jpg';
  private isDev: boolean = window.location.hostname === 'localhost';

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {
    this.appointments = Math.floor(Math.random() * 30) + 1;
  }

  ngOnInit(): void {
    this.role = this.authService.getRole();
    if (this.role !== 'admin') {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchDoctors();
    this.fetchPatients();
    this.fetchSummaryData();
  }

  ngAfterViewInit(): void {
    this.initializeChart();
  }

  // ----------------- Summary Data -----------------

  fetchSummaryData(): void {
    // Fetch total doctors
    this.adminService.getAllDoctors(1, 1000, '').subscribe({
      next: (response: any) => {
        this.totalDoctors = response?.data?.length || 0;
        this.updateChart(); // Update chart after fetching data
      },
      error: (error: any) => {
        console.error('Error fetching total doctors:', error);
        this.toastr.error('Failed to load total doctors.', 'Error');
      },
    });

    // Fetch total patients
    this.adminService.getAllPatients(1, 1000, '').subscribe({
      next: (response: any) => {
        this.totalPatients = response?.data?.length || 0;
        this.updateChart(); // Update chart after fetching data
      },
      error: (error: any) => {
        console.error('Error fetching total patients:', error);
        this.toastr.error('Failed to load total patients.', 'Error');
      },
    });
  }

  // ----------------- Chart Initialization -----------------

  initializeChart(): void {
    if (!this.systemChart?.nativeElement) {
      console.error('System chart canvas not found');
      return;
    }

    // Destroy existing chart instance if it exists
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    // Initialize chart with fixed appointments value
    this.chartInstance = new Chart(this.systemChart.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Doctors', 'Patients', 'Appointments'],
        datasets: [
          {
            label: 'System Statistics',
            data: [this.totalDoctors, this.totalPatients, this.appointments],
            backgroundColor: [
              'rgba(108, 83, 121, 0.6)', // #6c5379
              'rgba(126, 99, 141, 0.6)', // #7e638d
              'rgba(211, 193, 229, 0.6)', // #d3c1e5
            ],
            borderColor: [
              'rgba(108, 83, 121, 1)',
              'rgba(126, 99, 141, 1)',
              'rgba(211, 193, 229, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count',
              color: '#1f2937',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Categories',
              color: '#1f2937',
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#1f2937',
            },
          },
          title: {
            display: true,
            text: 'System Statistics',
            color: '#1f2937',
            font: {
              size: 18,
            },
          },
        },
      },
    });
  }

  // ----------------- Doctors -----------------

  fetchDoctors(): void {
    this.isLoadingDoctors = true;
    this.hasErrorDoctors = false;

    this.adminService.getAllDoctors(1, 5, this.searchTermDoctors).subscribe({
      next: (response: any) => {
        const doctors = response?.data || [];
        console.log('Doctors API Response:', JSON.stringify(response, null, 2));
        console.log('Doctors Data:', doctors);
        doctors.forEach((doctor: any) => {
          console.log(
            `Doctor ID: ${doctor.id}, Image URL: ${
              doctor.avatar || doctor.imageUrl || 'N/A'
            }, Raw Data:`,
            doctor
          );
        });

        this.doctors = doctors;
        this.filteredDoctors = doctors;
        this.totalDoctors = doctors.length;
        this.isLoadingDoctors = false;

        // Populate image maps for doctors
        this.safeImageUrlMapDoctors = {};
        this.imageLoadFailedMapDoctors = {};
        doctors.forEach((doctor: any) => {
          this.processDoctorImage(doctor);
        });

        this.onSearchChangeDoctors();
        this.updateChart();
      },
      error: (error: any) => {
        this.hasErrorDoctors = true;
        this.errorMessageDoctors = 'Failed to load doctors. Please try again.';
        this.isLoadingDoctors = false;
        console.error('Error fetching doctors:', error);
      },
    });
  }

  private processDoctorImage(doctor: any): void {
    let imageField = doctor.avatar || doctor.imageUrl;
    if (imageField) {
      const imageUrl = imageField.startsWith('http')
        ? imageField
        : `${this.baseApiUrl}${
            imageField.startsWith('/') ? '' : '/'
          }${imageField}`;
      console.log(`Constructed URL for doctor ${doctor.id}:`, imageUrl);
      this.safeImageUrlMapDoctors[doctor.id] =
        this.sanitizer.bypassSecurityTrustUrl(imageUrl);
      this.testImageUrl('doctor', doctor.id, imageUrl);
    } else {
      console.log(`No image URL found for doctor ID: ${doctor.id}`);
      this.safeImageUrlMapDoctors[doctor.id] =
        this.sanitizer.bypassSecurityTrustUrl(this.fallbackImageUrl);
      this.imageLoadFailedMapDoctors[doctor.id] = true;
    }
  }

  private testImageUrl(
    type: 'doctor' | 'patient',
    id: string,
    url: string
  ): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      if (type === 'doctor') {
        this.imageLoadFailedMapDoctors[id] = false;
      } else {
        this.imageLoadFailedMapPatients[id] = false;
      }
      console.log(`Image loaded successfully for ${type} ID: ${id}`);
    };
    img.onerror = () => {
      if (type === 'doctor') {
        this.imageLoadFailedMapDoctors[id] = true;
        this.safeImageUrlMapDoctors[id] = this.sanitizer.bypassSecurityTrustUrl(
          this.fallbackImageUrl
        );
      } else {
        this.imageLoadFailedMapPatients[id] = true;
        this.safeImageUrlMapPatients[id] =
          this.sanitizer.bypassSecurityTrustUrl(this.fallbackImageUrl);
      }
      console.log(
        `Image load failed for ${type} ID: ${id}, falling back to default`
      );
    };
  }

  handleImageErrorDoctor(id: string): void {
    this.imageLoadFailedMapDoctors[id] = true;
    this.safeImageUrlMapDoctors[id] = this.sanitizer.bypassSecurityTrustUrl(
      this.fallbackImageUrl
    );
    console.log(
      'Image load failed for doctor ID:',
      id,
      'due to CORS or invalid URL'
    );
  }

  handleImageLoadDoctor(id: string): void {
    console.log('Image loaded successfully for doctor ID:', id);
  }

  viewDoctor(id: string): void {
    this.router.navigate([`/doctors/${id}`]);
  }

  updateDoctor(doctorId: string): void {
    console.log('Navigating to update doctor with ID:', doctorId);
    if (!doctorId || doctorId === '0') {
      console.error('Invalid doctor ID:', doctorId);
      this.toastr.error('Invalid doctor ID.', 'Error');
      return;
    }
    this.router.navigate([`/doctors/update/${doctorId}`]);
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
            this.doctors = this.doctors.filter((d) => d.id !== id);
            this.filteredDoctors = this.filteredDoctors.filter(
              (d) => d.id !== id
            );
            this.totalDoctors = this.doctors.length;
            this.fetchDoctors();
            this.updateChart();
            this.toastr.success('Doctor deleted successfully!', 'Success');
          },
          error: (error: any) => {
            console.error('Error deleting doctor:', error);
            this.toastr.error('Failed to delete doctor.', 'Error');
          },
        });
      }
    });
  }

  createDoctor(): void {
    this.router.navigate(['/doctors/create']);
  }

  onSearchChangeDoctors(): void {
    const searchTermLower = this.searchTermDoctors.toLowerCase();
    this.filteredDoctors = this.doctors.filter(
      (doctor) =>
        `${doctor.firstName} ${doctor.lastName}`
          .toLowerCase()
          .includes(searchTermLower) ||
        doctor.email?.toLowerCase().includes(searchTermLower) ||
        doctor.specialty?.toLowerCase().includes(searchTermLower)
    );
  }

  // ----------------- Patients -----------------

  fetchPatients(): void {
    this.isLoadingPatients = true;
    this.hasErrorPatients = false;

    this.adminService.getAllPatients(1, 5, this.searchTermPatients).subscribe({
      next: (response: any) => {
        const patients = response?.data || [];
        console.log(
          'Patients API Response:',
          JSON.stringify(response, null, 2)
        );
        console.log('Patients Data:', patients);
        patients.forEach((patient: any) => {
          console.log(
            `Patient ID: ${patient.id}, Image URL: ${
              patient.avatar || patient.imageUrl || 'N/A'
            }, Raw Data:`,
            patient
          );
        });

        this.patients = patients;
        this.filteredPatients = patients;
        this.totalPatients = patients.length;
        this.isLoadingPatients = false;

        this.safeImageUrlMapPatients = {};
        this.imageLoadFailedMapPatients = {};
        patients.forEach((patient: any) => {
          this.processPatientImage(patient);
        });

        this.onSearchChangePatients();
        this.updateChart();
      },
      error: (error: any) => {
        this.hasErrorPatients = true;
        this.errorMessagePatients =
          'Failed to load patients. Please try again.';
        this.isLoadingPatients = false;
        console.error('Error fetching patients:', error);
      },
    });
  }

  private processPatientImage(patient: any): void {
    let imageField = patient.avatar || patient.imageUrl;
    if (imageField) {
      const imageUrl = imageField.startsWith('http')
        ? imageField
        : `${this.baseApiUrl}${
            imageField.startsWith('/') ? '' : '/'
          }${imageField}`;
      console.log(`Constructed URL for patient ${patient.id}:`, imageUrl);
      this.safeImageUrlMapPatients[patient.id] =
        this.sanitizer.bypassSecurityTrustUrl(imageUrl);
      this.testImageUrl('patient', patient.id, imageUrl);
    } else {
      console.log(`No image URL found for patient ID: ${patient.id}`);
      this.safeImageUrlMapPatients[patient.id] =
        this.sanitizer.bypassSecurityTrustUrl(this.fallbackImageUrl);
      this.imageLoadFailedMapPatients[patient.id] = true;
    }
  }

  handleImageErrorPatient(id: string): void {
    this.imageLoadFailedMapPatients[id] = true;
    this.safeImageUrlMapPatients[id] = this.sanitizer.bypassSecurityTrustUrl(
      this.fallbackImageUrl
    );
    console.log(
      'Image load failed for patient ID:',
      id,
      'due to CORS or invalid URL'
    );
  }

  handleImageLoadPatient(id: string): void {
    console.log('Image loaded successfully for patient ID:', id);
  }

  viewPatient(id: string): void {
    this.router.navigate([`/patients/${id}`]);
  }

  updatePatient(patientId: string): void {
    console.log('Navigating to update patient with ID:', patientId);
    if (!patientId || patientId === '0') {
      console.error('Invalid patient ID:', patientId);
      this.toastr.error('Invalid patient ID.', 'Error');
      return;
    }
    this.router.navigate([`/patients/update/${patientId}`]);
  }

  deletePatient(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to delete this patient? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deletePatient(id).subscribe({
          next: () => {
            this.patients = this.patients.filter((p) => p.id !== id);
            this.filteredPatients = this.filteredPatients.filter(
              (p) => p.id !== id
            );
            this.totalPatients = this.patients.length;
            this.fetchPatients();
            this.updateChart();
            this.toastr.success('Patient deleted successfully!', 'Success');
          },
          error: (error: any) => {
            console.error('Error deleting patient:', error);
            this.toastr.error('Failed to delete patient.', 'Error');
          },
        });
      }
    });
  }

  createPatient(): void {
    this.router.navigate(['/patients/create']);
  }

  onSearchChangePatients(): void {
    const searchTermLower = this.searchTermPatients.toLowerCase();
    this.filteredPatients = this.patients.filter(
      (patient) =>
        `${patient.firstName} ${patient.lastName}`
          .toLowerCase()
          .includes(searchTermLower) ||
        patient.email?.toLowerCase().includes(searchTermLower) ||
        patient.gender?.toLowerCase().includes(searchTermLower)
    );
  }

  // ----------------- Chart Update -----------------

  private updateChart(): void {
    if (this.chartInstance) {
      this.chartInstance.data.datasets[0].data = [
        this.totalDoctors,
        this.totalPatients,
        this.appointments,
      ];
      this.chartInstance.update();
    }
  }
}
