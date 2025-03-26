// src/utils/request.ts
import { message } from 'antd';

interface RequestOptions extends RequestInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>; // 用于 GET 请求的查询参数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;   // 用于 POST 请求的请求体
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, data, ...restOptions } = options;

  // 处理 GET 请求的查询参数
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url = `${url}?${queryString}`;
  }

  // 处理 POST 请求的请求体
  if (data) {
    restOptions.body = JSON.stringify(data);
    restOptions.headers = {
      ...restOptions.headers,
      'Content-Type': 'application/json',
    };
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
    });

    return response as T;
  } catch (error) {
    message.error('请求失败，请稍后重试');
    throw error;
  }
}