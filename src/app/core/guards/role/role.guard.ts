import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  authService = inject(AuthService);
  router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const expectedRoles = route.data['expectedRoles'] || [
      route.data['expectedRole'],
    ];
    const userRole = this.authService.getRole();
    const userId = this.authService.getUserId();

    console.log('RoleGuard - Navigating to:', state.url);
    console.log('RoleGuard - Expected Roles:', expectedRoles);
    console.log('RoleGuard - User Role:', userRole);
    console.log('RoleGuard - User ID:', userId);
    console.log('RoleGuard - Route ID:', route.paramMap.get('id'));

    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      console.log('RoleGuard - User not logged in, redirecting to /login');
      this.router.navigate(['/login']);
      return false;
    }

    // Check if the user has the correct role
    if (!userRole || !expectedRoles.includes(userRole)) {
      console.log('RoleGuard - Role mismatch, redirecting to /home');
      this.router.navigate(['/home']);
      return false;
    }

    // For profile route, ensure the :role parameter matches the user's role
    const routeRole = route.paramMap.get('role');
    if (
      state.url.startsWith('/profile') &&
      routeRole &&
      routeRole !== userRole
    ) {
      console.log(
        'RoleGuard - Profile route role mismatch, redirecting to /home'
      );
      this.router.navigate(['/home']);
      return false;
    }

    // Check if the user ID in the route matches the logged-in user's ID (skip for admin routes or routes without ID)
    const routeId = route.paramMap.get('id');
    if (routeId && userId !== routeId && userRole !== 'admin') {
      console.log('RoleGuard - ID mismatch, redirecting to /home');
      this.router.navigate(['/home']);
      return false;
    }

    console.log('RoleGuard - Access granted for route:', state.url);
    return true;
  }
}
