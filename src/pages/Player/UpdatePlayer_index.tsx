import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Tag,
  message,
} from "antd";
import {
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  collection,
} from "firebase/firestore";
import React, { useEffect } from "react";
import { db } from "../../../config/firebaseConfig";

export type Player = {
  id: string;
  TenDangNhap: string;
  Email: string;
  Tien: number;
  TrangThai?: boolean; // TRUE = hoạt động, FALSE = bị ban
  LanCuoiNhanQua?: Date | null;
  ThongSoNguoiChoi?: any;
};

type Props = {
  visible: boolean;
  playerData?: Player;
  onClose: () => void;
  onUpdate: () => void;
};

const UpdatePlayerModal: React.FC<Props> = ({
  visible,
  playerData,
  onClose,
  onUpdate,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (playerData) {
      form.setFieldsValue({
        id: playerData.id,
        TenDangNhap: playerData.TenDangNhap,
        Email: playerData.Email,
        Tien: playerData.Tien,
      });
    } else {
      form.resetFields();
    }
  }, [playerData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        TenDangNhap: values.TenDangNhap,
        Email: values.Email,
        Tien: Number(values.Tien),
      };

      if (playerData) {
        await updateDoc(doc(db, "TaiKhoan", playerData.id), data);
        message.success("Cập nhật người chơi thành công!");
      } else {
        const docRef = doc(db, "TaiKhoan", values.id);
        const existingDoc = await getDoc(docRef);

        if (existingDoc.exists()) {
          message.error("UID đã tồn tại!");
          return;
        }

        const q = query(
          collection(db, "TaiKhoan"),
          where("TenDangNhap", "==", values.TenDangNhap)
        );
        const snaps = await getDocs(q);
        if (!snaps.empty) {
          message.error("Tên đăng nhập đã tồn tại!");
          return;
        }

        await setDoc(docRef, data);
        message.success("Thêm người chơi thành công!");
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      message.error("Lưu người chơi thất bại!");
    }
  };

  // 🔥 HANDLE BAN / UNBAN ACCOUNT
  const toggleBanAccount = async () => {
    if (!playerData) return;

    const newStatus = !playerData.TrangThai; // đảo trạng thái

    try {
      await updateDoc(doc(db, "TaiKhoan", playerData.id), {
        TrangThai: newStatus,
      });

      message.success(
        newStatus ? "Đã mở khóa tài khoản!" : "Đã ban tài khoản!"
      );

      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      message.error("Thao tác thất bại!");
    }
  };

  return (
    <Modal
      title={playerData ? "Chỉnh sửa người chơi" : "Thêm người chơi"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={650}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="UID"
              name="id"
              rules={[{ required: true, message: "Vui lòng nhập UID!" }]}
            >
              <Input placeholder="Nhập UID" disabled={!!playerData} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Tên đăng nhập"
              name="TenDangNhap"
              rules={[{ required: true, message: "Nhập tên đăng nhập!" }]}
            >
              <Input disabled={!!playerData} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Email"
              name="Email"
              rules={[{ required: true, message: "Nhập email!" }]}
            >
              <Input disabled={!!playerData} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Số tiền"
              name="Tien"
              rules={[{ required: true, message: "Nhập số tiền!" }]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        {/* 🔥 PHẦN TRẠNG THÁI TÀI KHOẢN */}
        {playerData && (
          <>
            <Row gutter={16} style={{ marginTop: 10 }}>
              <Col span={12}>
                <label>Trạng thái tài khoản</label>
                <br />
                {playerData.TrangThai ? (
                  <Tag color="green">Đang hoạt động</Tag>
                ) : (
                  <Tag color="red">Đang bị ban</Tag>
                )}
              </Col>

              <Col span={12} style={{ textAlign: "right", paddingTop: 22 }}>
                <Button
                  danger={!playerData.TrangThai}
                  type="primary"
                  onClick={toggleBanAccount}
                >
                  {playerData.TrangThai ? "Ban tài khoản" : "Mở tài khoản"}
                </Button>
              </Col>
            </Row>
          </>
        )}

        <Row justify="end" gutter={8} style={{ marginTop: 20 }}>
          <Col>
            <Button onClick={onClose}>Hủy</Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleSubmit}>
              Lưu
            </Button>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default UpdatePlayerModal;
