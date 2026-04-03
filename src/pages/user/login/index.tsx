import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import {
  Helmet, SelectLang, useIntl, useModel, history, terminal} from '@umijs/max';
import { Alert, App, Tabs, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../../../config/firebaseConfig';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => ({
  lang: {
    width: 42,
    height: 42,
    lineHeight: '42px',
    position: 'fixed',
    right: 16,
    borderRadius: token.borderRadius,
    ':hover': { backgroundColor: token.colorBgTextHover },
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'auto',
    backgroundImage:
      "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
    backgroundSize: '100% 100%',
  },
}));

const Lang = () => {
  const { styles } = useStyles();
  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert style={{ marginBottom: 24 }} message={content} type="error" showIcon />
);

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<{ status?: string; type?: string; message?: string }>({});
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();
  const firestore = getFirestore();

  // Hàm kiểm tra thông tin admin trong collection TaiKhoanQuanTri
  const fetchAdminData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(firestore, 'TaiKhoanQuanTri', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Kiểm tra đúng field VaiTro là "Admin"
        if (data.VaiTro === 'Admin') {
          return data;
        }
      }
    } catch (error) {
      console.error("Firestore Error:", error);
    }
    return null;
  };

  const handleRoleRedirect = async (user: any) => {
    try {
      const adminData = await fetchAdminData(user.uid);

      if (adminData) {
        // Nếu là Admin hợp lệ, cập nhật trạng thái hệ thống và vào trang chủ
        flushSync(() => {
          setInitialState((s) => ({
            ...s,
            currentUser: {
              access: adminData.VaiTro,
              name: adminData.TenDangNhap || adminData.TaiKhoan || 'Admin',
              avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
              userid: user.uid,
              currentAuthority: adminData.VaiTro.toLowerCase(),
            },
          }));
        });
        history.push('/welcome');
      } else {
        // Nếu không có quyền, ép đăng xuất và báo lỗi
        await signOut(auth);
        const errorMsg = 'Tài khoản không có quyền truy cập trang quản trị!';
        setUserLoginState({ status: 'error', type: 'account', message: errorMsg });
        message.error(errorMsg);
      }
    } catch (error) {
      terminal.error('Error checking admin role:', error);
      history.push('/error');
    }
  };

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      // Đăng nhập Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email.includes('@') ? values.email : values.email + '@gmail.com',
        values.password
      );

      if (userCredential.user) {
        await handleRoleRedirect(userCredential.user);
      }
    } catch (error: any) {
      let errorMessage = 'Đăng nhập thất bại, vui lòng thử lại！';
      if (error.code === 'auth/wrong-password') errorMessage = 'Sai mật khẩu';
      if (error.code === 'auth/user-not-found') errorMessage = 'Tài khoản không tồn tại';
      
      setUserLoginState({ status: 'error', type: 'account', message: errorMessage });
      message.error(errorMessage);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await handleRoleRedirect(user);
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (checkingAuth) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Đang kiểm tra quyền truy cập..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({ id: 'menu.login', defaultMessage: 'Đăng nhập Quản trị' })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div style={{ flex: '1', padding: '32px 0' }}>
        <LoginForm
          contentStyle={{ minWidth: 280, maxWidth: '75vw' }}
          logo={<img alt="logo" src="/image.svg" />}
          title="GYM HOME ADMIN"
          subTitle="Hệ thống quản lý nội bộ dành cho Admin"
          onFinish={async (values) => await handleSubmit(values as { email: string; password: string })}
          submitter={{ searchConfig: { submitText: 'Đăng nhập' } }}
        >
          <Tabs centered items={[{ key: 'account', label: 'Tài khoản Quản trị viên' }]} />
          
          {userLoginState.status === 'error' && (
            <LoginMessage content={userLoginState.message || 'Lỗi hệ thống'} />
          )}

          <ProFormText
            name="email"
            fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
            placeholder="Nhập tài khoản quản trị"
            rules={[{ required: true, message: 'Vui lòng điền thông tin!' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
            placeholder="Nhập mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          />
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;