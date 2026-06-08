CHƯƠNG 1: TỔNG QUAN DỰ ÁN
1.1. Hiện trạng và Lý do đầu tư
Trong bối cảnh vận hành của các doanh nghiệp và tổ chức quy mô nhỏ, việc trao đổi thông tin nội bộ hiện nay thường phụ thuộc hoàn toàn vào các nền tảng mạng xã hội hoặc ứng dụng nhắn tin công cộng bên thứ ba như Zalo, Facebook. Cách tiếp cận này tuy mang lại sự tiện lợi tức thời nhưng lại đặt ra nhiều rủi ro và thách thức lớn về an toàn thông tin:

Mất kiểm soát luồng dữ liệu: Tài liệu, văn bản và các thông tin chiến lược của đơn vị bị lưu trữ tập trung trên máy chủ của các nhà cung cấp dịch vụ công cộng, không có cơ chế mã hóa hay phân quyền sở hữu tuyệt đối.

Rủi ro lộ lọt thông tin: Cơ chế chia sẻ tệp tin trên các ứng dụng công cộng cho phép bất kỳ ai có liên kết (link) đều có thể truy cập và tải xuống, không thể giới hạn quyền truy cập chỉ cho nhân sự nội bộ.

Chính sách lưu trữ không ổn định: Các nền tảng miễn phí thường tự động xóa tệp tin sau một thời gian ngắn hoặc áp đặt các gói phí lưu trữ, gây gián đoạn công việc khi cần tra cứu lại dữ liệu cũ.

Để giải quyết triệt để các vấn đề trên, việc xây dựng một hệ thống truyền thông độc lập, bảo mật cao và hoàn toàn thuộc quyền kiểm soát của tổ chức là điều vô cùng cấp thiết. Ứng dụng chat nội bộ được thiết kế nhằm tối ưu hóa tính bảo mật dữ liệu, cô lập luồng thông tin với môi trường bên ngoài nhưng vẫn đảm bảo trải nghiệm người dùng mượt mà và chi phí vận hành ở mức tối thiểu.

1.2. Mục tiêu dự án
Dự án hướng tới việc thiết kế và triển khai một giải pháp phần mềm toàn diện với các mục tiêu cốt lõi sau:

Bảo mật dữ liệu tuyệt đối: Đảm bảo toàn bộ tin nhắn và tệp tin chia sẻ được lưu trữ an toàn trên các hạ tầng điện toán đám mây đặt ngoài phạm vi lãnh thổ Việt Nam (Mỹ và Singapore). Áp dụng cơ chế phân quyền truy cập nghiêm ngặt, chỉ người dùng được xác thực mới có quyền khai thác dữ liệu.

Tối ưu hóa chi phí: Tận dụng triệt để các gói dịch vụ miễn phí (Free Tier) từ những nhà cung cấp cloud uy tín thế giới nhằm đưa chi phí đầu tư ban đầu và chi phí duy trì hệ thống về mức 0đ trong những năm đầu vận hành.

Đơn giản hóa phân phối: Sử dụng mô hình ứng dụng web lũy tiến (Progressive Web App - PWA) để ứng dụng có thể chạy mượt mà trên cả máy tính và thiết bị di động (iOS, Android) mà không cần tốn chi phí duy trì tài khoản nhà phát triển (99$/năm cho Apple) hay trải qua quy trình kiểm duyệt phức tạp của các kho ứng dụng.

Đảm bảo tính realtime và thông báo: Cung cấp trải nghiệm trò chuyện tức thời với độ trễ thấp, đồng thời tích hợp hệ thống thông báo đẩy (Push Notification) hoạt động ổn định trên cả thiết bị di động và máy tính ngay cả khi ứng dụng đã đóng.

1.3. Phạm vi dự án
Dự án được giới hạn rõ ràng về quy mô đối tượng và danh mục tính năng để tập trung nguồn lực hoàn thiện chất lượng hệ thống một cách tốt nhất:

