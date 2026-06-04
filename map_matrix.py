import numpy as np

class GroundFloorMap:
    def __init__(self):
        # Hằng số định nghĩa trạng thái ô lưới
        self.WALKABLE = 0
        self.OBSTACLE = 1
        
        # Bản đồ trực quan của mặt đất (Z = 0)
        # Ký hiệu: '1' là Tòa nhà/Vật cản, '0' là Đường đi
        # Trục ngang (X): 30 ô, Trục dọc (Y): 20 ô
        self.raw_map_template = [
            # ----- ĐƯỜNG GIẢI PHÓNG -----
            "111111011111111111111111110111", # 00: Lối vào Cổng 1 (Cột 6) và Cổng 4 (Cột 26)
            "111111011111111111111111110111", # 01: Đường dẫn vào sảnh
            "111111000000000000000000000111", # 02: Trục đường ngang chính liên kết Cổng 1 - Cổng 4
            "111111011111110011111101110111", # 03: [A9]         | [K1]   | [K2]
            "111111011111110011111101110111", # 04: [A9]         | [K1]   | [K2]
            "111111011111110011111101110111", # 05: Đ.vào A9     |        | Đ.vào K2
            "111111000000000011111100000111", # 06: Đường vòng qua K1, K2
            "111111111111110011111111110111", # 07: Sân trong
            "111111111111110000000000000111", # 08: Trục đường đi sâu vào trung tâm (Nhà Q, Nhà P)
            "111111110001111111110111111111", # 09:         [Nhà P]      [Nhà Q]
            "111111110001111111110111111111", # 10: Đ.vào P [Nhà P]      [Nhà Q] Đ.vào Q
            "111111110001111111110111111111", # 11:         [Nhà P]      [Nhà Q]
            "111111110000000000000000001111", # 12: Hành lang chung quanh Nhà Q, P
            "111111110001111111111111111111", # 13: 
            "111111110001111111111111111111", # 14:         [Nhà F - Nhiệt đới]
            "111111110001111111111111111111", # 15: 
            "111111110000000000111111111111", # 16: Đường nhánh sau lưng bệnh viện
            "111111111111111100111111111111", # 17:
            "111111111111111100111111111111", # 18: Đường dẫn ra cổng Phương Mai
            "111111111111111100111111111111"  # 19: Lối ra Cổng 3 (Cột 16)
            # ----- ĐƯỜNG PHƯƠNG MAI -----
        ]
        
        # Ma trận NumPy 2D chứa dữ liệu số liệu thực tế
        self.matrix = self._build_matrix()
        self.rows = len(self.matrix)
        self.cols = len(self.matrix[0])

    def _build_matrix(self):
        """Chuyển đổi chuỗi template thành ma trận số nguyên 2 chiều"""
        matrix = []
        for row_string in self.raw_map_template:
            # Ép kiểu từng ký tự '0', '1' thành integer
            row_data = [int(char) for char in row_string]
            matrix.append(row_data)
        
        return np.array(matrix, dtype=np.int8)

    def is_walkable(self, x, y):
        """Kiểm tra xem một tọa độ (x: cột, y: hàng) có thể đi vào được không"""
        # Kiểm tra vượt quá giới hạn bản đồ
        if x < 0 or x >= self.cols or y < 0 or y >= self.rows:
            return False
        # Trả về True nếu là đường đi (0)
        return self.matrix[y][x] == self.WALKABLE

    def get_neighbors(self, x, y):
        """Lấy danh sách các ô lân cận hợp lệ (phục vụ cho thuật toán A*)"""
        neighbors = []
        # 4 hướng di chuyển: Lên, Xuống, Trái, Phải
        directions = [(0, -1), (0, 1), (-1, 0), (1, 0)]
        
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if self.is_walkable(nx, ny):
                neighbors.append((nx, ny))
                
        # Nếu muốn cho phép đi chéo, bạn có thể bổ sung thêm:
        # diagonals = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        
        return neighbors

    def print_matrix(self):
        """Hàm in ma trận ra console để debug"""
        print("=== BẢN ĐỒ MA TRẬN MẶT ĐẤT (Z=0) ===")
        for y in range(self.rows):
            row_str = ""
            for x in range(self.cols):
                if self.matrix[y][x] == self.WALKABLE:
                    row_str += ". "  # Hiển thị đường đi bằng dấu chấm cho dễ nhìn
                else:
                    row_str += "█ "  # Hiển thị vật cản bằng khối vuông
            print(row_str)

# Dành cho việc test file trực tiếp
if __name__ == "__main__":
    map_z0 = GroundFloorMap()
    
    # In toàn bộ bản đồ ra console
    map_z0.print_matrix()
    
    # Kịch bản test: Kiểm tra tọa độ Sảnh A9 (Cột 7, Hàng 5)
    test_x, test_y = 7, 5
    print(f"\nKiểm tra tọa độ ({test_x}, {test_y}):")
    if map_z0.is_walkable(test_x, test_y):
        print("-> Đây là ĐƯỜNG ĐI (0).")
        print("-> Các bước đi tiếp theo có thể:", map_z0.get_neighbors(test_x, test_y))
    else:
        print("-> Đây là VẬT CẢN (1). Không thể đi vào.")