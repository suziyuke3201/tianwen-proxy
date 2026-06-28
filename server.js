const WebSocket = require('ws');
const http = require('http');

// 火山引擎配置（请勿修改）
const ASR_APP_ID = process.env.ASR_APP_ID || '8379243362';
const ASR_TOKEN = process.env.ASR_TOKEN || 'aTPXhgc0dg3m2SZdhvkiYdkxnqqZYOKa';
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>天问语音代理运行中</h1><p>请通过 WebSocket 连接。</p>');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
    console.log('客户端已连接');

    // 通知客户端代理已连接
    clientWs.send(JSON.stringify({ type: 'proxy_status', data: '代理已连接，正在连接火山引擎...' }));

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
        clientWs.send(JSON.stringify({ type: 'proxy_status', data: '火山引擎已连接，可以开始说话' }));
    });

    volcanoWs.on('message', (data) => {
        // 将火山引擎的响应原封不动转发给浏览器
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data.toString());
        }
    });

    clientWs.on('message', (data) => {
        // 将浏览器的音频数据转发给火山引擎
        if (volcanoWs.readyState === WebSocket.OPEN) {
            volcanoWs.send(data.toString());
        }
    });

    clientWs.on('close', () => {
        console.log('客户端断开');
        volcanoWs.close();
    });

    volcanoWs.on('close', (code, reason) => {
        console.log(`火山引擎断开: ${code} ${reason}`);
        clientWs.send(JSON.stringify({ type: 'proxy_status', data: `火山引擎断开: ${code} ${reason}` }));
        clientWs.close();
    });

    volcanoWs.on('error', (err) => {
        console.error('火山引擎错误:', err.message);
        clientWs.send(JSON.stringify({ type: 'error', data: `火山引擎错误: ${err.message}` }));
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
