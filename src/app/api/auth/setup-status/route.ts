
import { NextResponse } from 'next/server';
import { readAdConfig } from '@/lib/ad-config';

const defaultFullGroupDN = "CN=AppAdmins-Full,OU=Groups,DC=domain,DC=com";

export async function GET() {
  try {
    const adConfig = await readAdConfig();
    const isInSetupMode = !adConfig.groupDNs?.full || adConfig.groupDNs.full === defaultFullGroupDN;
    return NextResponse.json({ isInSetupMode });
  } catch (error) {
    // This catch block is for unexpected errors during the process.
    console.error("Error in /api/auth/setup-status:", error);
    // Default to setup mode being true in case of failure to be safe.
    return NextResponse.json({ isInSetupMode: true }, { status: 500 });
  }
}
