import { GithubOutlined } from '@ant-design/icons';
import { DefaultFooter } from '@ant-design/pro-components';
import React from 'react';

/**
 * Thành phần Footer
 */
const Footer: React.FC = () => {
  return (
    <DefaultFooter
      style={{
        background: 'none',
      }}
      copyright="Được cung cấp bởi nhà phát triển Tiến Lên Miền Nam"
      links={[
        {
          key: 'Tiến Lên Miền Nam',
          title: 'Website nhóm phát triển Tiến Lên Miền Nam',
          href: 'https://github.com/Tuanngoc21/tienLenmn',
          blankTarget: true,
        },
        // {
        //   key: 'Ant Design Pro',
        //   title: 'Ant Design Pro',
        //   href: 'https://pro.ant.design',
        //   blankTarget: true,
        // },
        // {
        //   key: 'github',
        //   title: <GithubOutlined />,
        //   href: 'https://github.com/ant-design/ant-design-pro',
        //   blankTarget: true,
        // },
        // {
        //   key: 'Ant Design',
        //   title: 'Ant Design',
        //   href: 'https://ant.design',
        //   blankTarget: true,
        // },
      ]}
    />
  );
};

export default Footer;
