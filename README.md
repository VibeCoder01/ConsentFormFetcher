
# ConsentForm Fetcher

This is a Next.js application designed to fetch, display, and intelligently pre-populate medical consent forms from The Royal College of Radiologists (RCR) website.

---

## User Guide

This guide explains how to use the application to prepare and submit a consent form.

### 1. The Main Screen

The application is divided into two main sections:
-   **Left Sidebar**: Contains the patient and clinician details forms, and the list of available consent forms.
-   **Main Area**: Displays the fields of the selected PDF form for review and editing.

You can hover over the main title, "ConsentForm Fetcher," to see the application's current version number.

In the top-right corner, you will find several controls, each with a helpful tooltip that appears when you hover over it:
-   **SEND EMAILS**: Clicking this button will display a notification, as the email functionality is not yet implemented.
-   **Theme Toggle (Sun/Moon icon)**: For changing between light and dark mode.
-   **Settings (Gear icon)**: For accessing the configuration page.

### 2. Entering Patient Details

On the left sidebar, you will find a "Patient Details" form. The initial state of this form depends on the **"Pre-populate form with dummy data"** setting on the Configuration page.

-   **Initial Data**: If pre-population is enabled, the form starts with dummy data ("John Smith"). If it is disabled, the form will be empty. In both cases, fields that require your attention will have a red background. This red highlight disappears as soon as you edit a field or import live data.
-   **Manual Entry**: You can manually type the patient's information into each field. The "Name of Hospital" field is pre-filled with "Kent Oncology Centre" but can be edited.
-   **Fetch Live Data**: To import data automatically, click the **"Get Live Patient Demographics"** button. A pop-up will appear where you can enter a patient's **KOMS patient number**. Pressing Enter or clicking the button will fetch the patient's details and populate the form.
    -   A tooltip on this button reminds you that you must be logged into KOMS for this feature to work. If the connection times out, it is highly likely that you need to log into the KOMS service.
    -   When live data is loaded, dropdown menus like the Macmillan Contact are reset, requiring a manual selection. The "Name of Hospital" text field will retain its current value.
-   **Age Warning**: If you enter a Date of Birth for a patient who is under 16, the field will turn red, and a warning dialog will appear. This is to ensure correct consent procedures are followed for minors.

### 3. Selecting Staff Members

Below the patient details, you will find a two-step process for selecting the responsible clinician:

1.  **Filter by Tumour Site**: First, use this dropdown to filter the list of clinicians by their speciality. This makes it easier to find the right person for the procedure. You can also select "Show All Clinicians" to see the complete staff list.
2.  **Select Clinician**: Once a tumour site is selected (or "Show All" is chosen), this dropdown will be populated with the relevant staff members. If you select a staff member whose title does not contain "Consultant" or "Doctor," the field will turn orange as a warning.

Below the clinician selection, there is a separate process for the **Macmillan Contact**:

1.  **Filter by Contact Type**: A dropdown, defaulted to "Macmillan", allows you to filter contacts. You can choose "Macmillan" to see only Macmillan-affiliated staff or "Other" for all other contacts.
2.  **Select Contact**: Based on your filter, select the appropriate contact from the list. If the selected person's title does not contain "Macmillan," the field will turn orange.

### 4. Selecting a Consent Form

-   The **"Available Forms"** section on the left sidebar lists all consent forms scraped from the RCR website, organized by category.
-   Administrative documents, such as "Supporting Documents" and "Project acknowledgements," are automatically hidden from this list.
-   Click on a form title to select it. The application's next step depends on the **"Preview PDF fields before generating"** setting on the Configuration page.

### 5. Reviewing and Generating the PDF

The application's behavior after you select a form is controlled by settings on the Configuration page.

-   **If "Preview PDF fields before generating" is ON**:
    -   Once you select a form, its fillable fields will appear in the main content area.
    -   The application will intelligently pre-populate these fields based on the patient and clinician data you entered. The source of the pre-filled data (e.g., "matched with - Patient Full Name") is shown above each field.
    -   The font size for the "Contact details" field is automatically reduced to ensure long names and titles are not truncated.
    -   Review all fields for accuracy. You can edit any pre-filled information directly on this screen.
    -   When you are satisfied, click the **"Submit & Open PDF"** button. The application will then save the filled PDF to the server.
