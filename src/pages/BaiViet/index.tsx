import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Tag, Button, Tabs, Input, Space, Popconfirm, message, Badge, Typography, Spin, Tooltip, ConfigProvider, Avatar, Modal, Divider } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { FileTextOutlined, TagsOutlined, ThunderboltOutlined, ReloadOutlined, PlusOutlined, FireOutlined, CloseCircleOutlined, CheckCircleOutlined, CalendarOutlined, PlayCircleOutlined, SyncOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';

const { Text } = Typography;

const CRAWLER_URL = 'https://us-central1-gymhome-4953.cloudfunctions.net/manualCrawl';

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
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
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
        <Input
          placeholder="Nhập từ khóa mới..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onPressEnter={handleAdd}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Thêm
        </Button>
      </Space.Compact>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 60 }}>
        {keywords.length === 0 && (
          <Text type="secondary" style={{ fontSize: 13 }}>Chưa có từ khóa nào.</Text>
        )}
        {keywords.map(keyword => (
          <Tag
            key={keyword}
            color={color}
            closable
            onClose={() => onRemove(keyword)}
            style={{ fontSize: 13, padding: '4px 10px', borderRadius: 20 }}
          >
            {keyword}
          </Tag>
        ))}
      </div>
    </Spin>
  );
};

