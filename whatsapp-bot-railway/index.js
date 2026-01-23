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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'testdaapi2026'; // Mesma chave da Evolution API para compatibilidade

// Logger
const logger = pino({ level: 'info' });

// Store para múltiplas sessões (se necessário no futuro)
const sessions = new Map();

// Função para criar/obter socket WhatsApp
async function getWhatsAppSocket(sessionId = 'default') {
  // Se já existe uma sessão ativa, retornar
  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (session.socket && session.socket.user) {
      return session.socket;
    }
  }

  // Criar nova sessão
  const { state, saveCreds } = await useMultiFileAuthState(
    join(__dirname, 'auth_info', sessionId)
  );

  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger,
    browser: ['Barbearia Bot', 'Chrome', '1.0.0'],
  });

  // Salvar credenciais quando atualizadas
  socket.ev.on('creds.update', saveCreds);

  // Eventos de conexão
  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR Code gerado!');
      qrcode.generate(qr, { small: true });
      
      // Armazenar QR code para API
      if (sessions.has(sessionId)) {
        sessions.get(sessionId).qrCode = qr;
      }
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const isBoomError = error && typeof error === 'object' && 'output' in error;
      const statusCode = isBoomError ? error.output?.statusCode : null;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        'Conexão fechada devido a ',
        lastDisconnect?.error,
        ', reconectando ',
        shouldReconnect
      );

      if (shouldReconnect) {
        // Reconectar após 5 segundos
        setTimeout(() => {
          sessions.delete(sessionId);
          getWhatsAppSocket(sessionId);
        }, 5000);
      } else {
        // Sessão expirada, remover
        sessions.delete(sessionId);
      }
      
      // Atualizar mainSocket quando desconecta
      if (sessionId === 'default') {
        mainSocket = null;
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado!');
      if (sessions.has(sessionId)) {
        sessions.get(sessionId).qrCode = null;
      }
      
      // Atualizar mainSocket quando conecta
      if (sessionId === 'default') {
        mainSocket = socket;
        console.log('✅ mainSocket atualizado! User:', mainSocket?.user?.id);
      }
    }
  });

  // Eventos de mensagens recebidas (opcional, para debug)
  socket.ev.on('messages.upsert', (m) => {
    console.log('Mensagem recebida:', m);
  });

  // Armazenar sessão
  sessions.set(sessionId, {
    socket,
    saveCreds,
    qrCode: null,
  });

  return socket;
}

// Inicializar socket principal
let mainSocket = null;
getWhatsAppSocket('default').then((socket) => {
  mainSocket = socket;
  console.log('Bot inicializado!');
});

// ==================== API REST ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connected: mainSocket?.user ? true : false });
});

// Listar instâncias (compatibilidade com Evolution API)
app.get('/instance/fetchInstances', (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // Verificar conexão de múltiplas formas para garantir detecção
  const session = sessions.get('default');
  const socketFromSession = session?.socket;
  const isConnected = (mainSocket?.user || socketFromSession?.user) ? true : false;
  const phoneNumber = mainSocket?.user?.id?.split(':')[0] || socketFromSession?.user?.id?.split(':')[0] || null;
  
  // Log para debug
  console.log('[fetchInstances] Status check:', {
    hasMainSocket: !!mainSocket,
    hasMainSocketUser: !!mainSocket?.user,
    hasSessionSocket: !!socketFromSession,
    hasSessionSocketUser: !!socketFromSession?.user,
    isConnected,
    phoneNumber,
    hasQrCode: !!session?.qrCode,
  });
  
  const state = isConnected ? 'open' : session?.qrCode ? 'connecting' : 'close';
  
  res.json([
    {
      instanceName: 'default',
      instance: {
        instanceName: 'default',
        state: state,
        number: phoneNumber,
      },
      status: state,
    },
  ]);
});

// Criar instância (compatibilidade)
app.post('/instance/create', (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.body;
  if (instanceName && instanceName !== 'default') {
    return res.status(400).json({ error: 'Apenas instância "default" é suportada' });
  }

  // Se já existe, retornar 409 (como Evolution API)
  if (mainSocket?.user) {
    return res.status(409).json({ error: 'Instância já existe' });
  }

  res.json({ success: true });
});

