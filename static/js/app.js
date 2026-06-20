// State variables
let triageState = {
    root_selections: [],
    sub_paths: {}
};
let currentActiveRoot = null;
let targetCoordinates = null;
let targetDepartmentId = null;

// Grid configuration for map drawing (Assuming 20 rows x 30 cols)
let GRID_ROWS = 23;
let GRID_COLS = 10;

// Convention for Grid Data:
// 1 = Walkable (Normal speed)
// >1 = Walkable but Congested (Slower)
// 0, null, or Infinity = Obstacle / Wall
// Global map data from backend
let hospitalGrid = null;

// Animation State
let currentPathProgress = 0;
let animationReqId = null;
let currentPath = [];
let currentGoalObj = null;
let currentStartArr = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Fetch map first
    await fetchMapData();
    initTriage();
    initHoverTooltips();

    document.getElementById("btn-reset").addEventListener("click", () => {
        triageState = { root_selections: [], sub_paths: {} };
        currentActiveRoot = null;
        document.getElementById("btn-reset").classList.add("hidden");
        initTriage();
    });

    document.getElementById("btn-back").addEventListener("click", () => {
        document.getElementById("phase-routing").classList.add("hidden");
        document.getElementById("phase-triage").classList.remove("hidden");
        triageState = { root_selections: [], sub_paths: {} };
        currentActiveRoot = null;
        document.getElementById("btn-reset").classList.add("hidden");
        initTriage();
    });

    // button btn-route removed, routing is triggered per result item
    
    document.getElementById("btn-custom-route").addEventListener("click", () => {
        const destSelect = document.getElementById("input-custom-dest");
        const val = destSelect.value;
        if (!val) {
            showToast("Vui lòng chọn điểm đến", "error");
            return;
        }
        
        const parts = val.split(',').map(s => parseInt(s.trim()));
        targetCoordinates = { r: parts[0], c: parts[1], z: parts[2] };
        targetDepartmentId = null;
        
        const btn = document.getElementById("btn-custom-route");
        handleRoutingRequest(btn);
    });
});

let rawMapData = null;

async function fetchMapData() {
    try {
        const response = await fetch('/api/map');
        const data = await response.json();
        if (data.status === "success") {
            rawMapData = data.map_data;
            GRID_ROWS = rawMapData.metadata.rows;
            GRID_COLS = rawMapData.metadata.cols;
            
            // Build hospitalGrid (0 for walkable, 1 for obstacle) for routing
            hospitalGrid = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                let row = [];
                for (let c = 0; c < GRID_COLS; c++) {
                    const cell = rawMapData.floor_1[r][c];
                    if (cell.type === "wall") {
                        row.push(1);
                    } else {
                        row.push(0);
                    }
                }
                hospitalGrid.push(row);
            }
            populateLocationsDropdown();
        } else {
            console.error("Failed to load map data");
        }
    } catch (e) {
        console.error("Error fetching map:", e);
    }
}

function populateLocationsDropdown() {
    if (!rawMapData) return;
    
    const selectStart = document.getElementById("input-start");
    const selectDest = document.getElementById("input-custom-dest");
    
    let locations = [];
    let seenNames = new Set();

    const floors = [
        { key: 'floor_1', name: 'Tầng 1', z: 0 },
        { key: 'floor_2', name: 'Tầng 2', z: 1 }
    ];

    for (let floor of floors) {
        if (!rawMapData[floor.key]) continue;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const cell = rawMapData[floor.key][r][c];
                if (cell && cell.text && cell.text.trim() !== "") {
                    const locName = cell.text.trim();
                    const dedupeKey = `${locName}_${floor.z}`;
                    if (!seenNames.has(dedupeKey)) {
                        seenNames.add(dedupeKey);
                        locations.push({
                            name: locName,
                            r: r,
                            c: c,
                            z: floor.z,
                            floorName: floor.name
                        });
                    }
                }
            }
        }
    }

    // Sort locations: Gates first, then alphabetical
    locations.sort((a, b) => {
        const isGateA = a.name.toLowerCase().includes('cổng');
        const isGateB = b.name.toLowerCase().includes('cổng');
        if (isGateA && !isGateB) return -1;
        if (!isGateA && isGateB) return 1;
        return a.name.localeCompare(b.name);
    });

    if (selectStart) {
        selectStart.innerHTML = "";
        for (let loc of locations) {
            const option = document.createElement("option");
            option.value = `${loc.r},${loc.c},${loc.z}`;
            option.textContent = `${loc.name} (${loc.floorName})`;
            selectStart.appendChild(option);
        }
    }

    if (selectDest) {
        selectDest.innerHTML = '<option value="">-- Chọn điểm đến --</option>';
        // Sort destinations alphabetically (no gate priority needed)
        const destLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name));
        for (let loc of destLocations) {
            const option = document.createElement("option");
            option.value = `${loc.r},${loc.c},${loc.z}`;
            option.textContent = `${loc.name} (${loc.floorName})`;
            selectDest.appendChild(option);
        }
    }
}

