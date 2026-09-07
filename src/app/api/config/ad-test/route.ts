import { feedback } from '@/lib/diagnostics';
import { api } from '@/lib/authorization';

import { NextResponse } from 'next/server';
import { testAdConnection } from '@/ai/flows/ad-auth-flow';

async function handlePOST() {
    try {
        const result = await testAdConnection();
        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error) {
    await feedback('failed', { error });
        const message = 'Operation failed. See the feedback log for diagnostic details.';
        return NextResponse.json({ success: false, message: message }, { status: 500 });
    }
}

export const POST = api('ad-test', 'full', handlePOST, true);
