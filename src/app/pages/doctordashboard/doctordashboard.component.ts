import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctordashboard.component.html',
  styleUrls: ['./doctordashboard.component.scss'],
})
export class DoctorDashboardComponent implements OnInit, AfterViewInit {
  role: string | null = null;
  doctorFirstName: string | null = null;
  doctorLastName: string | null = null;
  totalPatients: number = 0;
  newPatients: number = 0;
  patientsThisMonth: number;
  appointments: number;
  searchTerm = signal<string>('');
  filteredPatients = signal<any[]>([]);
  allPatients = signal<any[]>([]);
  isLoadingPatients = signal<boolean>(false);
  hasErrorPatients = signal<boolean>(false);
  errorMessagePatients = signal<string | null>(null);
  doctorId: string | null = null;

  @ViewChild('patientChart', { static: false })
  patientChartCanvas!: ElementRef<HTMLCanvasElement>;

  chartData = {
    labels: ['All Patients', 'New Patients', 'This Month', 'Appointments'],
    datasets: [
      {
        label: 'Patient Statistics',
        data: [0, 0, 0, 0],
        backgroundColor: ['#6c5379', '#7a1f69b8', '#4dd4c6', '#f1c8a7'],
        borderColor: ['#6c5379', '#7a1f69b8', '#4dd4c6', '#f1c8a7'],
        borderWidth: 1,
      },
    ],
  };

  safeImageUrlMapPatients: { [key: string]: SafeUrl } = {};
  imageLoadFailedMapPatients: { [key: string]: boolean } = {};

  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-user.jpg';

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {
    this.patientsThisMonth = Math.floor(Math.random() * 30) + 1;
    this.appointments = Math.floor(Math.random() * 30) + 1;
  }

  ngOnInit(): void {
    this.role = this.authService.getRole();
    this.doctorId = this.route.snapshot.paramMap.get('id');

    if (this.role !== 'doctor') {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserDetails();
    this.loadPatients();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.drawChart(), 0);
  }

  loadUserDetails(): void {
    // Check if welcome alert has already been shown in this session
    if (sessionStorage.getItem('doctorWelcomeShown') === 'true') {
      console.log('Welcome alert already shown in this session, skipping.');
      return;
    }

    this.adminService.getUserDetails().subscribe({
      next: (response) => {
        this.doctorFirstName = response.user.firstName;
        this.doctorLastName = response.user.lastName;
        // Show welcome alert and set flag
        Swal.fire({
          title: 'Welcome to Our System!',
          text: `Hello, Dr. ${this.doctorFirstName || 'Doctor'} ${
            this.doctorLastName || ''
          }! We're so happy to have you manage your patients with us.`,
          icon: 'success',
          confirmButtonText: 'Get Started',
          background: '#f8ede3',
          color: '#6c5379',
          confirmButtonColor: '#6c5379',
          customClass: {
            confirmButton: 'swal-confirm-button',
          },
        }).then(() => {
          // Set flag in sessionStorage after alert is shown
          sessionStorage.setItem('doctorWelcomeShown', 'true');
        });
      },
      error: (err) => {
        console.error('Error fetching user details:', err);
        // Show fallback welcome alert and set flag
        Swal.fire({
          title: 'Welcome to Our System!',
          text: "Hello, Doctor! We're thrilled to have you manage your patients with us.",
          icon: 'success',
          confirmButtonText: 'Get Started',
          background: '#f8ede3',
          color: '#6c5379',
          confirmButtonColor: '#6c5379',
          customClass: {
            confirmButton: 'swal-confirm-button',
          },
        }).then(() => {
          // Set flag in sessionStorage after alert is shown
          sessionStorage.setItem('doctorWelcomeShown', 'true');
        });
      },
    });
  }

  loadPatients(): void {
    this.isLoadingPatients.set(true);
    this.hasErrorPatients.set(false);
    this.errorMessagePatients.set(null);

    if (this.doctorId) {
      this.adminService
        .getPatientsByDoctor(Number(this.doctorId), 1, 100)
        .subscribe({
          next: (response) => {
            const patients = response.data || [];
            this.allPatients.set(patients);
            this.filteredPatients.set(patients);
            this.totalPatients = patients.length;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            this.newPatients = patients.filter((patient: any) => {
              const createdAt = patient.createdAt
                ? new Date(patient.createdAt)
                : null;
              return createdAt && createdAt >= thirtyDaysAgo;
            }).length;

            this.chartData.datasets[0].data = [
              this.totalPatients,
              this.newPatients,
              this.patientsThisMonth,
              this.appointments,
            ];

            setTimeout(() => this.drawChart(), 0);

            this.safeImageUrlMapPatients = {};
            this.imageLoadFailedMapPatients = {};
            patients.forEach((patient: any) => {
              this.processPatientImage(patient);
            });

            this.onSearchChange();
            this.isLoadingPatients.set(false);
          },
          error: (err) => {
            this.hasErrorPatients.set(true);
            this.errorMessagePatients.set(err.message);
            this.isLoadingPatients.set(false);
          },
        });
    } else {
      this.isLoadingPatients.set(false);
      this.hasErrorPatients.set(true);
      this.errorMessagePatients.set('Doctor ID is missing.');
    }
  }

