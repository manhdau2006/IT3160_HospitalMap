import numpy as np
import json
import os

class HospitalMap:
    def __init__(self):
        self.WALKABLE = 0
        self.OBSTACLE = 1
        
        self.ELEVATORS = []
        
        # Load from JSON
        current_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(current_dir, "new_map_data.json")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            self.map_data = json.load(f)
            
        self.rows = self.map_data["metadata"]["rows"]
        self.cols = self.map_data["metadata"]["cols"]
        
        self.matrix_z0 = self._build_matrix(self.map_data["floor_1"], 0)
        self.matrix_upper = self._build_matrix(self.map_data["floor_2"], 1)

    def _build_matrix(self, floor_data, z):
        grid = []
        for r, row in enumerate(floor_data):
            grid_row = []
            for c, cell in enumerate(row):
                cell_type = cell["type"]
                if cell_type == "wall":
                    grid_row.append(self.OBSTACLE)
                else:
                    # Treat everything else as walkable so we can route into rooms
                    grid_row.append(self.WALKABLE)
                    
                if cell_type == "elevator":
                    # Store elevator locations to allow z-axis transitions
                    self.ELEVATORS.append((r, c))
            grid.append(grid_row)
        return np.array(grid, dtype=np.int8)

    def get_grid_for_floor(self, z):
        if z == 0:
            return self.matrix_z0
        # In this simplified model, any z > 0 uses the upper floor map
        return self.matrix_upper

    def is_elevator(self, r, c):
        return (r, c) in self.ELEVATORS

