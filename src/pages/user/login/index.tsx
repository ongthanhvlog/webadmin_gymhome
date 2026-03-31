import {
  GoogleOutlined,
  FacebookOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  useModel,
  history,
  terminal,
} from '@umijs/max';
import { Alert, App, Tabs, Spin } from 'antd';
import { createStyles } from 'antd-style';
import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Footer } from '@/components';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../../config/firebaseConfig';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(({ token }) => ({
  action: {
    marginLeft: '8px',
    color: 'rgba(0, 0, 0, 0.2)',
    fontSize: '24px',
    verticalAlign: 'middle',
    cursor: 'pointer',
    transition: 'color 0.3s',
    '&:hover': { color: token.colorPrimaryActive },
  },
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

const ActionIcons = () => {
  const { styles } = useStyles();
  return (
    <>
      <GoogleOutlined key="GoogleOutlined" className={styles.action} />
      <FacebookOutlined key="FacebookOutlined" className={styles.action} />
    </>
  );
};

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
  const [type, setType] = useState<string>('account');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();
  const firestore = getFirestore();

  const fetchUserInfo = async (uid: string) => {
    const userDoc = await getDoc(doc(firestore, 'TaiKhoanQuanTri', uid));
    if (userDoc.exists()) return userDoc.data()?.VaiTro || 'User';
    return 'User';
  };
  const fetchTenTaiKhoan = async (uid: string) => {
    const userDoc = await getDoc(doc(firestore, 'TaiKhoanQuanTri', uid));
    if (userDoc.exists()) return userDoc.data()?.TenDangNhap || 'Unknown';
    return 'Admin';
  };

  const handleRoleRedirect = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const role = await fetchUserInfo(user.uid);
        const tenTK = await fetchTenTaiKhoan(user.uid);
        flushSync(() => {
          setInitialState((s) => ({
            ...s,
            currentUser: { 
              access: role,
              name: tenTK,
              avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
              userid: user.uid,
              currentAuthority: role.toLowerCase(),
            },
          }));
        });

        if (role === 'Admin') history.push('/welcome');
        else if (role === 'User') history.push('/welcome');
        else history.push('/unauthorized');
      } catch (error) {
        terminal.error('Error fetching user role:', error);
        history.push('/error');
      }
    }
  };

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email + '@gmail.com', values.password);
      if (userCredential.user) {
        message.success(intl.formatMessage({ id: 'pages.login.success', defaultMessage: 'Đăng nhập thành công！' }));
        await handleRoleRedirect();
      }
    } catch (error: any) {
      const errorMessage =
        error.code === 'auth/wrong-password'
          ? 'Sai mật khẩu'
          : error.code === 'auth/user-not-found'
          ? 'Tài khoản không tồn tại'
          : 'Đăng nhập thất bại, vui lòng thử lại！';
      setUserLoginState({ status: 'error', type: 'account', message: errorMessage });
      message.error(errorMessage);
    }
  };

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      await handleRoleRedirect(); // chỉ redirect khi user tồn tại
    }
    setCheckingAuth(false);
  });
  return () => unsubscribe();
}, []);


  const { status, type: loginType, message: errorMessage } = userLoginState;

  if (checkingAuth) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Đang kiểm tra đăng nhập..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({ id: 'menu.login', defaultMessage: 'Trang đăng nhập' })}
          {Settings.title && ` - ${Settings.title}`}
        </title>
      </Helmet>
      <Lang />
      <div style={{ flex: '1', padding: '32px 0' }}>
        <LoginForm
          contentStyle={{ minWidth: 280, maxWidth: '75vw' }}
          logo={<img alt="logo" src="/image.svg" />}
          title="GYM HOME"
          subTitle={<FormattedMessage id="pages.layouts.userLayout.title" defaultMessage="Quản lý và điều hành hệ thống tiến lên miền Nam" />}
          initialValues={{ autoLogin: true }}
          actions={[
            <FormattedMessage key="loginWith" id="pages.login.loginWith" defaultMessage="Các phương thức đăng nhập khác" />,
            <ActionIcons key="icons" />,
          ]}
          onFinish={async (values) => await handleSubmit(values as { email: string; password: string })}
          submitter={{ searchConfig: { submitText: 'Đăng nhập' } }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              { key: 'account', label: intl.formatMessage({ id: 'pages.login.accountLogin.tab', defaultMessage: 'Đăng nhập bằng tài khoản và mật khẩu' }) },
              // { key: 'mobile', label: intl.formatMessage({ id: 'pages.login.phoneLogin.tab', defaultMessage: 'Đăng nhập bằng số điện thoại' }) },
            ]}
          />
          {status === 'error' && loginType === 'account' && <LoginMessage content={errorMessage || 'Tài khoản hoặc mật khẩu sai'} />}
          {type === 'account' && (
            <>
              <ProFormText
                name="email"
                fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
                placeholder="Enter your account"
                rules={[
                  { required: true, message: <FormattedMessage id="pages.login.username.required" defaultMessage="Vui lòng nhập email!" /> },
                  // { type: 'email', message: <FormattedMessage id="pages.login.email.invalid" defaultMessage="Định dạng email không hợp lệ!" /> },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
                placeholder="Enter your password"
                rules={[{ required: true, message: <FormattedMessage id="pages.login.password.required" defaultMessage="Vui lòng nhập mật khẩu!" /> }]}
              />
            </>
          )}
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
