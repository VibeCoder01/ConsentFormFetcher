
'use server';

import type { KomsResponse } from '@/lib/types';

// This function is extracted from the original route to be reusable.
// It is NOT exported because it should only be used through the logger.
async function getKomsUsername(): Promise<string | null> {
    const KOMS_URL = process.env.KOMS_URL;
    if (!KOMS_URL) {
        // No console.error here to avoid log spam if KOMS isn't configured.
        return null;
    }
    try {
        const koms = await fetch(KOMS_URL, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)'
            },
            body: 'RNumber=ZZZ', // Dummy call to get session user
            cache: 'no-store' 
        });

        if (!koms.ok) return null;
        
        const h = koms.headers;
        const response: KomsResponse = { user: h.get('SessionUserid') } as KomsResponse;
        return response.user;

    } catch (error) {
        // Avoid logging connection errors here as it's just for getting the username
        return null;
    }
}


type LogStatus = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'INFO';

/**
 * Logs a formatted message to the console including timestamp, username, activity, and status.
 * @param activity A description of the action being performed.
 * @param status The outcome of the activity.
 * @param details Additional details or error messages.
 */
export async function logActivity(activity: string, { status, details }: { status: LogStatus, details?: any }) {
    try {
        const username = await getKomsUsername();
        const timestamp = new Date().toISOString();
        const userDisplay = username || 'anonymous';
        
        let logMessage = `${timestamp} [${userDisplay}] - ${activity} - [${status}]`;

        if (details) {
            if (typeof details === 'string') {
                logMessage += ` - Details: ${details}`;
            } else if (details instanceof Error) {
                 logMessage += ` - Error: ${details.message}`;
            } else {
                try {
                    logMessage += ` - Details: ${JSON.stringify(details)}`;
                } catch {
                    logMessage += ` - Details: [unserializable object]`;
                }
            }
        }
        
        // Use console.error for failures and denials for better visibility in logs
        if (status === 'FAILURE' || status === 'DENIED') {
            console.error(logMessage);
        } else {
            console.log(logMessage);
        }

    } catch (error) {
        // Fallback for when the logger itself fails
        console.error(`[LOGGER_FAILURE] Failed to log activity: "${activity}". Reason:`, error);
    }
}
