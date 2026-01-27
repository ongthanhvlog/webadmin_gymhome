import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, ConfigProvider, Modal, message, Space, Table } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { type Key, useRef, useState } from 'react';
import { db } from '../../../../config/firebaseConfig';
import UpdateEventModal, {
  type EventItem,
  type TaskItem,
} from '../Edit/UpdateEvent_index';

const EventPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [selectedRows, setSelectedRows] = useState<EventItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | undefined>(
    undefined,
  );
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<{
    moTa: string;
    tasks: TaskItem[];
  }>({ moTa: '', tasks: [] });

  // Lấy dữ liệu từ Firebase với filter, chỉ lấy TrangThai = 1
  const fetchEvents = async (params?: any) => {
    try {
      const q = query(collection(db, 'SuKien'), where('TrangThai', '==', 1));
      const snapshot = await getDocs(q);
      const currentTime = Date.now(); // milliseconds
      let data: EventItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        let startTime: Date;
        let endTime: Date;
        if (d.Loai === 0 || d.Loai === 1) {
          // Đối với sự kiện vĩnh viễn đặt thời gian ảo
          startTime = new Date(2000, 0, 1);
          endTime = new Date(9999, 0, 1);
        } else {
          startTime = d.ThoiGianBatDau
            ? new Date(d.ThoiGianBatDau)
            : new Date(0);
          endTime = d.ThoiGianKetThuc
            ? new Date(d.ThoiGianKetThuc)
            : new Date(0);
        }
        let tinhTrang = 'Đang diễn ra';
        if (d.Loai === 2) {
          if (currentTime < d.ThoiGianBatDau) {
            tinhTrang = 'Chưa diễn ra';
          } else if (currentTime < d.ThoiGianKetThuc) {
            tinhTrang = 'Đang diễn ra';
          } else {
            tinhTrang = 'Đã kết thúc';
          }
        }
        return {
          id: docSnap.id,
          tieuDe: d.TieuDe || '',
          loai: d.Loai ?? 0,
          thoiGianBatDau: startTime,
          thoiGianKetThuc: endTime,
          tinhTrang,
          moTa: d.MoTa || '',
        };
      });

      // Lọc theo tiêu đề
      if (params?.tieuDe) {
        data = data.filter((item) =>
          item.tieuDe.toLowerCase().includes(params.tieuDe.toLowerCase()),
        );
      }

      // Lọc theo loại
      if (params?.loai !== undefined) {
        data = data.filter((item) => item.loai === Number(params.loai));
      }

      // Lọc theo tình trạng
      if (params?.tinhTrang) {
        data = data.filter((item) => item.tinhTrang === params.tinhTrang);
      }

      // Lọc theo thời gian bắt đầu (chỉ áp dụng cho loại 2, loại bỏ vĩnh viễn nếu có filter thời gian)
      if (params?.thoiGianBatDau) {
        data = data.filter((item) => {
          if (item.loai === 0 || item.loai === 1) return false;
          return (
            item.thoiGianBatDau.toDateString() ===
            new Date(params.thoiGianBatDau).toDateString()
          );
        });
      }

      // Lọc theo thời gian kết thúc (chỉ áp dụng cho loại 2, loại bỏ vĩnh viễn nếu có filter thời gian)
      if (params?.thoiGianKetThuc) {
        data = data.filter((item) => {
          if (item.loai === 0 || item.loai === 1) return false;
          return (
            item.thoiGianKetThuc.toDateString() ===
            new Date(params.thoiGianKetThuc).toDateString()
          );
        });
      }

      // Sắp xếp theo Thời gian bắt đầu tăng dần
      data.sort(
        (a, b) => a.thoiGianBatDau.getTime() - b.thoiGianBatDau.getTime(),
      );

      return { data, success: true, total: data.length };
    } catch (error) {
      console.error(error);
      message.error('Lấy dữ liệu sự kiện thất bại!');
      return { data: [], success: false };
    }
  };

  // "Xóa" các event đã chọn bằng cách set TrangThai = 0
  const handleDelete = async (rows: EventItem[]) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc muốn xóa ${rows.length} sự kiện đã chọn không?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await Promise.all(
            rows.map((r) =>
              updateDoc(doc(db, 'SuKien', r.id), { TrangThai: 0 }),
            ),
          );
          message.success('Đã xóa thành công!');
          setSelectedRowKeys([]);
          setSelectedRows([]);
          actionRef.current?.reload();
        } catch (error) {
          console.error(error);
          message.error('Xóa thất bại!');
        }
      },
    });
  };

  // Xem chi tiết: MoTa và bảng DanhSachNhiemVu
  const handleDetail = async (record: EventItem) => {
    try {
      const tasksSnapshot = await getDocs(
        collection(db, 'SuKien', record.id, 'DanhSachNhiemVu'),
      );
      const tasks: TaskItem[] = tasksSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        loai: docSnap.data().Loai || '',
        giaTri: docSnap.data().GiaTri ?? 0,
        noiDung: docSnap.data().NoiDung || '',
        phanThuong: docSnap.data().PhanThuong ?? 0,
      }));
      setDetailData({ moTa: record.moTa, tasks });
      setDetailVisible(true);
    } catch (error) {
      console.error(error);
      message.error('Lấy chi tiết thất bại!');
    }
  };

  const columns: ProColumns<EventItem>[] = [
    {
      title: 'Tiêu Đề',
      dataIndex: 'tieuDe',
      valueType: 'text',
      fieldProps: { placeholder: 'Tìm tiêu đề' },
    },
    {
      title: 'Loại',
      dataIndex: 'loai',
      valueType: 'select',
      valueEnum: {
        0: { text: 'Vĩnh viễn(reset theo ngày)' },
        1: { text: 'Vĩnh viễn' },
        2: { text: 'Theo thời gian' },
      },
    },
    {
      title: 'Thời Gian Bắt Đầu',
      dataIndex: 'thoiGianBatDau',
      valueType: 'dateTime',
      sorter: (a, b) => a.thoiGianBatDau.getTime() - b.thoiGianBatDau.getTime(),
      render: (_, r) => {
        if (r.loai === 0 || r.loai === 1) return 'Vĩnh viễn';
        return r.thoiGianBatDau.toLocaleString();
      },
    },
    {
      title: 'Thời Gian Kết Thúc',
      dataIndex: 'thoiGianKetThuc',
      valueType: 'dateTime',
      sorter: (a, b) =>
        a.thoiGianKetThuc.getTime() - b.thoiGianKetThuc.getTime(),
      render: (_, r) => {
        if (r.loai === 0 || r.loai === 1) return 'Vĩnh viễn';
        return r.thoiGianKetThuc.toLocaleString();
      },
    },
    {
      title: 'Tình Trạng',
      dataIndex: 'tinhTrang',
      valueType: 'select',
      valueEnum: {
        'Chưa diễn ra': { text: 'Chưa diễn ra' },
        'Đang diễn ra': { text: 'Đang diễn ra' },
        'Đã kết thúc': { text: 'Đã kết thúc' },
      },
      fieldProps: { placeholder: 'Chọn tình trạng' },
      render: (_, record) => {
        let color = '';
        let bgColor = '';
        switch (record.tinhTrang) {
          case 'Chưa diễn ra':
            color = '#ad6800';
            bgColor = '#fffbe6';
            break;
          case 'Đang diễn ra':
            color = '#237804';
            bgColor = '#f6ffed';
            break;
          case 'Đã kết thúc':
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
            {record.tinhTrang}
          </span>
        );
      },
    },
    {
      title: 'Mô tả',
      dataIndex: 'moTa',
      search: false,
      render: (_, r) => <a onClick={() => handleDetail(r)}>Xem chi tiết</a>,
    },
    {
      title: 'Tùy chọn',
      valueType: 'option',
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setEditingEvent(record);
            setModalVisible(true);
          }}
        >
          Chỉnh sửa
        </a>,
      ],
    },
  ];

  const taskColumns = [
    {
      title: 'Loại',
      dataIndex: 'loai',
    },
    {
      title: 'Điều Kiện',
      dataIndex: 'giaTri',
    },
    {
      title: 'Nội Dung',
      dataIndex: 'noiDung',
    },
    {
      title: 'Phần Thưởng',
      dataIndex: 'phanThuong',
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <ProTable<EventItem>
        headerTitle="Danh sách Sự kiện"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={fetchEvents}
        pagination={{ pageSize: 7 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys: Key[], rows: EventItem[]) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
          },
        }}
        search={{
          labelWidth: 'auto',
          resetText: 'Đặt lại',
          searchText: 'Tìm kiếm',
        }}
        toolBarRender={() => [
          <Space key="toolbar">
            <Button
              type="primary"
              onClick={() => {
                setEditingEvent(undefined);
                setModalVisible(true);
              }}
            >
              + Thêm Sự kiện mới
            </Button>
            {selectedRows.length > 0 && (
              <Button danger onClick={() => handleDelete(selectedRows)}>
                Xóa ({selectedRows.length})
              </Button>
            )}
          </Space>,
        ]}
      />
      <UpdateEventModal
        visible={modalVisible}
        eventData={editingEvent}
        onClose={() => setModalVisible(false)}
        onUpdate={() => {
          actionRef.current?.reload();
          setEditingEvent(undefined);
        }}
      />
      <Modal
        visible={detailVisible}
        title="Chi tiết sự kiện"
        footer={null}
        onCancel={() => setDetailVisible(false)}
        width={800}
      >
        <p>
          <strong>Mô tả:</strong> {detailData.moTa}
        </p>
        <p>
          <strong>Danh sách nhiệm vụ:</strong>
        </p>
        <Table
          dataSource={detailData.tasks}
          columns={taskColumns}
          rowKey="id"
          pagination={false}
        />
      </Modal>
    </ConfigProvider>
  );
};

export default EventPage;
