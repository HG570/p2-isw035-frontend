import { gapi } from 'gapi-script';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

export const initGoogleClient = () => {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      }).then(() => {
        resolve(gapi);
      }).catch(err => reject(err));
    });
  });
};

export const listDriveFiles = async () => {
  try {
    const response = await gapi.client.drive.files.list({
      'pageSize': 10,
      'fields': "nextPageToken, files(id, name, size, mimeType)"
    });
    return response.result.files.map(f => ({
      ...f,
      source: 'google',
      status: 'pending' // pending, synced, error
    }));
  } catch (error) {
    console.error("Erro Google Drive:", error);
    return [];
  }
};

// Função auxiliar para baixar o conteúdo do arquivo do Google para memória
export const downloadDriveFile = async (fileId) => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${gapi.auth.getToken().access_token}`
        }
    });
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error("Erro download Google:", error);
    return null;
  }
}