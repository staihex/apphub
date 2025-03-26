import React, { createContext, useState, useEffect } from 'react';
import { request } from '../services/request';

interface FetchContextType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // 根据你的数据类型定义
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setData: (data: any) => void;
}

const FetchContext = createContext<FetchContextType | undefined>(undefined);

// 定义类型映射
const MODEL_TYPE_MAPPING: Record<number, keyof typeof ModelType> = {
  1: 'llm',
  2: 'vision',
  3: 'tools',
  4: 'text2img',
  5: 'img2img',
  6: 'embedding',
  7: 'text2audio',
  8: 'audio2text',
  9: 'video'
};

const ModelType = {
  llm: [],
  vision: [],
  tools: [],
  text2img: [],
  img2img: [],
  embedding: [],
  text2audio: [],
  audio2text: [],
  video: [],
};

export const FetchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const url = 'https://test.staihex.com/api/ai/v1/model/list';
    const options = {
      method: 'POST',
      data: {
        page_size: 50,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request<any>(url, options)
      .then(async (response) => {
        const data = await response.json();
        console.log('POST 请求成功:', data);
        
        // 初始化一个新的分类对象，避免引用问题
        const categorizedModels = JSON.parse(JSON.stringify(ModelType));
        
        data.models.forEach((model: { types: number[]; name: string; }) => {
          if (!model.types) return;
          
          model.types.forEach((type: number) => {
            const category = MODEL_TYPE_MAPPING[type];
            if (category) {
              categorizedModels[category].push({
                value: model.name,
                label: model.name
              });
            }
          });
        });
        
        console.log("Categorized Models", categorizedModels);
        setData(categorizedModels);
      })
      .catch((error) => {
        console.error('POST 请求失败:', error);
      });
  }, []);

  return (
    <FetchContext.Provider value={{ data, setData }}>
      {children}
    </FetchContext.Provider>
  );
};

export default FetchContext;