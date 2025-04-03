import React, { useState, useRef, useEffect } from 'react';
import { AudioOutlined, CloudUploadOutlined, PaperClipOutlined, PlayCircleTwoTone } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Button, message, Modal, Skeleton, Typography, Upload } from 'antd';
import { request } from '../../services/request';
import { formatDuration, formatDuration1 } from '../../utils/utils';
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";

const { Text } = Typography
type UploadCallback = (url: string) => void;
const { Dragger } = Upload;
const CustomUpload: React.FC<{
  onUploadSuccess?: UploadCallback,
  type: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playAudioRef: React.RefObject<any>,
  handlePlayPause: () => void;
  prompt: string,
  playNewAudio: (url: string) => void;
}> = ({
  onUploadSuccess,
  type,
  playAudioRef,
  handlePlayPause,
  playNewAudio,
  prompt,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    // const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [duration, setDuration] = useState<number>(0);
    const [currentUrl, setCurrentUrl] = useState<string>('')
    const [isPlaying, setIsplaying] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wavesurferRef = useRef<any>(null); // 保存 WaveSurfer 实例
    const waveformRef = useRef(null); // 用于挂载波形容器的 ref
    const [recordingDuration, setRecordingDuration] = useState(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recordRef = useRef<any>(null); // 保存 RecordPlugin 实例
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, setDevices] = useState<any>([]); // 可用的麦克风设备
    const [selectedDevice, setSelectedDevice] = useState(""); // 当前选中的设备
    const [isUploading, setIsUploading] = useState(false)

    const props: UploadProps = {
      name: 'file',
      fileList: fileList,
      maxCount: 1,
      multiple: true,
      showUploadList: false,
      accept: 'audio/*',
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
        setIsUploading(true);
        if (file) {
          const reader = new FileReader();

          // 读取文件为 ArrayBuffer
          reader.readAsArrayBuffer(file);
          reader.onload = () => {
            const audioContext = new (window.AudioContext || window.AudioContext)();
            // 检查 reader.result 是否为 ArrayBuffer 类型
            if (reader.result instanceof ArrayBuffer) {
              audioContext.decodeAudioData(reader.result, (buffer) => {
                // 修改为使用正确的类型来设置 duration
                setDuration(buffer.duration as number);
              });
            };
          }
        }
        const dateStr = Date.now().toString();
        // 获取上传签名 URL
        const url = 'https://test.staihex.com/for_app_http_v1/api/common/cloudstorage/sign';
        const options = {
          method: 'POST',
          data: {
            file_name: `temp/${dateStr}/${file.name}`,
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
            setCurrentUrl(`https://staihex.oss-cn-shenzhen.aliyuncs.com/temp/${dateStr}/${file.name}`);
            setIsUploading(false)
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            onUploadSuccess && onUploadSuccess(`https://staihex.oss-cn-shenzhen.aliyuncs.com/temp/${dateStr}/${file.name}`);
            return false; // 阻止 Ant Design 的默认上传行为
          } else {
            setIsUploading(false)
            message.error(`${file.name} 文件上传失败`);
            return false; // 阻止 Ant Design 的默认上传行为
          }
        } catch (error) {
          setIsUploading(false)
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

    useEffect(() => {
      if (!waveformRef.current) return;
      if (!isModalOpen) return;
      // 创建 WaveSurfer 实例
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "rgba(36, 103, 255, 1)",
        progressColor: "rgba(36, 103, 255, 1)",
        barWidth: 6,
        barGap: 4,
        barRadius: 10,
        height: 50
      });
      // 初始化 RecordPlugin
      const record = wavesurfer.registerPlugin(
        RecordPlugin.create({
          scrollingWaveform: true, // 波形滚动
          renderRecordedAudio: false, // 不渲染录制的音频
        })
      );

      record.on('record-progress', (time: number) => {
        setRecordingDuration(time); // 更新录音时长
      });

      // 保存实例
      wavesurferRef.current = wavesurfer;
      recordRef.current = record;

      // 获取可用的麦克风设备
      RecordPlugin.getAvailableAudioDevices().then((devices) => {
        setDevices(devices);
        if (devices.length > 0) {
          setSelectedDevice(devices[0].deviceId); // 默认选择第一个设备
        }
      });

      // 组件卸载时销毁 WaveSurfer
      return () => {
        wavesurfer.destroy();
      };
    }, [isModalOpen]);


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
    const dateStr = Date.now().toString();
    // 处理录音文件上传
    const handleUpload = async (file: File) => {
      const url = 'https://test.staihex.com/for_app_http_v1/api/common/cloudstorage/sign';
      const options = {
        method: 'POST',
        data: {
          file_name: `temp/${dateStr}/${file.name}`,
          content_type: file.type,
          provider: 'aliyun',
        },
      };
      setIsUploading(true);
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
          if (file) {
            const reader = new FileReader();

            // 读取文件为 ArrayBuffer
            reader.readAsArrayBuffer(file);
            reader.onload = () => {
              const audioContext = new (window.AudioContext || window.AudioContext)();
              // 检查 reader.result 是否为 ArrayBuffer 类型
              if (reader.result instanceof ArrayBuffer) {
                audioContext.decodeAudioData(reader.result, (buffer) => {
                  // 修改为使用正确的类型来设置 duration
                  setDuration(buffer.duration as number);
                });
              };
            }
          }
          message.success(`${file.name} 文件上传成功`);
          setIsUploading(false)
          setCurrentUrl(`https://staihex.oss-cn-shenzhen.aliyuncs.com/temp/${dateStr}/${file.name}`);
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          onUploadSuccess && onUploadSuccess(`https://staihex.oss-cn-shenzhen.aliyuncs.com/temp/${dateStr}/${file.name}`);
        } else {
          setIsUploading(false)
          message.error(`${file.name} 文件上传失败`);
        }
      } catch (error) {
        setIsUploading(false)
        console.error('获取签名 URL 或上传文件失败:', error);
        message.error('文件上传失败');
      }
    };

    // 处理文件删除
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRemove = (file: any) => {
      const newFileList = fileList.filter((f) => f.uid !== file.uid);
      setFileList(newFileList);
    };

    // 开始/停止录音
    const handleStart = () => {
      const record = recordRef.current;
      if (!record.isRecording()) {
        record.startRecording({ deviceId: selectedDevice }).then(() => {
          startRecording();
          setIsRecording(true);
        });
      }
    };

    const handleStop = () => {
      const record = recordRef.current;
      if (record.isRecording()) {
        record.stopRecording();
        setIsRecording(false);
      }
      stopRecording();
    };


    // 独立的文件列表渲染组件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FileListRenderer = ({ fileList, onRemove }: any) => {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {fileList.map((file: File) => (
            <div style={{ margin: "8px 0", backgroundColor: '#F8F8FB', padding: '3px' }}>
              <span><PaperClipOutlined style={{ marginLeft: '8px', marginRight: '8px' }} />{file.name}</span>
              <span style={{ marginLeft: '24px', marginRight: '24px' }}>{formatDuration(duration)}</span>
              <PlayCircleTwoTone style={{ marginRight: '12px', fontSize:'18px' }} onClick={(e) => {

                e.stopPropagation()
                // 检查 file.originFileObj 是否存在，避免传入 undefined
                if (file) {
                  // 以下是原有的逻辑，根据实际情况补充
                  setIsplaying(!isPlaying);
                  if (playAudioRef.current === currentUrl) {
                    handlePlayPause(); // 播放/暂停当前音频
                  } else {
                    playNewAudio(currentUrl); // 播放新的音频
                  }
                }
              }} />
              <Button
                type="link"
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const audioElement: any = document.getElementById("audioPlayer");
                  audioElement.pause();
                  onRemove(file)
                }}
                style={{ color: "red" }}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div>
        {type == 1 && fileList.length == 0 && !isUploading && <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p>5秒~20秒音频即可，支持wav或mp3或m4a或ogg格式</p>
        </Dragger>
        }
        <Modal title="" open={isModalOpen} onClose={() => {
          if (isRecording) {
            const record = recordRef.current;
            if (record.isRecording()) {
              record.stopRecording();
              setIsRecording(false);
            }
          }
          setIsModalOpen(false)
          setRecordingDuration(0)
        }}
        onCancel={() => setIsModalOpen(false)}  // 必须设置这个才能关闭
        onOk={() => setIsModalOpen(false)}     // 可选，点击确定按钮关闭 
        footer={<div style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          <Button style={{ width: '120px' }} type='dashed' onClick={() => {
             if (isRecording) {
              const record = recordRef.current;
              if (record.isRecording()) {
                record.stopRecording();
                setIsRecording(false);
              }
            }
            setIsModalOpen(false);
            setRecordingDuration(0)
          }}>取消</Button>
          <Button style={{ width: '120px' }} onClick={() => {
            if (isRecording) {
              handleStop()
              setIsModalOpen(false);
              setRecordingDuration(0)
            } else {
              handleStart()
            }
          }} color={isRecording ? "danger" : "primary"} variant="solid" >{isRecording ? '完成' : '开始录音'}</Button>
        </div>}>
          <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', marginTop: '32px' }}>
            <p>点击开始录音后,请朗读下列文字…</p>
            <p style={{ lineHeight: '25px', fontSize: '18px', margin: '24px' }}>{prompt}</p>
            <div style={{ marginBottom: '24px' }}>
              <Text style={{ fontSize: '26px', lineHeight: '34px' }}>{formatDuration1(recordingDuration)}</Text>
            </div>
            <div style={{ display: `${isRecording ? 'flex' : 'none'} `, alignItems: 'center', padding: '0px 30px', borderRadius: '50px', marginBottom: '12px' }}>

              <div style={{ flex: 1 }} ref={waveformRef}></div>
            </div>
          </div>

        </Modal>
        {type == 2 && fileList.length == 0 && <Button
          type="primary"
          icon={<AudioOutlined />}
          onClick={() => {
            setIsModalOpen(true);

          }}
        >
          录制音频
        </Button>
        }
        {isUploading && <Skeleton.Input active block />}
        {fileList.length !== 0 && !isUploading && <FileListRenderer fileList={fileList} onRemove={handleRemove} />}
      </div>
    );
  };

export default CustomUpload;