async function initTriage() {
    showLoader(true);
    try {
        const response = await fetch('/api/triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(triageState)
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || "Failed to load triage data");
        
        handleTriageResponse(data);
    } catch (error) {
        showToast(error.message, "error");
        document.getElementById("question-text").innerText = "Lỗi kết nối. Vui lòng thử lại.";
    } finally {
        showLoader(false);
    }
}

function handleTriageResponse(data) {
    if (data.status === "question") {
        document.getElementById("question-text").innerText = data.question;
        const container = document.getElementById("options-container");
        container.innerHTML = "";
        
        if (data.is_root) {
            // Render checkboxes
            data.options.forEach((opt, index) => {
                const labelWrapper = document.createElement("label");
                labelWrapper.className = "option-card w-full text-left bg-white border border-gray-200 rounded-xl p-4 font-medium text-gray-700 hover:text-indigo-700 cursor-pointer flex items-center gap-3";
                labelWrapper.innerHTML = `
                    <input type="checkbox" value="${index}" class="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500">
                    <span>${opt.label}</span>
                `;
                container.appendChild(labelWrapper);
            });
            const btn = document.createElement("button");
            btn.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl mt-4 transition-all";
            btn.innerText = "Tiếp tục";
            btn.onclick = () => {
                const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
                const selected = Array.from(checkboxes).map(cb => parseInt(cb.value));
                if (selected.length === 0) {
                    showToast("Vui lòng chọn ít nhất 1 triệu chứng", "error");
                    return;
                }
                triageState.root_selections = selected;
                document.getElementById("btn-reset").classList.remove("hidden");
                initTriage();
            };
            container.appendChild(btn);
        } else {
            // Render buttons for follow-up questions
            currentActiveRoot = data.active_root;
            data.options.forEach((opt, index) => {
                const btn = document.createElement("button");
                btn.className = "option-card w-full text-left bg-white border border-gray-200 rounded-xl p-4 font-medium text-gray-700 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex justify-between items-center";
                btn.innerHTML = `
                    <span>${opt.label}</span>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                `;
                btn.onclick = () => {
                    if (!triageState.sub_paths[currentActiveRoot]) {
                        triageState.sub_paths[currentActiveRoot] = [];
                    }
                    triageState.sub_paths[currentActiveRoot].push(index);
                    document.getElementById("btn-reset").classList.remove("hidden");
                    initTriage();
                };
                container.appendChild(btn);
            });
        }
    } else if (data.status === "complete") {
        document.getElementById("phase-triage").classList.add("hidden");
        document.getElementById("phase-routing").classList.remove("hidden");
        
        const resultsList = document.getElementById("results-list");
        resultsList.innerHTML = "";
        
        if (!data.results || data.results.length === 0) {
            resultsList.innerHTML = `<div class="text-gray-500 text-sm">Không tìm thấy kết quả phù hợp.</div>`;
            return;
        }
        
        data.results.forEach(res => {
            const floorName = res.coordinates.z === 0 ? "Tầng Trệt" : `Tầng ${res.coordinates.z + 1}`;
            const buildingName = res.building || "Chưa rõ";
            
            const card = document.createElement("div");
            card.className = "bg-white p-3 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-1.5";
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-bold text-indigo-700 text-base leading-tight">${res.result}</div>
                        <div class="text-[10px] text-gray-500 bg-gray-100 inline-block px-1.5 py-0.5 rounded mt-1">Ưu tiên: ${res.severity}/10</div>
                    </div>
                </div>
                <div class="text-xs text-gray-600 font-mono mt-1">Vị trí: ${floorName} - ${buildingName}</div>
                <button class="btn-route-item mt-1.5 w-full bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                    Dẫn đường
                </button>
            `;
            
            const btn = card.querySelector('.btn-route-item');
            btn.onclick = () => {
                targetDepartmentId = res.department_id;
                targetCoordinates = res.coordinates;
                handleRoutingRequest(btn);
            };
            
            resultsList.appendChild(card);
        });
        
        drawMapCanvas(null, data.results[0].coordinates);
    }
}

// BFS: find the nearest walkable corridor cell adjacent to a room/obstacle
function findNearestWalkable(grid, goalR, goalC) {
    const rows = grid.length, cols = grid[0].length;
    // If goal is already walkable, return it directly
    if (grid[goalR]?.[goalC] === 0) return [goalR, goalC];
    const visited = new Set([`${goalR},${goalC}`]);
    const queue = [[goalR, goalC]];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (queue.length) {
        const [r, c] = queue.shift();
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            const key = `${nr},${nc}`;
            if (!visited.has(key) && nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                visited.add(key);
                if (grid[nr][nc] === 0) return [nr, nc]; // found walkable neighbor
                queue.push([nr, nc]);
            }
        }
    }
    return [goalR, goalC]; // fallback (should not happen)
}

async function handleRoutingRequest(btnElement) {
    if (!targetCoordinates) return;
    const startInput = document.getElementById("input-start").value;
    const parts = startInput.split(',').map(s => parseInt(s.trim()));
    
    if (parts.length !== 3 || parts.some(isNaN)) {
        showToast("Vui lòng nhập đúng định dạng r,c,z", "error");
        return;
    }

    const startCoords = parts;
    const goalCoords = [targetCoordinates.r, targetCoordinates.c, targetCoordinates.z];
    
    const originalContent = btnElement.innerHTML;
    btnElement.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang tính...`;
    btnElement.disabled = true;

    try {
        // Build obstacle grid: only path / gate / elevator / stairs are walkable (0)
        // room-normal and room-wc are obstacles (1) — path must go AROUND them
        // Build obstacle grid: only path / gate / elevator / stairs are walkable (0)
        // room-normal, room-wc, and any cell covered by a CELL_SPAN are obstacles (1)
        const getGridArray = (floorName, z) => {
            if (!rawMapData || !rawMapData[floorName]) {
                return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(1));
            }
            
            // Build a set of all cells that are part of a merged room
            const spans = CELL_SPANS[z] || {};
            const roomCells = new Set();
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    const key = `${r}_${c}`;
                    if (spans[key]) {
                        for (let i = 0; i < spans[key].rs; i++) {
                            for (let j = 0; j < spans[key].cs; j++) {
                                roomCells.add(`${r + i}_${c + j}`);
                            }
                        }
                    }
                }
            }

            let arr = [];
            for (let r = 0; r < GRID_ROWS; r++) {
                let row = [];
                for (let c = 0; c < GRID_COLS; c++) {
                    const cell = rawMapData[floorName][r][c];
                    if (roomCells.has(`${r}_${c}`)) {
                        row.push(1); // Covered by a room span -> obstacle
                    } else if (cell.type === 'elevator') {
                        row.push(4); // Elevator must be 4 for backend A* 3D transitions
                    } else {
                        const walkable = ['path', 'gate', 'stairs'].includes(cell.type);
                        row.push(walkable ? 0 : 1);
                    }
                }
                arr.push(row);
            }
            return arr;
        };

        const minZ = Math.min(startCoords[2], goalCoords[2]);
        const maxZ = Math.max(startCoords[2], goalCoords[2]);
        const grids = {};
        for (let z = minZ; z <= maxZ; z++) {
            grids[z] = getGridArray(z === 0 ? 'floor_1' : 'floor_2', z);
        }

        // Goal cell is a room (obstacle) — find the nearest walkable corridor cell next to it
        const goalGrid = grids[goalCoords[2]];
        const [adjGoalR, adjGoalC] = findNearestWalkable(goalGrid, goalCoords[0], goalCoords[1]);
        const routingGoal = [adjGoalR, adjGoalC, goalCoords[2]];

        // Do the same for start cell in case user clicked inside a room
        const startGrid = grids[startCoords[2]];
        const [adjStartR, adjStartC] = findNearestWalkable(startGrid, startCoords[0], startCoords[1]);
        const routingStart = [adjStartR, adjStartC, startCoords[2]];

        const payload = {
            start: routingStart,
            goal: routingGoal,   // route to corridor cell adjacent to room
            grid: grids,
            algorithm: document.getElementById("input-algorithm").value
        };

        const response = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || "Lỗi định tuyến");
        
        document.getElementById("route-stats").classList.remove("hidden");
        document.getElementById("stat-cost").innerText = data.cost;
        document.getElementById("stat-nodes-expanded").innerText = data.nodes_expanded;
        
        showToast("Đã tìm thấy lộ trình!", "success");
        // Start Animation
        currentPathProgress = 0;
        currentPath = data.path;
        currentGoalObj = targetCoordinates;
        currentStartArr = startCoords;
        if (animationReqId) {
            clearTimeout(animationReqId);
            cancelAnimationFrame(animationReqId);
        }
        
        function animatePath() {
            currentPathProgress += 1; // Draw 1 node per frame
            drawMapCanvas(currentPath, currentGoalObj, currentStartArr);
            if (currentPathProgress < currentPath.length) {
                animationReqId = setTimeout(() => {
                    requestAnimationFrame(animatePath);
                }, 80); // Chậm lại: 80ms mỗi bước để cô giáo dễ quan sát
            }
        }
        animatePath();

    } catch (error) {
        showToast(error.message, "error");
    } finally {
        btnElement.innerHTML = originalContent;
        btnElement.disabled = false;
    }
}

