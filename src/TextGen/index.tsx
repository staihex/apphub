import markdownit from 'markdown-it';
import { createStyles } from 'antd-style';
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header/HeaderMenu';
import { Bubble, Sender, useXAgent, useXChat } from '@ant-design/x';
import { Affix, Avatar, Button, Col, Flex, Form, GetProp, Input, Layout, message, Row, Select, Space, Typography } from 'antd';
import { CopyOutlined, RedoOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { useFetch } from '../contexts/useFetch';
import { API_KEY } from '../config/config';
import application13 from '/public/images/application13.png'
import OpenAIClientManager from '../utils/OpenAIClientManager';
import WelcomeCard from '../components/Other/WelcomeCard';
import Link from 'antd/es/typography/Link';
import '../styles.css'
import Loading from '../components/Loading/Loading';

const { Text } = Typography;

// 创建样式
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

// 文本生成组件
const TextGen: React.FC = React.memo(() => {
  const { data } = useFetch();
  const { styles } = useStyle();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const currentModelrRef = React.useRef('llava:7b');
  const md = markdownit({ html: true, breaks: true });
  const currentApiKeyrRef = React.useRef(API_KEY);
  const isStart = React.useRef(true);

  const [form] = Form.useForm();

  // 设置初始内容
  const [content, setContent] = React.useState('');

  const isReMessage = React.useRef(false);
  // 自定义请求函数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customFetch = async (url: string | URL | Request, options: any) => {

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

  // 初始化OpenAI客户端
  const openAIManager = OpenAIClientManager.getInstance();
  openAIManager.initializeClient(currentApiKeyrRef.current, customFetch);


  // 使用XAgent
  const [agent] = useXAgent({
    request: async (info, callbacks) => {
      const { message } = info;
      const { onSuccess, onUpdate, onError } = callbacks;

      if (isReMessage.current) {
        isReMessage.current = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((prevMessages: any) => {
          prevMessages.pop();
          return [...prevMessages]
        });
      }

      let contentStr: string = '';
      let fullContent = ''; // 存储完整的流数据
      let currentIndex = 0; // 当前输出的字符索引
      let isTyping = false; // 是否正在打字
      const typingInterval = 5; // 逐字输出的间隔时间(毫秒)

      try {
        onUpdate('');
        const stream = await openAIManager.getClient().chat.completions.create({
          model: currentModelrRef.current,
          messages: [
            { role: 'system', content: '你擅长用中文回答' },
            { role: 'user', content: [{ type: 'text', text: message as string }] },
          ],
          stream: true,
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

        // 逐步接收流数据
        for await (const chunk of stream) {
          contentStr += chunk.choices[0]?.delta?.content || '';
          fullContent = contentStr; // 追加到完整的流数据

          // 如果当前没有正在打字，则启动打字效果
          if (!isTyping) {
            isTyping = true;
            typeNextChar();
          }
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        onError(error);
      }
    },
  });

  // 使用XChat
  const { onRequest, messages, setMessages } = useXChat({
    agent,
  });

  // 消息列表更新时滚动到底部
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

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map(({ id, message, status }, index) => ({
    key: id,
    avatar: { src: status == 'local' ? <Avatar style={{ backgroundColor: '#2467FF' }} icon={<UserOutlined />} /> : <Avatar src={application13} /> },
    role: status === 'local' ? 'local' : 'ai',
    footer:
      <Space size={2}>
        {status !== 'loading' && <Flex>
          <Button color="default" onClick={() => {
            navigator.clipboard.writeText(message);
            messageApi.success('复制成功');
          }} variant="text" size="small" icon={<CopyOutlined />} />
          {status !== 'local' && index === messages.length - 1 && <Button color="default" onClick={() => {
            const reMessage = messages[messages.length - 2]?.message
            isReMessage.current = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setMessages((prevMessages: any) => {
              prevMessages.pop();
              return [...prevMessages]
            });
            onRequest(reMessage);
          }} variant="text" size="small" icon={<RedoOutlined />} />}
        </Flex>}
      </Space>,
    styles: {
      content: {
        borderRadius: 16,
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: status === 'local' ? 'rgb(239, 246, 255)' : '#FFF',
      },
    },
    messageRender: () => {
      if (message === '') {
        return (
          <Typography>
            <Loading />
          </Typography>
        )
      } else {
        return (
          <>
            <Typography style={{ marginTop: '10px' }}>
              <div dangerouslySetInnerHTML={{ __html: md.render(message) }} />
            </Typography>
          </>
        );
      }
    },
  }));

  const roles: GetProp<typeof Bubble.List, 'roles'> = {
    ai: {
      placement: 'start',
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
    form.validateFields().then(() => {
      if (!nextContent) return;
      onRequest(nextContent);
      setContent('');
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
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='文本生成' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Row style={{ flex: 1 }}>
          <Col sm={6} md={4} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
            <Affix offsetTop={90}>
              <div>
                <Form layout="vertical" form={form}>
                  <Form.Item initialValue="llava:7b" label="大语言模型" name='model' rules={[{ required: true, message: '请选择大语言模型' }]}>
                    <Select
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        currentModelrRef.current = value;
                      }}
                      options={data?.llm}
                    />
                  </Form.Item>
                  <Form.Item initialValue={API_KEY} label="API_KEY" name='apikey' rules={[{ required: true, message: '请输入API_KEY' }]} style={{ marginBottom:'8px'}}>
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
                items={items.length > 0 ? items : [{ content: <WelcomeCard title="您好，我是文本生成智能机器人!" description='你有什么问题尽管向我提问吧！' />, variant: 'borderless' }]}
                roles={roles}
                className={styles.messages}
              />
              {/* 🌟 输入框 */}
              <div ref={messagesEndRef} style={{ backgroundColor: '#f0f2f5', width: '100%', textAlign: 'center', position: 'sticky', bottom: 2 }}>
                <Sender
                  value={content}
                  onSubmit={onSubmit}
                  placeholder="请输入您的问题,使用 Shift + Enter 换行"
                  onChange={setContent}
                  loading={agent.isRequesting()}
                  className={styles.sender}
                  actions={(_, info) => {
                    const { SendButton, LoadingButton } = info.components;
                    return (
                      <Space size="small">
                        {agent.isRequesting() ? (
                          <LoadingButton type="default" disabled />
                        ) : (
                          <SendButton type="primary" icon={<SendOutlined />} disabled={content.trim() === ''} shape='default' >发送</SendButton>
                        )}
                      </Space>
                    );
                  }}
                />
                <Text style={{ marginBottom: '24px', display: 'block' }}>内容由 AI 大模型生成，请仔细甄别</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Layout>
    </>
  );
});

export default TextGen;