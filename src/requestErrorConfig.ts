import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { message, notification } from 'antd';

// Các loại xử lý lỗi: Loại lỗi
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}
// Định dạng dữ liệu phản hồi thỏa thuận với backend
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

/**
 * @name Xử lý lỗi
 * Xử lý lỗi tự động của pro, bạn có thể thực hiện thay đổi của riêng mình ở đây
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // Xử lý lỗi: Giải pháp xử lý lỗi của umi@3.
  errorConfig: {
    // Ném lỗi
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // Ném lỗi tự tạo
      }
    },
    // Nhận và xử lý lỗi
    errorHandler: (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      // Lỗi được ném bởi errorThrower của chúng tôi.
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // Không làm gì
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              // TODO: Chuyển hướng
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        // Lỗi Axios
        // Yêu cầu được gửi thành công và máy chủ đã phản hồi mã trạng thái, nhưng mã trạng thái vượt quá phạm vi 2xx
        message.error(`Trạng thái phản hồi:${error.response.status}`);
      } else if (error.request) {
        // Yêu cầu đã được gửi thành công, nhưng không nhận được phản hồi
        // `error.request` là instance của XMLHttpRequest trong trình duyệt,
        // và trong node.js là instance của http.ClientRequest
        message.error('Không có phản hồi! Vui lòng thử lại.');
      } else {
        // Có vấn đề gì đó khi gửi yêu cầu
        message.error('Lỗi yêu cầu, vui lòng thử lại.');
      }
    },
  },

  // Bộ chặn yêu cầu
  requestInterceptors: [
    (config: RequestOptions) => {
      // Chặn cấu hình yêu cầu, xử lý cá nhân hóa.
      const url = config?.url?.concat('?token=123');
      return { ...config, url };
    },
  ],

  // Bộ chặn phản hồi
  responseInterceptors: [
    (response) => {
      // Chặn dữ liệu phản hồi, xử lý cá nhân hóa
      const { data } = response as unknown as ResponseStructure;

      if (data?.success === false) {
        message.error('Yêu cầu thất bại!');
      }
      return response;
    },
  ],
};
