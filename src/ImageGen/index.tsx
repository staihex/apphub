/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header/HeaderMenu';
import { Affix, Button, Col, Form, Input, InputNumber, Layout, Row, Select, Space, Typography, Image, Radio, message } from 'antd';
import { createStyles } from 'antd-style';
import { useXAgent, useXChat, Welcome } from '@ant-design/x';
import { useFetch } from '../contexts/useFetch';
import { API_KEY, ImageSize } from '../config/config';
import application13 from '../../public/images/application13.png'
import application10 from '../../public/images/application10.png'
import Link from 'antd/es/typography/Link';
import OpenAIClientManager from '../utils/OpenAIClientManager';
import zhCN from 'antd/es/locale/zh_CN';
import { ConfigProvider } from 'antd';
import '../styles.css'

const { Title } = Typography;

const useStyle = createStyles(({ token, css }) => {
  return {
    chat: css`
      height: 100%;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 24px 24px 0px 24px;
      gap: 16px;
    `,
    messages: css`
      flex: 1;
    `,
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
  };
});

const ImageGen: React.FC = () => {
  const { data } = useFetch();
  const [, setContent] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [, setCurrentModel] = React.useState('flux1')
  const currentModelrRef = React.useRef('flux1');

  const { styles } = useStyle();

  const [num, setNum] = React.useState(1);
  const [, setSize] = React.useState<any>('1024x768');
  const [quality, setQuality] = React.useState<any>('standard');
  const [, setPrompt] = React.useState('');

  const [imageFiles, setImageFiles] = React.useState<any>([]);

  const currentNumRef = React.useRef(1);
  const currentSizeRef = React.useRef<any>('1024x768');
  const currentQualityRef = React.useRef<any>('standard');
  const currentPromptRef = React.useRef('');

  const isStart = React.useRef(true);
  const [messageApi, contextHolder] = message.useMessage();
  const currentApiKeyrRef = React.useRef(API_KEY);
  const [loading, setLoading] = React.useState(false);


  const options = [
    { label: "低", value: "low", size: "1024x1024" },
    { label: "标准", value: "standard", size: "1280x1280" },
    { label: "高", value: "high", size: "1536x1024" },
  ];

  useEffect(() => {
    // 当数据更新时，更新OpenAI客户端
    if (currentApiKeyrRef.current == '') {
      messageApi.open({
        type: 'info',
        content: '请先配置API_KEY',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customFetch = async (url: string | URL | Request, options: any) => {

    const controller = new AbortController();
    const signal = controller.signal;


    // 添加自定义的请求头
    const headers = {
      authorization: options.headers.authorization,
      'content-type': options.headers['content-type'],
      'content-length': options.headers['content-length'],
    };

    // 创建新的请求选项对象
    const newOptions = {
      ...options,
      headers,
      signal, // 添加 signal 以支持取消
    };

    try {
      // 使用自定义的请求选项发送请求
      const response = await fetch(url, newOptions);
      if (!response.ok) {
        // 如果响应状态码不是 2xx，抛出错误
        const errorData = await response.json();
        if (isStart.current) {
          isStart.current = false;
          messageApi.open({
            type: 'error',
            content: errorData.error.message,
          });
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      return response;
    } catch (error) {
      // 处理请求错误
      console.error('Request failed:', error);
      throw error;
    }
  };

  const openAIManager = OpenAIClientManager.getInstance();
  openAIManager.updateApiKey(currentApiKeyrRef.current, customFetch);

  const [agent] = useXAgent({
    request: async (_info, callbacks) => {

      const { onError } = callbacks;
      try {
        const stream: any = await openAIManager.getClient().images.generate({
          model: currentModelrRef.current,
          prompt: currentPromptRef.current as string,
          size: currentSizeRef.current,
          response_format: "url",
          quality: currentQualityRef.current,
          n: currentNumRef.current
        });
        for (let i = 0; i < stream.data.length; i++) {
          stream.data[i].url = stream.data[i].url.replace("http://123.57.143.161", "https://test.staihex.com");
        }
        setImageFiles(stream.data as any)
        setLoading(false);

      } catch (error: any) {
        // handle error
        onError(error);
        setLoading(false)
      }
    },
  });

  const { onRequest, messages } = useXChat({
    agent,
  });

  useEffect(() => {
    // 当消息列表更新时，滚动到最底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const placeholderNode = (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon={<img src={application13} />}
        title="您好，我是图像生成智能机器人！"
        description="把您的需求提交给我吧！"
      />
    </Space>
  );

  const onSubmit = (nextContent: string) => {
    if (currentApiKeyrRef.current === '') {
      messageApi.open({
        type: 'error',
        content: '请先配置API_KEY',
      });
      return;
    }
    if (!nextContent) return;
    setLoading(true);
    onRequest(nextContent);
    setContent('');
    isStart.current = true;
  };

  return (
    <ConfigProvider locale={zhCN}>
      {contextHolder}
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HeaderMenu */}
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='图像生成' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Row style={{ flex: 1 }}>
          <Col sm={8} md={6} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
            <Affix offsetTop={90}>
              <div>
                <Title level={5} style={{ display: 'block', marginBottom: '12px' }}>应用配置</Title>
                <Form
                  layout="vertical"
                  name="nest-messages"
                  onFinish={onSubmit}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item initialValue={'flux1'} name={['user', 'model']} label="图像生成模型" rules={[{ required: true, message: '请选择图像生成模型' }]}>
                    <Select
                      defaultValue="flux1"
                      onChange={(value) => {
                        currentModelrRef.current = value
                        setCurrentModel(value)
                      }}
                      options={data?.text2img}
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: '8px'}}>
                    <Form.Item style={{ marginBottom: '8px'}} initialValue={API_KEY} name={['user', 'key']} label="API_KEY" rules={[{ required: true, message: '请输入API_KEY' }]}>
                      <Input onChange={(e) => {
                        // 更新API_KEY
                        currentApiKeyrRef.current = e.target.value
                        openAIManager.updateApiKey(e.target.value, customFetch);
                      }} placeholder="API_KEY" />

                    </Form.Item>
                    <Link href="https://test.staihex.com/api_key" target='_blank' style={{ float: 'right' }}>获取API_KEY</Link>
                  </Form.Item>

                  <Form.Item rules={[{ required: true, message: '提示词不能为空' }]} name={['user', 'prompt']} label="提示词">
                    <Input.TextArea style={{ height: '120px' }} placeholder='提示词仅支持英文' onChange={(e) => {
                      setPrompt(e.target.value);
                      currentPromptRef.current = e.target.value;
                    }} />
                  </Form.Item>
                  <Form.Item name={['user', 'size']} label="图像尺寸：宽度&高度">
                    <Select
                      defaultValue="1024x768"
                      onChange={(value) => {
                        currentSizeRef.current = value
                        setSize(value)
                      }}
                      options={ImageSize}
                    />
                  </Form.Item>
                  <Form.Item name={['user', 'quality']} label="图像质量">
                    <Radio.Group value={quality} onChange={(e) => {
                      setQuality(e.target.value);
                      currentQualityRef.current = e.target.value;
                    }} style={{ display: "flex", gap: "10px" }}>
                      {options.map((option) => (
                        <div
                          key={option.value}
                          style={{
                            width: "120px",
                            height: "80px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            // border: quality === option.value ? "2px solid #1677ff" : "2px solid #ddd",
                            border: "2px solid #999",
                            borderRadius: "8px",
                            textAlign: "center",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: quality === option.value ? "bold" : "normal",
                            color: quality === option.value ? "#fff" : "#000",
                            backgroundColor: quality === option.value ? "#2467FF" : "#fff",
                          }}
                          onClick={() => {
                            setQuality(option.value)
                            currentQualityRef.current = option.value;
                          }}
                        >
                          <Radio value={option.value} style={{ display: "none" }} />
                          <div>{option.label}</div>
                        </div>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item name={['user', 'num']} label="生成数量" extra="一次最多支持4张">
                    <InputNumber style={{ width: '100%' }} min={1} max={4} defaultValue={1} onChange={(e: any) => {
                      setNum(e);
                      currentNumRef.current = e;
                    }} />
                  </Form.Item>
                  <Form.Item label={null}>
                    <Button loading={loading} block type="primary" htmlType="submit">
                      立即生成
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </Affix>
          </Col>
          <Col sm={16} md={18} style={{ flex: 1, backgroundColor: '#f0f2f5', padding: '24px 24px 0px 24px' }}>
            <div className={styles.chat}>
              {placeholderNode}
              <Row gutter={[24, 24]}>
                {[...Array(num)].map((_, index) => (
                  <Col span={num > 1 ? 12 : 24} key={index}>
                    <div style={{ width: '100%', aspectRatio: 1, backgroundColor: '#fff', display: 'flex' }}>
                      <Image
                        src={imageFiles[index]?.url ? imageFiles[index]?.url : application10}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: index + 1 > imageFiles.length ? '48px' : '18px',
                          objectFit: index + 1 > imageFiles.length ? 'contain' : 'cover', // 保持图片比例，可能裁剪部分图片
                        }}
                        preview={index + 1 <= imageFiles.length}
                      /></div>
                  </Col>

                ))}
              </Row>
            </div>
          </Col>
        </Row>
      </Layout>
    </ConfigProvider>
  );
};

export default ImageGen;