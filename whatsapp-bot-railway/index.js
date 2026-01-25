// Importar crypto do Node.js (necessário para Baileys)
import crypto from 'crypto';
import { webcrypto } from 'crypto';

// Garantir que crypto esteja disponível globalmente
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}
if (typeof global.crypto === 'undefined') {
  global.crypto = webcrypto;
}

// Importação correta do Baileys v6 - usando default export
import pkg from '@whiskeysockets/baileys';
const makeWASocket = pkg.default || pkg;
import { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { rm } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ==================== CORS MIDDLEWARE ====================
// DEVE estar ANTES de todas as rotas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-api-key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'testdaapi2026';

// Logger
const logger = pino({ level: 'info' });

// Store para múltiplas sessões
const sessions = new Map();

// #region agent log - Anti-race-condition lock
let isConnecting = false;
let reconnectTimer = null;
// #endregion

// Função para criar/obter socket WhatsApp
async function getWhatsAppSocket(sessionId = 'default') {
  // #region agent log - Check if already connected
  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (session.socket && session.socket.user) {
      console.log('[DEBUG-LOCK-1] Socket já conectado, retornando existente:', session.socket.user.id);
      return session.socket;
    }
  }
  
  // Anti-race-condition: prevenir múltiplas conexões simultâneas
  if (isConnecting) {
    console.log('[DEBUG-LOCK-2] Conexão já em andamento, ignorando chamada duplicada');
    const existingSession = sessions.get(sessionId);
    if (existingSession?.socket) {
      return existingSession.socket;
    }
    return null;
  }
  
  // Limpar timer de reconexão pendente
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    console.log('[DEBUG-LOCK-3] Timer de reconexão anterior cancelado');
  }
  
  isConnecting = true;
  console.log('[DEBUG-LOCK-4] Iniciando nova conexão (lock ativado)');
  // #endregion

  try {
    console.log('[DEBUG-INIT-1] Carregando estado de autenticação...');
    const { state, saveCreds } = await useMultiFileAuthState(
      join(__dirname, 'auth_info', sessionId)
    );
    console.log('[DEBUG-INIT-2] Estado carregado. Buscando versão do Baileys...');

    const { version } = await fetchLatestBaileysVersion();
    console.log('[DEBUG-INIT-3] Versão obtida:', version, '- Criando socket...');
    
    const socket = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: state,
      logger,
      browser: ['Barbearia Bot', 'Chrome', '1.0.0'],
    });
    console.log('[DEBUG-INIT-4] Socket criado com sucesso!');

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // #region agent log
    console.log('[DEBUG-CONN-1] connection.update recebido:', {
      connection,
      hasQr: !!qr,
      hasLastDisconnect: !!lastDisconnect,
      timestamp: new Date().toISOString(),
    });
    // #endregion

    if (qr) {
      const qrTimestamp = Date.now();
      console.log('QR Code gerado!');
      qrcode.generate(qr, { small: true });
      
      if (sessions.has(sessionId)) {
        sessions.get(sessionId).qrCode = qr;
        sessions.get(sessionId).qrTimestamp = qrTimestamp;
      }
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const isBoomError = error && typeof error === 'object' && 'output' in error;
      const statusCode = isBoomError ? error.output?.statusCode : null;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      // #region agent log
      console.log('[DEBUG-CONN-2] Conexão FECHADA:', {
        statusCode,
        shouldReconnect,
        errorMessage: error?.message,
        isBoomError,
        mainSocketUserBefore: mainSocket?.user?.id || null,
      });
      // #endregion

      console.log('Conexão fechada, reconectando:', shouldReconnect);

      sessions.delete(sessionId);
      if (sessionId === 'default') {
        mainSocket = null;
        // #region agent log
        console.log('[DEBUG-CONN-3] mainSocket definido como NULL');
        // #endregion
      }

      if (shouldReconnect) {
        // #region agent log - Usar reconnectTimer para evitar múltiplos timers
        isConnecting = false; // Liberar lock antes de agendar reconexão
        console.log('[DEBUG-CONN-4] Agendando reconexão após 3s (lock liberado)');
        
        // Cancelar timer anterior se existir
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          console.log('[DEBUG-CONN-4b] Executando reconexão agendada');
          getWhatsAppSocket(sessionId);
        }, 3000);
        // #endregion
      } else {
        // Não vai reconectar, liberar lock
        isConnecting = false;
        console.log('[DEBUG-CONN-4c] Não reconectará (loggedOut), lock liberado');
      }
    } else if (connection === 'open') {
      // #region agent log - Liberar lock quando conectar
      isConnecting = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      console.log('[DEBUG-CONN-5] Conexão ABERTA (lock liberado):', {
        socketUserId: socket?.user?.id,
        mainSocketBefore: mainSocket?.user?.id || null,
      });
      // #endregion
      
      console.log('WhatsApp conectado!');
      if (sessions.has(sessionId)) {
        sessions.get(sessionId).qrCode = null;
      }
      
      if (sessionId === 'default') {
        mainSocket = socket;
        // #region agent log
        console.log('[DEBUG-CONN-6] mainSocket ATUALIZADO:', {
          newUserId: mainSocket?.user?.id,
        });
        // #endregion
        console.log('mainSocket atualizado! User:', mainSocket?.user?.id);
      }
    }
  });

  socket.ev.on('messages.upsert', (m) => {
    console.log('Mensagem recebida:', m);
  });

  sessions.set(sessionId, {
    socket,
    saveCreds,
    qrCode: null,
  });

  return socket;
  } catch (initError) {
    console.error('[DEBUG-INIT-ERROR] Erro ao inicializar socket:', {
      name: initError?.name,
      message: initError?.message,
      stack: initError?.stack?.substring(0, 500),
    });
    isConnecting = false;
    throw initError;
  }
}

