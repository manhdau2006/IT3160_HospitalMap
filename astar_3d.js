/**
 * THUẬT TOÁN TÌM ĐƯỜNG A* 3D - DÀNH CHO DI CHUYỂN ĐA TẦNG (HOSPITAL NAVIGATOR)
 * Phụ trách: Thành viên 2 (AI - Tìm đường)
 * 
 * Mô tả không gian trạng thái:
 * State: { r: hàng, c: cột, z: tầng }
 */

// Định nghĩa cấu trúc hàng đợi ưu tiên đơn giản (Min-Heap) để tối ưu hiệu năng tìm kiếm
class PriorityQueue3D {
    constructor() {
        this.nodes = [];
    }

    enqueue(state, f) {
        this.nodes.push({ state, f });
        this.bubbleUp(this.nodes.length - 1);
    }

    dequeue() {
        if (this.nodes.length === 0) return null;
        const min = this.nodes[0];
        const end = this.nodes.pop();
        if (this.nodes.length > 0) {
            this.nodes[0] = end;
            this.sinkDown(0);
        }
        return min.state;
    }

    isEmpty() {
        return this.nodes.length === 0;
    }

    bubbleUp(i) {
        while (i > 0) {
            let parentIndex = Math.floor((i - 1) / 2);
            if (this.nodes[i].f >= this.nodes[parentIndex].f) break;
            [this.nodes[i], this.nodes[parentIndex]] = [this.nodes[parentIndex], this.nodes[i]];
            i = parentIndex;
        }
    }

    sinkDown(i) {
        let len = this.nodes.length;
        while (2 * i + 1 < len) {
            let left = 2 * i + 1;
            let right = 2 * i + 2;
            let smallest = left;
            if (right < len && this.nodes[right].f < this.nodes[left].f) {
                smallest = right;
            }
            if (this.nodes[i].f <= this.nodes[smallest].f) break;
            [this.nodes[i], this.nodes[smallest]] = [this.nodes[smallest], this.nodes[i]];
            i = smallest;
        }
    }
}

/**
 * Thuật toán A* 3D
 * @param {Object} start - Trạng thái bắt đầu { r, c, z }
 * @param {Object} goal - Trạng thái đích { r, c, z }
 * @param {Object} multiFloorGrid - Lưới 3D chứa bản đồ: { [z_index]: 2D_Array }
 * @param {Object} config - Các trọng số cấu hình thuật toán
 */
