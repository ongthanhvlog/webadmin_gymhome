import React, { useState, cloneElement, useCallback } from "react";
import { ProFormSelect, ProFormText, StepsForm } from "@ant-design/pro-components";
import { Button, Modal, message, Spin } from "antd";
import { terminal } from "@umijs/max";
import { auth, db } from "../../../../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type UpdateFormProps = {
  trigger?: React.ReactElement<any>;
  onOk?: () => void;
  values: any;
};

const UpdateForm: React.FC<UpdateFormProps> = ({ trigger, onOk, values }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false); // dùng cho load dữ liệu ban đầu
  const [submitting, setSubmitting] = useState(false); // dùng cho trạng thái submit/update
  const [formData, setFormData] = useState<any>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const onCancel = useCallback(() => {
    // nếu đang submit thì không cho đóng
    if (submitting) return;
    setOpen(false);
    setFormData(null);
  }, [submitting]);

  const onOpen = useCallback(async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "TaiKhoanQuanTri", values.key);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const newData = {
          ...values,
          fullName: data.HoTen || values.fullName,
          email: data.Email || values.email,
          phoneNumber: data.SoDT || values.phoneNumber,
          role: data.VaiTro === "Admin" ? 1 : 2,
          status: data.TrangThai === true ? 0 : 1,
        };

        setFormData(newData);
        setOpen(true);
      } else {
        messageApi.warning("Không tìm thấy dữ liệu tài khoản!");
      }
    } catch (error) {
      messageApi.error("Không thể tải dữ liệu tài khoản!");
      terminal.error(error);
    } finally {
      setLoading(false);
    }
  }, [values, messageApi]);

  const handleUpdate = async (formValues: any) => {
    if (!formData) return;

    // Bảo đảm rule password: nếu có nhập thì >= 6 ký tự
    if (formValues.newPassword && formValues.newPassword.trim() !== "") {
      if (formValues.newPassword.length < 6) {
        messageApi.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
        return;
      }
    }

    setSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        messageApi.error("Chưa đăng nhập!");
        return;
      }

      let token: string;
      try {
        token = await currentUser.getIdToken();
      } catch {
        messageApi.error("Lỗi xác thực, vui lòng đăng nhập lại!");
        return;
      }

      // --- Firestore update ---
      const firestoreUpdates: any = {};
      if (formValues.fullName !== formData.fullName) firestoreUpdates.HoTen = formValues.fullName;
      if (formValues.email !== formData.email) firestoreUpdates.Email = formValues.email;
      if (formValues.phoneNumber !== formData.phoneNumber) firestoreUpdates.SoDT = formValues.phoneNumber;
      if (formValues.role !== formData.role) firestoreUpdates.VaiTro = formValues.role === 1 ? "Admin" : "User";
      if (formValues.status !== formData.status) firestoreUpdates.TrangThai = formValues.status === 0;

      // --- Cập nhật thông tin tài khoản trong Firestore ---
      if (Object.keys(firestoreUpdates).length > 0) {
        try {
          await setDoc(doc(db, "TaiKhoanQuanTri", values.key), firestoreUpdates, { merge: true });
          terminal.log("[UpdateForm] ✅ Đã cập nhật Firestore:", firestoreUpdates);
        } catch (err) {
          terminal.error("[UpdateForm] ❌ Lỗi cập nhật Firestore:", err);
          messageApi.error("Không thể cập nhật Firestore!");
          return;
        }
      }

      // --- Gọi API đổi mật khẩu (nếu có nhập) ---
      if (formValues.newPassword && formValues.newPassword.trim() !== "") {
        const changePassUrl =
          "https://asia-southeast1-tienlenmiennam-d2c29.cloudfunctions.net/api/DoiMatKhauTaiKhoanQuanTri";

        try {
          const res = await fetch(changePassUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              MatKhauMoi: formValues.newPassword,
              UserId: values.key,
            }),
          });

          const result = await res.json();
          if (res.ok && result.message === "Đổi mật khẩu thành công") {
            messageApi.success("✅ Đổi mật khẩu thành công!");
          } else {
            messageApi.error(`❌ ${result.loi || "Đổi mật khẩu thất bại!"}`);
          }
        } catch (err) {
          terminal.error("[UpdateForm] ❌ Lỗi gọi API đổi mật khẩu:", err);
          messageApi.error("Không thể kết nối API đổi mật khẩu!");
        }
      }

      // --- Gọi API bật/tắt tài khoản nếu thay đổi ---
      if (formValues.status !== formData.status) {
        const apiUrl =
          formValues.status === 1
            ? "https://asia-southeast1-tienlenmiennam-d2c29.cloudfunctions.net/api/TatTaiKhoanQuanTri"
            : "https://asia-southeast1-tienlenmiennam-d2c29.cloudfunctions.net/api/BatTaiKhoanQuanTri";

        try {
          await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ UserId: values.key }),
          });
        } catch (err) {
          terminal.error("[UpdateForm] ❌ Lỗi bật/tắt tài khoản:", err);
        }
      }

      messageApi.success("Cập nhật thông tin thành công!");
      onCancel();
      onOk?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      {trigger ? cloneElement(trigger, { onClick: onOpen }) : null}

      {formData && (
        <Modal
          width={640}
          destroyOnClose
          open={open}
          title="Cập nhật tài khoản"
          onCancel={onCancel}
          footer={null}
          bodyStyle={{ padding: "32px 40px 48px" }}
          closable={!submitting} // không cho đóng khi đang submit
          maskClosable={!submitting}
        >
          <Spin spinning={loading}>
            <StepsForm
              onFinish={handleUpdate}
              stepsProps={{ size: "small" }}
              submitter={{
                render: (props) => {
                  const { step, onPre, onSubmit } = props;

                  // disable các nút khi đang submitting
                  const disabledAll = submitting;

                  return [
                    step > 0 && (
                      <Button key="prev" onClick={() => onPre?.()} disabled={disabledAll}>
                        Quay lại
                      </Button>
                    ),
                    step < 1 && (
                      <Button
                        key="next"
                        type="primary"
                        onClick={() => props.form?.submit()}
                        disabled={disabledAll}
                      >
                        Tiếp theo
                      </Button>
                    ),
                    step === 1 && (
                      <Button
                        key="submit"
                        type="primary"
                        onClick={() => onSubmit?.()}
                        loading={submitting} // hiện loading trên nút
                        disabled={disabledAll}
                      >
                        Cập nhật
                      </Button>
                    ),
                    <Button key="cancel" onClick={onCancel} disabled={disabledAll}>
                      Hủy
                    </Button>,
                  ];
                },
              }}
            >
              {/* Step 1 */}
              <StepsForm.StepForm title="Thông tin cơ bản" initialValues={formData}>
                <ProFormText
                  name="fullName"
                  label="Họ và tên"
                  width="md"
                  rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
                />
                <ProFormText
                  name="email"
                  label="Email"
                  width="md"
                  rules={[{ type: "email", message: "Email không hợp lệ!" }]}
                />
                <ProFormText
                  name="phoneNumber"
                  label="Số điện thoại"
                  width="md"
                  rules={[{ pattern: /^[0-9]{9,11}$/, message: "Số điện thoại không hợp lệ!" }]}
                />
              </StepsForm.StepForm>

              {/* Step 2 */}
              <StepsForm.StepForm title="Vai trò, trạng thái & mật khẩu" initialValues={formData}>
                <ProFormSelect
                  name="role"
                  label="Vai trò"
                  width="md"
                  options={[
                    { label: "Admin", value: 1 },
                    { label: "Nhân viên", value: 2 },
                  ]}
                  rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
                />
                <ProFormSelect
                  name="status"
                  label="Trạng thái"
                  width="md"
                  options={[
                    { label: "Đang hoạt động", value: 0 },
                    { label: "Tắt hoạt động", value: 1 },
                  ]}
                  rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
                />
                <ProFormText
                  name="newPassword"
                  label="Mật khẩu mới"
                  width="md"
                  placeholder="Nhập mật khẩu mới (không bắt buộc)"
                  fieldProps={{ type: "password" }}
                  rules={[
                    {
                      validator: async (_: any, value: string) => {
                        if (!value || value.trim() === "") {
                          // không nhập => hợp lệ (không đổi mật khẩu)
                          return Promise.resolve();
                        }
                        if (value.length < 6) {
                          return Promise.reject(new Error("Mật khẩu phải có ít nhất 6 ký tự!"));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                />
              </StepsForm.StepForm>
            </StepsForm>
          </Spin>
        </Modal>
      )}
    </>
  );
};

export default UpdateForm;