// Inicializar socket principal
let mainSocket = null;
getWhatsAppSocket('default')
  .then((socket) => {
    mainSocket = socket;
    console.log('Bot inicializado!');
  })
  .catch((error) => {
    console.error('[STARTUP-ERROR] Erro ao inicializar bot:', error?.message || error);
    console.log('[STARTUP] Bot iniciará sem conexão WhatsApp. Use /instance/reset/default para conectar.');
  });

// ==================== API REST ====================

// Health check
app.get('/health', (req, res) => {
  // #region agent log
  const session = sessions.get('default');
  const healthData = {
    status: 'ok',
    connected: mainSocket?.user ? true : false,
    mainSocketUserId: mainSocket?.user?.id || null,
    sessionExists: !!session,
    sessionSocketUserId: session?.socket?.user?.id || null,
    timestamp: new Date().toISOString(),
  };
  console.log('[DEBUG-HEALTH] Health check:', healthData);
  // #endregion
  res.json(healthData);
});

// Listar instâncias
app.get('/instance/fetchInstances', (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const session = sessions.get('default');
  const socketFromSession = session?.socket;
  const isConnected = (mainSocket?.user || socketFromSession?.user) ? true : false;
  const phoneNumber = mainSocket?.user?.id?.split(':')[0] || socketFromSession?.user?.id?.split(':')[0] || null;
  
  console.log('[fetchInstances] Status:', { isConnected, phoneNumber, hasQrCode: !!session?.qrCode });
  
  const state = isConnected ? 'open' : session?.qrCode ? 'connecting' : 'close';
  
  res.json([{
    instanceName: 'default',
    instance: { instanceName: 'default', state, number: phoneNumber },
    status: state,
  }]);
});

// Criar instância
app.post('/instance/create', (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.body;
  if (instanceName && instanceName !== 'default') {
    return res.status(400).json({ error: 'Apenas instância "default" é suportada' });
  }

  if (mainSocket?.user) {
    return res.status(409).json({ error: 'Instância já existe' });
  }

  res.json({ success: true });
});

