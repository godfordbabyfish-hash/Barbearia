import qrcode from 'qrcode-terminal';
import { networkInterfaces } from 'os';

function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                // Prefer Wi-Fi or Ethernet
                if (name.toLowerCase().includes('wi-fi') || 
                    name.toLowerCase().includes('ethernet') ||
                    name.toLowerCase().includes('wireless')) {
                    return net.address;
                }
            }
        }
    }
    // Fallback: get first non-internal IPv4
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
                return net.address;
            }
        }
    }
    return null;
}

function displayQRCode(ip, port = 8080) {
    const url = `http://${ip}:${port}`;
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              📱 QR CODE PARA ACESSO MOBILE            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n🔗 URL: ${url}\n`);
    
    qrcode.generate(url, { small: true }, function (qrcode) {
        console.log(qrcode);
        console.log('💡 Escaneie o QR code acima com seu celular');
        console.log('   (certifique-se de estar na mesma rede Wi-Fi)\n');
    });
}

// Detect IP and display QR code
const ip = getLocalIP();
if (ip) {
    displayQRCode(ip);
} else {
    console.log('⚠️  Não foi possível detectar o IP da rede local');
    console.log('   Use o IP manualmente no celular\n');
}