  private drawChart(): void {
    if (!this.patientChartCanvas || !this.patientChartCanvas.nativeElement) {
      console.error('Canvas element is not available');
      return;
    }

    const canvas = this.patientChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context for canvas');
      return;
    }

    canvas.width = 600;
    canvas.height = 400;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const chartWidth = canvas.width - 60;
    const chartHeight = canvas.height - 60;
    const barWidth = 40;
    const maxDataValue = Math.max(...this.chartData.datasets[0].data, 1);
    const scaleY = chartHeight / maxDataValue;

    ctx.beginPath();
    ctx.strokeStyle = '#6c5379';
    ctx.lineWidth = 2;
    ctx.moveTo(50, 20);
    ctx.lineTo(50, chartHeight + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, chartHeight + 20);
    ctx.lineTo(chartWidth + 50, chartHeight + 20);
    ctx.stroke();

    ctx.fillStyle = '#6c5379';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const yValue = (maxDataValue / yTicks) * i;
      const yPos = chartHeight + 20 - yValue * scaleY;
      ctx.fillText(Math.round(yValue).toString(), 40, yPos + 5);
      ctx.beginPath();
      ctx.moveTo(45, yPos);
      ctx.lineTo(50, yPos);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(20, chartHeight / 2 + 20);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Number of Patients', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    this.chartData.labels.forEach((label, index) => {
      const xPos = 100 + index * 80;
      const barHeight = this.chartData.datasets[0].data[index] * scaleY;

      ctx.fillStyle = this.chartData.datasets[0].backgroundColor[index];
      ctx.strokeStyle = this.chartData.datasets[0].borderColor[index];
      ctx.lineWidth = this.chartData.datasets[0].borderWidth;
      ctx.fillRect(
        xPos - barWidth / 2,
        chartHeight + 20 - barHeight,
        barWidth,
        barHeight
      );
      ctx.strokeRect(
        xPos - barWidth / 2,
        chartHeight + 20 - barHeight,
        barWidth,
        barHeight
      );

      ctx.fillStyle = '#6c5379';
      ctx.fillText(label, xPos, chartHeight + 40);
    });

    ctx.textAlign = 'center';
  }

  private processPatientImage(patient: any): void {
    let imageField = patient.avatar || patient.imageUrl;
    if (imageField) {
      const imageUrl = imageField.startsWith('http')
        ? imageField
        : `${this.baseApiUrl}${
            imageField.startsWith('/') ? '' : '/'
          }${imageField}`;
      this.safeImageUrlMapPatients[patient.id] =
        this.sanitizer.bypassSecurityTrustUrl(imageUrl);
      this.testImageUrl(patient.id, imageUrl);
    } else {
      this.safeImageUrlMapPatients[patient.id] =
        this.sanitizer.bypassSecurityTrustUrl(this.fallbackImageUrl);
      this.imageLoadFailedMapPatients[patient.id] = true;
    }
  }

  private testImageUrl(id: string, url: string): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      this.imageLoadFailedMapPatients[id] = false;
    };
    img.onerror = () => {
      this.imageLoadFailedMapPatients[id] = true;
      this.safeImageUrlMapPatients[id] = this.sanitizer.bypassSecurityTrustUrl(
        this.fallbackImageUrl
      );
    };
  }

  calculateAge(dateOfBirth: string | Date): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  handleImageErrorPatient(id: string): void {
    this.imageLoadFailedMapPatients[id] = true;
    this.safeImageUrlMapPatients[id] = this.sanitizer.bypassSecurityTrustUrl(
      this.fallbackImageUrl
    );
  }

  onSearchChange(): void {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      this.filteredPatients.set([...this.allPatients()]);
      return;
    }
    const filtered = this.allPatients().filter((patient) => {
      const firstName = (patient.firstName || '').toLowerCase();
      const lastName = (patient.lastName || '').toLowerCase();
      const email = (patient.email || '').toLowerCase();
      return (
        firstName.includes(term) ||
        lastName.includes(term) ||
        email.includes(term)
      );
    });
    this.filteredPatients.set(filtered);
  }

  viewPatient(patientId: string): void {
    this.router.navigate([`/patients/${patientId}`]);
  }

  updatePatient(patientId: string): void {
    this.router.navigate([
      `/home/doctor/${this.doctorId}/patient/update/${patientId}`,
    ]);
  }

  async deletePatient(patientId: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to delete this patient? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      this.adminService.deletePatientByDoctor(patientId).subscribe({
        next: () => {
          this.toastr.success('Patient deleted successfully!', 'Success');
          this.loadPatients();
        },
        error: (err) => {
          this.hasErrorPatients.set(true);
          this.errorMessagePatients.set(
            'Failed to delete patient: ' + err.message
          );
          this.toastr.error('Failed to delete patient.', 'Error');
        },
      });
    }
  }
}