Đối tượng phục vụ: Nhóm người dùng nội bộ quy mô nhỏ từ 6-7 nhân sự, sử dụng hỗn hợp các thiết bị bao gồm 1 thiết bị Android, 5-6 thiết bị iPhone (iOS) và các máy tính cá nhân (Windows/Mac).

Tính năng trong phạm vi triển khai (In-Scope):

Xác thực và Quản trị: Cơ chế đăng nhập bằng tài khoản (Email/Mật khẩu) do Admin cấp phát, tuyệt đối không mở đăng ký tự do để kiểm soát thành viên.

Giao tiếp: Trò chuyện văn bản thời gian thực (Chat 1-1 và Chat nhóm toàn công ty), hỗ trợ hiển thị trạng thái hoạt động, trạng thái tin nhắn (đã gửi, đã đọc), typing indicator, phản hồi và xóa tin nhắn.

Quản lý tệp tin: Hỗ trợ đính kèm và truyền tải mọi định dạng tệp (PDF, Word, Excel, ZIP, hình ảnh, video) với dung lượng tối đa 100MB/tệp, quản lý tệp theo luồng bảo mật nghiêm ngặt.

Thông báo đẩy: Hệ thống Web Push API đồng bộ trên Android, Desktop và iOS (yêu cầu từ iOS 16.4 trở lên thông qua tính năng Add to Home Screen).

Bảng điều khiển Admin: Công cụ quản lý thành viên, reset mật khẩu, theo dỗi dung lượng hệ thống và dọn dẹp các tệp tin cũ.

Tính năng nằm ngoài phạm vi triển khai (Out-of-Scope):

Hệ thống gọi thoại (Voice Call) và gọi video (Video Call). Nhân sự sẽ tiếp tục sử dụng hệ thống viễn thông truyền thống hoặc ứng dụng sẵn có khi có nhu cầu gọi điện.

1.4. Lựa chọn giải pháp công nghệ
Hệ thống được xây dựng trên một Tech Stack hiện đại, phân tán nhằm tận dụng tối đa thế mạnh của từng nền tảng, đảm bảo tính ổn định và bài toán chi phí 0đ:

Frontend (Next.js PWA): Đóng vai trò là lớp giao diện và xử lý logic phía máy khách. Next.js hỗ trợ tối ưu hóa hiệu năng render, kết hợp với các cấu hình PWA để biến ứng dụng web thành một ứng dụng có thể "Cài đặt vào màn hình chính" (Add to Home Screen) trên thiết bị di động, hoạt động độc lập giống như một ứng dụng native. Toàn bộ phần giao diện Frontend sẽ được triển khai (Deploy) trên hạ tầng toàn cầu của Vercel với mức chi phí miễn phí.

Backend (Node.js + Express + Socket.io): Xử lý luồng logic nghiệp vụ, quản lý phiên làm việc (Session) của người dùng qua JWT Token và duy trì các kết nối Socket thường trực để phục vụ cơ chế chat realtime. Do tính chất đặc thù của WebSocket cần một môi trường server chạy liên tục 24/24 (điều mà các kiến trúc Serverless của Vercel không đáp ứng được), Backend sẽ được deploy độc lập trên nền tảng Render dưới dạng một dịch vụ Web Service chạy thường trực.

Cơ sở dữ liệu (Supabase / PostgreSQL): Sử dụng hệ quản trị cơ sở dữ liệu quan hệ PostgreSQL được lưu trữ trên nền tảng đám mây Supabase tại trung tâm dữ liệu Singapore. Supabase cung cấp sẵn gói Free Tier 500MB dữ liệu, hoàn toàn dư dả để lưu trữ hàng triệu tin nhắn văn bản và metadata của hệ thống chat nội bộ trong nhiều năm.

