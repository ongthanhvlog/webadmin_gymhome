import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  AvatarDropdown,
  AvatarName,
  Footer,
  Question,
  SelectLang,
} from '@/components';
import { currentUser as queryCurrentUser } from '@/services/ant-design-pro/api';
import defaultSettings from '../config/defaultSettings';
import { auth, db } from '../config/firebaseConfig';
import { errorConfig } from './requestErrorConfig';
import '@ant-design/v5-patch-for-react-19';

/**
 * Xác định môi trường phát triển
 */
const isDev = process.env.NODE_ENV === 'development';
const isDevOrTest = isDev || process.env.CI;
const loginPath = '/user/login';
const whiteList = [loginPath, '/user/register', '/user/register-result'];

/**
 * @see https://umijs.org/docs/api/runtime-config#getinitialstate
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      const msg = await queryCurrentUser({
        skipErrorHandler: true,
      });
      return msg.data;
    } catch (_error) {
      return undefined;
    }
  };
  // Nếu không phải trang đăng nhập, thực hiện
  const { location } = history;
  if (!whiteList.includes(location.pathname)) {
    // Kiểm tra Firebase auth trước (dùng khi deploy chỉ dùng Firebase authentication)
    const firebaseUser = await new Promise<any>((resolve) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (u) => {
          unsubscribe();
          resolve(u);
        },
        () => {
          unsubscribe();
          resolve(null);
        },
      );
    });

    if (firebaseUser) {
      // Nếu đã có user từ Firebase thì cố gắng lấy vai trò (access) từ Firestore
      try {
        const userDoc = await getDoc(
          doc(db, 'TaiKhoanQuanTri', firebaseUser.uid),
        );
        const role = userDoc.exists()
          ? userDoc.data()?.VaiTro || 'User'
          : 'User';
        const tenTK = userDoc.exists()
          ? userDoc.data()?.TenDangNhap || firebaseUser.email || 'Người dùng'
          : firebaseUser.email || 'Người dùng';
        return {
          fetchUserInfo,
          currentUser: {
            name: tenTK,
            userid: firebaseUser.uid,
            avatar:
              firebaseUser.photoURL ||
              'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
            access: role,
            currentAuthority: (role || '').toLowerCase(),
          } as API.CurrentUser,
          settings: defaultSettings as Partial<LayoutSettings>,
        };
      } catch (e) {
        // Nếu không lấy được role, fallback về user mặc định
        return {
          fetchUserInfo,
          currentUser: {
            name:
              firebaseUser.email || firebaseUser.displayName || 'Người dùng',
            userid: firebaseUser.uid,
            avatar: firebaseUser.photoURL || '',
          } as API.CurrentUser,
          settings: defaultSettings as Partial<LayoutSettings>,
        };
      }
    }

    const currentUser = await fetchUserInfo();
    // Nếu chưa đăng nhập, redirect đến login ngay lập tức
    if (!currentUser) {
      history.replace(loginPath);
    }
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// ProLayout hỗ trợ các api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    actionsRender: () => [
      <Question key="doc" />,
      <SelectLang key="SelectLang" />,
    ],
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: <AvatarName />,
      render: (_, avatarChildren) => {
        return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
      },
    },
    waterMarkProps: {
      content: '',
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;
      // Nếu chưa đăng nhập, chuyển hướng đến login
      const fbUser = auth.currentUser;
      if (
        !initialState?.currentUser &&
        !whiteList.includes(location.pathname) &&
        !fbUser
      ) {
        history.replace(loginPath);
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDevOrTest
      ? [
          <Link key="openapi" to="/umi/plugin/openapi" target="_blank">
            <LinkOutlined />
            <span>Tài liệu OpenAPI</span>
          </Link>,
        ]
      : [],
    menuHeaderRender: undefined,
    // Tùy chỉnh trang 403
    // unAccessible: <div>unAccessible</div>,
    // Thêm trạng thái loading
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          {isDevOrTest && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name Cấu hình request, có thể cấu hình xử lý lỗi
 * Nó dựa trên axios và useRequest của ahooks cung cấp một bộ giải pháp yêu cầu mạng và xử lý lỗi thống nhất.
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  ...errorConfig,
};
