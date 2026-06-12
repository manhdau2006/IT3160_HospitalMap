import json
import sys
from diagnose_dfs import load_data, dfs_diagnose

# 1. TỪ ĐIỂN ÁNH XẠ (MAPPING DATABASE)
# Các ID này lấy từ file symptoms.json của TV1.
# Tọa độ (r, c, z) bạn phải tự tùy chỉnh cho khớp với ma trận đồ thị thực tế của bạn.
DEPARTMENT_MAP = {
    "K_TIEUHOA":      {"r": 1, "c": 2, "z": 0},
    "K_NGOAITONGHOP": {"r": 3, "c": 3, "z": 0},
    "K_NHIKHOA":      {"r": 0, "c": 0, "z": 0},
    
    "K_THANKINH":     {"r": 2, "c": 1, "z": 1},
    "K_MAT":          {"r": 0, "c": 4, "z": 1},
    "K_TAIMUIHONG":   {"r": 4, "c": 0, "z": 1},
    
    "K_TIMMACH":      {"r": 1, "c": 1, "z": 2},
    "K_HOHAP":        {"r": 3, "c": 2, "z": 2},
    "K_TRUYENNHEM":   {"r": 4, "c": 4, "z": 2}
}

def get_goal_coordinate(department_id):
    """Chuyển đổi ID Khoa thành tọa độ 3D"""
    return DEPARTMENT_MAP.get(department_id, None)

def main():
    print("=== HỆ THỐNG SMART HOSPITAL NAVIGATOR ===")
    
    # 2. CHẠY MODULE HỎI BỆNH (TV1)
    tree_data = load_data()
    target_department_id = dfs_diagnose(tree_data)
    
    if not target_department_id:
        sys.exit("Lỗi: Không nhận được ID Khoa từ module chẩn đoán.")

    # 3. CHUYỂN ĐỔI DỮ LIỆU (TV3 - ROLE CỦA BẠN)
    goal_coord = get_goal_coordinate(target_department_id)
    
    if not goal_coord:
        sys.exit(f"Lỗi: ID '{target_department_id}' chưa được khai báo tọa độ trên bản đồ!")

    # 4. ĐÓNG GÓI PAYLOAD CHO THUẬT TOÁN A* (TV2)
    # Cấu trúc này khớp chuẩn với object { r, c, z } trong hàm executeAStar3D của astar_3d.js
    payload_for_tv2 = {
        "start": {"r": 0, "c": 0, "z": 0}, # Cố định điểm xuất phát (ví dụ: Quầy lễ tân tầng trệt)
        "goal": goal_coord
    }
    
    print("\n" + "="*50)
    print(" KẾT QUẢ ĐẦU RA TỪ MODULE INTEGRATION (TV3)")
    print("="*50)
    print(f"- Khoa đích cần đến: {target_department_id}")
    print(f"- Payload sẵn sàng gửi cho JavaScript A*: {json.dumps(payload_for_tv2, indent=2)}")
    
    # Nếu dùng Streamlit (TV4), biến payload_for_tv2 này sẽ được đẩy xuống frontend (JS) 
    # thông qua st.components.v1.html hoặc session_state.
    return payload_for_tv2

if __name__ == "__main__":
    main()