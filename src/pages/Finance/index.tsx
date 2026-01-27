import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { ConfigProvider, message, Tag } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, getDocs } from 'firebase/firestore';
import React, { useRef } from 'react';
import { db } from '../../../config/firebaseConfig';
import { MobileOutlined } from '@ant-design/icons';

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  status: string;
  method: string;
  createdAt: Date;
  completedAt?: Date | null;
  maGiaoDich: string;
}

const Finance: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  // Lấy dữ liệu từ Firebase
  const fetchTransactions = async (params?: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'LichSuGiaoDich'));
      let data: Transaction[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          userId: d['UserId'] || '',
          amount: d['SoTien'] || 0,
          status: d['TrangThai'] || '',
          method: d['PhuongThuc'] || '',
          createdAt: d.ThoiGianTao ? new Date(d.ThoiGianTao) : new Date(),
          completedAt: d.ThoiGianHoanThanh ? new Date(d.ThoiGianHoanThanh) : null,
          maGiaoDich: d['MaGiaoDichZaloPay'] || '',
        };
      });

      // Tìm kiếm theo mã giao dịch
      if (params?.maGiaoDich) {
        data = data.filter((item) =>
          String(item.maGiaoDich).toLowerCase().includes(params.maGiaoDich.toLowerCase()),
        );
      }

      // Tìm kiếm theo ID người dùng
      if (params?.userId) {
        data = data.filter((item) =>
          item.userId.toLowerCase().includes(params.userId.toLowerCase()),
        );
      }

      // Tìm kiếm theo số tiền
      if (params?.amount) {
        data = data.filter((item) => item.amount === Number(params.amount));
      }

      // Tìm kiếm theo trạng thái
      if (params?.status) {
        data = data.filter((item) => item.status === params.status);
      }

      // Lọc theo thời gian tạo
      const createdAt = params?.createdAt ? new Date(params.createdAt) : null;
      if (createdAt) {
        data = data.filter(
          (item) => item.createdAt.toDateString() === createdAt.toDateString(),
        );
      }

      // Lọc theo thời gian hoàn thành
      const completedAt = params?.completedAt ? new Date(params.completedAt) : null;
      if (completedAt) {
        data = data.filter(
          (item) =>
            item.completedAt &&
            item.completedAt.toDateString() === completedAt.toDateString(),
        );
      }

      console.log('Dữ liệu giao dịch:', data);
      return { data, success: true, total: data.length };
    } catch (error) {
      console.error('Error in fetchTransactions:', error); // Log chi tiết lỗi
      message.error('Lấy dữ liệu giao dịch thất bại!');
      return { data: [], success: false };
    }
  };

  // Định nghĩa các cột cho bảng
  const columns: ProColumns<Transaction>[] = [
    {
      title: 'Mã GD ZaloPay',
      dataIndex: 'maGiaoDich',
      fieldProps: { placeholder: 'Tìm mã giao dịch' },
      width: 180,
    },
    {
      title: 'ID Người dùng',
      dataIndex: 'userId',
      fieldProps: { placeholder: 'Tìm ID người dùng' },
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      fieldProps: { placeholder: 'Tìm số tiền' },
      width: 150,
      render: (_, record) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          +{new Intl.NumberFormat('vi-VN').format(record.amount)} VNĐ
        </span>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'method',
      width: 120,
      search: false,
      render: (_, record) => (
        <Tag color="orange" icon={<MobileOutlined />}>
          {record.method}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      valueEnum: {
        'Hoàn thành': { text: 'Hoàn thành', status: 'Success' },
        'Chưa hoàn thành': { text: 'Chưa hoàn thành', status: 'Processing' },
        'Đang xử lý': { text: 'Đang xử lý', status: 'Processing' },
        'Thất bại': { text: 'Thất bại', status: 'Error' },
      },
      render: (_, record) => {
        let color = 'processing';
        if (record.status === 'Hoàn thành') color = 'success';
        else if (record.status === 'Thất bại') color = 'error';
        
        return <Tag color={color}>{record.status}</Tag>;
      },
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      fieldProps: { placeholder: 'Chọn thời gian tạo' },
      sorter: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      width: 180,
      render: (_, record) => {
        const date = record.createdAt;
        return (
          <div>
            <div>{date.toLocaleDateString('vi-VN')}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {date.toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Thời gian hoàn thành',
      dataIndex: 'completedAt',
      valueType: 'dateTime',
      fieldProps: { placeholder: 'Chọn thời gian hoàn thành' },
      sorter: (a, b) =>
        (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0),
      width: 180,
      render: (_, record) => {
        if (!record.completedAt) return '-';
        const date = record.completedAt;
        return (
          <div>
            <div>{date.toLocaleDateString('vi-VN')}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {date.toLocaleTimeString('vi-VN')}
            </div>
          </div>
        );
      },
    },
  ];

  // Giao diện chính của trang
  return (
    <ConfigProvider locale={viVN}>
      <ProTable<Transaction>
        headerTitle="Quản lý Giao dịch"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{
          labelWidth: 'auto',
          resetText: 'Đặt lại',
          searchText: 'Tìm kiếm',
        }}
        request={fetchTransactions}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} giao dịch`,
        }}
        scroll={{ x: 1200 }}
      />
    </ConfigProvider>
  );
};

export default Finance;