"""
Utilities for text boxes and YOLO person boxes.
"""
from pathlib import Path
from typing import List, Dict, Tuple

import cv2
import numpy as np


def _find_contours_compat(image, mode, method):
    """Compatible wrapper for cv2.findContours across OpenCV 3/4."""
    result = cv2.findContours(image, mode, method)
    if len(result) == 2:
        return result[0], result[1]
    if len(result) == 3:
        return result[1], result[2]
    return [], None


def box_iou(box1, box2):
    """Compute IoU for two boxes."""
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2

    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)

    if x2_i < x1_i or y2_i < y1_i:
        return 0.0

    intersection = (x2_i - x1_i) * (y2_i - y1_i)
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0.0


def merge_overlapping_boxes(detections, iou_threshold=0.5):
    """Merge overlapping boxes by confidence."""
    if not detections:
        return []

    sorted_dets = sorted(detections, key=lambda x: x.get("confidence", 0), reverse=True)
    merged = []

    while sorted_dets:
        current = sorted_dets.pop(0)
        current_box = current["box"]

        to_remove = []
        for i, det in enumerate(sorted_dets):
            if box_iou(current_box, det["box"]) > iou_threshold:
                to_remove.append(i)

        for i in reversed(to_remove):
            sorted_dets.pop(i)

        merged.append(current)

    return merged


def expand_to_bubble(img, box):
    """Refined bubble expansion using connected components."""
    x1, y1, x2, y2 = box
    h, w = img.shape[:2]
    
    # 1. Pre-process to find white areas
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 215, 255, cv2.THRESH_BINARY)
    
    # 2. Use connected components to find the 'blob' containing the text
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)
    
    # Center of our text box
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    
    # Find which label is at the center of our text
    if 0 <= cy < h and 0 <= cx < w:
        target_label = labels[cy, cx]
        if target_label > 0: # 0 is background
            stat = stats[target_label]
            bx, by, bw, bh = int(stat[cv2.CC_STAT_LEFT]), int(stat[cv2.CC_STAT_TOP]), int(stat[cv2.CC_STAT_WIDTH]), int(stat[cv2.CC_STAT_HEIGHT])
            
            # Sanity check: is it a reasonable bubble size?
            if bw < w * 0.9 and bh < h * 0.9 and bw * bh > (x2-x1)*(y2-y1):
                return (bx, by, bx + bw, by + bh)
                
    return (int(x1), int(y1), int(x2), int(y2))

def detect_text_boxes(image_path, use_easyocr=True, min_confidence=0.3):
    """
    Advanced bubble detection: Find text, then expand to containing bubbles, 
    and merge duplicates into single bubble units.
    """
    img = cv2.imread(str(image_path))
    if img is None:
        return []
        
    raw_detections: List[Dict] = []

    if use_easyocr:
        try:
            import easyocr
            if not hasattr(detect_text_boxes, "reader"):
                detect_text_boxes.reader = easyocr.Reader(["vi", "en"], gpu=False)

            results = detect_text_boxes.reader.readtext(img)
            for (bbox, text, prob) in results:
                if prob >= min_confidence:
                    pts = np.array(bbox)
                    x1, y1 = pts.min(axis=0).astype(int)
                    x2, y2 = pts.max(axis=0).astype(int)
                    
                    # Expand to bubble
                    bubble_box = expand_to_bubble(img, (x1, y1, x2, y2))
                    
                    raw_detections.append({
                        "box": [int(v) for v in bubble_box],
                        "confidence": float(prob),
                        "text": text,
                        "method": "bubble_ai"
                    })
        except ImportError:
            pass

    if not raw_detections:
        # Fallback to white blob detection if no text found
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(thresh)
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]
            if 1000 < area < (img.shape[0] * img.shape[1] * 0.4):
                aspect = w / h if h > 0 else 0
                if 0.5 < aspect < 3:
                    raw_detections.append({
                        "box": [int(x), int(y), int(x + w), int(y + h)],
                        "confidence": 0.5,
                        "text": "",
                        "method": "pure_bubble"
                    })

    # CRITICAL STEP: Merge boxes that point to the SAME bubble
    # We use a very high IOU threshold because bubbles might overlap slightly, 
    # but same bubbles will have very high overlap.
    merged = merge_overlapping_boxes(raw_detections, iou_threshold=0.3)
    
    return merged


def detect_people(image_path, use_yolo=True, min_confidence=0.3):
    """
    Detect people with YOLO (preferred) and fallback methods.

    Returns a list of dicts with keys: box, confidence, method.
    """
    all_detections: List[Dict] = []

    if use_yolo:
        try:
            from ultralytics import YOLO

            if not hasattr(detect_people, "model"):
                print("Loading YOLO model...")
                model_path = Path(__file__).resolve().parents[1] / "app" / "services" / "ai" / "yolov8n.pt"
                detect_people.model = YOLO(str(model_path))

            results = detect_people.model(str(image_path), verbose=False)
            for result in results:
                for box in result.boxes:
                    if int(box.cls) == 0:
                        conf = float(box.conf[0])
                        if conf >= min_confidence:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            all_detections.append(
                                {
                                    "box": (int(x1), int(y1), int(x2), int(y2)),
                                    "confidence": conf,
                                    "method": "yolo",
                                }
                            )
            return all_detections
        except ImportError:
            print("YOLO unavailable, using fallback methods")
        except Exception as exc:
            print(f"YOLO error: {exc}")

    img = cv2.imread(str(image_path))
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    try:
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        upper_body_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_upperbody.xml"
        )

        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        for (x, y, w, h) in faces:
            all_detections.append(
                {
                    "box": (x, y, x + w, y + h),
                    "confidence": 0.7,
                    "method": "haar_face",
                }
            )

        bodies = upper_body_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))
        for (x, y, w, h) in bodies:
            all_detections.append(
                {
                    "box": (x, y, x + w, y + h),
                    "confidence": 0.6,
                    "method": "haar_body",
                }
            )
    except Exception as exc:
        print(f"Haar detection error: {exc}")

    try:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)

        contours, _ = _find_contours_compat(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        h, w = img.shape[:2]
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > (h * w * 0.02):
                x, y, bbox_w, bbox_h = cv2.boundingRect(cnt)
                all_detections.append(
                    {
                        "box": (x, y, x + bbox_w, y + bbox_h),
                        "confidence": 0.4,
                        "method": "skin_color",
                    }
                )
    except Exception as exc:
        print(f"Skin detection error: {exc}")

    merged = merge_overlapping_boxes(all_detections, iou_threshold=0.5)
    return merged
