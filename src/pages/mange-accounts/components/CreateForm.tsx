import { ModalForm, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { Button, message } from 'antd';
import { FormattedMessage, terminal } from '@umijs/max';
import type { FC } from 'react';
import { setDoc, doc, getDocs, query, where, collection } from 'firebase/firestore';
import { auth, db } from '../../../../config/firebaseConfig';

interface CreateFormProps {
  reload?: () => void;
}

const CreateForm: FC<CreateFormProps> = ({ reload }) => {
  const [messageApi, contextHolder] = message.useMessage();

  // Kiểm tra TenDangNhap đã tồn tại trong Firestore chưa
  const checkUsernameExists = async (username: string) => {
    try {
      const q = query(collection(db, 'TaiKhoanQuanTri'), where('TenDangNhap', '==', username));
      const snapshot = await getDocs(q);
      const exists = !snapshot.empty;
      terminal.log('[CreateForm] Kiểm tra TenDangNhap tồn tại:', username, '→', exists);
      return exists;
    } catch (error) {
      terminal.error('[CreateForm] Lỗi khi kiểm tra TenDangNhap:', error);
      throw error;
    }
  };

  // Gọi API tạo tài khoản Firebase Authentication
  const createAccount = async (email: string, password: string) => {
    const apiUrl = 'https://asia-southeast1-tienlenmiennam-d2c29.cloudfunctions.net/api/TaoTaiKhoan';
    terminal.log('[CreateForm] Gọi API với:', { Email: email, MatKhau: password });

    try {
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ Email: email, MatKhau: password }),
      });

      const text = await response.text();
      terminal.log('[CreateForm] HTTP Status:', response.status, '| Raw Response:', text);

      if (!response.ok) {
        const lower = text.toLowerCase();
        if (
          response.status === 400 ||
          response.status === 409 ||
          lower.includes('already') ||
          lower.includes('exist')
        ) {
          throw new Error('Email này đã được đăng ký trong hệ thống.');
        }
        throw new Error(`API Error: ${response.statusText} (${response.status})`);
      }

      const result = JSON.parse(text);
      terminal.log('[CreateForm] Dữ liệu trả về:', result);
      return result;
    } catch (error) {
      terminal.error('[CreateForm] Lỗi gọi API:', error);
      throw error;
    }
  };

  // Xử lý khi submit form
  const handleSubmit = async (value: any) => {
    try {
      terminal.log('[CreateForm] Form value:', value);
      const { confirmPassword, ...payload } = value;
      const { name, password, hoTen, role } = payload;

      // --- Kiểm tra tên đăng nhập ---
      const usernameRegex = /^[a-zA-Z0-9]{4,}$/;
      if (!usernameRegex.test(name)) {
        messageApi.error('Tên đăng nhập phải có ít nhất 4 ký tự và không chứa ký tự đặc biệt!');
        return false;
      }

      // --- Kiểm tra họ và tên ---
      const fullNameRegex = /^[A-Za-zÀ-ỹ\s]+$/; // chỉ chữ cái + dấu tiếng Việt + khoảng trắng
      const nameParts = hoTen.trim().split(/\s+/);
      if (!fullNameRegex.test(hoTen) || nameParts.length < 2) {
        messageApi.error('Họ và tên phải có ít nhất 2 từ và chỉ chứa ký tự chữ cái!');
        return false;
      }

      // --- Kiểm tra độ dài mật khẩu ---
      if (!password || password.length < 6) {
        messageApi.error('Mật khẩu phải có ít nhất 6 ký tự!');
        return false;
      }

      const email = name.includes('@') ? name : `${name}@gmail.com`;

      const exists = await checkUsernameExists(name);
      if (exists) {
        messageApi.warning('Tên đăng nhập này đã tồn tại trong hệ thống!');
        return false;
      }

      const result = await createAccount(email, password);
      const userId = result.UserId || result.userId;
      if (!userId) throw new Error('API không trả về UserId');

      let vaiTro = 'User';
      let trangThai = true;
      if (role === 1) vaiTro = 'Admin';
      else if (role === 2) vaiTro = 'User';
      else if (role === 0) trangThai = false;

      await setDoc(doc(db, 'TaiKhoanQuanTri', userId), {
        TenDangNhap: name,
        HoTen: hoTen.trim(),
        VaiTro: vaiTro,
        TrangThai: trangThai,
        NgayTao: new Date(),
      });

      terminal.log('[CreateForm] Ghi Firestore thành công với ID:', userId);
      messageApi.success('Tạo tài khoản thành công');
      reload?.();
      return true;
    } catch (error: any) {
      terminal.error('[CreateForm] Lỗi khi thêm tài khoản:', error);
      messageApi.error(error?.message || 'Không thể tạo tài khoản!');
      return false;
    }
  };

  return (
    <>
      {contextHolder}
      <ModalForm
        title="Tạo tài khoản mới"
        trigger={
          <Button type="primary">
            <FormattedMessage id="pages.manageAccounts.new" defaultMessage="Thêm mới" />
          </Button>
        }
        width="400px"
        modalProps={{
          okText: 'Lưu',
          cancelText: 'Hủy',
          destroyOnClose: true,
        }}
        onFinish={handleSubmit}
      >
        <ProFormText
          name="name"
          label="Tên đăng nhập"
          rules={[
            { required: true, message: 'Vui lòng nhập tên đăng nhập!' },
            {
              pattern: /^[a-zA-Z0-9]{4,}$/,
              message: 'Tên đăng nhập phải có ít nhất 4 ký tự và không chứa ký tự đặc biệt!',
            },
          ]}
        />
        <ProFormText
          name="hoTen"
          label="Họ và tên"
          rules={[
            { required: true, message: 'Vui lòng nhập họ và tên!' },
            {
              pattern: /^[A-Za-zÀ-ỹ\s]+$/,
              message: 'Họ và tên chỉ được chứa ký tự chữ cái!',
            },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const nameParts = value.trim().split(/\s+/);
                if (nameParts.length < 2) {
                  return Promise.reject(new Error('Họ và tên phải có ít nhất 2 từ!'));
                }
                if (value.length > 30) {
                  return Promise.reject(new Error('Họ và tên chỉ được tối đa 30 ký tự!'));
                }
                return Promise.resolve();
              },
            },
          ]}
        />
        <ProFormSelect
          name="role"
          label="Vai trò"
          options={[
            { label: 'Tắt', value: 0 },
            { label: 'Admin', value: 1 },
            { label: 'Nhân viên', value: 2 },
          ]}
          rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
        />
        <ProFormText.Password
          name="password"
          label="Mật khẩu"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu!' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
          ]}
        />
        <ProFormText.Password
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        />
      </ModalForm>
    </>
  );
};

export default CreateForm;
