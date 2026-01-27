import React, { useState, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { ProCard, StatisticCard } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { UserOutlined, CrownOutlined, WifiOutlined, RiseOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../../../config/firebaseConfig';
import { Row, Col, Segmented } from 'antd';

const { Statistic } = StatisticCard;

const API_BASE_URL = 'https://api-2i3u7alegq-as.a.run.app';

interface TaiKhoan {
  Email: string;
  IdGame: string;
  TenDangNhap: string;
  Tien: number;
  TrangThai: boolean;
  ThongSoNguoiChoi?: {
    SoTienDaKiem?: number;
    TongSoTran?: number;
    SoTranThang?: number;
  };
}

interface TopNguoiChoi {
  key: string;
  rank: number;
  TenDangNhap: string;
  Tien: number;
  Email: string;
}

interface UserData {
  key: string;
  tenDangNhap: string;
  tien: number;
  tongSoTran: number;
}

interface ChartData {
  ngay: string;
  soNguoiHoatDong: number;
  dateKey: string;
}

const UserReportPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [tongNguoiChoi, setTongNguoiChoi] = useState(0);
  const [soNguoiOnline, setSoNguoiOnline] = useState(0);
  const [topNguoiChoi, setTopNguoiChoi] = useState<TopNguoiChoi[]>([]);
  const [userList, setUserList] = useState<UserData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dateRange, setDateRange] = useState<7 | 30>(30);

  // ✅ FIX: Load dữ liệu ngay khi component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBasicData(),
        fetchActivityData(dateRange)
      ]);
      setLoading(false);
    };
    
    initializeData();
  }, []);

  // ✅ FIX: Chỉ refetch chart data khi đổi dateRange (sau khi đã load xong)
  useEffect(() => {
    if (!loading && dateRange) {
      fetchActivityData(dateRange);
    }
  }, [dateRange]);

  const getAuthToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  };

  const fetchBasicData = async () => {
    try {
      const taiKhoanSnapshot = await getDocs(collection(db, 'TaiKhoan'));
      const taiKhoanList: TaiKhoan[] = [];
      
      taiKhoanSnapshot.forEach((doc) => {
        const data = doc.data() as TaiKhoan;
        taiKhoanList.push(data);
      });

      const tongNguoi = taiKhoanList.length;
      setTongNguoiChoi(tongNguoi);

      // Fetch số người online
      try {
        const token = await getAuthToken();
        
        if (!token) {
          setSoNguoiOnline(0);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/SoLuongNguoiChoiOnline`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result && typeof result.SoLuong === 'number') {
            setSoNguoiOnline(result.SoLuong);
          } else {
            setSoNguoiOnline(0);
          }
        } else {
          setSoNguoiOnline(0);
        }
      } catch (apiError) {
        setSoNguoiOnline(0);
      }

      const top10 = taiKhoanList
        .sort((a, b) => b.Tien - a.Tien)
        .slice(0, 10)
        .map((tk, index) => ({
          key: index.toString(),
          rank: index + 1,
          TenDangNhap: tk.TenDangNhap,
          Tien: tk.Tien,
          Email: tk.Email,
        }));

      setTopNguoiChoi(top10);

      const data: UserData[] = taiKhoanList.map((tk) => ({
        key: tk.IdGame || tk.Email,
        tenDangNhap: tk.TenDangNhap,
        tien: tk.Tien,
        tongSoTran: tk.ThongSoNguoiChoi?.TongSoTran || 0,
      }));

      setUserList(data);
      
    } catch (error) {
      // Silent error handling
    }
  };

  const generateDateKeys = (days: number): string[] => {
    const dateKeys: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      dateKeys.push(`${year}${month}${day}`);
    }
    
    return dateKeys;
  };

  const fetchActivityData = async (days: 7 | 30) => {
    setChartLoading(true);
    try {
      const dateKeys = generateDateKeys(days);
      const activityData: { [key: string]: number } = {};

      const promises = dateKeys.map(async (dateKey) => {
        try {
          const taiKhoanCollectionRef = collection(
            db, 
            'NhatKyTaiKhoanHoatDong', 
            dateKey, 
            'TaiKhoan'
          );
          
          const taiKhoanSnapshot = await getDocs(taiKhoanCollectionRef);
          const soNguoiHoatDong = taiKhoanSnapshot.size;
          
          if (soNguoiHoatDong > 0) {
            activityData[dateKey] = soNguoiHoatDong;
          }
        } catch (error) {
          // Silent error handling
        }
      });

      await Promise.all(promises);

      const sortedData: ChartData[] = Object.keys(activityData)
        .sort()
        .map((key) => ({
          ngay: formatDate(key),
          soNguoiHoatDong: activityData[key],
          dateKey: key,
        }));
      
      setChartData(sortedData);
      
    } catch (error) {
      // Silent error handling
    } finally {
      setChartLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}`;
  };

  const getTongNguoiHoatDong = (): number => {
    return chartData.reduce((sum, item) => sum + item.soNguoiHoatDong, 0);
  };



  const topColumns: ProColumns<TopNguoiChoi>[] = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      align: 'center',
      search: false,
      render: (_, record) => (
        <span style={{ 
          fontWeight: 'bold',
          color: record.rank <= 3 ? '#faad14' : 'inherit'
        }}>
          {record.rank <= 3 && <CrownOutlined style={{ marginRight: 4 }} />}
          {record.rank}
        </span>
      ),
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'TenDangNhap',
      key: 'TenDangNhap',
      copyable: true,
      ellipsis: true,
    },
    {
      title: 'Số xu',
      dataIndex: 'Tien',
      key: 'Tien',
      search: false,
      render: (_, record) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>
          {record.Tien.toLocaleString('vi-VN')}
        </span>
      ),
      sorter: (a, b) => a.Tien - b.Tien,
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      copyable: true,
      ellipsis: true,
    },
  ];

  return (
    <PageContainer
      title="Báo cáo người chơi"
      subTitle="Thống kê và phân tích dữ liệu người chơi"
    >
      {/* ✅ UPDATED: 3 Cards - Bỏ "Trung bình/ngày" */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <StatisticCard
            statistic={{
              title: 'Tổng số người chơi',
              value: tongNguoiChoi,
              icon: <UserOutlined style={{ color: '#1890ff', fontSize: 32 }} />,
            }}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <StatisticCard
            statistic={{
              title: 'Số người đang online',
              value: soNguoiOnline,
              icon: <WifiOutlined style={{ color: '#52c41a', fontSize: 32 }} />,
              valueStyle: { color: '#52c41a' },
            }}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={24} lg={8}>
          <StatisticCard
            statistic={{
              title: `Tổng số người chơi hoạt động (${dateRange} ngày)`,
              value: getTongNguoiHoatDong(),
              icon: <RiseOutlined style={{ color: '#fa8c16', fontSize: 32 }} />,
              valueStyle: { color: '#fa8c16', fontWeight: 600 },
            }}
            loading={loading || chartLoading}
          />
        </Col>
      </Row>

      {/* ✅ UPDATED: Bar Chart thay vì Line Chart */}
      <ProCard
        title="Biểu đồ hoạt động người chơi theo ngày"
        loading={loading}
        style={{ marginTop: 16 }}
        bordered
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Segmented
              value={dateRange}
              onChange={(value) => setDateRange(value as 7 | 30)}
              options={[
                { label: '7 ngày', value: 7 },
                { label: '30 ngày', value: 30 },
              ]}
              disabled={loading || chartLoading}
            />
            <span style={{ color: '#999', fontSize: 14 }}>
              {chartData.length > 0 ? `${chartData.length} ngày có dữ liệu` : 'Đang tải...'}
            </span>
          </div>
        }
      >
        {!loading && !chartLoading && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="ngay" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
                stroke="#999"
              />
              <YAxis 
                label={{ 
                  value: 'Số người hoạt động', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: 14, fill: '#666' }
                }}
                tick={{ fontSize: 12 }}
                stroke="#999"
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
                labelStyle={{ fontWeight: 'bold', marginBottom: 8 }}
                formatter={(value: number) => [value, 'Số người']}
                cursor={{ fill: 'rgba(24, 144, 255, 0.1)' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                iconType="rect"
              />
              <Bar 
                dataKey="soNguoiHoatDong" 
                name="Số người hoạt động"
                fill="#1890ff"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ 
            height: 400, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#999',
            gap: 16
          }}>
            {loading || chartLoading ? (
              <>
                <div style={{ fontSize: 16 }}>Đang tải dữ liệu...</div>
                <div style={{ fontSize: 14 }}>Đang truy vấn {dateRange} ngày gần nhất</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  Không có dữ liệu hoạt động để hiển thị
                </div>
                <div style={{ fontSize: 14 }}>
                  Có thể chưa có người chơi hoạt động trong {dateRange} ngày qua
                </div>
              </>
            )}
          </div>
        )}
      </ProCard>

      <ProCard
        title="Top 10 người chơi giàu nhất"
        style={{ marginTop: 16 }}
        bordered
      >
        <ProTable<TopNguoiChoi>
          columns={topColumns}
          dataSource={topNguoiChoi}
          rowKey="key"
          search={false}
          pagination={false}
          loading={loading}
          options={false}
          dateFormatter="string"
        />
      </ProCard>
    </PageContainer>
  );
};

export default UserReportPage;