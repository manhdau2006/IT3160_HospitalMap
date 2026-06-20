import heapq
import time
import math

class RoutingEngine:
    def __init__(self):
        pass

    def heuristic(self, a, b):
        """Calculate Manhattan distance, heavily penalizing Z-axis changes to prefer same-floor paths unless necessary."""
        return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2]) * 50

    def get_neighbors(self, node, grid_matrix, hospital_map=None):
        """
        Get valid neighbors for a given node (r, c, z).
        """
        r, c, z = node
        neighbors = []
        
        # 4-way movement on the same floor
        directions = [(-1, 0, 0), (1, 0, 0), (0, -1, 0), (0, 1, 0)]
        
        # Add Z-axis movement (elevator) only if current cell is an elevator
        if hospital_map is not None and hospital_map.is_elevator(r, c):
            directions.extend([(0, 0, -1), (0, 0, 1)])

        for dr, dc, dz in directions:
            nr, nc, nz = r + dr, c + dc, z + dz
            
            # Bounds checking
            if str(nz) in grid_matrix:
                floor_grid = grid_matrix[str(nz)]
                if 0 <= nr < len(floor_grid) and 0 <= nc < len(floor_grid[0]):
                    cost = floor_grid[nr][nc]
                    if cost is not None and cost == 0: 
                        movement_cost = 20 if dz != 0 else 1
                        neighbors.append(((nr, nc, nz), movement_cost))
                        
        return neighbors

    def find_path(self, start, goal, grid_matrix, hospital_map=None):
        """
        Execute A* search algorithm.
        start: [r, c, z]
        goal: [r, c, z]
        grid_matrix: { "0": [[1, 1, 0...], ...], "1": [...] }
        Returns: path array of {r, c, z}, total_cost, execution_time_ms
        """
        start_time = time.time()
        
        start_tuple = tuple(start)
        goal_tuple = tuple(goal)

        open_set = []
        heapq.heappush(open_set, (0, start_tuple))
        
        came_from = {}
        g_score = {start_tuple: 0}
        f_score = {start_tuple: self.heuristic(start_tuple, goal_tuple)}
        
        while open_set:
            current = heapq.heappop(open_set)[1]
            
            if current == goal_tuple:
                # Reconstruct path
                path = []
                while current in came_from:
                    path.append({"r": current[0], "c": current[1], "z": current[2]})
                    current = came_from[current]
                path.append({"r": start_tuple[0], "c": start_tuple[1], "z": start_tuple[2]})
                path.reverse()
                
                exec_time = (time.time() - start_time) * 1000
                return {
                    "status": "success",
                    "path": path,
                    "cost": g_score[goal_tuple],
                    "latency_ms": round(exec_time, 2)
                }
                
            for neighbor, cost in self.get_neighbors(current, grid_matrix, hospital_map):
                tentative_g_score = g_score[current] + cost
                
                if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score[neighbor] = tentative_g_score + self.heuristic(neighbor, goal_tuple)
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
                    
        exec_time = (time.time() - start_time) * 1000
        return {
            "status": "blocked",
            "path": [],
            "cost": -1,
            "latency_ms": round(exec_time, 2),
            "message": "Path is fully blocked. Open List is empty."
        }
