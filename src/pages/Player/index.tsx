import React, { useRef, useState } from 'react';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Button,
  ConfigProvider,
  Modal,
  Space,
  Descriptions,
  message,
  Divider,
  Tabs,
  Badge,
} from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import UpdatePlayerModal from './UpdatePlayer_index';
import { getAuth, getIdToken } from 'firebase/auth';

// Định nghĩa lại interface Player với đầy đủ properties
export interface Player {
  id: string;
  TenDangNhap: string;
  Email: string;
  Tien: number;
  TrangThai: boolean;
  ThongSoNguoiChoi: {
    ChuoiThang?: number;
    ChuoiThangCaoNhat?: number;
    SoTienCaoNhatDatDuoc?: number;
    SoTienDaKiem?: number;
    SoTienIngameDaNap?: number;
    SoTranThang?: number;
    SoTienDaThua?: number;
    TongThoiGianChoi?: number;
  };
}

const PlayerPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const bannedActionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState('active');

  const getAuthToken = async () => {
    const auth = getAuth();
    const user = auth.currentUser;  

    if (user) {
      const token = await getIdToken(user, /* forceRefresh */ false);
      return token;
    }
    throw new Error('Không tìm thấy người dùng đăng nhập');
  }

  const fetchPlayers = async (params?: any, isBanned: boolean = false) => {
    try {
      const snapshot = await getDocs(collection(db, 'TaiKhoan'));
      let data: Player[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          TenDangNhap: d.TenDangNhap || '',
          Email: d.Email || '',
          Tien: d.Tien || 0,
          TrangThai: d.TrangThai ?? true,
          ThongSoNguoiChoi: d.ThongSoNguoiChoi || {},
        };
      });

      // Lọc theo trạng thái
      data = data.filter(item => isBanned ? !item.TrangThai : item.TrangThai);

      if (params?.TenDangNhap)
        data = data.filter((item) =>
          item.TenDangNhap.toLowerCase().includes(params.TenDangNhap.toLowerCase()),
        );

      if (params?.Email)
        data = data.filter((item) =>
          item.Email.toLowerCase().includes(params.Email.toLowerCase()),
        );

      return { data, success: true, total: data.length };

    } catch (error) {
      console.error(error);
      message.error('Lấy danh sách người chơi thất bại!');
      return { data: [], success: false };
    }
  };

  // ===========================
  // ⭐ API BAN TÀI KHOẢN ⭐
  // ===========================
  const banTaiKhoan = async (uid: string) => {
    try {
      const token = await getAuthToken();
      
      const res = await fetch("https://api-2i3u7alegq-as.a.run.app/TatTaiKhoanNguoiChoi", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ UserId: uid }),
      });

      const data = await res.json();

      if (data.success) {
        message.success("Khóa tài khoản thành công!");
        actionRef.current?.reload();
        bannedActionRef.current?.reload();
      } else {
        message.error(data.loi || data.message || "Khóa tài khoản thất bại!");
      }
    } catch (error) {
      console.error(error);
      message.error("Không thể kết nối API khóa tài khoản");
    }
  };

  // ===========================
  // ⭐ API MỞ TÀI KHOẢN ⭐
  // ===========================
  const unbanTaiKhoan = async (uid: string) => {
    try {
      const token = await getAuthToken();
      
      const res = await fetch("https://api-2i3u7alegq-as.a.run.app/BatTaiKhoanNguoiChoi", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ UserId: uid }),
      });

      const data = await res.json();

      if (data.success) {
        message.success("Mở khóa tài khoản thành công!");
        actionRef.current?.reload();
        bannedActionRef.current?.reload();
      } else {
        message.error(data.loi || data.message || "Mở khóa tài khoản thất bại!");
      }
    } catch (error) {
      console.error(error);
      message.error("Không thể kết nối API mở khóa tài khoản");
    }
  };

  const handleBan = (record: Player) => {
    Modal.confirm({
      title: 'Xác nhận khóa tài khoản',
      content: `Bạn có chắc muốn khóa tài khoản "${record.TenDangNhap}"?`,
      okText: 'Khóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => banTaiKhoan(record.id),
    });
  };

  const handleUnBan = (record: Player) => {
    Modal.confirm({
      title: 'Xác nhận mở khóa tài khoản',
      content: `Bạn có chắc muốn mở khóa tài khoản "${record.TenDangNhap}"?`,
      okText: 'Mở khóa',
      cancelText: 'Hủy',
      onOk: () => unbanTaiKhoan(record.id),
    });
  };

  const showDetail = (record: Player) => {
    setDetailData({
      ...record.ThongSoNguoiChoi,
      Tien: record.Tien,
      TrangThai: record.TrangThai,
    });
    setDetailVisible(true);
  };

  const showHistory = async (record: Player) => {
    try {
      const q = query(
        collection(db, 'TaiKhoan',record.id,'LichSuGiaoDich'),
      );
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setHistoryData(data);
      setHistoryVisible(true);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải lịch sử giao dịch');
    }
  };

  // Columns cho tài khoản hoạt động
  const activeColumns: ProColumns<Player>[] = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'TenDangNhap',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
    },
    {
      title: 'Thông số người chơi',
      render: (_, record) => (
        <a onClick={() => showDetail(record)}>Xem chi tiết</a>
      ),
    },
    {
      title: 'Lịch sử giao dịch',
      render: (_, record) => (
        <a onClick={() => showHistory(record)}>Xem chi tiết</a>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "TrangThai",
      render: (_, record) => (
        <Badge status="success" text="Hoạt động" />
      ),
    },
    {
      title: 'Tùy chọn',
      render: (_, record) => (
        <Space>
          <a
            onClick={() => {
              setEditingPlayer(record);
              setModalVisible(true);
            }}
          >
            Chỉnh sửa
          </a>
          <a style={{ color: 'red' }} onClick={() => handleBan(record)}>
            Khóa tài khoản
          </a>
        </Space>
      ),
    },
  ];

  // Columns cho tài khoản đã khóa
  const bannedColumns: ProColumns<Player>[] = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'TenDangNhap',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
    },
    {
      title: 'Thông số người chơi',
      render: (_, record) => (
        <a onClick={() => showDetail(record)}>Xem chi tiết</a>
      ),
    },
    {
      title: 'Lịch sử giao dịch',
      render: (_, record) => (
        <a onClick={() => showHistory(record)}>Xem chi tiết</a>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "TrangThai",
      render: (_, record) => (
        <Badge status="error" text="Bị khóa" />
      ),
    },
    {
      title: 'Tùy chọn',
      render: (_, record) => (
        <Space>
          <a
            onClick={() => {
              setEditingPlayer(record);
              setModalVisible(true);
            }}
          >
            Chỉnh sửa
          </a>
          <a style={{ color: 'green' }} onClick={() => handleUnBan(record)}>
            Mở khóa
          </a>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'active',
            label: 'Tài khoản hoạt động',
            children: (
              <ProTable<Player>
                headerTitle="Danh sách người chơi đang hoạt động"
                actionRef={actionRef}
                rowKey="id"
                columns={activeColumns}
                request={(params) => fetchPlayers(params, false)}
                pagination={{ pageSize: 7 }}
              />
            ),
          },
          {
            key: 'banned',
            label: (
              <span>
                Tài khoản đã khóa
              </span>
            ),
            children: (
              <ProTable<Player>
                headerTitle="Danh sách tài khoản đã bị khóa"
                actionRef={bannedActionRef}
                rowKey="id"
                columns={bannedColumns}
                request={(params) => fetchPlayers(params, true)}
                pagination={{ pageSize: 7 }}
              />
            ),
          },
        ]}
      />

      {/* Modal thông số */}
      <Modal
        title="Thông số người chơi"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
      >
        {detailData ? (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Chuỗi Thắng">{detailData.ChuoiThang ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Chuỗi Thắng Cao Nhất">{detailData.ChuoiThangCaoNhat ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Số Tiền Cao Nhất Đạt Được">{detailData.SoTienCaoNhatDatDuoc ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Số Xu Đã Kiếm">{detailData.SoTienDaKiem ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Số Xu Ingame Đã Nạp">{detailData.SoTienIngameDaNap ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Số Trận Thắng">{detailData.SoTranThang ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Số Tiền Đã Thua">{detailData.SoTienDaThua ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Tổng Thời Gian Chơi">
              {detailData.TongThoiGianChoi
                ? `${Math.floor(detailData.TongThoiGianChoi / 3600000)} giờ ${Math.floor((detailData.TongThoiGianChoi % 3600000) / 60000)} phút`
                : 'Không có'}
            </Descriptions.Item>
            <Descriptions.Item label="Xu hiện tại">{detailData.Tien?.toLocaleString() ?? 'Không có'}</Descriptions.Item>
            <Descriptions.Item label="Trạng Thái">{detailData.TrangThai ? 'Hoạt động' : 'Bị khóa'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <p>Không có dữ liệu thông số người chơi</p>
        )}
      </Modal>

      {/* Modal Lịch Sử Giao Dịch */}
      <Modal
        title="Lịch sử giao dịch"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={800}
      >
        {historyData.length ? (
          historyData.map((item, index) => (
            <div key={index} style={{ marginBottom: 24 }}>
              <Descriptions column={1} bordered title={`Giao dịch ${index + 1}`}>
                <Descriptions.Item label="Mã Giao Dịch ZaloPay">{item.MaGiaoDichZaloPay ?? 'Không có'}</Descriptions.Item>
                <Descriptions.Item label="Phương Thức">{item.PhuongThuc ?? 'Không có'}</Descriptions.Item>
                <Descriptions.Item label="Số Tiền">{item.SoTien?.toLocaleString() ?? 'Không có'}</Descriptions.Item>
                <Descriptions.Item label="Thời Gian Hoàn Thành">
                  {item.ThoiGianHoanThanh
                    ? new Date(item.ThoiGianHoanThanh).toLocaleString()
                    : 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Thời Gian Tạo">
                  {item.ThoiGianTao
                    ? new Date(item.ThoiGianTao).toLocaleString()
                    : 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng Thái">{item.TrangThai ?? 'Không có'}</Descriptions.Item>
                <Descriptions.Item label="UserID">{item.UserID ?? 'Không có'}</Descriptions.Item>
              </Descriptions>

              {index < historyData.length - 1 && <Divider />}
            </div>
          ))
        ) : (
          <p>Không có dữ liệu lịch sử giao dịch</p>
        )}
      </Modal>

      <UpdatePlayerModal
        visible={modalVisible}
        playerData={editingPlayer}
        onClose={() => setModalVisible(false)}
        onUpdate={() => {
          setEditingPlayer(undefined);
          actionRef.current?.reload();
          bannedActionRef.current?.reload();
        }}
      />
    </ConfigProvider>
  );
};

export default PlayerPage;