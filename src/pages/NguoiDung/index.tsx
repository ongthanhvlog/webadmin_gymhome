// import React, { useRef, useState, useEffect } from 'react';
// import {ProTable, type ActionType, type ProColumns} from '@ant-design/pro-components';
// import {ConfigProvider, Modal, Space, Form, Input, message } from 'antd';
// import viVN from 'antd/es/locale/vi_VN';
// import { collection, getDocs } from 'firebase/firestore';
// import { db } from '../../../config/firebaseConfig';

// interface User {
//   id: string;
//   UserId: string;
//   Email: string;
//   SoLuongBaiHocDaDangKy: number;
// }

// const UserPage: React.FC = () => {
//   const actionRef = useRef<ActionType>(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [editingUser, setEditingUser] = useState<User | undefined>();
//   const [form] = Form.useForm();

//   const fetchUsers = async (params: any) => {
//     const snapshot = await getDocs(collection(db, 'NguoiDung'));

//     let data: User[] = snapshot.docs.map((docSnap) => {
//       const d = docSnap.data() as any;
//       return {
//         id: docSnap.id,
//         UserId: d.UserId || docSnap.id,
//         Email: d.Email || '',
//         SoLuongBaiHocDaDangKy: Number(d.SoLuongBaiHocDaDangKy || 0),
//       };
//     });

//     if (params?.SoLuongBaiHocDaDangKy !== undefined && params.SoLuongBaiHocDaDangKy !== '') {
//       data = data.filter(
//         (item) =>
//           item.SoLuongBaiHocDaDangKy ===
//           Number(params.SoLuongBaiHocDaDangKy),
//       );
//     }

//     if (params?.Email) {
//       data = data.filter((item) =>
//         item.Email.toLowerCase().includes(params.Email.toLowerCase()),
//       );
//     }
//     return { data, success: true, total: data.length};
//   };

//   useEffect(() => {
//     if (editingUser) {
//       form.setFieldsValue({
//         UserId: editingUser.UserId,
//         Email: editingUser.Email,
//         SoLuongBaiHocDaDangKy: editingUser.SoLuongBaiHocDaDangKy,
//       });
//     }
//   }, [editingUser]);

//   const handleSave = async () => {
//     message.success('Lưu dữ liệu thành công');
//     setModalVisible(false);
//   };

//   const columns: ProColumns<User>[] = [
//     {title: 'UserId', dataIndex: 'UserId'},
//     {title: 'Email', dataIndex: 'Email'},
//     {title: 'Số lượng bài học đã đăng ký',dataIndex: 'SoLuongBaiHocDaDangKy',valueType: 'text',
//       sorter: (a, b) =>
//         a.SoLuongBaiHocDaDangKy - b.SoLuongBaiHocDaDangKy,
//       render: (_, record) => record.SoLuongBaiHocDaDangKy,
//     },
//     { title: 'Tùy chỉnh', search: false,
//       render: (_, record) => (
//         <Space>
//           <a
//             onClick={() => {
//               setEditingUser(record);
//               setModalVisible(true);
//             }}
//           >
//             Xem chi tiết
//           </a>
//         </Space>
//       ),
//     },
//   ];

//   return (
//     <ConfigProvider locale={viVN}>
//       <ProTable<User>
//         headerTitle="DANH SÁCH NGƯỜI DÙNG"
//         actionRef={actionRef}
//         rowKey="id"
//         search={{ labelWidth: 'auto', resetText: 'Đặt lại', searchText: 'Tìm kiếm' }}
//         columns={columns}
//         request={fetchUsers}
//         pagination={{ pageSize: 10 }}
//       />

//       <Modal
//         title="Chi tiết người dùng"
//         open={modalVisible}
//         onCancel={() => setModalVisible(false)}
//         onOk={handleSave}
//         okText="Lưu"
//         cancelText="Hủy"
//       >
//         <Form form={form} layout="vertical">
//           <Form.Item label="UserId" name="UserId">
//             <Input disabled />
//           </Form.Item>

//           <Form.Item label="Email" name="Email">
//             <Input disabled />
//           </Form.Item>