// ── Cell-span table: mirrors Excel merged cells exactly ──────────────────────
// Key format: 'row_col'  →  { rs: rowspan, cs: colspan }
// Derived from merged cell ranges in "Bản đồ bệnh viện_tầng 1/2.xlsx"
const CELL_SPANS = {
    0: { // Floor 1
        // B2:B3 Nhà vệ sinh (2 rows), C2:C4 Quầy thuốc (3 rows), G2:G4 Khoa cấp cứu (3 rows)
        '2_2':  { rs: 2, cs: 1 }, '2_3':  { rs: 3, cs: 1 }, '2_7':  { rs: 3, cs: 1 },
        // G5, G6 are SEPARATE Thang máy cells (not merged in Excel)
        // B6 Thang bộ, C6 Thang máy (single rows)
        // B7:B9 Khoa truyền nhiễm (3 rows), C7:C9 Quầy tiếp đón (3 rows)
        '7_2':  { rs: 3, cs: 1 }, '7_3':  { rs: 3, cs: 1 },
        // E7:E15 Ghế chờ (9 rows!), G7:G9 Phòng nghỉ (3 rows)
        '7_5':  { rs: 9, cs: 1 }, '7_7':  { rs: 3, cs: 1 },
        // G10:G11 Thang bộ (2 rows), G12 Nhà vệ sinh (1 row)
        '10_7': { rs: 2, cs: 1 },
        // B13:B15 Khoa mắt (3 rows), C13:C15 Khoa Răng (3 rows), G13:G15 Phòng chụp (3 rows)
        '13_2': { rs: 3, cs: 1 }, '13_3': { rs: 3, cs: 1 }, '13_7': { rs: 3, cs: 1 },
        // B18:B20 Khoa TMH (3 rows), C18:C20 Phòng lấy mẫu (3 rows)
        // F18:F20 Thang máy (3 rows), G18:G20 Quầy tiếp đón (3 rows)
        '18_2': { rs: 3, cs: 1 }, '18_3': { rs: 3, cs: 1 },
        '18_6': { rs: 3, cs: 1 }, '18_7': { rs: 3, cs: 1 },
    },
    1: { // Floor 2
        // B2:B4 Khoa Hô hấp (3 rows), C2:C4 Phòng đo (3 rows)
        // D2:E4 Ghế chờ (3 rows × 2 cols!), F2:G4 Khoa Nhi (3 rows × 2 cols!)
        '2_2':  { rs: 3, cs: 1 }, '2_3':  { rs: 3, cs: 1 },
        '2_4':  { rs: 3, cs: 2 }, '2_6':  { rs: 3, cs: 2 },
        // G5, G6 SEPARATE Thang máy cells. B6 Thang bộ, C6 Thang máy (single rows)
        // B7:B8 Nhà vệ sinh (2 rows)
        '7_2':  { rs: 2, cs: 1 },
        // C7:C9 Phòng XN hóa sinh (3 rows), G7:G9 Phòng siêu âm (3 rows)
        '7_3':  { rs: 3, cs: 1 }, '7_7':  { rs: 3, cs: 1 },
        // E9:E12 Ghế chờ (4 rows!), G10:G11 Thang bộ (2 rows)
        '9_5':  { rs: 4, cs: 1 }, '10_7': { rs: 2, cs: 1 },
        // B13:B15 Khoa ngoại (3 rows), C13:C15 Khoa Tim (3 rows)
        // F13:F15 Phòng khử trùng (3 rows), G13:G15 Phòng dụng cụ (3 rows)
        '13_2': { rs: 3, cs: 1 }, '13_3': { rs: 3, cs: 1 },
        '13_6': { rs: 3, cs: 1 }, '13_7': { rs: 3, cs: 1 },
        // B18:B20 Khoa Tiêu hóa (3 rows), C18:C20 Phòng nội soi (3 rows)
        // D18:D20 Ghế chờ (3 rows), E18:E20 Khoa thần kinh (3 rows)
        // F18:F20 Thang máy (3 rows), G18:G20 Nhà vệ sinh (3 rows)
        '18_2': { rs: 3, cs: 1 }, '18_3': { rs: 3, cs: 1 }, '18_4': { rs: 3, cs: 1 },
        '18_5': { rs: 3, cs: 1 }, '18_6': { rs: 3, cs: 1 }, '18_7': { rs: 3, cs: 1 },
    }
};

