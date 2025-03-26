import { lazy } from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';

// 懒加载页面组件
const Home = lazy(() => import('./Home'));
const TextGen = lazy(() => import('./TextGen'));
const ImageAnalysis = lazy(() => import('./ImageAnalysis'));
const ImageGen = lazy(() => import('./ImageGen'));
const VoiceClone = lazy(() => import('./VoiceClone'));
const TextToSpeech = lazy(() => import('./TextToSpeech'));
const SpeechToText = lazy(() => import('./SpeechToText'));
const VoiceChat = lazy(() => import('./VoiceChat'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/text-gen',
    element: <TextGen />,
  },
  {
    path: '/image-analysis',
    element: <ImageAnalysis />,
  },
  {
    path: '/image-gen',
    element: <ImageGen />,
  },
  {
    path: '/voice-clone',
    element: <VoiceClone />,
  },
  {
    path: '/text-to-speech',
    element: <TextToSpeech />,
  },
  {
    path: '/speech-to-text',
    element: <SpeechToText />,
  },
  {
    path: '/voice-chat',
    element: <VoiceChat />,
  },
];

// 使用 basename 配置路由基础路径
export const router = createBrowserRouter(routes, { basename: '/apphub' });
