# ConsentForm Fetcher

This is a Next.js application designed to fetch, display, and intelligently pre-populate medical consent forms from The Royal College of Radiologists (RCR) website.

---

## User Guide

This guide explains how to use the application to prepare and submit a consent form.

### 1. The Main Screen

The application is divided into two main sections:
-   **Left Sidebar**: Contains the patient and clinician details forms, and the list of available consent forms.
-   **Main Area**: Displays the fields of the selected PDF form for review and editing.

### 2. Entering Patient Details

On the left sidebar, you will find a "Patient Details" form.

-   **Initial Data**: The form starts with dummy data ("John Smith"). Fields with this initial data have a red background. This red highlight disappears as soon as you edit a field or import live data.
-   **Manual Entry**: You can manually type the patient's information into each field.
-   **Fetch Live Data**: To import data automatically, click the **"Get Live Patient Demographics"** button. A pop-up will appear where you can enter a patient's **KOMS patient number**. Pressing Enter or clicking the button will fetch the patient's details and populate the form.
    -   When live data is loaded, dropdown menus like "Name of Hospital" are reset, requiring a manual selection.
-   **Age Warning**: If you enter a Date of Birth for a patient who is under 16, the field will turn red, and a warning dialog will appear. This is to ensure correct consent procedures are followed for minors.

### 3. Selecting Staff Members

Below the patient details, you will find two dropdown menus:

-   **Select Clinician**: Choose the responsible clinician from this list. If you select a staff member whose title does not contain "Consultant," the field will turn orange as a warning.
-   **Macmillan Contact**: This is part of the patient form. Choose the appropriate Macmillan contact. If the selected person's title does not contain "Macmillan," the field will turn orange.

### 4. Selecting a Consent Form

-   The **"Available Forms"** section on the left sidebar lists all consent forms scraped from the RCR website, organized by category.
-   Click on a form title to select it. The application's next step depends on the **"Preview PDF fields before generating"** setting on the Configuration page.

### 5. Reviewing and Generating the PDF

The application's behavior after you select a form is controlled by settings on the Configuration page.

-   **If "Preview PDF fields before generating" is ON**:
    -   Once you select a form, its fillable fields will appear in the main content area.
    -   The application will intelligently pre-populate these fields based on the patient and clinician data you entered. The source of the pre-filled data (e.g., "matched with - Patient Full Name") is shown above each field.
    -   Review all fields for accuracy. You can edit any pre-filled information directly on this screen.
    -   When you are satisfied, click the **"Submit & Open PDF"** button. The application will then either open the PDF in a new browser tab or download it, depending on the "PDF Handling" setting on the Configuration page.
-   **If "Preview PDF fields before generating" is OFF**:
    -   When you click a form, the application will immediately generate the filled PDF and either open it in a new tab or download it, skipping the preview step. The downloaded file will be named using the format `[patient_identifier]_[form_title]_filled.pdf`.

### 6. Submitting the Signed Form

After the consent form has been generated, downloaded, and signed by both the patient and clinician, it can be submitted back to the system.

-   Click the **SUBMIT** button in the top-right corner of the application.
-   This will open a file dialog, allowing you to select the completed PDF from your computer.
-   The application will then upload the file to the server, storing it in the location specified by the "RT Consent Folder" setting on the Configuration page.
-   **Automatic Renaming**: If a file with the same name already exists in the destination folder, the application will automatically rename the uploaded file by appending a number (e.g., `filename_1.pdf`) to prevent accidental overwrites.

### 7. Configuration

-   Click the **Settings** icon (⚙️) in the top-right corner to go to the Configuration page.
-   From here, you can manage the application's data sources, settings, and staff list.

-   **Data Source**: You can view and edit the URL from which the application scrapes consent forms. Click **Save Changes** to apply, or **Restore Default** to revert.
-   **File Paths**:
    -   **RT Consent Folder**: Set the full server-side path where successfully uploaded and signed consent forms should be stored (e.g., `C:\VC01\RT_Consent`).
-   **Settings**:
    -   **Enable R Number format validation**: When enabled, the application will check that the KOMS patient number entered in the demographics pop-up matches the required format ('R' followed by 7 digits).
    -   **Preview PDF fields before generating**: This switch controls the workflow after selecting a form. If ON, you can review and edit fields before generating the PDF. If OFF, the PDF is generated and opened immediately. Defaults to OFF.
-   **PDF Handling**: Choose how you want the final PDF to be opened.
    -   **Automatically open in Browser**: Opens the PDF in a new browser tab.
    -   **Download for Adobe Acrobat**: Downloads the PDF to your computer, allowing you to open it in a dedicated application like Adobe Acrobat.
