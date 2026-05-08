import sys
import json
import io
from pathlib import Path

# Redirect stdout to capture any intermediate prints from libraries
class SuppressOutput:
    def __enter__(self):
        self._original_stdout = sys.stdout
        sys.stdout = io.StringIO()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout = self._original_stdout

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        return

    image_path = sys.argv[1]
    
    try:
        # Import inside main to catch any top-level prints during import
        with SuppressOutput():
            from box_detector import detect_text_boxes
            detections = detect_text_boxes(image_path)
        
        results = []
        for d in detections:
            results.append({
                "box": list(d["box"]),
                "confidence": d["confidence"],
                "text": d["text"],
                "method": d["method"]
            })
            
        sys.stdout.write(json.dumps(results))
    except Exception as e:
        sys.stdout.write(json.dumps({"error": str(e)}))
        sys.stderr.write(f"Detector Wrapper Error: {str(e)}\n")

if __name__ == "__main__":
    main()
