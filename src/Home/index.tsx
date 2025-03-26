// src/App.tsx
import React from 'react';
import { Card, Col, Layout, Row, Typography } from 'antd';
import HeaderMenu from '../components/Header/HeaderMenu';
import 'antd/dist/reset.css'; // 引入 Ant Design 样式
import { useNavigate } from 'react-router-dom';
import application01 from "../../public/images/application01.png";
import application003 from "../../public/images/application003.png";
import application004 from "../../public/images/application004.png";
import application007 from "../../public/images/application007.png";
import application005 from "../../public/images/application005.png";
import application006 from "../../public/images/application006.png";

import application001 from "../../public/images/application001.png";
import application02 from "../../public/images/application02.png";
import application03 from "../../public/images/application03.png";
import application04 from "../../public/images/application04.png";
import application05 from "../../public/images/application05.png";
import application06 from "../../public/images/application06.png";
import application07 from "../../public/images/application07.png";



const { Title, Paragraph } = Typography;

const data = [
  { title: '文本生成', icon: <img src={application01} />, image: <img src={application001} style={{ height: 260, objectFit: 'cover' }} /> , url: '/text-gen' },
  { title: '图像理解', icon: <img src={application003} />, image: <img src={application02} style={{ height: 260, objectFit: 'cover' }} />, url: '/image-analysis' },
  { title: '图像生成', icon: <img src={application004} />, image: <img src={application03} style={{ height: 260, objectFit: 'cover' }} />, url: '/image-gen' },
  { title: '音色复刻', icon: <img src={application007} />, image: <img src={application04} style={{ height: 260, objectFit: 'cover' }} />, url: '/voice-clone' },
  { title: '语音合成', icon: <img src={application005} />, image: <img src={application05} style={{ height: 260, objectFit: 'cover' }} />, url: '/text-to-speech' },
  { title: '语音识别', icon: <img src={application007} />, image: <img src={application06} style={{ height: 260, objectFit: 'cover' }} />, url: '/speech-to-text' },
  { title: '语音交互', icon: <img src={application006} />, image: <img src={application07} style={{ height: 260, objectFit: 'cover' }} />, url: '/voice-chat' },
];

const App: React.FC = () => {
  const navigate = useNavigate();

  // useEffect(() => {
  //   window.location.href='https://test.staihex.com/apphubs';
  // },[])

  return (
    <Layout style={{ backgroundColor: 'transparent' }}>
      {/* 固定 HeaderMenu */}
      <Layout.Header style={{ background: 'transparent', position: 'fixed', zIndex: 1, width: '100%', padding: 0 }}>
        <HeaderMenu name='首页' />
      </Layout.Header>

      {/* 内容区域 */}
      <Layout.Content style={{ paddingTop: '64px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '48px',
          textAlign: 'center',
          color: '#fff'
        }}>
          <Title level={2}>应用列表</Title>
          <Paragraph>
            应用涵盖，文生图，图像理解，文生文，语音识别
          </Paragraph>
          <Row gutter={[16, 16]} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {data.map((item, index) => (
              <Col key={index} xs={24} sm={12} md={8} lg={8}>
                <Card
                  hoverable
                  onClick={() => navigate(item.url)}
                  cover={item.image}
                  style={{ width: '100%', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#F3F4F8' }}
                >
                  <Card.Meta
                    style={{ textAlign: 'start' }}
                    avatar={item.icon}
                    title={item.title}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default App;