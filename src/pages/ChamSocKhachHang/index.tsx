import React, { useRef, useState, useEffect } from 'react';
import { type ActionType, type ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, ConfigProvider, Modal, message, Space, Form, Input, Card, Typography, Divider } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, doc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';

const { Text } = Typography;

interface ChamSocKhachHang {
  id: string;
  Email: string;
  tieuDe: string;
  noiDung: string;
  thoiGianTao: Date;
  phanHoi: string;
  thoiGianPhanHoi?: Date | null;
  trangThai: number;
}

const SupportPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupport, setEditingSupport] = useState<ChamSocKhachHang | undefined>(undefined);
  const [form] = Form.useForm();

  // Lấy dữ liệu từ Firebase (camelCase)
  const fetchSupports = async (params?: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'ChamSocKhachHang'));
      
      let data: ChamSocKhachHang[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          Email: d.Email || '',
          tieuDe: d.tieuDe || d.TieuDe || (d.noiDung ? d.noiDung.split(' ').slice(0, 3).join(' ') + '...' : ''),
          noiDung: d.noiDung || d.NoiDung || '',
          thoiGianTao: d.thoiGianTao?.toDate 
            ? d.thoiGianTao.toDate() 
            : new Date(d.thoiGianTao || Date.now()),
          phanHoi: d.phanHoi || d.PhanHoi || '',
          thoiGianPhanHoi: d.thoiGianPhanHoi?.toDate 
            ? d.thoiGianPhanHoi.toDate() 
            : d.thoiGianPhanHoi ? new Date(d.thoiGianPhanHoi) : null,
          trangThai: d.trangThai ?? (d.phanHoi && d.phanHoi.trim() !== '' ? 2 : 1),
        };
      });

      // Bộ lọc tìm kiếm
      if (params?.Email) {
        data = data.filter((item) =>
          item.Email.toLowerCase().includes(params.Email.toLowerCase())
        );
      }

      if (params?.tieuDe) {
        data = data.filter((item) =>
          item.tieuDe.toLowerCase().includes(params.tieuDe.toLowerCase())
        );
      }

      if (params?.trangThai !== undefined && params.trangThai !== '') {
        data = data.filter((item) => item.trangThai === Number(params.trangThai));
      }

      if (params?.thoiGianTao) {
        const filterDate = new Date(params.thoiGianTao).toDateString();
        data = data.filter((item) => item.thoiGianTao.toDateString() === filterDate);
      }

      if (params?.thoiGianPhanHoi) {
        const filterDate = new Date(params.thoiGianPhanHoi).toDateString();
        data = data.filter((item) =>
          item.thoiGianPhanHoi && item.thoiGianPhanHoi.toDateString() === filterDate
        );
      }

      return { data, success: true, total: data.length };
    } catch (error) {
      console.error(error);
      message.error('Lấy dữ liệu thất bại!');
      return { data: [], success: false };
    }
  };

  // Khi mở modal
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
      let newTrangThai = editingSupport.trangThai;

      if (phanHoi !== '' && editingSupport.trangThai !== 2) {
        newTrangThai = 2;
      }

      await updateDoc(doc(db, 'ChamSocKhachHang', editingSupport.id), {
        phanHoi: phanHoi,
        thoiGianPhanHoi: phanHoi !== '' ? serverTimestamp() : null,
        trangThai: newTrangThai,
      });

      if (phanHoi !== '' && newTrangThai === 2) {
        message.success('Đã gửi phản hồi đến người dùng!');
      } else {
        message.info('Phản hồi trống — yêu cầu vẫn đang chờ xử lý.');
      }

      setModalVisible(false);
      setEditingSupport(undefined);
      actionRef.current?.reload();
    } catch (error) {
      console.error(error);
      message.error('Thao tác thất bại!');
    }
  };

  const columns: ProColumns<ChamSocKhachHang>[] = [
    { 
      title: 'Email', 
      dataIndex: 'Email', 
      valueType: 'text', 
      fieldProps: { placeholder: 'Tìm theo Email' } 
    },
    { 
      title: 'Tiêu đề', 
      dataIndex: 'tieuDe', 
      valueType: 'text', 
      fieldProps: { placeholder: 'Tìm tiêu đề' } 
    },
    { 
      title: 'Nội dung', 
      dataIndex: 'noiDung', 
      search: false,
      render: (_, record) => (
        <a onClick={() =>
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
        > Xem chi tiết </a>
      ),
    },
    { 
      title: 'Thời gian tạo', 
      dataIndex: 'thoiGianTao', 
      valueType: 'date', 
      sorter: (a, b) => a.thoiGianTao.getTime() - b.thoiGianTao.getTime(),
      render: (_, record) => record.thoiGianTao?.toLocaleString?.() || '',
    },
    { 
      title: 'Phản hồi', 
      dataIndex: 'phanHoi', 
      search: false,
      render: (_, record) => (
        <a onClick={() => {
            setEditingSupport(record);
            setModalVisible(true);
          }}
        >Xử lý yêu cầu</a>
      ),
    },
    { 
      title: 'Thời gian phản hồi', 
      dataIndex: 'thoiGianPhanHoi', 
      valueType: 'date',
      sorter: (a, b) => {
        const ta = a.thoiGianPhanHoi?.getTime() || 0;
        const tb = b.thoiGianPhanHoi?.getTime() || 0;
        return ta - tb;
      },
      render: (_, record) => (record.thoiGianPhanHoi ? record.thoiGianPhanHoi.toLocaleString() : '—'),
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
        let color = '#595959';
        let bgColor = '#fafafa';

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
      <Card 
        title="QUẢN LÝ CHĂM SÓC KHÁCH HÀNG" 
        style={{ borderRadius: 12 }} 
        bodyStyle={{ padding: 0 }}
      >
        {/* Phần tiêu đề tìm kiếm */}
        <div style={{ padding: '24px 24px 0' }}>
          <div
            style={{
              padding: '16px 24px',
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: '8px 8px 0 0',
              borderBottom: 'none',
            }}
          >
            <Text strong style={{ fontSize: '16px' }}>
              TÌM KIẾM DỮ LIỆU
            </Text>
            <Divider style={{ margin: '12px 0 0' }} />
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div style={{ padding: '0 24px 24px' }}>
          <ProTable<ChamSocKhachHang>
            actionRef={actionRef}
            headerTitle="DANH SÁCH YÊU CẦU"
            columns={columns}
            request={fetchSupports}
            rowKey="id"
            search={{
              layout: 'vertical',
              defaultCollapsed: false,
              searchText: 'Tìm kiếm',
              resetText: 'Đặt lại',
              labelWidth: 'auto',
              span: 4,
            }}
            form={{
              style: {
                background: '#ffffff',
                padding: '0 24px 24px',
                borderRadius: '0 0 8px 8px',
                border: '1px solid #f0f0f0',
                borderTop: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              },
            }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            toolBarRender={() => [
              <Button 
                key="reload" 
                type="primary" 
                onClick={() => actionRef.current?.reload()}
              >
                Làm mới
              </Button>,
            ]}
          />
        </div>
      </Card>

      {/* Modal xử lý yêu cầu */}
      <Modal
        title="Xử lý yêu cầu khách hàng"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingSupport(undefined);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Nội dung phản hồi" name="phanHoi">
            <Input.TextArea
              rows={5}
              placeholder="Nhập phản hồi gửi đến người dùng..."
              readOnly={editingSupport?.trangThai === 2}
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
              disabled={editingSupport?.trangThai === 2 || editingSupport?.trangThai === 0}
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