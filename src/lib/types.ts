
export interface ConsentForm {
  title: string;
  url: string;
}

export interface ConsentFormCategory {
  category: string;
  forms: ConsentForm[];
}
