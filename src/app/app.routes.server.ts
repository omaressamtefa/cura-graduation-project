import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic routes - must be rendered on the client
  {
    path: 'doctors/update/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/update/:patientId',
    renderMode: RenderMode.Client,
  },

  {
    path: 'profile/:role/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'home/doctor/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'home/doctor/:id/patient/update/:patientId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'home/patient/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'doctors/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'patients/:id',
    renderMode: RenderMode.Client,
  },

  // Catch-all for static pages
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
