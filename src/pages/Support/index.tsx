import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Button,
  ConfigProvider,
  Modal,
  message,
  Space,
  Form,
  Input,
} from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, doc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import React, { useRef, useState, useEffect } from 'react';
import { db } from '../../../config/firebaseConfig';

// Kiểu dữ liệu
export type SupportItem = {
  id: string;
  tenDangNhap: string;
  tieuDe: string;
  noiDung: string;
  thoiGianTao: Date;
  phanHoi: string;
  thoiGianPhanHoi?: Date | null;
  trangThai: number;
};

const SupportPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupport, setEditingSupport] = useState<SupportItem | undefined>(undefined);
  const [form] = Form.useForm();

  // Lấy dữ liệu từ Firebase
  const fetchSupports = async (params?: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'ChamSocKhachHang'));
      let data: SupportItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          tenDangNhap: d.TenDangNhap || '',
          tieuDe: d.TieuDe || (d.NoiDung ? d.NoiDung.split(' ').slice(0, 3).join(' ') + '...' : ''),
          noiDung: d.NoiDung || '',
          thoiGianTao: d.ThoiGianTao?.toDate ? d.ThoiGianTao.toDate() : new Date(d.ThoiGianTao),
          phanHoi: d.PhanHoi || '',
          thoiGianPhanHoi: d.ThoiGianPhanHoi?.toDate ? d.ThoiGianPhanHoi.toDate() : d.ThoiGianPhanHoi ? new Date(d.ThoiGianPhanHoi) : null,
          trangThai: d.TrangThai ?? (d.PhanHoi && d.PhanHoi.trim() !== '' ? 2 : 1), //
        };
      });

      // --- Bộ lọc tìm kiếm ---
      if (params?.tenDangNhap) {
        data = data.filter((item) => item.tenDangNhap.toLowerCase().includes(params.tenDangNhap.toLowerCase()));
      }

      if (params?.tieuDe) {
        data = data.filter((item) => item.tieuDe.toLowerCase().includes(params.tieuDe.toLowerCase()));
      }

      if (params?.trangThai !== undefined && params.trangThai !== '') {
        data = data.filter((item) => item.trangThai === Number(params.trangThai));
      }

      // Lọc theo thời gian tạo
      const createdAt: Date | undefined = params?.thoiGianTao;
      if (createdAt) {
        data = data.filter(
          (item) => item.thoiGianTao.toDateString() === new Date(createdAt).toDateString(),
        );
      }

      // Lọc theo thời gian phản hồi
      const repliedAt: Date | undefined = params?.thoiGianPhanHoi;
      if (repliedAt) {
        data = data.filter(
          (item) => item.thoiGianPhanHoi && item.thoiGianPhanHoi.toDateString() === new Date(repliedAt).toDateString(),
        );
      }

      return { data, success: true, total: data.length };
    } catch (error) {
      console.error(error);
      message.error('Lấy dữ liệu thất bại!');
      return { data: [], success: false };
    }
  };

  // Khi mở modal xử lý
  useEffect(() => {
    if (editingSupport) {
      form.setFieldsValue({ phanHoi: editingSupport.phanHoi || '' });
    } else {
      form.resetFields();
    }
  }, [editingSupport, form]);

  // Gửi phản hồi
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!editingSupport) return;

      const phanHoi = values.phanHoi?.trim() || '';
      let newTrangThai = editingSupport.trangThai; // giữ nguyên trạng thái mặc định

      // Nếu có phản hồi và chưa xử lý xong => chuyển sang đã xử lý
      if (phanHoi !== '' && editingSupport.trangThai !== 2) {
        newTrangThai = 2;
      }

      await updateDoc(doc(db, 'ChamSocKhachHang', editingSupport.id), {
        PhanHoi: phanHoi,
        ThoiGianPhanHoi: phanHoi !== '' ? serverTimestamp() : null,
        TrangThai: newTrangThai,
      });

      if (phanHoi !== '' && newTrangThai === 2) message.success('Đã gửi phản hồi đến người chơi!');
      else message.info('Phản hồi trống — yêu cầu vẫn đang chờ xử lý.');

      setModalVisible(false);
      setEditingSupport(undefined);
      actionRef.current?.reload();
    } catch (error) {
      console.error(error);
      message.error('Thao tác thất bại!');
    }
  };

  // --- Cấu hình cột ProTable ---
  const columns: ProColumns<SupportItem>[] = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'tenDangNhap',
      valueType: 'text',
      fieldProps: { placeholder: 'Tìm tên đăng nhập' },
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'tieuDe',
      valueType: 'text',
      fieldProps: { placeholder: 'Tìm tiêu đề' },
    },
    {
      title: 'Nội dung',
      dataIndex: 'noiDung',
      render: (_, record) => (
        <a
          onClick={() =>
            Modal.info({
              title: 'Chi tiết nội dung',
              width: 600,
              style: { top: 100 },
              content: (
                <div
                  style={{
                    whiteSpace: 'pre-line',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '12px 16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    fontSize: '14px',
                    lineHeight: '1.6',
                  }}
                >
                  {record.noiDung}
                </div>
              ),
              okText: 'Đóng',
            })
          }
        >
          Xem chi tiết
        </a>
      ),
      search: false,
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'thoiGianTao',
      valueType: 'date',
      sorter: (a, b) => a.thoiGianTao.getTime() - b.thoiGianTao.getTime(),
      render: (_, r) => r.thoiGianTao?.toLocaleString?.() || '',
    },
    {
      title: 'Phản hồi',
      dataIndex: 'phanHoi',
      render: (_, record) => (
        <a
          onClick={() => {
            setEditingSupport(record);
            setModalVisible(true);
          }}
        >
          Xử lý yêu cầu
        </a>
      ),
      search: false,
    },
    {
      title: 'Thời gian phản hồi',
      dataIndex: 'thoiGianPhanHoi',
      valueType: 'date',
      sorter: (a, b) => {
        const ta = a.thoiGianPhanHoi ? a.thoiGianPhanHoi.getTime() : 0;
        const tb = b.thoiGianPhanHoi ? b.thoiGianPhanHoi.getTime() : 0;
        return ta - tb;
      },
      render: (_, r) => (r.thoiGianPhanHoi ? r.thoiGianPhanHoi.toLocaleString() : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      valueType: 'select',
      valueEnum: {
        1: { text: 'Đang chờ xử lý', status: 'Default' },
        2: { text: 'Đã xử lý xong', status: 'Success' },
        0: { text: 'Đã hủy', status: 'Error' },
      },
      render: (_, record) => {
    let color = '';
    let bgColor = '';

    switch (record.trangThai) {
      case 1:
        color = '#ad6800';     
        bgColor = '#fffbe6';   
        break;
      case 2:
        color = '#237804';     
        bgColor = '#f6ffed';   
        break;
      case 0:
        color = '#cf1322';   
        bgColor = '#fff1f0';   
        break;
      default:
        color = '#595959';
        bgColor = '#fafafa';
    }

    const text =
      record.trangThai === 1
        ? 'Đang chờ xử lý'
        : record.trangThai === 2
        ? 'Đã xử lý xong'
        : 'Đã hủy';

    return (
      <span
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontWeight: 500,
          backgroundColor: bgColor,
          color,
        }}
      >
        {text}
      </span>
    );
  },
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <ProTable<SupportItem>
        headerTitle="Chăm Sóc Khách Hàng"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto', resetText: 'Đặt lại', searchText: 'Tìm kiếm' }}
        request={fetchSupports}
        pagination={{ pageSize: 5 }}
        toolBarRender={() => [
          <Button key="reload" type="primary" onClick={() => actionRef.current?.reload()}>
            Làm mới
          </Button>,
        ]}
      />

      {/* Modal xử lý yêu cầu khách hàng */}
      <Modal
        title="Xử lý yêu cầu khách hàng"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Nội dung phản hồi" name="phanHoi">
            <Input.TextArea
              rows={4}
              placeholder="Nhập phản hồi gửi đến người chơi..."
              readOnly={editingSupport?.trangThai === 2} // chỉ đọc khi đã xử lý
              style={{
                color: '#000',
                backgroundColor: editingSupport?.trangThai === 2 ? '#f5f5f5' : undefined,
              }}
            />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalVisible(false)}>Thoát</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={editingSupport?.trangThai === 2} // vô hiệu hóa nút gửi
            >
              Gửi phản hồi
            </Button>
          </Space>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default SupportPage;
