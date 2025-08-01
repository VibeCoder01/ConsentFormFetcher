# ConsentForm Fetcher

This is a Next.js application designed to fetch, display, and pre-populate medical consent forms from The Royal College of Radiologists (RCR) website.

## Core Logic and Architecture

The application follows a client-server model built with Next.js, where the frontend is a React-based single-page application and the backend consists of server-side "flows" that handle data processing.

### 1. Configuration and Data Management

-   **Data Scraping (`/config`)**: The application has a configuration page that allows a user to manually trigger an update of the consent forms. The source URL is defined in `src/config/app.json`. When triggered, a scraping flow (`src/ai/flows/scrape-forms-flow.ts`) fetches the RCR consent form webpage, parses it using `cheerio`, and extracts the title and URL of all PDF forms.
-   **Data Storage**: The scraped form data is stored in `public/consent-forms.json`. The application includes logic to check if the local JSON file is outdated compared to the live website and prompts the user to update if necessary.
-   **Staff Data (`src/config/staff.json`)**: A local JSON file stores a list of staff members, including their name, job title, and phone number.
-   **Staff Management UI (`/config/staff`)**: The application provides a dedicated user interface to add, edit, and remove staff members. This UI reads from and writes directly to `staff.json` via a dedicated API endpoint (`/api/staff`).

### 2. Main User Interface (`src/app/page.tsx`)

-   **Patient Details Form**: A form is displayed on the sidebar allowing the user to input patient details (name, DOB, address, etc.). The hospital name is a dropdown to ensure consistency. This data is managed in the main page's state.
    -   **Initial Data Highlighting**: Fields populated with the initial dummy data are highlighted with a red background. This highlighting is removed as soon as a user edits the field or imports live data.
    -   **Live Demographics Fetch**: A "Get Live Patient Demographics" button opens a pop-up where a user can enter a KOMS patient number. Pressing Enter or clicking the button fetches patient details from the KOMS service. On a successful import, only the dropdown menus (Clinician, Hospital, Macmillan Contact) are reset to their default values.
    -   **Age Verification**: If the entered Date of Birth indicates the patient is under 16, the input field is highlighted in red, and a warning dialog appears to ensure the correct consent procedures are followed.
-   **Clinician and Macmillan Contact Selection**: Two dropdown menus in the sidebar allow the user to select a clinician and a Macmillan contact from the list managed in `staff.json`. These dropdowns are highlighted until a selection is made.
-   **Form List**: The application reads `consent-forms.json` and displays the available forms in a categorized, accordion-style list.

### 3. PDF Interaction and Pre-population

This is the most complex part of the application's logic. When a user selects a form from the list, the following sequence occurs:

1.  **Field Extraction (`src/ai/flows/get-pdf-fields-flow.ts`)**: A request is sent to a server-side flow. This flow downloads the selected PDF and uses the `pdf-lib` library to inspect its structure and extract a list of all fillable field names. Crucially, it filters out and **excludes checkboxes, fields containing "initials" or "signature", and any fields that start with "st " or "lt "** from this list.

2.  **Dynamic Form Rendering (`src/components/pdf-form.tsx`)**: The list of field names is sent back to the client. The main page then renders a dynamic form, creating a text input for each field name received from the backend. The UI clearly indicates which patient data was used to pre-fill each field (e.g., "matched with - Clinician Name + Title + Phone").

3.  **Intelligent Pre-population (`prePopulateForm` in `page.tsx`)**: Before rendering the form, the application attempts to intelligently pre-populate the fields using the entered patient data and selected staff details. This is done via a mapping object (`patientMappings`).
    -   The logic normalizes both the PDF field name and the mapping keys (by converting to lowercase and removing special characters) to ensure a high chance of a match.
    -   For most fields, it checks if the normalized PDF field name *includes* a normalized key (e.g., `hospitalnumber` includes `hospitalnumber`).
    -   **Special `startsWith` Logic**: For the keys 'name' and 'date', a more precise `startsWith` check is used. This allows it to correctly match "Name", "Name 2", "Date", and "Date 1" without incorrectly matching fields like "Hospital Name" or "Date of Birth".
    -   **Clinician Details Rule**: A specific rule handles clinician details. If a field name matches a clinician-related key (e.g., "clinician name", "name of person", or "responsible consultant"), it is populated with a combined string of the selected clinician's details: "Dr. Jane Doe, Consultant Oncologist - 12345". There is also a contextual rule to handle cases where a "Name" field is immediately followed by a "Job Title" field, populating them with the clinician's name and title respectively. This prevents patient data from being entered into fields meant for staff.
    -   **Macmillan Contact Rule**: If a field name includes "contact details" or "contact number", it is populated with a combined string of the selected Macmillan contact's name, title, and phone number (e.g., "Memory Masamba, Macmillan Radiographer - 01227 864311").

4.  **Final PDF Generation**: After the user reviews and potentially edits the pre-populated data in the dynamic form, they click "Submit".
    -   The final form data is sent to the `fillPdf` flow (`src/ai/flows/fill-pdf-flow.ts`).
    -   This flow uses `pdf-lib` to fill the original PDF with the user-provided data.
    -   The filled PDF is saved to a temporary file, and its unique ID is returned to the client.
    -   The client then opens a new browser tab pointing to an API route (`/api/filled-pdf/[id]`), which serves the generated PDF for viewing and saving.