Kho lưu trữ tệp tin (Cloudflare R2): Toàn bộ tệp tin, hình ảnh, video do người dùng gửi lên sẽ không đi qua server Backend nhằm tránh gây nghẽn băng thông, mà được đẩy trực tiếp từ máy khách lên Cloudflare R2 thông qua cơ chế Signed URL bảo mật. Hệ thống lưu trữ của R2 đặt tại Mỹ, cung cấp 10GB dung lượng miễn phí hoàn toàn và đặc biệt là không tính phí băng thông tải ra (Zero Egress Fees). Đây là yếu tố then chốt giúp duy trì chi phí hệ thống ở mức 0đ khi người dùng tải file liên tục.

Hệ thống thông báo (Web Push API + VAPID): Sử dụng các tiêu chuẩn web quốc tế để gửi tín hiệu thông báo từ Backend trực tiếp tới trình duyệt hoặc Service Worker chạy ngầm trên thiết bị của người dùng mà không cần thông qua các dịch vụ trung gian có thu phí.

CHƯƠNG 2: PHÂN TÍCH YÊU CẦU
Chương này bóc tách chi tiết các chức năng hệ thống cần phải có để đáp ứng đúng nghiệp vụ, cũng như các tiêu chuẩn kỹ thuật (phi chức năng) để đảm bảo ứng dụng chạy mượt mà, ổn định.

2.1. Yêu cầu chức năng (Functional Requirements)
Hệ thống được chia thành 4 nhóm nghiệp vụ (Module) cốt lõi:

Nhóm 1: Quản lý tài khoản & Xác thực (Authentication & User Management)

Đăng nhập/Đăng xuất: Người dùng đăng nhập bằng Email và Mật khẩu. Phiên đăng nhập (session) tự động hết hạn sau 8 giờ không hoạt động.

Quản lý hồ sơ cá nhân: Người dùng có thể tự cập nhật tên hiển thị, ảnh đại diện (avatar) và đổi mật khẩu.

Trạng thái hoạt động: Hệ thống tự động cập nhật và hiển thị trạng thái của người dùng (Online / Offline / Bận).

Quản trị viên (Admin): Admin có đặc quyền tạo mới tài khoản cho nhân viên (không có tính năng đăng ký tự do để bảo mật), xóa tài khoản, và reset mật khẩu khi nhân viên quên.

Nhóm 2: Tương tác & Nhắn tin (Messaging Module)

Chat 1-1 và Chat nhóm: Hỗ trợ nhắn tin riêng tư giữa 2 người hoặc nhắn tin trong nhóm chung của toàn công ty.

Tương tác thời gian thực (Realtime): Hiển thị trạng thái "đang soạn tin..." (typing indicator), trạng thái tin nhắn (đã gửi, đã xem - seen/delivered).

Thao tác với tin nhắn: Cho phép thả cảm xúc (emoji reactions), trả lời (reply/trích dẫn) tin nhắn cụ thể, xóa tin nhắn đã gửi.

Tìm kiếm & Bộ lọc kho lưu trữ (Media Filter): * Lưu trữ toàn bộ lịch sử trò chuyện và cho phép tìm kiếm lại tin nhắn cũ bằng từ khóa.

Tích hợp tính năng phân loại và lọc tìm kiếm nâng cao ngay trong hội thoại, cho phép người dùng lọc nhanh danh sách các dữ liệu đã chia sẻ theo từng tab riêng biệt bao gồm: Hình ảnh/Video, Tệp tin (Files), và Đường dẫn liên kết (Links) tương tự như cơ chế tìm kiếm trong tin nhắn của các app chat chuyên nghiệp.

Nhóm 3: Quản lý Tệp tin (File Management Module)

Tải lên & Hiển thị: Hỗ trợ gửi mọi định dạng tệp (PDF, Word, Excel, ZIP...). Hỗ trợ xem trước (preview) trực tiếp hình ảnh và video trong khung chat (video không auto-play).

Giới hạn dung lượng: Dung lượng tối đa cho mỗi tệp tải lên là 100MB (có thể tùy chỉnh).

