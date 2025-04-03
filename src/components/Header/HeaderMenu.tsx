// src/components/HeaderMenu.tsx
import React from 'react';
import { Layout, Button } from 'antd';
import logo from "/images/logo.png";
const HOME_URL = import.meta.env.VITE_API_BASE_URL;

interface HeaderMenuProps {
  name: string;
}

const { Header } = Layout;

const HeaderMenu: React.FC<HeaderMenuProps> = (props) => {

  return (
    <Header style={{ backgroundColor: 'rgba(255, 255, 255, 1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* Logo 和菜单 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Logo */}
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '48px' }}>
          <img src={logo} alt="Logo" onClick={() => window.location.href = HOME_URL}  />
        </div>
        <span style={{ marginRight: '32px', tabSize: '14px', color: 'rgba(50, 50, 50, 1)', fontWeight: 'Medium' }}>{props.name}</span>
  
        <Button type="default" href='https://test.staihex.com/apphubs'>返回应用广场</Button>

      </div>
    </Header>
  );
};

export default HeaderMenu;