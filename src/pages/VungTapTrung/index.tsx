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

const { Text, Paragraph, Title } = Typography;
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
    CapDo: string;
    ThoiGian: number;
    SoLuongNguoiDangKy: number;
    MoTa?: string;
    HinhAnh: string;
}

interface VungTapTrung {
    id: string;
    TenVung: string;
    MoTa: string;
    HinhAnh: string;
}

const generateCustomId = (prefix: string) => `${prefix}_${Math.floor(Math.random() * 900) + 100}`;

const VungTapTrungPage: React.FC = () => {
    const actionRef = useRef<ActionType>(null);

    const [danhSachVung, setDanhSachVung] = useState<any[]>([]);
    const [vungDangChon, setVungDangChon] = useState<string>('');
    const [vungInfo, setVungInfo] = useState<VungTapTrung | null>(null);

    const [formBaiTap] = Form.useForm();
    const [formNho] = Form.useForm();
    const [formVung] = Form.useForm();

    const [baiTapModalVisible, setBaiTapModalVisible] = useState(false);
    const [editingBaiTap, setEditingBaiTap] = useState<BaiTapLon | null>(null);
    const [dsBaiTapNho, setDsBaiTapNho] = useState<BaiTapNho[]>([]);
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentBaiTap, setCurrentBaiTap] = useState<BaiTapLon | null>(null);
    const [nhoModalVisible, setNhoModalVisible] = useState(false);
    const [editingNho, setEditingNho] = useState<BaiTapNho | null>(null);
    const [vungModalVisible, setVungModalVisible] = useState(false);

    const [videoSource, setVideoSource] = useState<'url' | 'file'>('url');
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const [imageSourceBaiTap, setImageSourceBaiTap] = useState<'url' | 'file'>('url');
    const [imageFileListBaiTap, setImageFileListBaiTap] = useState<any[]>([]);
    const [imageUploadingBaiTap, setImageUploadingBaiTap] = useState(false);
    const [imageUploadProgressBaiTap, setImageUploadProgressBaiTap] = useState<number>(0);

    const [imageSourceNho, setImageSourceNho] = useState<'url' | 'file'>('url');
    const [imageFileListNho, setImageFileListNho] = useState<any[]>([]);

    const [imageSourceVung, setImageSourceVung] = useState<'url' | 'file'>('url');
    const [imageFileListVung, setImageFileListVung] = useState<any[]>([]);
    const [imageUploadingVung, setImageUploadingVung] = useState(false);
    const [imageUploadProgressVung, setImageUploadProgressVung] = useState<number>(0);

    const storageFolder = 'vung_tap_trung';

    const fetchDanhSachVung = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'VungTapTrung'));
            const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            setDanhSachVung(data);
            if (data.length > 0 && !vungDangChon) {
                setVungDangChon(data[0].id);
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi tải vùng tập trung');
        }
    };

    const fetchVungInfo = async () => {
        if (!vungDangChon) return;
        try {
            const vungRef = doc(db, `VungTapTrung/${vungDangChon}`);
            const snap = await getDoc(vungRef);
            if (snap.exists()) {
                const data = snap.data() as any;
                setVungInfo({
                    id: vungDangChon,
                    TenVung: data.TenVung || '',
                    MoTa: data.MoTa || '',
                    HinhAnh: data.HinhAnh || '',
                });
            } else {
                setVungInfo({
                    id: vungDangChon,
                    TenVung: '',
                    MoTa: '',
                    HinhAnh: '',
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchDanhSachVung();
    }, []);

    useEffect(() => {
        if (vungDangChon) {
            fetchVungInfo();
            actionRef.current?.reload();
        }
    }, [vungDangChon]);

    useEffect(() => {
        const totalSeconds = dsBaiTapNho.reduce((sum, item) => sum + (Number(item.ThoiGian) || 0), 0);
        formBaiTap.setFieldsValue({ ThoiGian: totalSeconds });
    }, [dsBaiTapNho, formBaiTap]);

    const loadBaiTapNho = async (baiTapId: string) => {
        if (!vungDangChon || !baiTapId) {
            setDsBaiTapNho([]);
            return;
        }
        try {
            const q = query(
                collection(db, `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon/${baiTapId}/DanhSachBaiTapNho`),
                orderBy('SoThuTu', 'asc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BaiTapNho));
            setDsBaiTapNho(data);
        } catch (e) {
            setDsBaiTapNho([]);
        }
    };

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

    const fetchBaiTap = async (params?: any) => {
        if (!vungDangChon) {
            return { data: [], success: true, total: 0 };
        }
        try {
            const snapshot = await getDocs(collection(db, `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon`));
            let data: BaiTapLon[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            if (params?.TenBaiTapLon) {
                data = data.filter((item) => item.TenBaiTapLon.toLowerCase().includes(params.TenBaiTapLon.toLowerCase()));
            }
            return { data, success: true, total: data.length };
        } catch (error) {
            console.error(error);
            return { data: [], success: false };
        }
    };

    const handleEditVung = () => {
        if (!vungInfo) return;
        formVung.setFieldsValue({
            TenVung: vungInfo.TenVung,
            MoTa: vungInfo.MoTa,
            HinhAnh: vungInfo.HinhAnh || '',
        });
        setImageSourceVung('url');
        setImageFileListVung([]);
        setVungModalVisible(true);
    };

    const handleSaveVung = async (values: any) => {
        setImageUploadingVung(true);
        setImageUploadProgressVung(0);
        try {
            let hinhAnhUrl = vungInfo?.HinhAnh || '';

            if (imageSourceVung === 'file' && imageFileListVung.length > 0 && imageFileListVung[0].originFileObj) {
                const file = imageFileListVung[0].originFileObj;
                const storageRefPath = `hinhanh/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);

                hinhAnhUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setImageUploadProgressVung(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
                });
            } else if (imageSourceVung === 'url') {
                hinhAnhUrl = values.HinhAnh || hinhAnhUrl;
            }

            const vungRef = doc(db, `VungTapTrung/${vungDangChon}`);
            await setDoc(vungRef, {
                TenVung: values.TenVung || vungInfo?.TenVung,
                MoTa: values.MoTa || '',
                HinhAnh: hinhAnhUrl,
            }, { merge: true });

            setVungInfo({
                id: vungDangChon,
                TenVung: values.TenVung || vungInfo?.TenVung || '',
                MoTa: values.MoTa || '',
                HinhAnh: hinhAnhUrl,
            });

            fetchDanhSachVung();
            message.success('Đã cập nhật thông tin vùng tập trung thành công');
            setVungModalVisible(false);
        } catch (e) {
            message.error('Lỗi khi lưu thông tin vùng');
        } finally {
            setImageUploadingVung(false);
            setImageUploadProgressVung(0);
        }
    };

    const handleSaveBaiTap = async (values: any) => {
        if (!vungDangChon) {
            message.error('Chưa chọn vùng tập trung');
            return;
        }
        setImageUploadingBaiTap(true);
        setImageUploadProgressBaiTap(0);
        try {
            let hinhAnhUrl = editingBaiTap?.HinhAnh || '';

            if (imageSourceBaiTap === 'file' && imageFileListBaiTap.length > 0 && imageFileListBaiTap[0].originFileObj) {
                const file = imageFileListBaiTap[0].originFileObj;
                const storageRefPath = `hinhanh/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);

                hinhAnhUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setImageUploadProgressBaiTap(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
                });
            } else if (imageSourceBaiTap === 'url') {
                hinhAnhUrl = values.HinhAnh || hinhAnhUrl;
            }

            const baiTapId = editingBaiTap?.id || generateCustomId('btl');
            const totalSeconds = dsBaiTapNho.reduce((sum, item) => sum + (Number(item.ThoiGian) || 0), 0);

            const baiTapData = {
                ...values,
                ThoiGian: totalSeconds,
                SoLuongNguoiDangKy: Number(values.SoLuongNguoiDangKy) || 0,
                HinhAnh: hinhAnhUrl,
            };

            const baiTapRef = doc(db, `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon`, baiTapId);

            if (editingBaiTap) {
                await updateDoc(baiTapRef, baiTapData);
            } else {
                await setDoc(baiTapRef, baiTapData);
                if (dsBaiTapNho.length > 0) {
                    const batch = writeBatch(db);
                    dsBaiTapNho.forEach((item) => {
                        const btnRef = doc(
                            db,
                            `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon/${baiTapId}/DanhSachBaiTapNho`,
                            item.id
                        );
                        batch.set(btnRef, item);
                    });
                    await batch.commit();
                }
            }

            message.success('Đã lưu bài tập lớn thành công');
            setBaiTapModalVisible(false);
            actionRef.current?.reload();
        } catch (e) {
            message.error('Lỗi khi lưu dữ liệu');
        } finally {
            setImageUploadingBaiTap(false);
            setImageUploadProgressBaiTap(0);
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
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
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
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            setUploadProgress(progress);
                        },
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            resolve(downloadURL);
                        }
                    );
                });
            }

            const finalNhoData: BaiTapNho = {
                ...values,
                VideoHuongDan: videoUrl,
                VideoType: videoSource,
                HinhAnh: hinhAnhUrl,
                id: editingNho?.id || generateCustomId('btn'),
                SoThuTu: editingNho?.SoThuTu || dsBaiTapNho.length + 1,
            };

            let newList = [...dsBaiTapNho];
            if (editingNho) {
                newList = newList.map((i) => (i.id === editingNho.id ? finalNhoData : i));
                if (editingBaiTap) {
                    await setDoc(
                        doc(
                            db,
                            `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon/${editingBaiTap.id}/DanhSachBaiTapNho`,
                            editingNho.id
                        ),
                        finalNhoData
                    );
                }
            } else {
                newList.push(finalNhoData);
                if (editingBaiTap) {
                    await setDoc(
                        doc(
                            db,
                            `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon/${editingBaiTap.id}/DanhSachBaiTapNho`,
                            finalNhoData.id
                        ),
                        finalNhoData
                    );
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

            if (editingBaiTap) {
                const batch = writeBatch(db);
                newList.forEach((item) => {
                    batch.update(
                        doc(
                            db,
                            `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon/${editingBaiTap.id}/DanhSachBaiTapNho`,
                            item.id
                        ),
                        { SoThuTu: item.SoThuTu }
                    );
                });
                await batch.commit();
            }
        }
    };

    const columns: ProColumns<BaiTapLon>[] = [
        { title: 'ID Bài tập', dataIndex: 'id', search: false, width: 120 },
        { title: 'Tên bài tập lớn', dataIndex: 'TenBaiTapLon' },
        { title: 'Cấp độ', dataIndex: 'CapDo', valueType: 'select', valueEnum: { 'Dễ': { text: 'Dễ' }, 'Khó': { text: 'Khó' } } },
        { title: 'Tổng Thời Gian', dataIndex: 'ThoiGian', valueType: 'digit', sorter: (a, b) => a.ThoiGian - b.ThoiGian },
        { title: 'Số lượng người đăng ký', dataIndex: 'SoLuongNguoiDangKy', valueType: 'digit', sorter: (a, b) => a.SoLuongNguoiDangKy - b.SoLuongNguoiDangKy },
        { title: 'Mô tả', dataIndex: 'MoTa', search: false,
            render: (_, record) => (
                <a
                    onClick={() => {
                        setCurrentBaiTap(record);
                        loadBaiTapNho(record.id);
                        setDetailVisible(true);
                    }}
                >
                    Xem chi tiết
                </a>
            ),
        },
        { title: 'Tùy chọn', valueType: 'option', width: 180,
            render: (_, record) => [
                <Button
                    key="edit"
                    size="small"
                    style={{ borderRadius: '4px', borderColor: '#1890ff', color: '#1890ff' }}
                    onClick={() => {
                        setEditingBaiTap(record);
                        loadBaiTapNho(record.id);
                        formBaiTap.setFieldsValue(record);
                        setImageSourceBaiTap('url');
                        setImageFileListBaiTap([]);
                        if (record.HinhAnh) formBaiTap.setFieldsValue({ HinhAnh: record.HinhAnh });
                        setBaiTapModalVisible(true);
                    }}
                >
                    Sửa
                </Button>,
                <Popconfirm
                    key="del"
                    title="Xác nhận xóa?"
                    onConfirm={async () => {
                        await deleteDoc(doc(db, `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon`, record.id));
                        actionRef.current?.reload();
                    }}
                >
                    <Button
                        size="small"
                        style={{ borderRadius: '4px', borderColor: '#ff4d4f', color: '#ff4d4f', marginLeft: 8 }}
                    >
                        Xóa
                    </Button>
                </Popconfirm>,
            ],
        },
    ];

    const columnsNho = (isEdit: boolean) => [
        ...(isEdit ? [{ title: '', dataIndex: 'sort', width: 40, render: () => <MenuOutlined style={{ color: '#999' }} /> }] : []),
        { title: 'STT', dataIndex: 'SoThuTu', width: 60 },
        { title: 'Tên bài', dataIndex: 'TenBaiTapNho', width: 200 },
        { title: 'Thời gian', dataIndex: 'ThoiGian', width: 100, render: (v: number) => `${v}s` },
        { title: 'Hình ảnh', dataIndex: 'HinhAnh', width: 90,
            render: (url: string) =>
                url ? (
                    <img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                ) : (
                    <span style={{ color: '#999' }}>-</span>
                ),
        },
        { title: 'Hướng dẫn tập luyện', dataIndex: 'MoTa', width: 300, render: (text: string) => <Paragraph ellipsis={{ rows: 2 }}>{text || '-'}</Paragraph>,},
        { title: 'Video', dataIndex: 'VideoHuongDan', width: 100,
            render: (url: string) =>
                url ? (
                    <a onClick={() => handlePreviewVideo(url)}>
                        <PlayCircleOutlined /> Xem
                    </a>
                ) : (
                    <span>-</span>
                ),
        },
        ...(isEdit
            ? [
                { title: 'Tùy chỉnh', width: 120,
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
                                    const newList = dsBaiTapNho.filter((i) => i.id !== r.id);
                                    setDsBaiTapNho(newList);
                                    if (editingBaiTap) {
                                        await deleteDoc(
                                            doc(
                                                db,
                                                `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon/${editingBaiTap.id}/DanhSachBaiTapNho`,
                                                r.id
                                            )
                                        );
                                        const totalSeconds = newList.reduce((sum, item) => sum + (Number(item.ThoiGian) || 0), 0);
                                        await updateDoc(
                                            doc(db, `VungTapTrung/${vungDangChon}/DanhSachBaiTapLon`, editingBaiTap.id),
                                            { ThoiGian: totalSeconds }
                                        );
                                    }
                                }}
                            >
                                <Button
                                    size="small"
                                    style={{ borderRadius: '4px', borderColor: '#ff4d4f', color: '#ff4d4f' }}
                                >
                                    Xóa
                                </Button>
                            </Popconfirm>
                        </Space>
                    ),
                },
            ]
            : []),
    ];

    return (
        <ConfigProvider locale={viVN}>
            <Card title="QUẢN LÝ VÙNG TẬP TRUNG" style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                {/* Danh sách vùng (card) - bỏ Tooltip */}
                <div style={{ padding: '24px 24px 0' }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: 16,
                            marginBottom: 24,
                        }}
                    >
                        {danhSachVung.map((vung) => {
                            const isActive = vungDangChon === vung.id;
                            return (
                                <div
                                    key={vung.id}
                                    onClick={() => {
                                        setVungDangChon(vung.id);
                                        actionRef.current?.reload();
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        height: 150,
                                        borderRadius: 14,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        fontWeight: 600,
                                        fontSize: 16,
                                        transition: 'all 0.25s ease',
                                        background: isActive ? '#1677ff' : '#ffffff',
                                        color: isActive ? '#fff' : '#000',
                                        border: isActive ? '2px solid #1677ff' : '1px solid #e5e7eb',
                                        boxShadow: isActive
                                            ? '0 6px 16px rgba(22,119,255,0.4)'
                                            : '0 3px 10px rgba(0,0,0,0.1)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    {vung.HinhAnh ? (
                                        <img
                                            src={vung.HinhAnh}
                                            alt={vung.TenVung}
                                            style={{
                                                width: 100,
                                                height: 100,
                                                marginBottom: 10,
                                                objectFit: 'contain',
                                                borderRadius: 10,
                                                border: '1px solid #eee',
                                                filter: isActive ? 'brightness(0) invert(1)' : 'none',
                                            }}
                                        />
                                    ) : (
                                        <div style={{ marginBottom: 10, fontSize: 12, color: '#999' }}>Không có ảnh</div>
                                    )}
                                    {vung.TenVung}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Card thông tin vùng tập trung (tương tự THÔNG TIN NGÀY) */}
                <Card
                    title={<Title level={5} style={{ margin: 0 }}>THÔNG TIN VÙNG TẬP TRUNG</Title>}
                    style={{ margin: '0 24px 24px' }}
                    extra={
                        <Button type="primary" onClick={handleEditVung}>
                            Chỉnh sửa thông tin vùng
                        </Button>
                    }
                >
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                        {vungInfo?.HinhAnh ? (
                            <img
                                src={vungInfo.HinhAnh}
                                alt="Hình ảnh vùng"
                                style={{
                                    width: 280,
                                    height: 200,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 280,
                                    height: 200,
                                    background: '#f5f5f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 8,
                                    color: '#999',
                                    border: '2px dashed #d9d9d9',
                                }}
                            >
                                Chưa có hình ảnh
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                                Tên vùng: {vungInfo?.TenVung}
                            </Text>
                            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                                Mô tả:
                            </Text>
                            <Paragraph style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {vungInfo?.MoTa || 'Chưa có mô tả cho vùng này.'}
                            </Paragraph>
                        </div>
                    </div>
                </Card>

                {/* Table danh sách bài tập lớn */}
                <div className="gymhome-table-container" style={{ padding: '0 24px 24px' }}>
                    <div
                        style={{
                            padding: '16px 24px',
                            background: '#fff',
                            border: '1px solid #f0f0f0',
                            borderRadius: '8px 8px 0 0',
                            borderBottom: 'none',
                        }}
                    >
                        <Text strong style={{ fontSize: '16px' }}>
                            TÌM KIẾM DỮ LIỆU
                        </Text>
                        <Divider style={{ margin: '12px 0 0' }} />
                    </div>
                    <ProTable<BaiTapLon>
                        actionRef={actionRef}
                        headerTitle={`DANH SÁCH BÀI TẬP LỚN - ${danhSachVung.find((v) => v.id === vungDangChon)?.TenVung || vungDangChon}`}
                        columns={columns}
                        request={fetchBaiTap}
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
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            },
                        }}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        toolBarRender={() => [
                            <Button
                                key="add"
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    setEditingBaiTap(null);
                                    setDsBaiTapNho([]);
                                    formBaiTap.resetFields();
                                    formBaiTap.setFieldsValue({ SoLuongNguoiDangKy: 0 });
                                    setImageSourceBaiTap('url');
                                    setImageFileListBaiTap([]);
                                    setBaiTapModalVisible(true);
                                }}
                            >
                                Thêm bài tập lớn
                            </Button>,
                        ]}
                    />
                </div>
            </Card>

            {/* Modal chi tiết bài tập lớn - có hình ảnh + cột hình ảnh bài nhỏ */}
            <Modal
                title="Chi tiết bài tập lớn"
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={null}
                width={1100}
            >
                <div style={{ display: 'flex', gap: 24, marginBottom: 24, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 360 }}>
                        <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                            {currentBaiTap?.TenBaiTapLon}
                        </Text>
                        <div style={{ marginTop: 16, border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, backgroundColor: '#fafafa' }}>
                            <Text strong>Mô tả:</Text>
                            <Paragraph style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {currentBaiTap?.MoTa || 'Không có mô tả.'}
                            </Paragraph>
                        </div>
                    </div>

                    <div style={{ flex: 1, maxWidth: 560, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {currentBaiTap?.HinhAnh ? (
                            <img
                                src={currentBaiTap.HinhAnh}
                                alt="Hình ảnh bài tập lớn"
                                style={{
                                    width: '100%',
                                    maxHeight: 400,
                                    objectFit: 'contain',
                                    borderRadius: 12,
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: 280,
                                    border: '1px dashed #d9d9d9',
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#999',
                                }}
                            >
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

            {/* Modal tạo / sửa Bài tập lớn - có phần upload hình ảnh */}
            <Modal
                title={editingBaiTap ? 'Chỉnh sửa bài tập lớn' : 'Tạo bài tập lớn mới'}
                open={baiTapModalVisible}
                onCancel={() => !imageUploadingBaiTap && setBaiTapModalVisible(false)}
                onOk={() => formBaiTap.submit()}
                confirmLoading={imageUploadingBaiTap}
                okText={imageUploadingBaiTap ? 'Đang tải lên...' : 'Lưu dữ liệu'}
                width={1100}
            >
                <Form form={formBaiTap} layout="vertical" onFinish={handleSaveBaiTap}>
                    <Space style={{ display: 'flex' }} size="large" align="start">
                        <Form.Item name="TenBaiTapLon" label="Tên bài tập lớn" rules={[{ required: true }]} style={{ width: 400 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="CapDo" label="Cấp độ" rules={[{ required: true }]} style={{ width: 150 }}>
                            <Select options={[{ value: 'Dễ', label: 'Dễ' }, { value: 'Khó', label: 'Khó' }]} />
                        </Form.Item>
                        <Form.Item name="ThoiGian" label="Tổng thời gian" style={{ width: 150 }}>
                            <InputNumber disabled style={{ width: '100%', fontWeight: 'bold' }} />
                        </Form.Item>
                        <Form.Item name="SoLuongNguoiDangKy" label="Số lượng người đăng ký" style={{ width: 180 }}>
                            <InputNumber disabled style={{ width: '100%', fontWeight: 'bold' }} min={0} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="MoTa" label="Mô tả bài tập">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    {/* Phần upload hình ảnh Bài tập lớn */}
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                            Hình ảnh đại diện cho bài tập lớn:
                        </label>
                        <Radio.Group
                            value={imageSourceBaiTap}
                            onChange={(e) => setImageSourceBaiTap(e.target.value)}
                            style={{ marginBottom: 12 }}
                        >
                            <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
                            <Radio.Button value="file">Tải lên từ máy</Radio.Button>
                        </Radio.Group>

                        {imageSourceBaiTap === 'url' ? (
                            <Form.Item name="HinhAnh">
                                <Input placeholder="https://example.com/hinh-anh.jpg" />
                            </Form.Item>
                        ) : (
                            <div style={{ padding: '16px', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center' }}>
                                <Upload
                                    beforeUpload={() => false}
                                    fileList={imageFileListBaiTap}
                                    onChange={({ fileList }) => setImageFileListBaiTap(fileList.slice(-1))}
                                    accept="image/*"
                                    maxCount={1}
                                >
                                    <Button icon={<UploadOutlined />} type="dashed" size="large">
                                        Chọn file hình ảnh (JPG, PNG...)
                                    </Button>
                                </Upload>
                                {imageUploadingBaiTap && (
                                    <div style={{ marginTop: 16 }}>
                                        <Progress percent={imageUploadProgressBaiTap} size="small" status="active" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Form>

                {/* Danh sách bài tập nhỏ */}
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
                        <SortableContext items={dsBaiTapNho.map((i) => i.id)} strategy={verticalListSortingStrategy}>
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

            {/* Modal Bài tập nhỏ - có thêm hình ảnh */}
            <Modal
                title={editingNho ? 'Cập nhật bài tập nhỏ' : 'Thêm bài tập nhỏ'}
                open={nhoModalVisible}
                onCancel={() => !uploading && setNhoModalVisible(false)}
                onOk={() => formNho.submit()}
                confirmLoading={uploading}
                destroyOnClose
                okText={uploading ? 'Đang tải lên...' : 'Xác nhận'}
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

                    {/* Hình ảnh bài tập nhỏ */}
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

            {/* Modal chỉnh sửa thông tin vùng */}
            <Modal
                title={`Chỉnh sửa thông tin vùng ${vungInfo?.TenVung || ''}`}
                open={vungModalVisible}
                onCancel={() => !imageUploadingVung && setVungModalVisible(false)}
                onOk={() => formVung.submit()}
                confirmLoading={imageUploadingVung}
                okText={imageUploadingVung ? 'Đang tải lên...' : 'Lưu'}
                width={700}
            >
                <Form form={formVung} layout="vertical" onFinish={handleSaveVung}>
                    <Form.Item name="TenVung" label="Tên vùng" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="MoTa" label="Mô tả vùng">
                        <Input.TextArea rows={4} placeholder="Nhập mô tả cho vùng tập trung..." />
                    </Form.Item>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Hình ảnh đại diện cho vùng:</label>
                        <Radio.Group
                            value={imageSourceVung}
                            onChange={(e) => setImageSourceVung(e.target.value)}
                            style={{ marginBottom: 12 }}
                        >
                            <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
                            <Radio.Button value="file">Tải lên từ máy</Radio.Button>
                        </Radio.Group>

                        {imageSourceVung === 'url' ? (
                            <Form.Item name="HinhAnh">
                                <Input placeholder="https://example.com/hinh-anh.jpg" />
                            </Form.Item>
                        ) : (
                            <div style={{ padding: '16px', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center' }}>
                                <Upload
                                    beforeUpload={() => false}
                                    fileList={imageFileListVung}
                                    onChange={({ fileList }) => setImageFileListVung(fileList.slice(-1))}
                                    accept="image/*"
                                    maxCount={1}
                                >
                                    <Button icon={<UploadOutlined />} type="dashed" size="large">
                                        Chọn file hình ảnh (JPG, PNG...)
                                    </Button>
                                </Upload>
                                {imageUploadingVung && (
                                    <div style={{ marginTop: 16 }}>
                                        <Progress percent={imageUploadProgressVung} size="small" status="active" />
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

export default VungTapTrungPage;