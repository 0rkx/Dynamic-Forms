import { FormResponse, Question } from "../types";

function downloadFile(filename: string, content: string, mimeType: string) {
    const element = document.createElement("a");
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Google Sheets API configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapi: any;
let tokenClient: any;
let accessToken: string | null = null;

// Check current origin and provide helpful error messages
const getCurrentOrigin = () => {
    if (typeof window === 'undefined') return 'unknown';
    return window.location.origin;
};

const getOriginErrorMessage = () => {
    const currentOrigin = getCurrentOrigin();
    return `
Current origin: ${currentOrigin}
Common origins to add in Google Cloud Console:
- http://localhost:5173
- http://127.0.0.1:5173
- https://localhost:5173
- https://127.0.0.1:5173

To fix this:
1. Go to Google Cloud Console
2. Navigate to APIs & Services > Credentials
3. Click on your OAuth 2.0 Client ID
4. Add the current origin (${currentOrigin}) to "Authorized JavaScript origins"
5. Save and try again
`;
};

// Load GAPI with proper error handling
const loadGapi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        gapi.load(
            'client',
            { 
                callback: resolve, 
                onerror: () => reject(new Error('gapi.load failed - check network and script availability'))
            }
        );
    });
};

// Load Google API with modern approach
const loadGoogleAPI = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        console.log('loadGoogleAPI: Starting...');
        
        if (typeof window !== 'undefined' && (window as any).gapi && (window as any).google) {
            console.log('loadGoogleAPI: APIs already loaded');
            gapi = (window as any).gapi;
            resolve();
            return;
        }

        console.log('loadGoogleAPI: Loading Google API script...');
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        
        script.onload = async () => {
            console.log('loadGoogleAPI: Google API script loaded');
            gapi = (window as any).gapi;
            
            try {
                console.log('loadGoogleAPI: Loading gapi client with proper error handling...');
                await loadGapi();
                
                console.log('loadGoogleAPI: Debugging gapi.client.init parameters...');
                
                // Debug each parameter before initialization
                console.log('🔍 Parameter Check:', {
                    apiKey: GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 10)}...` : '❌ MISSING',
                    clientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : '❌ MISSING',
                    scope: SCOPES,
                    discoveryDocs: [DISCOVERY_DOC],
                    plugin_name: 'DynamicFormsApp',
                    currentOrigin: getCurrentOrigin()
                });
                
                // Check if environment variables are actually loaded
                if (!GOOGLE_API_KEY) {
                    throw new Error('❌ VITE_GOOGLE_API_KEY is not defined. Check your .env file and restart the dev server.');
                }
                if (!GOOGLE_CLIENT_ID) {
                    throw new Error('❌ VITE_GOOGLE_CLIENT_ID is not defined. Check your .env file and restart the dev server.');
                }
                
                console.log('loadGoogleAPI: All parameters validated, initializing gapi client...');
                
                // Modern approach: Use gapi.client.init with all required parameters
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    clientId: GOOGLE_CLIENT_ID,        // Required for OAuth
                    scope: SCOPES,                     // Required for OAuth  
                    discoveryDocs: [DISCOVERY_DOC],    // Must be array (plural)
                    plugin_name: 'DynamicFormsApp'     // Required since 2023
                });
                
                console.log('loadGoogleAPI: Gapi client initialized successfully');
                
                // Test if Google Sheets API is accessible
                console.log('🧪 Testing Google Sheets API accessibility...');
                try {
                    // Simple API test - this will fail if Sheets API isn't enabled
                    const testResponse = await gapi.client.request({
                        path: 'https://sheets.googleapis.com/v4/spreadsheets',
                        method: 'POST',
                        body: JSON.stringify({
                            properties: { title: 'API Test - Delete Me' }
                        }),
                        headers: { 'Content-Type': 'application/json' }
                    }).catch((apiError: any) => {
                        console.log('🧪 API Test Result:', {
                            status: apiError?.status,
                            message: apiError?.result?.error?.message,
                            code: apiError?.result?.error?.code
                        });
                        
                        if (apiError?.status === 401) {
                            console.log('✅ Google Sheets API is enabled (got 401 - expected without auth)');
                            return { apiEnabled: true };
                        } else if (apiError?.status === 403 && apiError?.result?.error?.message?.includes('disabled')) {
                            throw new Error('❌ Google Sheets API is not enabled. Go to Google Cloud Console → APIs & Services → Library → Enable Google Sheets API');
                        } else if (apiError?.status === 403) {
                            console.log('✅ Google Sheets API is enabled (got 403 - API restrictions working)');
                            return { apiEnabled: true };
                        } else {
                            console.log('⚠️ Unexpected API response:', apiError);
                            return { apiEnabled: 'unknown' };
                        }
                    });
                    console.log('✅ Google Sheets API accessibility test completed');
                } catch (apiTestError: any) {
                    console.error('❌ Google Sheets API test failed:', apiTestError);
                    if (apiTestError?.message?.includes('not enabled')) {
                        throw apiTestError; // Re-throw API not enabled errors
                    }
                    // Don't fail on other API test errors, just log them
                }
                
                // Load Google Identity Services for modern auth
                console.log('loadGoogleAPI: Loading Google Identity Services...');
                const gsiScript = document.createElement('script');
                gsiScript.src = 'https://accounts.google.com/gsi/client';
                
                gsiScript.onload = () => {
                    console.log('loadGoogleAPI: Google Identity Services loaded');
                    const google = (window as any).google;
                    
                    if (!google || !google.accounts || !google.accounts.oauth2) {
                        console.error('loadGoogleAPI: Google Identity Services not properly loaded');
                        reject(new Error('Google Identity Services not available'));
                        return;
                    }
                    
                    try {
                        console.log('loadGoogleAPI: Initializing token client...');
                        tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: GOOGLE_CLIENT_ID,
                            scope: SCOPES,
                            callback: (response: any) => {
                                if (response.error) {
                                    console.error('OAuth error:', response.error);
                                    
                                    // Handle specific OAuth errors
                                    if (response.error === 'popup_closed_by_user') {
                                        throw new Error('Authentication popup was closed. Please try again.');
                                    } else if (response.error === 'invalid_client') {
                                        throw new Error(`Invalid client configuration.\n${getOriginErrorMessage()}`);
                                    } else if (response.error === 'idpiframe_initialization_failed') {
                                        throw new Error(`Google Identity Services initialization failed. Check your OAuth configuration.\n${getOriginErrorMessage()}`);
                                    } else {
                                        throw new Error(`OAuth error: ${response.error}\n\nIf this is an origin error:\n${getOriginErrorMessage()}`);
                                    }
                                }
                                accessToken = response.access_token;
                                console.log('loadGoogleAPI: Access token received successfully');
                            },
                        });
                        console.log('loadGoogleAPI: Token client initialized successfully');
                        resolve();
                    } catch (tokenClientError: any) {
                        console.error('loadGoogleAPI: Error initializing token client:', tokenClientError);
                        
                        if (tokenClientError?.message?.includes('origin') || tokenClientError?.message?.includes('Origin')) {
                            reject(new Error(`Origin not authorized.\n${getOriginErrorMessage()}`));
                        } else {
                            reject(tokenClientError);
                        }
                    }
                };
                
                gsiScript.onerror = (error) => {
                    console.error('loadGoogleAPI: Error loading Google Identity Services script:', error);
                    reject(new Error('Failed to load Google Identity Services'));
                };
                
                document.head.appendChild(gsiScript);
                
            } catch (clientInitError: any) {
                console.error('loadGoogleAPI: Error in gapi.client.init:', {
                    error: clientInitError,
                    message: clientInitError?.message,
                    details: clientInitError?.details,
                    result: clientInitError?.result,
                    status: clientInitError?.status
                });
                
                // Provide specific error messages based on common issues
                const errorMessage = clientInitError?.result?.error?.message || clientInitError?.message || 'Unknown error';
                
                if (errorMessage.includes('API key')) {
                    reject(new Error(`Invalid Google API key. Check VITE_GOOGLE_API_KEY in your environment.\nError: ${errorMessage}`));
                } else if (errorMessage.includes('origin') || errorMessage.includes('Origin')) {
                    reject(new Error(`Origin not authorized.\n${getOriginErrorMessage()}`));
                } else if (errorMessage.includes('client')) {
                    reject(new Error(`Invalid client configuration. Check VITE_GOOGLE_CLIENT_ID in your environment.\nError: ${errorMessage}\n\n${getOriginErrorMessage()}`));
                } else if (errorMessage.includes('scope')) {
                    reject(new Error(`Invalid scope configuration. Check OAuth consent screen settings.\nError: ${errorMessage}`));
                } else if (errorMessage.includes('discoveryDoc')) {
                    reject(new Error(`Discovery document error. Check Google Sheets API is enabled.\nError: ${errorMessage}`));
                } else if (errorMessage === 'Unknown error') {
                    reject(new Error(`gapi.client.init failed with "Unknown error". Common causes:
1. Missing or invalid API key (VITE_GOOGLE_API_KEY)
2. Missing or invalid client ID (VITE_GOOGLE_CLIENT_ID)  
3. Google Sheets API not enabled in Google Cloud Console
4. Unauthorized JavaScript origin: ${getCurrentOrigin()}
5. Invalid OAuth consent screen configuration

${getOriginErrorMessage()}`));
                } else {
                    reject(new Error(`Google API initialization failed: ${errorMessage}`));
                }
            }
        };
        
        script.onerror = (error) => {
            console.error('loadGoogleAPI: Error loading Google API script:', error);
            reject(new Error('Failed to load Google API script from https://apis.google.com/js/api.js'));
        };
        
        console.log('loadGoogleAPI: Appending script to document head');
        document.head.appendChild(script);
    });
};

// Check if user is authenticated with Google
const isGoogleAuthenticated = (): boolean => {
    return !!accessToken;
};

// Sign in to Google using Google Identity Services (modern approach)
const signInToGoogle = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Identity Services not loaded. Please refresh the page and try again.'));
            return;
        }

        console.log('signInToGoogle: Initiating Google OAuth flow...');

        // Set up callback for the token client
        tokenClient.callback = (response: any) => {
            console.log('signInToGoogle: OAuth response received:', { 
                error: response.error, 
                hasAccessToken: !!response.access_token 
            });
            
            if (response.error) {
                console.error('signInToGoogle: OAuth error details:', response);
                
                // Handle specific errors with helpful messages
                if (response.error === 'popup_closed_by_user') {
                    reject(new Error('Authentication popup was closed. Please try again.'));
                } else if (response.error === 'access_denied') {
                    reject(new Error('Access denied. Please grant permission to access Google Sheets.'));
                } else if (response.error === 'invalid_client') {
                    reject(new Error(`Invalid OAuth client configuration.\n${getOriginErrorMessage()}`));
                } else {
                    reject(new Error(`OAuth authentication failed: ${response.error}`));
                }
                return;
            }
            
            if (!response.access_token) {
                reject(new Error('No access token received from Google. Please try again.'));
                return;
            }
            
            accessToken = response.access_token;
            console.log('signInToGoogle: Access token received and stored');
            
            // Set the token for gapi.client (modern approach)
            try {
                gapi.client.setToken({ access_token: accessToken });
                console.log('signInToGoogle: Token set for gapi.client');
                resolve();
            } catch (tokenSetError) {
                console.error('signInToGoogle: Error setting token for gapi.client:', tokenSetError);
                reject(new Error('Failed to configure API access token. Please try again.'));
            }
        };

        try {
            // Request an access token with explicit prompt for better UX
            console.log('signInToGoogle: Requesting access token...');
            tokenClient.requestAccessToken({ 
                prompt: 'consent',  // Always show consent screen for clarity
                hint: 'Select or enter the Google account for Sheets access'
            });
        } catch (requestError: any) {
            console.error('signInToGoogle: Error requesting access token:', requestError);
            if (requestError?.message?.includes('origin') || requestError?.message?.includes('Origin')) {
                reject(new Error(`Origin not authorized for OAuth.\n${getOriginErrorMessage()}`));
            } else {
                reject(new Error(`Failed to initiate Google authentication: ${requestError?.message || 'Unknown error'}`));
            }
        }
    });
};

export function exportToJson(data: any, filename: string) {
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(`${filename}.json`, jsonString, "application/json");
}

export function exportToCsv(responses: FormResponse[], questions: Question[], filename: string) {
    const questionsForHeaders = questions.filter(q => q.type !== 'welcome');
    
    // Collect all unique question IDs from all responses (including followup questions)
    const allQuestionIds = new Set<string>();
    responses.forEach(response => {
        Object.keys(response.answers).forEach(questionId => {
            allQuestionIds.add(questionId);
        });
    });
    
    // Create labels for all questions (original + followup)
    const getQuestionLabel = (questionId: string) => {
        const question = questions.find(q => q.id === questionId);
        if (question) {
            return question.label;
        }
        
        // Handle followup questions (they have IDs like "questionId_followup_1_timestamp")
        if (questionId.includes('_followup_')) {
            const parts = questionId.split('_followup_');
            const originalQuestionId = parts[0];
            const originalQuestion = questions.find(q => q.id === originalQuestionId);
            const followupNumber = parts[1]?.split('_')[0] || '1';
            
            if (originalQuestion) {
                return `${originalQuestion.label} (Follow-up #${followupNumber})`;
            }
            return `Follow-up Question #${followupNumber}`;
        }
        
        return questionId;
    };
    
    const allQuestionIdsArray = Array.from(allQuestionIds).sort();
    const headers = ["responseId", "submittedAt", "startedAt", ...allQuestionIdsArray.map(getQuestionLabel)];
    
    const rows = responses.map(response => {
        const rowData = [
            response.responseId,
            response.submittedAt,
            response.startedAt,
            ...allQuestionIdsArray.map(questionId => {
                const answer = response.answers[questionId];
                if (answer === undefined || answer === null) return "";
                if (typeof answer === 'object') return JSON.stringify(answer);
                return String(answer);
            })
        ];
        return rowData.map(d => `"${String(d).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(`${filename}.csv`, csvContent, "text/csv;charset=utf-8;");
}

// Export to Google Sheets
export async function exportToGoogleSheets(
    responses: FormResponse[], 
    questions: Question[], 
    filename: string
): Promise<string> {
    try {
        // Validate configuration
        console.log('Checking Google API configuration...', {
            hasClientId: !!GOOGLE_CLIENT_ID,
            hasApiKey: !!GOOGLE_API_KEY,
            clientId: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'missing',
            apiKey: GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 10)}...` : 'missing'
        });
        
        if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
            throw new Error('Google API credentials not configured. Please set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in your environment variables.');
        }

        // Load Google API if not already loaded
        console.log('Loading Google API...');
        await loadGoogleAPI();
        console.log('Google API loaded successfully');

        // Check if user is authenticated
        console.log('Checking authentication status...', { isAuthenticated: isGoogleAuthenticated() });
        if (!isGoogleAuthenticated()) {
            console.log('User not authenticated, initiating sign-in...');
            await signInToGoogle();
            console.log('Sign-in completed');
        }

        // Verify access token is available (it should be set in signInToGoogle)
        if (!accessToken) {
            throw new Error('No access token available after authentication');
        }
        
        console.log('exportToGoogleSheets: Ready to create spreadsheet with authenticated access');

        // Prepare data similar to CSV export
        const questionsForHeaders = questions.filter(q => q.type !== 'welcome');
        
        // Collect all unique question IDs from all responses (including followup questions)
        const allQuestionIds = new Set<string>();
        responses.forEach(response => {
            Object.keys(response.answers).forEach(questionId => {
                allQuestionIds.add(questionId);
            });
        });
        
        // Create labels for all questions (original + followup)
        const getQuestionLabel = (questionId: string) => {
            const question = questions.find(q => q.id === questionId);
            if (question) {
                return question.label;
            }
            
            // Handle followup questions (they have IDs like "questionId_followup_1_timestamp")
            if (questionId.includes('_followup_')) {
                const parts = questionId.split('_followup_');
                const originalQuestionId = parts[0];
                const originalQuestion = questions.find(q => q.id === originalQuestionId);
                const followupNumber = parts[1]?.split('_')[0] || '1';
                
                if (originalQuestion) {
                    return `${originalQuestion.label} (Follow-up #${followupNumber})`;
                }
                return `Follow-up Question #${followupNumber}`;
            }
            
            return questionId;
        };
        
        const allQuestionIdsArray = Array.from(allQuestionIds).sort();
        const headers = ["Response ID", "Submitted At", "Started At", ...allQuestionIdsArray.map(getQuestionLabel)];
        
        // Prepare rows data
        const rows = responses.map(response => {
            return [
                response.responseId,
                new Date(response.submittedAt).toLocaleString(),
                new Date(response.startedAt).toLocaleString(),
                ...allQuestionIdsArray.map(questionId => {
                    const answer = response.answers[questionId];
                    if (answer === undefined || answer === null) return "";
                    if (typeof answer === 'object') return JSON.stringify(answer);
                    return String(answer);
                })
            ];
        });

        // Create the spreadsheet
        const spreadsheetResponse = await gapi.client.sheets.spreadsheets.create({
            properties: {
                title: filename
            }
        });

        const spreadsheetId = spreadsheetResponse.result.spreadsheetId;
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

        // Add data to the spreadsheet
        const allData = [headers, ...rows];
        
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A1',
            valueInputOption: 'RAW',
            resource: {
                values: allData
            }
        });

        // Format the header row
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1,
                                startColumnIndex: 0,
                                endColumnIndex: headers.length
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.9,
                                        green: 0.9,
                                        blue: 0.9
                                    },
                                    textFormat: {
                                        bold: true
                                    }
                                }
                            },
                            fields: "userEnteredFormat(backgroundColor,textFormat)"
                        }
                    },
                    {
                        autoResizeDimensions: {
                            dimensions: {
                                sheetId: 0,
                                dimension: "COLUMNS",
                                startIndex: 0,
                                endIndex: headers.length
                            }
                        }
                    }
                ]
            }
        });

        return spreadsheetUrl;
    } catch (error: any) {
        console.error('Error exporting to Google Sheets:', {
            error,
            message: error?.message,
            status: error?.status,
            result: error?.result,
            details: error?.result?.error?.message,
            stack: error?.stack
        });
        
        // Provide more specific error messages
        if (error?.message?.includes('Origin not authorized') || error?.message?.includes('origin') || error?.message?.includes('Origin')) {
            // Origin-related errors - provide helpful guidance
            throw new Error(`Google API Origin Error: ${error.message}`);
        } else if (error?.message?.includes('Invalid client configuration')) {
            throw new Error(`Google OAuth Configuration Error: ${error.message}`);
        } else if (error?.result?.error?.message) {
            // Check if the API error is origin-related
            const apiErrorMessage = error.result.error.message;
            if (apiErrorMessage.includes('origin') || apiErrorMessage.includes('Origin') || apiErrorMessage.includes('not a valid origin')) {
                throw new Error(`Google API Origin Error: ${apiErrorMessage}\n\n${getOriginErrorMessage()}`);
            } else {
                throw new Error(`Google Sheets API Error: ${apiErrorMessage}`);
            }
        } else if (error?.message?.includes('Google API not loaded')) {
            throw new Error('Google API failed to load. Please check your internet connection and try again.');
        } else if (error?.message?.includes('Google Identity Services not loaded')) {
            throw new Error('Google authentication system failed to load. Please refresh the page and try again.');
        } else if (error?.message?.includes('OAuth error')) {
            throw new Error(`Google authentication failed: ${error.message}`);
        } else if (error?.message?.includes('popup_closed_by_user')) {
            throw new Error('Authentication was cancelled. Please try again and complete the Google sign-in process.');
        } else {
            throw new Error(`Failed to export to Google Sheets: ${error?.message || 'Unknown error occurred'}`);
        }
    }
}
