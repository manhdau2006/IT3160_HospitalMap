import json

with open('new_map_data.json', encoding='utf-8') as f:
    d = json.load(f)

targets = {
    "Khoa Tiêu hóa": "K_TIEUHOA",
    "Phòng nội soi": "K_TIEUHOA_N",
    "Khoa ngoại tổng hợp": "K_NGOAITONGHOP",
    "Khoa thần kinh": "K_THANKINH",
    "Khoa mắt": "K_MAT",
    "Khoa Tai Mũi Họng": "K_TAIMUIHONG",
    "Khoa Tim mạch": "K_TIMMACH",
    "Khoa Hô hấp": "K_HOHAP",
    "Khoa Nhi": "K_NHIKHOA",
    "Khoa truyền nhiễm": "K_TRUYENNHEM"
}

results = []
for z, floor in enumerate(['floor_1', 'floor_2']):
    for r, row in enumerate(d[floor]):
        for c, cell in enumerate(row):
            for t, k in targets.items():
                if cell['text'].lower() == t.lower():
                    results.append(f"{k} - {t}: x={c}, y={r}, z={z}")

with open('rooms_coords.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
