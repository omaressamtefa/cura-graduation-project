import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private baseUrl = 'https://cura.runasp.net/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getAuthHeaders(
    includeContentType: boolean = true,
    contentType: string = 'application/json'
  ): HttpHeaders {
    let headers = new HttpHeaders();
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token is missing. Requests will fail.');
        throw new Error('Authentication token is missing.');
      }
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn(
        'Running on server-side; authentication token not available.'
      );
      throw new Error('Cannot make authenticated requests from server-side.');
    }
    if (includeContentType && contentType !== 'multipart/form-data') {
      headers = headers.set('Content-Type', contentType);
    }
    return headers;
  }

  getAllDoctors(
    pageNumber: number = 1,
    pageSize: number = 5,
    searchTerm: string = ''
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http
      .get<any>(`${this.baseUrl}/User/doctors`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(
        map((response) => {
          console.log(
            'Raw API Response for Doctors:',
            JSON.stringify(response, null, 2)
          );
          return response;
        }),
        catchError((error) => {
          console.error('Error fetching doctors:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(() => new Error('Forbidden: Admins only.'));
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch doctors: ' + (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  getDoctorById(doctorId: string): Observable<any> {
    let params = new HttpParams().set('pageNumber', '1').set('pageSize', '100');

    return this.http
      .get<any>(`${this.baseUrl}/User/doctors`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(
        map((response) => {
          console.log('Raw API Response (Doctors List):', response);
          const doctor = response.data.find(
            (d: any) => String(d.id) === String(doctorId)
          );
          if (!doctor) {
            throw new Error(`Doctor with ID ${doctorId} not found.`);
          }
          console.log('Filtered Doctor:', doctor);
          return { data: doctor };
        }),
        catchError((error) => {
          console.error('Error fetching doctor by ID:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(() => new Error('Forbidden: Admins only.'));
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch doctor by ID: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  getAllPatients(
    pageNumber: number = 1,
    pageSize: number = 5,
    searchTerm: string = ''
  ): Observable<any> {
    const role = this.authService.getRole();
    const userId = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('userId')
      : null;

    if (role === 'doctor' && userId) {
      return this.getPatientsByDoctor(
        Number(userId),
        pageNumber,
        pageSize,
        searchTerm
      );
    } else if (role === 'admin') {
      let params = new HttpParams()
        .set('pageNumber', pageNumber.toString())
        .set('pageSize', pageSize.toString());
      if (searchTerm) {
        params = params.set('searchTerm', searchTerm);
      }

      return this.http
        .get<any>(`${this.baseUrl}/User/patients`, {
          headers: this.getAuthHeaders(),
          params,
        })
        .pipe(
          map((response) => {
            console.log(
              'Raw API Response (Admin Role - All Patients):',
              JSON.stringify(response, null, 2)
            );
            response.data = response.data.map((patient: any) => ({
              ...patient,
              department: patient.department || [],
            }));
            return response;
          }),
          catchError((error) => {
            console.error('Error fetching patients:', error);
            if (error.status === 401) {
              this.authService.handleUnauthorized();
              return throwError(
                () => new Error('Unauthorized: Please log in again.')
              );
            }
            if (error.status === 403) {
              return throwError(() => new Error('Forbidden: Admins only.'));
            }
            return throwError(
              () =>
                new Error(
                  'Failed to fetch patients: ' +
                    (error.message || 'Unknown error')
                )
            );
          })
        );
    } else {
      return throwError(
        () => new Error('Unauthorized access to patient data.')
      );
    }
  }

  getPatientsByDoctor(
    doctorId: number,
    pageNumber: number = 1,
    pageSize: number = 50,
    searchTerm: string = ''
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http
      .get<any>(`${this.baseUrl}/User/patients/doctor/${doctorId}`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(
        map((response) => {
          console.log(
            'Raw API Response (Doctor Role - Patients By Doctor):',
            response
          );
          response.data = response.data.map((patient: any) => ({
            ...patient,
            department: patient.department || [],
          }));
          return response;
        }),
        catchError((error) => {
          console.error('Error fetching patients by doctor:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () =>
                new Error(
                  "Forbidden: You are not authorized to access this doctor's patients."
                )
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch patients by doctor: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  getPatientById(patientId: string): Observable<any> {
    const role = this.authService.getRole();
    const userId = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('userId')
      : null;

    if (role === 'doctor' && userId) {
      return this.getPatientsByDoctor(Number(userId)).pipe(
        map((response) => {
          console.log('Raw API Response (Doctor Role):', response);
          const patient = response.data.find(
            (p: any) => String(p.id) === String(patientId)
          );
          if (!patient) {
            throw new Error(
              `Patient with ID ${patientId} not found for this doctor.`
            );
          }
          console.log('Filtered Patient (Doctor Role):', patient);
          return { data: patient };
        }),
        catchError((error) => {
          console.error('Error fetching patient by ID for doctor:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () =>
                new Error(
                  'Forbidden: You are not authorized to access this patient.'
                )
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch patient by ID: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
    } else if (role === 'admin') {
      let params = new HttpParams()
        .set('pageNumber', '1')
        .set('pageSize', '100');

      return this.http
        .get<any>(`${this.baseUrl}/User/patients`, {
          headers: this.getAuthHeaders(),
          params,
        })
        .pipe(
          map((response) => {
            console.log('Raw API Response (Admin Role):', response);
            const patient = response.data.find(
              (p: any) => String(p.id) === String(patientId)
            );
            if (!patient) {
              throw new Error(`Patient with ID ${patientId} not found.`);
            }
            console.log('Filtered Patient (Admin Role):', patient);
            return { data: patient };
          }),
          catchError((error) => {
            console.error('Error fetching patient by ID for admin:', error);
            if (error.status === 401) {
              this.authService.handleUnauthorized();
              return throwError(
                () => new Error('Unauthorized: Please log in again.')
              );
            }
            if (error.status === 403) {
              return throwError(() => new Error('Forbidden: Admins only.'));
            }
            return throwError(
              () =>
                new Error(
                  'Failed to fetch patient by ID: ' +
                    (error.message || 'Unknown error')
                )
            );
          })
        );
    } else if (role === 'patient' && userId) {
      if (String(userId) !== String(patientId)) {
        return throwError(
          () => new Error('Unauthorized: You can only access your own profile.')
        );
      }

      return this.getUserDetails().pipe(
        map((response) => {
          console.log('Raw API Response (Patient Role):', response);
          const patient = response.user;
          if (!patient || String(patient.id) !== String(patientId)) {
            throw new Error(`Patient with ID ${patientId} not found.`);
          }
          console.log('Filtered Patient (Patient Role):', patient);
          return { data: patient };
        }),
        catchError((error) => {
          console.error('Error fetching patient by ID for patient:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () =>
                new Error(
                  'Forbidden: You are not authorized to access this patient.'
                )
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch patient by ID: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
    } else {
      return throwError(
        () => new Error('Unauthorized access to patient data.')
      );
    }
  }

  getDoctorDepartment(doctorId: string): Observable<any> {
    return this.getPatientsByDoctor(Number(doctorId), 1, 50).pipe(
      map((response) => {
        console.log('Raw Patients Response for Doctor:', response);
        return { data: response.data };
      }),
      catchError((error) => {
        console.error('Error fetching doctor department:', error);
        if (error.status === 401) {
          this.authService.handleUnauthorized();
          return throwError(
            () => new Error('Unauthorized: Please log in again.')
          );
        }
        if (error.status === 403) {
          return throwError(
            () =>
              new Error(
                "Forbidden: You are not authorized to access this doctor's patients."
              )
          );
        }
        return throwError(
          () =>
            new Error(
              'Failed to fetch doctor department: ' +
                (error.message || 'Unknown error')
            )
        );
      })
    );
  }

  getUserDetails(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/User/details`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error fetching user details:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () => new Error('Forbidden: Insufficient permissions.')
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch user details: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  getDoctorPatients(doctorId: string): Observable<any[]> {
    let params = new HttpParams().set('pageNumber', '1').set('pageSize', '100');

    return this.http
      .get<any>(`${this.baseUrl}/User/patients/doctor/${doctorId}`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(
        map((response) => {
          console.log('Raw API Response (Doctor Patients):', response);
          if (!response || !response.data) {
            throw new Error('No patients found for this doctor.');
          }
          return response.data;
        }),
        catchError((error) => {
          console.error('Error fetching doctor patients:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () =>
                new Error(
                  "Forbidden: You are not authorized to access this doctor's patients."
                )
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to fetch doctor patients: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  deleteDoctor(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/update/doctor/${id}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error deleting doctor:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(() => new Error('Forbidden: Admins only.'));
          }
          if (error.status === 404) {
            return throwError(
              () => new Error(`Doctor with ID ${id} not found.`)
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to delete doctor: ' + (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  createDoctor(doctorData: FormData): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/Auth/doctor/register`, doctorData, {
        headers: this.getAuthHeaders(false), // Do not set Content-Type for FormData
      })
      .pipe(
        map((response) => {
          console.log('Doctor creation response:', response);
          if (response.data && response.data.imageUrl) {
            console.log('Uploaded image URL:', response.data.imageUrl);
          } else {
            console.warn('No image URL returned in response.');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error creating doctor:', error);
          if (error.status === 400) {
            return throwError(
              () => new Error(error.error.message || 'Invalid doctor data.')
            );
          }
          if (error.status === 413) {
            return throwError(
              () => new Error('Image file too large. Maximum size is 5MB.')
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to create doctor: ' + (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  updateDoctor(id: string, doctorData: FormData): Observable<any> {
    return this.http
      .put<any>(`${this.baseUrl}/update/doctor/${id}`, doctorData, {
        headers: this.getAuthHeaders(false), // Do not set Content-Type for FormData
      })
      .pipe(
        map((response) => {
          console.log('Doctor update response:', response);
          if (response.data && response.data.imageUrl) {
            console.log('Uploaded image URL:', response.data.imageUrl);
          } else {
            console.warn('No image URL returned in response.');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error updating doctor:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(() => new Error('Forbidden: Admins only.'));
          }
          if (error.status === 404) {
            return throwError(
              () => new Error(`Doctor with ID ${id} not found.`)
            );
          }
          if (error.status === 413) {
            return throwError(
              () => new Error('Image file too large. Maximum size is 5MB.')
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to update doctor: ' + (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  deletePatient(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/update/patient/${id}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error deleting patient:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(() => new Error('Forbidden: Admins only.'));
          }
          if (error.status === 404) {
            return throwError(
              () => new Error(`Patient with ID ${id} not found.`)
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to delete patient: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  deletePatientByDoctor(patientId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/update/patient/doctor/${patientId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Error deleting patient by doctor:', error);
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () =>
                new Error(
                  'Forbidden: You are not authorized to delete this patient.'
                )
            );
          }
          if (error.status === 404) {
            return throwError(
              () => new Error(`Patient with ID ${patientId} not found.`)
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to delete patient by doctor: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  createPatient(patientData: FormData): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/Auth/patient/register`, patientData, {
        headers: this.getAuthHeaders(false), // Do not set Content-Type for FormData
      })
      .pipe(
        catchError((error) => {
          console.error('Error creating patient:', error);
          if (error.status === 400) {
            return throwError(
              () => new Error(error.error.message || 'Invalid patient data.')
            );
          }
          if (error.status === 404) {
            return throwError(
              () => new Error('Doctor not found for the provided DoctorId.')
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to create patient: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  updatePatient(id: string, patientData: FormData): Observable<any> {
    console.log('Sending updatePatient request with FormData:');
    for (const pair of patientData.entries()) {
      console.log(
        `${pair[0]}: ${pair[1] instanceof File ? pair[1].name : pair[1]}`
      );
    }

    return this.http
      .put<any>(`${this.baseUrl}/update/patient/${id}`, patientData, {
        headers: this.getAuthHeaders(false), // Do not set Content-Type for FormData
      })
      .pipe(
        map((response) => {
          console.log('Patient update response:', response);
          return response;
        }),
        catchError((error) => {
          console.error('Error updating patient:', error);
          if (error.error && typeof error.error === 'object') {
            console.error('Detailed error response:', error.error);
          }
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(() => new Error('Forbidden: Admins only.'));
          }
          if (error.status === 404) {
            return throwError(
              () => new Error(`Patient with ID ${id} not found.`)
            );
          }
          if (error.status === 400) {
            const errorMsg = error.error?.message || 'Invalid request data';
            console.error('Validation error details:', error.error);
            return throwError(
              () => new Error(`Failed to update patient: ${errorMsg}`)
            );
          }
          if (error.status === 413) {
            return throwError(
              () => new Error('Image file too large. Maximum size is 5MB.')
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to update patient: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }

  updatePatientByDoctor(
    patientId: string,
    patientData: FormData
  ): Observable<any> {
    console.log('Sending updatePatientByDoctor request with FormData:');
    for (const pair of patientData.entries()) {
      console.log(
        `${pair[0]}: ${pair[1] instanceof File ? pair[1].name : pair[1]}`
      );
    }

    return this.http
      .put<any>(
        `${this.baseUrl}/update/patient/doctor/${patientId}`,
        patientData,
        {
          headers: this.getAuthHeaders(false),
        }
      )
      .pipe(
        map((response) => {
          console.log('Patient update by doctor response:', response);
          return response;
        }),
        catchError((error) => {
          console.error('Error updating patient by doctor:', error);
          if (error.error && typeof error.error === 'object') {
            console.error('Detailed error response:', error.error);
          }
          if (error.status === 401) {
            this.authService.handleUnauthorized();
            return throwError(
              () => new Error('Unauthorized: Please log in again.')
            );
          }
          if (error.status === 403) {
            return throwError(
              () =>
                new Error(
                  'Forbidden: You are not authorized to update this patient.'
                )
            );
          }
          if (error.status === 404) {
            return throwError(
              () => new Error(`Patient with ID ${patientId} not found.`)
            );
          }
          if (error.status === 400) {
            return throwError(
              () =>
                new Error(
                  `Failed to update patient by doctor: ${
                    error.error?.message || 'Invalid request data'
                  }`
                )
            );
          }
          return throwError(
            () =>
              new Error(
                'Failed to update patient by doctor: ' +
                  (error.message || 'Unknown error')
              )
          );
        })
      );
  }
}
