import { BlobServiceClient } from "@azure/storage-blob";

const containerName = import.meta.env.VITE_AZURE_CONTAINER_NAME || "aluno-rafaelpinheiro";
const sasToken = import.meta.env.VITE_AZURE_SAS_TOKEN;
const accountName = import.meta.env.VITE_AZURE_ACCOUNT_NAME;

// Monta a URL segura com SAS
const blobSasUrl = `https://${accountName}.blob.core.windows.net/?${sasToken}`;
const blobServiceClient = new BlobServiceClient(blobSasUrl);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Inicializa container se não existir
export const initContainer = async () => {
  try {
    await containerClient.createIfNotExists();
    console.log(`Container ${containerName} verificado/criado.`);
  } catch (error) {
    console.error("Erro ao criar container:", error);
  }
};

export const listBlobFiles = async () => {
  let files = [];
  try {
    for await (const blob of containerClient.listBlobsFlat()) {
      files.push({
        id: blob.name, // Blob name atua como ID
        name: blob.name,
        size: (blob.properties.contentLength / 1024).toFixed(2) + " KB",
        source: 'azure'
      });
    }
  } catch (error) {
    console.error("Erro ao listar Azure:", error);
  }
  return files;
};

export const uploadToBlob = async (fileObj, contentBlob) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(fileObj.name);
    await blockBlobClient.uploadData(contentBlob);
    return { success: true, file: fileObj.name };
  } catch (error) {
    console.error("Erro no upload Azure:", error);
    return { success: false, file: fileObj.name, error };
  }
};