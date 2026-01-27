import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, theme } from 'antd';
import React from 'react';

/**
 * Thẻ thông tin chức năng trong trang chào mừng
 */
const InfoCard: React.FC<{
  title: string;
  index: number;
  desc: string;
}> = ({ title, index, desc }) => {
  const { useToken } = theme;
  const { token } = useToken();

  return (
    <div
      style={{
        backgroundColor: token.colorBgContainer,
        boxShadow: token.boxShadow,
        borderRadius: '8px',
        fontSize: '14px',
        color: token.colorTextSecondary,
        lineHeight: '22px',
        padding: '16px 19px',
        minWidth: '240px',
        flex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            textAlign: 'center',
            lineHeight: '40px',
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: token.colorPrimary,
          }}
        >
          {index}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: token.colorTextHeading,
            fontWeight: 500,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ textAlign: 'justify' }}>{desc}</div>
    </div>
  );
};

/**
 * Trang chào mừng của hệ thống quản trị game đánh bài online
 */
const Welcome: React.FC = () => {
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');

  return (
    <PageContainer>
      <Card
        style={{
          borderRadius: 8,
        }}
        bodyStyle={{
          backgroundImage:
            initialState?.settings?.navTheme === 'realDark'
              ? 'linear-gradient(75deg, #1A1B1F 0%, #191C1F 100%)'
              : 'linear-gradient(75deg, #FAFAFA 0%, #F5F5F5 100%)',
        }}
      >
        <div
          style={{
            backgroundPosition: '100% -30%',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '300px auto',
            backgroundImage:
              "url('https://gw.alipayobjects.com/mdn/rms_a9745b/afts/img/A*BuFmQqsB2iAAAAAAAAAAAAAAARQnAQ')",
          }}
        >
          <div
            style={{
              fontSize: '22px',
              color: token.colorTextHeading,
              fontWeight: 600,
            }}
          >
            Chào mừng đến với Hệ thống Quản trị Game Đánh Bài Online
          </div>
          <p
            style={{
              fontSize: '15px',
              color: token.colorTextSecondary,
              lineHeight: '24px',
              marginTop: 16,
              marginBottom: 32,
              width: '70%',
              textAlign: 'justify',
            }}
          >
            Đây là trang quản trị được phát triển nhằm hỗ trợ đội ngũ vận hành 
            quản lý toàn bộ hệ thống game đánh bài trực tuyến. 
            Trang web cung cấp các công cụ theo dõi người chơi, quản lý sự kiện, 
            xử lý giao dịch, chăm sóc khách hàng và quản trị tài khoản một cách hiệu quả.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <InfoCard
              index={1}
              title="Quản lý người chơi"
              desc="Xem, tìm kiếm và quản lý thông tin người chơi trong hệ thống, bao gồm trạng thái tài khoản, lịch sử đăng nhập và hoạt động trong game."
            />
            <InfoCard
              index={2}
              title="Quản lý nội dung"
              desc="Tạo và chỉnh sửa các sự kiện trong game, quản lý hệ thống giftcode, giúp duy trì và phát triển nội dung trò chơi."
            />
            <InfoCard
              index={3}
              title="Quản lý tài chính"
              desc="Theo dõi lịch sử nạp rút, doanh thu và các giao dịch trong hệ thống nhằm đảm bảo tính minh bạch và an toàn tài chính."
            />
            <InfoCard
              index={4}
              title="Chăm sóc khách hàng"
              desc="Xử lý phản hồi và hỗ trợ người chơi nhanh chóng, đảm bảo trải nghiệm người dùng tốt nhất trong quá trình tham gia trò chơi."
            />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default Welcome;
