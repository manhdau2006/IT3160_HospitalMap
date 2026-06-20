import json
import os

def load_data():
    """Hàm đọc dữ liệu từ file JSON"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, '..', 'data', 'symptoms.json')
    
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)

def dfs_diagnose(node, is_root=False):
    """
    Thuật toán Multi-DFS duyệt cây quyết định (Đồ thị VÀ/HOẶC).
    Nhận vào một node (dict), in ra câu hỏi và các lựa chọn.
    """
    if "result" in node:
        print(f"\n[AI CHẨN ĐOÁN] => Dựa trên triệu chứng, bạn nên đến: {node['result']}")
        return [node['department_id']]
    
    print(f"\n[HỆ THỐNG]: {node['question']}")
    
    options = node.get('options', [])
    for i, option in enumerate(options):
        print(f"   {i + 1}. {option['label']}")
        
    collected_results = []
    
    while True:
        try:
            if is_root:
                # Nút gốc (Nút VÀ): Cho phép chọn nhiều nhánh (Multi-DFS)
                choices_str = input("\n>> Nhập các số thứ tự triệu chứng của bạn (cách nhau bởi dấu phẩy, VD: 1, 3): ")
                choices = [int(x.strip()) for x in choices_str.split(',') if x.strip().isdigit()]
                
                if not choices:
                    print("Lỗi: Vui lòng nhập ít nhất một số.")
                    continue
                    
                valid = True
                for choice in choices:
                    if not (1 <= choice <= len(options)):
                        print(f"Lỗi: Số {choice} không hợp lệ. Vui lòng nhập số từ 1 đến {len(options)}.")
                        valid = False
                        break
                
                if not valid:
                    continue
                    
                # Chạy Multi-DFS trên từng nhánh được chọn theo mô hình Problem Reduction
                for choice in choices:
                    selected_option = options[choice - 1]
                    print(f"\n--- Đang phân tích nhánh: {selected_option['label'].upper()} ---")
                    
                    if "next_node" in selected_option:
                        res = dfs_diagnose(selected_option["next_node"], is_root=False)
                        collected_results.extend(res)
                    elif "result" in selected_option:
                        print(f"\n[AI CHẨN ĐOÁN] => Dựa trên triệu chứng, bạn nên đến: {selected_option['result']}")
                        collected_results.append(selected_option['department_id'])
                        
                return collected_results
                
            else:
                # Các nút sâu hơn (Nút HOẶC): Chọn 1 nhánh duy nhất
                choice = int(input("\n>> Nhập số thứ tự lựa chọn của bạn: "))
                
                if 1 <= choice <= len(options):
                    selected_option = options[choice - 1]
                    
                    if "next_node" in selected_option:
                        return dfs_diagnose(selected_option["next_node"], is_root=False)
                    elif "result" in selected_option:
                        print(f"\n[AI CHẨN ĐOÁN] => Dựa trên triệu chứng, bạn nên đến: {selected_option['result']}")
                        return [selected_option['department_id']]
                else:
                    print(f"Lỗi: Vui lòng nhập số từ 1 đến {len(options)}.")
                    
        except ValueError:
            print("Lỗi: Vui lòng nhập đúng định dạng.")

# ==========================================
# KHỐI LỆNH CHẠY CHÍNH
# ==========================================
if __name__ == "__main__":
    print("="*50)
    print(" HỆ THỐNG AI ĐIỀU PHỐI KHÁM BỆNH - MODULE 1 (MULTI-DFS)")
    print("="*50)
    
    tree_data = load_data()
    target_departments = dfs_diagnose(tree_data, is_root=True)
    
    # Loại bỏ trùng lặp kết quả
    unique_depts = list(set(target_departments))
    
    print("\n" + "="*50)
    print(f"[DỮ LIỆU ĐẦU RA]: Danh sách phòng khám: {unique_depts}")
    print("="*50)