/**
 * Thành phần HeaderDropdown
 * @description Thành phần này cung cấp một menu thả xuống tùy chỉnh cho tiêu đề, sử dụng Ant Design Dropdown với các kiểu tùy chỉnh.
 */
import { Dropdown } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import React from 'react';

/**
 * Định nghĩa kiểu cho các thuộc tính của HeaderDropdown
 */
const useStyles = createStyles(({ token }) => {
  return {
    dropdown: {
      [`@media screen and (max-width: ${token.screenXS}px)`]: {
        width: '100%',
      },
    },
  };
});

/**
 * Kiểu props cho HeaderDropdown
 */
export type HeaderDropdownProps = {
  overlayClassName?: string;
  placement?:
    | 'bottomLeft'
    | 'bottomRight'
    | 'topLeft'
    | 'topCenter'
    | 'topRight'
    | 'bottomCenter';
} & Omit<DropDownProps, 'overlay'>;

/**
 * Thành phần HeaderDropdown
 * @param overlayClassName Lớp CSS tùy chỉnh cho overlay
 * @param restProps Các thuộc tính còn lại của Ant Design Dropdown
 */
const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  overlayClassName: cls,
  ...restProps
}) => {
  const { styles } = useStyles();
  return (
    <Dropdown
      overlayClassName={classNames(styles.dropdown, cls)}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
