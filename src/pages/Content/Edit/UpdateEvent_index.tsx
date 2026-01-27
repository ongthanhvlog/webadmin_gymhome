import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Select,
  Table,
} from 'antd';
import dayjs from 'dayjs';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../../../config/firebaseConfig';

export type EventItem = {
  id: string;
  tieuDe: string;
  loai: number;
  thoiGianBatDau: Date;
  thoiGianKetThuc: Date;
  tinhTrang: string;
  moTa: string;
};

export type TaskItem = {
  id?: string;
  loai: string;
  giaTri: number;
  noiDung: string;
  phanThuong: number;
};

type Props = {
  visible: boolean;
  eventData?: EventItem;
  onClose: () => void;
  onUpdate: () => void;
};

const UpdateEventModal: React.FC<Props> = ({
  visible,
  eventData,
  onClose,
  onUpdate,
}) => {
  const [form] = Form.useForm();
  const loai = Form.useWatch('loai', form);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (eventData) {
        const tasksSnapshot = await getDocs(
          collection(db, 'SuKien', eventData.id, 'DanhSachNhiemVu'),
        );
        const tasks = tasksSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          loai: docSnap.data().Loai,
          giaTri: docSnap.data().GiaTri,
          noiDung: docSnap.data().NoiDung,
          phanThuong: docSnap.data().PhanThuong,
        }));
        form.setFieldsValue({
          tieuDe: eventData.tieuDe,
          loai: eventData.loai,
          thoiGianBatDau: dayjs(eventData.thoiGianBatDau),
          thoiGianKetThuc: dayjs(eventData.thoiGianKetThuc),
          moTa: eventData.moTa,
          danhSachNhiemVu: tasks,
        });
      } else {
        form.resetFields();
      }
    };
    loadData();
  }, [eventData, form, visible]);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const values = await form.validateFields();
      const danhSachNhiemVu = values.danhSachNhiemVu || [];

      // Kiểm tra bắt buộc có ít nhất 1 nhiệm vụ khi thêm mới
      if (!eventData && danhSachNhiemVu.length === 0) {
        message.error('Vui lòng thêm ít nhất một nhiệm vụ cho sự kiện mới!');
        return;
      }
      let thoiGianBatDau = 0;
      let thoiGianKetThuc = 0;
      if (values.loai === 0 || values.loai === 1) {
        // Đối với loại sự kiện vĩnh viễn: lưu giá trị thời gian ảo dưới dạng milliseconds
        thoiGianBatDau = new Date(2000, 0, 1).getTime();
        thoiGianKetThuc = new Date(9999, 0, 1).getTime();
      } else {
        thoiGianBatDau = values.thoiGianBatDau.valueOf();
        thoiGianKetThuc = values.thoiGianKetThuc.valueOf();
        if (thoiGianBatDau > thoiGianKetThuc) {
          message.error('Thời gian kết thúc phải sau thời gian bắt đầu!');
          return;
        }
        // Kiểm tra nếu sự kiện đang "Đang diễn ra" thì không cho phép thay đổi thời gian bắt đầu
        if (eventData?.tinhTrang === 'Đang diễn ra') {
          const originalStartTime = eventData.thoiGianBatDau.getTime();
          if (thoiGianBatDau !== originalStartTime) {
            message.error(
              'Không thể thay đổi thời gian bắt đầu khi sự kiện đang diễn ra!',
            );
            return;
          }
        }
      }

      const data = {
        Id: '',
        TieuDe: values.tieuDe,
        Loai: values.loai,
        ThoiGianBatDau: thoiGianBatDau,
        ThoiGianKetThuc: thoiGianKetThuc,
        MoTa: values.moTa,
        TrangThai: 1,
      };

      if (eventData) {
        // Cập nhật sự kiện
        const docRef = doc(db, 'SuKien', eventData.id);
        data.Id = eventData.id;
        await updateDoc(docRef, data);
        // Xử lý nhiệm vụ: xóa cũ, thêm mới
        const tasksCollection = collection(
          db,
          'SuKien',
          eventData.id,
          'DanhSachNhiemVu',
        );
        const existingTasks = await getDocs(tasksCollection);
        await Promise.all(existingTasks.docs.map((d) => deleteDoc(d.ref)));
        await Promise.all(
          danhSachNhiemVu.map(async (task: TaskItem) => {
            const taskDocRef = await addDoc(tasksCollection, {
              Id: '',
              IdSuKien: eventData.id,
              Loai: task.loai,
              GiaTri: task.giaTri,
              NoiDung: task.noiDung,
              PhanThuong: task.phanThuong,
            });
            await updateDoc(taskDocRef, { Id: taskDocRef.id });
          }),
        );
        message.success('Cập nhật sự kiện thành công!');
      } else {
        // Thêm sự kiện mới
        const docRef = await addDoc(collection(db, 'SuKien'), {
          ...data,
          Id: '',
        });
        const newId = docRef.id;
        await updateDoc(docRef, { Id: newId });
        // Thêm nhiệm vụ
        const tasksCollection = collection(
          db,
          'SuKien',
          newId,
          'DanhSachNhiemVu',
        );
        await Promise.all(
          danhSachNhiemVu.map(async (task: TaskItem) => {
            const taskDocRef = await addDoc(tasksCollection, {
              Id: '',
              IdSuKien: newId,
              Loai: task.loai,
              GiaTri: task.giaTri,
              NoiDung: task.noiDung,
              PhanThuong: task.phanThuong,
            });
            await updateDoc(taskDocRef, { Id: taskDocRef.id });
          }),
        );
        message.success('Thêm sự kiện thành công!');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      message.error('Lưu sự kiện thất bại!');
    } finally {
      setLoading(false);
    }
  };

  const taskColumns = [
    {
      title: 'Loại',
      dataIndex: 'loai',
      width: 170,
      render: (_: any, record: any, index: number) => (
        <Form.Item
          name={[index, 'loai']}
          rules={[{ required: true, message: 'Vui lòng chọn loại!' }]}
          style={{ marginBottom: 0 }}
        >
          <Select>
            <Select.Option value="SoTienThang">SoTienThang</Select.Option>
            <Select.Option value="SoTran">SoTran</Select.Option>
            <Select.Option value="SoTranThang">SoTranThang</Select.Option>
            <Select.Option value="ChuoiThang">ChuoiThang</Select.Option>
            <Select.Option value="SoTienNap">SoTienNap</Select.Option>
            <Select.Option value="ThoiGianChoi">ThoiGianChoi</Select.Option>
            <Select.Option value="NhanMienPhi">NhanMienPhi</Select.Option>
            <Select.Option value="QuangCao">QuangCao</Select.Option>
          </Select>
        </Form.Item>
      ),
    },
    {
      title: 'Điều Kiện',
      dataIndex: 'giaTri',
      render: (_: any, record: any, index: number) => (
        <Form.Item
          name={[index, 'giaTri']}
          rules={[{ required: true, message: 'Vui lòng nhập giá trị!' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={0} />
        </Form.Item>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'noiDung',
      render: (_: any, record: any, index: number) => (
        <Form.Item
          name={[index, 'noiDung']}
          rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
          style={{ marginBottom: 0 }}
        >
          <Input.TextArea
            placeholder="Mô tả nhiệm vụ"
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
        </Form.Item>
      ),
    },
    {
      title: 'Phần thưởng',
      dataIndex: 'phanThuong',
      render: (_: any, record: any, index: number) => (
        <Form.Item
          name={[index, 'phanThuong']}
          rules={[{ required: true, message: 'Vui lòng nhập phần thưởng!' }]}
          style={{ marginBottom: 0 }}
        >
          <InputNumber min={0} />
        </Form.Item>
      ),
    },
    {
      title: 'Tùy chọn',
      render: (_: any, record: any, index: number) => (
        <Button
          danger
          onClick={() => record.onRemove(index)}
          style={{ marginBottom: 0 }}
        >
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={eventData ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
      visible={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Tiêu Đề"
              name="tieuDe"
              rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
            >
              <Input placeholder="Nhập tiêu đề sự kiện" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Loại"
              name="loai"
              rules={[{ required: true, message: 'Vui lòng chọn loại!' }]}
            >
              <Select>
                <Select.Option value={0}>
                  Vĩnh viễn(reset theo ngày)
                </Select.Option>
                <Select.Option value={1}>Vĩnh viễn</Select.Option>
                <Select.Option value={2}>Theo thời gian</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {loai === 2 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Thời gian bắt đầu"
                name="thoiGianBatDau"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn thời gian bắt đầu!',
                  },
                ]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  disabled={eventData?.tinhTrang === 'Đang diễn ra'}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Thời gian kết thúc"
                name="thoiGianKetThuc"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn thời gian kết thúc!',
                  },
                ]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item
          label="Mô tả"
          name="moTa"
          rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
        >
          <Input.TextArea placeholder="Nhập mô tả sự kiện" />
        </Form.Item>

        <Form.List name="danhSachNhiemVu">
          {(fields, { add, remove }) => (
            <>
              <h3>Danh sách nhiệm vụ</h3>
              <Table
                dataSource={fields}
                columns={taskColumns.map((col) => ({
                  ...col,
                  render: col.render
                    ? (text, record, index) =>
                        col.render(text, { ...record, onRemove: remove }, index)
                    : undefined,
                }))}
                rowKey={(record) => record.key}
                pagination={false}
              />
              <Button
                type="dashed"
                onClick={() => add()}
                block
                style={{ marginTop: 16 }}
              >
                + Thêm nhiệm vụ
              </Button>
            </>
          )}
        </Form.List>

        <Row justify="end" gutter={8} style={{ marginTop: 16 }}>
          <Col>
            <Button onClick={onClose}>Hủy</Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              Lưu
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default UpdateEventModal;
