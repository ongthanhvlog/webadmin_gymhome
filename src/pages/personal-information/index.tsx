import React, { useEffect, useState } from 'react';
import { Tabs, Form, Input, Button, Row, Col, message } from 'antd';
import type { TabsProps } from 'antd';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const db = getFirestore();

const SettingsPage = () => {
  const [personalForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(true);

  /**
   * Load thông tin người dùng từ Firestore
   */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          message.error('Chưa đăng nhập!');
          return;
        }

        const docRef = doc(db, 'TaiKhoanQuanTri', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          personalForm.setFieldsValue({
            lastName: data.HoTen?.split(' ').slice(0, -1).join(' '),
            firstName: data.HoTen?.split(' ').slice(-1).join(' '),
            phoneNumber: data.SoDT,
            email: data.Email,
          });
        }
      } catch (error) {
        console.error('Error loading user info:', error);
        message.error('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [personalForm]);

  /**
   * Cập nhật thông tin cá nhân
   */
  const onPersonalFinish = async (values: any) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        message.error('Chưa đăng nhập!');
        return;
      }

      const docRef = doc(db, 'TaiKhoanQuanTri', user.uid);

      await updateDoc(docRef, {
        HoTen: values.lastName + ' ' + values.firstName,
        SoDT: values.phoneNumber,
        Email: values.email,
        NgayCapNhat: new Date(),
      });

      message.success('Cập nhật thông tin thành công!');
    } catch (error) {
      console.error('Update failed:', error);
      message.error('Cập nhật thất bại!');
    }
  };

  /**
   * Cập nhật mật khẩu bằng Firebase Auth
   */
  const onPasswordFinish = async (values: any) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !user.email) {
      message.error('Chưa đăng nhập!');
      return;
    }

    try {
      // Re-authenticate user trước khi đổi mật khẩu
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Đổi mật khẩu mới
      await updatePassword(user, values.newPassword);
      message.success('Cập nhật mật khẩu thành công!');
      passwordForm.resetFields();
    } catch (error: any) {
      console.error('Update password error:', error);
      if (error.code === 'auth/wrong-password') {
        message.error('Mật khẩu hiện tại không đúng!');
      } else {
        message.error('Cập nhật mật khẩu thất bại!');
      }
    }
  };

  const items: TabsProps['items'] = [
    {
      key: 'personal',
      label: 'Cá Nhân',
      children: (
        <Form
          form={personalForm}
          layout="vertical"
          onFinish={onPersonalFinish}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Họ"
                name="lastName"
                rules={[{ required: true, message: 'Vui lòng nhập họ!' }]}
              >
                <Input style={{ height: '40px', width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Tên"
                name="firstName"
                rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
              >
                <Input style={{ height: '40px', width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Số Điện Thoại"
            name="phoneNumber"
            rules={[
              {
                pattern: /^[0-9]{9,11}$/,
                message: 'Số điện thoại không hợp lệ!',
              },
            ]}
          >
            <Input
              style={{ height: '40px', width: '100%' }}
              maxLength={11}
              placeholder="Nhập số điện thoại"
            />
          </Form.Item>

          <Form.Item
            label="Địa Chỉ Email"
            name="email"
            rules={[
              { type: 'email', message: 'Vui lòng nhập email hợp lệ!' },
            ]}
          >
            <Input style={{ height: '40px', width: '100%' }} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            style={{
              borderRadius: '20px',
              backgroundColor: '#6f42c1',
              marginTop: '16px',
              width: '200px',
              height: '36px',
              fontSize: '14px',
            }}
            loading={loading}
          >
            Cập Nhật Thông Tin
          </Button>
        </Form>
      ),
    },
    {
      key: 'password',
      label: 'Mật Khẩu',
      children: (
        <Form form={passwordForm} layout="vertical" onFinish={onPasswordFinish}>
          <Form.Item
            label="Mật Khẩu Hiện Tại"
            name="currentPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
          >
            <Input.Password style={{ height: '40px', width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Mật Khẩu Mới"
            name="newPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới!' }]}
          >
            <Input.Password style={{ height: '40px', width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Nhập Lại Mật Khẩu"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng nhập lại mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password style={{ height: '40px', width: '100%' }} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            style={{
              borderRadius: '20px',
              backgroundColor: '#6f42c1',
              marginTop: '16px',
              width: '200px',
              height: '36px',
              fontSize: '14px',
            }}
          >
            Cập Nhật Mật Khẩu
          </Button>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ width: '100%', padding: '24px' }}>
      <h2>Cài đặt</h2>
      <Tabs defaultActiveKey="personal" items={items} />
    </div>
  );
};

export default SettingsPage;