// Helper: draw text with word-wrap centered in (cx, cy)
function wrapText(ctx, text, cx, cy, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    const startY = cy - (lines.length - 1) * lineHeight / 2;
    lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

function drawMapCanvas(path, goalObj, startArr = null) {
    drawFloor(0, "map-canvas-0", path, goalObj, startArr);
    drawFloor(1, "map-canvas-1", path, goalObj, startArr);
}

function drawFloor(floorIndex, canvasId, path, goalObj, startArr = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Set internal resolution
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const cellWidth = canvas.width / GRID_COLS;
    const cellHeight = canvas.height / GRID_ROWS;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid for walkable areas only (very faint)
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * cellHeight); ctx.lineTo(canvas.width, r * cellHeight); ctx.stroke();
    }
    for (let c = 0; c <= GRID_COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * cellWidth, 0); ctx.lineTo(c * cellWidth, canvas.height); ctx.stroke();
    }

    // Draw Map using rawMapData (with merged-cell support)
    if (rawMapData) {
        const floorData = floorIndex === 1 ? rawMapData.floor_2 : rawMapData.floor_1;
        const spans = CELL_SPANS[floorIndex] || {};

        // Build the set of cells that are "covered" by a spanning cell above/left
        const skipSet = new Set();
        for (const key in spans) {
            const [r, c] = key.split('_').map(Number);
            const { rs, cs } = spans[key];
            for (let dr = 0; dr < rs; dr++) {
                for (let dc = 0; dc < cs; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    skipSet.add(`${r + dr}_${c + dc}`);
                }
            }
        }

        // ── Pass 1: Draw room fills ──────────────────────────────────────────
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (skipSet.has(`${r}_${c}`)) continue;
                const cell = floorData[r][c];
                const x = c * cellWidth;
                const y = r * cellHeight;
                const sp = spans[`${r}_${c}`] || { rs: 1, cs: 1 };
                const dW = cellWidth  * sp.cs + 1;
                const dH = cellHeight * sp.rs + 1;

                if (cell.type === 'wall') {
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillRect(x, y, dW, dH);
                } else if (cell.type === 'room-normal') {
                    ctx.fillStyle = '#dbeafe';
                    ctx.fillRect(x, y, dW, dH);
                    ctx.strokeStyle = 'rgba(99,102,241,0.18)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 0.5, y + 0.5, dW - 1, dH - 1);
                } else if (cell.type === 'room-wc') {
                    ctx.fillStyle = '#ffedd5';
                    ctx.fillRect(x, y, dW, dH);
                    ctx.strokeStyle = 'rgba(234,88,12,0.18)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 0.5, y + 0.5, dW - 1, dH - 1);
                } else if (cell.type === 'elevator' || cell.type === 'stairs') {
                    ctx.fillStyle = '#e0e7ff';
                    ctx.fillRect(x, y, dW, dH);
                    ctx.strokeStyle = 'rgba(99,102,241,0.18)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 0.5, y + 0.5, dW - 1, dH - 1);
                }
                // path / gate → transparent (no fill)
            }
        }

        // ── Pass 2: Draw labels ──────────────────────────────────────────────
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (skipSet.has(`${r}_${c}`)) continue;
                const cell = floorData[r][c];
                if (!cell.text || cell.type === 'wall' || cell.type === 'path') continue;

                const sp = spans[`${r}_${c}`] || { rs: 1, cs: 1 };
                const dW = cellWidth  * sp.cs;
                const dH = cellHeight * sp.rs;
                const cx = c * cellWidth + dW / 2;
                const cy = r * cellHeight + dH / 2;

                const isGate  = cell.type === 'gate';
                const fSize   = isGate ? 10 : (sp.rs >= 2 ? 12 : 11);
                const lineH   = fSize + 4;
                const maxTxtW = dW - 10;

                ctx.font = `bold ${fSize}px 'Inter', sans-serif`;

                if (!isGate) {
                    // Estimate background rect size before drawing text
                    const words   = cell.text.split(' ');
                    let line = '', lines = [];
                    for (const w of words) {
                        const test = line ? line + ' ' + w : w;
                        if (ctx.measureText(test).width > maxTxtW && line) { lines.push(line); line = w; }
                        else line = test;
                    }
                    if (line) lines.push(line);
                    const bgW = Math.min(Math.max(...lines.map(l => ctx.measureText(l).width)) + 12, dW - 4);
                    const bgH = lines.length * lineH + 6;
                    ctx.fillStyle = 'rgba(255,255,255,0.90)';
                    ctx.fillRect(cx - bgW / 2, cy - bgH / 2, bgW, bgH);
                }

                ctx.fillStyle = isGate ? '#475569' : '#1e3a8a';
                wrapText(ctx, cell.text, cx, cy, maxTxtW, lineH);
            }
        }
    }

    // Draw Path
    if (path && path.length > 0) {
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        let isFirst = true;
        let lastNodeOnFloor = null;

        const maxNodes = Math.min(path.length, currentPathProgress || path.length);

        for (let i = 0; i < maxNodes; i++) {
            const node = path[i];
            if (node.z === floorIndex) {
                const x = node.c * cellWidth + cellWidth / 2;
                const y = node.r * cellHeight + cellHeight / 2;
                if (isFirst) { 
                    ctx.moveTo(x, y); 
                    isFirst = false; 
                } else { 
                    ctx.lineTo(x, y); 
                }
                lastNodeOnFloor = node;
            } else {
                isFirst = true;
            }
        }
        
        // Glow effect
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 8;
        
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Start Node if on this floor
        if (startArr && startArr[2] === floorIndex) {
            ctx.beginPath();
            ctx.arc(startArr[1] * cellWidth + cellWidth / 2, startArr[0] * cellHeight + cellHeight / 2, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#22c55e"; // green-500
            ctx.fill();
        }

        // Draw End Node if on this floor
        if (goalObj && goalObj.z === floorIndex) {
            const vEndR = goalObj.vr || goalObj.r;
            const vEndC = goalObj.vc || goalObj.c;
            const vEndX = goalObj.vc ? vEndC * cellWidth : vEndC * cellWidth + cellWidth / 2;
            const vEndY = goalObj.vr ? vEndR * cellHeight : vEndR * cellHeight + cellHeight / 2;
            
            // If the path reached this floor, draw dashed line to room
            if (lastNodeOnFloor) {
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.moveTo(lastNodeOnFloor.c * cellWidth + cellWidth / 2, lastNodeOnFloor.r * cellHeight + cellHeight / 2);
                ctx.lineTo(vEndX, vEndY);
                ctx.strokeStyle = "#ef4444"; // red dashed
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.setLineDash([]); // Reset
                
                // Draw Entrance Node
                ctx.beginPath();
                ctx.arc(lastNodeOnFloor.c * cellWidth + cellWidth / 2, lastNodeOnFloor.r * cellHeight + cellHeight / 2, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#f59e0b"; // amber-500
                ctx.fill();
            }
            
            ctx.beginPath();
            ctx.arc(vEndX, vEndY - 15, 6, 0, Math.PI * 2); // Slightly above the label
            ctx.fillStyle = "#ef4444"; // red-500
            ctx.fill();
        } else if (lastNodeOnFloor && lastNodeOnFloor !== path[path.length - 1]) {
            // Draw transition node (elevator/stairs) if path leaves this floor
            ctx.beginPath();
            ctx.arc(lastNodeOnFloor.c * cellWidth + cellWidth / 2, lastNodeOnFloor.r * cellHeight + cellHeight / 2, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#8b5cf6"; // purple-500 for floor transition
            ctx.fill();
            
            // Draw transition label
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(lastNodeOnFloor.c * cellWidth - 10, lastNodeOnFloor.r * cellHeight - 20, 30, 16);
            ctx.fillStyle = "#6d28d9";
            ctx.font = "bold 10px 'Inter', sans-serif";
            ctx.fillText(floorIndex === 0 ? "Lên ↑" : "Xuống ↓", lastNodeOnFloor.c * cellWidth + cellWidth / 2, lastNodeOnFloor.r * cellHeight - 12);
        }
    } else {
        // Draw Goal if path not generated yet and goal is on this floor
        if (goalObj && goalObj.z === floorIndex) {
            const vEndR = goalObj.vr || goalObj.r;
            const vEndC = goalObj.vc || goalObj.c;
            const vEndX = goalObj.vc ? vEndC * cellWidth : vEndC * cellWidth + cellWidth / 2;
            const vEndY = goalObj.vr ? vEndR * cellHeight : vEndR * cellHeight + cellHeight / 2;
            
            ctx.fillStyle = "#ef4444"; // Red
            ctx.beginPath();
            ctx.arc(vEndX, vEndY - 15, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Start if path not generated yet and start is on this floor
        if (startArr && startArr[2] === floorIndex) {
            ctx.fillStyle = "#22c55e"; // Green
            ctx.beginPath();
            ctx.arc(startArr[1] * cellWidth + cellWidth / 2, startArr[0] * cellHeight + cellHeight / 2, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Helpers
function showLoader(show) {
    const loader = document.getElementById("triage-loader");
    if (show) loader.classList.remove("hidden");
    else loader.classList.add("hidden");
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    
    let bgClass = "bg-gray-800";
    if (type === "error") bgClass = "bg-red-500";
    if (type === "success") bgClass = "bg-green-500";

    toast.className = `toast-enter ${bgClass} text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2`;
    toast.innerHTML = `
        ${type === 'error' ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : ''}
        ${type === 'success' ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove("toast-enter");
        toast.classList.add("toast-exit");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Handle window resize for canvas redraw
window.addEventListener('resize', () => {
    if (!document.getElementById("phase-routing").classList.contains("hidden")) {
        drawMapCanvas(currentPath, currentGoalObj, currentStartArr);
    }
});

// Add hover event listeners for tooltips
function initHoverTooltips() {
    const tooltip = document.getElementById("map-tooltip");
    
    function handleMouseMove(e, floorIndex, canvasId) {
        if (!rawMapData) return;
        const canvas = document.getElementById(canvasId);
        const rect = canvas.getBoundingClientRect();
        
        // Calculate cell size
        const cellWidth = canvas.width / GRID_COLS;
        const cellHeight = canvas.height / GRID_ROWS;
        
        // Calculate mouse position relative to canvas internal resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        const c = Math.floor(mouseX / cellWidth);
        const r = Math.floor(mouseY / cellHeight);
        
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            const floorData = floorIndex === 1 ? rawMapData.floor_2 : rawMapData.floor_1;
            
            // Check if cell is covered by a span
            let cell = floorData[r][c];
            let textToShow = cell.text;
            
            if (!textToShow) {
                // Find parent span
                const spans = CELL_SPANS[floorIndex] || {};
                for (const key in spans) {
                    const [sr, sc] = key.split('_').map(Number);
                    const { rs, cs } = spans[key];
                    if (r >= sr && r < sr + rs && c >= sc && c < sc + cs) {
                        textToShow = floorData[sr][sc].text;
                        break;
                    }
                }
            }

            if (textToShow && !['path', 'gate', 'wall'].includes(cell.type)) {
                tooltip.innerText = textToShow;
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY - 15}px`; // slightly above
                tooltip.style.opacity = '1';
                return;
            }
        }
        tooltip.style.opacity = '0';
    }

    const c0 = document.getElementById("map-canvas-0");
    const c1 = document.getElementById("map-canvas-1");
    
    if (c0) {
        c0.addEventListener('mousemove', (e) => handleMouseMove(e, 0, "map-canvas-0"));
        c0.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
    }
    if (c1) {
        c1.addEventListener('mousemove', (e) => handleMouseMove(e, 1, "map-canvas-1"));
        c1.addEventListener('mouseleave', () => tooltip.style.opacity = '0');
    }
}
