// src/context/useWebSocket.ts
import { useContext } from 'react';
import FetchContext from './FetchContext';

export const useFetch = () => {
    const context = useContext(FetchContext);
    if (!context) {
      throw new Error('useFetch must be used within a FetchProvider');
    }
    return context;
  };