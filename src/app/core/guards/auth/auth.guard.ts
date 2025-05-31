import { Injectable, Inject } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    const currentUrl = state.url;
    console.log(
      'AuthGuard - canActivate - URL:',
      currentUrl,
      'isLoggedIn:',
      isLoggedIn
    );

    // Handle public routes
    if (['/', '/login', '/reset-password'].includes(currentUrl)) {
      if (isLoggedIn) {
        console.log(
          'AuthGuard - Authenticated user, redirecting from:',
          currentUrl
        );
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
            console.warn('AuthGuard - Unknown role:', role);
            this.router.navigate(['/home']);
          }
          return false; // Prevent access to public route
        } else {
          console.error('AuthGuard - Role or UserId not set');
          this.authService.logout(); // Clear invalid state and redirect to login
          return false;
        }
      }
      console.log('AuthGuard - Allowing public route:', currentUrl);
      return true; // Allow unauthenticated users to access public routes
    }

    // Handle protected routes
    if (isLoggedIn) {
      console.log(
        'AuthGuard - User authenticated, allowing access to:',
        currentUrl
      );
      return true;
    }

    console.log(
      'AuthGuard - User not authenticated, redirecting to /login from:',
      currentUrl
    );
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: currentUrl },
    });
    return false;
  }
}
