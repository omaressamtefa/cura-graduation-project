import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AuthGuard } from './core/guards/auth/auth.guard';
import { RoleGuard } from './core/guards/role/role.guard';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { LandingComponent } from './pages/landing/landing/landing.component';

export const routes: Routes = [
  // Landing Page (Public Route) - Default route
  { path: '', component: LandingComponent, pathMatch: 'full' },

  // Public Routes
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },

  // Protected Routes (Require Authentication)
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [AuthGuard],
    children: [
      // Admin Dashboard
      {
        path: 'admin',
        loadComponent: () =>
          import('./pages/admindashboard/admindashboard.component').then(
            (m) => m.AdmindashboardComponent
          ),
        canActivate: [RoleGuard],
        data: { expectedRole: 'admin' },
      },
      // Doctor Dashboard
      {
        path: 'doctor/:id',
        canActivate: [RoleGuard],
        data: { expectedRole: 'doctor' },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/doctordashboard/doctordashboard.component').then(
                (m) => m.DoctorDashboardComponent
              ),
          },
          {
            path: 'patient/update/:patientId',
            loadComponent: () =>
              import('./pages/update-patient/update-patient.component').then(
                (m) => m.UpdatePatientComponent
              ),
          },
        ],
      },
      // Patient Dashboard
      {
        path: 'patient/:id',
        loadComponent: () =>
          import('./pages/patientdashboard/patientdashboard.component').then(
            (m) => m.PatientDashboardComponent
          ),
        canActivate: [RoleGuard],
        data: { expectedRole: 'patient' },
      },
      { path: '', redirectTo: '', pathMatch: 'full' },
    ],
  },

  // Profile Route (Accessible to all roles when authenticated)
  {
    path: 'profile/:role/:id',
    component: UserProfileComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['admin', 'doctor', 'patient'] },
  },

  // Admin Routes for Managing Doctors
  {
    path: 'doctors',
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRole: 'admin' },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/alldoctors/alldoctors.component').then(
            (m) => m.AlldoctorsComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/create-doctor/create-doctor.component').then(
            (m) => m.CreateDoctorComponent
          ),
      },
      {
        path: 'update/:id',
        loadComponent: () =>
          import('./pages/update-doctor/update-doctor.component').then(
            (m) => m.UpdateDoctorComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/doctor-details/doctor-details.component').then(
            (m) => m.DoctorDetailsComponent
          ),
      },
    ],
  },

  // Admin Routes for Managing Patients
  {
    path: 'patients',
    canActivate: [AuthGuard, RoleGuard],
    data: { expectedRoles: ['admin', 'doctor'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/allpatients/allpatients.component').then(
            (m) => m.AllpatientsComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./pages/create-patient/create-patient.component').then(
            (m) => m.CreatePatientComponent
          ),
      },
      {
        path: 'update/:patientId',
        loadComponent: () =>
          import('./pages/update-patient/update-patient.component').then(
            (m) => m.UpdatePatientComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/patient-details/patient-details.component').then(
            (m) => m.PatientDetailsComponent
          ),
      },
    ],
  },

  // Wildcard Route for 404
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
