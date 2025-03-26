/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import HeaderMenu from '../components/Header/HeaderMenu';
import { Affix, Avatar, Button, Col, GetProp, Input, Layout, message, Row, Select, Typography, Badge, Space, Flex, Form } from 'antd';
import { createStyles } from 'antd-style';
import { Attachments, AttachmentsProps, Bubble, Sender, useXAgent, useXChat } from '@ant-design/x';
import markdownit from 'markdown-it';
import { CloudUploadOutlined, CopyOutlined, PaperClipOutlined, RedoOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { API_KEY } from '../config/config';
import { useFetch } from '../contexts/useFetch';
import application13 from '/public/images/application13.png'
import { getBase64 } from '../utils/utils';
import WelcomeCard from '../components/Other/WelcomeCard';
import OpenAIClientManager from '../utils/OpenAIClientManager';
import Link from 'antd/es/typography/Link';
import Loading from '../components/Loading/Loading';
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
    placeholder: css`
      padding-top: 32px;
    `,
    sender: css`
      box-shadow: ${token.boxShadow};
    `,
  };
});

const md = markdownit({ html: true, breaks: true });

const ImageAnalysis: React.FC = () => {
  const { data } = useFetch();
  const [messageApi, contextHolder] = message.useMessage();
  const [fileItems, setFileItems] = React.useState<GetProp<AttachmentsProps, 'items'>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentModelrRef = React.useRef('llava:7b');
  const [base64Strs, setBase64Strs] = React.useState([]);
  const base64StrRef = React.useRef([]);
  const currentApiKeyrRef = React.useRef(API_KEY);
  const isStart = React.useRef(true);
  const [content, setContent] = React.useState('');
  const [headerOpen, setHeaderOpen] = React.useState(false);
  const { styles } = useStyle();
  const [form] = Form.useForm();

  const isReMessage = React.useRef(false);

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


  const openAIManager = OpenAIClientManager.getInstance();
  openAIManager.initializeClient(currentApiKeyrRef.current, customFetch);

  const [agent] = useXAgent({
    request: async (info, callbacks) => {
      const { message } = info;

      const { onSuccess, onUpdate, onError } = callbacks;
      const { current: base64Strs } = base64StrRef;

      if (isReMessage.current) {
        isReMessage.current = false;
        setMessages((prevMessages: any) => {
          prevMessages.pop();
          return [...prevMessages]
        });
      }

      let contentArr: any = [];
      if (base64Strs.length != 0) {
        contentArr = [{ type: 'text', text: message?.split('\n') }]
        for (let i = 0; i < base64Strs.length; i++) {
          contentArr.push({ type: "image_url", image_url: { url: base64Strs[i] } });
        }
      } else {
        contentArr = [{ type: 'text', text: message }]
      }

      let content: string = '';
      let fullContent = ''; // 存储完整的流数据
      let currentIndex = 0; // 当前输出的字符索引
      let isTyping = false; // 是否正在打字
      const typingInterval = 5; // 逐字输出的间隔时间

      try {
        onUpdate('');
        const stream = await openAIManager.getClient().chat.completions.create({
          model: currentModelrRef.current,
          messages: [
            { role: 'system', content: '你擅长用中文回答，每次你都必须使用中文来回答问题，当用户给你图片时，请你使用中文描述图片，并尽可能详细地描述图片中的内容。' },
            { role: 'user', content: contentArr },
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
          content += chunk.choices[0]?.delta?.content || '';
          fullContent = content; // 追加到完整的流数据

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
    avatar: { src: status == 'local' ? <Avatar style={{ backgroundColor: '#2467FF' }} icon={<UserOutlined />} /> : <Avatar src={application13} /> },
    role: status === 'local' ? 'local' : 'ai',
    footer:
      <Space size={2}>
        {status !== 'loading' && status !== 'local' && <Flex>
          <Button color="default" onClick={() => {
            navigator.clipboard.writeText(message);
            messageApi.success('复制成功');
          }} variant="text" size="small" icon={<CopyOutlined />} />
          {index === messages.length - 1 && <Button color="default" onClick={() => {
            const reMessage = messages[messages.length - 2]?.message
            isReMessage.current = true;
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
      const parts: any = message.split('\n');
      if (message === '') {
        return (
          <Typography>
            <Loading />
          </Typography>
        )
      } else {
        return <Typography>
          {parts.map((part: any, index: any) => {
            if (part.startsWith('data:image/')) {
              // 显示 base64 编码的图片
              return <img key={index} style={{ width: '20vh', height: '20vh', objectFit: 'cover' }} src={part} alt={`Base64 Image ${index}`} />;
            } else if (part.startsWith('http://') || part.startsWith('https://')) {
              // 显示图片 URL
              return <img key={index} style={{ width: '20vh', height: '20vh', objectFit: 'cover' }} src={part} alt={`Image URL ${index}`} />;
            } else {
              // 显示普通文本
              return <span key={index} dangerouslySetInnerHTML={{ __html: md.render(part) }} />;
            }
          })}
        </Typography>
      }
    }
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
      if (base64Strs.length != 0) {
        for (let i = 0; i < base64Strs.length; i++) {
          nextContent = nextContent + '\n' + base64Strs[i];
        }
      }
      onRequest(nextContent);
      setContent('');
      setFileItems([]);
      isStart.current = true;
      setHeaderOpen(false);
    }).catch((info) => {
      console.log('Validate Failed:', info);
      return;
    })

  };

  const handleFileChange: GetProp<typeof Attachments, 'onChange'> = async (info) => {
    setFileItems(info.fileList.map(file => file));

    const base64StrsArr: any = [];
    for (let i = 0; i < info.fileList.length; i++) {
      const base64 = await getBase64(info.fileList[i].originFileObj);
      console.log(base64)
      // 将每个文件的 Base64 编码添加到数组中
      base64StrsArr.push(base64);
    }
    base64StrRef.current = base64StrsArr
    setBase64Strs(base64StrsArr);
    console.log("文件列表：", info.fileList);
  }

  const attachmentsNode = (
    <Badge dot={fileItems.length > 0 && !headerOpen}>
      <Button type="text" icon={<PaperClipOutlined />} onClick={() => setHeaderOpen(!headerOpen)} />
    </Badge>
  );

  const senderHeader = (
    <Sender.Header
      title="附件"
      open={headerOpen}
      onOpenChange={setHeaderOpen}
      styles={{
        content: {
          padding: 0,
        },
      }}
    >
      <Attachments
        accept="image/jpeg, image/png, image/gif, image/svg+xml"
        maxCount={1}
        beforeUpload={() => {
          if (base64Strs.length != 0) {
            setBase64Strs([]);
            base64StrRef.current = []
          }
          return false;
        }}
        items={fileItems}
        onChange={handleFileChange}
        placeholder={(type) =>
          type === 'drop'
            ? { title: 'Drop file here' }
            : {
              icon: <CloudUploadOutlined />,
              title: '上传文件',
              description: '单击或拖动文件到此区域进行上传',
            }
        }
      />
    </Sender.Header>
  );


  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* HeaderMenu */}
        <Affix offsetTop={0}>
          <Layout.Header style={{ background: 'transparent', width: '100%', padding: 0 }}>
            <HeaderMenu name='图像理解' />
          </Layout.Header>
        </Affix>

        {/* 内容区域 */}
        <Row style={{ flex: 1 }}>
          <Col sm={6} md={4} style={{ backgroundColor: '#FFF', padding: '24px 24px 0px 24px' }}>
            <Affix offsetTop={90}>
              <div>
                <Form layout="vertical" form={form}>
                  <Form.Item initialValue="llava:7b" label="图像理解模型" name='model' rules={[{ required: true, message: '请选择大语言模型' }]}>
                    <Select
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        currentModelrRef.current = value;
                      }}
                      options={data?.vision}
                    />
                  </Form.Item>
                  <Form.Item initialValue={API_KEY} label="API_KEY" name='apikey' rules={[{ required: true, message: '请输入API_KEY' }]} style={{marginBottom:'8px'}}>
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
                items={items.length > 0 ? items : [{ content: <WelcomeCard title='您好，我是图像理解智能机器人！' description='把您想要处理的图像文件发给我吧！' />, variant: 'borderless' }]}
                roles={roles}
                className={styles.messages}
              />
              {/* 🌟 输入框 */}
              <div ref={messagesEndRef} style={{ backgroundColor: '#f0f2f5', width: '100%', textAlign: 'center', position: 'sticky', bottom: 2 }}>
                <Sender
                  value={content}
                  header={senderHeader}
                  onSubmit={onSubmit}
                  onChange={setContent}
                  prefix={attachmentsNode}
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
};

export default ImageAnalysis;