# 📜 NHẬT KÝ PHÁT TRIỂN & CẤU TRÚC HỆ THỐNG - V-STYLER PRO

## 1. THÔNG TIN DỰ ÁN
*   **Tên:** V-Styler Pro (Virtual Fashion Synthesis)
*   **Mục tiêu:** Ứng dụng cao cấp phối đồ ảo, nhận diện DNA nhân vật và tổng hợp hình ảnh thời trang chất lượng 4K.
*   **Cốt lõi AI:** Google Gemini 3 Pro (Hình ảnh) & Gemini 3 Flash (Phân tích DNA).

---

## 2. CÁCH SỬA LỖI BUILD (FIXING CLOUD BUILD ERROR)
Lỗi "build.service_account specified..." xảy ra do cấu hình Logging của Trigger trên Google Cloud. Để sửa:

1.  Vào **Google Cloud Console** -> **Cloud Build** -> **Triggers**.
2.  Tìm Trigger có tên liên quan đến `app-tao-anh` và nhấn nút **Edit**.
3.  Cuộn xuống phần **Logging**.
4.  Thay đổi từ **Default** sang **Cloud Logging only**.
5.  Nhấn **Save** và chạy lại Build (Retry/Re-run).

Ngoài ra, tôi đã thêm file `cloudbuild.yaml` để bạn có thể chuyển kiểu build từ "Dockerfile" sang "Cloud Build configuration file" trong phần cài đặt Trigger để hệ thống tự xử lý lỗi này.

---

## 3. CẤU TRÚC KỸ THUẬT (STACK)
*   **Frontend:** React (TSX), Tailwind CSS.
*   **Build Tool:** Vite.
*   **Lưu trữ:** IndexedDB.
*   **Triển khai:** Docker -> Google Cloud Run.

---

## 4. LỊCH SỬ SỬA LỖI (FIX LOG)
*   **2025-05-24:** Thêm `cloudbuild.yaml` và `Dockerfile` (nội dung thực tế).
*   **2025-05-24:** Sửa lỗi màn hình trắng bằng cách chuyển hoàn toàn sang `IndexedDB`.
*   **2025-05-24:** Fix lỗi build Docker do sai định dạng tag name.

---
*Ngày cập nhật cuối: 2025-05-24*
*Trạng thái: Ready for Deployment*