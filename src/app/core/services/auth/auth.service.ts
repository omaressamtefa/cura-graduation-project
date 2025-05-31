import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  Inject,
  PLATFORM_ID,
  computed,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://cura.runasp.net/api/Auth';
  private forgotPasswordEmail: string | null = null;
  private readonly roleSignal = signal<string | null>(null);
  private readonly userIdSignal = signal<string | null>(null);
  private loggedIn = new BehaviorSubject<boolean>(false);

  readonly role = computed(() => this.roleSignal());
  readonly userId = computed(() => this.userIdSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const savedRole = localStorage.getItem('role');
      const savedUserId = localStorage.getItem('userId');
      const isLoggedIn = !!(token && savedRole && savedUserId);

      console.log(
        'AuthService - Initializing state - token:',
        !!token,
        'role:',
        savedRole,
        'userId:',
        savedUserId,
        'isLoggedIn:',
        isLoggedIn
      );

      this.loggedIn.next(isLoggedIn);
      this.roleSignal.set(savedRole);
      this.userIdSignal.set(savedUserId);

      // Prevent redirect on startup if on a public route
      if (!isLoggedIn && this.router.url === '/') {
        console.log('AuthService - On landing page, no redirect needed');
        return;
      }
    }
  }
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res: any) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('role', res.role);
          localStorage.setItem('userId', res.userId.toString());
          localStorage.setItem('isAdmin', res.isAdmin.toString());
          this.roleSignal.set(res.role);
          this.userIdSignal.set(res.userId.toString());
          this.loggedIn.next(true);
          console.log('AuthService - After login - Role:', this.role());
          console.log('AuthService - After login - UserId:', this.userId());
          console.log(
            'AuthService - After login - isLoggedIn:',
            this.loggedIn.getValue()
          );
        }
      })
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
    this.roleSignal.set(null);
    this.userIdSignal.set(null);
    this.loggedIn.next(false);
    this.forgotPasswordEmail = null;
    console.log(
      'AuthService - After logout - isLoggedIn:',
      this.loggedIn.getValue()
    );
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const userId = localStorage.getItem('userId');
      const isLoggedIn = !!(token && role && userId);
      this.loggedIn.next(isLoggedIn);
      console.log(
        'AuthService - isLoggedIn - token:',
        !!token,
        'role:',
        role,
        'userId:',
        userId,
        'isLoggedIn:',
        isLoggedIn
      );
      return isLoggedIn;
    }
    return false;
  }

  getRole(): string | null {
    const role = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('role')
      : null;
    console.log('AuthService - getRole:', role);
    return role;
  }

  getUserId(): string | null {
    const userId = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('userId')
      : null;
    console.log('AuthService - getUserId:', userId);
    return userId;
  }

  getToken(): string | null {
    const token = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('token')
      : null;
    console.log('AuthService - getToken:', !!token);
    return token;
  }

  getIsAdmin(): boolean {
    const isAdmin = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('isAdmin') === 'true'
      : false;
    console.log('AuthService - getIsAdmin:', isAdmin);
    return isAdmin;
  }

  requestPasswordReset(email: string): Observable<any> {
    this.forgotPasswordEmail = email;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('forgotPasswordEmail', email);
    }
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(
    email: string,
    resetCode: string,
    newPassword: string
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, {
      email,
      resetCode,
      newPassword,
    });
  }

  getForgotPasswordEmail(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      this.forgotPasswordEmail = localStorage.getItem('forgotPasswordEmail');
    }
    return this.forgotPasswordEmail;
  }

  clearForgotPasswordEmail(): void {
    this.forgotPasswordEmail = null;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('forgotPasswordEmail');
    }
  }

  // Method to handle token expiration or invalidation
  handleUnauthorized(): void {
    console.log('AuthService - Handling unauthorized access, logging out');
    this.logout();
  }
}
