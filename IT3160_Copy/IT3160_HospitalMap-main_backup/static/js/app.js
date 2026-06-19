// State variables
let triageState = {
    root_selections: [],
    sub_paths: {}
};
let currentActiveRoot = null;
let targetCoordinates = null;
let targetDepartmentId = null;

// Grid configuration for map drawing (Assuming 20 rows x 30 cols)
const GRID_ROWS = 25;
const GRID_COLS = 20;

// Convention for Grid Data:
// 1 = Walkable (Normal speed)
// >1 = Walkable but Congested (Slower)
// 0, null, or Infinity = Obstacle / Wall
// Global map data from backend
let hospitalGrid = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Fetch map first
    await fetchMapData();
    initTriage();

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
});

async function fetchMapData() {
    try {
        const response = await fetch('/api/map');
        const data = await response.json();
        if (data.status === "success") {
            hospitalGrid = data.grid;
        } else {
            console.error("Failed to load map data");
        }
    } catch (e) {
        console.error("Error fetching map:", e);
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
            card.className = "bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-2";
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-bold text-indigo-700 text-lg">${res.result}</div>
                        <div class="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">Mức độ ưu tiên: ${res.severity}/10</div>
                    </div>
                </div>
                <div class="text-sm text-gray-600 font-mono">Vị trí: ${floorName} - ${buildingName}</div>
                <button class="btn-route-item mt-2 w-full bg-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
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
        const payload = {
            start: startCoords,
            goal: goalCoords,
            grid: {}
        };
        
        // Cấp phát ma trận bản đồ cho tất cả các tầng trung gian từ tầng xuất phát tới tầng đích
        // Nếu hospitalGrid chưa tải được, fallback về mảng toàn 1
        const gridData = hospitalGrid || Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(1));
        const minZ = Math.min(startCoords[2], goalCoords[2]);
        const maxZ = Math.max(startCoords[2], goalCoords[2]);
        for (let z = minZ; z <= maxZ; z++) {
            payload.grid[z] = gridData;
        }

        const response = await fetch('/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || "Lỗi định tuyến");
        
        document.getElementById("route-stats").classList.remove("hidden");
        document.getElementById("stat-cost").innerText = data.cost;
        document.getElementById("stat-latency").innerText = `${data.latency_ms} ms`;
        
        showToast("Đã tìm thấy lộ trình!", "success");
        drawMapCanvas(data.path, targetCoordinates, startCoords);

    } catch (error) {
        showToast(error.message, "error");
    } finally {
        btnElement.innerHTML = originalContent;
        btnElement.disabled = false;
    }
}

function drawMapCanvas(path, goalObj, startArr = null) {
    const canvas = document.getElementById("map-canvas");
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

    // Draw Obstacles (Buildings) based on Excel colors
    if (hospitalGrid) {
        const COLOR_MAP = {
            1: "#e7e6e6",
            2: "#a5a5a5",
            3: "#5b9bd5",
            4: "#44546a"
        };
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const val = hospitalGrid[r][c];
                if (val > 0) { // Obstacle
                    ctx.fillStyle = COLOR_MAP[val] || "#e2e8f0";
                    ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth + 1, cellHeight + 1);
                }
            }
        }
    }

    // Draw Labels for Buildings/Rooms
    const MAP_LABELS = [
        {"text": "Cổng 1", "r": 0.5, "c": 9.5}, 
        {"text": "Sảnh đón", "r": 6.5, "c": 8.5}, 
        {"text": "Quầy phát thuốc", "r": 13.5, "c": 3.5}, 
        {"text": "Khu hành chính", "r": 13.5, "c": 15.5}, 
        {"text": "Sảnh chính", "r": 15.5, "c": 9.5}, 
        {"text": "Thang máy", "r": 21.5, "c": 3.5}, 
        {"text": "Thang máy", "r": 21.5, "c": 18.5}
    ];
    
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 14px 'Inter', sans-serif";
    
    for (let label of MAP_LABELS) {
        const x = label.c * cellWidth;
        const y = label.r * cellHeight;
        
        // Add a small white background badge for visibility
        const textWidth = ctx.measureText(label.text).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(x - textWidth/2 - 6, y - 10, textWidth + 12, 20);
        ctx.fillStyle = "#b91c1c"; // red-700
        ctx.fillText(label.text, x, y);
    }

    // Draw Path
    if (path && path.length > 0) {
        ctx.beginPath();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (let i = 0; i < path.length; i++) {
            const r = path[i].r;
            const c = path[i].c;
            const x = c * cellWidth + cellWidth / 2;
            const y = r * cellHeight + cellHeight / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        
        // Glow effect
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 8;
        
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Start Node
        const startR = path[0].r;
        const startC = path[0].c;
        ctx.beginPath();
        ctx.arc(startC * cellWidth + cellWidth / 2, startR * cellHeight + cellHeight / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#22c55e"; // green-500
        ctx.fill();

        // Draw End Node (Visual Goal)
        const vEndR = goalObj.vr || goalObj.r;
        const vEndC = goalObj.vc || goalObj.c;
        const vEndX = goalObj.vc ? vEndC * cellWidth : vEndC * cellWidth + cellWidth / 2;
        const vEndY = goalObj.vr ? vEndR * cellHeight : vEndR * cellHeight + cellHeight / 2;
        
        // Dashed line from entrance to building interior
        const pathEndR = path[path.length - 1].r;
        const pathEndC = path[path.length - 1].c;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(pathEndC * cellWidth + cellWidth / 2, pathEndR * cellHeight + cellHeight / 2);
        ctx.lineTo(vEndX, vEndY);
        ctx.strokeStyle = "#ef4444"; // red dashed
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]); // Reset
        
        ctx.beginPath();
        ctx.arc(vEndX, vEndY - 15, 6, 0, Math.PI * 2); // Slightly above the label
        ctx.fillStyle = "#ef4444"; // red-500
        ctx.fill();
        
        // Draw Entrance Node
        ctx.beginPath();
        ctx.arc(pathEndC * cellWidth + cellWidth / 2, pathEndR * cellHeight + cellHeight / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b"; // amber-500 for elevator/entrance
        ctx.fill();
    } else {
        // Draw Goal if path not generated yet
        if (goalObj) {
            const vEndR = goalObj.vr || goalObj.r;
            const vEndC = goalObj.vc || goalObj.c;
            const vEndX = goalObj.vc ? vEndC * cellWidth : vEndC * cellWidth + cellWidth / 2;
            const vEndY = goalObj.vr ? vEndR * cellHeight : vEndR * cellHeight + cellHeight / 2;
            
            ctx.fillStyle = "#ef4444"; // Red
            ctx.beginPath();
            ctx.arc(vEndX, vEndY - 15, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Start if path not generated yet
        if (startArr) {
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
        // Redraw with current known path (if saved in state, but here we just redraw goal for now)
        drawMapCanvas([], targetCoordinates);
    }
});
