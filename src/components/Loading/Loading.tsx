// Loading.tsx
import React from 'react';
import './Loading.css'; // 加载自定义样式

interface LoadingProps {
  tip?: string; // 加载提示文本，默认为 "Loading"
}

const Loading: React.FC<LoadingProps> = () => {
  return (
    <div className="loading-container">
      <div className="loading-dots">
        <span className="dot dot-1"></span>
        <span className="dot dot-2"></span>
        <span className="dot dot-3"></span>
      </div>
      {/* <div className="loading-tip">{tip}</div> */}
    </div>
  );
};

export default Loading;