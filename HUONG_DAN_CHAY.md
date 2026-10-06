# Hướng dẫn chạy dự án — University Facility Booking System

Làm lần lượt từ Bước 0 đến Bước 5. Lần đầu mất khoảng 20–30 phút, chủ yếu là thời gian cài phần mềm.
(English version: xem `README.md`.)

---

## Bước 0. Cài phần mềm (chỉ làm một lần)

| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| **MySQL Server** | 8.0.16 trở lên | Khi cài: giữ cổng **3306**, đặt **mật khẩu root** và ghi lại |
| **MySQL Workbench** | bản mới nhất | Dùng để chạy file `.sql` và xem dữ liệu |
| **Node.js** | 18 trở lên (khuyên dùng 22 LTS) | |
| **VS Code** + extension **REST Client** | | Dùng để gửi request thử API. Có thể dùng Postman thay thế |

Kiểm tra Node.js:

```bash
node -v    # phải ra v18 trở lên
```

---

## Bước 1. Tạo database

1. Mở **MySQL Workbench** → bấm ô **Local instance MySQL80** → nhập mật khẩu root.
2. Vào **File → Open SQL Script**, mở từng file rồi bấm nút **tia sét** ⚡ để chạy cả file:

| Thứ tự | File | Làm gì |
|---|---|---|
| 1 | `database/01_create_database.sql` | Tạo database `FacilityBookingDB` và 4 bảng |
| 2 | `database/02_seed_data.sql` | Thêm dữ liệu mẫu (5 tài khoản, 6 loại phòng, 7 phòng) |

3. Bấm 🔄 ở khung **Schemas** bên trái. Bạn sẽ thấy `facilitybookingdb` có 4 bảng: `users`, `facility_categories`, `facilities`, `bookings`.

> ⚠️ Chạy lại file 01 sẽ **xóa hết dữ liệu**. Chạy lại xong thì nhớ chạy tiếp file 02.

---

## Bước 2. Cài đặt backend

