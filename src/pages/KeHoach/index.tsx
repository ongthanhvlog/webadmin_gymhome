import React, { useRef, useState, useEffect } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Space, ConfigProvider, message, Card, Modal, Table, Form, Input, InputNumber, Popconfirm, Typography, Select, Divider, Upload, Radio, Progress } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch, query, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebaseConfig';
import { MenuOutlined, PlayCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLocation } from 'umi';

const { Text, Paragraph, Title } = Typography;
// component Hàng (Row) cho tính năng kéo thả
const Row = (props: any) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: props['data-row-key'],
    });
    const style: React.CSSProperties = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: 'move',
        zIndex: isDragging ? 9999 : undefined,
        background: isDragging ? '#fafafa' : undefined,
    };
    return <tr {...props} ref={setNodeRef} style={style} {...attributes} {...listeners} />;
};

interface BaiTapNho {
    id: string;
    TenBaiTapNho: string;
    MoTa: string;
    ThoiGian: number;
    SoThuTu: number;
    VideoHuongDan: string;
    VideoType?: 'url' | 'file';
    HinhAnh: string;                    
}

interface BaiTapLon {
    id: string;
    TenBaiTapLon: string;
    TongThoiGian: number;
    CapDo: string;
    MoTa: string;
    SoLuongBaiTapNho: number;
    HinhAnh: string;                    
}

interface Ngay {
    id: string;
    MoTa: string;
    HinhAnh: string;
    SoLuongBaiTapLon: number;
}

const generateCustomId = (prefix: string) => `${prefix}_${Math.floor(Math.random() * 900) + 100}`;