function executeAStar3D(start, goal, multiFloorGrid, config = {}) {

    // 1. Các trọng số mặc định cho di chuyển dọc và ô ùn tắc (khoảng cách quy đổi)
    const C_FLOOR = config.c_floor || 15.0;       // Độ dài đường đi dọc giữa 2 tầng kề nhau (quy đổi ra mét)
    const PENALTY_CONGESTED = config.penalty_congested || 3.0; // Chi phí quãng đường phạt khi qua ô ùn tắc
    const HEURISTIC_TYPE = config.heuristic || 'manhattan';    // 'manhattan' hoặc 'euclidean'
    const customHeuristic = config.customHeuristic;            // Hàm heuristic tự định nghĩa tùy biến từ bên ngoài

    // Ký hiệu các loại ô lưới
    const CELL_WALKABLE = 0;
    const CELL_WALL = 1;
    const CELL_CONGESTED = 2;
    const CELL_ELEVATOR = 4; // Ô chuyển tầng (thang máy)
    // Lập danh sách các ô thang máy trên lưới
    const verticalNodes = [];
    for (let zStr in multiFloorGrid) {
        const z = parseInt(zStr);
        const grid2D = multiFloorGrid[z];
        for (let r = 0; r < grid2D.length; r++) {
            for (let c = 0; c < grid2D[r].length; c++) {
                if (grid2D[r][c] === CELL_ELEVATOR) {
                    if (!verticalNodes.some(n => n.r === r && n.c === c)) {
                        verticalNodes.push({ r, c });
                    }
                }
            }
        }
    }

    // 2. Định nghĩa hàm Heuristic h(n) đa tầng cải tiến (Elevator-Aware Heuristic)
    const heuristic = (state) => {
        // Nếu truyền vào hàm tùy biến từ bên ngoài, ưu tiên sử dụng
        if (typeof customHeuristic === 'function') {
            return customHeuristic(state, goal);
        }

        // Nếu cùng tầng, Heuristic bằng khoảng cách 2D trực tiếp tới đích
        if (state.z === goal.z) {
            if (HEURISTIC_TYPE === 'manhattan') {
                return Math.abs(state.r - goal.r) + Math.abs(state.c - goal.c);
            } else {
                return Math.sqrt(Math.pow(state.r - goal.r, 2) + Math.pow(state.c - goal.c, 2));
            }
        }

        // Nếu khác tầng, tìm đường đi qua trạm trung chuyển (thang máy/thang bộ) tối ưu nhất
        let minH = Infinity;
        if (verticalNodes.length > 0) {
            for (let i = 0; i < verticalNodes.length; i++) {
                const e = verticalNodes[i];
                let h2dToE = 0;
                let h2dFromE = 0;
                if (HEURISTIC_TYPE === 'manhattan') {
                    h2dToE = Math.abs(state.r - e.r) + Math.abs(state.c - e.c);
                    h2dFromE = Math.abs(e.r - goal.r) + Math.abs(e.c - goal.c);
                } else {
                    h2dToE = Math.sqrt(Math.pow(state.r - e.r, 2) + Math.pow(state.c - e.c, 2));
                    h2dFromE = Math.sqrt(Math.pow(e.r - goal.r, 2) + Math.pow(e.c - goal.c, 2));
                }
                const hTotal = h2dToE + Math.abs(state.z - goal.z) * C_FLOOR + h2dFromE;
                if (hTotal < minH) {
                    minH = hTotal;
                }
            }
        }

        if (minH === Infinity) {
            // Fallback nếu không có thang máy/thang bộ nào được cấu hình
            let h2d = 0;
            if (HEURISTIC_TYPE === 'manhattan') {
                h2d = Math.abs(state.r - goal.r) + Math.abs(state.c - goal.c);
            } else {
                h2d = Math.sqrt(Math.pow(state.r - goal.r, 2) + Math.pow(state.c - goal.c, 2));
            }
            minH = h2d + Math.abs(state.z - goal.z) * C_FLOOR;
        }

        return minH;
    };
    // 3. Khởi tạo các cấu trúc dữ liệu A*
    const openSet = new PriorityQueue3D();
    const closedSet = new Set();

    // Lưu vết đường đi và chi phí: key format: "r,c,z"
    const cellMeta = {};
    const makeKey = (s) => `${s.r},${s.c},${s.z}`;

    const startKey = makeKey(start);
    cellMeta[startKey] = {
        g: 0,
        f: heuristic(start),
        parent: null
    };

    openSet.enqueue(start, cellMeta[startKey].f);

    let goalReached = false;
    let exploredCount = 0;

    // Hướng di chuyển 2D (8 hướng lân cận trên cùng một tầng)
    const dRow = [-1, 1, 0, 0, -1, -1, 1, 1];
    const dCol = [0, 0, -1, 1, -1, 1, -1, 1];
    const moveCosts = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414]; // Chi phí đi thẳng/chéo

    // 4. Vòng lặp chính A*
    while (!openSet.isEmpty()) {
        const curr = openSet.dequeue();
        const currKey = makeKey(curr);

        if (closedSet.has(currKey)) continue;
        closedSet.add(currKey);
        exploredCount++;

        // Kiểm tra đã đến đích chưa
        if (curr.r === goal.r && curr.c === goal.c && curr.z === goal.z) {
            goalReached = true;
            break;
        }

        const currentCellType = multiFloorGrid[curr.z] ? multiFloorGrid[curr.z][curr.r][curr.c] : CELL_WALKABLE;

        // --- NHÓM 1: LẤY CÁC Ô LÂN CẬN TRÊN CÙNG TẦNG (DI CHUYỂN 2D) ---
        for (let i = 0; i < 8; i++) {
            const nextR = curr.r + dRow[i];
            const nextC = curr.c + dCol[i];
            const nextZ = curr.z; // Giữ nguyên tầng

            // Kiểm tra ranh giới lưới tầng hiện tại
            if (!multiFloorGrid[nextZ]) continue;
            const grid2D = multiFloorGrid[nextZ];
            if (nextR < 0 || nextR >= grid2D.length || nextC < 0 || nextC >= grid2D[0].length) continue;

            const nextCellType = grid2D[nextR][nextC];
            if (nextCellType === CELL_WALL) continue; // Gặp tường, bỏ qua

            // Tránh cắt góc chéo khi có vật cản
            if (i >= 4) { // Đi chéo
                if (grid2D[curr.r][nextC] === CELL_WALL || grid2D[nextR][curr.c] === CELL_WALL) continue;
            }

            // Tính toán chi phí bước đi g(n)
            let stepCost = moveCosts[i];
            if (nextCellType === CELL_CONGESTED) {
                stepCost += PENALTY_CONGESTED; // Phạt nếu ô tiếp theo bị ùn tắc
            }

            const nextState = { r: nextR, c: nextC, z: nextZ };
            const nextKey = makeKey(nextState);

            if (closedSet.has(nextKey)) continue;

            const tentativeG = cellMeta[currKey].g + stepCost;
            const currentG = cellMeta[nextKey] ? cellMeta[nextKey].g : Infinity;

            if (tentativeG < currentG) {
                cellMeta[nextKey] = {
                    g: tentativeG,
                    f: tentativeG + heuristic(nextState),
                    parent: curr
                };
                openSet.enqueue(nextState, cellMeta[nextKey].f);
            }
        }
        // --- NHÓM 2: LẤY CÁC Ô LIÊN KẾT DỌC (ĐỔI TẦNG QUA THANG MÁY) ---
        if (currentCellType === CELL_ELEVATOR) {
            // Cho phép di chuyển trực tiếp đến các tầng khác tại cùng tọa độ này
            for (let nextZStr in multiFloorGrid) {
                const nextZ = parseInt(nextZStr);
                if (nextZ === curr.z) continue; // Bỏ qua tầng hiện tại

                const nextR = curr.r;
                const nextC = curr.c;

                const targetCellType = multiFloorGrid[nextZ][nextR][nextC];
                // Chỉ cho phép kết nối nếu tầng đích cũng có Elevator tại vị trí tương ứng
                if (targetCellType === CELL_WALL) continue;

                // Chi phí dọc đổi tầng: chỉ tính quãng đường vật lý di chuyển dọc
                const floorDiff = Math.abs(nextZ - curr.z);
                const verticalCost = floorDiff * C_FLOOR;

                const nextState = { r: nextR, c: nextC, z: nextZ };
                const nextKey = makeKey(nextState);

                if (closedSet.has(nextKey)) continue;

                const tentativeG = cellMeta[currKey].g + verticalCost;
                const currentG = cellMeta[nextKey] ? cellMeta[nextKey].g : Infinity;

                if (tentativeG < currentG) {
                    cellMeta[nextKey] = {
                        g: tentativeG,
                        f: tentativeG + heuristic(nextState),
                        parent: curr
                    };
                    openSet.enqueue(nextState, cellMeta[nextKey].f);
                }
            }
        }

        // 5. Kết xuất kết quả đường đi ngược từ đích về xuất phát
        if (goalReached) {
            const path = [];
            let temp = goal;
            while (temp !== null) {
                path.push(temp);
                const tempKey = makeKey(temp);
                temp = cellMeta[tempKey].parent;
            }
            path.reverse();

            return {
                success: true,
                path: path,
                totalCost: cellMeta[makeKey(goal)].g,
                exploredCount: exploredCount
            };
        }

        return {
            success: false,
            path: [],
            totalCost: Infinity,
            exploredCount: exploredCount
        };
    }

    // ==========================================
    // THỬ NGHIỆM ĐỒ THỊ 3D GIẢ LẬP ĐỂ TEST THUẬT TOÁN
    // ==========================================
    if (typeof window === 'undefined') {
        // Giả lập ma trận lưới 3 tầng (z = 0, 1, 2)
        // Kích thước lưới mỗi tầng: 5 hàng x 5 cột
        // Ký tự: 0 = Đi được, 1 = Tường, 2 = Ùn tắc, 4 = Thang máy
        const mockGrids = {
            0: [ // Tầng trệt
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 1, 4], // Thang máy ở (2, 4)
                [0, 1, 0, 1, 0],
                [0, 0, 0, 0, 0]
            ],
            1: [ // Tầng 1
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 1, 4], // Thang máy kết nối ở (2, 4)
                [0, 1, 0, 1, 0],
                [0, 0, 0, 0, 0]
            ],
            2: [ // Tầng 2 (Đích đến nằm ở đây)
                [0, 0, 0, 0, 0],
                [0, 1, 1, 1, 0],
                [0, 0, 0, 1, 4], // Thang máy ở (2, 4)
                [0, 1, 0, 1, 0],
                [0, 0, 0, 0, 0]
            ]
        };

        const startPoint = { r: 0, c: 0, z: 0 }; // Xuất phát: Tầng trệt, ô (0,0)
        const goalPoint = { r: 4, c: 4, z: 2 };  // Đích đến: Tầng 2, ô (4,4)

        console.log("=== ĐANG CHẠY THỬ NGHIỆM TÌM ĐƯỜNG A* 3D ===");
        console.log("Điểm bắt đầu:", startPoint);
        console.log("Điểm kết thúc:", goalPoint);

        const result = executeAStar3D(startPoint, goalPoint, mockGrids);

        if (result.success) {
            console.log("Tìm đường thành công!");
            console.log("Tổng chi phí (g):", result.totalCost);
            console.log("Số ô đã duyệt qua:", result.exploredCount);
            console.log("Lộ trình chi tiết:");
            result.path.forEach((node, idx) => {
                console.log(`Bước ${idx + 1}: Hàng ${node.r}, Cột ${node.c}, Tầng ${node.z}`);
            });
        } else {
            console.log("Không tìm thấy đường đi.");
        }
    }
