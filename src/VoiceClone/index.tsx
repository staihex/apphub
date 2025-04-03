/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header/HeaderMenu';
import { Affix, Col, Form, Layout, Row, Select, Typography, Input, message, Empty, Flex, List, Button, Skeleton, Divider, Popconfirm } from 'antd';
import { useXAgent, useXChat } from '@ant-design/x';
import { useFetch } from '../contexts/useFetch';
import { request } from '../services/request';
import OpenAIClientManager from '../utils//OpenAIClientManager';
import Link from 'antd/es/typography/Link';
import Person140 from '../../public/images/person140.png'
import '../styles.css'
import zhCN from 'antd/es/locale/zh_CN';
import { ConfigProvider } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import { PlayCircleFilled } from '@ant-design/icons';
import AddVoice from '../components/Voice/AddVoice';

const { Title } = Typography;

const TextToSpeech: React.FC = () => {
  const { data } = useFetch();
  const [, setContent] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [, setCurrentModel] = React.useState('cosyvoice-2')
  const currentModelrRef = React.useRef('cosyvoice-2');

  const [sysVoice, setSysVoice] = React.useState<any>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);

  const [, setHasResult] = React.useState(false);

  const currentVoiceRef = React.useRef<any>('');
  const currentFormatRef = React.useRef<any>('wav');
  const currentPromptRef = React.useRef('');
  const currentAudioDataRef = React.useRef<any>(null);
  const currentUrlRef = React.useRef<any>('');
  const currentSpeedRef = React.useRef(1);
  const [form] = Form.useForm();
  const isStart = React.useRef(true);
  const [messageApi, contextHolder] = message.useMessage();

  const [, setAudioUrl] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const [apiKey, setApiKey] = React.useState('');

  const currentApiKeyrRef = React.useRef('');
  const playAudioRef = React.useRef<any>('');

  const [keyStatus, setKeyStatus] = React.useState<number>(0);


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
      setSysVoice([]);
      return response;
    } catch (error) {
      // 处理请求错误
      console.error('Request failed:', error);
      throw error;
    }
  };

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

  const deleteVoice = (id: string) => {
    const url = 'https://test.staihex.com/api/ai/v1/voice/delete';
    const options = {
      method: 'POST', // 明确指定请求方法
      headers: {
        authorization: apiKey,
      },
      data: {
        voice_ids: [id]
      },
    };

    request<any>(url, options)
      .then(async (response) => {
        if (response.status === 401 && apiKey !== '') {
          messageApi.open({
            type: 'error',
            content: 'API_KEY有误',
          });
        }
        getVoiceList(1)
      })
      .catch((error) => {
        setLoading(false)
        console.error('POST 请求失败:', error);
      });
  }

  const getVoiceList = async (pageNo?: number) => {
    if (loading) {
      return;
    }
    if (pageNo === 1) {
      setSysVoice([]);
    } else {
      setLoading(true);
    }

    const url = 'https://test.staihex.com/api/ai/v1/voice/list';
    const options = {
      method: 'POST', // 明确指定请求方法
      headers: {
        authorization: currentApiKeyrRef.current,
      },
      data: {
        page_size: 20,
        page_no: pageNo || page
      },
    };

    request<any>(url, options)
      .then(async (response) => {
        if (response.status === 401 && apiKey !== '') {
          messageApi.open({
            type: 'error',
            content: 'API_KEY有误',
          });
          form.setFieldValue('key', '');
          setKeyStatus(1);
          currentApiKeyrRef.current = '';
        } else {
          const data = await response.json();
          if (data.voices.length > 0) {
            setSysVoice((prev: any) => {
              return [
                ...prev,
                ...data.voices
              ]
            });

            setPage(page + 1);
            setTotal(data.total_records)
            setKeyStatus(2)
          }

        }
        setLoading(false)
      })
      .catch((error) => {
        setLoading(false)
        console.error('POST 请求失败:', error);
      });
  }

  useEffect(() => {
    getVoiceList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  const onSubmit = (nextContent: string) => {
    if (currentApiKeyrRef.current === '') {
      messageApi.open({
        type: 'error',
        content: '请先配置API_KEY',
      });
      return;
    }
    if (!nextContent) return;
    // setLoading(true);
    onRequest(nextContent);
    setContent('');
  };

  const handlePlayPause = () => {
    const audioElement: any = document.getElementById("audioPlayer");
    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  };

  // 播放指定音频
  const playNewAudio = (url: string) => {
    if (url) {
      playAudioRef.current = url; // 更新当前播放的音频
      const audioElement: any = document.getElementById("audioPlayer");

      // 更新音频源并加载
      audioElement.src = url;
      audioElement.load();

      // 确保音频加载完成后再播放
      audioElement.addEventListener('canplaythrough', () => {
        audioElement.play();
      }, { once: true }); // 确保事件只触发一次
    }
  };
  return (
    <ConfigProvider locale={zhCN}>
      {contextHolder}
      <audio id="audioPlayer" src={playAudioRef.current} />
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HeaderMenu */}
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='音色复刻' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Row style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
          <Col sm={8} md={6} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
            <Affix offsetTop={90}>
              <div>
                <Title level={5} style={{ display: 'block', marginBottom: '12px' }}>应用配置</Title>
                <Form
                  layout="vertical"
                  form={form}
                  name="nest-messages"
                  onFinish={() => onSubmit(' ')}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item name='model' label="语音合成模型">
                    <Select
                      defaultValue="cosyvoice-2"
                      onChange={(value) => {
                        currentModelrRef.current = value
                        setCurrentModel(value)
                      }}
                      options={data?.text2audio}
                    />
                  </Form.Item>
                  <Form.Item name='key' label="API_KEY" valuePropName='key'>
                    <Input onChange={(e) => {
                      if (e.target.value.length == 35) {
                        currentApiKeyrRef.current = e.target.value
                        setApiKey(e.target.value);
                        openAIManager.updateApiKey(e.target.value, customFetch);
                      }
                    }} onBlur={(e) => {
                      // 更新API_KEY
                      currentApiKeyrRef.current = e.target.value
                      setApiKey(e.target.value);
                      openAIManager.updateApiKey(e.target.value, customFetch);
                    }} placeholder="API_KEY" />
                    <Link href="https://test.staihex.com/api_key" target='_blank' style={{ marginTop: '8px', float: 'right' }}>获取API_KEY</Link>
                  </Form.Item>
                </Form>
              </div>
            </Affix>
          </Col>
          {(keyStatus == 0 || keyStatus == 1) && <Col sm={16} md={18} style={{ flex: 1, backgroundColor: '#fff', padding: '24px 24px 0px 24px', margin: '24px' }}>
            <Empty style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginTop: '12%' }} image={Person140} imageStyle={{ width: '232px', height: '174px' }} description={keyStatus == 1 ? '您输入的API_KEY有误，请重新输入' : "您未输入API_KEY，请在左侧配置栏输入"} />
          </Col>}
          {keyStatus == 2 && <Col sm={16} md={18} style={{ flex: 1 }}>
            <Flex style={{ padding: '24px', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ backgroundColor: '#FFF', width: '49%', overflow: 'hide', height: '100%', padding: '24px' }}>
                <Title level={5} style={{ display: 'block', marginBottom: '12px' }}>音色复刻</Title>
                <Divider />
                <AddVoice handlePlayPause={handlePlayPause} playAudioRef={playAudioRef} playNewAudio={playNewAudio} UpdateList={getVoiceList} apiKey={currentApiKeyrRef.current} />
              </div>
              <div style={{ backgroundColor: '#FFF', width: '49%', overflow: 'hidden', height: '100%', padding: '24px' }}>
                <Title level={5} style={{ display: 'block', marginBottom: '12px' }}>音色列表</Title>
                <div style={{ height: '75vh', overflow: 'auto' }} id="scrollableDiv">
                  <InfiniteScroll
                    dataLength={sysVoice.length}
                    next={getVoiceList}
                    hasMore={sysVoice.length < total}
                    loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
                    scrollableTarget="scrollableDiv"
                    style={{ padding: '64px' }}
                  >
                    <List
                      dataSource={sysVoice}
                      renderItem={(item: any) => (
                        <List.Item key={item.name}>
                          <List.Item.Meta
                            title={item.name}
                          />
                          <Button onClick={(e) => {
                            e.stopPropagation()
                            if (playAudioRef.current === item.voice_url) {
                              handlePlayPause(); // 播放/暂停当前音频
                            } else {
                              playNewAudio(item.voice_url); // 播放新的音频
                            }
                          }} type='link' icon={<PlayCircleFilled />}>试听</Button>
                          <Popconfirm
                            title="删除后无法恢复"
                            description="是否确认删除？"
                            okText="确认"
                            cancelText="取消"
                            onConfirm={() => {
                              deleteVoice(item.voice_id)
                            }}
                          >
                            <Button type='link' danger>删除</Button>
                          </Popconfirm>
                        </List.Item>
                      )}
                    />
                  </InfiniteScroll>
                </div>
              </div>
            </Flex>
          </Col>}
        </Row>
      </Layout>
    </ConfigProvider>
  );
};

export default TextToSpeech;