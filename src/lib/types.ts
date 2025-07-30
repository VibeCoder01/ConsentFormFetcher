
export interface ConsentForm {
  title: string;
  url: string;
}

export interface ConsentFormCategory {
  category: string;
  forms: ConsentForm[];
}

export interface PatientData {
    firstName: string;
    lastName: string;
    dob: string;
    hospitalNumber: string;
}
