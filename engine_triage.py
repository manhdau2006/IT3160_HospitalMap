import json
import os

class TriageEngine:
    def __init__(self, symptoms_file='symptoms.json'):
        self.symptoms_data = self._load_json(symptoms_file)
        self.department_map = self._build_department_map()

    def _load_json(self, filename):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[Warning] Failed to load {filename}: {e}")
            return {}

    def _build_department_map(self):
        """Map department IDs to their exact coordinates from location_mapping.json"""
        # Fallback to integration.py mapping if location_mapping.json doesn't contain explicit coords
        # Custom Map mapping:
        mapping = {
            "K_TIEUHOA":      {"r": 6, "c": 8, "z": 1, "building": "Khu Tây"},
            "K_NGOAITONGHOP": {"r": 13, "c": 3, "z": 1, "building": "Khu Bắc"},
            "K_NHIKHOA":      {"r": 13, "c": 15, "z": 0, "building": "Khu Nam"},
            "K_THANKINH":     {"r": 15, "c": 9, "z": 1, "building": "Khu Đông"},
            "K_MAT":          {"r": 6, "c": 8, "z": 0, "building": "Khu Tây"},
            "K_TAIMUIHONG":   {"r": 13, "c": 3, "z": 0, "building": "Khu Bắc"},
            "K_TIMMACH":      {"r": 13, "c": 15, "z": 1, "building": "Khu Nam"},
            "K_HOHAP":        {"r": 15, "c": 9, "z": 0, "building": "Khu Đông"},
            "K_TRUYENNHEM":   {"r": 6, "c": 8, "z": 1, "building": "Khu Tây (Trệt)"}
        }
        return mapping

    def process_triage(self, payload):
        """
        Traverses the symptom tree according to the chosen branches.
        payload format: { "root_selections": [0, 2], "sub_paths": { "0": [1], "2": [] } }
        Returns the next question (from the first unfinished branch) or a list of final results.
        """
        if not self.symptoms_data:
            return {"error": "Symptom data not available"}

        # Legacy compatibility (if it's a simple path array, convert it)
        if isinstance(payload, list):
            if len(payload) == 0:
                payload = {"root_selections": [], "sub_paths": {}}
            else:
                payload = {"root_selections": [payload[0]], "sub_paths": {str(payload[0]): payload[1:]}}

        root_selections = payload.get("root_selections", [])
        sub_paths = payload.get("sub_paths", {})
        
        if not root_selections:
            options = [{"label": opt["label"]} for opt in self.symptoms_data.get("options", [])]
            return {
                "status": "question",
                "question": self.symptoms_data.get("question", ""),
                "options": options,
                "is_root": True
            }

        results = []
        
        for root_idx in root_selections:
            if root_idx < 0 or root_idx >= len(self.symptoms_data["options"]):
                continue
                
            current_node = self.symptoms_data["options"][root_idx]
            if "next_node" in current_node:
                current_node = current_node["next_node"]
                
            path_for_this_root = sub_paths.get(str(root_idx), [])
            
            # Traverse
            for answer_idx in path_for_this_root:
                if "options" in current_node and 0 <= answer_idx < len(current_node["options"]):
                    selected_opt = current_node["options"][answer_idx]
                    if "next_node" in selected_opt:
                        current_node = selected_opt["next_node"]
                    else:
                        current_node = selected_opt
                else:
                    break
                    
            if "department_id" in current_node:
                dept_id = current_node["department_id"]
                coords = self.department_map.get(dept_id, None)
                results.append({
                    "result": current_node.get("result", dept_id),
                    "department_id": dept_id,
                    "coordinates": coords,
                    "building": coords.get("building", "Chưa rõ tòa nhà") if coords else "Chưa rõ tòa nhà"
                })
            else:
                # Found an incomplete branch! Ask this question.
                options = [{"label": opt["label"]} for opt in current_node.get("options", [])]
                root_label = self.symptoms_data["options"][root_idx]["label"]
                return {
                    "status": "question",
                    "question": f"[{root_label}] {current_node.get('question', '')}",
                    "options": options,
                    "is_root": False,
                    "active_root": root_idx
                }
                
        # All selected branches have reached a leaf.
        # Assign severity and sort results
        severity_map = {
            "K_CAPCUU": 10,
            "K_TIMMACH": 9,
            "K_TRUYENNHEM": 9,
            "K_HOHAP": 8,
            "K_NHIKHOA": 8,
            "K_THANKINH": 7,
            "K_NGOAITONGHOP": 7,
            "K_TIEUHOA": 6,
            "K_MAT": 5,
            "K_TAIMUIHONG": 5
        }
        
        for r in results:
            r["severity"] = severity_map.get(r["department_id"], 1)
            
        # Deduplicate
        unique_results = []
        seen = set()
        for r in results:
            if r["department_id"] not in seen:
                seen.add(r["department_id"])
                unique_results.append(r)
                
        unique_results.sort(key=lambda x: x["severity"], reverse=True)
        
        return {
            "status": "complete",
            "results": unique_results
        }
