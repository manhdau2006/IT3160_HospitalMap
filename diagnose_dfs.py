import json
import os

def load_data():
    """Hàm đọc dữ liệu từ file JSON"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, '..', 'data', 'symptoms.json')
    
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)

def dfs_diagnose(node):
    """
    Thuật toán DFS duyệt cây quyết định theo phân cấp (Cascading).
    Nhận vào một node (dict), in ra câu hỏi và các lựa chọn.
    """
    # 1. Nếu node hiện tại bản thân nó đã là kết quả (Nút lá)
    if "result" in node:
        print(f"\n[AI CHẨN ĐOÁN] => Dựa trên triệu chứng, bạn nên đến: {node['result']}")
        return node['department_id']
    
    # 2. In ra câu hỏi của node hiện tại
    print(f"\n[HỆ THỐNG]: {node['question']}")
    
    options = node.get('options', [])
    
    # 3. In ra danh sách các lựa chọn (Đánh số 1, 2, 3...)
    for i, option in enumerate(options):
        print(f"   {i + 1}. {option['label']}")
        
    # 4. Vòng lặp lấy input của người dùng (Xử lý lỗi nhập sai)
    while True:
        try:
            choice = int(input(">> Nhập số thứ tự lựa chọn của bạn: "))
            
            # Kiểm tra xem số nhập vào có nằm trong danh sách không
            if 1 <= choice <= len(options):
                selected_option = options[choice - 1]
                
                # CHUYỂN TRẠNG THÁI (ACTION): 
                # Nếu lựa chọn này dẫn đến một câu hỏi tiếp theo (next_node) -> Đệ quy đi sâu xuống
                if "next_node" in selected_option:
                    return dfs_diagnose(selected_option["next_node"])
                
                # Nếu lựa chọn này là kết quả cuối cùng -> Trả về kết quả
                elif "result" in selected_option:
                    print(f"\n[AI CHẨN ĐOÁN] => Dựa trên triệu chứng, bạn nên đến: {selected_option['result']}")
                    return selected_option['department_id']
            else:
                print(f"Lỗi: Vui lòng nhập số từ 1 đến {len(options)}.")
                
        except ValueError:
            print("Lỗi: Vui lòng chỉ nhập số nguyên (VD: 1, 2).")

# ==========================================
# KHỐI LỆNH CHẠY CHÍNH (MAIN ENTRY POINT)
# ==========================================
if __name__ == "__main__":
    print("="*50)
    print(" HỆ THỐNG AI ĐIỀU PHỐI KHÁM BỆNH - MODULE 1 (DFS)")
    print("="*50)
    
    # Tải đồ thị tri thức (Cây quyết định)
    tree_data = load_data()
    
    # Bắt đầu chạy thuật toán từ Nút gốc (Root)
    target_department_id = dfs_diagnose(tree_data)
    
    print("\n" + "="*50)
    print(f"[DỮ LIỆU ĐẦU RA]: Đã lưu ID '{target_department_id}' để gửi cho Module Chỉ đường A*.")
    print("="*50)