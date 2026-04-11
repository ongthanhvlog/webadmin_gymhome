import React, { useRef, useState, useEffect } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { ConfigProvider, Modal, Form, Input, message, Card, Typography, Divider, Row, Col } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';

const { Text } = Typography;

interface NguoiDung {
  UserId: string;
  Email: string;
  SoLuongBaiHocDaDangKy: number;
  ThongTinNguoiDung: {
    CanNang: number;
    ChieuCao: number;
    GioiTinh: string;
    SoBaiTapHoanThanh: number;
    ThoiGianTapLuyen: number;
    TongCalo: number;
    Tuoi: number;
  };
}

const UserPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<NguoiDung | undefined>();
  const [form] = Form.useForm();

  const fetchUsers = async (params: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'NguoiDung'));

      const dataPromises = snapshot.docs.map(async (docSnap) => {
        const d = docSnap.data() as any;
        const userId = docSnap.id;

        // Đếm số lượng bài tập lớn đã đăng ký của người dùng
        const subCollectionRef = collection(db, 'NguoiDung', userId, 'DanhSachBaiTapLonDaDangKy');
        const subSnapshot = await getDocs(subCollectionRef);
        const soLuongBaiTap = subSnapshot.size;

        const thongTin = d.ThongTinNguoiDung || {};

        return {
          UserId: userId,
          Email: d.Email || '',
          SoLuongBaiHocDaDangKy: soLuongBaiTap,
          ThongTinNguoiDung: {
            CanNang: Number(thongTin.CanNang || 0),
            ChieuCao: Number(thongTin.ChieuCao || 0),
            GioiTinh: thongTin.GioiTinh || '',
            SoBaiTapHoanThanh: Number(thongTin.SoBaiTapHoanThanh || 0),
            ThoiGianTapLuyen: Number(thongTin.ThoiGianTapLuyen || 0),
            TongCalo: Number(thongTin.TongCalo || 0),
            Tuoi: Number(thongTin.Tuoi || 0),
          },
        };
      });

      let data: NguoiDung[] = await Promise.all(dataPromises);

      // Tìm kiếm 
      if (params?.SoLuongBaiHocDaDangKy !== undefined && params.SoLuongBaiHocDaDangKy !== '') {
        data = data.filter((item) => item.SoLuongBaiHocDaDangKy === Number(params.SoLuongBaiHocDaDangKy));
      }
      if (params?.Email) {
        data = data.filter((item) => item.Email.toLowerCase().includes(params.Email.toLowerCase()));
      }
      if (params?.UserId) {
        data = data.filter((item) => item.UserId.toLowerCase().includes(params.UserId.toLowerCase()));
      }
      return { data, success: true, total: data.length };
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải dữ liệu người dùng');
      return { data: [], success: false };
    }
  };

  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue(editingUser);
    }
  }, [editingUser, form]);

  const columns: ProColumns<NguoiDung>[] = [
    { title: 'ID Người dùng', dataIndex: 'UserId', copyable: true},
    { title: 'Email', dataIndex: 'Email' },
    { title: 'Số lượng bài tập đã đăng ký', dataIndex: 'SoLuongBaiHocDaDangKy', valueType: 'digit', sorter: (a, b) => a.SoLuongBaiHocDaDangKy - b.SoLuongBaiHocDaDangKy },
    { title: 'Thông số người dùng', valueType: 'option', search: false,
      render: (_, record) => [
        <a key="view" onClick={() => { setEditingUser(record); setModalVisible(true);}} >Xem chi tiết</a>,
      ],
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <Card title={<Text strong style={{ fontSize: '18px' }}>QUẢN LÝ NGƯỜI DÙNG HỆ THỐNG</Text>}>
        <div className="gymhome-table-container">
          <div style={{ padding: '16px 24px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px 8px 0 0', borderBottom: 'none' }}>
            <Text strong style={{ fontSize: '16px' }}>TÌM KIẾM NGƯỜI DÙNG</Text>
            <Divider style={{ margin: '12px 0 0' }} />
          </div>

          <ProTable<NguoiDung>
            actionRef={actionRef}
            headerTitle="DANH SÁCH NGƯỜI DÙNG"
            columns={columns}
            request={fetchUsers}
            rowKey="UserId"
            pagination={{ pageSize: 10 }}
            search={{ layout: 'vertical', defaultCollapsed: false, searchText: 'Tìm kiếm', resetText: 'Đặt lại', labelWidth: 'auto',span: 6 }}
            form={{
              style: { background: '#ffffff', padding: '0 24px 24px', borderRadius: '0 0 8px 8px', border: '1px solid #f0f0f0', borderTop: 'none', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'},
            }}
          />
        </div>
      </Card>

      <Modal
        title="Thông tin chi tiết người dùng"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700} 
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={[16, 0]}> 
            
            <Col span={12}>
              <Form.Item label="Cân nặng (kg)" name={['ThongTinNguoiDung', 'CanNang']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Chiều cao (cm)" name={['ThongTinNguoiDung', 'ChieuCao']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Giới tính" name={['ThongTinNguoiDung', 'GioiTinh']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Tuổi" name={['ThongTinNguoiDung', 'Tuoi']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Số bài tập hoàn thành" name={['ThongTinNguoiDung', 'SoBaiTapHoanThanh']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Tổng calo" name={['ThongTinNguoiDung', 'TongCalo']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Thời gian tập luyện (phút)" name={['ThongTinNguoiDung', 'ThoiGianTapLuyen']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default UserPage;