//           <Form.Item
//             label="Số lượng bài học đã đăng ký"
//             name="SoLuongBaiHocDaDangKy"
//           >
//             <Input disabled />
//           </Form.Item>
//         </Form>
//       </Modal>
//     </ConfigProvider>
//   );
// };

// export default UserPage;
import React, { useRef, useState, useEffect } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { ConfigProvider, Modal, Space, Form, Input, message, Card, Typography, Divider } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';

const { Text } = Typography;

interface User {
  id: string;
  UserId: string;
  Email: string;
  SoLuongBaiHocDaDangKy: number;
}

const UserPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [form] = Form.useForm();

  const fetchUsers = async (params: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'NguoiDung'));
      let data: User[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          UserId: d.UserId || docSnap.id,
          Email: d.Email || '',
          SoLuongBaiHocDaDangKy: Number(d.SoLuongBaiHocDaDangKy || 0),
        };
      });

      // Filter Logic
      if (params?.SoLuongBaiHocDaDangKy !== undefined && params.SoLuongBaiHocDaDangKy !== '') {
        data = data.filter(item => item.SoLuongBaiHocDaDangKy === Number(params.SoLuongBaiHocDaDangKy));
      }
      if (params?.Email) {
        data = data.filter(item => item.Email.toLowerCase().includes(params.Email.toLowerCase()));
      }
      if (params?.UserId) {
        data = data.filter(item => item.UserId.toLowerCase().includes(params.UserId.toLowerCase()));
      }

      return { data, success: true, total: data.length };
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu người dùng');
      return { data: [], success: false };
    }
  };

  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue(editingUser);
    }
  }, [editingUser, form]);

  const columns: ProColumns<User>[] = [
    { title: 'ID Người dùng', dataIndex: 'UserId', copyable: true },
    { title: 'Email', dataIndex: 'Email' },
    { 
      title: 'Số lượng bài tập đã đăng ký', 
      dataIndex: 'SoLuongBaiHocDaDangKy', 
      valueType: 'digit',
      sorter: (a, b) => a.SoLuongBaiHocDaDangKy - b.SoLuongBaiHocDaDangKy,
    },
    { 
      title: 'Tùy chỉnh', 
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <a
          key="view"
          onClick={() => {
            setEditingUser(record);
            setModalVisible(true);
          }}
        >
          Xem chi tiết
        </a>,
      ],
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <Card title={<Text strong style={{ fontSize: '18px' }}>QUẢN LÝ NGƯỜI DÙNG HỆ THỐNG</Text>}>
        
        {/* Phần Header Tìm kiếm đồng bộ với KeHoachPage */}
        <div className="gymhome-table-container">
          <div style={{ padding: '16px 24px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px 8px 0 0', borderBottom: 'none' }}>
            <Text strong style={{ fontSize: '16px' }}>TÌM KIẾM NGƯỜI DÙNG</Text>
            <Divider style={{ margin: '12px 0 0' }} />
          </div>

          <ProTable<User>
            actionRef={actionRef}
            headerTitle="DANH SÁCH NGƯỜI DÙNG"
            columns={columns}
            request={fetchUsers}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            search={{
              layout: 'vertical',
              defaultCollapsed: false,
              searchText: 'Tìm kiếm',
              resetText: 'Đặt lại',
              labelWidth: 'auto',
              span: 6,
            }}
            form={{
              style: {
                background: '#ffffff',
                padding: '0 24px 24px',
                borderRadius: '0 0 8px 8px',
                border: '1px solid #f0f0f0',
                borderTop: 'none',
                marginBottom: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }
            }}
          />
        </div>
      </Card>

      {/* Modal Chi tiết người dùng */}
      <Modal
        title="Thông tin chi tiết người dùng"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null} // Thường xem chi tiết người dùng admin chỉ xem, không sửa trực tiếp ở đây
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item label="Mã định danh (UserId)" name="UserId">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Địa chỉ Email" name="Email">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Số lượng bài tập đã đăng ký" name="SoLuongBaiHocDaDangKy">
            <Input disabled />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default UserPage;