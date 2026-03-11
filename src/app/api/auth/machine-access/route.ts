import { NextRequest, NextResponse } from 'next/server';
import { checkMachineAuthorisation } from '@/ai/flows/ad-auth-flow';
import { resolveClientHostname } from '@/lib/client-machine';

export async function GET(request: NextRequest) {
  try {
    const hostname = await resolveClientHostname(request);
    const result = await checkMachineAuthorisation(hostname);

    if (!result.ok) {
      return NextResponse.json({ allowed: false, message: result.reason }, { status: 403 });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not verify this machine.';
    return NextResponse.json({ allowed: false, message }, { status: 500 });
  }
}
