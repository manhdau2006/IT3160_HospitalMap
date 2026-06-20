import heapq
import time
import math
import itertools

class RoutingEngine:
    def __init__(self):
        pass

    def find_path(self, start, goal, grid_matrix, algorithm="astar", hospital_map=None):
        """
        Execute 3D search algorithm (A*, Dijkstra, or DFS).
        start: [r, c, z]
        goal: [r, c, z]
        grid_matrix: { "0": [[...], ...], "1": [...] }
        algorithm: "astar", "dijkstra", or "dfs"
        hospital_map: HospitalMap instance (if any)
        Returns: path array of {r, c, z}, cost, latency_ms
        """
        start_time = time.time()
        dfs_counter = itertools.count()
        bfs_counter = itertools.count()

        start_tuple = tuple(start)
        goal_tuple = tuple(goal)

        # 1. Configuration constants
        C_FLOOR = 15.0
        PENALTY_CONGESTED = 3.0

        # Grid cells definition
        CELL_WALKABLE = 0
        CELL_WALL = 1
        CELL_CONGESTED = 2
        CELL_ELEVATOR = 4

        # 2. Collect all vertical nodes (elevators)
        vertical_nodes = []
        for z_str, grid_2d in grid_matrix.items():
            for r in range(len(grid_2d)):
                for c in range(len(grid_2d[r])):
                    if grid_2d[r][c] == CELL_ELEVATOR:
                        if not any(n[0] == r and n[1] == c for n in vertical_nodes):
                            vertical_nodes.append((r, c))

        # 3. Elevator-aware heuristic function
        def calculate_heuristic(state):
            r_n, c_n, z_n = state
            r_g, c_g, z_g = goal_tuple

            def octile(r1, c1, r2, c2):
                dx = abs(r1 - r2)
                dy = abs(c1 - c2)
                return max(dx, dy) + 0.414 * min(dx, dy)

            if z_n == z_g:
                return octile(r_n, c_n, r_g, c_g)

            min_h = float('inf')
            for e_r, e_c in vertical_nodes:
                h2d_to_e = octile(r_n, c_n, e_r, e_c)
                h2d_from_e = octile(e_r, e_c, r_g, c_g)
                h_total = h2d_to_e + abs(z_n - z_g) * C_FLOOR + h2d_from_e
                if h_total < min_h:
                    min_h = h_total

            if min_h == float('inf'):
                # Fallback if no elevators
                h2d = octile(r_n, c_n, r_g, c_g)
                min_h = h2d + abs(z_n - z_g) * C_FLOOR

            return min_h

        # 4. Initialize search structures
        open_set = [] # Min-Heap of (f_score, state)
        if algorithm == "dijkstra":
            start_f = 0.0
        elif algorithm == "dfs":
            start_f = -next(dfs_counter)
        elif algorithm == "bfs":
            start_f = next(bfs_counter)
        else:
            start_f = calculate_heuristic(start_tuple)
            
        heapq.heappush(open_set, (start_f, start_tuple))

        came_from = {}
        g_score = {start_tuple: 0.0}
        closed_set = set()

        # 2D directions (8 neighbors)
        d_row = [-1, 1, 0, 0, -1, -1, 1, 1]
        d_col = [0, 0, -1, 1, -1, 1, -1, 1]
        move_costs = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414]

        goal_reached = False

        while open_set:
            f, current = heapq.heappop(open_set)

            if current in closed_set:
                continue
            closed_set.add(current)

            if current == goal_tuple:
                goal_reached = True
                break

            curr_r, curr_c, curr_z = current
            
            # Get current cell type
            curr_z_str = str(curr_z)
            if curr_z_str in grid_matrix:
                current_cell_type = grid_matrix[curr_z_str][curr_r][curr_c]
            else:
                current_cell_type = CELL_WALKABLE

            # --- GROUP 1: 2D NEIGHBORS ON SAME FLOOR ---
            if curr_z_str in grid_matrix:
                grid_2d = grid_matrix[curr_z_str]
                rows_cnt = len(grid_2d)
                cols_cnt = len(grid_2d[0])

                for i in range(8):
                    next_r = curr_r + d_row[i]
                    next_c = curr_c + d_col[i]
                    next_z = curr_z

                    # Bounds check
                    if next_r < 0 or next_r >= rows_cnt or next_c < 0 or next_c >= cols_cnt:
                        continue

                    next_cell_type = grid_2d[next_r][next_c]
                    if next_cell_type == CELL_WALL:
                        continue

                    # Corner cutting prevention
                    if i >= 4:
                        if grid_2d[curr_r][next_c] == CELL_WALL or grid_2d[next_r][curr_c] == CELL_WALL:
                            continue

                    step_cost = move_costs[i]
                    if next_cell_type == CELL_CONGESTED:
                        step_cost += PENALTY_CONGESTED

                    neighbor = (next_r, next_c, next_z)
                    if neighbor in closed_set:
                        continue

                    tentative_g = g_score[current] + step_cost
                    if algorithm == "dfs":
                        if neighbor not in g_score:
                            came_from[neighbor] = current
                            g_score[neighbor] = tentative_g
                            heapq.heappush(open_set, (-next(dfs_counter), neighbor))
                    elif algorithm == "bfs":
                        if neighbor not in g_score:
                            came_from[neighbor] = current
                            g_score[neighbor] = tentative_g
                            heapq.heappush(open_set, (next(bfs_counter), neighbor))
                    else:
                        if neighbor not in g_score or tentative_g < g_score[neighbor]:
                            came_from[neighbor] = current
                            g_score[neighbor] = tentative_g
                            
                            if algorithm == "dijkstra":
                                f_score = tentative_g
                            else: # "astar"
                                f_score = tentative_g + calculate_heuristic(neighbor)
                                
                            heapq.heappush(open_set, (f_score, neighbor))

            # --- GROUP 2: VERTICAL LINKS (ELEVATOR MOVES) ---
            if current_cell_type == CELL_ELEVATOR:
                for next_z_str, grid_2d in grid_matrix.items():
                    next_z = int(next_z_str)
                    if next_z == curr_z:
                        continue

                    # Check if elevator coordinate is valid on target floor
                    if curr_r < len(grid_2d) and curr_c < len(grid_2d[curr_r]):
                        target_cell_type = grid_2d[curr_r][curr_c]
                        # Disallow if target cell is wall
                        if target_cell_type == CELL_WALL:
                            continue

                        floor_diff = abs(next_z - curr_z)
                        vertical_cost = floor_diff * C_FLOOR

                        target_node = (curr_r, curr_c, next_z)
                        if target_node in closed_set:
                            continue

                        tentative_g = g_score[current] + vertical_cost
                        if algorithm == "dfs":
                            if target_node not in g_score:
                                came_from[target_node] = current
                                g_score[target_node] = tentative_g
                                heapq.heappush(open_set, (-next(dfs_counter), target_node))
                        elif algorithm == "bfs":
                            if target_node not in g_score:
                                came_from[target_node] = current
                                g_score[target_node] = tentative_g
                                heapq.heappush(open_set, (next(bfs_counter), target_node))
                        else:
                            if target_node not in g_score or tentative_g < g_score[target_node]:
                                came_from[target_node] = current
                                g_score[target_node] = tentative_g
                                
                                if algorithm == "dijkstra":
                                    f_score = tentative_g
                                else: # "astar"
                                    f_score = tentative_g + calculate_heuristic(target_node)
                                    
                                heapq.heappush(open_set, (f_score, target_node))

        exec_time = (time.time() - start_time) * 1000

        if goal_reached:
            # Reconstruct path
            path = []
            trace = goal_tuple
            while trace is not None:
                path.append({"r": trace[0], "c": trace[1], "z": trace[2]})
                trace = came_from.get(trace)
            path.reverse()

            return {
                "status": "success",
                "path": path,
                "cost": g_score[goal_tuple],
                "nodes_expanded": len(closed_set),
                "latency_ms": round(exec_time, 2)
            }
        else:
            return {
                "status": "blocked",
                "path": [],
                "cost": -1,
                "nodes_expanded": len(closed_set),
                "latency_ms": round(exec_time, 2),
                "message": "Path is fully blocked. Open List is empty."
            }