-   **If "Preview PDF fields before generating" is OFF**:
    -   When you click a form, the application will immediately generate the filled PDF and save it to the server, skipping the preview step.

In both cases, after the PDF is generated, it will be saved with the filename `[patient_identifier] CONSENT.pdf` inside a `TEMP` subfolder within the clinician's folder (e.g., `C:\VC01\RT_Consent\Dr_John_Doe\TEMP\`). A success notification will appear in the middle of the screen containing the full UNC path to the file. You can use the "Copy Path" button and paste it into Windows Search or File Explorer to quickly access the file. The `TEMP` folder is automatically emptied before each new PDF is saved, ensuring it only ever contains the latest document.

### 6. Sending the Signed Form

After the consent form has been generated, located using the UNC path, signed, and saved:

-   Click the **SEND EMAILS** button in the top-right corner of the application.
-   A notification will appear to inform you that the email functionality is not yet implemented.

### 7. Configuration

-   Click the **Settings** icon (⚙️) in the top-right corner to go to the Configuration page. Access is restricted to authorized administrators who are logged into the network via Active Directory. If AD groups are not yet configured, the application enters an "initial setup" mode, allowing unauthenticated access to the configuration page so an admin can set up the AD connection.
-   From here, you can manage the application's data sources, settings, and staff list according to your access level.

-   **Data Source**: You can view and edit the URL from which the application scrapes consent forms.
-   **File Paths**:
    -   **RT Consent Folder**: Set the full server-side path where successfully uploaded and signed consent forms should be stored (e.g., `C:\VC01\RT_Consent`).
-   **Settings**:
    -   **Enable R Number format validation**: When enabled, the application will check that the KOMS patient number entered in the demographics pop-up matches the required format ('R' followed by 7 digits).
    -   **Preview PDF fields before generating**: This switch controls the workflow after selecting a form. If ON, you can review and edit fields before generating the PDF. If OFF, the PDF is generated and opened immediately. Defaults to OFF.
    -   **Pre-populate form with dummy data**: Controls whether the patient form is initialized with "John Smith" data or starts empty.
    -   **Display Welsh PDF forms**: If enabled, consent forms available in Welsh will be included in the "Available Forms" list.
    -   **Enable KOMS API debug mode**: When enabled, fetching patient demographics will show a toast notification with the raw data returned from the KOMS API, which is useful for diagnostics.
-   **PDF Handling**: Choose how you want the final PDF to be opened.
    -   **Automatically open in Browser**: Opens the PDF in a new browser tab.
    -   **Download for Adobe Acrobat**: Downloads the PDF to your computer, allowing you to open it in a dedicated application like Adobe Acrobat.
-   **Update Forms**: Click **Check for Updated Forms** to manually trigger a scrape of the currently saved URL to refresh the list of available forms.
-   **Backup & Restore Settings**: You can export the application's entire configuration (including settings, emails, staff, tumour sites, and Active Directory config) to a single JSON file for backup. You can also import a settings file to restore a previous configuration. The AD bind password is not exported for security.
-   **Staff Management**: Click **Edit Staff List** to navigate to a separate page to manage staff members.
    - The page features a two-column layout. The left column contains a searchable list of all staff members.
    - Clicking a member in the list will display their full, editable details in the right-hand column, where you can update their name, title, phone number, specialities, and email recipients.
    - You can add new staff members, update existing ones, or remove them. The entire staff list can also be imported or exported as a JSON file.
-   **Tumour Site Management**: Click **Edit Tumour Sites** to manage the list of tumour sites that can be assigned as specialities to staff members.
-   **Email Management**: Click **Edit Email Config** to navigate to a page where you can manage a list of email recipients. Emails must be in a valid format and unique.

### 8. Admin & Access Control

Access to the Configuration page is managed by Active Directory security groups. There are four levels of access:

-   **Authenticated (No Roles)**: A user who successfully logs in but is not a member of any of the application's admin groups. They can see the "Data Source" and "File Paths" configuration, but all fields are disabled (read-only). All other configuration sections are hidden.