Mở Terminal trong VS Code (`` Ctrl+` ``):

```bash
cd backend
npm install
copy .env.example .env          # macOS/Linux: cp .env.example .env
```

Mở file `.env` và sửa **2 dòng**:

```env
DB_PASSWORD=your_mysql_root_password     # ← mật khẩu root MySQL của bạn
JWT_SECRET=change_this_to_a_long_random_text   # ← một chuỗi ngẫu nhiên bất kỳ
```

Các dòng còn lại giữ nguyên. `EMAIL_DOMAIN=usth.edu.vn` là tên miền email được phép đăng nhập —
đổi dòng này nếu trường bạn dùng tên miền khác. Nếu mật khẩu có ký tự `#`, hãy đặt nó trong dấu nháy: `DB_PASSWORD="abc#123"`.

---

## Bước 3. Chạy server

```bash
npm run dev
```

Nếu chạy đúng, Terminal sẽ hiện:

```
Connected to MySQL
Website:  http://localhost:3000
API:      http://localhost:3000/api
```

Muốn dừng server thì nhấn `Ctrl + C`.

---

## Bước 4. Dùng website

Mở trình duyệt vào **http://localhost:3000** rồi đăng nhập bằng một tài khoản mẫu. Backend phục vụ luôn giao diện nên không cần chạy thêm gì.

### Tài khoản mẫu

Tất cả dùng mật khẩu **`Password@123`**.

| Vai trò | Email |
|---|---|
| ADMIN | admin@usth.edu.vn |
| TEACHER | huydt@usth.edu.vn |
| STAFF | hapt@usth.edu.vn |
| STUDENT | antt2410071@usth.edu.vn |
| STUDENT | binhlm2410072@usth.edu.vn |

> **Đăng ký:** ở trang đăng nhập bấm **"Create a student account"**. Chỉ email dạng
> *tên viết tắt + mã sinh viên* `@usth.edu.vn` (ví dụ `anhnq2410071@usth.edu.vn`) mới đăng ký được,
> và tài khoản tạo ra **luôn là STUDENT**. Email không có mã số (`huydt@usth.edu.vn`) hay Gmail
> đều bị từ chối — tài khoản giảng viên / nhân viên / admin do admin tạo ở trang **Users**.

### Giao diện

Giao diện làm theo bản thiết kế Figma **CAMPUS FACILITY BOOKING** của nhóm: nền teal + thẻ trắng
cho sinh viên/giảng viên, sidebar xanh đậm cho admin. Ảnh phòng lấy từ đường link trong cột
`facilities.image_url`; nếu không tải được ảnh thì hiện ô xám thay thế.

### Giờ đặt phòng

Một ngày được chia thành **28 ca 30 phút**: `07:01–07:30`, `07:31–08:00`, … `20:31–21:00`.
Mỗi lần đặt là **đúng một ca**, nên hai booking không bao giờ trùng giờ.

### Việc nên thử

| Thử việc này | Ở đâu |
|---|---|
| Đăng ký tài khoản sinh viên mới | Trang đăng nhập → Create a student account |
| Xem số liệu, lịch sắp tới, phòng hay đặt | Dashboard |
| Tìm kiếm, lọc phòng (loại, sức chứa, đang mở) | Facilities |
| Chọn ngày, chọn một ca còn trống, nhập mục đích, gửi yêu cầu | Rooms → View & book |
| Ca đã có người đặt sẽ bị làm mờ, không chọn được | cùng trang đó |
| Sinh viên vào **Chemistry Lab D101** → không đặt được (phòng chỉ dành cho giảng viên) | Rooms → View & book |
| Hủy booking | My bookings |
| Đăng nhập giảng viên, lấy ca của sinh viên (cách hôm nay từ 2 ngày) | Rooms → View & book |
| Đăng nhập admin: xem số liệu + hàng chờ duyệt | Dashboard (admin) |
| Duyệt / từ chối, bấm vào một dòng để xem chi tiết | Bookings (admin) |
| Thêm, sửa, đóng, xóa phòng; tick vai trò được đặt phòng đó; sức chứa 1–300 | Rooms (admin) |
| **Tạo tài khoản mới**, đổi vai trò, khóa tài khoản | Users (admin) |

---

## Bước 4b. Thử API trực tiếp (không bắt buộc)

### Dùng file `api-tests.http`

1. Mở `backend/api-tests.http` trong VS Code.
2. ⚠️ Sửa dòng `@day = 2026-09-25` ở đầu file thành **một ngày cách hôm nay từ 2 đến 30 ngày**.
3. Bấm **Send Request** trên từng khối, **đi từ trên xuống dưới**.

Kết quả nên thấy:

| Request | Kết quả đúng |
|---|---|
| Đăng ký `anhnq2410099@usth.edu.vn` | `201`, role STUDENT |
| Đăng ký `huydt@usth.edu.vn` (không có mã SV) | `400` |
| 1. Đặt phòng A101 ca 10:01–10:30 | `201`, trạng thái PENDING |
| 2. Đặt lại đúng ca đó | `409` "already booked at 10:01-10:30" |
| 3. Đặt ca kế tiếp 10:31–11:00 | `201` |
| 4. Đặt 10:00–12:00 (không phải một ca) | `400` "Choose one time slot…" |
| 5. Không nhập mục đích | `400` |
| 6. Sinh viên đặt phòng họp giảng viên | `403` |
| 7. Sinh viên đặt Chemistry Lab D101 | `403` (luật riêng của phòng) |
| 8. Phòng đang đóng (Badminton Hall) | `409` |
| 9. Giảng viên đặt ca 10:01–10:30 | `201`, kèm `"replacedBookings": 1`. Booking 1 của sinh viên chuyển thành CANCELLED |
| Sức chứa 400 hoặc −5 | `400` (chỉ nhận 1–300) |
| Tạo tài khoản với email Gmail | `400` (phải là email trường) |
| Admin duyệt booking 3 | `200` |
| Admin từ chối booking 3 | `409` vì booking 3 đã được duyệt |

### Dùng Postman

1. `POST http://localhost:3000/api/auth/login`, Body → raw → JSON:
   `{ "email": "antt2410071@usth.edu.vn", "password": "Password@123" }`
2. Copy `token` trong kết quả trả về.
3. Ở các request khác: tab **Authorization** → **Bearer Token** → dán token.

### Kiểm tra không bị đặt trùng khi nhiều người bấm cùng lúc

Giữ server đang chạy, mở **Terminal thứ hai** trong thư mục `backend`:

```bash
npm run test:race
```

Kết quả đúng: `PASS: only one booking was saved`.

---

## Bước 5. Xem và làm mới dữ liệu

- **Xem dữ liệu:** mở `database/03_useful_queries.sql`, đặt con trỏ vào **một** câu lệnh rồi nhấn `Ctrl+Enter`. Câu *Overlapping bookings* phải luôn trả về 0 dòng.
- **Làm mới toàn bộ dữ liệu:** chạy lại file `01`, rồi chạy file `02`.

---

## Lỗi thường gặp

| Thông báo lỗi | Cách sửa |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL chưa chạy. Bật service **MySQL80** (Windows → Services) |
| `Access denied for user 'root'@'localhost'` | `DB_PASSWORD` trong `.env` sai, hoặc chưa **lưu** file `.env` (tab còn dấu ●). Dùng đúng mật khẩu đăng nhập Workbench rồi nhấn `Ctrl+S`, server sẽ tự chạy lại. Dùng **XAMPP** thì root không có mật khẩu → để trống `DB_PASSWORD=` |
| `Unknown database 'FacilityBookingDB'` | Chưa chạy file 01 |
| `Table 'FacilityBookingDB.users' doesn't exist` | Chưa chạy file 01 |
| `Cannot find module ...` | Chưa chạy `npm install` trong thư mục `backend` |
| `EADDRINUSE :::3000` | Cổng 3000 đang bị chiếm. Tắt server cũ, hoặc đổi `PORT=3001` trong `.env` |
| `The start time must be in the future` | Ngày test đã qua. Sửa `@day` |
| `You can book at most 30 days ahead` | Ngày test xa quá 30 ngày. Sửa `@day` |
| `Choose one time slot, for example 07:01-07:30.` | Giờ gửi lên không phải một ca. Dùng đúng `07:01-07:30`, `07:31-08:00`, … |
| `Use your university email …` | Email sai định dạng. Dùng `tên + mã @usth.edu.vn`, ví dụ `anhnq2410071@usth.edu.vn` |
| `This room can only be booked by: TEACHER.` | Phòng này chỉ giảng viên đặt được. Admin đổi ở trang **Rooms** (ô tick vai trò) |
| `Only student emails can register…` | Trang đăng ký chỉ nhận email có mã sinh viên. Giảng viên/nhân viên nhờ admin tạo tài khoản |
| Ảnh phòng không hiện | Máy không vào được link ảnh. Hệ thống tự thay bằng ô xám — không phải lỗi |
| `capacity must be a whole number from 1 to 300.` | Sức chứa chỉ nhận số nguyên 1–300 |
| `Please log in first` / `Your login has expired` | Thiếu token hoặc token hết hạn (8 giờ). Đăng nhập lại |
| Tên tiếng Việt bị lỗi font | Chạy lại file 01 và 02 (đã có `utf8mb4` và `SET NAMES utf8mb4`) |
| Workbench báo lỗi **1175 safe update mode** | Chạy `SET SQL_SAFE_UPDATES = 0;` trước câu DELETE |
| Sửa file frontend mà trình duyệt vẫn hiện bản cũ | Nhấn **Ctrl+F5** để tải lại trang |
| Trang cứ quay về màn hình đăng nhập | Token hết hạn (8 giờ). Đăng nhập lại |

---

## Tóm tắt nhanh

```bash
# 1. Workbench: chạy database/01, rồi database/02
# 2. Backend:
cd backend
npm install
copy .env.example .env      # sửa DB_PASSWORD và JWT_SECRET
npm run dev
# 3. Mở http://localhost:3000 và đăng nhập (mật khẩu mẫu: Password@123)
```
