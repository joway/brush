type GoogleCredentialResponse = {
  credential?: string;
};

type GooglePromptMomentNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
};

type GoogleGlobal = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      prompt: (
        listener?: (notification: GooglePromptMomentNotification) => void
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services-script';
const GOOGLE_CLIENT_ID = '102433646076-docrjifjv4egjkig4mpan8ctenccdqk8.apps.googleusercontent.com';

const loadGoogleScript = async (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return;
  }

  const existing = document.getElementById(
    GOOGLE_SCRIPT_ID
  ) as HTMLScriptElement | null;

  if (existing) {
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google SDK')),
        { once: true }
      );
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google SDK'));
    document.head.appendChild(script);
  });
};

export const getGoogleClientId = (): string => {
  const clientId = GOOGLE_CLIENT_ID.trim();
  if (!clientId || clientId.startsWith('REPLACE_WITH_')) {
    return '';
  }
  return clientId;
};

export const requestGoogleIdToken = async (
  clientId: string
): Promise<string> => {
  await loadGoogleScript();

  return new Promise<string>((resolve, reject) => {
    const google = window.google;
    if (!google?.accounts?.id) {
      reject(new Error('Google SDK unavailable'));
      return;
    }

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error('Google sign-in timed out'));
    }, 30_000);

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeout);
        const token = response.credential?.trim();
        if (!token) {
          reject(new Error('Google did not return an ID token'));
          return;
        }
        resolve(token);
      },
    });

    google.accounts.id.prompt((notification) => {
      if (settled) {
        return;
      }
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        settled = true;
        window.clearTimeout(timeout);
        reject(new Error('Google sign-in was cancelled or unavailable'));
      }
    });
  });
};
