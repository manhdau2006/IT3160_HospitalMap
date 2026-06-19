
        /*******************************************************
         * MAPS TO PAGE ENGINE (Chuyển trang & Quản lý Phase)
         *******************************************************/
        function MapsToPage(pageId, linkElement) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active', 'text-white');
                link.classList.add('text-cyan-100');
            });
            if (linkElement) {
                linkElement.classList.add('active', 'text-white');
                linkElement.classList.remove('text-cyan-100');
            }

            document.querySelectorAll('.page-section').forEach(page => {
                page.classList.remove('active-page');
            });

            const targetPage = document.getElementById(`page-${pageId}`);
            if (targetPage) {
                targetPage.classList.add('active-page');

                if (pageId === 'ai_diagnose') {
                    resetTriageFlow();
                }
            }
        }

        function resetTriageFlow() {
            const p1 = document.getElementById('phase1');
            const p2 = document.getElementById('phase2');

            if (p1) {
                p1.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
                p1.classList.add('translate-x-0', 'opacity-100');
            }
            if (p2) {
                p2.classList.remove('translate-x-0', 'opacity-100');
                p2.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
            }

            resetQuestionnaire();
            itineraryPanel.classList.add('hidden');
            document.getElementById('triageStatus').textContent = "Trạng thái: Sẵn sàng";
            currentItineraryIndex = 0;
            medicalItinerary = [];
        }

        const DEPARTMENT_CONFIG = {
            "K_TIEUHOA": { label: "Khoa Tiêu Hóa", severity: 2, rooms: [{ name: 'Phòng Khám Tiêu Hóa 102', gridX: 18, gridY: 2, patients: 9 }, { name: 'Phòng Nội Soi 105', gridX: 18, gridY: 5, patients: 4 }] },
            "K_NGOAITONGHOP": { label: "Khoa Ngoại Tổng hợp", severity: 3, rooms: [{ name: 'Phòng Khám Ngoại 106', gridX: 18, gridY: 7, patients: 6 }] },
            "K_THANKINH": { label: "Khoa Thần Kinh", severity: 4, rooms: [{ name: 'Phòng Khám Thần Kinh 301', gridX: 18, gridY: 3, patients: 7 }, { name: 'Phòng Điện Não Đồ 303', gridX: 19, gridY: 3, patients: 2 }] },
            "K_MAT": { label: "Khoa Mắt", severity: 1, rooms: [{ name: 'Phòng Khám Mắt 201', gridX: 5, gridY: 2, patients: 8 }] },
            "K_TAIMUIHONG": { label: "Khoa Tai Mũi Họng", severity: 2, rooms: [{ name: 'Phòng Khám TMH 202', gridX: 6, gridY: 2, patients: 5 }] },
            "K_TIMMACH": { label: "Khoa Tim Mạch", severity: 5, rooms: [{ name: 'Phòng Điều Áp Tim Mạch 401', gridX: 1, gridY: 2, patients: 11 }, { name: 'Phòng Siêu Âm Tim 405', gridX: 1, gridY: 5, patients: 5 }] },
            "K_HOHAP": { label: "Khoa Hô Hấp", severity: 4, rooms: [{ name: 'Phòng Khám Hô Hấp 204', gridX: 18, gridY: 11, patients: 3 }, { name: 'Khu Đo Chức Năng Phổi', gridX: 18, gridY: 13, patients: 14 }] },
            "K_NHIKHOA": { label: "Khoa Nhi", severity: 3, rooms: [{ name: 'Phòng Khám Nhi 101', gridX: 2, gridY: 8, patients: 15 }] },
            "K_TRUYENNHEM": { label: "Khoa Truyền Nhiễm", severity: 5, rooms: [{ name: 'Khu Cách Ly Truyền Nhiễm', gridX: 15, gridY: 10, patients: 2 }] }
        };

        const symptomContainer = document.getElementById('symptomContainer');
        const startTriageBtn = document.getElementById('startTriageBtn');
        const itineraryPanel = document.getElementById('itineraryPanel');
        const itineraryStepsList = document.getElementById('itineraryStepsList');
        const gridMapEl = document.getElementById('gridMap');
        const heuristicSelect = document.getElementById('heuristicSelect');
        const stepDirectionsList = document.getElementById('stepDirectionsList');
        const nextStopBtn = document.getElementById('nextStopBtn');

        let symptomsData = null;
        let activeAnswers = {}; // map pathId to chosen option indices
        let leafResults = [];

        function initApp() {
            buildRealisticHospitalBlueprint();
            bindUserInteractions();
            fetchSymptomsData();
        }

        async function fetchSymptomsData() {
            try {
                const res = await fetch('symptoms.json');
                symptomsData = await res.json();
                resetQuestionnaire();
            } catch(e) {
                console.error("Lỗi tải symptoms.json", e);
                symptomContainer.innerHTML = '<div class="text-red-400 p-4">Không thể tải dữ liệu triệu chứng. Vui lòng kiểm tra lại.</div>';
            }
        }

        function resetQuestionnaire() {
            activeAnswers = {};
            leafResults = [];
            startTriageBtn.disabled = true;
            renderQuestionnaire();
        }

        function renderQuestionnaire() {
            if (!symptomsData) return;
            symptomContainer.innerHTML = '';
            leafResults = [];
            
            // Render root
            renderNode(symptomsData, 'root', true, symptomContainer);
            
            // Check if we have leaf results and all questions are answered
            checkCompletion();
        }

        function renderNode(node, pathId, isRoot, container) {
            const block = document.createElement('div');
            block.className = 'bg-slate-900/50 border border-white/10 rounded-xl p-5 shadow-lg relative';
            
            const title = document.createElement('h4');
            title.className = 'text-cyan-300 font-bold mb-4 text-sm flex items-center gap-2';
            title.innerHTML = `<i class="fa-solid fa-circle-question text-cyan-500"></i> ${node.question}`;
            block.appendChild(title);

            const optionsGrid = document.createElement('div');
            optionsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3';
            
            const selections = activeAnswers[pathId] || [];

            (node.options || []).forEach((opt, idx) => {
                const isSelected = selections.includes(idx);
                const optBtn = document.createElement('div');
                optBtn.className = `flex flex-col p-4 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-cyan-600/20 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-800/50 border-white/5 hover:border-cyan-500/50 hover:bg-slate-800'}`;
                
                optBtn.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}">${opt.label}</span>
                        <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-cyan-400 bg-cyan-400 text-slate-900' : 'border-slate-500 text-transparent'}">
                            <i class="fa-solid fa-check text-xs"></i>
                        </div>
                    </div>
                `;
                
                optBtn.onclick = () => {
                    if (isRoot) {
                        // Multi-select for root
                        if (isSelected) {
                            activeAnswers[pathId] = selections.filter(i => i !== idx);
                        } else {
                            activeAnswers[pathId] = [...selections, idx];
                        }
                    } else {
                        // Single-select for deeper nodes
                        activeAnswers[pathId] = [idx];
                    }
                    // clear deeper answers for this pathId if changed
                    clearDeeperAnswers(pathId);
                    renderQuestionnaire();
                };
                
                optionsGrid.appendChild(optBtn);
            });
            
            block.appendChild(optionsGrid);
            container.appendChild(block);

            // Render children if selected
            selections.forEach(idx => {
                const selectedOpt = node.options[idx];
                const childPathId = pathId + '-' + idx;
                
                const childContainer = document.createElement('div');
                childContainer.className = 'mt-4 pl-4 md:pl-8 border-l-2 border-cyan-500/30 space-y-4';
                
                if (selectedOpt.next_node) {
                    renderNode(selectedOpt.next_node, childPathId, false, childContainer);
                    container.appendChild(childContainer);
                } else if (selectedOpt.result && selectedOpt.department_id) {
                    // Reached a leaf
                    leafResults.push({
                        deptId: selectedOpt.department_id,
                        label: selectedOpt.result
                    });
                    const resultBlock = document.createElement('div');
                    resultBlock.className = 'bg-emerald-900/30 border border-emerald-500/50 rounded-xl p-4 mt-4 flex items-center gap-3';
                    resultBlock.innerHTML = \`
                        <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-stethoscope"></i>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase text-emerald-500 font-bold">Gợi ý chẩn đoán AI</p>
                            <p class="text-sm text-emerald-300 font-bold">Bạn nên đến: \${selectedOpt.result}</p>
                        </div>
                    \`;
                    container.appendChild(resultBlock);
                }
            });
        }

        function clearDeeperAnswers(prefix) {
            Object.keys(activeAnswers).forEach(key => {
                if (key.startsWith(prefix + '-')) {
                    delete activeAnswers[key];
                }
            });
        }

        function checkCompletion() {
            let hasSelection = activeAnswers['root'] && activeAnswers['root'].length > 0;
            if (!hasSelection) {
                startTriageBtn.disabled = true;
                return;
            }
            
            const isFullyAnswered = verifyNodeAnswered(symptomsData, 'root');
            startTriageBtn.disabled = !isFullyAnswered;
        }

        function verifyNodeAnswered(node, pathId) {
            const selections = activeAnswers[pathId] || [];
            if (selections.length === 0) return false;
            
            for (let idx of selections) {
                const opt = node.options[idx];
                if (opt.next_node) {
                    const childPathId = pathId + '-' + idx;
                    if (!verifyNodeAnswered(opt.next_node, childPathId)) {
                        return false;
                    }
                } else if (!opt.result) {
                    return false;
                }
            }
            return true;
        }
        
        startTriageBtn.onclick = () => {
            if (leafResults.length === 0) return;
            startTriageBtn.disabled = true;
            document.getElementById('triageStatus').textContent = `Đang tổng hợp lộ trình...`;
            
            // Collect unique departments
            let targetDeptIds = [...new Set(leafResults.map(l => l.deptId))];
            
            medicalItinerary = [];
            targetDeptIds.forEach(deptId => {
                const config = DEPARTMENT_CONFIG[deptId];
                if (config && config.rooms.length > 0) {
                    let bestRoom = config.rooms[0];
                    for (let i = 1; i < config.rooms.length; i++) {
                        if (config.rooms[i].patients < bestRoom.patients) bestRoom = config.rooms[i];
                    }
                    medicalItinerary.push({
                        deptLabel: config.label,
                        roomName: bestRoom.name,
                        x: bestRoom.gridX,
                        y: bestRoom.gridY,
                        patients: bestRoom.patients,
                        severity: config.severity || 1
                    });
                }
            });

            medicalItinerary.sort((a, b) => {
                if (b.severity !== a.severity) {
                    return b.severity - a.severity;
                }
                return a.patients - b.patients;
            });
            renderItineraryPanelUI();
            document.getElementById('triageStatus').textContent = "Phân phối tuyến đa chặng hoàn tất!";
        };

        function renderItineraryPanelUI() {
            itineraryStepsList.innerHTML = '';
            
            const itineraryPanelHeader = itineraryPanel.querySelector('.flex.justify-between.items-center.mb-3');
            if (itineraryPanelHeader) {
                if (medicalItinerary.length > 1) {
                    itineraryPanelHeader.innerHTML = `
                        <span class="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                            <i class="fa-solid fa-rectangle-list"></i> Đề xuất AI
                        </span>
                        <span class="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">Tùy chỉnh thứ tự</span>
                    `;
                } else {
                    itineraryPanelHeader.innerHTML = `
                        <span class="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                            <i class="fa-solid fa-rectangle-list"></i> Hành trình khám
                        </span>
                        <span class="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">Auto Sorted</span>
                    `;
                }
            }

            medicalItinerary.forEach((stop, index) => {
                const stepRow = document.createElement('div');
                stepRow.className = "flex items-start gap-3 p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs relative";
                
                let reorderButtons = '';
                if (medicalItinerary.length > 1) {
                    reorderButtons = `
                        <div class="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                            <button onclick="moveItineraryUp(${index})" class="text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all" ${index === 0 ? 'disabled' : ''}>
                                <i class="fa-solid fa-chevron-up text-[10px]"></i>
                            </button>
                            <button onclick="moveItineraryDown(${index})" class="text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-all" ${index === medicalItinerary.length - 1 ? 'disabled' : ''}>
                                <i class="fa-solid fa-chevron-down text-[10px]"></i>
                            </button>
                        </div>
                    `;
                }

                let severityLabel = '';
                if (stop.severity >= 4) {
                    severityLabel = `<span class="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 ml-2 shadow-[0_0_8px_rgba(239,68,68,0.3)]">Nguy cấp</span>`;
                } else if (stop.severity >= 3) {
                    severityLabel = `<span class="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 ml-2 shadow-[0_0_8px_rgba(245,158,11,0.3)]">Trung bình</span>`;
                } else {
                    severityLabel = `<span class="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 ml-2 shadow-[0_0_8px_rgba(16,185,129,0.3)]">Nhẹ</span>`;
                }

                stepRow.innerHTML = `
                    <div class="w-5 h-5 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-md shadow-cyan-600/40">
                        ${index + 1}
                    </div>
                    <div class="flex-1 pr-6">
                        <p class="font-bold text-white flex items-center">${stop.deptLabel} ${severityLabel}</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">${stop.roomName}</p>
                        <div class="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-medium">
                            <i class="fa-solid fa-user-clock text-[9px]"></i> Hàng đợi: ${stop.patients} người
                        </div>
                    </div>
                    ${reorderButtons}
                `;
                itineraryStepsList.appendChild(stepRow);
            });
            itineraryPanel.classList.remove('hidden');
        }

        function moveItineraryUp(index) {
            if (index > 0) {
                const temp = medicalItinerary[index];
                medicalItinerary[index] = medicalItinerary[index - 1];
                medicalItinerary[index - 1] = temp;
                renderItineraryPanelUI();
            }
        }

        function moveItineraryDown(index) {
            if (index < medicalItinerary.length - 1) {
                const temp = medicalItinerary[index];
                medicalItinerary[index] = medicalItinerary[index + 1];
                medicalItinerary[index + 1] = temp;
                renderItineraryPanelUI();
            }
        }

        /*******************************************************
         * 3. KIẾN TRÚC BLUEPRINT MẶT BẰNG PHÂN BỔ 5 KHU VỰC
         *******************************************************/
        function buildRealisticHospitalBlueprint() {
            // Khởi tạo tất cả các ô là tường (1) trước để thiết lập kết cấu chuẩn
            for (let z = 0; z <= 3; z++) {
                multiFloorGrid[z] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(1));
            }

            // --- CẤU HÌNH TẦNG 0 (NGOÀI TRỜI / MẶT ĐẤT) ---
            // Tầng 0 chỉ có các trục hành lang đi bộ tự do kết nối các sảnh tòa nhà
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    // Trục đường ngang chính liên kết
                    if (r === 2 || r === 6 || r === 8 || r === 12) {
                        multiFloorGrid[0][r][c] = 0;
                    }
                    // Trục đường dọc chính liên kết
                    if (c === 2 || c === 9 || c === 17) {
                        multiFloorGrid[0][r][c] = 0;
                    }
                }
            }
            // Đảm bảo các điểm xuất phát mặc định luôn walkable và được kết nối
            multiFloorGrid[0][1][1] = 0;   // Sảnh tiếp đón K1
            multiFloorGrid[0][2][1] = 0;   // Kết nối sảnh
            multiFloorGrid[0][1][13] = 0;  // Cổng Giải Phóng
            multiFloorGrid[0][2][13] = 0;  // Kết nối cổng
            multiFloorGrid[0][13][7] = 0;  // Quầy cấp phát thuốc
            multiFloorGrid[0][12][7] = 0;  // Kết nối quầy thuốc

            // --- CẤU HÌNH TẦNG 1 (HÀNH LANG LIÊN THÔNG TOÀN VIỆN) ---
            // Tầng 1 cho phép di chuyển tự do giữa các tòa thông qua hành lang trung tâm
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    // Hành lang kết nối liên tòa nhà
                    if (r === 7 || r === 8 || c === 5 || c === 14) {
                        multiFloorGrid[1][r][c] = 0;
                    }
                    // Hành lang nội bộ của các khu vực
                    if (r === 2 || r === 12 || c === 2 || c === 9 || c === 17) {
                        multiFloorGrid[1][r][c] = 0;
                    }
                }
            }

            // --- CẤU HÌNH TẦNG 2 & TẦNG 3 (HÀNH LANG BỊ CÔ LẬP GIỮA CÁC TÒA) ---
            // Trên các tầng cao, hành lang liên thông chung bị bịt kín (tường 1),
            // người bệnh chỉ có thể đi lại trong phạm vi nội bộ tòa nhà và dùng thang máy đi xuống
            for (let z of [2, 3]) {
                for (let r = 0; r < GRID_ROWS; r++) {
                    for (let c = 0; c < GRID_COLS; c++) {
                        // Tòa P (Top-Left): c < 4, r <= 6 (Chỉ active ở Tầng 3)
                        if (z === 3 && c === 2 && r <= 6) multiFloorGrid[z][r][c] = 0;
                        if (z === 3 && r === 2 && c <= 3) multiFloorGrid[z][r][c] = 0;

                        // Tòa Q (Top-Middle): c >= 6 && c <= 12, r <= 3 (Active ở Tầng 2 & 3)
                        if (c === 9 && r <= 3) multiFloorGrid[z][r][c] = 0;
                        if (r === 2 && c >= 6 && c <= 12) multiFloorGrid[z][r][c] = 0;

                        // Tòa K2 (Top-Right): c > 15, r <= 6 (Active ở Tầng 2 & 3)
                        if (c === 17 && r <= 6) multiFloorGrid[z][r][c] = 0;
                        if (r === 2 && c >= 16) multiFloorGrid[z][r][c] = 0;

                        // Tòa K1 (Bottom-Right): c > 15, r >= 10 (Active ở Tầng 2 & 3)
                        if (c === 17 && r >= 10) multiFloorGrid[z][r][c] = 0;
                        if (r === 12 && c >= 16) multiFloorGrid[z][r][c] = 0;
                    }
                }
            }

            // --- THIẾT LẬP VÙNG PHÒNG KHÁM (CHUYÊN KHOA) ---
            // Tầng 1: Tiêu hóa (K2) và Tim mạch (P)
            for (let r = 1; r <= 5; r++) {
                for (let c = 18; c < GRID_COLS; c++) multiFloorGrid[1][r][c] = 3;
                for (let c = 0; c < 2; c++) multiFloorGrid[1][r][c] = 3;
            }
            // Tầng 1: Cấp cứu A9 (Bottom-Left)
            for (let r = 10; r <= 13; r++) {
                for (let c = 0; c < 2; c++) multiFloorGrid[1][r][c] = 3;
            }

            // Tầng 2: Hô hấp (K1) và Xương khớp (Q)
            for (let r = 10; r <= 13; r++) {
                for (let c = 18; c < GRID_COLS; c++) multiFloorGrid[2][r][c] = 3;
            }
            for (let r = 1; r <= 2; r++) {
                for (let c = 7; c <= 11; c++) multiFloorGrid[2][r][c] = 3;
            }

            // Tầng 3: Thần kinh (K2) và Phụ sản (P)
            for (let r = 1; r <= 5; r++) {
                for (let c = 18; c < GRID_COLS; c++) multiFloorGrid[3][r][c] = 3;
                for (let c = 0; c < 2; c++) multiFloorGrid[3][r][c] = 3;
            }
            // Tầng 3: Nội Nhi (K1)
            for (let r = 10; r <= 13; r++) {
                for (let c = 18; c < GRID_COLS; c++) multiFloorGrid[3][r][c] = 3;
            }

            // --- THIẾT LẬP THANG MÁY CHO CÁC KHU TÒA ---
            for (let z = 0; z <= 3; z++) {
                // Thang máy Tòa P (Active ở Tầng 0, 1, 3)
                if (z === 0 || z === 1 || z === 3) {
                    multiFloorGrid[z][2][2] = 4;
                }
                // Thang máy Tòa Q (Active ở tất cả các tầng)
                if (z === 0 || z === 1 || z === 2 || z === 3) {
                    multiFloorGrid[z][2][9] = 4;
                }
                // Thang máy Tòa K2 (Active ở tất cả các tầng)
                if (z === 0 || z === 1 || z === 2 || z === 3) {
                    multiFloorGrid[z][2][17] = 4;
                }
                // Thang máy Tòa K1 (Active ở tất cả các tầng)
                if (z === 0 || z === 1 || z === 2 || z === 3) {
                    multiFloorGrid[z][12][17] = 4;
                }
                // Lối vào trung chuyển A9 (Active ở Tầng 0 và 1)
                if (z === 0 || z === 1) {
                    multiFloorGrid[z][12][2] = 4;
                }
            }
        }

        function renderHospitalArchitectureMap() {
            gridMapEl.innerHTML = '';
            gridMapEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, 26px)`;

            const currentGrid = multiFloorGrid[currentRenderFloor];

            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell border-[0.5px] border-white/5';
                    cell.id = `cell-${r}-${c}`;

                    const type = currentGrid[r][c];

                    if (type === 1) cell.classList.add('architectural-wall');
                    if (type === 2) cell.classList.add('congested');
                    if (type === 3) {
                        cell.classList.add('room-zone');
                        if ((r + c) % 5 === 0) cell.textContent = '★';
                    }
                    if (type === 4) {
                        cell.classList.add('elevator');
                        cell.innerHTML = '<i class="fa-solid fa-elevator text-[10px]"></i>';
                    }
                    if (type === 5) {
                        cell.classList.add('stairs');
                        cell.innerHTML = '<i class="fa-solid fa-stairs text-[10px]"></i>';
                    }

                    if (r === startPos.r && c === startPos.c && currentRenderFloor === startPos.z) {
                        cell.className = 'cell start';
                        cell.innerHTML = '<i class="fa-solid fa-street-view text-xs"></i>';
                    }
                    if (targetPos && r === targetPos.r && c === targetPos.c && currentRenderFloor === targetPos.z) {
                        cell.className = 'cell end';
                        cell.innerHTML = '<i class="fa-solid fa-location-dot text-xs"></i>';
                    }

                    cell.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        if ((r === startPos.r && c === startPos.c && currentRenderFloor === startPos.z) ||
                            (targetPos && r === targetPos.r && c === targetPos.c && currentRenderFloor === targetPos.z) ||
                            type === 1 || type === 4 || type === 5) return;

                        isMouseDown = true;
                        if (isShiftPressed) {
                            dragMode = (type === 2) ? 'clear-congest' : 'set-congest';
                        }
                        updateCellWeight(r, c, dragMode);
                    });
                    cell.addEventListener('mouseenter', () => { if (isMouseDown && isShiftPressed) updateCellWeight(r, c, dragMode); });

                    gridMapEl.appendChild(cell);
                }
            }
        }

        function updateCellWeight(r, c, mode) {
            const type = multiFloorGrid[currentRenderFloor][r][c];
            if ((r === startPos.r && c === startPos.c && currentRenderFloor === startPos.z) ||
                (targetPos && r === targetPos.r && c === targetPos.c && currentRenderFloor === targetPos.z) ||
                type === 1 || type === 4 || type === 5) return;

            const el = document.getElementById(`cell-${r}-${c}`);

            if (mode === 'set-congest') {
                multiFloorGrid[currentRenderFloor][r][c] = 2; el.className = 'cell congested';
            } else if (mode === 'clear-congest') {
                const isRoom = (currentRenderFloor === 1 && ((c > 15 && r >= 1 && r <= 6) || (c < 4 && r >= 1 && r <= 6))) ||
                    (currentRenderFloor === 2 && ((c > 15 && r >= 10 && r <= 14) || (c >= 6 && c <= 12 && r >= 1 && r <= 3))) ||
                    (currentRenderFloor === 3 && ((c > 15 && r >= 1 && r <= 6) || (c < 4 && r >= 1 && r <= 6) || (c > 15 && r >= 10 && r <= 14)));

                multiFloorGrid[currentRenderFloor][r][c] = isRoom ? 3 : 0;
                el.className = isRoom ? 'cell room-zone' : 'cell border-[0.5px] border-white/5';
                if (isRoom && (r + c) % 5 === 0) el.textContent = '★';
                else el.textContent = '';
            }
            executeAStarRoutingEngine();
        }

        let active3DPath = [];

        function executeAStarRoutingEngine() {
            if (!targetPos) return;
            const startTime = performance.now();

            // Xóa đánh dấu đường đi cũ trên UI
            document.querySelectorAll('.cell').forEach(el => {
                el.classList.remove('path');
                const r = parseInt(el.id.split('-')[1]);
                const c = parseInt(el.id.split('-')[2]);
                const type = multiFloorGrid[currentRenderFloor][r][c];
                if (type === 4) {
                    el.innerHTML = '<i class="fa-solid fa-elevator text-[10px]"></i>';
                } else if (type === 5) {
                    el.innerHTML = '<i class="fa-solid fa-stairs text-[10px]"></i>';
                } else if (r === startPos.r && c === startPos.c && currentRenderFloor === startPos.z) {
                    el.innerHTML = '<i class="fa-solid fa-street-view text-xs"></i>';
                } else if (targetPos && r === targetPos.r && c === targetPos.c && currentRenderFloor === targetPos.z) {
                    el.innerHTML = '<i class="fa-solid fa-location-dot text-xs"></i>';
                } else if (type === 3) {
                    if ((r + c) % 5 === 0) el.textContent = '★';
                    else el.textContent = '';
                } else {
                    el.textContent = '';
                }
            });

            const C_FLOOR = 15.0;
            const PENALTY_CONGESTED = 7.0;
            const heuristicType = heuristicSelect.value;

            // Thu thập các tọa độ trung chuyển dọc (thang máy/thang bộ)
            const verticalNodes = [];
            for (let z = 0; z <= 3; z++) {
                for (let r = 0; r < GRID_ROWS; r++) {
                    for (let c = 0; c < GRID_COLS; c++) {
                        const type = multiFloorGrid[z][r][c];
                        if (type === 4 || type === 5) {
                            if (!verticalNodes.some(n => n.r === r && n.c === c)) {
                                verticalNodes.push({ r, c });
                            }
                        }
                    }
                }
            }

            // Hàm Heuristic 3D Elevator-Aware
            const calculateHeuristic = (s) => {
                if (s.z === targetPos.z) {
                    return (heuristicType === 'manhattan') ?
                        (Math.abs(s.r - targetPos.r) + Math.abs(s.c - targetPos.c)) :
                        Math.sqrt(Math.pow(s.r - targetPos.r, 2) + Math.pow(s.c - targetPos.c, 2));
                }

                let minH = Infinity;
                for (let i = 0; i < verticalNodes.length; i++) {
                    const e = verticalNodes[i];
                    let h2dToE = 0;
                    let h2dFromE = 0;
                    if (heuristicType === 'manhattan') {
                        h2dToE = Math.abs(s.r - e.r) + Math.abs(s.c - e.c);
                        h2dFromE = Math.abs(e.r - targetPos.r) + Math.abs(e.c - targetPos.c);
                    } else {
                        h2dToE = Math.sqrt(Math.pow(s.r - e.r, 2) + Math.pow(s.c - e.c, 2));
                        h2dFromE = Math.sqrt(Math.pow(e.r - targetPos.r, 2) + Math.pow(e.c - targetPos.c, 2));
                    }
                    const hTotal = h2dToE + Math.abs(s.z - targetPos.z) * C_FLOOR + h2dFromE;
                    if (hTotal < minH) {
                        minH = hTotal;
                    }
                }
                return minH;
            };

            const openHeap = new PriorityMinHeap();
            const closedSet = new Set();
            const openTracker = new Set();

            const makeKey = (s) => `${s.r},${s.c},${s.z}`;

            const cellMeta = {};
            const startKey = makeKey(startPos);
            cellMeta[startKey] = { f: 0, g: 0, h: calculateHeuristic(startPos), pR: -1, pC: -1, pZ: -1 };

            openHeap.push({ r: startPos.r, c: startPos.c, z: startPos.z, f: cellMeta[startKey].h });
            openTracker.add(startKey);

            let targetFound = false;
            let exploredNodesCount = 0;
            const dRow = [-1, 1, 0, 0, -1, -1, 1, 1];
            const dCol = [0, 0, -1, 1, -1, 1, -1, 1];
            const moveCosts = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414];

            while (!openHeap.isEmpty()) {
                const current = openHeap.pop();
                const currKey = makeKey(current);

                if (closedSet.has(currKey)) continue;
                openTracker.delete(currKey);
                closedSet.add(currKey);
                exploredNodesCount++;

                if (current.r === targetPos.r && current.c === targetPos.c && current.z === targetPos.z) {
                    targetFound = true;
                    break;
                }

                const currentCellType = multiFloorGrid[current.z][current.r][current.c];

                // 1. Tìm kiếm trên cùng mặt sàn (8 hướng)
                for (let i = 0; i < 8; i++) {
                    const nR = current.r + dRow[i];
                    const nC = current.c + dCol[i];
                    const nZ = current.z;

                    if (nR < 0 || nR >= GRID_ROWS || nC < 0 || nC >= GRID_COLS) continue;

                    const nextCellType = multiFloorGrid[nZ][nR][nC];
                    if (nextCellType === 1) continue; // Bỏ qua tường

                    const nextKey = makeKey({ r: nR, c: nC, z: nZ });
                    if (closedSet.has(nextKey)) continue;

                    // Tránh đi chéo cắt góc tường
                    if (i >= 4) {
                        if (multiFloorGrid[nZ][current.r][nC] === 1 || multiFloorGrid[nZ][nR][current.c] === 1) continue;
                    }

                    let stepCost = moveCosts[i];
                    if (nextCellType === 2) stepCost += PENALTY_CONGESTED; // Phạt ùn tắc

                    const potentialG = cellMeta[currKey].g + stepCost;
                    const hCost = calculateHeuristic({ r: nR, c: nC, z: nZ });
                    const fCost = potentialG + hCost;

                    if (!cellMeta[nextKey] || fCost < cellMeta[nextKey].f) {
                        cellMeta[nextKey] = { f: fCost, g: potentialG, h: hCost, pR: current.r, pC: current.c, pZ: current.z };
                        if (!openTracker.has(nextKey)) {
                            openHeap.push({ r: nR, c: nC, z: nZ, f: fCost });
                            openTracker.add(nextKey);
                        }
                    }
                }

                // 2. Tìm kiếm liên kết thẳng đứng (Chuyển tầng)
                if (currentCellType === 4 || currentCellType === 5) {
                    for (let nZ = 0; nZ <= 3; nZ++) {
                        if (nZ === current.z) continue;

                        const targetCellType = multiFloorGrid[nZ][current.r][current.c];
                        if (targetCellType === 1) continue; // Bỏ qua nếu tầng kia bị tường bịt kín

                        const nextKey = makeKey({ r: current.r, c: current.c, z: nZ });
                        if (closedSet.has(nextKey)) continue;

                        const floorDiff = Math.abs(nZ - current.z);
                        const verticalCost = floorDiff * C_FLOOR; // Chi phí di chuyển thẳng đứng vật lý

                        const potentialG = cellMeta[currKey].g + verticalCost;
                        const hCost = calculateHeuristic({ r: current.r, c: current.c, z: nZ });
                        const fCost = potentialG + hCost;

                        if (!cellMeta[nextKey] || fCost < cellMeta[nextKey].f) {
                            cellMeta[nextKey] = { f: fCost, g: potentialG, h: hCost, pR: current.r, pC: current.c, pZ: current.z };
                            if (!openTracker.has(nextKey)) {
                                openHeap.push({ r: current.r, c: current.c, z: nZ, f: fCost });
                                openTracker.add(nextKey);
                            }
                        }
                    }
                }
            }

            const endTime = performance.now();
            document.getElementById('metricTime').textContent = (endTime - startTime).toFixed(2);
            document.getElementById('metricExplored').textContent = exploredNodesCount;

            if (targetFound) {
                active3DPath = [];
                let trace = { r: targetPos.r, c: targetPos.c, z: targetPos.z };
                const totalCost = cellMeta[makeKey(trace)].g;

                while (trace.r !== -1) {
                    active3DPath.push({ r: trace.r, c: trace.c, z: trace.z });
                    const meta = cellMeta[makeKey(trace)];
                    trace = { r: meta.pR, c: meta.pC, z: meta.pZ };
                }
                active3DPath.reverse();

                document.getElementById('metricSteps').textContent = `${(active3DPath.length - 1) * 2} mét`;
                document.getElementById('metricCost').textContent = totalCost.toFixed(1);

                // Tô màu đường đi trên giao diện tầng đang xem
                active3DPath.forEach(pt => {
                    if (pt.z === currentRenderFloor) {
                        const isStart = (pt.r === startPos.r && pt.c === startPos.c && pt.z === startPos.z);
                        const isEnd = (pt.r === targetPos.r && pt.c === targetPos.c && pt.z === targetPos.z);
                        if (!isStart && !isEnd) {
                            const cellEl = document.getElementById(`cell-${pt.r}-${pt.c}`);
                            if (cellEl) {
                                cellEl.classList.add('path');
                            }
                        }
                    }
                });

                generateHumanReadableDirections(active3DPath);
            } else {
                active3DPath = [];
                document.getElementById('metricSteps').textContent = 'N/A';
                document.getElementById('metricCost').textContent = 'N/A';
                stepDirectionsList.innerHTML = `<div class="text-rose-400 text-center font-semibold mt-4"><i class="fa-solid fa-triangle-exclamation"></i> Không có lối đi, tuyến đường bị cô lập!</div>`;
            }
        }

        function generateHumanReadableDirections(path) {
            stepDirectionsList.innerHTML = '';
            let directions = [];

            directions.push({
                icon: 'fa-play-circle text-cyan-400',
                text: `Khởi hành tại <strong class="text-white">${REAL_WORLD_MAP_LABELS[`${startPos.c},${startPos.r}`] || "Điểm xuất phát"}</strong> (Tầng ${startPos.z}).`
            });

            let currentSegmentLength = 0;
            let lastDirection = null;

            for (let i = 0; i < path.length - 1; i++) {
                let curr = path[i];
                let next = path[i + 1];

                if (curr.z !== next.z) {
                    if (currentSegmentLength > 0) {
                        directions.push({
                            icon: 'fa-arrow-turn-up text-cyan-300',
                            text: `Tiến bước thêm <span class="text-emerald-400 font-bold">${currentSegmentLength}m</span>: ${lastDirection}.`
                        });
                        currentSegmentLength = 0;
                        lastDirection = null;
                    }
                    const type = multiFloorGrid[curr.z][curr.r][curr.c];
                    const transName = (type === 4) ? "Thang máy" : "Thang bộ";
                    directions.push({
                        icon: 'fa-elevator text-indigo-400 animate-pulse',
                        text: `Đi vào <strong class="text-white">${transName}</strong>, di chuyển từ <strong class="text-cyan-300">Tầng ${curr.z}</strong> lên/xuống <strong class="text-cyan-300">Tầng ${next.z}</strong>.`
                    });
                    continue;
                }

                let dr = next.r - curr.r;
                let dc = next.c - curr.c;
                let currentDirection = "";

                if (dr === -1 && dc === 0) currentDirection = "Đi thẳng theo hành lang hướng Bắc";
                else if (dr === 1 && dc === 0) currentDirection = "Đi thẳng theo hành lang hướng Nam";
                else if (dr === 0 && dc === -1) currentDirection = "Đi theo lối đi hướng Tây";
                else if (dr === 0 && dc === 1) currentDirection = "Đi theo lối đi hướng Đông";
                else currentDirection = "Di chuyển chéo xuyên sảnh tòa nhà";

                if (lastDirection === null) {
                    lastDirection = currentDirection;
                    currentSegmentLength = 2;
                } else if (currentDirection === lastDirection) {
                    currentSegmentLength += 2;
                } else {
                    directions.push({
                        icon: 'fa-arrow-turn-up text-cyan-300',
                        text: `Tiến bước thêm <span class="text-emerald-400 font-bold">${currentSegmentLength}m</span>: ${lastDirection}.`
                    });
                    lastDirection = currentDirection;
                    currentSegmentLength = 2;
                }
            }

            if (currentSegmentLength > 0 && lastDirection !== null) {
                directions.push({
                    icon: 'fa-arrow-trend-up text-cyan-300',
                    text: `Tiến bước thêm <span class="text-emerald-400 font-bold">${currentSegmentLength}m</span>: ${lastDirection}.`
                });
            }

            const endStop = medicalItinerary[currentItineraryIndex];
            directions.push({
                icon: 'fa-flag-checkered text-rose-500 animate-pulse',
                text: `Đến đích: Di chuyển thẳng vào bên trong <strong class="text-emerald-400">${endStop.roomName}</strong> (Tầng ${targetPos.z}).`
            });

            directions.forEach(dir => {
                const item = document.createElement('div');
                item.className = "flex gap-2.5 items-start bg-white/[0.02] p-2 rounded-lg border border-white/5";
                item.innerHTML = `
                    <div class="mt-0.5 text-xs text-center w-4 shrink-0"><i class="fa-solid ${dir.icon}"></i></div>
                    <p class="text-slate-300 leading-tight">${dir.text}</p>
                `;
                stepDirectionsList.appendChild(item);
            });
        }

        function changeRenderFloor(z) {
            currentRenderFloor = z;

            const floorLabels = {
                0: "Tầng 0 (Sảnh tiếp đón)",
                1: "Tầng 1 (Khoa Tiêu Hóa & Tim Mạch)",
                2: "Tầng 2 (Khoa Hô Hấp & Xương Khớp)",
                3: "Tầng 3 (Khoa Thần Kinh)"
            };
            document.getElementById('floorTitleLabel').textContent = floorLabels[z] || `Tầng ${z}`;

            for (let i = 0; i <= 3; i++) {
                const btn = document.getElementById(`btn-floor-${i}`);
                if (btn) {
                    if (i === z) {
                        btn.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-600 text-white shadow-md shadow-cyan-600/20 transition-all";
                    } else {
                        btn.className = "px-2.5 py-1 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all";
                    }
                }
            }

            renderHospitalArchitectureMap();

            // Vẽ lại path nếu có
            if (active3DPath && active3DPath.length > 0) {
                active3DPath.forEach(pt => {
                    if (pt.z === currentRenderFloor) {
                        const isStart = (pt.r === startPos.r && pt.c === startPos.c && pt.z === startPos.z);
                        const isEnd = (pt.r === targetPos.r && pt.c === targetPos.c && pt.z === targetPos.z);
                        if (!isStart && !isEnd) {
                            const cellEl = document.getElementById(`cell-${pt.r}-${pt.c}`);
                            if (cellEl) {
                                cellEl.classList.add('path');
                            }
                        }
                    }
                });
            }
        }

        function setupNavigationSegment() {
            if (medicalItinerary.length === 0) return;

            const stop = medicalItinerary[currentItineraryIndex];

            // Map Chuyên khoa với tầng cụ thể
            let targetZ = 0;
            if (stop.deptLabel.includes("Tiêu Hóa") || stop.deptLabel.includes("Tim Mạch") || stop.deptLabel.includes("Ngoại")) {
                targetZ = 1;
            } else if (stop.deptLabel.includes("Hô Hấp") || stop.deptLabel.includes("Xương Khớp") || stop.deptLabel.includes("Mắt") || stop.deptLabel.includes("Tai Mũi")) {
                targetZ = 2;
            } else if (stop.deptLabel.includes("Thần Kinh") || stop.deptLabel.includes("Nhi") || stop.deptLabel.includes("Truyền Nhiễm")) {
                targetZ = 3;
            }

            targetPos = { r: stop.y, c: stop.x, z: targetZ };

            document.getElementById('currentNavTargetLabel').textContent = `${stop.deptLabel} - ${stop.roomName}`;
            document.getElementById('itineraryCounterBadge').textContent = `Chặng ${currentItineraryIndex + 1} / ${medicalItinerary.length}`;
            document.getElementById('currentStopBadge').textContent = currentItineraryIndex + 1;

            if (currentItineraryIndex < medicalItinerary.length - 1) {
                nextStopBtn.classList.remove('hidden');
                nextStopBtn.className = "w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-900/20 mb-4 shrink-0";
                nextStopBtn.querySelector('span').textContent = `Hoàn tất thủ tục - Chuyển sang Chặng ${currentItineraryIndex + 2}`;
            } else {
                nextStopBtn.classList.remove('hidden');
                nextStopBtn.querySelector('span').textContent = `Kết thúc Toàn bộ Lộ trình Khám`;
                nextStopBtn.className = "w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-extrabold text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-900/20 mb-4 shrink-0";
            }

            changeRenderFloor(startPos.z);
            executeAStarRoutingEngine();
        }

        function bindUserInteractions() {
            document.getElementById('proceedToNavBtn').addEventListener('click', () => {
                currentItineraryIndex = 0;
                startPos = { r: 1, c: 1, z: 0 }; // Khởi phát tại sảnh K1 tầng 0
                const p1 = document.getElementById('phase1'); const p2 = document.getElementById('phase2');
                p1.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
                p2.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none'); p2.classList.add('translate-x-0');
                setupNavigationSegment();
            });

            document.getElementById('backToPhase1Btn').addEventListener('click', () => {
                const p1 = document.getElementById('phase1'); const p2 = document.getElementById('phase2');
                p2.classList.remove('translate-x-0');
                p2.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                p1.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
            });

            nextStopBtn.addEventListener('click', () => {
                if (currentItineraryIndex < medicalItinerary.length - 1) {
                    const prevStop = medicalItinerary[currentItineraryIndex];
                    let prevZ = 0;
                    if (prevStop.deptLabel.includes("Tiêu Hóa") || prevStop.deptLabel.includes("Tim Mạch") || prevStop.deptLabel.includes("Ngoại")) {
                        prevZ = 1;
                    } else if (prevStop.deptLabel.includes("Hô Hấp") || prevStop.deptLabel.includes("Xương Khớp") || prevStop.deptLabel.includes("Mắt") || prevStop.deptLabel.includes("Tai Mũi")) {
                        prevZ = 2;
                    } else if (prevStop.deptLabel.includes("Thần Kinh") || prevStop.deptLabel.includes("Nhi") || prevStop.deptLabel.includes("Truyền Nhiễm")) {
                        prevZ = 3;
                    }
                    startPos = { r: prevStop.y, c: prevStop.x, z: prevZ };
                    currentItineraryIndex++;
                    setupNavigationSegment();
                } else {
                    alert("Bạn đã hoàn thành việc mô phỏng toàn bộ lộ trình khám bệnh thông minh.");
                    location.reload();
                }
            });

            const bBFS = document.getElementById('btnBFS'); const bDFS = document.getElementById('btnDFS');
            if(bBFS) {
                bBFS.addEventListener('click', () => {
                    currentAlgoMode = 'BFS';
                    bBFS.className = "py-2 text-xs font-bold rounded-lg bg-cyan-600 text-white shadow-md shadow-cyan-600/20 transition-all";
                    bDFS.className = "py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all";
                    itineraryPanel.classList.add('hidden');
                });
            }
            if(bDFS) {
                bDFS.addEventListener('click', () => {
                    currentAlgoMode = 'DFS';
                    bDFS.className = "py-2 text-xs font-bold rounded-lg bg-cyan-600 text-white shadow-md shadow-cyan-600/20 transition-all";
                    bBFS.className = "py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all";
                    itineraryPanel.classList.add('hidden');
                });
            }

            window.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftPressed = true; });
            window.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftPressed = false; });
            window.addEventListener('mouseup', () => { isMouseDown = false; dragMode = null; });

            document.getElementById('startSelect').addEventListener('change', (e) => {
                const [c, r] = e.target.value.split(',').map(Number);
                startPos = { r, c, z: 0 };
                changeRenderFloor(0);
                executeAStarRoutingEngine();
            });
            heuristicSelect.addEventListener('change', executeAStarRoutingEngine);
        }

        initApp();
    