// Função auxiliar para converter QR code string em base64 PNG
async function qrCodeToBase64(qrString) {
  try {
    // Converter QR code string em imagem PNG base64
    const base64Image = await QRCode.toDataURL(qrString, {
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return base64Image; // Já vem com prefixo "data:image/png;base64,"
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
    try {
      // Converter QR code string para base64 PNG
      const base64Image = await qrCodeToBase64(session.qrCode);
      return res.json({
        qrcode: {
          base64: base64Image,
          code: session.qrCode,
        },
        instance: {
          instanceName: 'default',
          state: 'connecting',
        },
      });
    } catch (error) {
      console.error('Erro ao converter QR code:', error);
      return res.status(500).json({ error: 'Erro ao gerar imagem do QR code' });
    }
  }

  // Gerar novo QR code
  getWhatsAppSocket('default').then(async () => {
    // Aguardar até que o QR code seja gerado (máximo 10 segundos)
    let attempts = 0;
    const maxAttempts = 20; // 20 tentativas de 500ms = 10 segundos
    
    const checkQRCode = setInterval(async () => {
      attempts++;
      const updatedSession = sessions.get('default');
      
      if (updatedSession?.qrCode) {
        clearInterval(checkQRCode);
        try {
          // Converter QR code string para base64 PNG
          const base64Image = await qrCodeToBase64(updatedSession.qrCode);
          res.json({
            qrcode: {
              base64: base64Image,
              code: updatedSession.qrCode,
            },
            instance: {
              instanceName: 'default',
              state: 'connecting',
            },
          });
        } catch (error) {
          console.error('Erro ao converter QR code:', error);
          res.status(500).json({ error: 'Erro ao gerar imagem do QR code' });
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(checkQRCode);
        res.status(500).json({ error: 'Timeout ao gerar QR code' });
      }
    }, 500); // Verificar a cada 500ms
  });
});

// Enviar mensagem de texto
app.post('/message/sendText/:instanceName', async (req, res) => {
  const apiKey = req.headers.apikey;
  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { instanceName } = req.params;
  if (instanceName !== 'default') {
    return res.status(404).json({ error: 'Instância não encontrada' });
  }

  if (!mainSocket?.user) {
    return res.status(400).json({ error: 'WhatsApp não está conectado' });
  }

  const { number, text } = req.body;
  if (!number || !text) {
    return res.status(400).json({ error: 'number e text são obrigatórios' });
  }

  try {
    // Formatar número (adicionar @s.whatsapp.net se necessário)
    let phoneNumber = number.replace(/\D/g, '');
    
    // Remover @s.whatsapp.net se já estiver presente (evitar duplicação)
    phoneNumber = phoneNumber.replace(/@s\.whatsapp\.net/gi, '');
    
    // Adicionar @s.whatsapp.net se não tiver
    if (!phoneNumber.includes('@')) {
      phoneNumber = `${phoneNumber}@s.whatsapp.net`;
    }

    console.log(`[Railway Bot] Enviando mensagem para: ${phoneNumber}`);
    console.log(`[Railway Bot] Mensagem (${text.length} caracteres): ${text.substring(0, 100)}...`);
    console.log(`[Railway Bot] Socket conectado:`, !!mainSocket?.user);
    console.log(`[Railway Bot] Socket user ID:`, mainSocket?.user?.id);

    const result = await mainSocket.sendMessage(phoneNumber, { text });
    
    console.log(`[Railway Bot] Mensagem enviada com sucesso!`, result);

    res.json({ success: true, message: 'Mensagem enviada', result });
  } catch (error) {
    console.error('[Railway Bot] Erro ao enviar mensagem:', error);
    console.error('[Railway Bot] Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Erro ao enviar mensagem',
      details: error.toString()
    });
  }
});

// Logout (desconectar)
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
    
    // TODO: Deletar pasta auth_info/default
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro ao deletar instância' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Bot rodando na porta ${PORT}`);
  console.log(`📱 API Key: ${API_KEY}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
