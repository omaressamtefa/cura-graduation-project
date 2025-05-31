import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin/admin.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patientdashboard.component.html',
  styleUrls: ['./patientdashboard.component.scss'],
})
export class PatientDashboardComponent implements OnInit {
  userName: string = 'Unknown';
  userImage: SafeUrl | string = 'https://via.placeholder.com/80';
  userEmail: string | null = null;
  userRole: string | null = null;
  userId: string | null = null;
  age: number | null = null;
  bloodType: string | null = null;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  imageLoadFailed: boolean = false;
  private readonly baseApiUrl = 'https://cura.runasp.net';
  private readonly fallbackImageUrl = '/assets/images/default-user.jpg';
  private sanitizer: DomSanitizer;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService,
    sanitizer: DomSanitizer
  ) {
    this.sanitizer = sanitizer;
  }

  ngOnInit(): void {
    this.fetchUserDetails();
  }

  calculateAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date('2025-05-26'); // Current date as per system
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      return age - 1;
    }
    return age;
  }

  fetchUserDetails(): void {
    this.isLoading = true;
    this.hasError = false;

    this.adminService.getUserDetails().subscribe({
      next: (response: any) => {
        const user = response?.user || null;
        this.isLoading = false;
        if (user) {
          this.userName =
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            'Unknown';
          this.userEmail = user.email || null;
          this.userRole = this.authService.getRole();
          this.userId = user.id || null;
          this.bloodType = user.bloodType || null;
          this.age = this.calculateAge(user.birthDate);

          // Handle image URL
          if (user.imageUrl) {
            const imageUrl = user.imageUrl.startsWith('http')
              ? user.imageUrl
              : `${this.baseApiUrl}${user.imageUrl.startsWith('/') ? '' : '/'}${
                  user.imageUrl
                }`;
            this.setSafeImageUrl(imageUrl);
            this.testImageUrl(imageUrl);
          } else {
            this.setSafeImageUrl(this.fallbackImageUrl);
            this.imageLoadFailed = true;
          }

          this.showWelcomeAlert();
        } else {
          this.hasError = true;
          this.errorMessage = 'Profile not found.';
        }
      },
      error: (error: any) => {
        this.hasError = true;
        this.errorMessage = 'Failed to load your profile. Please try again.';
        this.isLoading = false;
        console.error('Error fetching user details:', error);
      },
    });
  }

  setSafeImageUrl(url: string | null): void {
    this.userImage = url
      ? this.sanitizer.bypassSecurityTrustUrl(url)
      : 'https://via.placeholder.com/80';
  }

  private testImageUrl(url: string): void {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      this.imageLoadFailed = false;
    };
    img.onerror = () => {
      this.imageLoadFailed = true;
      this.setSafeImageUrl(this.fallbackImageUrl);
    };
  }

  showWelcomeAlert(): void {
    Swal.fire({
      title: `Welcome to Our Website, Mr. ${this.userName}`,
      text: 'At CuRa, we are committed to providing high-quality healthcare while ensuring that every patient receives personalized and efficient medical care. Our comprehensive Medical History System allows patients and healthcare providers to access, manage, and update critical health records securely and conveniently.',
      icon: 'success',
      confirmButtonColor: '#14b8a6',
      confirmButtonText: 'Explore Now',
      showCancelButton: true,
      cancelButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed && this.userRole && this.userId) {
        this.router.navigate([`/profile/${this.userRole}/${this.userId}`]);
      }
    });
  }
}