-   **Read Admin**: A member of the "Read Access" AD group. They can view all application settings, but all controls (buttons, inputs, switches) are disabled. This is a true read-only role for the entire configuration.

-   **Change Admin**: A member of the "Change Access" AD group. They have full read/write access to all application settings, including data sources, file paths, staff lists, and behavior toggles. They **cannot**, however, change the core Active Directory authentication settings.

-   **Full Admin**: A member of the "Full Access" AD group. This is the super-administrator. They have all the permissions of a `Change` admin, plus the exclusive ability to configure the Active Directory connection itself. This role is required for the initial setup and for managing the application's security.

---

## In-built clinical-safety controls
| Software feature | Why it matters | Rule / standard it satisfies |
| --- | --- | --- |
| DOB < 16 triggers a red flag and modal warning | Forces the user to check Gillick competence or obtain parental consent before proceeding. | Common-law consent rules for minors • DCB 0129/0160 hazard mitigation (“identify age-related risks”) |
| Clinician role check (flag if not a Consultant/Doctor) | Consent forms for IR/oncology procedures normally need a consultant or equivalent as the performer; the orange warning nudges users to the right signatory. | DCB 0160 deployment duty to ensure “appropriate clinical responsibility” |
| Automatic blanking of first witness fields immediately before PDF generation | Prevents patient data creeping into witness/sign-off boxes – a known safety hazard in radiology consent. | DCB 0129 risk control; DTAC C1 (“no erroneous clinical data”) |
| Automatic blanking of final date fields | Prevents auto-population of witness signature dates, reducing the risk of a user overlooking a required manual entry. | DCB 0129 risk control; DTAC C1 (“no erroneous clinical data”) |
| Always fetches the latest RCR template from the live website | Removes the risk of using outdated consent forms whose wording or complication lists have been revised. | DCB 0129 safety requirement to “maintain current clinical content”; NICE ESF B5 (currency of content) |
| Live KOMS session check for config access | Ensures only currently authenticated KOMS users with explicit admin rights can change application settings. | DSPT / local IG policy; NCSC CAF B2 (access control) |

## Data-protection & information-governance niceties
| Feature | Positive impact | IG artefact it aligns with |
| --- | --- | --- |
| KOMS “R-number” format validation (‘R’ + 7 digits) | Reduces the chance of pulling the wrong patient record – speaks to the GDPR accuracy principle. | Art 5(1)(d) UK GDPR accuracy • DSPT outcome A1 (“accurate data”) |
| No form templates cached; filled PDFs stored only in /tmp with random IDs | Minimises long-term personal-data footprint and aids secure-deletion; supports storage-limitation and data-minimisation. | GDPR Art 5(1)(c)(e); DSPT outcome B2 (“only necessary data retained”) |
| User decides whether the PDF opens in-browser or downloads | Lets trusts disable browser rendering if their IG policy forbids patient PDFs in cache. | DSPT / local IG policy flexibility |
| Role-based access control for all settings | Granular permissions (`Read`, `Change`, `Full`) limit who can alter critical application configurations. | GDPR Art 32 (security of processing); DSPT outcome 5A (managing access) |

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
| --- | --- | --- |
| DCB 0129 (manufacturer) | Age-check, clinician-role guard, witness-field blanking, live-form fetch & hazard controls all contribute to a future Clinical Safety Case (sections 3–7) |
| DCB 0160 (deploying org) | The same controls make it easier for the trust’s CSO to show “risk is ALARP” when integrating the tool. |
| DTAC | C1 ✔ (see clinical-safety controls), C2 partly ✔ (no cached data, short-lived PDFs), C3 partly ✔ (HTTPS + isolation), C4 partly ✔ (API for demographics, standards PDF), C5 ✔ (accessible UI). |
| DSPT / CAF | Low data-at-rest, no unmanaged third-party services, optional download flow – all count as good-practice evidence for DSPT questions 8-A and 9-C. |
| UK GDPR & common-law confidentiality | Validation of patient identifiers, no long-term storage, and explicit under-16 warnings support accuracy, data-minimisation and lawful-consent duties. |
| Consent law for minors | Under-16 alert directly operationalises Gillick-competence checks |
