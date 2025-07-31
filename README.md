# ConsentForm Fetcher

This is a Next.js application designed to fetch, display, and pre-populate medical consent forms from The Royal College of Radiologists (RCR) website.

## Core Logic and Architecture

The application follows a client-server model built with Next.js, where the frontend is a React-based single-page application and the backend consists of server-side "flows" that handle data processing.

### 1. Configuration and Data Scraping

-   **Configuration (`/config`)**: The application has a configuration page that allows a user to manually trigger an update of the consent forms. The source URL is defined in `src/config/app.json`.
-   **Scraping Flow (`src/ai/flows/scrape-forms-flow.ts`)**: When triggered, this server-side flow fetches the RCR consent form webpage. It uses the `cheerio` library to parse the HTML, find all links ending in `.pdf`, and extract their titles and URLs. It also attempts to determine the category of each form by finding the nearest preceding `<h2>` heading.
-   **Data Storage**: The scraped form data is stored in `public/consent-forms.json`. The application also uses a temporary in-memory cache (`src/ai/util/cache.ts`) to speed up subsequent requests. The main page includes logic to check if the local JSON file is outdated compared to the live website and prompts the user to update if necessary.

### 2. Main User Interface (`src/app/page.tsx`)

-   **Patient Details Form**: A form is displayed on the sidebar allowing the user to input patient details (name, DOB, address, etc.). This data is managed in the main page's state.
-   **Form List**: The application reads the `consent-forms.json` file and displays the available forms in a categorized, accordion-style list.

### 3. PDF Interaction and Pre-population

This is the most complex part of the application's logic. When a user selects a form from the list, the following sequence occurs:

1.  **Field Extraction (`src/ai/flows/get-pdf-fields-flow.ts`)**: A request is sent to a server-side flow. This flow downloads the selected PDF and uses the `pdf-lib` library to inspect its structure and extract a list of all fillable field names. Crucially, it filters out and **excludes checkboxes** from this list.

2.  **Dynamic Form Rendering (`src/components/pdf-form.tsx`)**: The list of field names is sent back to the client. The main page then renders a dynamic form, creating a text input for each field name received from the backend.

3.  **Intelligent Pre-population (`prePopulateForm` in `page.tsx`)**: Before rendering the form, the application attempts to intelligently pre-populate the fields using the entered patient data. This is done via a mapping object (`patientMappings`) that contains various aliases for each piece of patient data.
    -   The logic normalizes both the PDF field name and the mapping keys (by converting to lowercase and removing special characters) to ensure a high chance of a match.
    -   For most fields, it checks if the normalized PDF field name *includes* a normalized key (e.g., `hospitalnumber` includes `hospitalnumber`).
    -   **Special `startsWith` Logic**: For the keys 'name' and 'date', a more precise `startsWith` check is used. This allows it to correctly match "Name", "Name 2", "Date", and "Date 1" without incorrectly matching fields like "Hospital Name" or "Date of Birth".
    -   **Contextual Rule for "Name"**: There is a specific rule to prevent incorrectly populating a clinician's name: If a field matches "Name" but the immediately following field in the PDF is "Job Title", the "Name" field is deliberately left blank.

4.  **Final PDF Generation**: After the user reviews and potentially edits the pre-populated data in the dynamic form, they click "Submit".
    -   The final form data is sent to the `fillPdf` flow (`src/ai/flows/fill-pdf-flow.ts`).
    -   This flow uses `pdf-lib` to fill the original PDF with the user-provided data.
    -   The filled PDF is saved to a temporary file, and its unique ID is returned to the client.
    -   The client then opens a new browser tab pointing to an API route (`/api/filled-pdf/[id]`), which serves the generated PDF for viewing and saving.
