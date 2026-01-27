/**
 * @name Cấu hình tuyến đường umi
 * @description Chỉ hỗ trợ cấu hình path, component, routes, redirect, wrappers, name, icon
 * @param path  path chỉ hỗ trợ hai loại placeholder, loại đầu là tham số động :id, loại thứ hai là * wildcard, wildcard chỉ có thể xuất hiện ở cuối chuỗi tuyến đường.
 * @param component Cấu hình đường dẫn thành phần React được render khi location và path khớp. Có thể là đường dẫn tuyệt đối hoặc tương đối, nếu tương đối, sẽ tìm từ src/pages.
 * @param routes Cấu hình tuyến đường con, thường dùng khi cần thêm thành phần layout cho nhiều đường dẫn.
 * @param redirect Cấu hình chuyển hướng tuyến đường
 * @param wrappers Cấu hình thành phần bao bọc thành phần tuyến đường, qua thành phần bao bọc có thể kết hợp thêm chức năng cho thành phần tuyến đường hiện tại. Ví dụ, có thể dùng cho kiểm tra quyền tuyến đường
 * @param name Cấu hình tiêu đề tuyến đường, mặc định đọc giá trị menu.xxxx trong tệp quốc tế hóa menu.ts, nếu cấu hình name là login, thì đọc giá trị menu.login trong menu.ts làm tiêu đề
 * @param icon Cấu hình biểu tượng tuyến đường, giá trị tham khảo https://ant.design/components/icon-cn, chú ý loại bỏ hậu tố phong cách và chữ hoa/thường, nếu muốn cấu hình biểu tượng là <StepBackwardOutlined /> thì giá trị nên là stepBackward hoặc StepBackward, nếu muốn cấu hình biểu tượng là <UserOutlined /> thì giá trị nên là user hoặc User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'smile',
    access: 'canUser',
    component: './Welcome',
  },
  //Tong quan bao cao
  {
    path: '/reports',
    name: 'Tổng quan',
    icon: 'BarChartOutlined',
    //component: './Reports',
    routes: [
      {
        path: '/reports',
        name: 'Báo cáo chung',
        icon: 'DashboardOutlined',
        access: 'canUser',
        component: './Reports',
      },
      {
        path: '/reports/player',
        name: 'Báo cáo người dùng',
        icon: 'UserOutlined',
        access: 'canUser',
        component: './Reports/PlayerReport',
      },
      {
        path: '/reports/revenue',
        name: 'Doanh thu hàng tháng',
        icon: 'FundOutlined',
        access: 'canUser',
        component: './Reports/MonthlyRevenue',
      },

      // {
      //   path: '/reports/transactions',
      //   name: 'Số giao dịch trong ngày',F
      //   icon: 'LineChartOutlined',
      //   component: './Reports/DailyActiveUsers',
      // },
    ],
  },

  {
    path: '/',
    redirect: '/welcome',
  },
  {
    component: '404',
    layout: false,
    path: './*',
  },
  // Mạnh: cấu hình route trang player
  {
    name: 'Quản lý người chơi',
    icon: 'TeamOutlined',
    path: '/Player',
    access: 'canUser',
    component: './Player/index',
  },
  // Thành: cấu hình route trang content
  {
    path: '/Content',
    name: 'Quản lý nội dung',
    icon: 'AppstoreOutlined',
    routes: [
      {
        path: '/Content/Event',
        name: 'Event Sự kiện',
        access: 'canUser',
        component: './Content/Event/index',
      },
      {
        path: '/Content/Giftcode',
        name: 'Mã quà tặng Giftcode',
        access: 'canUser',
        component: './Content/Giftcode/index',
      },
    ],
  },
  // Thành: cấu hình route trang support
  {
    name: 'Chăm sóc khách hàng',
    icon: 'CustomerServiceOutlined',
    path: '/Support',
    access: 'canUser',
    component: './Support/index',
  },

  // Thanh: cấu hình route trang mange-accounts
  {
    name: 'Quản lý tài khoản',
    icon: 'crown',
    path: '/mange-accounts',
    access: 'canAdmin',
    component: './mange-accounts/index',
  },
  // quan li tai chinh
  {
    path: '/finance',
    name: 'Giao dịch',
    icon: 'DollarOutlined',
    access: 'canUser',
    component: './Finance',
  },

  {
    name: 'Thông tin cá nhân',
    icon: 'user',
    access: 'canUser',
    path: '/personal-information',
    component: './personal-information/index',
  },
];
