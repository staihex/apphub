/* eslint-disable @typescript-eslint/no-explicit-any */

import markdownit from 'markdown-it';
import { createStyles } from 'antd-style';
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header/HeaderMenu';
import { Attachments, AttachmentsProps, Bubble, useXAgent, useXChat } from '@ant-design/x';
import { Affix, Avatar, Button, Col, Form, GetProp, Input, Layout, message, Result, Row, Select, Typography } from 'antd';
import { AudioOutlined, CloudUploadOutlined, PoweroffOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { useFetch } from '../contexts/useFetch';
import { API_KEY } from '../config/config';
import WelcomeCard from '../components/Other/WelcomeCard';
import { getBase64 } from '../utils/utils';
import WaveformPlayer from '../components/Voice/WaveformPlayer';
import OpenAIClientManager from '../utils//OpenAIClientManager';
import application13 from '../../public/images/application13.png'
import Link from 'antd/es/typography/Link';
import '../styles.css'

const { Text } = Typography;

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
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
  };
});

const SpeechToText: React.FC = () => {
  const { data } = useFetch();
  const { styles } = useStyle();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const [form] = Form.useForm();
  const currentModelrRef = React.useRef('whisper-3');
  const md = markdownit({ html: true, breaks: true });

  const [fileItems, setFileItems] = React.useState<GetProp<AttachmentsProps, 'items'>>([]);
  const [, setBase64Strs] = React.useState([]);
  const base64StrRef = React.useRef([]);
  const fileItemsRef = React.useRef<any>(null);
  const userFileStorageRef = useRef<Map<any, File>>(new Map());

  const currentApiKeyrRef = React.useRef(API_KEY);

  const [, setContent] = React.useState('');
  const isStart = React.useRef(true);
  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);


  const customFetch = async (url: string | URL | Request, options: any) => {
    // 添加自定义的请求头
    const headers = {
      authorization: options.headers.authorization,
      // 'content-type': options.headers['content-type'],
      'content-length': options.headers['content-length'],
    };

    // 创建新的请求选项对象
    const newOptions = {
      ...options,
      headers,
    };

    console.log("customFetch", url, newOptions);

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
  openAIManager.initializeClient(currentApiKeyrRef.current, customFetch);

  const [agent] = useXAgent({
    request: async (_info, callbacks) => {
      const { onSuccess, onUpdate, onError } = callbacks;

      let content: string = '';
      let fullContent = ''; // 存储完整的流数据
      let currentIndex = 0; // 当前输出的字符索引
      let isTyping = false; // 是否正在打字
      const typingInterval = 5; // 逐字输出的间隔时间

      try {
        const stream = await openAIManager.getClient().audio.transcriptions.create({
          model: currentModelrRef.current,
          file: fileItemsRef.current,
        });

        // 定时器函数：逐字输出
        const typeNextChar = () => {
          if (currentIndex < fullContent.length) {
            onUpdate(fullContent.slice(0, currentIndex + 1)); // 逐字更新
            currentIndex++;
            setTimeout(typeNextChar, typingInterval); // 继续下一次
          } else {
            isTyping = false; // 打字结束
          }
        };

        console.log(stream);

        content += stream.text || '';
        fullContent = content; // 追加到完整的流数据

        if (!isTyping) {
          isTyping = true;
          typeNextChar();
        }

        // 确保所有字符最终输出
        const checkCompletion = setInterval(() => {
          if (!isTyping && currentIndex < fullContent.length) {
            isTyping = true;
            typeNextChar();
          } else if (currentIndex >= fullContent.length) {
            clearInterval(checkCompletion);
            onSuccess(fullContent);
          }
        }, 50);
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
    // 当数据更新时，更新OpenAI客户端
    if (currentApiKeyrRef.current == '') {
      messageApi.open({
        type: 'info',
        content: '请先配置API_KEY',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 当消息列表更新时，滚动到最底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map(({ id, message, status }, index) => ({
    key: id,
    // typing: {step: 1000, interval: 100},
    avatar: { src: status == 'local' ? <Avatar style={{ backgroundColor: '#2467FF' }} icon={<UserOutlined />} /> : <Avatar src={application13} /> },
    role: status === 'local' ? 'local' : 'ai',
    // loading: status === 'loading',
    styles: {
      content: {
        borderRadius: 16,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: status === 'local' ? 'rgb(239, 246, 255)' : '#FFF',
      },
    },
    messageRender: () => {
      if (status === 'local') {
        return <WaveformPlayer file={userFileStorageRef.current.get(index)} autoPlay={false} />
      } else {
        return <Typography style={{ marginTop: '10px' }}>
          <div dangerouslySetInnerHTML={{ __html: md.render(message) }} />
        </Typography>
      }

    },
  }));

  const roles: GetProp<typeof Bubble.List, 'roles'> = {
    ai: {
      placement: 'start',
      typing: { step: 5, interval: 20 },
      styles: {
        content: {
          borderRadius: 16,
        },
      },
    },
    local: {
      placement: 'end',
      variant: 'shadow',
    },
  };

  const handleFileChange: GetProp<typeof Attachments, 'onChange'> = async (info) => {
    setFileItems(info.fileList.map(file => file));
    fileItemsRef.current = info.file
    userFileStorageRef.current.set(messages.length, fileItemsRef.current);
    const base64StrsArr: any = [];
    for (let i = 0; i < info.fileList.length; i++) {
      const file = info.fileList[i];
      if (file?.originFileObj) {
        const base64 = await getBase64(file.originFileObj);
        console.log(base64)
        // 将每个文件的 Base64 编码添加到数组中
        base64StrsArr.push(base64);
      }
    }
    base64StrRef.current = base64StrsArr
    setBase64Strs(base64StrsArr);
  }

  const sharedAttachmentProps: AttachmentsProps = {
    beforeUpload: () => false,
    items: fileItems,
    onChange: handleFileChange,
  };

  type ExtractFunc<T> = T extends (...args: any) => any ? T : never;
  const getPlaceholderFn = (
    inlinePlaceholder: ReturnType<ExtractFunc<AttachmentsProps['placeholder']>>,
  ) => {
    return (type: 'inline' | 'drop') =>
      type === 'drop'
        ? {
          title: 'Drop file here',
        }
        : inlinePlaceholder;
  };
  // 开始录音
  const startRecording = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = {
        audio: {
          channelCount: 1, // 单声道
          sampleRate: 16000, // 采样率设置为16000 Hz
          sampleSize: 16, // 采样位数为16bit
          echoCancellation: true, // 回音消除
          noiseSuppression: true // 降噪
        }
      };
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          mediaRecorder.start();
          setIsRecording(true);
        })
        .catch((error) => {
          console.error('录音失败:', error);
          message.error('录音失败，请检查权限设置');
        });
    } else {
      message.error('当前浏览器不支持录音功能');
    }
  };

  // 停止录音并上传
  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElementRef.current = new Audio(audioUrl);

        // 将录音文件上传
        const file: any = new File([audioBlob], `recorded_${Date.now()}.wav`, { type: 'audio/wav' });
        console.log("file", file)
        file.uid = Date.now();
        // handleUpload(file);
        handleFileChange({ file: file, fileList: [file] });
        onSubmit(' ')
        audioChunksRef.current = []; // 清空音频数据
      };
    }
  };

  const onSubmit = (nextContent: string) => {

    form.validateFields().then(() => {
      if (!nextContent) return;
      onRequest(nextContent);
      setContent('');
      setFileItems([]);
      isStart.current = true;
    }).catch((info) => {
      console.log('Validate Failed:', info);
      return;
    });
    
  };

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HeaderMenu */}
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='语音识别' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Row style={{ flex: 1 }}>
          <Col sm={6} md={4} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
            <Affix offsetTop={90}>
              <div>
              <Form layout="vertical" form={form}>
                  <Form.Item initialValue="whisper-3" label="语音识别模型" name='model' rules={[{ required: true, message: '请选择大语言模型' }]}>
                    <Select
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        currentModelrRef.current = value;
                      }}
                      options={data?.audio2text}
                    />
                  </Form.Item>
                  <Form.Item style={{marginBottom:'8px'}} initialValue={API_KEY} label="API_KEY" name='apikey' rules={[{ required: true, message: '请输入API_KEY' }]}>
                    <Input onChange={(e) => {
                      // 更新API_KEY
                      currentApiKeyrRef.current = e.target.value
                      openAIManager.updateApiKey(e.target.value, customFetch);
                    }} placeholder="API_KEY" />
                  </Form.Item>
                  <Link href="https://test.staihex.com/api_key" target='_blank' style={{ float: 'right' }}>获取API_KEY</Link>
                </Form>
                
                
              </div>
            </Affix>
          </Col>
          <Col sm={18} md={20} style={{ flex: 1, backgroundColor: '#f0f2f5', padding: '24px 24px 0px 24px' }}>
            <div className={styles.chat}>
              {/* 🌟 消息列表 */}
              <Bubble.List
                items={items.length > 0 ? items : [{
                  content: <WelcomeCard title="您好，我是语音识别智能机器人！"
                    description="请把需要处理的音频文件发送给我吧！" />, variant: 'borderless'
                }]}
                roles={roles}
                className={styles.messages}
              />
              {/* 🌟 输入框 */}
              <div ref={messagesEndRef} style={{ backgroundColor: '#f0f2f5', width: '100%', textAlign: 'center', position: 'sticky', bottom: 2 }}>
                <Attachments
                  {...sharedAttachmentProps}
                  maxCount={1}
                  accept='audio/*'
                  placeholder={getPlaceholderFn(
                    <Result
                      title="点击或拖拽文件上传"
                      subTitle='支持的格式: wav, mp3, ogg'
                      icon={<CloudUploadOutlined />}
                      extra={
                        <Button type="primary"
                          icon={<AudioOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            startRecording()
                          }}
                          onMouseUp={stopRecording}
                          onMouseLeave={stopRecording}
                          disabled={isRecording}>{isRecording ? '松开停止录音' : '按住开始录音'}</Button>
                      }
                      style={{ padding: 0 }}
                    />,
                  )}
                />
                <div style={{ width: '100%', display: 'flex', marginTop: '4px', justifyContent: 'end' }}>
                  {agent.isRequesting() ? (
                    <Button type="primary" icon={<PoweroffOutlined />} loading disabled />
                  ) : (<Button type="primary" onClick={() => onSubmit(' ')} icon={<SendOutlined />} shape='default' disabled={fileItems.length == 0}>发送</Button>)}
                </div>
                <Text style={{ marginBottom: '24px', display: 'block' }}>内容由 AI 大模型生成，请仔细甄别</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Layout>
    </>
  );
};

export default SpeechToText;