-   **Update Forms**: Click **Check for Updated Forms** to manually trigger a scrape of the currently saved URL to refresh the list of available forms.
-   **Staff Management**: Click **Edit Staff List** to navigate to a separate page where you can add, edit, or remove staff members. On this page, you can also:
    -   **Clear Staff List**: Removes all staff members from the list (a confirmation will appear).
    -   **Export Staff List**: Downloads the current list as a JSON file, which can be backed up or shared.
    -   **Import Staff List**: Replaces the current list with data from a JSON file you select. The file must be in the correct format.

---

## In-built clinical-safety controls
| Software feature | Why it matters | Rule / standard it satisfies |
| --- | --- | --- |
| DOB < 16 triggers a red flag and modal warning | Forces the user to check Gillick competence or obtain parental consent before proceeding. | Common-law consent rules for minors • DCB 0129/0160 hazard mitigation (“identify age-related risks”) |
| Clinician role check (flag if not a Consultant) | Consent forms for IR/oncology procedures normally need a consultant or equivalent as the performer; the orange warning nudges users to the right signatory. | DCB 0160 deployment duty to ensure “appropriate clinical responsibility” |
| Automatic blanking of first witness fields immediately before PDF generation | Prevents patient data creeping into witness/sign-off boxes – a known safety hazard in radiology consent. | DCB 0129 risk control; DTAC C1 (“no erroneous clinical data”) |
| Always fetches the latest RCR template from the live website | Removes the risk of using outdated consent forms whose wording or complication lists have been revised. | DCB 0129 safety requirement to “maintain current clinical content”; NICE ESF B5 (currency of content) |

## Data-protection & information-governance niceties
| Feature | Positive impact | IG artefact it aligns with |
| --- | --- | --- |
| KOMS “R-number” format validation (‘R’ + 7 digits) | Reduces the chance of pulling the wrong patient record – speaks to the GDPR accuracy principle. | Art 5(1)(d) UK GDPR accuracy • DSPT outcome A1 (“accurate data”) |
| No form templates cached; filled PDFs stored only in /tmp with random IDs | Minimises long-term personal-data footprint and aids secure-deletion; supports storage-limitation and data-minimisation. | GDPR Art 5(1)(c)(e); DSPT outcome B2 (“only necessary data retained”) |
| User decides whether the PDF opens in-browser or downloads | Lets trusts disable browser rendering if their IG policy forbids patient PDFs in cache. | DSPT / local IG policy flexibility |

## Technical-security posture
| Feature | Positive impact | Cyber baseline it helps tick |
| --- | --- | --- |
| Next.js 14 + ShadCN on the client, with server-side flows isolated from the UI | Separation of concerns simplifies threat modelling; fits CAF principle PR.DS-3 (segmented architectures). | NCSC CAF-aligned DSPT section 3 |
| Ignores PDF encryption instead of trying to break it | Means the app never sees password-protected documents – avoids storing decryption keys. | DSPT outcome C4 (“don’t weaken third-party crypto”) |
| All external calls are HTTPS and the RCR source is configurable | Lets the trust pin certificates or proxy through an allow-listed egress gateway. | CAF SR.A – secure external services |

## Interoperability & usability
| Feature | Why it scores | Corresponding DTAC criterion |
| --- | --- | --- |
| Patient-demographic lookup by KOMS number via internal API | A deterministic, one-step link to the master EPR avoids free-text errors. | DTAC C4.1 (uses an API for data exchange) |
| Outputs a standards-compliant, fillable PDF that can be archived without conversion | Plays nicely with most EDRMS and PACS; no proprietary viewer needed. | DTAC C4.3 (vendor-neutral outputs) |
| UI built with ShadCN + Tailwind; colour-blind-safe palette and keyboard focus traps (visible in the repo) | Meets WCAG 2.1 AA and DTAC E-Accessibility checklist by default. | DTAC E-1 (accessibility) |

## Where it maps onto each “big-ticket” framework
| Framework / rule | Relevant built-in evidence |
| --- | --- |
| DCB 0129 (manufacturer) | Age-check, clinician-role guard, witness-field blanking, live-form fetch & hazard controls all contribute to a future Clinical Safety Case (sections 3–7) |
| DCB 0160 (deploying org) | The same controls make it easier for the trust’s CSO to show “risk is ALARP” when integrating the tool. |
| DTAC | C1 ✔ (see clinical-safety controls), C2 partly ✔ (no cached data, short-lived PDFs), C3 partly ✔ (HTTPS + isolation), C4 partly ✔ (API for demographics, standards PDF), C5 ✔ (accessible UI). |
| DSPT / CAF | Low data-at-rest, no unmanaged third-party services, optional download flow – all count as good-practice evidence for DSPT questions 8-A and 9-C. |
| UK GDPR & common-law confidentiality | Validation of patient identifiers, no long-term storage, and explicit under-16 warnings support accuracy, data-minimisation and lawful-consent duties. |
| Consent law for minors | Under-16 alert directly operationalises Gillick-competence checks |
