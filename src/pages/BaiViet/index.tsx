import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import {
  Card, Col, Row, Statistic, Tag, Button, Tabs, Input, Space, Popconfirm,
  message, Badge, Typography, Spin, Tooltip, ConfigProvider, Avatar, Modal,
  Divider, Form, Select, Radio, Upload, Progress
} from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import {
  FileTextOutlined, TagsOutlined, ThunderboltOutlined, PlusOutlined, FireOutlined,
  CloseCircleOutlined, CheckCircleOutlined, CalendarOutlined, PlayCircleOutlined,
  SyncOutlined, ExclamationCircleOutlined, UploadOutlined, LinkOutlined, EditOutlined,
  StarFilled, StarOutlined, DeleteOutlined
} from '@ant-design/icons';
import { collection, getDocs, doc, getDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebaseConfig';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const TRIGGER_CAP_NHAT_BAI_VIET_URL = 'https://triggercapnhatbaivietmoi-6lydh5sipq-uc.a.run.app';
const TRIGGER_THEM_BAI_VIET_URL = 'https://thembaiviettulink-6lydh5sipq-uc.a.run.app'; 
const TRIGGER_XOA_BAI_VIET_CHUA_LUU_URL = 'https://triggerxoabaivietchualuu-6lydh5sipq-uc.a.run.app';

interface TuKhoa {
  TuKhoaUuTienCao: string[];
  TuKhoaUuTienThap: string[];
  TuKhoaLoaiBo: string[];
}

interface BaiViet {
  id: string;
  tenBaiViet: string;
  moTa?: string;
  hinhAnhDaiDien: string;
  ngayDang: string;
  tag: string;
  linkBaiViet?: string;
  linkLogo?: string;
  noiDung?: string;
  nguon?: string;
  trangThai?: number; // 1 = lưu vĩnh viễn, 0 = tự động xóa sau 7 ngày
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
};

interface StarButtonProps {
  baiViet: BaiViet;
  onToggle: (id: string, newTrangThai: number) => Promise<void>;
}

const StarButton: React.FC<StarButtonProps> = ({ baiViet, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const isPinned = baiViet.trangThai === 1;
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const newTrangThai = isPinned ? 0 : 1;
      await onToggle(baiViet.id, newTrangThai);
      message.success(
        newTrangThai === 1
          ? '⭐ Đã đánh dấu — bài viết sẽ được lưu vĩnh viễn'
          : '🗑️ Đã bỏ đánh dấu — bài viết sẽ tự động xóa sau 7 ngày'
      );
    } catch {
      message.error('Lỗi cập nhật trạng thái!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip
      title={
        isPinned
          ? 'Đang lưu vĩnh viễn — Nhấn để bỏ đánh dấu (sẽ tự xóa sau 7 ngày)'
          : 'Nhấn để đánh dấu lưu vĩnh viễn'
      }
      placement="right"
    >
      <Button type="text" size="small" loading={loading} onClick={handleClick}
        icon={ isPinned ? (
            <StarFilled style={{ color: '#faad14', fontSize: 16 }} />
          ) : (
            <StarOutlined style={{ color: '#bfbfbf', fontSize: 16 }} />
          )
        }
        style={{ padding: '2px 4px', minWidth: 28, background: isPinned ? '#fffbe6' : 'transparent', border: isPinned ? '1px solid #ffe58f' : '1px solid transparent', borderRadius: 6, transition: 'all 0.2s'}}
      />
    </Tooltip>
  );
};

interface KeywordEditorProps {
  keywords: string[];
  color: string;
  onAdd: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  loading: boolean;
}

const KeywordEditor: React.FC<KeywordEditorProps> = ({ keywords, color, onAdd, onRemove, loading }) => {
  const [inputVal, setInputVal] = useState('');
  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (keywords.includes(trimmed)) {
      message.warning('Từ khóa đã tồn tại!');
      return;
    }
    onAdd(trimmed);
    setInputVal('');
  };

  return (
    <Spin spinning={loading}>
      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input placeholder="Nhập từ khóa mới..." value={inputVal} onChange={e => setInputVal(e.target.value)} onPressEnter={handleAdd} allowClear/>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Thêm</Button>
      </Space.Compact>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 60 }}>
        {keywords.length === 0 && (
          <Text type="secondary" style={{ fontSize: 13 }}>Chưa có từ khóa nào.</Text>
        )}
        {keywords.map(keyword => (
          <Tag key={keyword} color={color} closable onClose={() => onRemove(keyword)} style={{ fontSize: 13, padding: '4px 10px', borderRadius: 20 }}> {keyword} </Tag>
        ))}
      </div>
    </Spin>
  );
};