Lưu trữ lâu dài & Kiểm soát truy cập: Tệp tin được tải lên Cloudflare R2 ở dạng nguyên bản để tối ưu tốc độ xử lý. Toàn bộ tệp tin được lưu trữ cố định và lâu dài trong Private Bucket, không áp dụng cơ chế tự động hết hạn của đường dẫn để người dùng có thể tìm kiếm và tải lại bất cứ khi nào cần thiết. Quyền truy cập tệp được xác thực trực tiếp qua phiên đăng nhập của tài khoản (chỉ tài khoản nội bộ hợp lệ mới có quyền đọc và tải file từ hệ thống).

Quản lý lưu trữ (Dành cho Admin): Bảng điều khiển cho phép Admin theo dõi tổng dung lượng đã sử dụng trên R2 và chủ động xóa các tệp tin cũ/rác để giải phóng không gian lưu trữ khi cần thiết.

Nhóm 4: Hệ thống Thông báo (Push Notification Module)

Thông báo đa nền tảng: Gửi thông báo đẩy (Web Push) tới Android, Windows/Mac (trình duyệt Chrome/Edge) và iOS (yêu cầu iOS 16.4+ và đã Add to Home Screen).

Hiển thị thông báo: Thông báo nổi ngay cả khi ứng dụng đã đóng/chạy ngầm, kèm theo âm thanh và rung (trên mobile).

Hành động trên thông báo: Hiển thị avatar, tên người gửi, nội dung vắn tắt (hoặc "📎 Đã gửi file") và badge (số lượng tin chưa đọc) trên icon ứng dụng. Bấm vào thông báo sẽ mở thẳng vào phòng chat tương ứng.

2.2. Yêu cầu phi chức năng (Non-functional Requirements)
Bảo mật & An toàn dữ liệu:

Đường truyền tín hiệu phải được mã hóa 100% qua chuẩn HTTPS.

Xác thực các API endpoint bằng JWT (JSON Web Token) bao gồm Access Token và Refresh Token.

Tài nguyên tệp tin tuyệt đối không được phép truy cập công khai (Public Access), đảm bảo chỉ người dùng đã đăng nhập hệ thống mới gọi được file.

Phòng chống tấn công Spam bằng cơ chế Rate Limiting cho các API gửi tin nhắn và upload file.

Hiệu năng & Khả năng mở rộng:

Độ trễ tin nhắn (Realtime latency) phải dưới 500ms trong điều kiện mạng ổn định.

Không truyền luồng tệp tin (file stream) qua backend (Node.js) để tránh gây quá tải CPU/RAM của server. Client phải tương tác trực tiếp hạ tầng Cloudflare R2 dựa trên quyền xác thực.

Khả năng tương thích (Compatibility):

Giao diện responsive, tự động co giãn tối ưu cho màn hình iPhone, điện thoại Android và màn hình máy tính.

Hoạt động mượt mà, ổn định trên Safari (iOS) và Chrome/Edge với tư cách là một PWA.

2.3. Biểu đồ Use Case (Phân quyền & Tương tác)
Bảng ma trận Use Case mô tả quyền hạn và các hành động mà từng vai trò (Actor) có thể thực hiện trong hệ thống:

Tên chức năng (Use Case),Nhân viên (Member),Quản trị viên (Admin)
Đăng nhập / Đăng xuất,✅,✅
Đổi mật khẩu cá nhân / Cập nhật Avatar,✅,✅
"Nhắn tin (1-1, Group) / Xóa tin nhắn cá nhân",✅,✅
"Tìm kiếm tin nhắn & Lọc phân loại (Ảnh, File, Link)",✅,✅
Gửi File / Tra cứu và Tải lại File cũ,✅,✅
Nhận Push Notification,✅,✅
Tạo mới / Xóa / Khóa tài khoản nhân viên,❌,✅
Reset mật khẩu cho tài khoản khác,❌,✅
Xem báo cáo dung lượng Cloudflare R2,❌,✅
Xóa file trên hệ thống để dọn rác,❌,✅