import { Space } from 'antd';
import { Welcome } from '@ant-design/x';
import application13 from '/public/images/application13.png'

const WelcomeCard = ({ title, description } : { title: string, description: string }) => {
  return (
    <Space direction="vertical" size={16} style={{ paddingTop: '32px' }}>
      <Welcome
        variant="borderless"
        icon={<img src={application13} alt="icon" />} // 确保有 alt 属性
        title={title}
        description={description}
      />
    </Space>
  );
};

export default WelcomeCard;