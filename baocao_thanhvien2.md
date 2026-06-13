# BÁO CÁO MODULE 2: GIẢI THUẬT TÌM KIẾM CÓ THÔNG TIN (A* 3D)
**Thành viên thực hiện**: Thành viên 2 (AI - Tìm đường)
**Mã số sinh viên**: *[Điền MSSV của bạn]*

---

## PHẦN I: BÁO CÁO LÝ THUYẾT & TOÁN HỌC (Dành cho báo cáo Word)

### 1. Giới thiệu Module Tìm đường
Module 2 chịu trách nhiệm tính toán lộ trình tối ưu kết nối giữa vị trí hiện tại của bệnh nhân (thường là sảnh tiếp đón hoặc cổng vào) tới phòng khám của Chuyên khoa được chỉ định bởi **Module 1 (Chẩn đoán lâm sàng)**. Do cấu trúc bệnh viện gồm nhiều tòa nhà và nhiều tầng, thuật toán tìm kiếm được nâng cấp từ A* 2D truyền thống lên **A* 3D trong không gian trạng thái đa tầng**.

---

### 2. Mô hình hóa bài toán tìm kiếm A* 3D
Để áp dụng giải thuật A*, bài toán được phát biểu dưới dạng toán học bằng các ký hiệu trực quan như sau:

