import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { PauseCircleTwoTone, PlayCircleTwoTone } from '@ant-design/icons';
import WaveSurfer from 'wavesurfer.js';

interface WaveformPlayerProps {
  file?: File; // 添加一个属性来接收 File 对象
  autoPlay?: boolean; // 添加一个属性来控制是否自动播放
  key?: string; // 添加一个 key 属性
}

const WaveformPlayer = ({ file, autoPlay }: WaveformPlayerProps) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wavesurferRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false); // 用于跟踪播放状态
  let audioUrl = ''; // 用于存储创建的音频 URL

  useEffect(() => {
    if (waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#ccc',
        progressColor: '#2467FF',
        cursorColor: '#2467FF',
        autoplay: autoPlay,
        height: 50,
        width: '100%',
        fillParent: true, // 使用 fillParent 属性实现响应式布局
        backend: 'MediaElement', // 支持流式音频
      });

      if (file) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        audioUrl = URL.createObjectURL(file); // 创建音频 URL
        wavesurferRef.current.load(audioUrl);
      }

      // 监听播放结束事件
      wavesurferRef.current.on('finish', () => {
        setIsPlaying(false);
      });

      return () => {
        wavesurferRef.current.destroy();
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl); // 释放创建的 URL
        }
      };
    }
  }, [file]); // 添加 file 到依赖数组

  // 切换播放/暂停
  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
      setIsPlaying(!isPlaying); // 切换播放状态
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* 播放/暂停按钮 */}
      <Button
        onClick={togglePlayPause}
        type='default'
        shape="circle"
        style={{ width: '30px', height: '30px', fontSize: '30px' }}
      >
        {isPlaying ? <PauseCircleTwoTone /> : <PlayCircleTwoTone />}
      </Button>

      {/* 波形图 */}
      <div
        ref={waveformRef}
        style={{ flex: 1, height: '50px', minWidth: '300px', backgroundColor: '#f0f0f0' }}
      />
    </div>
  );
};

export default WaveformPlayer;