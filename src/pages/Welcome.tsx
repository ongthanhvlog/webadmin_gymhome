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
        flex: '0 0 calc(33.333% - 11px)',
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
 * Trang chào mừng của hệ thống quản trị 
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
            Chào mừng đến với Hệ thống Quản trị Ứng Dụng GymHome - Hỗ trợ tập thể dục và rèn luyện sức khỏe
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
            Đây là trang quản trị được phát triển nhằm hỗ trợ vận hành 
            quản lý toàn bộ hệ thống ứng dụng hỗ trỡ tập thể dục. 
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
              title="Quản lý bài viết"
              desc="Chỉnh sửa các bài viết từ được lấy dữ liệu từ trang web báo liên quan đến sức khỏe, dinh dưỡng, bài tập."
            />
            <InfoCard
              index={2}
              title="Quản lý người dùng"
              desc="Tìm kiếm, theo dõi và quản lý toàn bộ thông tin tài khoản người dùng trong hệ thống."
            />
            <InfoCard
              index={3}
              title="Quản lý vùng tập trung"
              desc="Xây dựng và quản lý các nhóm bài tập được chia theo vùng  như ngực, tay, bụng, chân hoặc lưng."
            />
            <InfoCard
              index={4}
              title="Quản lý thử thách"
              desc="Tạo các thử thách luyện tập nhằm tăng động lực cho người dùng."
            />
            <InfoCard
              index={5}
              title="Quản lý kế hoạch"
              desc="Hỗ trợ xây dựng kế hoạch 30 ngày với danh sách bài tập khoa học theo từng cấp độ nhằm phù hợp cho nhiều đối tượng."
            />
            <InfoCard
              index={6}
              title="Chăm sóc khách hàng"
              desc="Tiếp nhận yêu cầu, đánh giá, đề xuất và xử lý phản hồi gửi đến người dùng."
            />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};

export default Welcome;