* **Không gian trạng thái (State Space S)**: 
  Một trạng thái n ∈ S (n thuộc tập hợp S) được biểu diễn bằng bộ ba tọa độ:
  n = (x, y, z)
  Trong đó:
  * x ∈ [0, W - 1] (x thuộc đoạn từ 0 đến W - 1): Tọa độ ngang trên lưới (Cột).
  * y ∈ [0, H - 1] (y thuộc đoạn từ 0 đến H - 1): Tọ* **Tập các hành động khả thi (Actions A(n))**:
  Tại trạng thái n = (x, y, z), các hành động được phân thành hai nhóm:
  1. *Di chuyển phẳng (cùng tầng)*: Di chuyển đến 8 ô lân cận xung quanh * **Chi phí bước đi (Step Cost c(n, a, n'))**:
  Chi phí thực tế để chuyển từ trạng thái n(x, y, z) sang trạng thái kế cận n'(x', y', z') thông qua hành động a được tính như sau:
  * c(n, a, n') = 1.0 (nếu di chuyển ngang hoặc dọc trên cùng tầng)
  * c(n, a, n') = 1.414 (nếu di chuyển chéo trên cùng tầng)
  * c(n, a, n') = 1.0 + 7.0 = 8.0 (nếu di chuyển qua ô bị ùn tắc - congested)
  * c(n, a, n') = |z - z'| * c_floor + \delta(z, z') * w_elevator (nếu đổi tầng bằng thang máy/thang bộ - chi phí gồm quãng đường di chuyển dọc và thời gian chờ/chuyển tầng)
  
  Trong đó:
  * c_floor: Chi phí di chuyển vật lý giữa 2 tầng kề nhau.
  * w_elevator: Trọng số thời gian chờ đợi thang máy/thang bộ trung bình.
  * \delta(z, z') = 1 nếu z \neq z' (có đổi tầng) và = 0 nếu z = z' (không đổi tầng).

---

### 3. Thiết kế Hàm Heuristic h(n) Đa Tầng Cải Tiến (Elevator-Aware Heuristic)
Hàm Heuristic h(n) ước lượng chi phí nhỏ nhất từ trạng thái hiện tại n(x_n, y_n, z_n) đến đích s_goal(x_g, y_g, z_g). Hàm được thiết kế tối ưu hóa cho trường hợp di chuyển đa tầng bằng cách định hướng đi qua các điểm trung chuyển thẳng đứng (thang máy/thang bộ):

* **Trường hợp 1: Cùng tầng (z_n = z_g)**
  h(n) = h_2D(n, G)
  * *Khoảng cách Manhattan*: h_2D(n, G) = |x_n - x_g| + |y_n - y_g|
  * *Khoảng cách Euclidean*: h_2D(n, G) = sqrt((x_n - x_g)^2 + (y_n - y_g)^2)

* **Trường hợp 2: Khác tầng (z_n ≠ z_g)**
  Bất kỳ lộ trình di chuyển khác tầng nào cũng bắt buộc phải đi qua ít nhất một nút trung chuyển E (thang máy hoặc thang bộ). Do đó, heuristic được tính bằng tổng quãng đường ngắn nhất từ vị trí hiện tại tới E, cộng chi phí đổi tầng (gồm thời gian chờ), cộng quãng đường từ E tới đích:
  h(n) = min_{E ∈ E_all} ( h_2D(n, E) + |z_n - z_g| * c_floor + w_elevator + h_2D(E, G) )
  
  Trong đó:
  * E_all: Tập hợp các ô thang máy hoặc thang bộ có mặt trên lưới bản đồ.
  * h_2D(n, E): Khoảng cách 2D từ trạng thái hiện tại đến nút trung chuyển E.
  * h_2D(E, G): Khoảng cách 2D từ nút trung chuyển E đến đích G.
  * |z_n - z_g| * c_floor: Chi phí di chuyển thẳng đứng tối thiểu giữa các tầng.
  * w_elevator: Trọng số chờ đợi trung bình (chỉ cộng vào khi z_n ≠ z_g).

---

### 4. Chứng minh toán học tính Chấp nhận được (Admissibility)
Một hàm Heuristic h(n) được coi là **admissible (chấp nhận được)** nếu ước lượng của nó không bao giờ vượt quá chi phí thực tế nhỏ nhất để đi từ trạng thái n đến đích G. Nghĩa là:
h(n) ≤ h*(n) với mọi trạng thái n (h* là chi phí thực tế tối ưu)

**Chứng minh**:
1. Gọi h*(n) là chi phí thực tế ngắn nhất đi từ n(x_n, y_n, z_n) đến G(x_g, y_g, z_g).
2. **Xét trường hợp z_n = z_g (cùng tầng)**:
   * h(n) = h_2D(n, G) là khoảng cách hình học (Manhattan hoặc Euclidean) thẳng từ n đến G.
   * Do trên đường đi thực tế có thể có tường chắn hoặc ô ùn tắc, chi phí thực tế h*(n) luôn lớn hơn hoặc bằng khoảng cách hình học phẳng.
   * Vì vậy: h(n) = h_2D(n, G) ≤ h*(n).
3. **Xét trường hợp z_n ≠ z_g (khác tầng)**:
   * Mọi đường đi thực tế từ n đến G bắt buộc phải chọn đi qua ít nhất một trạm trung chuyển (thang máy hoặc thang bộ) thực tế, gọi trạm đó là E*.
   * Chi phí thực tế tối ưu h*(n) sẽ là: h*(n) = h*_2D(n, E*) + |z_n - z_g| * c_floor + w_elevator + h*_2D(E*, G) (vì đổi tầng thực tế bắt buộc phải mất chi phí di chuyển dọc và chờ thang máy ít nhất là w_elevator).
   * Do khoảng cách hình học phẳng h_2D luôn là ngắn nhất (đường chim bay), ta có:
     h_2D(n, E*) ≤ h*_2D(n, E*) và h_2D(E*, G) ≤ h*_2D(E*, G).
   * Cộng các vế, ta được:
     h_2D(n, E*) + |z_n - z_g| * c_floor + w_elevator + h_2D(E*, G) ≤ h*(n).
   * Vì h(n) là giá trị nhỏ nhất (min) trên toàn bộ tập hợp E_all, và E* thuộc E_all, ta có:
     h(n) = min_{E ∈ E_all} ( h_2D(n, E) + |z_n - z_g| * c_floor + w_elevator + h_2D(E, G) )
     h(n) ≤ h_2D(n, E*) + |z_n - z_g| * c_floor + w_elevator + h_2D(E*, G)
   * Từ đó suy ra: h(n) ≤ h*(n).
4. Kết luận: Heuristic h(n) cải tiến luôn thỏa mãn tính chất Admissible, đảm bảo thuật toán A* luôn tìm ra lời giải tối ưu toàn cục.

---

### 5. Chứng minh tính Nhất quán (Consistency / Monotonicity)
Hàm Heuristic h(n) được coi là **nhất quán (consistent)** nếu với mọi trạng thái n và mọi trạng thái kế cận n' của nó (được tạo ra bởi hành động a), ước lượng heuristic thỏa mãn bất đẳng thức:
h(n) ≤ c(n, a, n') + h(n')  <=>  h(n) - h(n') ≤ c(n, a, n')

**Chứng minh**:
* **Trường hợp 1: Hành động a di chuyển phẳng trên cùng mặt sàn (z_n = z_n')**
  * *Nếu z_n = z_g*:
    h(n) - h(n') = h_2D(n, G) - h_2D(n', G) ≤ h_2D(n, n') (theo bất đẳng thức tam giác).
    Do c(n, a, n') là chi phí thực tế di chuyển giữa hai ô kề nhau (≥ 1.0 hoặc 1.414), luôn có h_2D(n, n') ≤ c(n, a, n'). Do đó: h(n) - h(n') ≤ c(n, a, n').
  * *Nếu z_n ≠ z_g*:
    Gọi E' là trạm trung chuyển tối ưu từ n' đến G (nghĩa là E' là phần tử làm tối thiểu hóa h(n')).
    h(n') = h_2D(n', E') + |z_n' - z_g| * c_floor + w_elevator + h_2D(E', G).
    Theo định nghĩa hàm min, đối với trạng thái n, ta có:
    h(n) ≤ h_2D(n, E') + |z_n - z_g| * c_floor + w_elevator + h_2D(E', G).
    Vì z_n = z_n', ta có |z_n - z_g| = |z_n' - z_g|. Trừ hai phương trình:
    h(n) - h(n') ≤ h_2D(n, E') - h_2D(n', E')
    Theo bất đẳng thức tam giác hình học: h_2D(n, E') - h_2D(n', E') ≤ h_2D(n, n').
    Mà h_2D(n, n') ≤ c(n, a, n'). Do đó: h(n) - h(n') ≤ c(n, a, n').

* **Trường hợp 2: Hành động a di chuyển dọc (đổi tầng tại trạm trung chuyển E_curr, z_n' = z_n ± k)**
  Tại vị trí này, n và n' có cùng tọa độ 2D là (x_e, y_e) trùng với trạm trung chuyển E_curr.
  * *Nếu z_n' = z_g (đến đúng tầng chứa đích)*:
    n' lúc này nằm ở tầng của đích, nên h(n') = h_2D(n', G) = h_2D(E_curr, G).
    Đối với n (nằm ở tầng khác), ta chọn E = E_curr làm trạm trung chuyển trong biểu thức h(n):
    h(n) ≤ h_2D(n, E_curr) + |z_n - z_g| * c_floor + w_elevator + h_2D(E_curr, G)
    Do n trùng với E_curr về mặt 2D, h_2D(n, E_curr) = 0.
    Ngoài ra, |z_n - z_g| = |z_n - z_n'| (do z_n' = z_g).
    Do đó: h(n) ≤ |z_n - z_n'| * c_floor + w_elevator + h_2D(E_curr, G) = c(n, a, n') + h(n') (vì c(n, a, n') = |z - z'| * c_floor + w_elevator khi z_n ≠ z_n').
    Tương đương: h(n) - h(n') ≤ c(n, a, n').
  * *Nếu z_n' ≠ z_g (vẫn ở tầng khác đích)*:
    Gọi E' là trạm trung chuyển tối ưu từ n' đến G. Ta có:
    h(n') = h_2D(n', E') + |z_n' - z_g| * c_floor + w_elevator + h_2D(E', G).
    Chọn E = E' trong biểu thức h(n), ta có:
    h(n) ≤ h_2D(n, E') + |z_n - z_g| * c_floor + w_elevator + h_2D(E', G).
    Do n và n' có cùng tọa độ mặt phẳng 2D, h_2D(n, E') = h_2D(n', E').
    Trừ hai phương trình:
    h(n) - h(n') ≤ (|z_n - z_g| - |z_n' - z_g|) * c_floor
    Theo bất đẳng thức trị tuyệt đối: |z_n - z_g| - |z_n' - z_g| ≤ |z_n - z_n'|.
    Do đó: h(n) - h(n') ≤ |z_n - z_n'| * c_floor ≤ |z_n - z_n'| * c_floor + \delta(z_n, z_n') * w_elevator = c(n, a, n').
    Tương đương: h(n) - h(n') ≤ c(n, a, n').

*Kết luận*: Giải thuật A* sử dụng hàm Heuristic Elevator-Aware luôn đạt tính nhất quán (Consistent). Các node khi đã đưa vào Closed Set sẽ được đảm bảo là có đường đi ngắn nhất và không cần phải mở lại (re-open), tối ưu hóa tốc độ thực thi.

---

## PHẦN II: Ý TƯỞNG THIẾT KẾ SLIDE THUYẾT TRÌNH (Dành cho Slide)

Dưới đây là thiết kế chi tiết 5 Slide thuyết trình dành riêng cho phần của bạn (Thành viên 2) để trình bày trước lớp:

### 🖥️ Slide 1: Đặt vấn đề & Nhiệm vụ Thành viên 2
* **Tiêu đề**: Module 2: Định tuyến Đa chặng & Thuật toán A* 3D
* **Nội dung trực quan**:
  * Sơ đồ khối tổng thể hoặc ảnh 3D mô phỏng sơ đồ bệnh viện đa tầng.
  * Tóm tắt nhiệm vụ chính:
    1. Thiết lập Không gian trạng thái 3 chiều (x, y, z).
    2. Cài đặt thuật toán tìm kiếm có thông tin A* 3D.
    3. Thiết kế hàm Heuristic h(n) cải tiến để tối ưu hóa di chuyển liên tầng.
* **Lời thoại thuyết trình**: *"Chào thầy cô và các bạn, sau khi Module 1 xác định được các chuyên khoa cần khám, nhiệm vụ của em ở Module 2 là giải quyết bài toán định tuyến tối ưu để đưa bệnh nhân đi qua các phòng khám nằm ở các tòa nhà và tầng khác nhau một cách ngắn nhất..."*

---

### 🖥️ Slide 2: Mô hình hóa Toán học Bài toán
* **Tiêu đề**: Mô hình hóa Trạng thái & Chi phí bước đi (Step Cost)
* **Nội dung trực quan**:
  * Công thức Trạng thái: n = (x, y, z).
  * Bảng tóm tắt Chi phí bước đi c(n, a, n'):
    * Đi thẳng: 1.0 | Đi chéo: 1.414
    * Vùng ùn tắc: +7.0 (Phạt tránh vùng đông đúc)
    * Đi thang máy/thang bộ (leo tầng): |z - z'| * c_floor (Chi phí tính theo khoảng cách vật lý thẳng đứng)
* **Lời thoại thuyết trình**: *"Để giải quyết bài toán bằng thuật toán AI, em đã mô hình hóa không gian bệnh viện thành lưới 3D, trong đó mỗi trạng thái gồm tọa độ hàng, cột và chỉ số tầng. Đặc biệt, chi phí bước đi được tích hợp thêm trọng số phạt khi đi vào vùng ùn tắc và quãng đường di chuyển dọc thực tế giữa các tầng..."*

---

### 🖥️ Slide 3: Thiết kế Hàm Heuristic h(n) Đa Tầng Cải Tiến
* **Tiêu đề**: Hàm đánh giá Heuristic h(n) Elevator-Aware
* **Nội dung trực quan**:
  * Công thức chính:
    * Khi cùng tầng: h(n) = h_2D(n, G)
    * Khi khác tầng: h(n) = min_{E} ( h_2D(n, E) + |z_n - z_g| * c_floor + h_2D(E, G) )
  * Nhãn giải thích từng thành phần:
    * h_2D: Khoảng cách hình học 2D.
    * E: Các vị trí thang máy, thang bộ trung chuyển.
    * |z_n - z_g| * c_floor: Quãng đường chuyển tầng.
* **Lời thoại thuyết trình**: *"Hàm Heuristic đóng vai trò quyết định tốc độ và độ chính xác của A*. Heuristic cải tiến của em tự động tính toán và lựa chọn đi qua trạm trung chuyển (thang máy/thang bộ) tối ưu nhất, thay vì chỉ ước lượng thô bằng hình chiếu phẳng 2D. Điều này giúp A* hội tụ nhanh hơn về hướng thang máy thực tế..."*

---

### 🖥️ Slide 4: Chứng minh Toán học (Admissible & Consistent)
* **Tiêu đề**: Chứng minh tính Chấp nhận được & Nhất quán
* **Nội dung trực quan**:
  * Dòng chữ lớn khẳng định: **Heuristic là Chấp nhận được (Admissible) & Nhất quán (Consistent)**.
  * Tóm tắt 2 ý chứng minh chính:
    1. *Admissible*: h(n) ≤ h*(n) do khoảng cách đi qua thang máy hình học phẳng luôn ngắn hơn hoặc bằng đường đi thực tế có vật cản.
    2. *Consistent*: h(n) - h(n') ≤ c(n, a, n') luôn đúng nhờ bất đẳng thức tam giác và chi phí di chuyển dọc thực tế.
  * *Kết luận*: A* luôn tìm ra đường đi ngắn nhất mà không cần duyệt lại các ô đã đóng.
* **Lời thoại thuyết trình**: *"Về mặt lý thuyết toán học, em đã chứng minh được hàm Heuristic thiết kế thỏa mãn cả hai tính chất quan trọng: Tính chấp nhận được và tính nhất quán. Điều này đảm bảo thuật toán A* của nhóm luôn tìm ra lộ trình ngắn nhất một cách ổn định nhất..."*

---

### 🖥️ Slide 5: Demo Chương trình & Kết quả
* **Tiêu đề**: Thực nghiệm & Đánh giá Hiệu năng
* **Nội dung trực quan**:
  * Ảnh chụp màn hình giao diện ứng dụng Web biểu diễn đường đi tối ưu.
  * Sơ đồ minh họa đường đi leo tầng qua thang máy tại ô (2, 9) tòa Q.
  * Đánh giá hiệu năng: So sánh số nút duyệt (Explored Nodes) giữa Heuristic hình chiếu thô và Heuristic cải tiến (giảm rõ rệt số lượng nút thừa).
* **Lời thoại thuyết trình**: *"Đây là kết quả thực nghiệm chương trình chạy bằng HTML/CSS và JavaScript. Thuật toán đã dẫn đường thành công đưa người dùng đi từ Tầng 0 đến đúng ô thang máy, chuyển thẳng đứng lên Tầng 2 rồi tìm đường tới phòng khám đích. Nhờ Heuristic Elevator-Aware mới, số lượng ô phải duyệt qua được giảm đáng kể, giúp tăng tốc độ phản hồi trên ứng dụng..."*
