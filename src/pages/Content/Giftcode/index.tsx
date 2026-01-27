import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, ConfigProvider, DatePicker, message, Space } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useRef, useState, type Key } from 'react';
import { db } from '../../../../config/firebaseConfig';
import UpdateGiftcodeModal, {
  type Giftcode,
} from '../Edit/UpdateGiftcode_index';

const GiftcodePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGiftcode, setEditingGiftcode] = useState<Giftcode | undefined>(
    undefined,
  );
  const [selectedRows, setSelectedRows] = useState<Giftcode[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  // Lấy dữ liệu từ Firebase
  const fetchGiftcodes = async (params?: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'MaQuaTang'));
      const now = new Date();
      let data: Giftcode[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        const createdAt = d.ThoiGianTao?.toDate
          ? d.ThoiGianTao.toDate()
          : new Date(d.ThoiGianTao);
        const expiredAt = d.ThoiGianKetThuc?.toDate
          ? d.ThoiGianKetThuc.toDate()
          : new Date(d.ThoiGianKetThuc);
        const activatedAt = d.ThoiGianKichHoat?.toDate
          ? d.ThoiGianKichHoat.toDate()
          : d.ThoiGianKichHoat
            ? new Date(d.ThoiGianKichHoat)
            : null;
        let status: 'chưa kích hoạt' | 'đang kích hoạt' | 'đã kết thúc';
        if (activatedAt && now < activatedAt) {
          status = 'chưa kích hoạt';
        } else if (activatedAt && now >= activatedAt && now <= expiredAt) {
          status = 'đang kích hoạt';
        } else {
          status = 'đã kết thúc';
        }
        return {
          id: docSnap.id,
          code: docSnap.id,
          amount: d.Tien,
          quantity: d.SoLuongConLai,
          createdAt,
          expiredAt,
          activatedAt,
          status,
        };
      });

      // Tìm kiếm
      if (params?.code)
        data = data.filter((item) =>
          item.code.toLowerCase().includes(params.code.toLowerCase()),
        ); // Tìm theo mã giftcode
      if (params?.amount)
        data = data.filter((item) => item.amount === Number(params.amount)); // Tìm theo số tiền
      if (params?.quantity)
        data = data.filter((item) => item.quantity === Number(params.quantity)); // Tìm theo số lượng

      const createdAt = params?.createdAt ? new Date(params.createdAt) : null;
      const expiredAt = params?.expiredAt ? new Date(params.expiredAt) : null;
      const activatedAt = params?.activatedAt
        ? new Date(params.activatedAt)
        : null;

      if (createdAt && expiredAt) {
        //Nếu nhập cả 2 ngày tạo và ngày kết thúc -> lọc theo khoảng thời gian
        data = data.filter(
          (item) => item.createdAt >= createdAt && item.expiredAt <= expiredAt,
        );
      } else if (createdAt) {
        // Nếu chỉ nhập Thời gian tạo -> lọc chính xác ngày đó
        data = data.filter(
          (item) => item.createdAt.toDateString() === createdAt.toDateString(),
        );
      } else if (expiredAt) {
        // Nếu chỉ nhập Thời gian kết thúc -> lọc chính xác ngày đó
        data = data.filter(
          (item) => item.expiredAt.toDateString() === expiredAt.toDateString(),
        );
      }
      // Nếu nhập Thời gian kích hoạt -> lọc chính xác ngày đó
      if (activatedAt) {
        data = data.filter(
          (item) =>
            item.activatedAt &&
            item.activatedAt.toDateString() === activatedAt.toDateString(),
        );
      }

      if (params?.status) {
        data = data.filter((item) => item.status === params.status);
      }

      return { data, success: true, total: data.length };
    } catch (error) {
      console.error(error);
      message.error('Lấy Giftcode thất bại!');
      return { data: [], success: false };
    }
  };
  //Xóa nhiều giftcode
  const handleDelete = async () => {
    if (!selectedRows.length) return;
    try {
      await Promise.all(
        selectedRows.map((r) => deleteDoc(doc(db, 'MaQuaTang', r.code))),
      );
      message.success('Xóa thành công!');
      setSelectedRowKeys([]);
      setSelectedRows([]);
      actionRef.current?.reload();
    } catch (error) {
      message.error('Xóa thất bại!');
      console.error(error);
    }
  };
  // Định nghĩa các cột cho bảng
  const columns: ProColumns<Giftcode>[] = [
    {
      title: 'Mã Giftcode',
      dataIndex: 'code',
      fieldProps: { placeholder: 'Tìm mã' },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      sorter: (a, b) => a.amount - b.amount,
      fieldProps: { placeholder: 'Tìm số tiền' },
      render: (_, r) => r.amount.toLocaleString(),
    },
    {
      title: 'Số lượng còn lại',
      dataIndex: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      fieldProps: { placeholder: 'Tìm số lượng' },
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      fieldProps: { placeholder: 'Chọn thời gian tạo' },
      sorter: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      render: (_, r) => r.createdAt.toLocaleString(),
    },
    {
      title: 'Thời gian kết thúc',
      dataIndex: 'expiredAt',
      valueType: 'dateTime',
      fieldProps: { placeholder: 'Chọn thời gian kết thúc' },
      sorter: (a, b) => a.expiredAt.getTime() - b.expiredAt.getTime(),
      render: (_, r) => r.expiredAt.toLocaleString(),
    },
    {
      title: 'Thời gian kích hoạt',
      dataIndex: 'activatedAt',
      valueType: 'dateTime',
      fieldProps: { placeholder: 'Chọn thời gian kích hoạt' },
      sorter: (a, b) =>
        (a.activatedAt?.getTime() || 0) - (b.activatedAt?.getTime() || 0),
      render: (_, r) => (r.activatedAt ? r.activatedAt.toLocaleString() : ''),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        'chưa kích hoạt': { text: 'Chưa kích hoạt' },
        'đang kích hoạt': { text: 'Đang kích hoạt' },
        'đã kết thúc': { text: 'Đã kết thúc' },
      },
      fieldProps: { placeholder: 'Chọn trạng thái' },
      render: (_, record) => {
      let color = '';
      let bgColor = '';
      switch (record.status) {
        case 'chưa kích hoạt':
          color = '#ad6800';
          bgColor = '#fffbe6';
          break;
        case 'đang kích hoạt':
          color = '#237804';
          bgColor = '#f6ffed';
          break;
        case 'đã kết thúc':
          color = '#cf1322';
          bgColor = '#fff1f0';
          break;
        }
      return (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 500,
            backgroundColor: bgColor,
            color,
          }}
        >
        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
        </span>
        );
      },
    },
    {
      title: 'Tùy chọn',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setEditingGiftcode(record);
            setModalVisible(true);
          }}
        >
          Chỉnh sửa
        </a>,
      ],
    },
  ];
  // Giao diện chính của trang
  return (
    <ConfigProvider locale={viVN}>
      <ProTable<Giftcode>
        headerTitle="Danh sách Giftcode"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        rowSelection={{
        selectedRowKeys,
          onChange: (keys: Key[], rows: Giftcode[]) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
          },
        }}
        toolBarRender={() => [
          <Space key="toolbar">
            <Button
              type="primary"
              onClick={() => {
                setEditingGiftcode(undefined);
                setModalVisible(true);
              }}
            >
              + Thêm Giftcode
            </Button>
            {selectedRows.length > 0 && (
              <Button danger onClick={handleDelete}>
                Xóa ({selectedRows.length})
              </Button>
            )}
          </Space>,
        ]}
        search={{
          labelWidth: 'auto',
          resetText: 'Đặt lại',
          searchText: 'Tìm kiếm',
        }}
        request={fetchGiftcodes}
        pagination={{ pageSize: 5 }}
      />
      <UpdateGiftcodeModal
        visible={modalVisible}
        giftcodeData={editingGiftcode}
        onClose={() => setModalVisible(false)}
        onUpdate={() => {
          setEditingGiftcode(undefined);
          actionRef.current?.reload();
        }}
      />
    </ConfigProvider>
  );
};

export default GiftcodePage;