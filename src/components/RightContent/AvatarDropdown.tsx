import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Spin } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';
import { flushSync } from 'react-dom';
// import { outLogin } from '@/services/ant-design-pro/api'; // không cần nếu chỉ dùng Firebase
import HeaderDropdown from '../HeaderDropdown';
import { auth } from '../../../config/firebaseConfig'; // import auth từ Firebase

export type GlobalHeaderRightProps = {
  menu?: boolean;
  children?: React.ReactNode;
};

export const AvatarName = () => {
  const { initialState } = useModel('@@initialState');
  const { currentUser } = initialState || {};
  return <span className="anticon">{currentUser?.name}</span>;
};

const useStyles = createStyles(({ token }) => ({
  action: {
    display: 'flex',
    height: '48px',
    marginLeft: 'auto',
    overflow: 'hidden',
    alignItems: 'center',
    padding: '0 8px',
    cursor: 'pointer',
    borderRadius: token.borderRadius,
    '&:hover': { backgroundColor: token.colorBgTextHover },
  },
}));

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  menu,
  children,
}) => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');

  const loginOut = async () => {
    try {
      // ✅ Logout Firebase
      await auth.signOut();

      // Reset initialState
      flushSync(() => {
        setInitialState((s) => ({ ...s, currentUser: undefined }));
      });

      // Redirect về trang login
      const { search, pathname } = window.location;
      const searchParams = new URLSearchParams({ redirect: pathname + search });
      history.replace({
        pathname: '/user/login',
        search: searchParams.toString(),
      });
    } catch (error) {
      console.error('Logout thất bại:', error);
    }
  };

  const onMenuClick: MenuProps['onClick'] = (event) => {
    const { key } = event;
    if (key === 'logout') {
      loginOut();
      return;
    }
    history.push(`/account/${key}`);
  };

  const loading = (
    <span className={styles.action}>
      <Spin size="small" style={{ marginLeft: 8, marginRight: 8 }} />
    </span>
  );

  if (!initialState) return loading;

  const { currentUser } = initialState;
  if (!currentUser || !currentUser.name) return loading;

  const menuItems = [
    ...(menu
      ? [
          { key: 'center', icon: <UserOutlined />, label: 'Trung tâm cá nhân' },
          { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt cá nhân' },
          { type: 'divider' as const },
        ]
      : []),
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất' },
  ];

  return (
    <HeaderDropdown
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
    >
      {children}
    </HeaderDropdown>
  );
};
