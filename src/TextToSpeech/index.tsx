/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header//HeaderMenu';
import { Affix, Button, Col, Form, Layout, Row, Select, Space, Typography, Radio, Input, message, Cascader, InputNumber } from 'antd';
import { createStyles } from 'antd-style';
import { useXAgent, useXChat, Welcome } from '@ant-design/x';
import { useFetch } from '../contexts/useFetch';
import { API_KEY } from '../config/config';
import application13 from '../../public/images/application13.png'
import { request } from '../services/request';
import WaveformPlayerStream from '../components/Voice/WaveformPlayerStream';
import OpenAIClientManager from '../utils//OpenAIClientManager';
import Link from 'antd/es/typography/Link';
import './index.css'
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

const TextToSpeech: React.FC = () => {
  const { styles } = useStyle();
  const { data } = useFetch();
  const [, setContent] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [, setCurrentModel] = React.useState('cosyvoice-2')
  const currentModelrRef = React.useRef('cosyvoice-2');

  const [sysVoice, setSysVoice] = React.useState<any>([]);
  const [userVoice, setUserVoice] = React.useState<any>([])

  const [speed, setSpeed] = React.useState(1);
  const [voice, setVoice] = React.useState<any>('');
  const [format, setFormat] = React.useState<any>('wav');

  const [hasResult, setHasResult] = React.useState(false);

  const currentVoiceRef = React.useRef<any>('');
  const currentFormatRef = React.useRef<any>('wav');
  const currentPromptRef = React.useRef('');
  const currentAudioDataRef = React.useRef<any>(null);
  const currentUrlRef = React.useRef<any>('');
  const currentSpeedRef = React.useRef(1);
  const [form] = Form.useForm();
  const isStart = React.useRef(true);
  const [messageApi, contextHolder] = message.useMessage();

  const [audioUrl, setAudioUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const [keyStatus, setKeyStatus] = React.useState<number>(0);

  const options = [
    { label: "mp3", value: "mp3" },
    { label: "wav", value: "wav" },
    { label: "pcm", value: "pcm" },
  ];

  const currentApiKeyrRef = React.useRef(API_KEY);
  const [apiKey, setApiKey] = React.useState(API_KEY);

  useEffect(() => {
    getUserVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])


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
      setHasResult(true)
      setLoading(false)
      return response;
    } catch (error) {
      // 处理请求错误
      console.error('Request failed:', error);
      throw error;
    }
  };

  const openAIManager = OpenAIClientManager.getInstance();
  openAIManager.initializeClient(currentApiKeyrRef.current, customFetch);

  const [agent] = useXAgent({
    request: async (callbacks) => {

      const { onError } = callbacks;

      try {
        const chunks: Uint8Array[] = [];
        const stream: any = await openAIManager.getClient().audio.speech.create({
          model: currentModelrRef.current,
          input: currentPromptRef.current,
          voice: currentVoiceRef.current,
          speed: currentSpeedRef.current,
          response_format: currentFormatRef.current,
        });

        const reader = stream.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
        }
        console.log('chunks', chunks);

        // 转换为 Blob
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const aUrl = URL.createObjectURL(blob);
        currentUrlRef.current = aUrl

        setAudioUrl(aUrl);
        currentAudioDataRef.current = chunks;

      } catch (error: any) {
        // handle error
        onError(error);
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

  const getUserVoice = async () => {
    const url = 'https://test.staihex.com/api/ai/v1/voice/list';
    const options = {
      method: 'POST', // 明确指定请求方法
      headers: {
        authorization: currentApiKeyrRef.current,
      },
      data: {
        page_size: 50,
      },
    };

    request<any>(url, options)
      .then(async (response) => {
        if (response.status === 401 && currentApiKeyrRef.current !== '') {
          messageApi.open({
            type: 'error',
            content: 'API_KEY有误',
          });
          form.setFieldValue('key', '');
          setKeyStatus(1)
          setUserVoice([])
          currentApiKeyrRef.current = '';
        } else {
          const data = await response.json();
          if (data.voices) {
            setUserVoice(data.voices);
            setKeyStatus(2);
          }
        }
      })
      .catch((error) => {
        setUserVoice([])
        setKeyStatus(1)
        console.error('POST 请求失败:', error);
      });
  }

  const getSysVoice = async () => {
    const url = 'https://test.staihex.com/api/ai/v1/sys_voice/list';
    const options = {
      method: 'POST', // 明确指定请求方法
      data: {
        page_size: 50,
      },
    };

    request<any>(url, options)
      .then(async (response) => {
        const data = await response.json();
        console.log('POST 请求成功:', data);
        setSysVoice(data.sys_voices);
      })
      .catch((error) => {
        console.error('POST 请求失败:', error);
      });
  }

  useEffect(() => {
    getSysVoice();
  }, [])

  const placeholderNode = (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon={<img src={application13} />}
        title="您好，我是语音合成智能机器人！"
        description="我能把文字变成语音，快来试试吧！"
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
  };

  const findInfoByName = (name: string) => {
    const result = sysVoice.find((item: { name: string; }) => item.name === name) || userVoice.find((item: { name: string; }) => item.name === name);
    return result
  };

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: '100vh', display: 'flex', height: '100%', flexDirection: 'column' }}>
        {/* HeaderMenu */}
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='语音合成' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Form
          layout="vertical"
          form={form}
          name="nest-messages"
          onFinish={() => onSubmit(' ')}
          style={{ height: '100%', flex: 1 }}
        >
          <div style={{ flex: 1, height: '100%' }}>
            <Row style={{ height: '100%' }}>
              <Col sm={8} md={6} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
                <Affix offsetTop={90}>
                  <div>
                    <Title level={5} style={{ display: 'block', marginBottom: '12px' }}>应用配置</Title>

                    <Form.Item initialValue={"cosyvoice-2"} name='model' label="语音合成模型" rules={[{ required: true, message: '请选择语音合成模型' }]}>
                      <Select
                        onChange={(value) => {
                          currentModelrRef.current = value
                          setCurrentModel(value)
                        }}
                        options={data?.text2audio}
                      />
                    </Form.Item>
                    <Form.Item style={{marginBottom:'8px'}}>
                      <Form.Item style={{marginBottom:'8px'}} initialValue={API_KEY} name={['user', 'key']} label="API_KEY" rules={[{ required: true, message: '请输入API_KEY' }]}>
                        <Input onChange={(e) => {
                          // 更新API_KEY
                          currentApiKeyrRef.current = e.target.value
                          setApiKey(e.target.value)
                          openAIManager.updateApiKey(e.target.value, customFetch);
                        }} placeholder="API_KEY" />
                      </Form.Item>
                      <Link href="https://test.staihex.com/api_key" target='_blank' style={{ float: 'right' }}>获取API_KEY</Link>
                    </Form.Item>
                    <Form.Item name='voice' label="音色选择" rules={[{ required: true, message: '请选择音色!' }]}>
                      <Cascader
                        onClick={() => {
                          getUserVoice()
                        }}
                        placeholder={keyStatus === 0 ? '请先配置API_KEY' : keyStatus === 1 ? 'API_KEY有误' : '请选择音色'}
                        disabled={keyStatus !== 2}
                        options={[
                          {
                            value: 1,
                            label: '系统音色',
                            children: sysVoice.map((d: { name: any; desc: any; }) => ({
                              value: d.name,
                              label: d.desc,
                            }))
                          },
                          {
                            value: 2,
                            label: '用户音色',
                            disabled: userVoice?.length === 0,
                            children: userVoice?.map((d: { name: any; desc: any; }) => ({
                              value: d.name,
                              label: d.name,
                            }))
                          }
                        ]}
                        onChange={(value) => {
                          if (value.length < 2) return;
                          currentVoiceRef.current = value[1]
                          setVoice(value[1]);
                          form.setFieldsValue({ voice: value[1] });
                        }}
                      />
                      {voice && <div style={{ marginTop: '16px' }}>
                        {/* 根据当前选中的 URL 查找音色详细信息 */}
                        {(() => {
                          const selectedVoice = findInfoByName(voice);
                          return selectedVoice ? (
                            <>
                              <div><strong>音色名称：</strong>{selectedVoice.desc}</div>
                              <div><strong>描述：</strong>{selectedVoice.prompt_text}</div>
                              <div><strong>语言：</strong>{selectedVoice.language}</div>
                              <div><strong>文件大小：</strong>{selectedVoice.file_size} 字节</div>
                              <div><strong>采样率：</strong>{selectedVoice.sample_rate} Hz</div>
                            </>
                          ) : (
                            <div>未找到相关音色信息</div>
                          );
                        })()}
                      </div>}
                    </Form.Item>
                    <Form.Item name='response_format' label="音频格式">
                      <Radio.Group value={format} onChange={(e) => {
                        setFormat(e.target.value);
                        currentFormatRef.current = e.target.value;
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
                              // border: format === option.value ? "2px solid #1677ff" : "2px solid #ddd",
                              border: "2px solid #999",

                              borderRadius: "8px",
                              textAlign: "center",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: format === option.value ? "bold" : "normal",
                              color: format === option.value ? "#fff" : "#000",
                              backgroundColor: format === option.value ? "#2467FF" : "#fff",
                            }}
                            onClick={() => {
                              setFormat(option.value)
                              currentFormatRef.current = option.value;
                            }}
                          >
                            <Radio value={option.value} style={{ display: "none" }} />
                            <div>{option.label}</div>
                          </div>
                        ))}
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item name='speed' label="语速" extra="语速范围 0.5~2">
                      <InputNumber
                        min={0.5}
                        max={2}
                        step={0.1}
                        defaultValue={1}
                        style={{ width: '100%' }}
                        onChange={(value: any) => {
                          setSpeed(value);
                          currentSpeedRef.current = value;
                        }}
                        value={typeof speed === 'number' ? speed : 0}
                      />
                    </Form.Item>

                  </div>
                </Affix>
              </Col>
              <Col sm={16} md={18} style={{ backgroundColor: '#f0f2f5', padding: '24px 24px 0px 24px' }}>
                <div className={styles.chat}>
                  {placeholderNode}
                  <div>
                    <Form.Item style={{ marginBottom: '64px' }} label='' name="prompt" rules={[{ required: true, message: '请输入音频的文本内容' }]}>
                      <Input.TextArea placeholder='请输入音频的文本内容' style={{ height: '480px' }} onChange={(e) => {
                        currentPromptRef.current = e.target.value;
                      }} />
                    </Form.Item>
                    {hasResult && <WaveformPlayerStream audioUrl={audioUrl} />}
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'end' }}>
                      <Button onClick={() => {
                        if (currentUrlRef.current) {
                          const link = document.createElement('a');
                          link.href = currentUrlRef.current;
                          link.download = `recorded_${Date.now()}.${format == 'pcm' ? 'wav' : format}`; // 设置下载文件名
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }
                      } type='default' style={{ marginRight: '8px', width: '100px' }} disabled={!hasResult}>
                        下载音频
                      </Button>
                      <Button type="primary" htmlType='submit' onClick={() => {
                        form.submit();
                      }} style={{ marginRight: '8px', width: '100px' }} loading={loading}>生成音频</Button>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Form>
      </Layout>
    </>
  );
};

export default TextToSpeech;