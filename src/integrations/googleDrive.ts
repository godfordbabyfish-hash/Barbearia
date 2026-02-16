// Minimal Google Drive upload helper using Google Identity Services
// Requires env vars:
// - VITE_GOOGLE_DRIVE_CLIENT_ID
// - VITE_GOOGLE_DRIVE_FOLDER_ID (target folder where files will be created)
//
// Exposes: uploadToDrivePublic(file, filename, folderId?) -> returns public view URL

let gisLoaded = false;
let gapiLoaded = false;
let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiry: number | null = null; // epoch ms

const GIS_SRC = 'https://accounts.google.com/gsi/client';

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.onload = () => resolve();
      existing.onerror = () => reject(new Error(`Failed to load ${src}`));
      if ((existing as any).dataset.loaded === 'true') {
        resolve();
      }
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      (s as any).dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

async function ensureGISLoaded() {
  if (gisLoaded) return;
  await loadScript(GIS_SRC);
  gisLoaded = true;
}

function isTokenValid() {
  return accessToken && tokenExpiry && Date.now() < tokenExpiry - 30_000; // 30s margem
}

async function getAccessTokenInteractive(scopes: string, forceConsent = false): Promise<string> {
  await ensureGISLoaded();
  const clientId = (import.meta as any).env.VITE_GOOGLE_DRIVE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_DRIVE_CLIENT_ID não configurado');
  }
  const google: any = (window as any).google;
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes,
      callback: (_resp: any) => {},
    });
  }

  accessToken = await new Promise<string>((resolve, reject) => {
    tokenClient.callback = (resp: any) => {
      if (resp && resp.access_token) {
        accessToken = resp.access_token;
        const expSec = Number((resp as any).expires_in) || 3600;
        tokenExpiry = Date.now() + expSec * 1000;
        try { localStorage.setItem('gd_has_consent', '1'); } catch {}
        resolve(accessToken!);
      } else if (resp && resp.error) {
        reject(new Error(resp.error));
      } else {
        reject(new Error('Falha ao obter token de acesso'));
      }
    };
    try {
      const hasConsent = (() => { try { return localStorage.getItem('gd_has_consent') === '1'; } catch { return false; } })();
      const prompt = forceConsent ? 'consent' : (hasConsent ? '' : 'consent');
      tokenClient.requestAccessToken({ prompt });
    } catch (e) {
      reject(e);
    }
  });
  return accessToken!;
}

async function ensureToken(scopes: string) {
  if (isTokenValid()) return accessToken!;
  try {
    return await getAccessTokenInteractive(scopes, false);
  } catch (e: any) {
    // Se falhar sem consentimento (ex.: consent_required), tentar com 'consent'
    return await getAccessTokenInteractive(scopes, true);
  }
}

export async function uploadToDrivePublic(
  file: File,
  filename: string,
  folderId?: string
): Promise<string> {
  const token = await ensureToken('https://www.googleapis.com/auth/drive.file');
  const meta: Record<string, any> = { name: filename };
  if (folderId) meta.parents = [folderId];

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadataPart = [
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(meta),
  ].join('');

  const fileContent = await file.arrayBuffer();
  const fileBlob = new Blob([new Uint8Array(fileContent)], { type: file.type || 'application/octet-stream' });
  const fileHeader = `Content-Type: ${fileBlob.type}\r\n\r\n`;

  const multipartBody = new Blob(
    [
      delimiter,
      metadataPart,
      delimiter,
      fileHeader,
      fileBlob,
      closeDelim,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: multipartBody as any,
  });
  if (!uploadResp.ok) {
    const text = await uploadResp.text();
    throw new Error(`Falha ao enviar para o Google Drive: ${text}`);
  }
  const uploaded = await uploadResp.json();
  const fileId = uploaded.id as string;

  // Make it public
  const permResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!permResp.ok) {
    // If permission change fails, still return a link requiring auth
    // But attempt to proceed.
    console.warn('Não foi possível tornar o arquivo público no Drive.');
  }

  // Public view URL
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}
