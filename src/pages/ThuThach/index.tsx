import React, { useRef, useState } from 'react';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Space, ConfigProvider, message, Card, Modal, Form, Input, InputNumber, Popconfirm, Typography, Select, Divider, Upload, Radio, Progress } from 'antd';
import viVN from 'antd/es/locale/vi_VN';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebaseConfig';
import { PlayCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface ThuThach {
    ThuThachId: string;         
    TenThuThach: string;
    MoTa: string;
    CapDo: string;
    ThoiGian: number;
    VideoHuongDan: string;
    VideoType?: 'url' | 'file';
    HinhAnh: string;
}

const generateCustomId = (prefix: string) => `${prefix}_${Math.floor(Math.random() * 900) + 100}`;

const ThuThachPage: React.FC = () => {
    const actionRef = useRef<ActionType>(null);
    const [form] = Form.useForm();

    const [thuThachModalVisible, setThuThachModalVisible] = useState(false);
    const [editingThuThach, setEditingThuThach] = useState<ThuThach | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [currentThuThach, setCurrentThuThach] = useState<ThuThach | null>(null);

    const [videoSource, setVideoSource] = useState<'url' | 'file'>('url');
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    const [imageSource, setImageSource] = useState<'url' | 'file'>('url');
    const [imageFileList, setImageFileList] = useState<any[]>([]);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUploadProgress, setImageUploadProgress] = useState<number>(0);

    const storageFolder = 'thu_thach';

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
                        <iframe width="100%" height="450" src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} title="YouTube video player" frameBorder="0" allowFullScreen />
                    ) : (
                        <video width="100%" height="450" controls autoPlay>
                            <source src={url} type="video/mp4" />
                        </video>
                    )}
                </div>
            ),
            footer: null,
        });
    };

    const fetchThuThach = async (params?: any) => {
        try {
            const snapshot = await getDocs(collection(db, 'ThuThach'));
            const data: ThuThach[] = snapshot.docs.map((d) => {
                const rawData = d.data();
                return {
                    ThuThachId: rawData.ThuThachId || d.id,  
                    ...rawData,
                } as ThuThach;
            });

            let filtered = data;
            if (params?.TenThuThach) {
                filtered = filtered.filter((item) =>
                    item.TenThuThach?.toLowerCase().includes(params.TenThuThach.toLowerCase())
                );
            }
            return { data: filtered, success: true, total: filtered.length };
        } catch (error) {
            console.error(error);
            return { data: [], success: false };
        }
    };

    const handleSaveThuThach = async (values: any) => {
        setUploading(true);
        setUploadProgress(0);
        setImageUploading(true);
        setImageUploadProgress(0);

        try {
            let videoUrl = values.VideoHuongDan || '';
            let finalVideoType: 'url' | 'file' = videoSource;

            if (videoSource === 'file' && fileList.length > 0 && fileList[0].originFileObj) {
                const file = fileList[0].originFileObj;
                const storageRefPath = `videos/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);
                videoUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
                        reject,
                        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                    );
                });
            }

            let hinhAnhUrl = editingThuThach?.HinhAnh || '';
            if (imageSource === 'url') {
                hinhAnhUrl = values.HinhAnh || hinhAnhUrl;
            } else if (imageSource === 'file' && imageFileList.length > 0 && imageFileList[0].originFileObj) {
                const file = imageFileList[0].originFileObj;
                const storageRefPath = `hinhanh/${storageFolder}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storageRefPath);
                const uploadTask = uploadBytesResumable(storageRef, file);
                hinhAnhUrl = await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => setImageUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
                        reject,
                        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                    );
                });
            }

            const thuThachId = editingThuThach?.ThuThachId || generateCustomId('thuthach');

            const thuThachData = {
                ThuThachId: thuThachId,
                TenThuThach: values.TenThuThach,
                MoTa: values.MoTa || '',
                CapDo: values.CapDo,
                ThoiGian: Number(values.ThoiGian) || 0,
                VideoHuongDan: videoUrl,
                VideoType: finalVideoType,
                HinhAnh: hinhAnhUrl,
            };

            const thuThachRef = doc(db, 'ThuThach', thuThachId);
            editingThuThach ? await updateDoc(thuThachRef, thuThachData) : await setDoc(thuThachRef, thuThachData);

            message.success('Đã lưu thử thách thành công');
            setThuThachModalVisible(false);
            actionRef.current?.reload();
        } catch (error) {
            message.error('Lỗi khi lưu dữ liệu');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setImageUploading(false);
            setImageUploadProgress(0);
            setFileList([]);
            setImageFileList([]);
        }
    };

    const columns: ProColumns<ThuThach>[] = [
        { title: 'ID thử thách', dataIndex: 'ThuThachId', search: false, width: 140 },
        { title: 'Tên thử thách', dataIndex: 'TenThuThach' },
        { title: 'Cấp độ', dataIndex: 'CapDo', valueType: 'select', valueEnum: { 'Dễ': { text: 'Dễ' }, 'Khó': { text: 'Khó' } } },
        { title: 'Thời Gian', dataIndex: 'ThoiGian', valueType: 'digit', render: (_, record) => `${record.ThoiGian || 0} `, sorter: (a, b) => a.ThoiGian - b.ThoiGian,width: 120 },
        { title: 'Mô tả', dataIndex: 'MoTa', search: false, render: (_, record) => <a onClick={() => { setCurrentThuThach(record); setDetailVisible(true); }}>Xem chi tiết</a> },
        { title: 'Video hướng dẫn', dataIndex: 'VideoHuongDan', search: false, width: 170,
            render: (_, record) => {
                const url = record.VideoHuongDan;
                return url ? (
                    <a onClick={() => handlePreviewVideo(url)}>
                        <PlayCircleOutlined /> Xem
                    </a>
                ) : (
                    <span style={{ color: '#999' }}>-</span>
                );
            },
        },
        { title: 'Tùy chọn', valueType: 'option', width: 180,
            render: (_, record) => [
                <Button key="edit" size="small" style={{ borderRadius: '4px', borderColor: '#1890ff', color: '#1890ff' }}
                    onClick={() => {
                        setEditingThuThach(record);
                        form.setFieldsValue({ 
                            TenThuThach: record.TenThuThach, 
                            CapDo: record.CapDo, 
                            ThoiGian: record.ThoiGian, 
                            MoTa: record.MoTa, 
                            VideoHuongDan: record.VideoHuongDan || '', 
                            HinhAnh: record.HinhAnh || '' 
                        });
                        setVideoSource(record.VideoType || 'url');
                        setImageSource('url');
                        setFileList([]);
                        setImageFileList([]);
                        setThuThachModalVisible(true);
                    }}>
                    Sửa
                </Button>,
                <Popconfirm key="del" title="Xác nhận xóa thử thách này?" onConfirm={async () => { 
                    await deleteDoc(doc(db, 'ThuThach', record.ThuThachId));   // ← Sửa thành ThuThachId
                    actionRef.current?.reload(); 
                }}>
                    <Button size="small" style={{ borderRadius: '4px', borderColor: '#ff4d4f', color: '#ff4d4f', marginLeft: 8 }}>Xóa</Button>
                </Popconfirm>,
            ],
        },
    ];

    return (
        <ConfigProvider locale={viVN}>
            <Card title="QUẢN LÝ THỬ THÁCH" style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                <div style={{ padding: '24px 24px 0' }}>
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
                </div>

                <div className="gymhome-table-container" style={{ padding: '0 24px 24px' }}>
                    <ProTable<ThuThach>
                        actionRef={actionRef}
                        headerTitle="DANH SÁCH THỬ THÁCH"
                        columns={columns}
                        request={fetchThuThach}
                        rowKey="ThuThachId"              
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
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        toolBarRender={() => [
                            <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => {
                                setEditingThuThach(null);
                                form.resetFields();
                                setVideoSource('url');
                                setImageSource('url');
                                setFileList([]);
                                setImageFileList([]);
                                setThuThachModalVisible(true);
                            }}>
                                Thêm thử thách
                            </Button>,
                        ]}
                    />
                </div>
            </Card>

            <Modal title="Chi tiết thử thách" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={1000}>
                {currentThuThach && (
                    <>
                        <Text strong style={{ fontSize: '20px', color: '#1890ff', display: 'block', marginBottom: 20 }}>
                            {currentThuThach.TenThuThach}
                        </Text>
                        <div style={{ display: 'flex', gap: 32 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: 16 }}><Text strong>Cấp độ: </Text><Text>{currentThuThach.CapDo}</Text></div>
                                <div style={{ marginBottom: 24 }}><Text strong>Thời gian: </Text><Text>{currentThuThach.ThoiGian} </Text></div>
                                <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 20, backgroundColor: '#fafafa' }}>
                                    <Text strong style={{ fontSize: 16 }}>Mô tả</Text>
                                    <Paragraph style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                        {currentThuThach.MoTa || 'Không có mô tả.'}
                                    </Paragraph>
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                {currentThuThach.HinhAnh ? (
                                    <img src={currentThuThach.HinhAnh} alt="Hình ảnh" style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.1)' }} />
                                ) : (
                                    <div style={{ width: 320, height: 320, border: '2px dashed #d9d9d9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                                        Chưa có hình ảnh
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                title={editingThuThach ? 'Chỉnh sửa thử thách' : 'Thêm thử thách mới'}
                open={thuThachModalVisible}
                onCancel={() => !uploading && setThuThachModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={uploading || imageUploading}
                okText={(uploading || imageUploading) ? 'Đang tải lên...' : 'Lưu'}
                width={1000}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSaveThuThach}>
                    <Space style={{ display: 'flex', width: '100%' }} size="large" align="end">
                        <Form.Item name="TenThuThach" label="Tên thử thách" rules={[{ required: true }]} style={{ flex: 1 }}>
                            <Input placeholder="Nhập tên thử thách" />
                        </Form.Item>
                        <Form.Item name="CapDo" label="Cấp độ" rules={[{ required: true }]} style={{ width: 180 }}>
                            <Select options={[{ value: 'Dễ', label: 'Dễ' }, { value: 'Khó', label: 'Khó' }]} />
                        </Form.Item>
                        <Form.Item name="ThoiGian" label="Thời gian " rules={[{ required: true }]} style={{ width: 180 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Space>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Video hướng dẫn:</label>
                        <Radio.Group value={videoSource} onChange={(e) => setVideoSource(e.target.value)} style={{ marginBottom: 12 }}>
                            <Radio.Button value="url">Dán Link</Radio.Button>
                            <Radio.Button value="file">Tải lên file</Radio.Button>
                        </Radio.Group>
                        {videoSource === 'url' ? (
                            <Form.Item name="VideoHuongDan"><Input placeholder="Link YouTube hoặc MP4" /></Form.Item>
                        ) : (
                            <div style={{ padding: '10px', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                                <Upload beforeUpload={() => false} fileList={fileList} onChange={({ fileList }) => setFileList(fileList.slice(-1))} accept="video/*" maxCount={1}>
                                    <Button icon={<UploadOutlined />} type="dashed" size="large">Chọn file video</Button>
                                </Upload>
                                {(uploading || imageUploading) && <Progress percent={uploadProgress} size="small" status="active" style={{ marginTop: 12 }} />}
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Hình ảnh đại diện:</label>
                        <Radio.Group value={imageSource} onChange={(e) => setImageSource(e.target.value)} style={{ marginBottom: 12 }}>
                            <Radio.Button value="url">Dán link hình ảnh</Radio.Button>
                            <Radio.Button value="file">Tải lên từ máy</Radio.Button>
                        </Radio.Group>
                        {imageSource === 'url' ? (
                            <Form.Item name="HinhAnh"><Input placeholder="https://example.com/hinh-anh.jpg" /></Form.Item>
                        ) : (
                            <div style={{ padding: '16px', border: '2px dashed #d9d9d9', borderRadius: '8px', textAlign: 'center' }}>
                                <Upload beforeUpload={() => false} fileList={imageFileList} onChange={({ fileList }) => setImageFileList(fileList.slice(-1))} accept="image/*" maxCount={1}>
                                    <Button icon={<UploadOutlined />} type="dashed" size="large">Chọn file hình ảnh</Button>
                                </Upload>
                                {(uploading || imageUploading) && <Progress percent={imageUploadProgress} size="small" status="active" style={{ marginTop: 12 }} />}
                            </div>
                        )}
                    </div>

                    <Form.Item name="MoTa" label="Mô tả chi tiết cách tập">
                        <Input.TextArea rows={5} placeholder="Mô tả cách thực hiện thử thách..." />
                    </Form.Item>
                </Form>
            </Modal>
        </ConfigProvider>
    );
};

export default ThuThachPage;