# Luồng Dữ Liệu (Data Flow) - Project Tạo Truyện Tranh Tư Động

Tài liệu này mô tả chi tiết luồng xử lý dữ liệu của chương trình, từ việc đọc kịch bản văn bản (như `tam_cam.txt`, `thanh_giong.txt`) cho đến khi xuất ra các trang truyện tranh hoàn chỉnh.

## Sơ Đồ Tổng Quan
\`\`\`mermaid
flowchart TD
    A[Nhập câu truyện (TXT/Topic)] -->|StoryService| B[Kế hoạch & Thế Giới giả tưởng Plan JSON]
    B -->|LayoutService| C[Phân bổ khung hình Layout JSON]
    C -->|StoryService| D[Kịch bản chi tiết Screenplay JSON]
    D -->|ImageService| E[Thiết kế nhân vật Character Sheets]
    D -->|PromptBuilder| F[Prompt trang Pages/Panels Prompts JSON]
    E --> F
    F -->|ImageService| G[Tạo ảnh từng khung hình AI Pages/Outputs]
    G -->|RenderService| H[Ghép khung trang Final Pages ảnh hoàn chỉnh]
    C --> F
\`\`\`

## Các Bước Xử Lý Chi Tiết

### 1. Lên Kế Hoạch & Xây Dựng Thế Giới (Planning & World Building)
- **Đầu vào:** File text chứa nội dung truyện (ví dụ: `tam_cam.txt`), chủ đề (topic), số lượng trang (nếu có), và phong cách nghệ thuật (style).
- **Trình xử lý:** `StoryService.initialize_story_plan()`
- **Công việc:** AI đọc toàn bộ nội dung truyện (text gốc), phân tích bối cảnh, phong cách nghệ thuật, và tóm tắt nhân vật. Xác định tổng số lượng panel (khung hình) tối đa.
- **Đầu ra:** Dữ liệu kịch bản kế hoạch dạng object đực lưu vào `screenplay/plan.json`.

### 2. Thiết Kế Bố Cục Khung Tranh (Layout Generation)
- **Đầu vào:** Số lượng khung hình tính từ plan hoặc cấu hình của người dùng.
- **Trình xử lý:** `LayoutService.generate_full_layout()`
- **Công việc:** Chương trình sẽ tính toán chia các khung hình vào từng trang (panels_dist) và tạo ra dữ liệu mô tả kích thước, toạ độ, phân rã layout (chẳng hạn trang 1 có 5 khung, trang 2 có 6 khung...).
- **Đầu ra:** File `layout.json` lưu giữ thông số cắt ghép và tọa độ các panel trong mọi trang.

### 3. Đạo Diễn Phân Cảnh (Scene Directing)
- **Đầu vào:** Dữ liệu kế hoạch (`plan_data`) và dữ liệu bố cục (`layout.json`).
- **Trình xử lý:** `StoryService.direct_scenes()`
- **Công việc:** Trình đạo diễn sẽ chia đoạn văn bản thành từng cảnh nhỏ khớp vào từng panel đã được phân bố ở `layout.json`.
- **Đầu ra:** File kịch bản kỹ thuật `screenplay_final.json` (ở một số phiên bản gọi là `screenplay_parsed.json`) và file `screenplay.md` tổng hợp chi tiết miêu tả của từng panel.

### 4. Tạo Hình Nhân Vật (Character Sheets)
- **Đầu vào:** Mảng các ký tự nhân vật trích xuất từ cấu trúc `screenplay_final.json`, file hướng dẫn phong cách art (`style_guide`).
- **Trình xử lý:** `ImageService.generate_character_sheets()`
- **Công việc:** Dựng ra sheet minh hoạ cho các nhân vật nhằm đảm bảo sự nhất quán cho AI tạo hình.
- **Đầu ra:** Các file ảnh thiết kế nhân vật được lưu trong mục `ai_chars/` (hoặc `chars_output/`).

### 5. Tạo Prompts Trang (Build Page Prompts)
- **Đầu vào:** Kịch bản đã phân cảnh (`scr_data`), bố cục `layout.json` và thông tin về thiết kế nhân vật (`ai_chars`).
- **Trình xử lý:** `prompt_builder.map_screenplay_to_pages()`
- **Công việc:** Maps mapping mỗi panel trên trang với một prompt dành riêng cho AI Image Generator kèm thông tin narraction (dẫn truyện).
- **Đầu ra:** File `pages_with_prompts.json` (hoặc `panels_with_prompts.json`) làm chuẩn cho bộ tạo ảnh.

### 6. Khởi Tạo Hình Ảnh Khung Tranh (Generate Panels/Pages images)
- **Đầu vào:** Data file prompts (`pages_with_prompts.json`).
- **Trình xử lý:** `ImageService.generate_pages()`
- **Công việc:** Cung cấp text prompt cho mô hình AI vẽ ảnh để xuất ra các khung ảnh đơn lẻ hoặc trang thô.
- **Đầu ra:** File ảnh rời vẽ các khung tranh lưu tại thư mục `ai_pages/` (hoặc `ai_output/`).

### 7. Hoàn Thiện Trang Truyện (Finalizing Pages)
- **Đầu vào:** Dữ liệu JSON map (`pages_with_prompts.json`) và hình ảnh sinh ra từ bước 6 (`ai_pages/`).
- **Trình xử lý:** `RenderService.finalize_pages()`
- **Công việc:** Lấy các ảnh gốc, ghép dán theo toạ độ / kích thước đã định hình ở bước 2 `layout.json`. Chèn thêm text bubbles, hội thoại, chữ tự sự (narration) vào trang.
- **Đầu ra:** Ảnh truyện tranh thành phẩm hoàn thiện nằm ở thư mục `final_pages/`. (Xong pipeline).
