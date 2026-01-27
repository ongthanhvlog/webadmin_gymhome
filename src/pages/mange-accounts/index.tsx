import type { ActionType, ProColumns, ProDescriptionsItemProps } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProDescriptions,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Drawer, message } from 'antd';
import ConfigProvider from 'antd/es/config-provider'; 
import viVN from 'antd/es/locale/vi_VN';
import React, { useCallback, useRef, useState } from 'react';
import { db } from '../../../config/firebaseConfig'; // file cấu hình Firebase client
import { getDocs, collection, deleteDoc, doc } from "firebase/firestore";
import CreateForm from './components/CreateForm';
import UpdateForm from './components/UpdateForm';

interface AccountItem {
  key: string;
  name: string;
  phoneNumber: string;
  role: string;
  status: number; // 0: active, 1: inactive
}

/**
 * Gọi Firestore để lấy danh sách tài khoản + search
 */
async function rule(params: any) {
  try {
    const snapshot = await getDocs(collection(db, "TaiKhoanQuanTri"));
    let data: AccountItem[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        key: docSnap.id,
        name: d.TenDangNhap || "",
        phoneNumber: d.SoDT != null ? String(d.SoDT) : "", // Chuyển number sang string
        role: d.VaiTro || "",
        status: d.TrangThai ? 0 : 1,
      };
    });

    // Chuẩn hóa số điện thoại: loại bỏ khoảng trắng và đảm bảo là chuỗi
    const normalizePhoneNumber = (phone: string | number) => {
      if (!phone && phone !== 0) return "";
      return String(phone).replace(/\s/g, "");
    };

    // Debug params
    console.log("Search params:", params);

    // Lọc client-side
    if (params?.name) {
      data = data.filter((item) =>
        item.name?.toLowerCase().includes(params.name.toLowerCase())
      );
    }

    if (params?.phoneNumber) {
      const searchPhone = normalizePhoneNumber(params.phoneNumber);
      data = data.filter((item) => {
        const itemPhone = normalizePhoneNumber(item.phoneNumber);
        const match = itemPhone.includes(searchPhone);
        console.log(
          `Comparing: search=${searchPhone}, item=${itemPhone}, match=${match}`
        );
        return match;
      });
    }

    if (params?.role) {
      data = data.filter((item) => item.role === params.role);
    }

    if (params?.status !== undefined && params?.status !== "") {
      data = data.filter((item) => item.status === Number(params.status));
    }

    console.log("Filtered data:", data);

    return {
      data,
      success: true,
      total: data.length,
    };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return {
      data: [],
      success: false,
    };
  }
}

const TableList: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);

  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<AccountItem>();

  const [messageApi, contextHolder] = message.useMessage();

  const columns: ProColumns<AccountItem>[] = [
  {
    title: "Tên đăng nhập",
    dataIndex: "name",
    fieldProps: { placeholder: "Nhập tên đăng nhập" },
    sorter: (a, b) => a.name.localeCompare(b.name), // Sắp xếp chuỗi cho name
    render: (dom, entity) => (
      <a
        onClick={() => {
          setCurrentRow(entity);
          setShowDetail(true);
        }}
      >
        {dom}
      </a>
    ),
  },
  {
    title: "Số điện thoại",
    dataIndex: "phoneNumber",
    valueType: "text",
    fieldProps: {
      placeholder: "Nhập số điện thoại",
    },
    formItemProps: {
      normalize: (value) => {
        if (!value && value !== 0) return "";
        return String(value).replace(/\s/g, "");
      },
    },
    sorter: (a, b) => a.phoneNumber.localeCompare(b.phoneNumber), // Sắp xếp chuỗi cho phoneNumber
  },
  // Các cột khác giữ nguyên
  {
    title: "Vai trò",
    dataIndex: "role",
    valueType: "select",
    fieldProps: {
      placeholder: "Chọn vai trò",
      options: [
        { label: "Admin", value: "Admin" },
        { label: "Nhân viên", value: "User" },
      ],
    },
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    valueType: "select",
    fieldProps: {
      placeholder: "Chọn trạng thái",
      options: [
        { label: "Đang hoạt động", value: 0 },
        { label: "Tắt hoạt động", value: 1 },
      ],
    },
    valueEnum: {
      0: { text: "Đang hoạt động", status: "Processing" },
      1: { text: "Tắt hoạt động", status: "Error" },
    },
  },
  {
    title: "Thao tác",
    dataIndex: "option",
    valueType: "option",
    render: (_, record) => [
      <UpdateForm
        trigger={<a>Chỉnh sửa</a>}
        key="config"
        onOk={actionRef.current?.reload}
        values={record as unknown as Partial<API.RuleListItem>}
      />,
    ],
  },
];

  return (
    <ConfigProvider locale={viVN}>
      <PageContainer>
        {contextHolder}
        <ProTable<AccountItem>
          headerTitle="Danh sách tài khoản"
          actionRef={actionRef}
          rowKey="key"
          search={{
            labelWidth: 'auto',
            resetText: 'Đặt lại',
            searchText: 'Tìm kiếm',
          }}
          toolBarRender={() => [
  <CreateForm key="create" reload={() => actionRef.current?.reload?.()} />,
]}

          request={rule}
          columns={columns}
        />
        <Drawer
          width={600}
          open={showDetail}
          onClose={() => {
            setCurrentRow(undefined);
            setShowDetail(false);
          }}
          closable={false}
        >
          {currentRow?.name && (
            <ProDescriptions<AccountItem>
              column={2}
              title={currentRow?.name}
              request={async () => ({
                data: currentRow || {},
              })}
              params={{
                id: currentRow?.name,
              }}
              columns={columns as ProDescriptionsItemProps<AccountItem>[]}
            />
          )}
        </Drawer>
      </PageContainer>
    </ConfigProvider>
  );
};

export default TableList;