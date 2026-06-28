const WebSocket = require('ws');
const http = require('http');

const ASR_APP_ID = process.env.ASR_APP_ID || '8379243362';
const ASR_TOKEN = process.env.ASR_TOKEN || 'aTPXhgc0dg3m2SZdhvkiYdkxnqqZYOKa';
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>天问语音代理运行中</h1>');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
    console.log('客户端已连接');
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

    let volcanoReady = false;

    volcanoWs.on('open', () => {
        console.log('火山引擎已连接，发送 start 消息');
        // 连接成功后立刻发送 start 消息（火山引擎要求的格式）
        const startMsg = JSON.stringify({
            type: 'start',
            data: {
                audio_format: 'pcm',
                sample_rate: 16000,
                bits: 16,
                channel: 1,
                language: 'zh-CN',
                model_name: 'bigmodel',
                enable_vad: true,
                vad_silence_time: 800
            }
        });
        volcanoWs.send(startMsg);
        volcanoReady = true;
        clientWs.send(JSON.stringify({ type: 'proxy_status', data: '火山引擎已连接，可以开始说话' }));
    });

    volcanoWs.on('message', (data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data.toString());
        }
    });

    clientWs.on('message', (data) => {
        // 只有在火山引擎就绪后才转发音频数据
        if (volcanoReady && volcanoWs.readyState === WebSocket.OPEN) {
            volcanoWs.send(data.toString());
        }
    });

    clientWs.on('close', () => {
        console.log('客户端断开');
        volcanoWs.close();
    });

    volcanoWs.on('close', (code, reason) => {
        console.log(`火山引擎断开: ${code} ${reason}`);
        clientWs.send(JSON.stringify({ type: 'proxy_status', data: `火山引擎断开: ${code}` }));
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