// Hiển thị logo nguồn
const SourceDisplay: React.FC<{ linkLogo?: string; source?: string }> = ({ linkLogo, source }) => {
  const [imgError, setImgError] = useState(false);

  if (linkLogo && !imgError) {
    return (
      <img
        src={linkLogo}
        alt={source || 'logo'}
        onError={() => setImgError(true)}
        style={{
          height: 18,
          maxWidth: 90,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    );
  }

  return (
    <Text style={{ fontSize: 12, color: '#1976D2', fontStyle: 'italic' }}>
      {source || 'Báo Mới'}
    </Text>
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
  const [ketQuaCrawler, setKetQuaCrawler] = useState<{ count: number; time: string } | null>(null);

  // Thống kê
  const tongBaiViet = danhSachBaiViet.length;
  const baiDinhDuong = danhSachBaiViet.filter(b => b.tag === 'dinhduong').length;
  const baiSucKhoe = danhSachBaiViet.filter(b => b.tag === 'suckhoe').length;
  const baiTapLuyen = danhSachBaiViet.filter(b => b.tag === 'tapluyen').length;

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
        };
      });

      // Sắp xếp mới nhất lên trên
      list.sort((a, b) => b.ngayDang.localeCompare(a.ngayDang));
      setDanhSachBaiViet(list);
    } catch (err) {
      console.error(err);
      message.error('Lỗi tải danh sách bài viết!');
    } finally {
      setLoadingBaiViet(false);
    }
  }, []);

  const handleDeleteBaiViet = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'BaiViet', id));
      setDanhSachBaiViet(prev => prev.filter(b => b.id !== id));
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
      title: 'Chạy crawler thủ công?',
      icon: <ExclamationCircleOutlined />,
      content: 'Quá trình có thể mất vài phút.',
      okText: 'Chạy ngay',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingCrawler(true);
        setKetQuaCrawler(null);
        const startTime = Date.now();

        try {
          const res = await fetch(CRAWLER_URL, { method: 'GET' });
          const data = await res.json();
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          message.success(`Hoàn tất! Thêm ${data.count || 0} bài viết trong ${elapsed}s`);
          await loadBaiViet();
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(`Lỗi chạy crawler: ${e.message}`);
        } finally {
          setLoadingCrawler(false);
        }
      },
    });
  };

  useEffect(() => {
    loadTuKhoa();
    loadBaiViet();
  }, [loadTuKhoa, loadBaiViet]);

  const fetchBaiViet = async (params: any, sort: any) => {
    let data = [...danhSachBaiViet];

    if (params?.tenBaiViet) {
      data = data.filter(i => i.tenBaiViet.toLowerCase().includes(params.tenBaiViet.toLowerCase()));
    }
    if (params?.tag) {
      data = data.filter(i => i.tag === params.tag);
    }

    if (sort?.ngayDang) {
      data.sort((a, b) =>
        sort.ngayDang === 'ascend'
          ? a.ngayDang.localeCompare(b.ngayDang)
          : b.ngayDang.localeCompare(a.ngayDang)
      );
    }

    const pageSize = params?.pageSize || 10;
    const current = params?.current || 1;
    const start = (current - 1) * pageSize;

    return {
      data: data.slice(start, start + pageSize),
      success: true,
      total: data.length,
    };
  };

  const columns: ProColumns<BaiViet>[] = [
    {
      title: 'Tiêu đề',
      dataIndex: 'tenBaiViet',
      ellipsis: true,
      render: (_, record) => (
        <Space>
          {record.hinhAnhDaiDien ? (
            <Avatar src={record.hinhAnhDaiDien} shape="square" size={40} />
          ) : (
            <Avatar shape="square" size={40} icon={<FileTextOutlined />} />
          )}
          <Text style={{ fontSize: 13 }}>
            {record.linkBaiViet ? (
              <a href={record.linkBaiViet} target="_blank" rel="noreferrer">
                {record.tenBaiViet}
              </a>
            ) : (
              record.tenBaiViet
            )}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Tag',
      dataIndex: 'tag',
      width: 130,
      valueType: 'select',
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
    {
      title: 'Ngày đăng',
      dataIndex: 'ngayDang',
      search: false,
      sorter: true,
      defaultSortOrder: 'descend',
      width: 170,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(record.ngayDang)}</Text>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'linkLogo',
      search: false,
      width: 130,
      render: (_, record) => <SourceDisplay linkLogo={record.linkLogo} source={record.linkBaiViet} />,
    },
    {
      title: 'Tùy chọn',
      valueType: 'option',
      width: 80,
      render: (_, record) => [
        <Popconfirm
          key="del"
          title="Xác nhận xóa bài viết này?"
          okText="Xóa"
          cancelText="Hủy"
          onConfirm={() => handleDeleteBaiViet(record.id)}
        >
          <Button size="small" danger loading={deletingId === record.id}>
            Xóa
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  const keywordTabItems = [
    {
      key: 'cao',
      label: <Space><FireOutlined style={{ color: '#f5222d' }} /> Ưu tiên cao <Badge count={tuKhoa.TuKhoaUuTienCao.length} style={{ backgroundColor: '#f5222d' }} /></Space>,
      children: <KeywordEditor keywords={tuKhoa.TuKhoaUuTienCao} color="red" onAdd={handleAddKeyword('TuKhoaUuTienCao')} onRemove={handleRemoveKeyword('TuKhoaUuTienCao')} loading={savingTuKhoa} />
    },
    {
      key: 'thap',
      label: <Space><CheckCircleOutlined style={{ color: '#1677ff' }} /> Ưu tiên thấp <Badge count={tuKhoa.TuKhoaUuTienThap.length} style={{ backgroundColor: '#1677ff' }} /></Space>,
      children: <KeywordEditor keywords={tuKhoa.TuKhoaUuTienThap} color="blue" onAdd={handleAddKeyword('TuKhoaUuTienThap')} onRemove={handleRemoveKeyword('TuKhoaUuTienThap')} loading={savingTuKhoa} />
    },
    {
      key: 'loaibo',
      label: <Space><CloseCircleOutlined style={{ color: '#faad14' }} /> Loại bỏ <Badge count={tuKhoa.TuKhoaLoaiBo.length} style={{ backgroundColor: '#faad14' }} /></Space>,
      children: <KeywordEditor keywords={tuKhoa.TuKhoaLoaiBo} color="orange" onAdd={handleAddKeyword('TuKhoaLoaiBo')} onRemove={handleRemoveKeyword('TuKhoaLoaiBo')} loading={savingTuKhoa} />
    },
  ];

  return (
    <ConfigProvider locale={viVN}>
      <Card title="QUẢN LÝ BÀI VIẾT" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
        {/* Phần thống kê và quản lý */}
        <div style={{ padding: '24px' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Tổng bài viết" value={tongBaiViet} prefix={<FileTextOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Dinh dưỡng" value={baiDinhDuong} valueStyle={{ color: '#fa8c16', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Sức khỏe" value={baiSucKhoe} valueStyle={{ color: '#0958d9', fontWeight: 700 }} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Statistic title="Tập luyện" value={baiTapLuyen} valueStyle={{ color: '#389e0d', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }} title={<Space><ThunderboltOutlined style={{ color: '#faad14' }} /> Trạng thái Crawler</Space>}>
                <Space direction="vertical" style={{ width: '100%' }} size={14}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Trạng thái</Text>
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
                  <Button 
                    type="primary" 
                    icon={loadingCrawler ? <SyncOutlined spin /> : <PlayCircleOutlined />} 
                    loading={loadingCrawler} 
                    onClick={handleRunCrawler} 
                    block
                  >
                    {loadingCrawler ? 'Đang chạy...' : 'Chạy crawler ngay'}
                  </Button>
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={16}>
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} title={<Space><TagsOutlined style={{ color: '#722ed1' }} /> Quản lý từ khóa</Space>}>
                <Tabs defaultActiveKey="cao" items={keywordTabItems} size="small" />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Bảng danh sách bài viết */}
        <div style={{ padding: '0 24px 24px' }}>
          <ProTable<BaiViet>
            actionRef={actionRef}
            headerTitle="DANH SÁCH BÀI VIẾT"
            rowKey="id"
            columns={columns}
            request={fetchBaiViet}
            params={{ _snapshot: danhSachBaiViet.length }}
            search={{ layout: 'vertical', defaultCollapsed: false }}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng ${t} bài` }}
            toolBarRender={() => [
              <Button key="reload" icon={<ReloadOutlined />} onClick={() => { loadBaiViet(); actionRef.current?.reload(); }} loading={loadingBaiViet}>
                Tải lại
              </Button>,
            ]}
            scroll={{ x: 900 }}
          />
        </div>
      </Card>
    </ConfigProvider>
  );
};

export default BaiVietPage;