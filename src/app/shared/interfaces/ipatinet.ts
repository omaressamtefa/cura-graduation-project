export interface TreatmentHistory {
  diagnosis: string;
  treatment: string;
  doctorId: number;
  doctorFirstName: string;
  doctorLastName: string;
}

export interface Ipatient {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  email: string;
  imageUrl?: string;
  createdAt: string;
  department: TreatmentHistory[];
}