const KeHoachPage: React.FC = () => {
    const location = useLocation();
    const isNguoiMoi = location.pathname.includes('NguoiMoiBatDau');

    const modeTitle = isNguoiMoi
        ? 'QUẢN LÝ LỘ TRÌNH 30 NGÀY - Cho Người Mới Bắt Đầu'
        : 'QUẢN LÝ LỘ TRÌNH 30 NGÀY - NÂNG CAO';

    const pathPrefix = isNguoiMoi ? 'NguoiMoiBatDau' : 'NangCao';
    const storageFolder = isNguoiMoi ? 'nguoi_moi' : 'nang_cao';

    const actionRef = useRef<ActionType>(null);
    const [formLon] = Form.useForm();
    const [formNho] = Form.useForm();
    const [formNgay] = Form.useForm();

    const [ngayDangChon, setNgayDangChon] = useState<number>(1);
    const [lonModalVisible, setLonModalVisible] = useState(false);
    const [editingLon, setEditingLon] = useState<BaiTapLon | null>(null);
    const [dsBaiTapNho, setDsBaiTapNho] = useState<BaiTapNho[]>([]);
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentLon, setCurrentLon] = useState<BaiTapLon | null>(null);
    const [nhoModalVisible, setNhoModalVisible] = useState(false);
    const [editingNho, setEditingNho] = useState<BaiTapNho | null>(null);

    const [videoSource, setVideoSource] = useState<'url' | 'file'>('url');
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const [ngayInfo, setNgayInfo] = useState<Ngay | null>(null);
    const [ngayModalVisible, setNgayModalVisible] = useState(false);
    const [imageSource, setImageSource] = useState<'url' | 'file'>('url');
    const [imageFileList, setImageFileList] = useState<any[]>([]);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadProgress, setImageUploadProgress] = useState<number>(0);

    const [imageSourceLon, setImageSourceLon] = useState<'url' | 'file'>('url');
    const [imageFileListLon, setImageFileListLon] = useState<any[]>([]);
    const [imageUploadingLon, setImageUploadingLon] = useState(false);
    const [imageUploadProgressLon, setImageUploadProgressLon] = useState<number>(0);

    const [imageSourceNho, setImageSourceNho] = useState<'url' | 'file'>('url');
    const [imageFileListNho, setImageFileListNho] = useState<any[]>([]);

    const getDayPath = () => `KeHoach/${pathPrefix}/Ngay/ngay_${ngayDangChon}/DanhSachBaiTapLon`;

    const fetchNgayInfo = async () => {
        try {
            const dayRef = doc(db, `KeHoach/${pathPrefix}/Ngay/ngay_${ngayDangChon}`);
            const snap = await getDoc(dayRef);

            if (snap.exists()) {
                const data = snap.data() as any;
                setNgayInfo({
                    id: `ngay_${ngayDangChon}`,
                    MoTa: data.MoTa || '',
                    HinhAnh: data.HinhAnh || '',
                    SoLuongBaiTapLon: data.SoLuongBaiTapLon || 0,
                });
            } else {
                setNgayInfo({
                    id: `ngay_${ngayDangChon}`,
                    MoTa: '',
                    HinhAnh: '',
                    SoLuongBaiTapLon: 0,
                });
            }
            await updateSoLuongBaiTapLon();
        } catch (e) {
            console.error(e);
            message.error('Lỗi tải thông tin ngày');
        }
    };

    const updateSoLuongBaiTapLon = async () => {
        try {
            const dayDocRef = doc(db, `KeHoach/${pathPrefix}/Ngay/ngay_${ngayDangChon}`);
            const snapshot = await getDocs(collection(db, getDayPath()));
            const count = snapshot.size;
            await setDoc(dayDocRef, { SoLuongBaiTapLon: count }, { merge: true });
            setNgayInfo((prev) => (prev ? { ...prev, SoLuongBaiTapLon: count } : null));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchNgayInfo();
        actionRef.current?.reload();
    }, [ngayDangChon]);

    useEffect(() => {
        const totalTime = dsBaiTapNho.reduce((sum, item) => sum + (Number(item.ThoiGian) || 0), 0);
        formLon.setFieldsValue({
            TongThoiGian: totalTime,
            SoLuongBaiTapNho: dsBaiTapNho.length
        });
    }, [dsBaiTapNho, formLon]);

    const handlePreviewVideo = (url: string) => {
        if (!url) {
            message.warning('Không có link video');
            return;
        }
        const getYouTubeID = (link: string) => {
            const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(\/shorts\/))([^#\&\?]*).*/;
            const match = link.match(regExp);
            return (match && match[8].length === 11) ? match[8] : null;
        };
        const videoId = getYouTubeID(url);
        Modal.info({
            title: 'Video hướng dẫn tập luyện',
            width: 800,
            centered: true,
            maskClosable: true,
            content: (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    {videoId ? (
                        <iframe
                            width="100%"
                            height="450"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            title="YouTube video player"
                            frameBorder="0"
                            allowFullScreen
                        />
                    ) : (
                        <video width="100%" height="450" controls autoPlay>
                            <source src={url} type="video/mp4" />
                            Trình duyệt của bạn không hỗ trợ xem video trực tiếp.
                        </video>
                    )}
                </div>
            ),
            footer: null,
        });
    };

    const fetchBaiTapLon = async (params: any) => {
        try {
            const snapshot = await getDocs(collection(db, getDayPath()));
            let data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BaiTapLon));
            if (params?.TenBaiTapLon) {
                data = data.filter(i => i.TenBaiTapLon.toLowerCase().includes(params.TenBaiTapLon.toLowerCase()));
            }
            if (params?.CapDo) {
                data = data.filter(i => i.CapDo === params.CapDo);
            }
            if (params?.SoLuongBaiTapNho !== undefined) {
                data = data.filter(i => i.SoLuongBaiTapNho === Number(params.SoLuongBaiTapNho));
            }
            if (params?.TongThoiGian !== undefined) {
                data = data.filter(i => i.TongThoiGian === Number(params.TongThoiGian));
            }
            return { data, success: true, total: data.length };
        } catch (e) {
            return { data: [], success: false, total: 0 };
        }
    };

    const loadBaiTapNho = async (lonId: string) => {
        try {
            const q = query(collection(db, `${getDayPath()}/${lonId}/DanhSachBaiTapNho`), orderBy('SoThuTu', 'asc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BaiTapNho));
            setDsBaiTapNho(data);
        } catch (e) {
            setDsBaiTapNho([]);
        }
    };

    const handleSaveLon = async (values: any) => {
        setImageUploadingLon(true);
        setImageUploadProgressLon(0);
        try {
            let hinhAnhUrl = editingLon?.HinhAnh || '';

            if (imageSourceLon === 'url') {
                hinhAnhUrl = values.HinhAnh || hinhAnhUrl;
            } else if (imageSourceLon === 'file' && imageFileListLon.length > 0 && imageFileListLon[0].originFileObj) {
                const file = imageFileListLon[0].originFileObj;
                const storageRefPath = `hinhanh/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);

                hinhAnhUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setImageUploadProgressLon(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
                });
            }

            const btlId = editingLon?.id || generateCustomId('btl');
            const tongThoiGian = dsBaiTapNho.reduce((sum, item) => sum + (Number(item.ThoiGian) || 0), 0);

            const btlData = {
                ...values,
                HinhAnh: hinhAnhUrl,
                TongThoiGian: tongThoiGian,
                SoLuongBaiTapNho: dsBaiTapNho.length
            };

            if (editingLon) {
                await updateDoc(doc(db, getDayPath(), btlId), btlData);
            } else {
                await setDoc(doc(db, getDayPath(), btlId), btlData);
                if (dsBaiTapNho.length > 0) {
                    const batch = writeBatch(db);
                    dsBaiTapNho.forEach(item => {
                        const btnRef = doc(db, `${getDayPath()}/${btlId}/DanhSachBaiTapNho`, item.id);
                        batch.set(btnRef, item);
                    });
                    await batch.commit();
                }
            }

            await updateSoLuongBaiTapLon();
            message.success('Đã lưu bài tập lớn thành công');
            setLonModalVisible(false);
            actionRef.current?.reload();
        } catch (e) {
            message.error('Lỗi khi lưu dữ liệu');
        } finally {
            setImageUploadingLon(false);
            setImageUploadProgressLon(0);
        }
    };

    const handleSaveNho = async (values: any) => {
        setUploading(true);
        setUploadProgress(0);
        try {
            let videoUrl = values.VideoHuongDan || '';
            if (videoSource === 'file' && fileList.length > 0 && fileList[0].originFileObj) {
                const file = fileList[0].originFileObj;
                const storageRefPath = `videos/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);
                videoUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                    }, (error) => reject(error), async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    });
                });
            } else if (videoSource === 'file' && editingNho?.VideoType === 'file') {
                videoUrl = editingNho.VideoHuongDan;
            }

            let hinhAnhUrl = editingNho?.HinhAnh || '';
            if (imageSourceNho === 'url') {
                hinhAnhUrl = values.HinhAnh || hinhAnhUrl;
            } else if (imageSourceNho === 'file' && imageFileListNho.length > 0 && imageFileListNho[0].originFileObj) {
                const file = imageFileListNho[0].originFileObj;
                const storageRefPath = `hinhanh/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);
                hinhAnhUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                    }, (error) => reject(error), async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    });
                });
            }

            const finalNhoData: BaiTapNho = {
                ...values,
                VideoHuongDan: videoUrl,
                VideoType: videoSource,
                HinhAnh: hinhAnhUrl,
                id: editingNho?.id || generateCustomId('btn'),
                SoThuTu: editingNho?.SoThuTu || (dsBaiTapNho.length + 1)
            };

            let newList = [...dsBaiTapNho];
            if (editingNho) {
                newList = newList.map(i => i.id === editingNho.id ? finalNhoData : i);
                if (editingLon) {
                    await setDoc(doc(db, `${getDayPath()}/${editingLon.id}/DanhSachBaiTapNho`, editingNho.id), finalNhoData);
                }
            } else {
                newList.push(finalNhoData);
                if (editingLon) {
                    await setDoc(doc(db, `${getDayPath()}/${editingLon.id}/DanhSachBaiTapNho`, finalNhoData.id), finalNhoData);
                }
            }

            setDsBaiTapNho(newList);
            setNhoModalVisible(false);
            setFileList([]);
            setImageFileListNho([]);
            message.success('Cập nhật bài tập nhỏ thành công');
        } catch (error) {
            message.error('Lỗi khi xử lý video hoặc hình ảnh');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const onDragEnd = async ({ active, over }: DragEndEvent) => {
        if (active.id !== over?.id) {
            const activeIndex = dsBaiTapNho.findIndex((i) => i.id === active.id);
            const overIndex = dsBaiTapNho.findIndex((i) => i.id === over?.id);
            const newList = arrayMove(dsBaiTapNho, activeIndex, overIndex).map((item, index) => ({ ...item, SoThuTu: index + 1 }));
            setDsBaiTapNho(newList);
            if (editingLon) {
                const batch = writeBatch(db);
                newList.forEach(item => {
                    batch.update(doc(db, `${getDayPath()}/${editingLon.id}/DanhSachBaiTapNho`, item.id), { SoThuTu: item.SoThuTu });
                });
                await batch.commit();
            }
        }
    };

    const handleEditNgay = () => {
        if (!ngayInfo) return;
        formNgay.setFieldsValue({
            MoTa: ngayInfo.MoTa,
            HinhAnh: ngayInfo.HinhAnh || '',
        });
        setImageSource('url');
        setImageFileList([]);
        setNgayModalVisible(true);
    };

    const handleSaveNgay = async (values: any) => {
        setImageUploading(true);
        setImageUploadProgress(0);
        try {
            let hinhAnhUrl = values.HinhAnh || ngayInfo?.HinhAnh || '';

            if (imageSource === 'file' && imageFileList.length > 0 && imageFileList[0].originFileObj) {
                const file = imageFileList[0].originFileObj;
                const storageRefPath = `hinhanh/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);

                hinhAnhUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setImageUploadProgress(progress);
                    }, (error) => reject(error), async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    });
                });
            }

            const dayRef = doc(db, `KeHoach/${pathPrefix}/Ngay/ngay_${ngayDangChon}`);
            await setDoc(dayRef, {
                MoTa: values.MoTa || '',
                HinhAnh: hinhAnhUrl,
                SoLuongBaiTapLon: ngayInfo?.SoLuongBaiTapLon || 0,
            }, { merge: true });

            setNgayInfo({
                id: `ngay_${ngayDangChon}`,
                MoTa: values.MoTa || '',
                HinhAnh: hinhAnhUrl,
                SoLuongBaiTapLon: ngayInfo?.SoLuongBaiTapLon || 0,
            });

            message.success('Đã cập nhật thông tin ngày thành công');
            setNgayModalVisible(false);
        } catch (e) {
            message.error('Lỗi khi lưu thông tin ngày');
        } finally {
            setImageUploading(false);
            setImageUploadProgress(0);
        }
    };

    const columns: ProColumns<BaiTapLon>[] = [
        { title: 'ID Bài tập', dataIndex: 'id', search: false },
        { title: 'Tên bài tập lớn', dataIndex: 'TenBaiTapLon' },
        { title: 'Cấp độ', dataIndex: 'CapDo', valueType: 'select', valueEnum: { 'Dễ': { text: 'Dễ' }, 'Khó': { text: 'Khó' } }},
        { title: 'Số lượng bài',dataIndex: 'SoLuongBaiTapNho', valueType: 'digit', sorter: (a, b) => a.SoLuongBaiTapNho - b.SoLuongBaiTapNho},
        { title: 'Tổng Thời Gian', dataIndex: 'TongThoiGian', valueType: 'digit', sorter: (a, b) => a.TongThoiGian - b.TongThoiGian},
        { title: 'Mô tả', dataIndex: 'MoTa', search: false,
            render: (_, record) => (
                <a onClick={() => {
                    setCurrentLon(record);
                    loadBaiTapNho(record.id);
                    setDetailVisible(true);
                }}>
                    Xem chi tiết
                </a>
            )
        },
        { title: 'Tùy chọn', valueType: 'option',
            render: (_, record) => [
                <Button
                    key="edit"
                    size="small"
                    style={{ borderRadius: '4px', borderColor: '#1890ff', color: '#1890ff' }}
                    onClick={() => {
                        setEditingLon(record);
                        loadBaiTapNho(record.id);
                        formLon.setFieldsValue(record);
                        setImageSourceLon('url');
                        setImageFileListLon([]);
                        if (record.HinhAnh) formLon.setFieldsValue({ HinhAnh: record.HinhAnh });

                        setLonModalVisible(true);
                    }}
                >Sửa
                </Button>,
                <Popconfirm
                    key="del"
                    title="Xác nhận xóa?"
                    onConfirm={async () => {
                        await deleteDoc(doc(db, getDayPath(), record.id));
                        await updateSoLuongBaiTapLon();
                        actionRef.current?.reload();
                    }}
                >
                    <Button size="small" style={{ borderRadius: '4px', borderColor: '#ff4d4f', color: '#ff4d4f' }}>Xóa</Button>
                </Popconfirm>
            ],
        },
    ];

    const columnsNho = (isEdit: boolean) => [
        ...(isEdit ? [{ title: '', dataIndex: 'sort', width: 40, render: () => <MenuOutlined style={{ color: '#999' }} /> }] : []),
        { title: 'STT', dataIndex: 'SoThuTu', width: 60 },
        { title: 'Tên bài', dataIndex: 'TenBaiTapNho', width: 200 },
        { title: 'Thời gian', dataIndex: 'ThoiGian', width: 100, render: (v: number) => `${v}s` },
        { title: 'Hình ảnh', dataIndex: 'HinhAnh', width: 90,
            render: (url: string) => url ? (
                <img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
            ) : <span style={{ color: '#999' }}>-</span>
        },
        { title: 'Hướng dẫn tập luyện', dataIndex: 'MoTa', width: 300, render: (text: string) => <Paragraph ellipsis={{ rows: 2 }}>{text || '-'}</Paragraph>},
        { title: 'Video', dataIndex: 'VideoHuongDan', width: 100,
            render: (url: string) => url
                ? <a onClick={() => handlePreviewVideo(url)}><PlayCircleOutlined /> Xem</a>
                : <span>-</span>
        },
        ...(isEdit ? [{
            title: 'Tùy chỉnh',
            width: 120,
            render: (_: any, r: BaiTapNho) => (
                <Space>
                    <Button
                        size="small"
                        style={{ borderRadius: '4px', borderColor: '#1890ff', color: '#1890ff' }}
                        onClick={() => {
                            setEditingNho(r);
                            setVideoSource(r.VideoType || 'url');
                            setImageSourceNho('url');
                            setImageFileListNho([]);
                            formNho.setFieldsValue(r);
                            setNhoModalVisible(true);
                        }}
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xóa bài tập nhỏ này?"
                        onConfirm={async () => {
                            const newList = dsBaiTapNho.filter(i => i.id !== r.id);
                            setDsBaiTapNho(newList);
                            if (editingLon) {
                                await deleteDoc(doc(db, `${getDayPath()}/${editingLon.id}/DanhSachBaiTapNho`, r.id));
                                const newTotal = newList.reduce((sum, item) => sum + (Number(item.ThoiGian) || 0), 0);
                                await updateDoc(doc(db, getDayPath(), editingLon.id), {
                                    TongThoiGian: newTotal,
                                    SoLuongBaiTapNho: newList.length
                                });
                            }
                        }}
                    >
                        <Button size="small" style={{ borderRadius: '4px', borderColor: '#ff4d4f', color: '#ff4d4f' }}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }] : [])
    ];

    return (
        <ConfigProvider locale={viVN}>
            <Card title={<Text strong style={{ fontSize: '18px' }}>{modeTitle}</Text>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    {[0, 10, 20].map(s => (
                        <div key={s} style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
                            {Array.from({ length: 10 }, (_, i) => s + i + 1).map(d => (
                                <Button
                                    key={d}
                                    type={ngayDangChon === d ? 'primary' : 'default'}
                                    onClick={() => setNgayDangChon(d)}
                                >
                                    Ngày {d}
                                </Button>
                            ))}
                        </div>
                    ))}
                </div>
                <Card
                    title={<Title level={5} style={{ margin: 0 }}>THÔNG TIN NGÀY {ngayDangChon}</Title>}
                    style={{ marginBottom: 24 }}
                    extra={
                        <Button type="primary" onClick={handleEditNgay}>
                            Chỉnh sửa thông tin ngày
                        </Button>
                    }
                >
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                        {ngayInfo?.HinhAnh ? (
                            <img
                                src={ngayInfo.HinhAnh}
                                alt="Hình ảnh ngày"
                                style={{
                                    width: 280,
                                    height: 200,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: 280,
                                height: 200,
                                background: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 8,
                                color: '#999',
                                border: '2px dashed #d9d9d9'
                            }}>
                                Chưa có hình ảnh
                            </div>
                        )}

                        <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>Mô tả:</Text>
                            <Paragraph style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {ngayInfo?.MoTa || 'Chưa có mô tả cho ngày này.'}
                            </Paragraph>
                            <Divider style={{ margin: '16px 0' }} />
                            <Space align="center">
                                <Text strong>Số lượng bài tập lớn:</Text>
                                <Text type="success" strong style={{ fontSize: 18 }}>
                                    {ngayInfo?.SoLuongBaiTapLon || 0}
                                </Text>
                            </Space>
                        </div>
                    </div>
                </Card>
                <div className="gymhome-table-container">
                    <div style={{ padding: '16px 24px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px 8px 0 0', borderBottom: 'none' }}>
                        <Text strong style={{ fontSize: '16px' }}>TÌM KIẾM DỮ LIỆU</Text>
                        <Divider style={{ margin: '12px 0 0' }} />
                    </div>
                    <ProTable<BaiTapLon>
                        actionRef={actionRef}
                        headerTitle={`DANH SÁCH BÀI TẬP LỚN - NGÀY ${ngayDangChon}`}
                        columns={columns}
                        request={fetchBaiTapLon}
                        rowKey="id"
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
                                marginBottom: '24px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }
                        }}
                        toolBarRender={() => [
                            <Button
                                key="add"
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingLon(null);
                                    setDsBaiTapNho([]);
                                    formLon.resetFields();
                                    setImageSourceLon('url');
                                    setImageFileListLon([]);
                                    setLonModalVisible(true);
                                }}
                            >
                                Thêm bài tập lớn mới
                            </Button>
                        ]}
                    />
                </div>
            </Card>

            <Modal
                title="Chi tiết bài tập lớn"
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={1100}
            >
                <div style={{ display: 'flex', gap: 24, marginBottom: 24, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 360 }}>
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>{currentLon?.TenBaiTapLon}</Text>

                        <div style={{ marginTop: 16, border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, backgroundColor: '#fafafa' }}>
                            <Text strong>Mô tả:</Text>
                            <Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {currentLon?.MoTa || 'Không có mô tả.'}
                            </Paragraph>
                        </div>
                    </div>

                    <div style={{ flex: 1, maxWidth: 560, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {currentLon?.HinhAnh ? (
                            <img
                                src={currentLon.HinhAnh}
                                alt="Hình ảnh bài tập lớn"
                                style={{
                                    width: '50%',
                                    height: 'auto',
                                    maxHeight: 720,
                                    objectFit: 'contain',
                                    borderRadius: 12,
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: 280,
                                border: '1px dashed #d9d9d9',
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                padding: 16
                            }}>
                                Chưa có hình ảnh
                            </div>
                        )}
                    </div>
                </div>

                <Divider orientation="left">Danh sách bài tập nhỏ</Divider>
                <Table
                    dataSource={dsBaiTapNho}
                    columns={columnsNho(false)}
                    rowKey="id"
                    pagination={false}
                    bordered
                    size="small"
                />
            </Modal>

            <Modal
                title={editingLon ? "Chỉnh sửa bài tập lớn" : "Tạo bài tập lớn mới"}
                open={lonModalVisible}
                onCancel={() => !imageUploadingLon && setLonModalVisible(false)}
                onOk={() => formLon.submit()}
                confirmLoading={imageUploadingLon}
                okText={imageUploadingLon ? "Đang tải lên..." : "Lưu dữ liệu"}
                width={1100}
            >
                <Form form={formLon} layout="vertical" onFinish={handleSaveLon}>
                    <Space style={{ display: 'flex' }} size="large" align="start">
                        <Form.Item name="TenBaiTapLon" label="Tên bài tập lớn" rules={[{ required: true }]} style={{ width: 400 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="CapDo" label="Cấp độ" rules={[{ required: true }]} style={{ width: 120 }}>
                            <Select options={[{ value: 'Dễ', label: 'Dễ' }, { value: 'Khó', label: 'Khó' }]} />
                        </Form.Item>
                        <Form.Item name="SoLuongBaiTapNho" label="Số lượng" style={{ width: 100 }}>
                            <InputNumber disabled style={{ width: '100%', fontWeight: 'bold' }} />
                        </Form.Item>
                        <Form.Item name="TongThoiGian" label="Tổng thời gian" style={{ width: 150 }}>
                            <InputNumber disabled style={{ width: '100%', fontWeight: 'bold' }} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="MoTa" label="Mô tả bài tập">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                            Hình ảnh đại diện cho bài tập lớn:
                        </label>
                        <Radio.Group
                            value={imageSourceLon}
                            onChange={(e) => setImageSourceLon(e.target.value)}
                            style={{ marginBottom: 12 }}
                        >
                            <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
                            <Radio.Button value="file">Tải lên từ máy</Radio.Button>
                        </Radio.Group>

                        {imageSourceLon === 'url' ? (
                            <Form.Item name="HinhAnh">
                                <Input placeholder="https://example.com/hinh-anh.jpg" />
                            </Form.Item>
                        ) : (
                            <div style={{ padding: '16px', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center' }}>
                                <Upload
                                    beforeUpload={() => false}
                                    fileList={imageFileListLon}
                                    onChange={({ fileList }) => setImageFileListLon(fileList.slice(-1))}
                                    accept="image/*"
                                    maxCount={1}
                                >
                                    <Button icon={<UploadOutlined />} type="dashed" size="large">
                                        Chọn file hình ảnh (JPG, PNG...)
                                    </Button>
                                </Upload>
                                {imageUploadingLon && (
                                    <div style={{ marginTop: 16 }}>
                                        <Progress percent={imageUploadProgressLon} size="small" status="active" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Form>

                <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Text strong>Danh sách bài tập nhỏ ({dsBaiTapNho.length})</Text>
                        <Button
                            size="small"
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setEditingNho(null);
                                setFileList([]);
                                setVideoSource('url');
                                setImageSourceNho('url');
                                setImageFileListNho([]);
                                formNho.resetFields();
                                setNhoModalVisible(true);
                            }}
                        >
                            Thêm bài tập nhỏ
                        </Button>
                    </div>

                    <DndContext
                        sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext items={dsBaiTapNho.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <Table
                                components={{ body: { row: Row } }}
                                rowKey="id"
                                columns={columnsNho(true)}
                                dataSource={dsBaiTapNho}
                                pagination={false}
                                size="small"
                                bordered
                            />
                        </SortableContext>
                    </DndContext>
                </div>
            </Modal>

            <Modal
                title={editingNho ? "Cập nhật bài tập nhỏ" : "Thêm bài tập nhỏ"}
                open={nhoModalVisible}
                onCancel={() => !uploading && setNhoModalVisible(false)}
                onOk={() => formNho.submit()}
                confirmLoading={uploading}
                destroyOnClose
                okText={uploading ? "Đang tải lên..." : "Xác nhận"}
                width={900}
            >
                <Form form={formNho} layout="vertical" onFinish={handleSaveNho}>
                    <Form.Item name="TenBaiTapNho" label="Tên bài tập" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="ThoiGian" label="Thời gian (giây)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>

                    {/* Video */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8 }}>Video hướng dẫn:</label>
                        <Radio.Group
                            value={videoSource}
                            onChange={(e) => setVideoSource(e.target.value)}
                            style={{ marginBottom: 12 }}
                        >
                            <Radio.Button value="url">Dán Link</Radio.Button>
                            <Radio.Button value="file">Tải lên file</Radio.Button>
                        </Radio.Group>
                        {videoSource === 'url' ? (
                            <Form.Item name="VideoHuongDan">
                                <Input placeholder="Link YouTube hoặc MP4" />
                            </Form.Item>
                        ) : (
                            <div style={{ padding: '10px', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                                <Upload
                                    beforeUpload={() => false}
                                    fileList={fileList}
                                    onChange={({ fileList }) => setFileList(fileList.slice(-1))}
                                    accept="video/*"
                                >
                                    <Button icon={<UploadOutlined />}>Chọn file video</Button>
                                </Upload>
                                {uploading && (
                                    <div style={{ marginTop: 10 }}>
                                        <Progress percent={uploadProgress} size="small" status="active" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Hình ảnh cho bài tập nhỏ:</label>
                        <Radio.Group
                            value={imageSourceNho}
                            onChange={(e) => setImageSourceNho(e.target.value)}
                            style={{ marginBottom: 12 }}
                        >
                            <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
                            <Radio.Button value="file">Tải lên file</Radio.Button>
                        </Radio.Group>

                        {imageSourceNho === 'url' ? (
                            <Form.Item name="HinhAnh">
                                <Input placeholder="https://example.com/hinh-anh.jpg" />
                            </Form.Item>
                        ) : (
                            <div style={{ padding: '10px', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                                <Upload
                                    beforeUpload={() => false}
                                    fileList={imageFileListNho}
                                    onChange={({ fileList }) => setImageFileListNho(fileList.slice(-1))}
                                    accept="image/*"
                                    maxCount={1}
                                >
                                    <Button icon={<UploadOutlined />}>Chọn file hình ảnh</Button>
                                </Upload>
                            </div>
                        )}
                    </div>

                    <Form.Item name="MoTa" label="Mô tả cách tập luyện">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Chỉnh sửa thông tin ngày ${ngayDangChon}`}
                open={ngayModalVisible}
                onCancel={() => !imageUploading && setNgayModalVisible(false)}
                onOk={() => formNgay.submit()}
                confirmLoading={imageUploading}
                okText={imageUploading ? "Đang tải lên..." : "Lưu"}
                width={700}
            >
                <Form form={formNgay} layout="vertical" onFinish={handleSaveNgay}>
                    <Form.Item name="MoTa" label="Mô tả ngày">
                        <Input.TextArea rows={4} placeholder="Nhập mô tả cho ngày này..." />
                    </Form.Item>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Hình ảnh đại diện cho ngày:</label>
                        <Radio.Group
                            value={imageSource}
                            onChange={(e) => setImageSource(e.target.value)}
                            style={{ marginBottom: 12 }}
                        >
                            <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
                            <Radio.Button value="file">Tải lên từ máy</Radio.Button>
                        </Radio.Group>

                        {imageSource === 'url' ? (
                            <Form.Item name="HinhAnh">
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
                                    <Button icon={<UploadOutlined />} type="dashed" size="large">
                                        Chọn file hình ảnh (JPG, PNG...)
                                    </Button>
                                </Upload>
                                {imageUploading && (
                                    <div style={{ marginTop: 16 }}>
                                        <Progress percent={imageUploadProgress} size="small" status="active" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Form>
            </Modal>
        </ConfigProvider>
    );
};

export default KeHoachPage;