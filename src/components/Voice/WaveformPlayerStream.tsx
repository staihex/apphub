import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { PauseCircleTwoTone, PlayCircleTwoTone } from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

interface WaveformPlayerStreamProps {
  audioUrl?: string; // 接收音频 URL
}

const WaveformPlayerStream = ({ audioUrl }: WaveformPlayerStreamProps) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wavesurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false); // 跟踪播放状态
  const previousAudioUrlRef = useRef<string | null>(null); // 用于存储上一次的音频 URL

  useEffect(() => {
    // 如果 waveformRef.current 未挂载，则直接返回
    if (!waveformRef.current) return;

    // 如果已经初始化了 WaveSurfer 实例，则销毁它
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    // 如果有新的 audioUrl，则初始化 WaveSurfer
    if (audioUrl) {
      console.log('Loading new audio:', audioUrl);

      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#ccc',
        progressColor: '#2467FF',
        cursorColor: '#2467FF',
        height: 50,
        width: "100%",
        fillParent: true,
        backend: 'MediaElement',
      });

      // 加载新的音频 URL
      wavesurferRef.current.load(audioUrl);

      // 监听播放结束事件
      wavesurferRef.current.on('finish', () => {
        setIsPlaying(false);
      });

      // 监听加载完成事件
      wavesurferRef.current.on('ready', () => {
        console.log('Audio loaded and ready to play');
      });

      // 监听错误事件
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wavesurferRef.current.on('error', (err: any) => {
        console.error('WaveSurfer error:', err);
      });
    }

    // 清理函数：释放旧的音频 URL 和销毁 WaveSurfer 实例
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }

      // 释放上一次的音频 URL
      if (previousAudioUrlRef.current) {
        URL.revokeObjectURL(previousAudioUrlRef.current);
        previousAudioUrlRef.current = null;
      }
    };
  }, [audioUrl]); // 依赖 audioUrl，确保每次 audioUrl 更新时重新运行

  useEffect(() => {
    // 更新 previousAudioUrlRef.current 为当前的 audioUrl
    if (audioUrl) {
      previousAudioUrlRef.current = audioUrl;
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Button
        onClick={togglePlayPause}
        type='default'
        shape="circle"
        style={{ width: '30px', height: '30px', fontSize: '30px' }}
      >
        {isPlaying ? <PauseCircleTwoTone /> : <PlayCircleTwoTone />}
      </Button>
      <div
        ref={waveformRef}
        style={{ flex: 1, height: '50px', backgroundColor: '#f0f0f0' }}
      />
    </div>
  );
};

export default WaveformPlayerStream;