export interface Iuser {
  id: number;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  isAdmin: boolean;
  token: string;
}
