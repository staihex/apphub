// src/main.tsx
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { FetchProvider } from './contexts/FetchContext';
import 'antd/dist/reset.css'; // 引入 Ant Design 样式

ReactDOM.createRoot(document.getElementById('root')!).render(
  <FetchProvider>
    <RouterProvider router={router} />
  </FetchProvider>
);