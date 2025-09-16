
import { NextResponse } from 'next/server';
import { testAdConnection } from '@/ai/flows/ad-auth-flow';

export async function POST() {
    try {
        const result = await testAdConnection();
        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown server error occurred.";
        return NextResponse.json({ success: false, message: message }, { status: 500 });
    }
}
