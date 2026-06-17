import json
import sys
from diagnose_dfs import load_data, dfs_diagnose

DEFAULT_LOCATION_MAPPING_FILE = "location_mapping.json"

# 1. Nạp bản đồ location_mapping.json
# file chứa các node với tọa độ x, y, z.
# Với A* lưới, ta chuyển x -> c, y -> r.
def load_location_mapping(file_path=DEFAULT_LOCATION_MAPPING_FILE):
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)
    node_list = data.get("hospital_network", {}).get("nodes", [])
    return {node.get("id"): node for node in node_list}


def get_goal_coordinate(department_id, location_map):
    """Tìm node trong location_map theo ID và trả về {r, c, z}."""
    node = location_map.get(department_id)
    if not node:
        return None

    if "r" in node and "c" in node:
        return {"r": int(node["r"]), "c": int(node["c"]), "z": int(node["z"])}

    if "x" in node and "y" in node:
        return {"r": int(node["y"]), "c": int(node["x"]), "z": int(node["z"])}

    return None

def main():
    print("=== HỆ THỐNG SMART HOSPITAL NAVIGATOR ===")
    
    # 2. CHẠY MODULE HỎI BỆNH (TV1)
    tree_data = load_data()
    target_department_id = dfs_diagnose(tree_data)
    
    if not target_department_id:
        sys.exit("Lỗi: Không nhận được ID Khoa từ module chẩn đoán.")

    # 3. NẠP file location_mapping.json và tìm tọa độ đích
    location_map = load_location_mapping("location_mapping.json")
    goal_coord = get_goal_coordinate(target_department_id, location_map)
    
    if not goal_coord:
        sys.exit(f"Lỗi: ID '{target_department_id}' chưa tìm thấy trong location_mapping.json hoặc thiếu tọa độ!")

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
