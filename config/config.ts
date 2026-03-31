// https://umijs.org/config/

import { join } from 'node:path';
import { defineConfig } from '@umijs/max';
import defaultSettings from './defaultSettings';
import proxy from './proxy';

import routes from './routes';

const { UMI_ENV = 'dev' } = process.env;

/**
 * @name Sử dụng đường dẫn công khai
 * @description Đường dẫn khi triển khai, nếu triển khai ở thư mục không phải gốc, cần cấu hình biến này
 * @doc https://umijs.org/docs/api/config#publicpath
 */
const PUBLIC_PATH: string = '/';

export default defineConfig({
  /**
   * @name Bật chế độ hash
   * @description Làm cho sản phẩm sau build chứa hậu tố hash. Thường dùng cho phát hành tăng dần và tránh cache trình duyệt.
   * @doc https://umijs.org/docs/api/config#hash
   */
  hash: true,

  publicPath: PUBLIC_PATH,

  /**
   * @name Cài đặt tương thích
   * @description Cài đặt ie11 không nhất thiết tương thích hoàn hảo, cần kiểm tra tất cả các phụ thuộc được sử dụng
   * @doc https://umijs.org/docs/api/config#targets
   */
  // targets: {
  //   ie: 11,
  // },
  /**
   * @name Cấu hình tuyến đường, các tệp không được đưa vào tuyến đường sẽ không được biên dịch
   * @description Chỉ hỗ trợ cấu hình path, component, routes, redirect, wrappers, name
   * @doc https://umijs.org/docs/guides/routes
   */
  // umi routes: https://umijs.org/docs/routing
  routes,
  /**
   * @name Cấu hình chủ đề
   * @description Mặc dù gọi là chủ đề, nhưng thực tế chỉ là cài đặt biến less
   * @doc Cài đặt chủ đề antd https://ant.design/docs/react/customize-theme-cn
   * @doc Cấu hình theme umi https://umijs.org/docs/api/config#theme
   */
  // theme: { '@primary-color': '#1DA57A' }
  /**
   * @name Cấu hình quốc tế hóa moment
   * @description Nếu không yêu cầu quốc tế hóa, mở lên có thể giảm kích thước gói js
   * @doc https://umijs.org/docs/api/config#ignoremomentlocale
   */
  ignoreMomentLocale: true,
  /**
   * @name Cấu hình proxy
   * @description Có thể cho phép máy chủ cục bộ của bạn proxy đến máy chủ của bạn, để bạn có thể truy cập dữ liệu máy chủ
   * @see Lưu ý rằng proxy chỉ có thể sử dụng trong phát triển cục bộ, không thể sử dụng sau build.
   * @doc Giới thiệu proxy https://umijs.org/docs/guides/proxy
   * @doc Cấu hình proxy https://umijs.org/docs/api/config#proxy
   */
  proxy: proxy[UMI_ENV as keyof typeof proxy],
  /**
   * @name Cấu hình hot update nhanh
   * @description Một thành phần hot update tốt, có thể giữ state khi cập nhật
   */
  fastRefresh: true,
  //============== Các cấu hình plugin max sau đây ===============
  /**
   * @name Plugin dữ liệu
   * @@doc https://umijs.org/docs/max/data-flow
   */
  model: {},
  /**
   * Một dòng dữ liệu ban đầu toàn cục, có thể dùng để chia sẻ dữ liệu giữa các plugin
   * @description Có thể dùng để lưu trữ một số dữ liệu toàn cục, như thông tin người dùng, hoặc một số trạng thái toàn cục, trạng thái ban đầu toàn cục được tạo ở đầu dự án Umi.
   * @doc https://umijs.org/docs/max/data-flow#%E5%85%A8%E5%B1%80%E5%88%9D%E5%A7%8B%E7%8A%B6%E6%80%81
   */
  initialState: {},
  /**
   * @name Plugin layout
   * @doc https://umijs.org/docs/max/layout-menu
   */
  title: 'Tập Thể Dục Tại Nhà',
  layout: {
    locale: true,
    ...defaultSettings,
  },
  /**
   * @name Plugin moment2dayjs
   * @description Thay thế moment trong dự án bằng dayjs
   * @doc https://umijs.org/docs/max/moment2dayjs
   */
  moment2dayjs: {
    preset: 'antd',
    plugins: ['duration'],
  },
  /**
   * @name Plugin quốc tế hóa
   * @doc https://umijs.org/docs/max/i18n
   */
  locale: {
    default: 'vi-VN', // Đặt ngôn ngữ mặc định là tiếng Việt
    antd: true, // Sử dụng i18n của Ant Design
    baseNavigator: true, // Sử dụng navigator.language
  },
  // Đảm bảo thư mục locales được cấu hình

  /**
   * @name Plugin antd
   * @description Đã tích hợp plugin babel import
   * @doc https://umijs.org/docs/max/antd#antd
   */
  antd: {
    appConfig: {},
    configProvider: {
      theme: {
        cssVar: true,
        token: {
          fontFamily: 'AlibabaSans, sans-serif',
        },
      },
    },
  },
  /**
   * @name Cấu hình yêu cầu mạng
   * @description Nó dựa trên axios và useRequest của ahooks cung cấp một bộ giải pháp yêu cầu mạng và xử lý lỗi thống nhất.
   * @doc https://umijs.org/docs/max/request
   */
  request: {},
  /**
   * @name Plugin quyền
   * @description Plugin quyền dựa trên initialState, phải bật initialState trước
   * @doc https://umijs.org/docs/max/access
   */
  access: {},
  /**
   * @name Các script bổ sung trong <head>
   * @description Cấu hình các script bổ sung trong <head>
   */
  headScripts: [
    // Giải quyết vấn đề màn hình trắng khi tải lần đầu
    { src: join(PUBLIC_PATH, 'scripts/loading.js'), async: true },
  ],
  //================ Cấu hình plugin pro =================
  presets: ['umi-presets-pro'],
  /**
   * @name Cấu hình plugin openAPI
   * @description Tạo serve và mock dựa trên quy định openapi, có thể giảm nhiều mã mẫu
   * @doc https://pro.ant.design/zh-cn/docs/openapi/
   */
  openAPI: [
    {
      requestLibPath: "import { request } from '@umijs/max'",
      // Hoặc sử dụng phiên bản trực tuyến
      // schemaPath: "https://gw.alipayobjects.com/os/antfincdn/M%24jrzTTYJN/oneapi.json"
      schemaPath: join(__dirname, 'oneapi.json'),
      mock: false,
    },
    {
      requestLibPath: "import { request } from '@umijs/max'",
      schemaPath:
        'https://gw.alipayobjects.com/os/antfincdn/CA1dOm%2631B/openapi.json',
      projectName: 'swagger',
    },
  ],
  mock: {
    include: ['mock/**/*', 'src/pages/**/_mock.ts'],
  },
  /**
   * @name Có bật mako không
   * @description Sử dụng mako cho phát triển nhanh
   * @doc https://umijs.org/docs/api/config#mako
   */
  mako: {},
  esbuildMinifyIIFE: true,
  requestRecord: {},
  exportStatic: {},
  define: {
    'process.env.CI': process.env.CI,
  },
});
