import math
import heapq
import numpy as np

class MultiFloorMap:
    """Multi-floor grid map with a 3D A* pathfinder.

    Cell codes:
      0 = walkable
      1 = obstacle
      2 = congested (walkable with penalty)
      4 = elevator (allows vertical moves at same r,c)
    """
    WALKABLE = 0
    OBSTACLE = 1
    CONGESTED = 2
    ELEVATOR = 4

    def __init__(self, templates=None):
        # templates: { z_index: ["string rows..."] }
        if templates is None:
            templates = self._default_templates()

        self.floors = {}
        for z, rows in templates.items():
            grid = [list(map(int, list(r))) for r in rows]
            self.floors[int(z)] = np.array(grid, dtype=np.int8)

        # infer dims from floor 0 (assume consistent sizes)
        base = next(iter(self.floors.values()))
        self.rows, self.cols = base.shape

    def _default_templates(self):
        # Small example 3-floor templates (strings of equal length)
        # 0 walkable, 1 wall, 4 elevator
        floor0 = [
            "111111111111111111111111111111",
            "111111011111111111111111110111",
            "111111000000000000000000000111",
            "111111011111110011111101110111",
            "111111011111110011111101110111",
            "111111011111110011111101110111",
            "111111000000000011111100000111",
            "111111111111110011111111110111",
            "111111111111110000000000000111",
            "111111110001111111110111111111",
            "111111110001111111110111111111",
            "111111110001111111110111111111",
            "111111110000000000000000001111",
            "111111110001111111111111111111",
            "111111110001111111111111111111",
            "111111110001111111111111111111",
            "111111110000000000111111111111",
            "111111111111111100111111111111",
            "111111111111111100111111111111",
            "111111111111111100111111111111"
        ]

        # floor1 and floor2 mirror floor0 but include an elevator column at right side
        def add_elev(rows):
            out = []
            for r in rows:
                # place an elevator '4' near the right side
                row = list(r)
                # replace a cell near column index -6 with '4' if it's walkable
                idx = max(0, len(row) - 6)
                if row[idx] == '0':
                    row[idx] = '4'
                out.append(''.join(row))
            return out

        floor1 = add_elev(floor0)
        floor2 = add_elev(floor0)

        return {0: floor0, 1: floor1, 2: floor2}

    def is_walkable(self, r, c, z):
        if z not in self.floors: return False
        if r < 0 or r >= self.rows or c < 0 or c >= self.cols: return False
        return self.floors[z][r][c] != self.OBSTACLE

    def cell_type(self, r, c, z):
        if z not in self.floors: return self.OBSTACLE
        if r < 0 or r >= self.rows or c < 0 or c >= self.cols: return self.OBSTACLE
        return int(self.floors[z][r][c])

    def get_neighbors(self, r, c, z, allow_diagonal=True):
        neighbors = []
        # 8 directions (row, col) with movement cost
        dirs = [(-1,0),(1,0),(0,-1),(0,1)]
        diag = [(-1,-1),(-1,1),(1,-1),(1,1)]
        for dr, dc in dirs:
            nr, nc = r+dr, c+dc
            if not self.is_walkable(nr, nc, z):
                continue
            cost = 1.0
            neighbors.append(((nr,nc,z), cost))

        if allow_diagonal:
            for dr, dc in diag:
                nr, nc = r+dr, c+dc
                # prevent cutting corners through obstacles
                if not self.is_walkable(nr, nc, z):
                    continue
                if not (self.is_walkable(r+dr, c, z) and self.is_walkable(r, c+dc, z)):
                    continue
                cost = math.sqrt(2)
                neighbors.append(((nr,nc,z), cost))

        # vertical moves via elevators only
        if self.cell_type(r,c,z) == self.ELEVATOR:
            for nz in self.floors.keys():
                if nz == z: continue
                # allow vertical if target cell at same r,c is also elevator and walkable
                if self.cell_type(r,c,nz) == self.ELEVATOR:
                    # define vertical move cost (in meters-equivalent)
                    cost = 15.0  # default vertical cost between floors
                    neighbors.append(((r,c,nz), cost))

        return neighbors

    def heuristic(self, a, b, floor_cost=15.0):
        # a and b are (r,c,z)
        (r1,c1,z1) = a
        (r2,c2,z2) = b
        manh = abs(r1-r2) + abs(c1-c2)
        return manh + abs(z1-z2) * floor_cost

    def astar_3d(self, start, goal, penalty_congested=3.0):
        # start/goal: dicts or tuples; normalize to tuples
        def as_tuple(s):
            if isinstance(s, dict):
                return (s['r'], s['c'], s['z'])
            return tuple(s)

        start_t = as_tuple(start)
        goal_t = as_tuple(goal)

        open_heap = []
        heapq.heappush(open_heap, (0 + self.heuristic(start_t, goal_t), 0, start_t, None))
        came_from = {}
        g_score = {start_t: 0}

        while open_heap:
            f, g, current, parent = heapq.heappop(open_heap)
            if current in came_from:
                continue
            came_from[current] = parent

            if current == goal_t:
                # reconstruct path
                path = []
                node = current
                while node is not None:
                    r,c,z = node
                    path.append({"r": r, "c": c, "z": z})
                    node = came_from[node]
                path.reverse()
                return {"success": True, "path": path, "totalCost": g}

            # expand neighbors
            for (nr,nc,nz), move_cost in self.get_neighbors(current[0], current[1], current[2]):
                nnode = (nr,nc,nz)
                cell_t = self.cell_type(nr,nc,nz)
                extra = 0.0
                if cell_t == self.CONGESTED:
                    extra += penalty_congested
                tentative_g = g + move_cost + extra
                if tentative_g < g_score.get(nnode, float('inf')):
                    g_score[nnode] = tentative_g
                    fscore = tentative_g + self.heuristic(nnode, goal_t)
                    heapq.heappush(open_heap, (fscore, tentative_g, nnode, current))

        return {"success": False, "path": [], "totalCost": float('inf')}


if __name__ == "__main__":
    # Quick test run
    m = MultiFloorMap()
    start = {"r": 0, "c": 0, "z": 0}
    goal = {"r": m.rows-1, "c": m.cols-1, "z": 2}
    print(f"Map size: rows={m.rows}, cols={m.cols}, floors={list(m.floors.keys())}")
    res = m.astar_3d(start, goal)
    if res['success']:
        print("Found path cost:", res['totalCost'])
        print("Path length:", len(res['path']))
    else:
        print("No path found")
