

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
    macmillanContactId: string | null;
}

export interface StaffMember {
    id: string;
    name: string;
    title: string;
    phone: string;
    speciality1?: string | null;
    speciality2?: string | null;
    speciality3?: string | null;
    emailRecipients: string;
}

export interface KomsResponse {
    fullName: string;
    rNumber: string;
    dob: string;
    user: string;
    fetched: string;
    forename?: string;
    surname?: string;
    addr1?: string;
    addr2?: string;
    addr3?: string;
    postcode?: string;
    homePhone?: string;
    gpName?: string;
    nhsNumber?: string;
    hospitalNumber?: string;
    hospitalNumberMTW?: string;
}

export interface EmailContact {
    id: string;
    email: string;
}

export interface TumourSite {
    id: string;
    name: string;
}

export interface TumourGroup {
    id:string;
    name: string;
}

export type AccessLevel = 'read' | 'change' | 'full';

export interface AdminUser {
    username: string;
    access: AccessLevel;
}

export interface ADConfig {
    url: string;
    baseDN: string;
    bindDN: string;
    bindPassword?: string;
    caFile?: string;
    groupDNs: {
        read: string;
        change: string;
        full: string;
    };
}
