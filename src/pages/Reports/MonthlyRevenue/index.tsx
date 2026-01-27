import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Select, Table, Spin } from 'antd';
import { DollarOutlined, RiseOutlined, FallOutlined, LineChartOutlined, EyeOutlined } from '@ant-design/icons';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Column } from '@ant-design/plots';
import { db } from '../../../../config/firebaseConfig';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

interface LichSuGiaoDich {
  MaGiaoDich: string;
  PhuongThuc: string;
  SoTien: number;
  ThoiGianHoanThanh: number;
  ThoiGianTao: number;
  TrangThai: string;
  UserId: string;
}

interface DoanhThuTheoNgay {
  ngay: string;
  doanhThu: number;
  soGiaoDich: number;
}

interface DoanhThuTheoThang {
  thang: string;
  doanhThu: number;
}

interface QuangCaoTheoNgay {
  ngay: string;
  soLuong: number;
}

const RevenueReportPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [tongDoanhThu, setTongDoanhThu] = useState(0);
  const [doanhThuThangTruoc, setDoanhThuThangTruoc] = useState(0);
  const [tiLeThayDoi, setTiLeThayDoi] = useState(0);
  const [doanhThuTheoNgay, setDoanhThuTheoNgay] = useState<DoanhThuTheoNgay[]>([]);
  const [doanhThuTheoThang, setDoanhThuTheoThang] = useState<DoanhThuTheoThang[]>([]);
  const [compareMode, setCompareMode] = useState<'day' | 'month'>('day');
  
  // State cho quảng cáo
  const [tongQuangCao, setTongQuangCao] = useState(0);
  const [quangCaoTheoNgay, setQuangCaoTheoNgay] = useState<QuangCaoTheoNgay[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);

  useEffect(() => {
    // Chạy song song cả 2 queries với Promise.all
    Promise.all([fetchRevenueData(), fetchAdsData()]).catch((error) => {
      console.error('Lỗi khi tải dữ liệu:', error);
    });
  }, [selectedMonth]);

  const fetchAdsData = async () => {
    setLoadingAds(true);
    try {
      const soNgayTrongThang = selectedMonth.daysInMonth();
      
      // Tạo document ID đầu và cuối của tháng (YYYYMM01 đến YYYYMM31)
      const startId = selectedMonth.startOf('month').format('YYYYMMDD');
      const endId = selectedMonth.endOf('month').format('YYYYMMDD');
      
      // Query Range: Lấy tất cả documents có ID từ startId đến endId
      // Firestore không hỗ trợ query range theo document ID trực tiếp,
      // nên ta query toàn bộ collection và filter theo ID range
      const adsRef = collection(db, 'NhatKySoLuongQuangCaoHienThi');
      const querySnapshot = await getDocs(adsRef);
      
      const adsMap = new Map<string, number>();
      let tongSoLuong = 0;
      
      // Filter và map dữ liệu theo document ID range
      querySnapshot.forEach((docSnap) => {
        const docId = docSnap.id;
        
        // Chỉ lấy documents có ID trong range (YYYYMM01 đến YYYYMM31)
        if (docId >= startId && docId <= endId) {
          const data = docSnap.data();
          const soLuong = data.SoLuong || 0;
          
          // Parse ID: YYYYMMDD -> format ngày DD/MM
          const year = docId.substring(0, 4);
          const month = docId.substring(4, 6);
          const day = docId.substring(6, 8);
          const ngayKey = `${parseInt(day)}/${parseInt(month)}`;
          
          const currentSoLuong = adsMap.get(ngayKey) || 0;
          adsMap.set(ngayKey, currentSoLuong + soLuong);
          tongSoLuong += soLuong;
        }
      });
      
      // Chuyển Map thành Array, lọc bỏ ngày có giá trị = 0, và sort theo ngày
      const quangCaoNgay: QuangCaoTheoNgay[] = Array.from(adsMap.entries())
        .map(([ngay, soLuong]) => ({
          ngay,
          soLuong
        }))
        .filter((item) => item.soLuong > 0) // Lọc bỏ ngày có giá trị = 0
        .sort((a, b) => {
          // Sort theo ngày: parse DD/MM để so sánh
          const [dayA] = a.ngay.split('/').map(Number);
          const [dayB] = b.ngay.split('/').map(Number);
          return dayA - dayB;
        });

      setQuangCaoTheoNgay(quangCaoNgay);
      setTongQuangCao(tongSoLuong);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu quảng cáo:', error);
    } finally {
      setLoadingAds(false);
    }
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      // Query LichSuGiaoDich trong khoảng thời gian startOfMonth đến endOfMonth
      const startOfMonth = selectedMonth.startOf('month').toDate();
      const endOfMonth = selectedMonth.endOf('month').toDate();
      
      const lichSuGiaoDichRef = collection(db, 'LichSuGiaoDich');
      
      // Query với điều kiện thời gian và trạng thái
      // Lưu ý: Cần có composite index cho query này nếu chưa có
      const q = query(
        lichSuGiaoDichRef,
        where('ThoiGianHoanThanh', '>=', Timestamp.fromDate(startOfMonth)),
        where('ThoiGianHoanThanh', '<=', Timestamp.fromDate(endOfMonth)),
        where('TrangThai', '==', 'Hoàn thành'),
        orderBy('ThoiGianHoanThanh', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const giaoDichList: LichSuGiaoDich[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as LichSuGiaoDich;
        giaoDichList.push(data);
      });

      // Tính doanh thu tháng hiện tại
      const doanhThuThangNay = giaoDichList.reduce((sum, gd) => sum + gd.SoTien, 0);
      setTongDoanhThu(doanhThuThangNay);

      // Tính doanh thu tháng trước - Query riêng cho tháng trước
      const prevMonth = selectedMonth.subtract(1, 'month');
      const startOfPrevMonth = prevMonth.startOf('month').toDate();
      const endOfPrevMonth = prevMonth.endOf('month').toDate();
      
      const qPrevMonth = query(
        lichSuGiaoDichRef,
        where('ThoiGianHoanThanh', '>=', Timestamp.fromDate(startOfPrevMonth)),
        where('ThoiGianHoanThanh', '<=', Timestamp.fromDate(endOfPrevMonth)),
        where('TrangThai', '==', 'Hoàn thành')
      );
      
      const prevMonthSnapshot = await getDocs(qPrevMonth);
      const doanhThuThangTrc = prevMonthSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data() as LichSuGiaoDich;
        return sum + data.SoTien;
      }, 0);

      setDoanhThuThangTruoc(doanhThuThangTrc);

      // Tính tỷ lệ thay đổi
      const tiLe = doanhThuThangTrc > 0 
        ? ((doanhThuThangNay - doanhThuThangTrc) / doanhThuThangTrc) * 100 
        : doanhThuThangNay > 0 ? 100 : 0;
      setTiLeThayDoi(tiLe);

      // Map/group dữ liệu theo ngày sử dụng JavaScript
      const revenueMap = new Map<string, { doanhThu: number; soGiaoDich: number }>();
      
      giaoDichList.forEach((gd) => {
        const thoiGian = gd.ThoiGianHoanThanh || gd.ThoiGianTao;
        const date = dayjs(thoiGian);
        const ngayKey = `${date.date()}/${date.month() + 1}`;
        
        const current = revenueMap.get(ngayKey) || { doanhThu: 0, soGiaoDich: 0 };
        revenueMap.set(ngayKey, {
          doanhThu: current.doanhThu + gd.SoTien,
          soGiaoDich: current.soGiaoDich + 1
        });
      });

      // Chuyển Map thành Array, lọc bỏ ngày có giá trị = 0, và sort theo ngày
      const doanhThuNgay: DoanhThuTheoNgay[] = Array.from(revenueMap.entries())
        .map(([ngay, data]) => ({
          ngay,
          doanhThu: data.doanhThu,
          soGiaoDich: data.soGiaoDich
        }))
        .filter((item) => item.doanhThu > 0) // Lọc bỏ ngày có giá trị = 0
        .sort((a, b) => {
          // Sort theo ngày: parse DD/MM để so sánh
          const [dayA] = a.ngay.split('/').map(Number);
          const [dayB] = b.ngay.split('/').map(Number);
          return dayA - dayB;
        });

      setDoanhThuTheoNgay(doanhThuNgay);

      // Tính doanh thu 6 tháng gần nhất để so sánh
      const doanhThuThang: DoanhThuTheoThang[] = [];
      for (let i = 5; i >= 0; i--) {
        const thang = selectedMonth.subtract(i, 'month');
        const startOfM = thang.startOf('month').toDate();
        const endOfM = thang.endOf('month').toDate();
        
        // Query từng tháng (có thể tối ưu hơn bằng cách query 1 lần và filter)
        const qMonth = query(
          lichSuGiaoDichRef,
          where('ThoiGianHoanThanh', '>=', Timestamp.fromDate(startOfM)),
          where('ThoiGianHoanThanh', '<=', Timestamp.fromDate(endOfM)),
          where('TrangThai', '==', 'Hoàn thành')
        );
        
        const monthSnapshot = await getDocs(qMonth);
        const doanhThu = monthSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data() as LichSuGiaoDich;
          return sum + data.SoTien;
        }, 0);

        doanhThuThang.push({
          thang: `Tháng ${thang.month() + 1}/${thang.year()}`,
          doanhThu: doanhThu
        });
      }

      setDoanhThuTheoThang(doanhThuThang);
      
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu doanh thu:', error);
      // Fallback: Nếu query với ThoiGianHoanThanh thất bại, thử query với ThoiGianTao
      try {
        const lichSuGiaoDichSnapshot = await getDocs(collection(db, 'LichSuGiaoDich'));
        const giaoDichList: LichSuGiaoDich[] = [];
        
        lichSuGiaoDichSnapshot.forEach((doc) => {
          const data = doc.data() as LichSuGiaoDich;
          if (data.TrangThai === 'Hoàn thành') {
            giaoDichList.push(data);
          }
        });

        const startOfMonth = selectedMonth.startOf('month').valueOf();
        const endOfMonth = selectedMonth.endOf('month').valueOf();
        
        const doanhThuThangNay = giaoDichList
          .filter(gd => {
            const thoiGian = gd.ThoiGianHoanThanh || gd.ThoiGianTao;
            return thoiGian >= startOfMonth && thoiGian <= endOfMonth;
          })
          .reduce((sum, gd) => sum + gd.SoTien, 0);

        setTongDoanhThu(doanhThuThangNay);
        
        // Tính doanh thu theo ngày
        const revenueMap = new Map<string, { doanhThu: number; soGiaoDich: number }>();
        
        giaoDichList.forEach((gd) => {
          const thoiGian = gd.ThoiGianHoanThanh || gd.ThoiGianTao;
          const date = dayjs(thoiGian);
          const ngayKey = `${date.date()}/${date.month() + 1}`;
          
          if (thoiGian >= startOfMonth && thoiGian <= endOfMonth) {
            const current = revenueMap.get(ngayKey) || { doanhThu: 0, soGiaoDich: 0 };
            revenueMap.set(ngayKey, {
              doanhThu: current.doanhThu + gd.SoTien,
              soGiaoDich: current.soGiaoDich + 1
            });
          }
        });

        const doanhThuNgay: DoanhThuTheoNgay[] = Array.from(revenueMap.entries())
          .map(([ngay, data]) => ({
            ngay,
            doanhThu: data.doanhThu,
            soGiaoDich: data.soGiaoDich
          }))
          .filter((item) => item.doanhThu > 0)
          .sort((a, b) => {
            const [dayA] = a.ngay.split('/').map(Number);
            const [dayB] = b.ngay.split('/').map(Number);
            return dayA - dayB;
          });

        setDoanhThuTheoNgay(doanhThuNgay);
      } catch (fallbackError) {
        console.error('Lỗi fallback khi tải dữ liệu doanh thu:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + ' VND';
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('vi-VN');
  };

  // Hàm format số thành dạng rút gọn (1.2M, 500K, etc.)
  const formatCompactNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Component Column Chart chung cho cả 2 biểu đồ
  const ColumnChart: React.FC<{
    data: Array<{ ngay: string; value: number }>;
    title: string;
    color: string;
    loading: boolean;
  }> = ({ data, title, color, loading }) => {
    if (loading) {
      return (
        <Card title={title} bordered={false}>
          <Spin spinning={true} style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
        </Card>
      );
    }

    if (data.length === 0) {
      return (
        <Card title={title} bordered={false}>
          <div style={{ height: 400, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
            Không có dữ liệu để hiển thị
          </div>
        </Card>
      );
    }

    // Chuẩn bị dữ liệu cho Column chart
    const chartData = data.map((item) => ({
      ngay: item.ngay, // DD/MM format cho trục X
      value: item.value
    }));

    // Cấu hình cho Column chart
    const config = {
      data: chartData,
      xField: 'ngay',
      yField: 'value',
      columnStyle: {
        radius: [8, 8, 0, 0], // Bo góc phía trên
        fill: `l(0) 0:${color} 1:${color}dd`, // Gradient từ trên xuống
      },
      label: {
        position: 'top' as const,
        formatter: (datum: { value: number }) => {
          return formatCompactNumber(datum.value);
        },
        style: {
          fill: '#374151',
          fontSize: 12,
          fontWeight: 600,
        },
      },
      xAxis: {
        label: {
          style: {
            fill: '#6b7280',
            fontSize: 11,
          },
        },
      },
      yAxis: {
        label: {
          formatter: (text: string) => {
            const num = parseFloat(text);
            return formatCompactNumber(num);
          },
          style: {
            fill: '#6b7280',
            fontSize: 11,
          },
        },
      },
      tooltip: {
        formatter: (datum: { value: number }) => {
          return {
            name: 'Giá trị',
            value: formatCompactNumber(datum.value),
          };
        },
      },
      animation: {
        appear: {
          animation: 'wave-in',
          duration: 1000,
        },
      },
    };

    return (
      <Card title={title} bordered={false}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ minWidth: Math.max(600, data.length * 50), height: 400 }}>
            <Column {...config} />
          </div>
        </div>
      </Card>
    );
  };

  const onMonthChange = (date: Dayjs | null) => {
    if (date) {
      setSelectedMonth(date);
    }
  };

  const revenueColumns = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 100,
    },
    {
      title: 'Số giao dịch',
      dataIndex: 'soGiaoDich',
      key: 'soGiaoDich',
      align: 'right' as const,
      width: 150,
      sorter: (a: DoanhThuTheoNgay, b: DoanhThuTheoNgay) => a.soGiaoDich - b.soGiaoDich,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'doanhThu',
      key: 'doanhThu',
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          {formatCurrency(value)}
        </span>
      ),
      sorter: (a: DoanhThuTheoNgay, b: DoanhThuTheoNgay) => a.doanhThu - b.doanhThu,
    },
  ];

  const adsColumns = [
    {
      title: 'Ngày',
      dataIndex: 'ngay',
      key: 'ngay',
      width: 100,
    },
    {
      title: 'Số lượng quảng cáo',
      dataIndex: 'soLuong',
      key: 'soLuong',
      align: 'right' as const,
      render: (value: number) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {formatNumber(value)}
        </span>
      ),
      sorter: (a: QuangCaoTheoNgay, b: QuangCaoTheoNgay) => a.soLuong - b.soLuong,
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Bộ lọc */}
        <Card>
          <Row gutter={16} align="middle">
            <Col>
              <Space>
                <span style={{ fontWeight: 500 }}>Chọn tháng:</span>
                <DatePicker
                  picker="month"
                  value={selectedMonth}
                  onChange={onMonthChange}
                  format="MM/YYYY"
                  placeholder="Chọn tháng"
                  style={{ width: 200 }}
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <span style={{ fontWeight: 500 }}>Chế độ xem:</span>
                <Select
                  value={compareMode}
                  onChange={(value: 'day' | 'month') => setCompareMode(value)}
                  style={{ width: 220 }}
                >
                  <Select.Option value="day">Theo ngày trong tháng</Select.Option>
                  <Select.Option value="month">So sánh 6 tháng</Select.Option>
                </Select>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Thống kê tổng quan */}
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title={`Tổng doanh thu tháng ${selectedMonth.month() + 1}/${selectedMonth.year()}`}
                value={tongDoanhThu}
                prefix={<DollarOutlined />}
                loading={loading}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ color: '#3f8600', fontSize: '24px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="Doanh thu tháng trước"
                value={doanhThuThangTruoc}
                prefix={<LineChartOutlined />}
                loading={loading}
                formatter={(value) => formatCurrency(Number(value))}
                valueStyle={{ fontSize: '24px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title="So với tháng trước"
                value={Math.abs(tiLeThayDoi).toFixed(2)}
                prefix={tiLeThayDoi >= 0 ? <RiseOutlined /> : <FallOutlined />}
                suffix="%"
                loading={loading}
                valueStyle={{ 
                  color: tiLeThayDoi >= 0 ? '#3f8600' : '#cf1322',
                  fontSize: '24px'
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false}>
              <Statistic
                title={`Tổng quảng cáo tháng ${selectedMonth.month() + 1}/${selectedMonth.year()}`}
                value={tongQuangCao}
                prefix={<EyeOutlined />}
                loading={loadingAds}
                formatter={(value) => formatNumber(Number(value))}
                valueStyle={{ color: '#1890ff', fontSize: '24px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Biểu đồ doanh thu */}
        {compareMode === 'day' ? (
          <ColumnChart
            data={doanhThuTheoNgay.map(item => ({ ngay: item.ngay, value: item.doanhThu }))}
            title={`Doanh thu theo ngày - Tháng ${selectedMonth.month() + 1}/${selectedMonth.year()}`}
            color="#52c41a"
            loading={loading}
          />
        ) : (
          <Card title="So sánh doanh thu 6 tháng gần nhất" bordered={false}>
            <Spin spinning={loading}>
              <div style={{ height: 400, display: 'flex', alignItems: 'flex-end', padding: '20px 50px', gap: '10px' }}>
                {doanhThuTheoThang.map((item, index) => {
                  const maxValue = Math.max(...doanhThuTheoThang.map(d => d.doanhThu), 1);
                  const height = maxValue > 0 ? (item.doanhThu / maxValue) * 300 : 0;
                  return (
                    <div
                      key={`bar-${index}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 500, 
                        color: '#52c41a',
                        minHeight: '20px'
                      }}>
                        {item.doanhThu >= 1000000 ? `${(item.doanhThu / 1000000).toFixed(1)}M` : `${(item.doanhThu / 1000).toFixed(0)}K`}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: `${height}px`,
                          background: 'linear-gradient(180deg, #73d13d 0%, #52c41a 100%)',
                          borderRadius: '8px 8px 0 0',
                          transition: 'all 0.3s',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(82, 196, 26, 0.2)'
                        }}
                        title={`${item.thang}: ${formatCurrency(item.doanhThu)}`}
                      />
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#666',
                        textAlign: 'center',
                        lineHeight: '1.2'
                      }}>
                        {item.thang}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Spin>
          </Card>
        )}

        {/* Biểu đồ số lượng quảng cáo */}
        {compareMode === 'day' && (
          <ColumnChart
            data={quangCaoTheoNgay.map(item => ({ ngay: item.ngay, value: item.soLuong }))}
            title={`Số lượng quảng cáo theo ngày - Tháng ${selectedMonth.month() + 1}/${selectedMonth.year()}`}
            color="#1890ff"
            loading={loadingAds}
          />
        )}

        {/* Bảng chi tiết theo ngày */}
        {compareMode === 'day' && (
          <>
            <Card title="Chi tiết doanh thu theo ngày" bordered={false}>
              <Table
                columns={revenueColumns}
                dataSource={doanhThuTheoNgay}
                loading={loading}
                rowKey="ngay"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} của ${total} ngày`,
                }}
                locale={{
                  emptyText: 'Không có dữ liệu',
                }}
                scroll={{ y: 400 }}
              />
            </Card>

            <Card title="Chi tiết quảng cáo theo ngày" bordered={false}>
              <Table
                columns={adsColumns}
                dataSource={quangCaoTheoNgay}
                loading={loadingAds}
                rowKey="ngay"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} của ${total} ngày`,
                }}
                locale={{
                  emptyText: 'Không có dữ liệu',
                }}
                scroll={{ y: 400 }}
              />
            </Card>
          </>
        )}
      </Space>
    </div>
  );
};

export default RevenueReportPage;