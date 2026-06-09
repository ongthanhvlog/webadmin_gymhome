# 🏋️ GymHome Admin Dashboard
Dự án Website Quản trị GymHome được phát triển cho Đồ án tốt nghiệp ngành Công nghệ Thông tin - Trường Đại học Giao thông Vận tải.

Mục tiêu của dự án là xây dựng hệ thống quản trị dành cho quản trị viên nhằm quản lý người dùng, bài tập, kế hoạch tập luyện, thử thách, báo sức khỏe, thông báo nhắc nhở và xử lý đề yêu cầu hỗ trợ từ người dùng. Hệ thống giúp tối ưu hóa công tác vận hành ứng dụng GymHome, đồng thời nâng cao trải nghiệm tập luyện và chăm sóc sức khỏe cho người dùng.

## 🚀 Tính năng chính
### 👥 Quản lý người dùng
* Hiển thị danh sách người dùng trong hệ thống
* Tìm kiếm và xem chi tiết thông tin người dùng
* Theo dõi chỉ số sức khỏe
* Thống kê số lượng bài tập đã hoàn thành, lượng calo tiêu hao và thời gian tập luyện

### 💪 Quản lý vùng tập trung
* Quản lý các vùng cơ thể như ngực, vai, tay, bụng, lưng, chân, toàn thân,...
* Thêm, sửa, xóa các vùng tập trung
* Quản lý danh sách bài tập thuộc từng vùng cơ thể
* Cập nhật hình ảnh và mô tả chi tiết cho từng vùng tập trung

### 📅 Quản lý kế hoạch 
* Tạo và quản lý các lộ trình tập luyện 
* Hỗ trợ xây dựng kế hoạch 30 ngày cho người mới bắt đầu và người nâng cao
* Quản lý từng ngày tập luyện trong kế hoạch
* Quản lý danh sách bài tập lớn và bài tập nhỏ trong từng ngày

### 🏆 Quản lý thử thách
* Tạo mới, chỉnh sửa và xóa thử thách tập luyện
* Quản lý video hướng dẫn thực hiện thử thách
* Thiết lập cấp độ, thời gian và mục tiêu thử thách
* Theo dõi thông tin thử thách đang hoạt động

### 📰 Quản lý bài viết
* Thêm mới bài viết sức khỏe, tập luyện, dinh dưỡng từ link báo mới hoặc nhập dữ liệu
* Cập nhật bài viết từ các nguồn báo trực tuyến (baomoi.com,...)
* Quản lý lọc từ khóa ưu tiên và danh sách bài viết
* Đánh dấu lưu vĩnh viễn bài viết bổ ích và tự động xóa bài viết cũ sau 7 ngày 

### 🔔 Quản lý thông báo
* Gửi thông báo chung đến toàn bộ người dùng
* Gửi thông báo cá nhân cho từng người dùng
* Thiết lập thông báo hẹn giờ nhắc nhở
* Bật/tắt trạng thái hoạt động của thông báo

### 💬 Chăm sóc khách hàng
* Tiếp nhận ý kiến đóng góp và yêu cầu hỗ trợ từ người dùng
* Theo dõi trạng thái xử lý yêu cầu
* Gửi phản hồi trực tiếp đến người dùng
* Quản lý lịch sử hỗ trợ khách hàng

### 🌙 Giao diện hiện đại
* Hỗ trợ Dark Mode
* Responsive trên nhiều kích thước màn hình
* Giao diện trực quan, dễ sử dụng
* Tối ưu trải nghiệm quản trị viên

## 🛠️ Công nghệ sử dụng
### 🖥️ Frontend
* ReactJS
* Ant Design
* Ant Design Pro
* UmiJS
* Axios

### ☁️ Backend
* Firebase Authentication
* Cloud Firestore
* Firebase Storage
* Firebase Cloud Functions
* Firebase Cloud Messaging (FCM)

## ⚙️ Hướng dẫn cài đặt và chạy dự án
### 🧩 1. Yêu cầu hệ thống
* Node.js >= 18.x
* npm >= 9.x
* Kết nối Internet để sử dụng các dịch vụ của Firebase

### 📦 2. Clone dự án

```bash
git clone https://github.com/ongthanhvlog/webadmin_gymhome
cd gymhome-admin
```

### 🔧 3. Cài đặt thư viện

```bash
npm install
```

### 🚀 4. Chạy dự án

```bash
npm start
```