const SourceDisplay: React.FC<{ linkLogo?: string; source?: string; nguon?: string }> = ({ linkLogo, source, nguon }) => {
  const [imgError, setImgError] = useState(false);
  if (nguon === 'GymHome') {
    return (
      <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>GymHome</Text>
    );
  }
  if (linkLogo && !imgError) {
    return (
      <img src={linkLogo} alt={source || 'logo'} onError={() => setImgError(true)}
        style={{ height: 18, maxWidth: 90, objectFit: 'contain', display: 'block' }}
      />
    );
  }
  return (
    <Text style={{ fontSize: 12, color: '#1976D2', fontStyle: 'italic' }}>
      {source || 'Báo Mới'}
    </Text>
  );
};

interface ThemBaiVietModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ThemBaiVietModal: React.FC<ThemBaiVietModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loaiNhap, setLoaiNhap] = useState<'baomoi' | 'manual'>('baomoi');
  const [loading, setLoading] = useState(false);
  const [imageSource, setImageSource] = useState<'url' | 'file'>('url');
  const [imageFileList, setImageFileList] = useState<any[]>([]);
  const [imageUploadProgress, setImageUploadProgress] = useState<number>(0);
  const [imageUploading, setImageUploading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    form.resetFields();
    setLoaiNhap('baomoi');
    setImageSource('url');
    setImageFileList([]);
    setImageUploadProgress(0);
    onClose();
  };

  const handleFetchBaoMoi = async () => {
    const url = form.getFieldValue('linkBaoMoi');
    if (!url) {
      message.warning('Vui lòng nhập link bài viết!');
      return;
    }
    setLoading(true);
    try {
      const tag = form.getFieldValue('tagBaoMoi') || 'suckhoe';
      const res = await fetch(`${TRIGGER_THEM_BAI_VIET_URL}?url=${encodeURIComponent(url)}&tag=${tag}`);
      const data = await res.json();
      if (res.status === 409) {
        message.warning('Bài viết này đã tồn tại trong hệ thống!');
        return;
      }
      if (!res.ok || !data.success) throw new Error(data.reason || 'Lỗi không xác định');
      message.success(`Đã thêm bài viết: "${data.tenBaiViet}"`);
      handleClose();
      onSuccess();
    } catch (e: any) {
      message.error(`Lỗi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManual = async (values: any) => {
    setLoading(true);
    setImageUploading(true);
    setImageUploadProgress(0);
    try {
      let hinhAnhUrl = '';
      if (imageSource === 'url') {
        hinhAnhUrl = values.hinhAnhUrl || '';
      } else if (imageSource === 'file' && imageFileList.length > 0 && imageFileList[0].originFileObj) {
        const file = imageFileList[0].originFileObj;
        const storageRefPath = `hinhanh/baiviet/${Date.now()}_${file.name}`;
        const storageRefVal = ref(storage, storageRefPath);
        const uploadTask = uploadBytesResumable(storageRefVal, file);
        hinhAnhUrl = await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => setImageUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
            reject,
            async () => { resolve(await getDownloadURL(uploadTask.snapshot.ref)); }
          );
        });
      }
      const docId = `manual_${Date.now()}`;
      const baiVietData = {
        tenBaiViet: values.tenBaiViet,
        moTa: values.moTa || values.tenBaiViet,
        hinhAnhDaiDien: hinhAnhUrl,
        ngayDang: new Date().toISOString(),
        tag: values.tag,
        linkBaiViet: values.linkBaiViet || '',
        linkLogo: '',
        nguon: 'GymHome',
        noiDung: values.noiDung || '',
        trangThai: 0,
      };
      await setDoc(doc(db, 'BaiViet', docId), baiVietData);
      message.success('Đã thêm bài viết thành công!');
      handleClose();
      onSuccess();
    } catch (e: any) {
      message.error(`Lỗi: ${e.message}`);
    } finally {
      setLoading(false);
      setImageUploading(false);
      setImageUploadProgress(0);
      setImageFileList([]);
    }
  };

  return (
    <Modal
      title="Thêm bài viết mới"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>Chọn cách thêm bài viết:</Text>
        <Radio.Group
          value={loaiNhap}
          onChange={e => { setLoaiNhap(e.target.value); form.resetFields(); }}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Radio.Button
              value="baomoi"
              style={{
                width: '100%', height: 'auto', padding: '12px 16px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 8,
                border: loaiNhap === 'baomoi' ? '2px solid #1677ff' : '1px solid #d9d9d9',
                background: loaiNhap === 'baomoi' ? '#f0f7ff' : '#fff',
              }}
            >
              <Space>
                <LinkOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                <div>
                  <Text strong style={{ display: 'block' }}>Lấy từ link Báo Mới</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Nhập link bài viết từ baomoi.com, hệ thống sẽ tự động lưu</Text>
                </div>
              </Space>
            </Radio.Button>
            <Radio.Button
              value="manual"
              style={{
                width: '100%', height: 'auto', padding: '12px 16px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 8,
                border: loaiNhap === 'manual' ? '2px solid #1677ff' : '1px solid #d9d9d9',
                background: loaiNhap === 'manual' ? '#f0f7ff' : '#fff',
              }}
            >
              <Space>
                <EditOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                <div>
                  <Text strong style={{ display: 'block' }}>Nhập dữ liệu thủ công</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Tự điền tiêu đề, nội dung, hình ảnh và các thông tin khác</Text>
                </div>
              </Space>
            </Radio.Button>
          </Space>
        </Radio.Group>
      </div>

      <Divider style={{ margin: '0 0 24px' }} />

      {loaiNhap === 'baomoi' && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="linkBaoMoi"
            label="Link bài viết Báo Mới"
            rules={[{ required: true, message: 'Vui lòng nhập link!' }, { type: 'url', message: 'Link không hợp lệ!' }]}
          >
            <Input placeholder="https://baomoi.com/ten-bai-viet.epi" prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} size="large" />
          </Form.Item>
          <Form.Item name="tagBaoMoi" label="Danh mục" initialValue="suckhoe" rules={[{ required: true }]}>
            <Select size="large" options={[
              { value: 'suckhoe', label: 'Sức khỏe' },
              { value: 'dinhduong', label: 'Dinh dưỡng' },
              { value: 'tapluyen', label: 'Tập luyện' },
            ]} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose} disabled={loading}>Hủy</Button>
            <Button type="primary" loading={loading} onClick={handleFetchBaoMoi} icon={<PlusOutlined />}>
              Thêm bài viết
            </Button>
          </div>
        </Form>
      )}

      {loaiNhap === 'manual' && (
        <Form form={form} layout="vertical" onFinish={handleSaveManual}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="tenBaiViet" label="Tiêu đề bài viết" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}>
                <Input placeholder="Nhập tiêu đề bài viết..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tag" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục!' }]}>
                <Select options={[
                  { value: 'suckhoe', label: 'Sức khỏe' },
                  { value: 'dinhduong', label: 'Dinh dưỡng' },
                  { value: 'tapluyen', label: 'Tập luyện' },
                ]} placeholder="Chọn danh mục" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="moTa" label="Mô tả ngắn">
            <Input placeholder="Mô tả tóm tắt bài viết..." />
          </Form.Item>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Hình ảnh đại diện:</label>
            <Radio.Group
              value={imageSource}
              onChange={e => { setImageSource(e.target.value); setImageFileList([]); }}
              style={{ marginBottom: 12 }}
            >
              <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
              <Radio.Button value="file">Tải lên từ máy</Radio.Button>
            </Radio.Group>
            {imageSource === 'url' ? (
              <Form.Item name="hinhAnhUrl" noStyle>
                <Input placeholder="https://example.com/hinh-anh.jpg" />
              </Form.Item>
            ) : (
              <div style={{ padding: '16px', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center' }}>
                <Upload
                  beforeUpload={() => false}
                  fileList={imageFileList}
                  onChange={({ fileList }) => setImageFileList(fileList.slice(-1))}
                  accept="image/*"
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />} type="dashed" size="large">Chọn file hình ảnh</Button>
                </Upload>
                {imageUploading && (
                  <Progress percent={imageUploadProgress} size="small" status="active" style={{ marginTop: 12 }} />
                )}
              </div>
            )}
          </div>
          <Form.Item name="noiDung" label="Nội dung bài viết">
            <TextArea rows={6} placeholder="Nhập nội dung bài viết..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleClose} disabled={loading}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
              Lưu bài viết
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
};

const BaiVietPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const [tuKhoa, setTuKhoa] = useState<TuKhoa>({
    TuKhoaUuTienCao: [],
    TuKhoaUuTienThap: [],
    TuKhoaLoaiBo: [],
  });

  const [loadingTuKhoa, setLoadingTuKhoa] = useState(false);
  const [savingTuKhoa, setSavingTuKhoa] = useState(false);
  const [danhSachBaiViet, setDanhSachBaiViet] = useState<BaiViet[]>([]);
  const [loadingBaiViet, setLoadingBaiViet] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingCrawler, setLoadingCrawler] = useState(false);
  const [loadingXoaChuaLuu, setLoadingXoaChuaLuu] = useState(false);
  const [themBaiVietVisible, setThemBaiVietVisible] = useState(false);

  const tongBaiViet = danhSachBaiViet.length;
  const baiDinhDuong = danhSachBaiViet.filter(b => b.tag === 'dinhduong').length;
  const baiSucKhoe = danhSachBaiViet.filter(b => b.tag === 'suckhoe').length;
  const baiTapLuyen = danhSachBaiViet.filter(b => b.tag === 'tapluyen').length;
  const baiLuuVinh = danhSachBaiViet.filter(b => b.trangThai === 1).length;

  const lanChayGanNhat = danhSachBaiViet.length > 0
    ? danhSachBaiViet.reduce((a, b) => (a.ngayDang > b.ngayDang ? a : b)).ngayDang
    : null;

  const loadTuKhoa = useCallback(async () => {
    setLoadingTuKhoa(true);
    try {
      const snap = await getDoc(doc(db, 'TuKhoa', 'config'));
      if (snap.exists()) {
        const data = snap.data() as any;
        setTuKhoa({
          TuKhoaUuTienCao: data.TuKhoaUuTienCao || [],
          TuKhoaUuTienThap: data.TuKhoaUuTienThap || [],
          TuKhoaLoaiBo: data.TuKhoaLoaiBo || [],
        });
      }
    } catch {
      message.error('Lỗi tải từ khóa!');
    } finally {
      setLoadingTuKhoa(false);
    }
  }, []);

  const saveTuKhoa = async (updated: TuKhoa) => {
    setSavingTuKhoa(true);
    try {
      await setDoc(doc(db, 'TuKhoa', 'config'), updated, { merge: true });
      message.success('Đã lưu từ khóa!');
    } catch {
      message.error('Lỗi lưu từ khóa!');
    } finally {
      setSavingTuKhoa(false);
    }
  };

  const handleAddKeyword = (field: keyof TuKhoa) => async (keyword: string) => {
    const updated = { ...tuKhoa, [field]: [...tuKhoa[field], keyword] };
    setTuKhoa(updated);
    await saveTuKhoa(updated);
  };

  const handleRemoveKeyword = (field: keyof TuKhoa) => async (keyword: string) => {
    const updated = { ...tuKhoa, [field]: tuKhoa[field].filter(k => k !== keyword) };
    setTuKhoa(updated);
    await saveTuKhoa(updated);
  };

  const loadBaiViet = useCallback(async () => {
    setLoadingBaiViet(true);
    try {
      const snap = await getDocs(collection(db, 'BaiViet'));
      const list: BaiViet[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          tenBaiViet: data.tenBaiViet || '(Không có tiêu đề)',
          moTa: data.moTa || '',
          hinhAnhDaiDien: data.hinhAnh || data.hinhAnhDaiDien || '',
          ngayDang: data.ngayDang || '',
          tag: data.tag || '',
          linkBaiViet: data.duongDan || data.linkBaiViet || '',
          linkLogo: data.sourceLogo || data.linkLogo || '',
          noiDung: data.noiDung || '',
          nguon: data.nguon || '',
          trangThai: data.trangThai ?? 0,
        };
      });
      list.sort((a, b) => b.ngayDang.localeCompare(a.ngayDang));
      setDanhSachBaiViet(list);
    } catch (err) {
      console.error(err);
      message.error('Lỗi tải danh sách bài viết!');
    } finally {
      setLoadingBaiViet(false);
    }
  }, []);

  const handleToggleTrangThai = async (id: string, newTrangThai: number) => {
    await updateDoc(doc(db, 'BaiViet', id), { trangThai: newTrangThai });
    setDanhSachBaiViet(prev =>
      prev.map(b => b.id === id ? { ...b, trangThai: newTrangThai } : b)
    );
    actionRef.current?.reload();
  };

  const handleDeleteBaiViet = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'BaiViet', id));
      message.success('Đã xóa bài viết!');
      actionRef.current?.reload();
    } catch {
      message.error('Lỗi xóa bài viết!');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunCrawler = () => {
    Modal.confirm({
      title: 'Chạy trigger đồng bộ bài viết',
      icon: <ExclamationCircleOutlined />,
      content: 'Quá trình có thể mất vài phút.',
      okText: 'Chạy ngay',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingCrawler(true);
        const startTime = Date.now();
        try {
          const res = await fetch(TRIGGER_CAP_NHAT_BAI_VIET_URL, { method: 'GET' });
          const data = await res.json();
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          message.success(`Hoàn tất! Thêm ${data.count || 0} bài viết trong ${elapsed}s`);
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(`Lỗi chạy crawler: ${e.message}`);
        } finally {
          setLoadingCrawler(false);
        }
      },
    });
  };

  // ── MỚI: Xóa tất cả bài viết chưa lưu (trangThai !== 1) ──
  const handleXoaBaiVietChuaLuu = () => {
    const soBaiChuaLuu = danhSachBaiViet.filter(b => b.trangThai !== 1).length;
    Modal.confirm({
      title: 'Xóa tất cả bài viết chưa lưu',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>Hành động này sẽ xóa <Text strong style={{ color: '#ff4d4f' }}>{soBaiChuaLuu} bài viết</Text> chưa được đánh dấu lưu vĩnh viễn.</p>
          <p style={{ color: '#8c8c8c', fontSize: 13 }}>
            Các bài viết được đánh dấu ⭐ sẽ <Text strong>không bị xóa</Text>.
          </p>
        </div>
      ),
      okText: 'Xóa ngay',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingXoaChuaLuu(true);
        try {
          const res = await fetch(TRIGGER_XOA_BAI_VIET_CHUA_LUU_URL, { method: 'GET' });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.reason || 'Lỗi không xác định');
          message.success(data.message || `Đã xóa các bài viết chưa lưu!`);
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(`Lỗi: ${e.message}`);
        } finally {
          setLoadingXoaChuaLuu(false);
        }
      },
    });
  };

  useEffect(() => {
    loadTuKhoa();
    loadBaiViet();
  }, [loadTuKhoa, loadBaiViet]);

  const danhSachRef = useRef<BaiViet[]>([]);
  useEffect(() => { danhSachRef.current = danhSachBaiViet; }, [danhSachBaiViet]);

  const fetchBaiViet = async (params: any, sort: any) => {
    try {
      const snap = await getDocs(collection(db, 'BaiViet'));
      let data: BaiViet[] = snap.docs.map(d => {
        const raw = d.data();
        return {
          id: d.id,
          tenBaiViet: raw.tenBaiViet || '(Không có tiêu đề)',
          moTa: raw.moTa || '',
          hinhAnhDaiDien: raw.hinhAnh || raw.hinhAnhDaiDien || '',
          ngayDang: raw.ngayDang || '',
          tag: raw.tag || '',
          linkBaiViet: raw.duongDan || raw.linkBaiViet || '',
          linkLogo: raw.sourceLogo || raw.linkLogo || '',
          noiDung: raw.noiDung || '',
          nguon: raw.nguon || '',
          trangThai: raw.trangThai ?? 0,
        };
      });

      setDanhSachBaiViet(data);

      if (params?.tenBaiViet) {
        data = data.filter(i => i.tenBaiViet.toLowerCase().includes(params.tenBaiViet.toLowerCase()));
      }
      if (params?.tag) {
        data = data.filter(i => i.tag === params.tag);
      }
      if (params?.ngayDang) {
        data = data.filter(i => {
          if (!i.ngayDang) return false;
          return i.ngayDang.substring(0, 10) === params.ngayDang;
        });
      }
      if (params?.trangThai !== undefined && params.trangThai !== '') {
        data = data.filter(i => i.trangThai === parseInt(params.trangThai));
      }

      if (sort?.ngayDang) {
        data.sort((a, b) =>
          sort.ngayDang === 'ascend'
            ? a.ngayDang.localeCompare(b.ngayDang)
            : b.ngayDang.localeCompare(a.ngayDang)
        );
      } else {
        data.sort((a, b) => b.ngayDang.localeCompare(a.ngayDang));
      }

      return { data, success: true, total: data.length };
    } catch (err) {
      console.error(err);
      message.error('Lỗi tải danh sách bài viết!');
      return { data: [], success: false, total: 0 };
    }
  };

  const columns: ProColumns<BaiViet>[] = [
    { title: '', dataIndex: 'trangThai', search: false, width: 40,
      render: (_, record) => (
        <StarButton baiViet={record} onToggle={handleToggleTrangThai} />
      ),
    },
    { title: 'Tiêu đề', dataIndex: 'tenBaiViet', ellipsis: true,
      render: (_, record) => (
        <Space>
          {record.hinhAnhDaiDien ? (
            <Avatar src={record.hinhAnhDaiDien} shape="square" size={40} />
          ) : (
            <Avatar shape="square" size={40} icon={<FileTextOutlined />} />
          )}
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 13 }}>
              {record.linkBaiViet ? (
                <a href={record.linkBaiViet} target="_blank" rel="noreferrer">
                  {record.tenBaiViet}
                </a>
              ) : (
                record.tenBaiViet
              )}
            </Text>
            {record.trangThai === 1 && (
              <Text style={{ fontSize: 11, color: '#faad14' }}>
                ⭐ Lưu vĩnh viễn
              </Text>
            )}
            {record.trangThai !== 1 && (
              <Text style={{ fontSize: 11, color: '#8c8c8c' }}>
                🗑️ Tự xóa sau 7 ngày
              </Text>
            )}
          </Space>
        </Space>
      ),
    },
    { title: 'Tag', dataIndex: 'tag', width: 130, valueType: 'select',
      valueEnum: {
        dinhduong: { text: 'Dinh dưỡng' },
        suckhoe: { text: 'Sức khỏe' },
        tapluyen: { text: 'Tập luyện' },
      },
      render: (_, record) => {
        const colorMap: Record<string, string> = { dinhduong: 'orange', suckhoe: 'blue', tapluyen: 'green' };
        const labelMap: Record<string, string> = { dinhduong: 'Dinh dưỡng', suckhoe: 'Sức khỏe', tapluyen: 'Tập luyện' };
        return (
          <Tag color={colorMap[record.tag] || 'default'} style={{ borderRadius: 12 }}>
            {labelMap[record.tag] || record.tag}
          </Tag>
        );
      },
    },
    { title: 'Ngày đăng', dataIndex: 'ngayDang', valueType: 'date', sorter: true, defaultSortOrder: 'descend', width: 170,
      fieldProps: {
        placeholder: 'Chọn ngày',
        format: 'DD/MM/YYYY',
        style: { width: '100%' },
      },
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(record.ngayDang)}</Text>
      ),
    },
    { title: 'Nguồn', dataIndex: 'linkLogo', search: false, width: 130,
      render: (_, record) => (
        <SourceDisplay linkLogo={record.linkLogo} source={record.linkBaiViet} nguon={record.nguon} />
      ),
    },
    { title: 'Trạng thái', dataIndex: 'trangThai', valueType: 'select', hideInTable: true,
      valueEnum: {
        1: { text: '⭐ Lưu vĩnh viễn', status: 'success' },
        0: { text: '🗑️ Tự xóa sau 7 ngày', status: 'default' },
      },
    },
    { title: 'Tùy chọn', valueType: 'option', width: 80,
      render: (_, record) => [
        <Popconfirm
          key="del"
          title="Xác nhận xóa bài viết này?"
          okText="Xóa"
          cancelText="Hủy"
          onConfirm={() => handleDeleteBaiViet(record.id)}
        >
          <Button size="small" danger loading={deletingId === record.id}> Xóa </Button>
        </Popconfirm>,
      ],
    },
  ];

  const keywordTabItems = [
    {
      key: 'cao',
      label: (
        <Space>
          <FireOutlined style={{ color: '#f5222d' }} />
          Ưu tiên cao
          <Badge count={tuKhoa.TuKhoaUuTienCao.length} style={{ backgroundColor: '#f5222d' }} />
        </Space>
      ),
      children: (
        <KeywordEditor
          keywords={tuKhoa.TuKhoaUuTienCao}
          color="red"
          onAdd={handleAddKeyword('TuKhoaUuTienCao')}
          onRemove={handleRemoveKeyword('TuKhoaUuTienCao')}
          loading={savingTuKhoa}
        />
      ),
    },
    {
      key: 'thap',
      label: (
        <Space>
          <CheckCircleOutlined style={{ color: '#1677ff' }} />
          Ưu tiên thấp
          <Badge count={tuKhoa.TuKhoaUuTienThap.length} style={{ backgroundColor: '#1677ff' }} />
        </Space>
      ),
      children: (
        <KeywordEditor
          keywords={tuKhoa.TuKhoaUuTienThap}
          color="blue"
          onAdd={handleAddKeyword('TuKhoaUuTienThap')}
          onRemove={handleRemoveKeyword('TuKhoaUuTienThap')}
          loading={savingTuKhoa}
        />
      ),
    },
    {
      key: 'loaibo',
      label: (
        <Space>
          <CloseCircleOutlined style={{ color: '#faad14' }} />
          Loại bỏ
          <Badge count={tuKhoa.TuKhoaLoaiBo.length} style={{ backgroundColor: '#faad14' }} />
        </Space>
      ),
      children: (
        <KeywordEditor
          keywords={tuKhoa.TuKhoaLoaiBo}
          color="orange"
          onAdd={handleAddKeyword('TuKhoaLoaiBo')}
          onRemove={handleRemoveKeyword('TuKhoaLoaiBo')}
          loading={savingTuKhoa}
        />
      ),
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <Card title="QUẢN LÝ BÀI VIẾT" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '24px' }}>
          {/* Thống kê */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={5}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic
                  title="Tổng bài viết"
                  value={tongBaiViet}
                  prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
                  valueStyle={{ color: '#1677ff', fontWeight: 700 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Dinh dưỡng" value={baiDinhDuong} valueStyle={{ color: '#fa8c16', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Sức khỏe" value={baiSucKhoe} valueStyle={{ color: '#0958d9', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Tập luyện" value={baiTapLuyen} valueStyle={{ color: '#389e0d', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={7}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  background: baiLuuVinh > 0 ? '#fffbe6' : undefined,
                  border: baiLuuVinh > 0 ? '1px solid #ffe58f' : undefined,
                }}
              >
                <Statistic
                  title={
                    <Space>
                      <StarFilled style={{ color: '#faad14' }} />
                      <span>Lưu vĩnh viễn</span>
                    </Space>
                  }
                  value={baiLuuVinh}
                  suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {tongBaiViet}</Text>}
                  valueStyle={{ color: '#d48806', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card
                bordered={false}
                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                title={<Space><ThunderboltOutlined style={{ color: '#faad14' }} /> Cập nhật bài viết</Space>}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={14}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Trạng thái Crawler</Text>
                    <div style={{ marginTop: 4 }}>
                      <Badge status="processing" text={<Text strong style={{ color: '#52c41a' }}>Đang hoạt động</Text>} />
                    </div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Lần chạy gần nhất</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space>
                        <CalendarOutlined style={{ color: '#8c8c8c' }} />
                        <Text strong>{lanChayGanNhat ? formatDate(lanChayGanNhat) : '—'}</Text>
                      </Space>
                    </div>
                  </div>
                  {/* Nút cập nhật bài viết mới */}
                  <Button
                    type="primary"
                    icon={loadingCrawler ? <SyncOutlined spin /> : <PlayCircleOutlined />}
                    loading={loadingCrawler}
                    onClick={handleRunCrawler}
                    block
                  >
                    {loadingCrawler ? 'Đang chạy...' : 'Cập nhật bài viết mới'}
                  </Button>
                  {/* ── MỚI: Nút xóa bài viết chưa lưu ── */}
                  <Tooltip title="Xóa tất cả bài viết chưa được đánh dấu ⭐ lưu vĩnh viễn">
                    <Button
                      danger
                      icon={loadingXoaChuaLuu ? <SyncOutlined spin /> : <DeleteOutlined />}
                      loading={loadingXoaChuaLuu}
                      onClick={handleXoaBaiVietChuaLuu}
                      block
                    >
                      {loadingXoaChuaLuu ? 'Đang xóa...' : `Xóa bài chưa lưu (${danhSachBaiViet.filter(b => b.trangThai !== 1).length})`}
                    </Button>
                  </Tooltip>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card
                bordered={false}
                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                title={<Space><TagsOutlined style={{ color: '#722ed1' }} /> Quản lý từ khóa</Space>}
              >
                <Tabs defaultActiveKey="cao" items={keywordTabItems} size="small" />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Bảng danh sách */}
        <div style={{ padding: '0 24px 24px' }}>
          <div
            style={{
              padding: '16px 24px',
              background: '#fff',
              border: '1px solid #f0f0f0',
              borderRadius: '8px 8px 0 0',
              borderBottom: 'none',
            }}
          >
            <Text strong style={{ fontSize: '16px' }}>TÌM KIẾM BÀI VIẾT</Text>
            <Divider style={{ margin: '12px 0 0' }} />
          </div>

          <ProTable<BaiViet>
            actionRef={actionRef}
            headerTitle="DANH SÁCH BÀI VIẾT"
            rowKey="id"
            columns={columns}
            request={fetchBaiViet}
            search={{
              layout: 'vertical',
              defaultCollapsed: false,
              searchText: 'Tìm kiếm',
              resetText: 'Đặt lại',
              labelWidth: 'auto',
              span: 4,
            }}
            form={{
              style: {
                background: '#ffffff',
                padding: '0 24px 24px',
                borderRadius: '0 0 8px 8px',
                border: '1px solid #f0f0f0',
                borderTop: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              },
            }}
            rowClassName={(record) =>
              record.trangThai === 1 ? 'row-pinned' : ''
            }
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bài` }}
            toolBarRender={() => [
              <Button
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setThemBaiVietVisible(true)}
              >
                Thêm bài viết
              </Button>,
            ]}
            scroll={{ x: 900 }}
          />
        </div>
      </Card>

      <style>{`
        .ant-table-row.row-pinned > td {
          background: #fffbe6 !important;
        }
        .ant-table-row.row-pinned:hover > td {
          background: #fff7cc !important;
        }
      `}</style>

      <ThemBaiVietModal
        open={themBaiVietVisible}
        onClose={() => setThemBaiVietVisible(false)}
        onSuccess={() => { actionRef.current?.reload(); }}
      />
    </ConfigProvider>
  );
};

export default BaiVietPage;