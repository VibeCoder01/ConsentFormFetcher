import { sandboxEnabled } from '@/lib/sandbox';
import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';


import { readAppConfig } from '@/lib/app-config';

// Per Next.js docs, this is the proper way to access env vars in a route handler
const KOMS_URL = process.env.KOMS_URL;

function getErrorCauseCode(error: Error): string | undefined {
  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object' || !('code' in cause)) {
    return undefined;
  }

  const { code } = cause as { code?: unknown };
  return typeof code === 'string' ? code : undefined;
}

async function handleGET(req: Request) {
  const rNumber = new URL(req.url).searchParams.get('RNumber');
  const config = await readAppConfig();
  if (!rNumber?.trim() || rNumber.length > 100) return Response.json({ error: 'Patient number is required.' }, { status: 400 });

  if (sandboxEnabled()) return Response.json({ forename: 'Alice', surname: 'Synthetic', fullName: 'Alice Synthetic', rNumber, dob: '1980-01-01', addr1: '1 Test Street', addr2: '', addr3: '', postcode: 'TEST', homePhone: '', gpName: 'Test GP', nhsNumber: '', hospitalNumber: 'TEST123', hospitalNumberMTW: '' });

  if (!KOMS_URL) {
      return Response.json({ error: 'KOMS service URL not configured' }, { status: 500 });
  }

  // quick sanity-check: “R” followed by seven digits
  if (config.validateRNumber && (!rNumber || !/^R\d{7}$/i.test(rNumber)))
    return Response.json({ error: 'Invalid R number. It should start with "R" and be followed by 7 digits.' }, { status: 400 });

  try {
    const koms = await fetch(KOMS_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)'
        },
        body: `RNumber=${encodeURIComponent(rNumber || '')}`
    });

    if (!koms.ok)
        return Response.json(
        { error: `KOMS responded with status ${koms.status}` },
        { status: 502 }
        );

    await feedback('upstream', { status: koms.status });
    const h = koms.headers;
    if (!h.get('Forename') || !h.get('Surname') || h.get('Forename') === '${forename}') return Response.json({ error: 'KOMS did not return valid demographics. Check the KOMS session.' }, { status: 502 });
    if (h.get('RNumber')?.trim().toUpperCase() !== rNumber.trim().toUpperCase()) return Response.json({ error: 'KOMS returned a different or missing patient number.' }, { status: 502 });
    
    // The DoB header from KOMS might be in a different format. 
    // We will attempt to parse it and reformat to YYYY-MM-DD for the input[type=date].
    let dob = h.get('DoB'); // e.g., "17/05/1990"
    if (dob) {
        try {
            // It might be DD/MM/YYYY, so we need to parse it manually
            const parts = dob.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                const date = new Date(`${year}-${month}-${day}`);
                 // Check if date is valid
                if (!isNaN(date.getTime())) {
                    dob = date.toISOString().split('T')[0]; // "1990-05-17"
                } else {
                    dob = ''; // Set to empty if parsing fails
                }
            } else {
                 const date = new Date(dob);
                 if (!isNaN(date.getTime())) {
                    dob = date.toISOString().split('T')[0];
                 } else {
                    dob = '';
                 }
            }
        } catch {
            dob = ''; // Set to empty on error
        }
    }

    const forename = h.get('Forename') ?? '';
    const surname = h.get('Surname') ?? '';
    
    return Response.json({
        forename: forename,
        surname: surname,
        fullName: `${forename} ${surname}`.trim(),
        rNumber: h.get('RNumber'),
        dob: dob,
        user: h.get('SessionUserid'),
        fetched: h.get('DateTimeRequested'),
        addr1: h.get('addr1'),
        addr2: h.get('addr2'),
        addr3: h.get('addr3'),
        postcode: h.get('postcode'),
        homePhone: h.get('HomePhone'),
        gpName: h.get('GPName'),
        nhsNumber: h.get('NHSNumber'),
        hospitalNumber: h.get('HospitalNumber'),
        hospitalNumberMTW: h.get('HospitalNumberMTW'),
    });

  } catch (error) {
    // Log the full error object and any nested cause for detailed debugging.
    await feedback('failed', { error });
    if (error instanceof Error && error.cause) {
      await feedback('failed', { error });
    }

    let message = 'An unknown network error occurred';
    if (error instanceof Error) {
        const causeCode = getErrorCauseCode(error);

        if (causeCode === 'UND_ERR_CONNECT_TIMEOUT') {
             message = 'Connection to KOMS timed out. Please ensure you are logged into KOMS and try again.';
        } else if (causeCode) {
            message = 'Failed to connect to KOMS. See the feedback log.';
        } else {
            message = 'Upstream connection failed. See the feedback log.';
        }
    }
    return Response.json({ error: message }, { status: 504 }); // Gateway Timeout
  }
}

export const GET = api('koms', 'read', handleGET, false);
