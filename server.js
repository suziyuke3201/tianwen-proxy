const WebSocket = require('ws');
const http = require('http');

const ASR_APP_ID = process.env.ASR_APP_ID || '8379243362';
const ASR_TOKEN = process.env.ASR_TOKEN || 'aTPXhgc0dg3m2SZdhvkiYdkxnqqZYOKa';
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('天问语音代理运行中');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
    console.log('客户端已连接');

    const volcanoWs = new WebSocket(ASR_URL, {
        headers: {
            'X-Api-App-Key': ASR_APP_ID,
            'X-Api-Access-Key': ASR_TOKEN,
            'X-Api-Resource-Id': 'volc.seedasr.sauc.duration',
            'X-Api-Request-Id': generateUUID(),
            'X-Api-Sequence': '-1'
        }
    });

    volcanoWs.on('open', () => {
        console.log('火山引擎已连接');
    });

    volcanoWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data.toString());
        }
    });

    clientWs.on('message', (data) => {
        if (volcanoWs.readyState === WebSocket.OPEN) {
            volcanoWs.send(data.toString());
        }
    });

    clientWs.on('close', () => {
        volcanoWs.close();
    });

    volcanoWs.on('close', () => {
        clientWs.close();
    });

    volcanoWs.on('error', (err) => {
        console.error('火山引擎错误:', err.message);
        clientWs.close();
    });

    clientWs.on('error', (err) => {
        console.error('客户端错误:', err.message);
        volcanoWs.close();
    });
});

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`代理服务运行在端口 ${PORT}`);
});
