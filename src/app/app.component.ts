import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { FlowbiteService } from './core/services/flowbite/flowbite.service';
import { NavbarComponent } from './layouts/navbar/navbar.component';
import { AuthService } from './core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  currentRoute: string = '';
  isLoggedIn: boolean = false;

  constructor(
    private flowbiteService: FlowbiteService,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        this.isLoggedIn = this.authService.isLoggedIn();

        // Redirect authenticated users from / or /login
        if (this.isLoggedIn && ['/', '/login'].includes(this.currentRoute)) {
          this.redirectToDashboard();
        }
      });
  }

  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {});

    if (isPlatformBrowser(this.platformId)) {
      this.currentRoute = this.router.url;
      this.isLoggedIn = this.authService.isLoggedIn();

      // Redirect authenticated users from / or /login
      if (this.isLoggedIn && ['/', '/login'].includes(this.currentRoute)) {
        this.redirectToDashboard();
      }

      // Log out on tab close
      window.addEventListener('beforeunload', () => {
        if (this.authService.isLoggedIn()) {
          this.authService.logout();
        }
      });
    }
  }

  private redirectToDashboard(): void {
    const role = this.authService.getRole();
    const userId = this.authService.getUserId();
    if (role && userId) {
      if (role === 'admin') {
        this.router.navigate(['/home/admin']);
      } else if (role === 'doctor') {
        this.router.navigate([`/home/doctor/${userId}`]);
      } else if (role === 'patient') {
        this.router.navigate([`/home/patient/${userId}`]);
      } else {
        console.warn('AppComponent - Unknown role:', role);
        this.router.navigate(['/home']);
      }
    } else {
      console.error('AppComponent - Role or UserId not set');
      this.authService.logout();
    }
  }

  showNavbar(): boolean {
    return (
      this.isLoggedIn &&
      !['/', '/login', '/reset-password'].includes(this.currentRoute)
    );
  }
}
