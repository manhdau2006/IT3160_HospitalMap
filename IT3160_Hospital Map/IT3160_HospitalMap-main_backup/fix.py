import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('replacement.js', 'r', encoding='utf-8') as f:
    rep = f.read()

# 1. Navbar
html = html.replace(
    '''            <a href="#" onclick="MapsToPage('diagram', this)"
                class="nav-link relative px-3 py-2 text-sm font-bold text-cyan-100 hover:text-white transition-all">Sơ
                Đồ Khối</a>
            <a href="#" onclick="MapsToPage('resources', this)"
                class="nav-link relative px-3 py-2 text-sm font-bold text-cyan-100 hover:text-white transition-all">Tài
                Nguyên</a>''',
    '''            <a href="#" id="nav-map" onclick="MapsToPage('map', this)"
                class="nav-link relative px-3 py-2 text-sm font-bold text-cyan-100 hover:text-white transition-all">Bản
                Đồ</a>'''
)

# 2. Expand width
html = html.replace(
    '<div class="w-96 flex flex-col gap-4 shrink-0 h-full">',
    '<div class="w-full max-w-4xl mx-auto flex flex-col gap-4 shrink-0 h-full">'
)

# 3. Remove treeContainer block
tree_container_block = '''                <div class="flex-1 glass-panel rounded-2xl shadow-2xl p-6 flex flex-col relative overflow-hidden">
                    <div class="flex justify-between items-center mb-2 border-b border-white/5 pb-3">
                        <h3 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                            <i class="fa-solid fa-network-wired text-cyan-400"></i> Medical Knowledge Graph Interface
                            (Bản
                            đồ Cấu trúc hình học chuẩn xác)
                        </h3>
                        <span id="triageStatus"
                            class="text-[10px] font-mono font-bold text-slate-400 bg-slate-950/60 border border-white/5 px-2.5 py-1 rounded-md">Trạng
                            thái: Sẵn sàng</span>
                    </div>
                    <div class="tree-container flex-1" id="treeContainer"></div>
                </div>'''
html = html.replace(tree_container_block, '')

# 4. Turn phase2 into page-map
html = html.replace(
    '''            </div>
        </div> <!-- End page-ai_diagnose -->''',
    '''            </div>
        </div> <!-- End page-ai_diagnose -->

        <!-- PAGE: Map Navigation -->
        <div id="page-map" class="page-section absolute inset-0 hidden">'''
)
html = html.replace(
    '''            <div id="phase2"
                class="absolute inset-0 flex p-6 gap-6 translate-x-full opacity-0 transition-all duration-500 ease-in-out pointer-events-none">''',
    '''            <div id="phase2" class="absolute inset-0 flex p-6 gap-6 transition-all duration-500 ease-in-out">'''
)
html = html.replace(
    '''        <div id="page-diagram" class="page-section absolute inset-0 flex items-center justify-center p-6">''',
    '''        </div> <!-- End page-map -->

        <div id="page-diagram" class="page-section absolute inset-0 flex items-center justify-center p-6">'''
)

# 5. Inject symptoms.js
html = html.replace(
    '''    <script>
        /*******************************************************
         * MAPS TO PAGE ENGINE (Chuyển trang & Quản lý Phase)''',
    '''    <script src="symptoms.js" charset="UTF-8"></script>
    <script>
        /*******************************************************
         * MAPS TO PAGE ENGINE (Chuyển trang & Quản lý Phase)'''
)

# 6. Replace JS Logic (from function resetTriageFlow to end of renderItineraryPanelUI)
# We will just cut from line 630 to line 1032
# Wait, we can use regex to find the exact block between `function resetTriageFlow()` and `function buildRealisticHospitalBlueprint()`

match = re.search(r'        function resetTriageFlow\(\) \{.*?(?=        /\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*'
                  r'\n         \* 3\. KIẾN TRÚC BLUEPRINT MẶT BẰNG)', html, re.DOTALL)

if match:
    # replace that block with our rep contents (except for `let activeAnswers` since rep has them at the top)
    html = html[:match.start()] + rep + '\n' + html[match.end():]
else:
    print("WARNING: Could not find JS logic block to replace!")

# 7. Update Event Listeners in bindUserInteractions()
html = html.replace(
    '''            document.getElementById('proceedToNavBtn').addEventListener('click', () => {
                currentItineraryIndex = 0;
                startPos = { r: 1, c: 1, z: 0 }; // Khởi phát tại sảnh K1 tầng 0
                const p1 = document.getElementById('phase1'); const p2 = document.getElementById('phase2');
                p1.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
                p2.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none'); p2.classList.add('translate-x-0');
                setupNavigationSegment();
                if (currentAlgoMode === 'DFS') {
                    executeDFSRoutingEngine();
                } else {
                    executeAStarRoutingEngine();
                }
            });''',
    '''            document.getElementById('proceedToNavBtn').addEventListener('click', () => {
                currentItineraryIndex = 0;
                startPos = { r: 1, c: 1, z: 0 }; // Khởi phát tại sảnh K1 tầng 0
                MapsToPage('map', document.getElementById('nav-map'));
                setupNavigationSegment();
                if (currentAlgoMode === 'DFS') {
                    executeDFSRoutingEngine();
                } else {
                    executeAStarRoutingEngine();
                }
            });'''
)
html = html.replace(
    '''            document.getElementById('backToPhase1Btn').addEventListener('click', () => {
                const p1 = document.getElementById('phase1'); const p2 = document.getElementById('phase2');
                p2.classList.remove('translate-x-0');
                p2.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                p1.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
            });''',
    '''            document.getElementById('backToPhase1Btn').addEventListener('click', () => {
                MapsToPage('ai_diagnose', document.getElementById('nav-ai'));
            });'''
)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done!")