// Converter QR code string em base64 PNG
async function qrCodeToBase64(qrString) {
  try {
    const base64Image = await QRCode.toDataURL(qrString, {
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return base64Image;
  } catch (error) {
    console.error('Erro ao converter QR code para base64:', error);
    throw error;
  }
}

// Conectar e obter QR code
app.get('/instance/connect/:instanceName', async (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.params;
  if (instanceName !== 'default') {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  const session = sessions.get('default');
  
  if (mainSocket?.user) {
    return res.json({
      instance: {
        instanceName: 'default',
        state: 'open',
        number: mainSocket.user.id.split(':')[0],
      },
    });
  }

  if (session?.qrCode) {
    const qrAge = Date.now() - (session.qrTimestamp || 0);
    
    // QR codes do WhatsApp expiram em ~20 segundos
    // Usamos 5 segundos como limite para garantir que o usuário tenha tempo suficiente para escanear
    if (qrAge > 5000) {
      session.qrCode = null;
      session.qrTimestamp = null;
      // Não retorna o QR expirado, vai gerar um novo abaixo
    } else {
      try {
        const base64Image = await qrCodeToBase64(session.qrCode);
        return res.json({
          qrcode: { base64: base64Image, code: session.qrCode },
          instance: { instanceName: 'default', state: 'connecting' },
        });
      } catch (error) {
        console.error('Erro ao converter QR code:', error);
        return res.status(500).json({ error: 'Erro ao gerar imagem do QR code' });
      }
    }
  }

  // Gerar novo QR code
  getWhatsAppSocket('default').then(async () => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkQRCode = setInterval(async () => {
      attempts++;
      const updatedSession = sessions.get('default');
      
      if (updatedSession?.qrCode) {
        clearInterval(checkQRCode);
        try {
          const base64Image = await qrCodeToBase64(updatedSession.qrCode);
          res.json({
            qrcode: { base64: base64Image, code: updatedSession.qrCode },
            instance: { instanceName: 'default', state: 'connecting' },
          });
        } catch (error) {
          console.error('Erro ao converter QR code:', error);
          res.status(500).json({ error: 'Erro ao gerar imagem do QR code' });
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(checkQRCode);
        res.status(500).json({ error: 'Timeout ao gerar QR code' });
      }
    }, 500);
  });
});

// Enviar mensagem de texto
app.post('/message/sendText/:instanceName', async (req, res) => {
  // #region agent log
  console.log('[DEBUG-SEND-1] Requisição recebida em /message/sendText');
  // #endregion
  
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.params;
  if (instanceName !== 'default') {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  // #region agent log
  const session = sessions.get('default');
  console.log('[DEBUG-SEND-2] Estado do socket:', {
    hasMainSocket: !!mainSocket,
    hasMainSocketUser: !!mainSocket?.user,
    mainSocketUserId: mainSocket?.user?.id || null,
    hasSession: !!session,
    hasSessionSocket: !!session?.socket,
    hasSessionSocketUser: !!session?.socket?.user,
    sessionSocketUserId: session?.socket?.user?.id || null,
  });
  // #endregion

  if (!mainSocket?.user) {
    // #region agent log
    console.log('[DEBUG-SEND-3] mainSocket.user é null - REJEITANDO');
    // #endregion
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  const { number, text } = req.body;
  if (!number || !text) {
    return res.status(400).json({ error: 'number e text são obrigatórios' });
  }

  try {
    let phoneNumber = number.replace(/\D/g, '');
    phoneNumber = phoneNumber.replace(/@s\.whatsapp\.net/gi, '');
    
    if (!phoneNumber.includes('@')) {
      phoneNumber = `${phoneNumber}@s.whatsapp.net`;
    }

    // #region agent log
    console.log('[DEBUG-SEND-4] Preparando envio:', {
      phoneNumber,
      textLength: text.length,
      textPreview: text.substring(0, 50),
    });
    // #endregion

    console.log(`[Railway Bot] Enviando para: ${phoneNumber}`);
    console.log(`[Railway Bot] Mensagem: ${text.substring(0, 100)}...`);

    // #region agent log
    console.log('[DEBUG-SEND-5] Chamando mainSocket.sendMessage...');
    const sendStartTime = Date.now();
    // #endregion

    const result = await mainSocket.sendMessage(phoneNumber, { text });
    
    // #region agent log
    const sendDuration = Date.now() - sendStartTime;
    console.log('[DEBUG-SEND-6] sendMessage completado:', {
      durationMs: sendDuration,
      hasResult: !!result,
      resultKeys: result ? Object.keys(result) : [],
      messageId: result?.key?.id || null,
    });
    // #endregion
    
    console.log(`[Railway Bot] Mensagem enviada!`, result);

    res.json({ success: true, message: 'Mensagem enviada', result });
  } catch (error) {
    // #region agent log
    console.log('[DEBUG-SEND-ERROR] Erro ao enviar:', {
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack?.substring(0, 500),
    });
    // #endregion
    console.error('[Railway Bot] Erro:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Erro ao enviar mensagem',
    });
  }
});

// Force Reset - Limpa sessão e arquivos de autenticação para permitir novo QR code
app.post('/instance/reset/:instanceName', async (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.params;
  if (instanceName !== 'default') {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  console.log('[RESET] Iniciando reset forçado da sessão...');

  try {
    // 1. Cancelar timer de reconexão
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      console.log('[RESET] Timer de reconexão cancelado');
    }

    // 2. Liberar lock de conexão
    isConnecting = false;

    // 3. Tentar fazer logout se houver socket
    if (mainSocket) {
      try {
        await mainSocket.logout();
        console.log('[RESET] Logout realizado');
      } catch (logoutErr) {
        console.log('[RESET] Erro no logout (ignorado):', logoutErr.message);
      }
      mainSocket = null;
    }

    // 4. Limpar sessão
    sessions.delete('default');
    console.log('[RESET] Sessão limpa');

    // 5. Deletar pasta de autenticação
    const authPath = join(__dirname, 'auth_info', 'default');
    try {
      await rm(authPath, { recursive: true, force: true });
      console.log('[RESET] Pasta auth_info/default deletada');
    } catch (rmErr) {
      console.log('[RESET] Pasta auth_info não existia ou erro ao deletar:', rmErr.message);
    }

    // 6. Aguardar um pouco para garantir limpeza
    await new Promise(resolve => setTimeout(resolve, 500));

    // 7. Iniciar nova conexão e aguardar QR code
    console.log('[RESET] Iniciando nova conexão (aguardando QR code)...');
    
    // Await the socket creation
    await getWhatsAppSocket('default');
    
    // Aguardar até 30 segundos pelo QR code
    let attempts = 0;
    const maxAttempts = 60; // 60 × 500ms = 30 segundos
    
    const waitForQR = () => new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        attempts++;
        const session = sessions.get('default');
        
        console.log(`[RESET] Aguardando QR code... tentativa ${attempts}/${maxAttempts}, hasQR: ${!!session?.qrCode}`);
        
        if (session?.qrCode) {
          clearInterval(checkInterval);
          resolve({ qrCode: session.qrCode });
        } else if (mainSocket?.user) {
          clearInterval(checkInterval);
          resolve({ connected: true, number: mainSocket.user.id.split(':')[0] });
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve({ timeout: true });
        }
      }, 500);
    });
    
    const result = await waitForQR();
    
    if (result.qrCode) {
      const base64Image = await qrCodeToBase64(result.qrCode);
      console.log('[RESET] QR code gerado com sucesso!');
      return res.json({ 
        success: true, 
        message: 'Reset realizado e QR code gerado!',
        qrcode: { base64: base64Image, code: result.qrCode },
        instance: { instanceName: 'default', state: 'connecting' }
      });
    } else if (result.connected) {
      console.log('[RESET] Bot já conectado:', result.number);
      return res.json({ 
        success: true, 
        message: 'Reset realizado e bot já conectado!',
        instance: { instanceName: 'default', state: 'open', number: result.number }
      });
    } else {
      console.log('[RESET] Timeout aguardando QR code');
      return res.json({ 
        success: true, 
        message: 'Reset realizado mas QR code não foi gerado a tempo. Tente /instance/connect/default',
        timeout: true
      });
    }
  } catch (error) {
    console.error('[RESET] Erro:', error);
    res.status(500).json({ error: error.message || 'Erro ao resetar sessão' });
  }
});

// Logout
app.delete('/instance/logout/:instanceName', async (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.params;
  if (instanceName !== 'default') {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  try {
    if (mainSocket) {
      await mainSocket.logout();
      sessions.delete('default');
      mainSocket = null;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro ao desconectar' });
  }
});

// Deletar instância
app.delete('/instance/delete/:instanceName', async (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.params;
  if (instanceName !== 'default') {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  try {
    if (mainSocket) {
      await mainSocket.logout();
    }
    sessions.delete('default');
    mainSocket = null;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro ao deletar instância' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`WhatsApp Bot rodando na porta ${PORT}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
