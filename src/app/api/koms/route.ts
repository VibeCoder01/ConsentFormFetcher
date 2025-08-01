
import type { NextRequest } from 'next/server';
import config from '@/config/app.json';

// Per Next.js docs, this is the proper way to access env vars in a route handler
const KOMS_URL = process.env.KOMS_URL;

export async function GET(req: NextRequest) {
  const rNumber = new URL(req.url).searchParams.get('RNumber');

  if (!KOMS_URL) {
      return Response.json({ error: 'KOMS service URL not configured' }, { status: 500 });
  }

  // quick sanity-check: “R” followed by seven digits
  if (config.validateRNumber && (!rNumber || !/^R\d{7}$/i.test(rNumber)))
    return Response.json({ error: 'Invalid R number. It should start with "R" and be followed by 7 digits.' }, { status: 400 });

  try {
    const koms = await fetch(KOMS_URL, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)'
        },
        body: `RNumber=${encodeURIComponent(rNumber || '')}`
    });

    if (!koms.ok)
        return Response.json(
        { error: `KOMS responded ${koms.status} ${koms.statusText}` },
        { status: 502 }
        );

    const h = koms.headers;
    
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
        } catch (e) {
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
    let message = 'An unknown network error occurred';
    if (error instanceof Error) {
        // The 'cause' property often holds more specific network error details
        const cause = (error as any).cause;
        if (cause && typeof cause.code === 'string') {
            message = cause.code; // e.g., 'ECONNREFUSED', 'ENOTFOUND'
        } else {
            message = error.message; // fallback to the original message
        }
    }
    return Response.json({ error: `Failed to connect to KOMS service: ${message}` }, { status: 504 }); // Gateway Timeout
  }
}
