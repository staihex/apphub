/* eslint-disable @typescript-eslint/no-explicit-any */
import markdownit from 'markdown-it';
import { createStyles } from 'antd-style';
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header/HeaderMenu';
import { Bubble, useXAgent, useXChat } from '@ant-design/x';
import { Affix, Avatar, Button, Cascader, Col, Divider, Form, GetProp, Input, Layout, message, Row, Select, Typography } from 'antd';
import { AudioOutlined, UserOutlined } from '@ant-design/icons';
import { API_KEY } from '../config/config';
import WelcomeCard from '../components/Other/WelcomeCard';
import WaveformPlayer from '../components/Voice/WaveformPlayer';
import application13 from '../../public/images/application13.png'
import OpenAIClientManager from '../utils/OpenAIClientManager';
import { addWavHeader, concatUint8Arrays, decodeAndPlayAudio } from '../utils/utils';
import { request } from '../services/request';
import Link from 'antd/es/typography/Link';
import { useFetch } from '../contexts/useFetch';
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



const VoiceChat: React.FC = () => {
  const { styles } = useStyle();
  const { data } = useFetch();
  const currentModelrRef = React.useRef('llava:7b');
  const currentTTSRef = React.useRef('cosyvoice-2');
  const currentSTTRef = React.useRef('whisper-3');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const currentApiKeyrRef = React.useRef(API_KEY);
  const [apiKey, setApiKey] = React.useState<string>(API_KEY);
  const md = markdownit({ html: true, breaks: true });

  const fileItemsRef = React.useRef<any>(null);
  const aiFileItemsRef = React.useRef<any>(null);

  const [isRecording, setIsRecording] = React.useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const userFileStorageRef = useRef<Map<any, File>>(new Map());
  const aiFileStorageRef = useRef<Map<any, File>>(new Map());
  const isStart = React.useRef(true);
  const currentVoiceRef = React.useRef<any>('');
  const [, setVoice] = React.useState<any>('');
  //  const [audioUrl, setAudioUrl] = React.useState<string>('')
  const [sysVoice, setSysVoice] = React.useState<any>([]);

  const [forceUpdate, setForceUpdate] = React.useState(false);
  const [form] = Form.useForm();

  const [userVoice, setUserVoice] = React.useState<any>([])
  
  const [keyStatus, setKeyStatus] = React.useState<number>(0);

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

  useEffect(() => {
    getUserVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  useEffect(() => {
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
  }, [])


  const customFetch1 = async (url: string | URL | Request, options: any) => {

    const controller = new AbortController();
    const signal = controller.signal;

    // 创建新的请求选项对象
    const newOptions = {
      ...options,
      // headers,
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

  const customFetch = async (url: any, options: any) => {
    const controller = new AbortController();
    const signal = controller.signal;

    // 创建新的请求选项对象
    const newOptions = {
      ...options,
      signal
    };

    // const replacedString = url.replace('https://test.staihex.com', '/api');

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

  const TTShandle = async (
    tgenContent: string, // 当前段的文本内容
    context: AudioContext, // 共享的 AudioContext
    currentTime: number // 当前音频播放的时间点
  ): Promise<{ chunks: Uint8Array; currentTime: number }> => {
    let accumulatedData = new Uint8Array(0); // 累积的音频数据
    const sampleRate = 22050; // 采样率
    const numChannels = 1; // 声道数
    const bytesPerSample = 2; // 每个样本的字节数
    let chunks = new Uint8Array(0); // 所有累积的音频数据块

    // 发起 TTS 请求
    const response: any = await customFetch1('https://test.staihex.com/api/ai/v1/audio/stream_speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: currentApiKeyrRef.current,
      },
      body: JSON.stringify({
        model: currentTTSRef.current,
        input: tgenContent,
        voice: currentVoiceRef.current || 'yunmeng',
        speed: 1,
        response_format: 'wav',
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const buffer = new Uint8Array(value).buffer;
      const waveBytes = new Uint8Array(buffer, 8, 4);

      // 将字节转换为字符串

      const waveId = String.fromCharCode(...waveBytes);
      if (waveId === 'WAVE') {
        continue;
      }
      // 累积接收到的音频数据
      accumulatedData = concatUint8Arrays(accumulatedData, value);
      chunks = concatUint8Arrays(chunks, value);

      // 确保数据长度是 2 字节对齐
      if (accumulatedData.length % bytesPerSample !== 0) continue;

      // 实时播放当前累积的数据
      currentTime = decodeAndPlayAudio(accumulatedData, sampleRate, numChannels, bytesPerSample, context, currentTime);

      // 清空累积数据，准备接收新数据块
      accumulatedData = new Uint8Array(0);
    }

    // 返回当前段的音频数据和更新后的播放时间
    return { chunks, currentTime };
  };

  const openAIManager = OpenAIClientManager.getInstance();
  openAIManager.initializeClient(currentApiKeyrRef.current, customFetch);

  const [agent] = useXAgent({
    request: async (_info, callbacks) => {
      const { onError } = callbacks;

      let attContent: string = '';
      const tgenContent: string = '';

      let fullContent = ''; // 存储完整的流数据
      let currentIndex = 0; // 当前输出的字符索引
      let isTyping = false; // 是否正在打字
      const typingInterval = 5; // 逐字输出的间隔时间(毫秒)

      let allChunks = new Uint8Array(0); // 所有累积的音频数据
      const context = new AudioContext(); // 共享的 AudioContext
      let currentTime = context.currentTime; // 当前音频播放的时间点

      try {
        // 调用语音转文字接口
        const att = await openAIManager.getClient().audio.transcriptions.create({
          model: currentSTTRef.current,
          file: fileItemsRef.current,
        });
        attContent += att.text || '';

        const usermessageId = Date.now().toString();
        userFileStorageRef.current.set(usermessageId, fileItemsRef.current);

        // 将语音转文字的结果更新到用户输入的消息列表
        setMessages((prevMessages) => {
          const filteredMessages = prevMessages.filter((msg) => msg.message.trim() !== '');
          return [
            ...filteredMessages,
            {
              id: usermessageId, // 生成唯一 ID
              message: attContent, // 语音转文字的结果
              status: 'local', // 标记为用户输入
            },
          ];
        });
        console.log("用户语音转文字:", attContent);

        // 调用大模型接口
        const tgen = await openAIManager.getClient().chat.completions.create({
          model: currentModelrRef.current,
          messages: [
            { role: 'system', content: '你擅长用中文回答' },
            { role: 'user', content: [{ type: 'text', text: attContent as string }] },
          ],
          stream: true,
        });
        const aimessageId = Date.now().toString();

        // 定时器函数：逐字输出
        const typeNextChar = () => {
          if (currentIndex < fullContent.length) {
            if (currentIndex === 0) {
              setMessages((prevMessages) => [
                ...prevMessages,
                {
                  id: aimessageId, // 生成唯一 ID
                  message: tgenContent, // AI 回复的内容
                  status: 'loading', // 标记为 AI 输入
                },
              ]);
            } else {
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === aimessageId
                    ? { ...msg, message: fullContent.slice(0, currentIndex + 1) } // 更新匹配的消息
                    : msg // 其他消息保持不变
                )
              );
            }
            currentIndex++;
            setTimeout(typeNextChar, typingInterval); // 继续下一次
          } else {
            isTyping = false; // 打字结束
          }
        };

        // 用于累积当前句子的内容
        let sentenceBuffer = '';

        // 异步处理 TTS 的任务队列
        const ttsQueue: string[] = [];

        for await (const chunk of tgen) {
          const tempStr = chunk.choices[0]?.delta?.content || '';
          fullContent += tempStr;

          // 打字机效果
          if (!isTyping) {
            isTyping = true;
            typeNextChar();
          }

          // 将新内容添加到句子缓冲区
          sentenceBuffer += tempStr;

          // 检查句子缓冲区是否包含完整的句子
          const sentenceEndIndex = sentenceBuffer.match(/[。！？]/)?.index;
          if (sentenceEndIndex !== undefined) {
            // 提取完整的句子
            const sentence = sentenceBuffer.slice(0, sentenceEndIndex + 1);
            sentenceBuffer = sentenceBuffer.slice(sentenceEndIndex + 1); // 移除已处理的句子

            // 如果有有效文本内容，加入队列
            if (sentence.trim() !== '') {
              ttsQueue.push(sentence);
            }
          }
        }

        // 处理剩余的句子缓冲区内容（如果有）
        if (sentenceBuffer.trim() !== '') {
          ttsQueue.push(sentenceBuffer);
        }

        // 顺序执行 TTS 任务
        for (const sentence of ttsQueue) {
          const { chunks, currentTime: updatedTime } = await TTShandle(sentence, context, currentTime);
          allChunks = concatUint8Arrays(allChunks, chunks); // 累积所有音频数据
          currentTime = updatedTime; // 更新当前播放时间
        }

        // 所有语音播放完成后，生成完整的 WAV 文件
        const wavAudioData = addWavHeader(allChunks, 22050, 1, 16); // 16 是每个样本的位数
        const blob = new Blob([wavAudioData], { type: 'audio/wav' });
        const file = new File([blob], `recorded_${Date.now()}.wav`, { type: 'audio/wav' });

        // 保存文件
        aiFileItemsRef.current = file;
        aiFileStorageRef.current.set(aimessageId, file);
        setForceUpdate((prev) => !prev);
        console.log("询问大模型结果:", tgenContent);

      } catch (error: any) {
        // handle error
        onError(error);
      }
    },
  });

  const { onRequest, messages, setMessages } = useXChat({
    agent,
  });

  useEffect(() => {
    // 当消息列表更新时，滚动到最底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map(({ id, message, status }) => ({
    key: id,
    avatar: { src: status == 'local' ? <Avatar style={{ backgroundColor: '#2467FF' }} icon={<UserOutlined />} /> : <Avatar src={application13} /> },
    role: status === 'local' ? 'local' : 'ai',
    styles: {
      content: {
        borderRadius: 16,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: status === 'local' ? 'rgb(239, 246, 255)' : '#FFF',
      },
    },
    messageRender: () => {
      if (status === 'local' && message !== '') {
        return <div style={{ display: 'flex', flexDirection: 'column' }} >
          {userFileStorageRef.current.has(id) && <WaveformPlayer autoPlay={false} file={userFileStorageRef.current.get(id)} />}

          <Divider />
          <Typography>
            <div dangerouslySetInnerHTML={{ __html: md.render(message) }} />
          </Typography>
        </div>
      } else {
        return <div style={{ display: 'flex', flexDirection: 'column' }} >
          {aiFileStorageRef.current.has(id) && <WaveformPlayer key={forceUpdate ? 'update' : 'no-update'} autoPlay={false} file={aiFileStorageRef.current.get(id)} />}
          <Divider />
          <Typography>
            <div dangerouslySetInnerHTML={{ __html: md.render(message) }} />
          </Typography>
        </div>
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

  const onSubmit = (nextContent: string) => {
    // if (!nextContent) return;
    onRequest(nextContent);
    isStart.current = true;
  };

  // 开始录音
  const startRecording = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
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
        // audioElementRef.current.play();

        // 将录音文件上传
        const file = new File([audioBlob], `recorded_${Date.now()}.wav`, { type: 'audio/wav' });

        fileItemsRef.current = file
        onSubmit('')
        audioChunksRef.current = []; // 清空音频数据
      };
    }
  };

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HeaderMenu */}
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='语音交互' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Row style={{ flex: 1 }}>
          <Col sm={6} md={4} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
            <Affix offsetTop={90}>
              <div>
                <Form layout="vertical" form={form}>
                  <Form.Item initialValue="whisper-3" label="语音识别模型" name='STT' rules={[{ required: true, message: '请选择大语言模型' }]}>
                    <Select
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        currentSTTRef.current = value;
                      }}
                      options={data?.audio2text}
                    />
                  </Form.Item>
                  <Form.Item initialValue="llava:7b" label="大语言模型" name='model' rules={[{ required: true, message: '请选择大语言模型' }]}>
                    <Select
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        currentModelrRef.current = value;
                      }}
                      options={data?.llm}
                    />
                  </Form.Item>
                  <Form.Item initialValue={"cosyvoice-2"} name='TTS' label="语音合成模型" rules={[{ required: true, message: '请选择语音合成模型' }]}>
                    <Select
                      onChange={(value) => {
                        currentTTSRef.current = value
                      }}
                      options={data?.text2audio}
                    />
                  </Form.Item>
                  <Form.Item style={{marginBottom:'8px'}}>
                    <Form.Item style={{marginBottom: '8px'}} initialValue={API_KEY} label="API_KEY" name='apikey' rules={[{ required: true, message: '请输入API_KEY' }]}>
                      <Input onChange={(e) => {
                        // 更新API_KEY
                        setApiKey(e.target.value);
                        currentApiKeyrRef.current = e.target.value
                        openAIManager.updateApiKey(e.target.value, customFetch);
                      }} placeholder="API_KEY" />
                    </Form.Item>
                    <Link href="https://test.staihex.com/api_key" target='_blank' style={{ float: 'right' }}>获取API_KEY</Link>
                  </Form.Item>
                  <Form.Item extra={keyStatus === 0 ? '请先配置API_KEY' : keyStatus === 1 ? 'API_KEY有误' : ''} initialValue={[1,"yunmeng"]} name='voice' label="音色选择" rules={[{ required: true, message: '请选择音色!' }]}>
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
                          form.setFieldsValue({ voice: value });
                        }}
                      />
                  </Form.Item>
                </Form>
                {/* <Text style={{ display: 'block', marginTop: '32px' }}>选择音色</Text> */}

              </div>
            </Affix>
          </Col>
          <Col sm={18} md={20} style={{ flex: 1, backgroundColor: '#f0f2f5', padding: '24px 24px 0px 24px' }}>
            <div className={styles.chat}>
              {/* 🌟 消息列表 */}
              <Bubble.List
                items={items.length > 0 ? items : [{
                  content: <WelcomeCard title="您好，我是语音交互智能机器人！"
                    description="请尽情向我提问吧！" />, variant: 'borderless'
                }]}
                roles={roles}
                className={styles.messages}
              />
              {/* 🌟 输入框 */}
              <div ref={messagesEndRef} style={{ backgroundColor: '#f0f2f5', width: '100%', zIndex: 99, textAlign: 'center', position: 'sticky', bottom: 2 }}>
                <Button
                  type="primary"
                  block
                  icon={<AudioOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    startRecording()
                  }}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  disabled={isRecording || apiKey.trim() === ''}
                >
                  {isRecording ? '松开停止录音' : '按住开始录音'}
                </Button>

                <Text style={{ marginBottom: '24px', display: 'block' }}>内容由 AI 大模型生成，请仔细甄别</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Layout>
    </>
  );
};

export default VoiceChat;