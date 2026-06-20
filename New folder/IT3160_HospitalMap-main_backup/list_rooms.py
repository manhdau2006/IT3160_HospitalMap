import json, sys
sys.stdout.reconfigure(encoding='utf-8')
with open('new_map_data.json', encoding='utf-8') as f:
    data = json.load(f)

print('=== FLOOR 1 ===')
floor = data['floor_1']
for r, row in enumerate(floor):
    for c, cell in enumerate(row):
        if cell['text']:
            print(f'  r={r}, c={c}: type={cell["type"]}, text="{cell["text"]}"')

print()
print('=== FLOOR 2 ===')
floor = data['floor_2']
for r, row in enumerate(floor):
    for c, cell in enumerate(row):
        if cell['text']:
            print(f'  r={r}, c={c}: type={cell["type"]}, text="{cell["text"]}"')
