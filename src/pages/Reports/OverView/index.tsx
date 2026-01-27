import { StatisticCard, ProCard } from '@ant-design/pro-components';
import { Row, Col } from 'antd';

const { Statistic } = StatisticCard;

const ReportsDashboard = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Báo cáo tổng quan</h1>
      <Row gutter={16}>
        <Col span={6}>
          <StatisticCard statistic={{ title: 'Tổng số người chơi', value: 1250 }} />
        </Col>
        <Col span={6}>
          <StatisticCard statistic={{ title: 'Người chơi online', value: 320 }} />
        </Col>
        <Col span={6}>
          <StatisticCard statistic={{ title: 'Doanh thu tháng', value: 5000000, suffix: 'VNĐ' }} />
        </Col>
        <Col span={6}>
          <StatisticCard statistic={{ title: 'Giao dịch hôm nay', value: 89 }} />
        </Col>
      </Row>

      <ProCard title="Biểu đồ doanh thu" headerBordered style={{ marginTop: 24 }}>
        <div style={{ height: 200, textAlign: 'center', lineHeight: '200px' }}>
          [Biểu đồ sẽ đặt ở đây]
        </div>
      </ProCard>

      <ProCard title="Người chơi trong ngày" headerBordered style={{ marginTop: 24 }}>
        <div style={{ height: 200, textAlign: 'center', lineHeight: '200px' }}>
          [Biểu đồ số người chơi sẽ đặt ở đây]
        </div>
      </ProCard>
    </div>
  );
};

export default ReportsDashboard;
