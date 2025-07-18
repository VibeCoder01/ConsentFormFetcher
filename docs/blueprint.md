# **App Name**: ConsentForm Fetcher

## Core Features:

- Consent Form Data Scraper: Scrape the RCR website to extract the list of consent forms and their URLs, updating a local JSON file with the results.
- Consent Form List: Display a selectable list of available consent forms based on the scraped data.
- Consent Form Display: Download and present the selected consent form (PDF) to the user. Use a browser-native PDF renderer.
- Form Fill-In: Allow the user to fill in the form. Form will have to be manually typeable with proper fill-in areas
- Save Form: Provide a 'Save' button to persist the filled-in form locally (download or local storage).
- Configuration Route: Provide a \config route for any configuration items and do not hard-code any configuration items, storing them in JSON file(s).

## Style Guidelines:

- Primary color: Soft blue (#A0D2EB) to evoke a sense of trust and reliability. It's not as intense as pure blue, making it gentler for medical context.
- Background color: Very light blue (#F0F8FF) provides a clean and professional backdrop.
- Accent color: Light purple (#B39DDB), an analogous color to blue. Slightly brighter and more saturated for interactive elements like buttons.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern look.
- Use clear and professional icons, primarily line icons, to represent actions and form elements. Icons should maintain the soft blue tone where applicable.
- Maintain a clean and structured layout, ensuring ease of navigation and readability. Prioritize a single-column layout for forms.
- Subtle transitions and animations for user interactions, such as form selection and saving. Animations should be smooth and quick.