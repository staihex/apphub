import React, { useState, useRef } from 'react';
import { AudioOutlined, CloudUploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Button, message, Upload } from 'antd';
import { request } from '../services/request';

type UploadCallback = (url: string) => void;
const { Dragger } = Upload;
const App: React.FC<{ onUploadSuccess?: UploadCallback }> = ({ onUploadSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const props: UploadProps = {
    name: 'file',
    fileList: fileList,
    maxCount: 1,
    multiple: true,
    onChange(info) {
      const { status } = info.file;
      if (status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (status === 'done') {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
    onRemove(file) {
      setFileList((prevFileList) =>
        prevFileList.filter((prevFile) => prevFile.uid !== file.uid)
      );
    },
    beforeUpload: async (file) => {
      console.log('before upload', file);

      // 获取上传签名 URL
      const url = 'https://test.staihex.com/for_app_http_v1/api/common/cloudstorage/sign';
      const options = {
        method: 'POST',
        data: {
          file_name: `temp/20240218/${file.name}`,
          content_type: file.type,
          provider: 'aliyun',
        },
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await request<any>(url, options);
        const response = await result.json()
        const uploadUrl = response.data.url; // 假设返回的 URL 在 response.data.url 中

        // 使用签名 URL 上传文件
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT', // 或 POST，根据接口要求
          body: file, // 直接上传文件
          headers: {
            'Content-Type': file.type, // 设置文件类型
          },
        });

        if (uploadResponse.ok) {
          message.success(`${file.name} 文件上传成功`);
          setFileList([file]);
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          onUploadSuccess && onUploadSuccess(`https://staihex.oss-cn-shenzhen.aliyuncs.com/temp/20240218/${file.name}`);
          return false; // 阻止 Ant Design 的默认上传行为
        } else {
          message.error(`${file.name} 文件上传失败`);
          return false; // 阻止 Ant Design 的默认上传行为
        }
      } catch (error) {
        console.error('获取签名 URL 或上传文件失败:', error);
        message.error('文件上传失败');
        return false; // 阻止 Ant Design 的默认上传行为
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const encodeWAV = (samples: Uint8Array, sampleRate: number, bitDepth: number, channels: number): Blob => {
    const bytesPerSample = bitDepth / 8;
    const byteLength = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + byteLength); // 44 字节的 WAV 头 + 音频数据
    const view = new DataView(buffer);
  
    // 填充 WAV 头
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
  
    // RIFF 头
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + byteLength, true); // 文件大小
    writeString(8, 'WAVE');
    writeString(12, 'fmt '); // 格式
    view.setUint32(16, 16, true); // 子块大小
    view.setUint16(20, 1, true); // 压缩代码（PCM）
    view.setUint16(22, channels, true); // 声道数
    view.setUint32(24, sampleRate, true); // 采样率
    view.setUint32(28, sampleRate * channels * bytesPerSample, true); // 数据速率
    view.setUint16(32, channels * bytesPerSample, true); // 每个采样的字节数
    view.setUint16(34, bitDepth, true); // 每个采样的位数
    writeString(36, 'data');
    view.setUint32(40, byteLength, true); // 数据块大小
  
    // 音频数据
    const audioData = new Uint8Array(buffer, 44, byteLength);
    audioData.set(samples);
  
    return new Blob([buffer], { type: 'audio/wav' });
  };
  

  // 开始录音
  const startRecording = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = {
        audio: {
          channelCount: 1, // 单声道
          sampleRate: 16000, // 采样率设置为16000 Hz
          sampleSize: 16, // 采样位数为16bit
          echoCancellation: true, // 回音消除
          noiseSuppression: true // 降噪
        }
      };
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          mediaRecorder.start();
          setIsRecording(true);
        })
        .catch((error) => {
          console.error('录音失败:', error);
          message.error('录音失败，请检查权限设置');
        });
    } else {
      message.error('当前浏览器不支持录音功能');
    }
  };

  // 停止录音并上传
  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
  
        // 使用 AudioContext 解码音频数据
        const audioContext = new AudioContext();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
        // 提取 PCM 数据
        const pcmData = audioBuffer.getChannelData(0); // 获取单声道数据
        const pcmBytes = new Uint8Array(pcmData.length * 2); // 16-bit PCM
        for (let i = 0; i < pcmData.length; i++) {
          const sample = Math.max(-1, Math.min(1, pcmData[i])); // 限制采样值在 [-1, 1] 范围内
          const int16 = sample < 0 ? sample * 32768 : sample * 32767; // 转换为 16-bit 整数
          pcmBytes[i * 2] = int16 & 0xff; // 低位字节
          pcmBytes[i * 2 + 1] = (int16 >> 8) & 0xff; // 高位字节
        }
  
        // 生成 WAV 文件
        const wavBlob = encodeWAV(pcmBytes, audioBuffer.sampleRate, 16, 1);
  
        // 生成 WAV 文件并上传
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const file: any = new File([wavBlob], `recorded_${Date.now()}.wav`, { type: 'audio/wav' });
        file.uid = Date.now().toString();
        setFileList([file]);
        handleUpload(file);
  
        audioChunksRef.current = []; // 清空音频数据
      };
    }
  };

  // 收到好友从远方寄来的生日礼物,那份意外的惊喜与深深的祝福让我心中充满了甜蜜的快乐,笑容如花儿般绽放。
  // 处理录音文件上传
  const handleUpload = async (file: File) => {
    const url = 'https://test.staihex.com/for_app_http_v1/api/common/cloudstorage/sign';
    const options = {
      method: 'POST',
      data: {
        file_name: `temp/20240218/${file.name}`,
        content_type: file.type,
        provider: 'aliyun',
      },
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request<any>(url, options);
      const data = await response.json();
      const uploadUrl = data.data.url; // 假设返回的 URL 在 response.data.url 中

      // 使用签名 URL 上传文件
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT', // 或 POST，根据接口要求
        body: file, // 直接上传文件
        headers: {
          'Content-Type': file.type, // 设置文件类型
        },
      });

      if (uploadResponse.ok) {
        message.success(`${file.name} 文件上传成功`);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        onUploadSuccess && onUploadSuccess(`https://staihex.oss-cn-shenzhen.aliyuncs.com/temp/20240218/${file.name}`);
      } else {
        message.error(`${file.name} 文件上传失败`);
      }
    } catch (error) {
      console.error('获取签名 URL 或上传文件失败:', error);
      message.error('文件上传失败');
    }
  };

  return (
    <div>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p>上传音频文件，或点击下方按钮录制音频</p>
        <Button
          type="primary"
          icon={<AudioOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            startRecording()
          }}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          disabled={isRecording}
        >
          {isRecording ? '松开停止录音' : '按住开始录音'}
        </Button>
      </Dragger>
    </div>
  );
};

export default App;