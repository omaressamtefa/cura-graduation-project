import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth/auth.service';
import { AdminService } from '../../core/services/admin/admin.service';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterOutlet],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  role: string | null = null;
  userId: string | null = null;
  totalDoctors: number = 0;
  totalDoctorsChange: number = 0;
  totalPatients: number = 0;
  totalPatientsChange: number = 0;

  constructor(
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.userId = localStorage.getItem('userId');
    }
    this.role = this.authService.getRole();

    if (!this.role || !this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.role === 'admin') {
      this.fetchSummaryData();
    } else {
      this.totalDoctors = 0;
      this.totalPatients = 0;
    }
  }

  fetchSummaryData(): void {
    this.adminService.getAllDoctors(1, 1000).subscribe({
      next: (response) => {
        this.totalDoctors = response.data.length;
        this.totalDoctorsChange = 5; // Example: +5%
      },
      error: (error) => {
        console.error('Error fetching doctors:', error);
      },
    });

    this.adminService.getAllPatients(1, 1000).subscribe({
      next: (response) => {
        this.totalPatients = response.data.length;
        this.totalPatientsChange = 3; // Example: +3%
      },
      error: (error) => {
        console.error('Error fetching patients:', error);
      },
    });
  }
}
