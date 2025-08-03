# ConsentForm Fetcher

This is a Next.js application designed to fetch, display, and intelligently pre-populate medical consent forms from The Royal College of Radiologists (RCR) website.

---

## User Guide

This guide explains how to use the application to prepare a consent form.

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

The application's behavior after you select a form is controlled by a setting on the Configuration page.

-   **If "Preview PDF fields before generating" is ON**:
    -   Once you select a form, its fillable fields will appear in the main content area.
    -   The application will intelligently pre-populate these fields based on the patient and clinician data you entered. The source of the pre-filled data (e.g., "matched with - Patient Full Name") is shown above each field.
    -   Review all fields for accuracy. You can edit any pre-filled information directly on this screen.
    -   When you are satisfied, click the **"Submit & Open PDF"** button. A new browser tab will open with the finalized, filled-in PDF, ready for you to print or save.
-   **If "Preview PDF fields before generating" is OFF**:
    -   When you click a form, the application will immediately generate the filled PDF and open it in a new tab, skipping the preview step.

### 6. Configuration

-   Click the **Settings** icon (⚙️) in the top-right corner to go to the Configuration page.
-   From here, you can manage the application's data sources, settings, and staff list.

-   **Data Source**: You can view and edit the URL from which the application scrapes consent forms. Click **Save Changes** to apply, or **Restore Default** to revert.
-   **Settings**:
    -   **Enable R Number format validation**: When enabled, the application will check that the KOMS patient number entered in the demographics pop-up matches the required format ('R' followed by 7 digits).
    -   **Preview PDF fields before generating**: This switch controls the workflow after selecting a form. If ON, you can review and edit fields before generating the PDF. If OFF, the PDF is generated and opened immediately. Defaults to OFF.
-   **Update Forms**: Click **Check for Updated Forms** to manually trigger a scrape of the currently saved URL to refresh the list of available forms.
-   **Staff Management**: Click **Edit Staff List** to navigate to a separate page where you can add, edit, or remove staff members from the dropdown lists.

---

## Tech Guide

This guide provides a technical overview of the application's architecture and logic for developers.

### 1. Core Architecture

The application is a client-server model built with Next.js. The frontend is a React-based single-page application, and the backend consists of server-side "flows" that handle data processing and interactions with external services.

-   **Frontend**: `src/app/page.tsx` is the main component, managing state for patient data, staff selections, and the selected form. It orchestrates calls to the backend flows. UI components are built with ShadCN.
-   **Backend Flows**: Server-side logic is encapsulated in TypeScript files within `src/ai/flows/`. These handle tasks like scraping, PDF parsing, and PDF filling.

### 2. Data Management and Scraping

-   **Data Source & Configuration**: Application settings, including the RCR URL, are defined in `src/config/app.json`. These settings can be modified by the user via the configuration page UI, which uses an API endpoint at `/api/config` to update the file.
-   **Scraping**: The `scrapeRcrForms` flow (`src/ai/flows/scrape-forms-flow.ts`) is triggered from the `/config` page. It uses `cheerio` to parse the RCR webpage and extract the title and URL of all PDF forms.
-   **Data Storage**: The scraped form data is stored in `public/consent-forms.json`. The application automatically checks if this file is outdated compared to the live website on startup and prompts the user to update if necessary via the `checkForFormUpdates` flow (`src/ai/flows/update-check-flow.ts`).
-   **Staff Data**: Staff members are stored in `src/config/staff.json`. A dedicated UI at `/config/staff` allows for managing this list, which is served via a simple API endpoint at `/api/staff`.

### 3. PDF Interaction and Pre-population Logic

This is the most complex part of the application. A key design principle is that the application **always uses the latest version of a form** by downloading the PDF directly from the RCR website on-demand, rather than using a locally cached copy.

1.  **Workflow Control (`previewPdfFields` config)**: The user's workflow is determined by the `previewPdfFields` setting. The `page.tsx` component fetches this setting and uses it to decide whether to show the preview form or to proceed directly to PDF generation.

2.  **Field Extraction (`src/ai/flows/get-pdf-fields-flow.ts`)**: When a user selects a form, this flow is called. It downloads the PDF from its live URL on the RCR website and uses the `pdf-lib` library to inspect it and extract the names of all fillable fields. It intentionally filters out checkboxes and fields related to signatures or initials to reduce clutter. To handle protected forms from the RCR website, the application instructs `pdf-lib` to ignore encryption when loading the document.

3.  **Intelligent Pre-population (`prePopulateData` in `page.tsx`)**: The application tries to intelligently match and pre-fill the PDF fields using the available patient and staff data.
    -   **Normalization**: It normalizes both the PDF field names and the mapping keys (from the `patientMappings` object) by converting them to lowercase and remove special characters to increase the likelihood of a match.
    -   **Matching Strategy**:
        -   It uses a precise `startsWith` check for keys like 'name', 'date', and 'hospital' to avoid incorrect matches (e.g., to prevent "Name of hospital" from matching the patient's "name").
        -   For most other keys, it checks if the normalized PDF field name *includes* a normalized mapping key.
    -   **Contextual Rules**:
        -   **Clinician Details**: A special rule handles a common pattern where a "Name" field is followed by a "Job Title" field. It correctly populates these with the selected clinician's details.
        -   **Macmillan Contact**: If a field name includes "contact details" or "contact number," it's populated with the selected Macmillan contact's information.

4.  **Final PDF Generation (`src/ai/flows/fill-pdf-flow.ts`)**:
    -   **Trigger**: This is called either by the user clicking "Submit & Open PDF" (in preview mode) or automatically after field extraction (when preview is off).
    -   **Blanking Witness Fields**: Just before generation, the logic explicitly finds the first "Name" field and the first "Date" field that appear after the clinician's job title and blanks them out. This robust, last-minute check prevents patient data from being entered into fields meant for a witness or second signatory.
    -   **Filling**: The `fillPdf` flow uses `pdf-lib` to fill the original PDF with the final data.
    -   **Serving**: The filled PDF is saved to a temporary file in the `/tmp` directory, and its unique ID is returned to the client. The client then opens a new tab pointing to an API route (`/api/filled-pdf/[id]`), which serves the generated PDF for viewing and printing.
