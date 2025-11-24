import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { initContainer, listBlobFiles, uploadToBlob } from './services/azureService';
import { initGoogleClient, listDriveFiles, downloadDriveFile } from './services/googleService';

function App() {
  const [activeTab, setActiveTab] = useState('google'); // google | azure
  const [googleFiles, setGoogleFiles] = useState([]);
  const [azureFiles, setAzureFiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Inicialização
    initContainer(); // Cria container Azure
    initGoogleClient().then(() => {
        console.log("Google API Ready");
        loadGoogleFiles();
    });
    loadAzureFiles();
  }, []);

  const loadGoogleFiles = async () => {
    const files = await listDriveFiles();
    setGoogleFiles(files);
  };

  const loadAzureFiles = async () => {
    const files = await listBlobFiles();
    setAzureFiles(files);
  };

  const handleSelectFile = (id) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter(fId => fId !== id));
    } else {
      setSelectedFiles([...selectedFiles, id]);
    }
  };

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  // Lógica CORE de Migração
  const handleSync = async (filesToSync) => {
    setIsSyncing(true);
    addLog(`Iniciando sincronização de ${filesToSync.length} arquivos...`);

    for (const file of filesToSync) {
      try {
        addLog(`Baixando ${file.name} do Drive...`);
        const contentBlob = await downloadDriveFile(file.id);
        
        if (contentBlob) {
            addLog(`Enviando ${file.name} para Azure Blob...`);
            const result = await uploadToBlob(file, contentBlob);
            
            if (result.success) {
                addLog(`✅ Sucesso: ${file.name} sincronizado!`, 'success');
                // Atualiza UI para mostrar check
                setGoogleFiles(prev => prev.map(f => f.id === file.id ? {...f, status: 'synced'} : f));
            } else {
                addLog(`❌ Erro ao enviar ${file.name}: ${result.error}`, 'error');
            }
        } else {
            addLog(`❌ Erro ao baixar ${file.name}`, 'error');
        }
      } catch (error) {
        addLog(`❌ Erro crítico em ${file.name}`, 'error');
      }
    }
    
    setIsSyncing(false);
    loadAzureFiles(); // Atualiza lista do Azure
    setSelectedFiles([]);
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-4">📂 Gerenciador de Arquivos & Migração</h2>
      
      {/* Nav Pills */}
      <ul className="nav nav-pills mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'google' ? 'active' : ''}`} 
            onClick={() => setActiveTab('google')}>
            Google Drive
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'azure' ? 'active' : ''}`} 
            onClick={() => setActiveTab('azure')}>
            Azure Blob Storage
          </button>
        </li>
      </ul>

      {/* Toolbar de Ações (Só visível na aba Google) */}
      {activeTab === 'google' && (
        <div className="mb-3 d-flex gap-2">
          <button 
            className="btn btn-primary" 
            onClick={() => handleSync(googleFiles)}
            disabled={isSyncing || googleFiles.length === 0}>
            🔄 Sincronizar Tudo
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleSync(googleFiles.filter(f => selectedFiles.includes(f.id)))}
            disabled={isSyncing || selectedFiles.length === 0}>
            ✔️ Sincronizar Selecionados
          </button>
          <button className="btn btn-outline-success" onClick={loadGoogleFiles}>Atualizar Lista</button>
        </div>
      )}

      {activeTab === 'azure' && (
         <button className="btn btn-outline-success mb-3" onClick={loadAzureFiles}>Atualizar Lista Blob</button>
      )}

      {/* Conteúdo das Abas */}
      <div className="row">
        <div className="col-md-8">
            <div className="card">
                <div className="card-header">
                    Arquivos ({activeTab === 'google' ? 'Google Drive' : 'Azure Blob'})
                </div>
                <ul className="list-group list-group-flush">
                    {activeTab === 'google' ? (
                        googleFiles.map(file => (
                            <li key={file.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input me-2"
                                        checked={selectedFiles.includes(file.id)}
                                        onChange={() => handleSelectFile(file.id)}
                                    />
                                    {file.name} <small className="text-muted">({file.size || 'N/A'})</small>
                                </div>
                                {file.status === 'synced' && <span className="badge bg-success">✅ Sincronizado com Blob</span>}
                            </li>
                        ))
                    ) : (
                        azureFiles.map(file => (
                            <li key={file.id} className="list-group-item">
                                📄 {file.name} <small className="text-muted">({file.size})</small>
                            </li>
                        ))
                    )}
                    {((activeTab === 'google' && googleFiles.length === 0) || 
                      (activeTab === 'azure' && azureFiles.length === 0)) && 
                        <li className="list-group-item text-center text-muted">Nenhum arquivo encontrado.</li>
                    }
                </ul>
            </div>
        </div>

        {/* Console de Logs */}
        <div className="col-md-4">
            <div className="card bg-dark text-white" style={{height: '400px'}}>
                <div className="card-header">🖥️ Console Logs</div>
                <div className="card-body" style={{overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem'}}>
                    {logs.map((log, idx) => (
                        <div key={idx} className="mb-1 border-bottom border-secondary pb-1">
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;