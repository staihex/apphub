
export function getBase64(file: any) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e: any) {
            resolve(e.target.result);
        };
        reader.onerror = function (error) {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

export function splitText(text: string) {
    // 使用正则表达式分割文本并保留分隔符
    const segments = text.split(/([。！？\?；])\s*/g).filter(Boolean);

    // 将每个标点符号和前面的句子合并成一个完整的段落
    const combinedSegments: string[] = [];
    for (let i = 0; i < segments.length; i++) {
        if (/[。！？\?；]/.test(segments[i])) {
            // 合并标点符号和前一个段落
            combinedSegments[combinedSegments.length - 1] += segments[i];
        } else {
            // 新的一段
            combinedSegments.push(segments[i]);
        }
    }
    return combinedSegments;
}

export function decodeAndPlayAudioNew(
    data: Uint8Array,
    sampleRate: number,
    numChannels: number,
    bytesPerSample: number,
    context: AudioContext,
    startTime: number // 传入当前播放时间点
) {
    const frames = data.length / (numChannels * bytesPerSample);
    if (frames <= 0) return startTime;

    const newBuffer = context.createBuffer(numChannels, frames, sampleRate);
    const channelData = newBuffer.getChannelData(0);

    // **修正 Int16 数据转换**
    const audioData = new Int16Array(data.buffer, data.byteOffset, data.length / bytesPerSample);
    for (let i = 0; i < frames; i++) {
        channelData[i] = Math.max(-1, Math.min(1, audioData[i] / 32768)); // 限制范围 [-1,1]
    }

    const source = context.createBufferSource();
    source.buffer = newBuffer;

    // 使用 GainNode 平滑过渡
    const gainNode = context.createGain();
    source.connect(gainNode);
    gainNode.connect(context.destination);

    // 控制音量渐变，先淡出之前音频，再淡入当前音频
    const playTime = Math.max(context.currentTime, startTime); // 确保音频顺序播放

    // 逐渐增加音量
    gainNode.gain.setValueAtTime(0, playTime); // 音量从0开始
    gainNode.gain.linearRampToValueAtTime(1, playTime + 0.05); // 0.05秒内从0到1

    source.start(playTime);

    // 结束时渐弱音量
    gainNode.gain.setValueAtTime(1, playTime + newBuffer.duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, playTime + newBuffer.duration); // 0.05秒内渐变为0

    return playTime + newBuffer.duration; // 返回新的播放时间点
}

export function decodeAndPlayAudio(
    data: Uint8Array,
    sampleRate: number,
    numChannels: number,
    bytesPerSample: number,
    context: AudioContext,
    startTime: number // 传入当前播放时间点
) {
    const frames = data.length / (numChannels * bytesPerSample);
    if (frames <= 0) return startTime;

    const newBuffer = context.createBuffer(numChannels, frames, sampleRate);
    const channelData = newBuffer.getChannelData(0);

    // **修正 Int16 数据转换**
    const audioData = new Int16Array(data.buffer, data.byteOffset, data.length / bytesPerSample);
    for (let i = 0; i < frames; i++) {
        channelData[i] = Math.max(-1, Math.min(1, audioData[i] / 32768)); // 限制范围 [-1,1]
    }

    const source = context.createBufferSource();
    source.buffer = newBuffer;
    source.connect(context.destination);

    // **让音频无缝拼接**
    const playTime = Math.max(context.currentTime, startTime); // 确保音频顺序播放
    source.start(playTime);

    return playTime + newBuffer.duration; // 返回新的播放时间点
};


export function addWavHeader(audioData: Uint8Array, sampleRate: number, numChannels: number, bitsPerSample: number) {
    // 创建 WAV 头部（RIFF + fmt + data）
    const header = new Uint8Array(44);

    // RIFF Header
    header.set([82, 73, 70, 70], 0); // "RIFF"
    const fileSize = 36 + audioData.length; // 文件总大小 - 8
    header.set(new Uint8Array(new Uint32Array([fileSize]).buffer), 4);

    header.set([87, 65, 86, 69], 8); // "WAVE"

    // fmt subchunk
    header.set([102, 109, 116, 32], 12); // "fmt "
    header.set(new Uint8Array(new Uint32Array([16]).buffer), 16); // Subchunk1 Size: 16
    header.set(new Uint8Array(new Uint16Array([1]).buffer), 20); // Audio Format: 1 (PCM)
    header.set(new Uint8Array(new Uint16Array([numChannels]).buffer), 22); // Num Channels
    header.set(new Uint8Array(new Uint32Array([sampleRate]).buffer), 24); // Sample Rate
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    header.set(new Uint8Array(new Uint32Array([byteRate]).buffer), 28); // Byte Rate
    const blockAlign = numChannels * (bitsPerSample / 8);
    header.set(new Uint8Array(new Uint16Array([blockAlign]).buffer), 32); // Block Align
    header.set(new Uint8Array(new Uint16Array([bitsPerSample]).buffer), 34); // Bits per Sample

    // data subchunk
    header.set([100, 97, 116, 97], 36); // "data"
    header.set(new Uint8Array(new Uint32Array([audioData.length]).buffer), 40); // Subchunk2 Size: 数据大小

    // 返回 WAV 文件，包含头部和音频数据
    return new Uint8Array([...header, ...audioData]);
}


export function concatUint8Arrays(a: Uint8Array, b: Uint8Array) {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
};
const context = new AudioContext();
export async function readAudio(reader: any) {

    if (!reader) throw new Error('Failed to get reader from response body');

    let accumulatedData = new Uint8Array(0);
    const sampleRate = 22050;
    const numChannels = 1;
    const bytesPerSample = 2;
    let currentTime = context.currentTime; // 记录当前播放时间点

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulatedData = concatUint8Arrays(accumulatedData, value);

        // 确保数据长度是 2 字节对齐
        if (accumulatedData.length % bytesPerSample !== 0) continue;

        // 实时播放当前累积的数据
        currentTime = decodeAndPlayAudio(accumulatedData, sampleRate, numChannels, bytesPerSample, context, currentTime);

        // 清空数据，准备接收新数据块
        accumulatedData = new Uint8Array(0);
    }
}

export function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600); // 计算小时
    const minutes = Math.floor((seconds % 3600) / 60); // 计算分钟
    const secs = Math.floor(seconds % 60); // 计算秒

    // 格式化为两位数，例如 01:02:03
    const pad = (num: number) => (num < 10 ? `0${num}` : num);

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

export function formatDuration1(duration: number) {
    const hours = Math.floor(duration / 36000);
    const minutes = Math.floor((duration % 36000) / 600);
    const seconds = Math.floor((duration % 600) / 10);

    const pad = (num: number) => (num < 10 ? `0${num}` : num);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    // return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};