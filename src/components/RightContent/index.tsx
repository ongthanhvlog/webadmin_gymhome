import { QuestionCircleOutlined } from '@ant-design/icons';
import { SelectLang as UmiSelectLang } from '@umijs/max';

/**
 * Kiểu chủ đề cho thanh bên
 */
export type SiderTheme = 'light' | 'dark';

/**
 * Thành phần chọn ngôn ngữ
 */
export const SelectLang: React.FC = () => {
  return (
    <UmiSelectLang
      style={{
        padding: 4,
      }}
    />
  );
};

/**
 * Thành phần hiển thị biểu tượng câu hỏi (trợ giúp)
 */
export const Question: React.FC = () => {
  return (
    <a
      href="https://pro.ant.design/docs/getting-started"
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        padding: '4px',
        fontSize: '18px',
        color: 'inherit',
      }}
    >
      <QuestionCircleOutlined />
    </a>
  );
};
