// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { PatientData } from '@/lib/types';
const mocks = vi.hoisted(() => ({
  inspect: vi.fn(), fill: vi.fn(), toast: vi.fn(),
  session: { isLoggedIn: true, roles: ['read'], username: 'synthetic' },
}));
vi.mock('@/hooks/use-session', () => ({ useSession: () => ({ session: mocks.session, isLoading: false }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/ai/flows/get-pdf-fields-flow', () => ({ getPdfFields: mocks.inspect }));
vi.mock('@/ai/flows/fill-pdf-flow', () => ({ fillPdf: mocks.fill }));
vi.mock('@/ai/flows/update-check-flow', () => ({ checkForFormUpdates: async () => ({ hasUpdates: false }), updateForms: vi.fn() }));
vi.mock('@/components/app-header', () => ({ AppHeader: () => null }));
vi.mock('@/components/update-available-alert', () => ({ UpdateAvailableAlert: () => null }));
vi.mock('@/components/patient-form', () => ({ PatientForm: ({ patientData, setPatientData }: { patientData: PatientData; setPatientData: (data: PatientData) => void }) => <><button onClick={() => setPatientData({ ...patientData, forename: 'Alice', surname: 'Synthetic', rNumber: 'TESTA' })}>Patient A</button><button onClick={() => setPatientData({ ...patientData, forename: 'Bob', surname: 'Synthetic', rNumber: 'TESTB' })}>Patient B</button></> }));
vi.mock('@/components/clinician-form', () => ({ ClinicianForm: ({ onStaffMemberChange }: { onStaffMemberChange: (id: string) => void }) => <button onClick={() => onStaffMemberChange('doctor')}>Select doctor</button> }));
vi.mock('@/components/form-list', () => ({ FormList: ({ onSelectForm }: { onSelectForm: (form: { title: string; url: string }) => void }) => <><button onClick={() => onSelectForm({ title: 'Template A', url: 'https://www.rcr.ac.uk/a.pdf' })}>Template A</button><button onClick={() => onSelectForm({ title: 'Template B', url: 'https://www.rcr.ac.uk/b.pdf' })}>Template B</button></> }));
// Keep the actual PdfForm component: its local edit state is part of the regression.
import Home from '@/app/page';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  mocks.inspect.mockReset(); mocks.fill.mockReset(); mocks.toast.mockReset();
  mocks.fill.mockResolvedValue({ success: true, uncPath: '/synthetic.pdf' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => {
    if (url === '/api/config') return { previewPdfFields: true, prepopulateWithFakeData: false };
    if (url === '/api/staff') return [{ id: 'doctor', name: 'Test Doctor', title: 'Consultant', phone: '' }];
    if (url === '/api/consent-forms') return [{ category: 'Test', forms: [{ title: 'Template A', url: 'https://www.rcr.ac.uk/a.pdf' }] }];
    return [];
  } })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function ready() {
  render(<Home />);
  fireEvent.click(await screen.findByText('Patient A'));
  fireEvent.click(screen.getByText('Select doctor'));
}
describe('patient and template transitions', () => {
  it('invalidates old patient fields and generates using the newly selected patient', async () => {
    mocks.inspect.mockResolvedValue({ success: true, fields: ['Patient full name'] });
    await ready(); fireEvent.click(screen.getByText('Template A'));
    await screen.findByDisplayValue('Alice Synthetic');
    fireEvent.click(screen.getByText('Patient B'));
    expect(screen.queryByDisplayValue('Alice Synthetic')).toBeNull();
    expect(screen.queryByText('Submit & Save PDF')).toBeNull();
    fireEvent.click(screen.getByText('Template A'));
    await screen.findByDisplayValue('Bob Synthetic');
    fireEvent.click(screen.getByText('Submit & Save PDF'));
    await waitFor(() => expect(mocks.fill).toHaveBeenCalledOnce());
    expect(mocks.fill.mock.calls[0][0]).toMatchObject({ patientIdentifier: 'TESTB', fields: { 'Patient full name': 'Bob Synthetic' } });
  });
  it('ignores an older template response that finishes last', async () => {
    let finishA!: (value: unknown) => void;
    mocks.inspect.mockImplementation((url: string) => url.endsWith('a.pdf') ? new Promise(resolve => { finishA = resolve; }) : Promise.resolve({ success: true, fields: ['Patient full name B'] }));
    await ready(); fireEvent.click(screen.getByText('Template A')); fireEvent.click(screen.getByText('Template B'));
    await screen.findByDisplayValue('Alice Synthetic');
    await act(async () => { finishA({ success: true, fields: ['Old template field'] }); });
    expect(screen.queryByLabelText('Old template field')).toBeNull();
    fireEvent.click(screen.getByText('Submit & Save PDF'));
    await waitFor(() => expect(mocks.fill).toHaveBeenCalledOnce());
    expect(mocks.fill.mock.calls[0][0].formUrl).toBe('https://www.rcr.ac.uk/b.pdf');
    expect(mocks.fill.mock.calls[0][0].fields).toHaveProperty('Patient full name B');
  });
  it('discards an in-flight inspection after changing patient', async () => {
    let finish!: (value: unknown) => void;
    mocks.inspect.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    await ready(); fireEvent.click(screen.getByText('Template A')); fireEvent.click(screen.getByText('Patient B'));
    await act(async () => { finish({ success: true, fields: ['Patient full name'] }); });
    expect(screen.queryByDisplayValue('Alice Synthetic')).toBeNull();
    expect(screen.queryByText('Submit & Save PDF')).toBeNull();
    expect(mocks.fill).not.toHaveBeenCalled();
  });
});
