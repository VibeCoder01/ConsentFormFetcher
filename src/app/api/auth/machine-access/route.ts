import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';
import { NextResponse } from 'next/server';
import { checkMachineAuthorisation } from '@/ai/flows/ad-auth-flow';
import { resolveClientHostname } from '@/lib/client-machine';

async function machine(request: Request) {
  try {
    const hostname = await resolveClientHostname(request);
    const result = await checkMachineAuthorisation(hostname);

    if (!result.ok) {
      return NextResponse.json({ allowed: false, message: result.reason }, { status: 403 });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    await feedback('failed', { error });
    const message = 'Operation failed. See the feedback log for diagnostic details.';
    return NextResponse.json({ allowed: false, message }, { status: 500 });
  }
}

export const GET = api('machine', null, machine);
