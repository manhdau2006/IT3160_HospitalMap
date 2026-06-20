import csv
import json
import os

def parse_csv(filepath, target_rows=21, target_cols=8):
    grid = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        lines = list(reader)
        
    for i in range(target_rows):
        row = [""] * target_cols
        if i < len(lines):
            for j in range(min(len(lines[i]), target_cols)):
                row[j] = lines[i][j].strip()
        grid.append(row)
    return grid

def build_map_with_walls(grid):
    rows = len(grid)
    cols = len(grid[0])
    new_grid = []
    
    for r in range(-1, rows + 1):
        new_row = []
        for c in range(-1, cols + 1):
            if r == -1 or r == rows or c == -1 or c == cols:
                new_row.append({"type": "wall", "text": ""})
            else:
                text = grid[r][c]
                cell_type = "path"
                lower_text = text.lower()
                
                if "cổng" in lower_text:
                    cell_type = "gate"
                elif lower_text == "thang bộ":
                    cell_type = "stairs"
                elif lower_text == "thang máy":
                    cell_type = "elevator"
                elif lower_text == "nhà vệ sinh":
                    cell_type = "room-wc"
                elif text != "":
                    cell_type = "room-normal"
                    
                new_row.append({"type": cell_type, "text": text})
        new_grid.append(new_row)
        
    # Move gates to walls
    for r in range(1, len(new_grid) - 1):
        for c in range(1, len(new_grid[0]) - 1):
            if new_grid[r][c]["type"] == "gate":
                text = new_grid[r][c]["text"]
                new_grid[r][c] = {"type": "path", "text": ""}
                
                if r == 1:
                    new_grid[0][c] = {"type": "gate", "text": text}
                elif r == len(new_grid) - 2:
                    new_grid[len(new_grid) - 1][c] = {"type": "gate", "text": text}
                elif c == 1:
                    new_grid[r][0] = {"type": "gate", "text": text}
                elif c == len(new_grid[0]) - 2:
                    new_grid[r][len(new_grid[0]) - 1] = {"type": "gate", "text": text}
                    
    return new_grid

def main():
    base_dir = r"c:\Users\Admin\Desktop\Nhập môn AI\IT3160_Copy\IT3160_HospitalMap-main_backup"
    file_t1 = os.path.join(base_dir, "Bản đồ bệnh viện - Tầng 1.csv")
    file_t2 = os.path.join(base_dir, "Bản đồ bệnh viện - Tầng 2.csv")
    
    grid1 = parse_csv(file_t1)
    grid2 = parse_csv(file_t2)
    
    map1_full = build_map_with_walls(grid1)
    map2_full = build_map_with_walls(grid2)
    
    output_data = {
        "metadata": {
            "rows": len(map1_full),
            "cols": len(map1_full[0])
        },
        "floor_1": map1_full,
        "floor_2": map2_full
    }
    
    out_file = os.path.join(base_dir, "new_map_data.json")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"Created {out_file}")

if __name__ == "__main__":
    main()
