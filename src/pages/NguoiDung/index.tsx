import React, { useRef, useState, useEffect } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import {
  ConfigProvider, Modal, Form, Input, message, Card, Typography, Divider,
  Row, Col, Button, DatePicker, Radio, Select, Tag, Tooltip, Popconfirm, Switch, TimePicker,
} from 'antd';
import {
  BellOutlined, FireOutlined, HeartOutlined, TrophyOutlined,
  EditOutlined, DeleteOutlined, PlusOutlined, MoonOutlined,
} from '@ant-design/icons';
import viVN from 'antd/es/locale/vi_VN';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import dayjs from 'dayjs';

const { Text } = Typography;
const WaterDropIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '1em', height: '1em', ...style }}
  >
    <path d="M12 2C12 2 5 9.5 5 14.5a7 7 0 0 0 14 0C19 9.5 12 2 12 2Z" />
  </svg>
);

interface NguoiDung {
  UserId: string;
  Email: string;
  SoLuongBaiHocDaDangKy: number;
  ThongTinNguoiDung: {
    CanNang: number;
    ChieuCao: number;
    SoBaiTapHoanThanh: number;
    ThoiGianTapLuyen: number;
    TongCalo: number;
  };
}

interface ThongBaoMoiNgay {
  id: string;
  tieuDe: string;
  noiDung: string;
  icon: string;
  trangThai: 1 | 2; // 1 = bật, 2 = tắt
  thoiGian: string;
}


const ICON_OPTIONS = [
  { value: 'water',       label: 'Uống nước',   icon: <WaterDropIcon /> },
  { value: 'gym',         label: 'Tập luyện',   icon: <FireOutlined /> },
  { value: 'sleep',       label: 'Ngủ nghỉ',    icon: <MoonOutlined /> },
  { value: 'health',      label: 'Sức khoẻ',    icon: <HeartOutlined /> },
  { value: 'achievement', label: 'Thành tích',  icon: <TrophyOutlined /> },
  { value: 'thongBao',    label: 'Thông báo',    icon: <BellOutlined /> },
];

const ICON_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  water:       { bg: '#e6f7ff', color: '#1890ff' },
  gym:         { bg: '#fff7e6', color: '#fa8c16' },
  sleep:       { bg: '#f0f5ff', color: '#597ef7' },
  health:      { bg: '#fff0f6', color: '#eb2f96' },
  achievement: { bg: '#f6ffed', color: '#52c41a' },
  thongBao:    { bg: '#fffbe6', color: '#faad14' },
};

function renderIconBox(iconKey: string) {
  const opt = ICON_OPTIONS.find((o) => o.value === iconKey);
  const colors = ICON_COLOR_MAP[iconKey] ?? { bg: '#f5f5f5', color: '#8c8c8c' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 10,
        background: colors.bg,
        color: colors.color,
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {opt ? opt.icon : <BellOutlined />}
    </span>
  );
}

const panelStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: 12,
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  overflow: 'hidden',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid #f5f5f5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#fafafa',
};

const panelBodyStyle: React.CSSProperties = {
  padding: '20px',
  flex: 1,
};

const NguoiDungPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<NguoiDung | undefined>();
  const [form] = Form.useForm();

  const [formThongBaoChung] = Form.useForm();
  const [loadingThongBaoChung, setLoadingThongBaoChung] = useState(false);
  const [gioGuiThongBaoChung, setGioGuiThongBaoChung] = useState('now');
  const [modalThongBaoCaNhan, setModalThongBaoCaNhan] = useState(false);
  const [nguoiDungDuocChon, setNguoiDungDuocChon] = useState<NguoiDung | undefined>();
  const [formThongBaoCaNhan] = Form.useForm();
  const [loadingThongBaoCaNhan, setLoadingThongBaoCaNhan] = useState(false);
  const [gioGuiThongBaoCaNhan, setGioGuiThongBaoCaNhan] = useState('now');

  const [dsThongBao, setDsThongBao] = useState<ThongBaoMoiNgay[]>([]);
  const [loadingThongBao, setLoadingThongBao] = useState(false);
  const [modalThongBao, setModalThongBao] = useState(false);
  const [thongBaoDangSua, setThongBaoDangSua] = useState<ThongBaoMoiNgay | undefined>();
  const [formThongBao] = Form.useForm();
  const [dangLuuThongBao, setDangLuuThongBao] = useState(false);

  const fetchUsers = async (params: any) => {
    try {
      const snapshot = await getDocs(collection(db, 'NguoiDung'));

      const dataPromises = snapshot.docs.map(async (docSnap) => {
        const d = docSnap.data() as any;
        const userId = docSnap.id;

        const subCollectionRef = collection(db, 'NguoiDung', userId, 'DanhSachBaiTapLonDaDangKy');
        const subSnapshot = await getDocs(subCollectionRef);
        const soLuongBaiTap = subSnapshot.size;

        const thongTin = d.ThongTinNguoiDung || {};

        return {
          UserId: userId,
          Email: d.Email || '',
          SoLuongBaiHocDaDangKy: soLuongBaiTap,
          ThongTinNguoiDung: {
            CanNang: Number(thongTin.CanNang || 0),
            ChieuCao: Number(thongTin.ChieuCao || 0),
            SoBaiTapHoanThanh: Number(thongTin.SoBaiTapHoanThanh || 0),
            ThoiGianTapLuyen: Number(thongTin.ThoiGianTapLuyen || 0),
            TongCalo: Number(thongTin.TongCalo || 0),
          },
        };
      });

      let data: NguoiDung[] = await Promise.all(dataPromises);

      if (params?.SoLuongBaiHocDaDangKy !== undefined && params.SoLuongBaiHocDaDangKy !== '') {
        data = data.filter((item) => item.SoLuongBaiHocDaDangKy === Number(params.SoLuongBaiHocDaDangKy));
      }
      if (params?.Email) {
        data = data.filter((item) => item.Email.toLowerCase().includes(params.Email.toLowerCase()));
      }
      if (params?.UserId) {
        data = data.filter((item) => item.UserId.toLowerCase().includes(params.UserId.toLowerCase()));
      }
      return { data, success: true, total: data.length };
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải dữ liệu người dùng');
      return { data: [], success: false };
    }
  };

  useEffect(() => {
    if (editingUser) {
      form.setFieldsValue(editingUser);
    }
  }, [editingUser, form]);

  const xuLyGuiThongBaoChung = async () => {
    try {
      const values = await formThongBaoChung.validateFields();
      setLoadingThongBaoChung(true);

      const payload: any = {
        tieuDe: values.TieuDe,
        noiDung: values.NoiDung,
      };

      if (gioGuiThongBaoChung === 'schedule' && values.NgayGui) {
        payload.ngayGui = values.NgayGui.format('YYYY-MM-DD HH:mm:ss');
        payload.ngayGuiTimestamp = values.NgayGui.valueOf();
      }

      const response = await fetch('https://guiThongBaoHeThong-6lydh5sipq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        if (gioGuiThongBaoChung === 'schedule' && values.NgayGui) {
          message.success(`Đã hẹn giờ thành công vào lúc ${values.NgayGui.format('HH:mm:ss')} ${values.NgayGui.format('DD/MM/YYYY')}`);
        } else {
          message.success(result.message);
        }
        formThongBaoChung.resetFields();
        setGioGuiThongBaoChung('now');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      message.error('Gửi thông báo chung thất bại!');
    } finally {
      setLoadingThongBaoChung(false);
    }
  };

  const xuLyGuiThongBaoCaNhan = async () => {
    if (!nguoiDungDuocChon) return;
    try {
      const values = await formThongBaoCaNhan.validateFields();
      setLoadingThongBaoCaNhan(true);

      const payload: any = {
        userId: nguoiDungDuocChon.UserId,
        tieuDe: values.TieuDe,
        noiDung: values.NoiDung,
      };

      if (gioGuiThongBaoCaNhan === 'schedule' && values.NgayGui) {
        payload.ngayGui = values.NgayGui.format('YYYY-MM-DD HH:mm:ss');
        payload.ngayGuiTimestamp = values.NgayGui.valueOf();
      }

      const response = await fetch('https://guiThongBaoHeThong-6lydh5sipq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        if (gioGuiThongBaoCaNhan === 'schedule' && values.NgayGui) {
          message.success(`Đã hẹn giờ thành công vào lúc ${values.NgayGui.format('HH:mm:ss')} ${values.NgayGui.format('DD/MM/YYYY')} cho ${nguoiDungDuocChon.Email}`);
        } else {
          message.success(`Đã gửi thông báo đến ${nguoiDungDuocChon.Email}`);
        }
        formThongBaoCaNhan.resetFields();
        setModalThongBaoCaNhan(false);
        setGioGuiThongBaoCaNhan('now');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
      message.error('Gửi thông báo thất bại, vui lòng thử lại!');
    } finally {
      setLoadingThongBaoCaNhan(false);
    }
  };

  const layDsThongBao = async () => {
    setLoadingThongBao(true);
    try {
      const snapshot = await getDocs(collection(db, 'ThongBaoMoiNgay'));
      const data: ThongBaoMoiNgay[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          tieuDe: d.tieuDe || '',
          noiDung: d.noiDung || '',
          icon: d.icon || 'thongBao',
          trangThai: d.trangThai === 1 ? 1 : 2,
          thoiGian: d.thoiGian || '08:00',
        };
      });
      data.sort((a, b) => a.thoiGian.localeCompare(b.thoiGian));
      setDsThongBao(data);
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải thông báo mỗi ngày');
    } finally {
      setLoadingThongBao(false);
    }
  };

  useEffect(() => {
    layDsThongBao();
  }, []);

  const themThongBaoMoi = () => {
    setThongBaoDangSua(undefined);
    formThongBao.resetFields();
    formThongBao.setFieldsValue({ trangThai: 1, icon: 'thongBao' });
    setModalThongBao(true);
  };

  const suaThongBao = (thongBao: ThongBaoMoiNgay) => {
    setThongBaoDangSua(thongBao);
    formThongBao.setFieldsValue({
      tieuDe: thongBao.tieuDe,
      noiDung: thongBao.noiDung,
      icon: thongBao.icon,
      trangThai: thongBao.trangThai,
      thoiGian: dayjs(thongBao.thoiGian, 'HH:mm'),
    });
    setModalThongBao(true);
  };

  const xuLyLuuThongBao = async () => {
    try {
      const values = await formThongBao.validateFields();
      setDangLuuThongBao(true);

      const payload = {
        tieuDe: values.tieuDe,
        noiDung: values.noiDung,
        icon: values.icon,
        trangThai: values.trangThai,
        thoiGian: values.thoiGian ? values.thoiGian.format('HH:mm') : '08:00',
      };

      if (thongBaoDangSua) {
        await updateDoc(doc(db, 'ThongBaoMoiNgay', thongBaoDangSua.id), payload);
        message.success('Đã cập nhật thông báo!');
      } else {
        await addDoc(collection(db, 'ThongBaoMoiNgay'), payload);
        message.success('Đã thêm thông báo mới!');
      }

      setModalThongBao(false);
      formThongBao.resetFields();
      await layDsThongBao();
    } catch (error) {
      console.error(error);
      message.error('Lưu thông báo thất bại, vui lòng thử lại!');
    } finally {
      setDangLuuThongBao(false);
    }
  };

  const xuLyXoaThongBao = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ThongBaoMoiNgay', id));
      message.success('Đã xoá thông báo!');
      await layDsThongBao();
    } catch (error) {
      console.error(error);
      message.error('Xoá thông báo thất bại!');
    }
  };

  const xuLyChuyenTrangThaiThongBao = async (thongBao: ThongBaoMoiNgay) => {
    try {
      const newStatus: 1 | 2 = thongBao.trangThai === 1 ? 2 : 1;
      await updateDoc(doc(db, 'ThongBaoMoiNgay', thongBao.id), { trangThai: newStatus });
      setDsThongBao((prev) =>
        prev.map((r) => (r.id === thongBao.id ? { ...r, trangThai: newStatus } : r))
      );
    } catch (error) {
      console.error(error);
      message.error('Cập nhật trạng thái thất bại!');
    }
  };

  const columns: ProColumns<NguoiDung>[] = [
    { title: 'ID Người dùng', dataIndex: 'UserId', copyable: true },
    { title: 'Email', dataIndex: 'Email' },
    { title: 'Số bài tập đã đăng ký', dataIndex: 'SoLuongBaiHocDaDangKy', valueType: 'digit', sorter: (a, b) => a.SoLuongBaiHocDaDangKy - b.SoLuongBaiHocDaDangKy},
    {
      title: 'Thông số người dùng',
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <a key="view" onClick={() => { setEditingUser(record); setModalVisible(true); }}>Xem chi tiết</a>,
      ],
    },
    {
      title: 'Thông báo',
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Button
          key="send-personal"
          size="small"
          icon={<BellOutlined />}
          style={{ borderRadius: '4px', borderColor: '#faad14', color: '#faad14' }}
          onClick={() => {
            setNguoiDungDuocChon(record);
            formThongBaoCaNhan.resetFields();
            setGioGuiThongBaoCaNhan('now');
            setModalThongBaoCaNhan(true);
          }}
        >
          Gửi thông báo
        </Button>,
      ],
    },
  ];


  const ThongBaoItem: React.FC<{ thongBao: ThongBaoMoiNgay }> = ({ thongBao }) => {
    const isOn = thongBao.trangThai === 1;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#fff',
          border: '1px solid #f0f0f0',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          opacity: isOn ? 1 : 0.6,
          transition: 'opacity 0.2s',
        }}
      >
        {/* Time */}
        <div
          style={{
            minWidth: 46,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 13,
            color: '#1d3557',
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          {thongBao.thoiGian}
        </div>

        {/* Icon box */}
        {renderIconBox(thongBao.icon)}

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: '#1d1d1d',
              marginBottom: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {thongBao.tieuDe}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#8c8c8c',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {thongBao.noiDung}
          </div>
        </div>

        {/* Status tag */}
        <Tag
          style={{
            borderRadius: 20,
            padding: '2px 10px',
            fontWeight: 500,
            fontSize: 11,
            border: 'none',
            background: isOn ? '#e6f7ff' : '#f5f5f5',
            color: isOn ? '#1890ff' : '#8c8c8c',
            flexShrink: 0,
          }}
        >
          {isOn ? 'Đang bật' : 'Đang tắt'}
        </Tag>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          <Switch
            size="small"
            checked={isOn}
            onChange={() => xuLyChuyenTrangThaiThongBao(thongBao)}
          />
          <Tooltip title="Sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => suaThongBao(thongBao)}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
          <Popconfirm
            title="Xoá thông báo này?"
            onConfirm={() => xuLyXoaThongBao(thongBao.id)}
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                style={{ borderRadius: 6 }}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
    );
  };


  return (
    <ConfigProvider locale={viVN}>
      <Card title={<Text strong style={{ fontSize: '18px' }}>QUẢN LÝ NGƯỜI DÙNG HỆ THỐNG</Text>}>

        {/* ── Top section: 2 panels ───────────────────────── */}
        <Row gutter={[20, 20]} style={{ marginBottom: 24 }} align="stretch">

          {/* ── Panel 1: Thông báo chung ─────────────────── */}
          <Col xs={24} xl={12} style={{ display: 'flex' }}>
            <div style={{ ...panelStyle, width: '100%' }}>
              {/* Header */}
              <div style={panelHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#fffbe6',
                      color: '#faad14',
                      fontSize: 15,
                    }}
                  >
                    <BellOutlined />
                  </span>
                  <Text strong style={{ fontSize: 15, color: '#1d1d1d' }}>THÔNG BÁO CHUNG</Text>
                </div>
              </div>

              {/* Body */}
              <div style={panelBodyStyle}>
                <Form form={formThongBaoChung} layout="vertical">
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        label={<Text style={{ fontSize: 13, fontWeight: 500 }}>Tiêu đề</Text>}
                        name="TieuDe"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Input placeholder="Nhập tiêu đề thông báo" size="middle" />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        label={<Text style={{ fontSize: 13, fontWeight: 500 }}>Nội dung</Text>}
                        name="NoiDung"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Input.TextArea
                          placeholder="Nhập nội dung thông báo"
                          rows={3}
                          style={{ resize: 'none' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        label={<Text style={{ fontSize: 13, fontWeight: 500 }}>Thời gian gửi</Text>}
                        name="SendTiming"
                        style={{ marginBottom: 12 }}
                      >
                        <Radio.Group
                          value={gioGuiThongBaoChung}
                          onChange={(e) => setGioGuiThongBaoChung(e.target.value)}
                        >
                          <Radio value="now">Gửi ngay</Radio>
                          <Radio value="schedule">Hẹn giờ gửi</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                    {gioGuiThongBaoChung === 'schedule' && (
                      <Col span={24}>
                        <Form.Item
                          label={<Text style={{ fontSize: 13, fontWeight: 500 }}>Chọn ngày giờ gửi</Text>}
                          name="NgayGui"
                          rules={[{ required: true, message: 'Vui lòng chọn ngày giờ!' }]}
                          style={{ marginBottom: 12 }}
                        >
                          <DatePicker
                            showTime
                            style={{ width: '100%' }}
                            placeholder="Chọn ngày giờ gửi"
                            format="DD/MM/YYYY HH:mm"
                          />
                        </Form.Item>
                      </Col>
                    )}
                  </Row>

                  {/* Footer actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 8,
                      marginTop: 4,
                      paddingTop: 12,
                      borderTop: '1px solid #f5f5f5',
                    }}
                  >
                    <Button
                      onClick={() => { formThongBaoChung.resetFields(); setGioGuiThongBaoChung('now'); }}
                      style={{ borderRadius: 8 }}
                    >
                      Đặt lại
                    </Button>
                    <Button
                      icon={<BellOutlined />}
                      loading={loadingThongBaoChung}
                      onClick={xuLyGuiThongBaoChung}
                      style={{
                        borderRadius: 8,
                        borderColor: '#faad14',
                        color: '#faad14',
                      }}
                    >
                      Gửi thông báo
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </Col>

          {/* ── Panel 2: Thông báo mỗi ngày (NEW) ──────────── */}
          <Col xs={24} xl={12} style={{ display: 'flex' }}>
            <div style={{ ...panelStyle, width: '100%' }}>
              {/* Header */}
              <div style={panelHeaderStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#e6f7ff',
                      color: '#1890ff',
                      fontSize: 15,
                    }}
                  >
                    <BellOutlined />
                  </span>
                  <div>
                    <Text strong style={{ fontSize: 15, color: '#1d1d1d' }}>THÔNG BÁO MỖI NGÀY</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Tổng số: {dsThongBao.length} thông báo
                      </Text>
                    </div>
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={themThongBaoMoi}
                  style={{
                    borderRadius: 8,
                    background: '#1890ff',
                    borderColor: '#1890ff',
                    fontWeight: 500,
                    fontSize: 13,
                    height: 32,
                    paddingInline: 14,
                  }}
                >
                  Thêm thông báo
                </Button>
              </div>

              {/* Body — scrollable list */}
              <div
                style={{
                  padding: '14px',
                  flex: 1,
                  background: '#fafafa',
                  overflowY: 'auto',
                  maxHeight: 380,
                  minHeight: 100,
                }}
              >
                {loadingThongBao ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#bfbfbf' }}>
                    Đang tải...
                  </div>
                ) : dsThongBao.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0', color: '#bfbfbf' }}>
                    <BellOutlined style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
                    Chưa có thông báo nào
                  </div>
                ) : (
                  dsThongBao.map((r) => <ThongBaoItem key={r.id} thongBao={r} />)
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* ── User search table (existing, untouched) ──────── */}
        <div className="gymhome-table-container">
          <div style={{ padding: '16px 24px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px 8px 0 0', borderBottom: 'none' }}>
            <Text strong style={{ fontSize: '16px' }}>TÌM KIẾM NGƯỜI DÙNG</Text>
            <Divider style={{ margin: '12px 0 0' }} />
          </div>

          <ProTable<NguoiDung>
            actionRef={actionRef}
            headerTitle="DANH SÁCH NGƯỜI DÙNG"
            columns={columns}
            request={fetchUsers}
            rowKey="UserId"
            pagination={{ pageSize: 10 }}
            search={{
              layout: 'vertical',
              defaultCollapsed: false,
              searchText: 'Tìm kiếm',
              resetText: 'Đặt lại',
              labelWidth: 'auto',
              span: 6,
            }}
            form={{
              style: {
                background: '#ffffff',
                padding: '0 24px 24px',
                borderRadius: '0 0 8px 8px',
                border: '1px solid #f0f0f0',
                borderTop: 'none',
                marginBottom: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              },
            }}
          />
        </div>
      </Card>

      <Modal
        title="Thông tin chi tiết người dùng"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item label="Cân nặng (kg)" name={['ThongTinNguoiDung', 'CanNang']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Chiều cao (cm)" name={['ThongTinNguoiDung', 'ChieuCao']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Số bài tập hoàn thành" name={['ThongTinNguoiDung', 'SoBaiTapHoanThanh']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Tổng calo"
                name={['ThongTinNguoiDung', 'TongCalo']}
                getValueProps={(value) => ({ value: value !== undefined ? Number(value).toFixed(2) : '' })}
              >
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Thời gian tập luyện (phút)" name={['ThongTinNguoiDung', 'ThoiGianTapLuyen']}>
                <Input disabled style={{ color: 'rgba(0, 0, 0, 0.88)', backgroundColor: '#ffffff' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Existing: Personal notification modal ────────── */}
      <Modal
        title={`Gửi thông báo đến ${nguoiDungDuocChon?.Email ?? ''}`}
        open={modalThongBaoCaNhan}
        onCancel={() => { setModalThongBaoCaNhan(false); formThongBaoCaNhan.resetFields(); }}
        footer={[
          <Button
            key="cancel"
            onClick={() => { setModalThongBaoCaNhan(false); formThongBaoCaNhan.resetFields(); setGioGuiThongBaoCaNhan('now'); }}
          >
            Hủy
          </Button>,
          <Button
            key="send"
            icon={<BellOutlined />}
            style={{ borderRadius: '4px', borderColor: '#faad14', color: '#faad14' }}
            loading={loadingThongBaoCaNhan}
            onClick={xuLyGuiThongBaoCaNhan}
          >
            Gửi
          </Button>,
        ]}
        width={520}
        destroyOnClose
      >
        <Form form={formThongBaoCaNhan} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tiêu đề" name="TieuDe" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}>
            <Input placeholder="Nhập tiêu đề thông báo" />
          </Form.Item>
          <Form.Item label="Nội dung" name="NoiDung" rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}>
            <Input.TextArea rows={4} placeholder="Nhập nội dung thông báo" />
          </Form.Item>
          <Form.Item label="Thời gian gửi">
            <Radio.Group value={gioGuiThongBaoCaNhan} onChange={(e) => setGioGuiThongBaoCaNhan(e.target.value)}>
              <Radio value="now">Gửi ngay</Radio>
              <Radio value="schedule">Hẹn giờ gửi</Radio>
            </Radio.Group>
          </Form.Item>
          {gioGuiThongBaoCaNhan === 'schedule' && (
            <Form.Item label="Chọn ngày giờ gửi" name="NgayGui" rules={[{ required: true, message: 'Vui lòng chọn ngày giờ!' }]}>
              <DatePicker showTime style={{ width: '100%' }} placeholder="Chọn ngày giờ gửi" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* ── NEW: Add / Edit thongBao modal ───────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#e6f7ff',
                color: '#1890ff',
                fontSize: 14,
              }}
            >
              <BellOutlined />
            </span>
            <span>{thongBaoDangSua ? 'Sửa thông báo' : 'Thêm thông báo mới'}</span>
          </div>
        }
        open={modalThongBao}
        onCancel={() => { setModalThongBao(false); formThongBao.resetFields(); }}
        footer={[
          <Button
            key="cancel"
            style={{ borderRadius: 8 }}
            onClick={() => { setModalThongBao(false); formThongBao.resetFields(); }}
          >
            Huỷ
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={dangLuuThongBao}
            onClick={xuLyLuuThongBao}
            style={{ borderRadius: 8 }}
          >
            {thongBaoDangSua ? 'Cập nhật' : 'Thêm mới'}
          </Button>,
        ]}
        width={480}
        destroyOnClose
      >
        <Form form={formThongBao} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tiêu đề"
            name="tieuDe"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input placeholder="Nhập tiêu đề thông báo" />
          </Form.Item>

          <Form.Item
            label="Nội dung"
            name="noiDung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập nội dung thông báo mỗi ngày" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Icon"
                name="icon"
                rules={[{ required: true, message: 'Vui lòng chọn icon!' }]}
              >
                <Select placeholder="Chọn icon">
                  {ICON_OPTIONS.map((opt) => (
                    <Select.Option key={opt.value} value={opt.value}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: ICON_COLOR_MAP[opt.value]?.color }}>{opt.icon}</span>
                        {opt.label}
                      </span>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Thời gian"
                name="thoiGian"
                rules={[{ required: true, message: 'Vui lòng chọn giờ!' }]}
              >
                <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ" minuteStep={5} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Trạng thái" name="trangThai" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={1}>
                <Tag
                  style={{
                    borderRadius: 20,
                    padding: '1px 10px',
                    fontWeight: 500,
                    border: 'none',
                    background: '#e6f7ff',
                    color: '#1890ff',
                  }}
                >
                  Bật
                </Tag>
              </Radio>
              <Radio value={2}>
                <Tag
                  style={{
                    borderRadius: 20,
                    padding: '1px 10px',
                    fontWeight: 500,
                    border: 'none',
                    background: '#f5f5f5',
                    color: '#8c8c8c',
                  }}
                >
                  Tắt
                </Tag>
              </Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default NguoiDungPage;