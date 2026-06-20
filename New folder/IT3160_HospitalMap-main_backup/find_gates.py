import json
d = json.load(open('new_map_data.json', encoding='utf-8'))
results = []
for floor in ['floor_1', 'floor_2']:
    for r, row in enumerate(d[floor]):
        for c, cell in enumerate(row):
            txt = cell['text'].lower()
            if 'cổng' in txt or 'sảnh' in txt:
                results.append(f"{floor} [{r},{c}]: {cell['text']}")
with open('gates_coords.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
