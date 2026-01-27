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
} from 'antd';
import dayjs from 'dayjs';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../../../config/firebaseConfig';

export type Giftcode = {
  id: string;
  code: string;
  amount: number;
  quantity: number;
  status: 'chưa kích hoạt' | 'đang kích hoạt' | 'đã kết thúc';
  createdAt: Date;
  activatedAt?: Date | null;
  expiredAt: Date;
};

type Props = {
  visible: boolean;
  giftcodeData?: Giftcode;
  onClose: () => void;
  onUpdate: () => void;
};

const UpdateGiftcodeModal: React.FC<Props> = ({
  visible,
  giftcodeData,
  onClose,
  onUpdate,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (giftcodeData) {
      form.setFieldsValue({
        code: giftcodeData.code,
        amount: giftcodeData.amount,
        quantity: giftcodeData.quantity,
        createdAt: dayjs(giftcodeData.createdAt),
        activatedAt: giftcodeData.activatedAt
          ? dayjs(giftcodeData.activatedAt)
          : null,
        expiredAt: dayjs(giftcodeData.expiredAt),
      });
    } else {
      form.resetFields();
    }
  }, [giftcodeData, form]);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const values = await form.validateFields();

      const createdAtDate = giftcodeData
        ? values.createdAt.toDate()
        : new Date();

      const expiredAtDate = values.expiredAt.toDate();
      const activatedAtDate = values.activatedAt.toDate();

      if (createdAtDate > expiredAtDate) {
        message.error('Thời gian kết thúc phải sau thời gian tạo!');
        return;
      }

      if (
        activatedAtDate < createdAtDate ||
        activatedAtDate > expiredAtDate
      ) {
        message.error(
          'Thời gian kích hoạt cần nằm trong khoảng từ thời gian tạo đến thời gian kết thúc!',
        );
        return;
      }

      const data = {
        Tien: values.amount,
        SoLuongConLai: values.quantity,
        ThoiGianTao: createdAtDate,
        ThoiGianKichHoat: activatedAtDate,
        ThoiGianKetThuc: expiredAtDate,
      };

      if (giftcodeData) {
        await updateDoc(doc(db, 'MaQuaTang', giftcodeData.code), data);
        message.success('Cập nhật thành công!');
      } else {
        if (!values.code) {
          message.error('Vui lòng nhập mã giftcode!');
          return;
        }
        const docRef = doc(db, 'MaQuaTang', values.code);
        const existing = await getDoc(docRef);
        if (existing.exists()) {
          message.error('Mã giftcode đã tồn tại, vui lòng chọn mã khác!');
          return;
        }
        await setDoc(docRef, data);
        message.success('Thêm Giftcode thành công!');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      message.error('Lưu Giftcode thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={giftcodeData ? 'Chỉnh sửa Giftcode' : 'Thêm Giftcode'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Form form={form} layout="vertical">
        {!giftcodeData && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Mã Giftcode"
                name="code"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã Giftcode!' },
                ]}
              >
                <Input placeholder="Nhập mã giftcode" />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Số tiền"
              name="amount"
              rules={[{ required: true, message: 'Vui lòng nhập số tiền!' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Số lượng"
              name="quantity"
              rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Thời gian kích hoạt"
              name="activatedAt"
              rules={[
                { required: true, message: 'Vui lòng chọn thời gian kích hoạt!' },
              ]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder="Chọn thời gian kích hoạt"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Thời gian kết thúc"
              name="expiredAt"
              rules={[
                { required: true, message: 'Vui lòng chọn thời gian kết thúc!' },
              ]}
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {giftcodeData && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Thời gian tạo" name="createdAt">
                <DatePicker showTime style={{ width: '100%' }} disabled />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row justify="end" gutter={8}>
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

export default UpdateGiftcodeModal;