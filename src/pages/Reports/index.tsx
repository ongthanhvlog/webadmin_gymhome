import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Space, message, Button, Segmented } from 'antd';
import { UserOutlined, DollarOutlined, TransactionOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import { Column } from '@ant-design/plots';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface TaiKhoan {
  Email: string;
  IdGame: string;
  TenDangNhap: string;
  Tien: number;
  TrangThai: boolean;
  ThongSoNguoiChoi: {
    SoTienDaKiem: number;
    TongSoTran: number;
    SoTranThang: number;
  };
}

interface GiaoDich {
  MaGiaoDichZaloPay?: number;
  PhuongThuc?: string;
  SoTien?: number;
  ThoiGianHoanThanh?: number | Timestamp;
  ThoiGianTao?: number | Timestamp;
  TrangThai?: string;
  UserId?: string;
}

interface DoanhThuTheoNgay {
  ngay: string;
  soTien: number;
  soGiaoDich: number;
}

type TimeRangeType = '7days' | '30days' | '90days' | 'custom';

const StatisticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tongNguoiChoi, setTongNguoiChoi] = useState(0);
  const [tongDoanhThu, setTongDoanhThu] = useState(0);
  const [tongGiaoDich, setTongGiaoDich] = useState(0);
  const [doanhThuTheoNgay, setDoanhThuTheoNgay] = useState<DoanhThuTheoNgay[]>([]);
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('30days');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleTimeRangeChange = (value: TimeRangeType) => {
    setTimeRangeType(value);
    
    if (value === '7days') {
      setDateRange([dayjs().subtract(7, 'days'), dayjs()]);
    } else if (value === '30days') {
      setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
    } else if (value === '90days') {
      setDateRange([dayjs().subtract(90, 'days'), dayjs()]);
    }
  };

  const getTimestamp = (gd: GiaoDich): number | null => {
    const timeField = gd.ThoiGianHoanThanh || gd.ThoiGianTao;
    if (!timeField) return null;

    if (typeof timeField === 'number') return timeField;

    if ('seconds' in timeField && typeof timeField.seconds === 'number') {
      return timeField.seconds * 1000;
    }

    if (typeof timeField === 'object' && 'toMillis' in timeField && typeof timeField.toMillis === 'function') {
      return timeField.toMillis();
    }

    return null;
  };

  const isCompleted = (status?: string): boolean => {
    return status === 'Hoàn thành';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lấy tổng số người chơi
      const taiKhoanSnapshot = await getDocs(collection(db, 'TaiKhoan'));
      setTongNguoiChoi(taiKhoanSnapshot.size);

      // Lấy tất cả giao dịch
      const giaoDichSnapshot = await getDocs(collection(db, 'LichSuGiaoDich'));
      const allGiaoDich: GiaoDich[] = [];
      
      giaoDichSnapshot.forEach((doc) => {
        const data = doc.data();
        allGiaoDich.push(data as GiaoDich);
      });

      // Filter giao dịch theo điều kiện
      const startTimestamp = dateRange[0].valueOf();
      const endTimestamp = dateRange[1].endOf('day').valueOf();

      const filteredGiaoDich = allGiaoDich.filter((gd) => {
        const timestamp = getTimestamp(gd);
        if (!timestamp || !isCompleted(gd.TrangThai)) return false;
        return timestamp >= startTimestamp && timestamp <= endTimestamp;
      });

      // Tính tổng doanh thu và số giao dịch
      const tongTien = filteredGiaoDich.reduce((sum, gd) => sum + (Number(gd.SoTien) || 0), 0);
      
      setTongDoanhThu(tongTien);
      setTongGiaoDich(filteredGiaoDich.length);

      // Nhóm doanh thu theo ngày
      const doanhThuMap = new Map<string, { soTien: number; soGiaoDich: number }>();

      filteredGiaoDich.forEach((gd) => {
        const timestamp = getTimestamp(gd);
        if (!timestamp) return;

        const ngay = dayjs(timestamp).format('YYYY-MM-DD');
        const current = doanhThuMap.get(ngay) || { soTien: 0, soGiaoDich: 0 };
        const soTien = Number(gd.SoTien) || 0;
        
        doanhThuMap.set(ngay, {
          soTien: current.soTien + soTien,
          soGiaoDich: current.soGiaoDich + 1
        });
      });

      // Chuyển đổi sang array và sắp xếp
      const doanhThuArray: DoanhThuTheoNgay[] = Array.from(doanhThuMap.entries())
        .map(([ngay, data]) => ({
          ngay,
          soTien: data.soTien,
          soGiaoDich: data.soGiaoDich
        }))
        .sort((a, b) => a.ngay.localeCompare(b.ngay));

      setDoanhThuTheoNgay(doanhThuArray);
      
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      message.error('Có lỗi xảy ra khi tải dữ liệu. Vui lòng kiểm tra console.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: '25%',
      render: (text: string) => (
        <Space size="small">
          <CalendarOutlined style={{ color: '#1890ff', fontSize: '13px' }} />
          <span style={{ fontSize: '13px' }}>{dayjs(text).format('DD/MM/YYYY')}</span>
        </Space>
      ),
      sorter: (a: DoanhThuTheoNgay, b: DoanhThuTheoNgay) => 
        a.ngay.localeCompare(b.ngay),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Số giao dịch',
      dataIndex: 'soGiaoDich',
      key: 'soGiaoDich',
      width: '25%',
      align: 'center' as const,
      render: (text: number) => (
        <span style={{ 
          backgroundColor: '#e6f7ff', 
          padding: '2px 10px', 
          borderRadius: '3px',
          fontSize: '13px',
          color: '#1890ff'
        }}>
          {text}
        </span>
      ),
      sorter: (a: DoanhThuTheoNgay, b: DoanhThuTheoNgay) => 
        a.soGiaoDich - b.soGiaoDich,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'soTien',
      key: 'soTien',
      width: '25%',
      align: 'right' as const,
      render: (text: number) => (
        <span style={{ 
          fontSize: '13px',
          color: '#52c41a'
        }}>
          {text.toLocaleString('vi-VN')} đ
        </span>
      ),
      sorter: (a: DoanhThuTheoNgay, b: DoanhThuTheoNgay) => 
        a.soTien - b.soTien,
    },
    {
      title: 'TB/GD',
      key: 'trungBinh',
      width: '25%',
      align: 'right' as const,
      render: (_: any, record: DoanhThuTheoNgay) => (
        <span style={{ 
          fontSize: '13px',
          color: '#8c8c8c'
        }}>
          {(record.soTien / record.soGiaoDich).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
        </span>
      ),
      sorter: (a: DoanhThuTheoNgay, b: DoanhThuTheoNgay) => 
        (a.soTien / a.soGiaoDich) - (b.soTien / b.soGiaoDich),
    },
  ];

  // Tính số ngày để hiển thị label phù hợp
  const totalDays = doanhThuTheoNgay.length;
  const labelInterval = totalDays > 30 ? Math.floor(totalDays / 15) : 
                        totalDays > 15 ? Math.floor(totalDays / 10) : 0;

  const chartConfig = {
    data: doanhThuTheoNgay,
    xField: 'ngay',
    yField: 'soTien',
    columnStyle: {
      radius: [6, 6, 0, 0],
    },
    columnWidthRatio: 0.6,
    color: '#1890ff',
    label: false, // Tắt label trên cột
    xAxis: {
      label: {
        autoRotate: false,
        formatter: (text: string, item: any, index: number) => {
          // Chỉ hiển thị một số ngày nhất định
          if (labelInterval === 0 || index % labelInterval === 0 || index === totalDays - 1) {
            return dayjs(text).format('DD/MM');
          }
          return '';
        },
        style: {
          fontSize: 11,
        },
      },
    },
    yAxis: {
      label: {
        formatter: (text: string) => {
          const value = Number(text);
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
          }
          return `${(value / 1000).toFixed(0)}K`;
        },
        style: {
          fontSize: 11,
        },
      },
    },
    tooltip: {
      formatter: (datum: DoanhThuTheoNgay) => {
        return {
          name: 'Doanh thu',
          value: `${datum.soTien.toLocaleString('vi-VN')} đ (${datum.soGiaoDich} GD)`,
        };
      },
    },
    meta: {
      ngay: { alias: 'Ngày' },
      soTien: { alias: 'Doanh thu' },
    },
  };

  // Tính toán trung bình
  const trungBinhDoanhThu = doanhThuTheoNgay.length > 0 
    ? tongDoanhThu / doanhThuTheoNgay.length 
    : 0;
  
  const trungBinhGiaoDich = doanhThuTheoNgay.length > 0 
    ? tongGiaoDich / doanhThuTheoNgay.length 
    : 0;

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ margin: 0, marginBottom: '8px' }}>Báo cáo thống kê</h2>
          <p style={{ margin: 0, color: '#8c8c8c' }}>
            Từ {dateRange[0].format('DD/MM/YYYY')} đến {dateRange[1].format('DD/MM/YYYY')}
          </p>
        </div>

        {/* Statistics Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              bordered={false}
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#8c8c8c' }}>Tổng số người chơi</span>}
                value={tongNguoiChoi}
                prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                loading={loading}
                valueStyle={{ color: '#262626', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              bordered={false}
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#8c8c8c' }}>Tổng doanh thu</span>}
                value={tongDoanhThu}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                suffix="đ"
                loading={loading}
                valueStyle={{ color: '#52c41a', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              bordered={false}
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#8c8c8c' }}>Tổng giao dịch</span>}
                value={tongGiaoDich}
                prefix={<TransactionOutlined style={{ color: '#fa8c16' }} />}
                loading={loading}
                valueStyle={{ color: '#262626', fontWeight: 600 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              bordered={false}
              style={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <Statistic
                title={<span style={{ fontSize: '14px', color: '#8c8c8c' }}>TB doanh thu/ngày</span>}
                value={trungBinhDoanhThu}
                suffix="đ"
                precision={0}
                loading={loading}
                valueStyle={{ color: '#722ed1', fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bộ lọc thời gian */}
        <Card 
          bordered={false}
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '8px' }}>Chọn khoảng thời gian</h3>
                <Segmented
                  options={[
                    { label: '7 ngày', value: '7days' },
                    { label: '30 ngày', value: '30days' },
                    { label: '90 ngày', value: '90days' },
                    { label: 'Tùy chỉnh', value: 'custom' },
                  ]}
                  value={timeRangeType}
                  onChange={handleTimeRangeChange}
                />
              </div>
              
              {timeRangeType === 'custom' && (
                <Space>
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        setDateRange([dates[0], dates[1]]);
                      }
                    }}
                    format="DD/MM/YYYY"
                    placeholder={['Từ ngày', 'Đến ngày']}
                  />
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    onClick={fetchData}
                  >
                    Áp dụng
                  </Button>
                </Space>
              )}
            </div>
          </Space>
        </Card>

        {/* Biểu đồ */}
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Biểu đồ doanh thu theo ngày</span>
              <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#8c8c8c' }}>
                Trung bình: {trungBinhGiaoDich.toFixed(1)} GD/ngày
              </span>
            </div>
          }
          loading={loading}
          bordered={false}
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          {doanhThuTheoNgay.length > 0 ? (
            <div style={{ height: '350px' }}>
              <Column {...chartConfig} height={350} />
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px', 
              color: '#bfbfbf',
              background: '#fafafa',
              borderRadius: '8px'
            }}>
              <CalendarOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', margin: 0 }}>Không có dữ liệu trong khoảng thời gian đã chọn</p>
            </div>
          )}
        </Card>

        {/* Bảng chi tiết */}
        <Card 
          title="Chi tiết doanh thu theo ngày" 
          loading={loading}
          bordered={false}
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <Table
            columns={columns}
            dataSource={doanhThuTheoNgay}
            rowKey="ngay"
            locale={{
              emptyText: 'Không có dữ liệu'
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} ngày`,
              pageSizeOptions: ['10', '20', '50'],
            }}
            summary={(pageData) => {
              let tongTien = 0;
              let tongGD = 0;
              
              pageData.forEach(({ soTien, soGiaoDich }) => {
                tongTien += soTien;
                tongGD += soGiaoDich;
              });

              const trungBinhPage = tongGD > 0 ? tongTien / tongGD : 0;

              return pageData.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#fafafa' }}>
                    <Table.Summary.Cell index={0}>
                      <strong style={{ fontSize: '13px' }}>Tổng cộng</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">
                      <strong style={{ 
                        fontSize: '13px',
                        color: '#1890ff',
                        backgroundColor: '#e6f7ff',
                        padding: '2px 10px',
                        borderRadius: '3px',
                        display: 'inline-block'
                      }}>
                        {tongGD}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <strong style={{ fontSize: '13px', color: '#52c41a' }}>
                        {tongTien.toLocaleString('vi-VN')} đ
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <strong style={{ fontSize: '13px', color: '#8c8c8c' }}>
                        {trungBinhPage.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null;
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default StatisticsPage;