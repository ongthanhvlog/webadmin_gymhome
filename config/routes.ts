import component from "@/locales/vn-VN/component";
import path from "path";

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
    component: './Welcome',
  },
  //Tong quan bao cao
  {
    path: '/TongQuan',
    name: 'Tổng quan',
    icon: 'BarChartOutlined',
    component: './TongQuan/index',
  },
  //cấu hình route trang người dùng
  {
    path: '/NguoiDung',
    name: 'Quản lý người dùng',
    icon: 'TeamOutlined',
    component: './NguoiDung/index',
  },
  // cấu hình route trang vùng tập trung
  {
    path: '/VungTapTrung',
    name: 'Quản lý vùng tập trung',
    icon: 'AppstoreOutlined',
    component: './VungTapTrung/index',
  },
  // // cấu hình route trang quản lý kế hoạch
 
  {
    path: '/KeHoach',
    name: 'Quản lý kế hoạch',
    icon: 'ScheduleOutlined',
    routes: [
      {
        path: '/KeHoach/NguoiMoiBatDau',
        name: 'Người mới bắt đầu',
        component: './KeHoach/index',
      },
      {
        path: '/KeHoach/NangCao',
        name: 'Nâng cao',
        component: './KeHoach/index',
      },
    ],
  },
  //cấu hình route trang support
  {
    name: 'Chăm sóc khách hàng',
    icon: 'CustomerServiceOutlined',
    path: '/ChamSocKhachHang',
    component: './ChamSocKhachHang/index',
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
];
