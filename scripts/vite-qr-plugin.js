import qrcode from 'qrcode-terminal';
import { networkInterfaces } from 'os';

function getLocalIP() {
    const nets = networkInterfaces();
    const preferredIPs = [];
    const fallbackIPs = [];
    
    // Collect all valid IPs
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Check for IPv4 (both 'IPv4' string and numeric 4)
            const isIPv4 = net.family === 'IPv4' || net.family === 4;
            
            if (isIPv4 && !net.internal) {
                const nameLower = name.toLowerCase();
                const ip = net.address;
                
                // Skip link-local addresses
                if (ip.startsWith('169.254.')) continue;
                
                // Prefer Wi-Fi, Ethernet, Wireless, LAN
                if (nameLower.includes('wi-fi') || 
                    nameLower.includes('ethernet') ||
                    nameLower.includes('wireless') ||
                    nameLower.includes('lan') ||
                    nameLower.includes('wlan')) {
                    preferredIPs.push(ip);
                } else {
                    fallbackIPs.push(ip);
                }
            }
        }
    }
    
    // Return preferred IP first, then fallback
    if (preferredIPs.length > 0) {
        return preferredIPs[0];
    }
    if (fallbackIPs.length > 0) {
        return fallbackIPs[0];
    }
    
    return null;
}

function displayQRCode(url, isUpdate = false) {
    if (isUpdate) {
        console.log('\n');
        console.log('🔄 IP mudou! Novo QR Code:');
    } else {
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║              📱 QR CODE PARA ACESSO MOBILE            ║');
        console.log('╚════════════════════════════════════════════════════════╝');
    }
    console.log(`\n🔗 URL: ${url}`);
    console.log(`   📋 Copie e cole no navegador do celular para testar\n`);
    
    qrcode.generate(url, { small: true }, function (qrcode) {
        console.log(qrcode);
        if (!isUpdate) {
            const port = url.split(':').pop() || '8080';
            console.log('\n💡 INSTRUÇÕES:');
            console.log('   1. Escaneie o QR code acima com a câmera do celular');
            console.log('   2. Certifique-se de que o celular está na mesma rede Wi-Fi');
            console.log(`   3. Se o QR code não funcionar, digite manualmente: ${url}`);
            console.log(`\n✅ STATUS:`);
            console.log(`   • Firewall configurado para porta ${port}`);
            console.log(`   • Servidor aceitando conexões externas`);
            console.log(`\n🔧 Se não funcionar, verifique:`);
            console.log(`   • Teste no PC primeiro: ${url}`);
            console.log(`   • Celular está na mesma rede Wi-Fi`);
            console.log(`   • Alguns roteadores isolam dispositivos - verifique configurações`);
        }
        console.log('\n');
    });
}

export function viteQRCodePlugin() {
    let currentIP = null;
    let intervalId = null;
    let displayed = false;

    function updateQRCode(port, isUpdate = false) {
        const ip = getLocalIP();
        
        if (!ip) {
            if (!displayed) {
                console.log('\n⚠️  Não foi possível detectar o IP da rede local');
                console.log('   O QR code não será exibido.\n');
                displayed = true;
            }
            return;
        }
        
        // Always display on first run, or if IP changed
        if (!displayed || (ip !== currentIP)) {
            currentIP = ip;
            const url = `http://${ip}:${port}`;
            displayQRCode(url, isUpdate && displayed);
            displayed = true;
        }
    }

    return {
        name: 'vite-qrcode-plugin',
        configureServer(server) {
            server.httpServer?.once('listening', () => {
                const address = server.httpServer.address();
                
                if (typeof address === 'object' && address) {
                    const port = address.port;
                    
                    // Wait a bit longer to ensure server is fully ready
                    setTimeout(() => {
                        updateQRCode(port);
                    }, 1000);
                    
                    // Monitor IP changes every 5 seconds
                    intervalId = setInterval(() => {
                        updateQRCode(port, true);
                    }, 5000);
                } else if (typeof address === 'string') {
                    // Handle string address format
                    const port = address.split(':').pop() || 8080;
                    setTimeout(() => {
                        updateQRCode(port);
                    }, 1000);
                }
            });
            
            // Cleanup on server close
            server.httpServer?.on('close', () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            });
        },
    };
}
