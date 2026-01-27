/**
 * @name Cấu hình proxy
 * @see Trong môi trường sản xuất, proxy không thể hiệu quả, vì vậy ở đây không có cấu hình môi trường sản xuất
 * -------------------------------
 * Proxy không thể hiệu quả trong môi trường sản xuất
 * vì vậy không có cấu hình môi trường sản xuất
 * Để biết chi tiết, vui lòng xem
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */
export default {
  // Nếu cần tùy chỉnh máy chủ phát triển cục bộ, vui lòng bỏ comment và điều chỉnh theo nhu cầu
  // dev: {
  //   // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
  //   '/api/': {
  //     // Địa chỉ cần proxy
  //     target: 'https://preview.pro.ant.design',
  //     // Cấu hình này có thể proxy từ http đến https
  //     // Chức năng phụ thuộc origin có thể cần cái này, như cookie
  //     changeOrigin: true,
  //   },
  // },
  /**
   * @name Cấu hình proxy chi tiết
   * @doc https://github.com/chimurai/http-proxy-middleware
   */
  test: {
    // localhost:8000/api/** -> https://preview.pro.ant.design/api/**
    '/api/': {
      target: 'https://proapi.azurewebsites.net',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    },
  },
};
