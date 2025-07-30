
export interface ConsentForm {
  title: string;
  url: string;
}

export interface ConsentFormCategory {
  category: string;
  forms: ConsentForm[];
}

export type IdentifierType = 'rNumber' | 'nhsNumber' | 'hospitalNumber' | 'hospitalNumberMTW';

export interface PatientData {
    surname: string;
    forename: string;
    dob: string;
    addr1: string;
    addr2: string;
    addr3: string;
    postcode: string;
    fullAddress: string;
    homePhone: string;
    gpName: string;
    hospitalName: string;
    rNumber: string;
    nhsNumber: string;
    hospitalNumber: string;
    hospitalNumberMTW: string;
    selectedIdentifier: IdentifierType;
    uniqueIdentifierValue: string;
}
