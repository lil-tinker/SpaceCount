from ultralytics import YOLO
from shapely.geometry import Point, Polygon
import numpy as np
import cv2

modelAI = None

def getModel():
    global modelAI
    if modelAI is None:
        modelAI = YOLO("yolo26s.pt")
    return modelAI

def imageFromBytesToArr(snapshotJpeg):
    arr = np.frombuffer(snapshotJpeg, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def getShapelyPolygon(points, width, height):
    coords = []
    for p in points:
        x = p["x"] / 100 * width
        y = p["y"] / 56 * height
        coords.append((x, y))
    return Polygon(coords)

def getPersonPoint(box, mode="center"):
    x1, y1, x2, y2 = box
    cx = (x1 + x2) / 2
    if mode == "feet":
        return (cx, y2)
    elif mode == "center":
        return (cx, (y1 + y2) / 2)
    elif mode == "head":
        return (cx, y1)
    
def isValidBox(box, imgWidth, imgHeight, min_aspect_ratio=1.5, max_width_frac=0.3, threshold=0.1):
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    if w <= 0 or h <= 0:
        return False
    aspect_ratio = h / w
    if aspect_ratio < min_aspect_ratio:
        return False
    if w / imgWidth > max_width_frac:
        return False
    if (h / imgHeight) > threshold:
        return False
    return True

def deduplicate_by_center(boxes, confs, min_dist_frac=0.5):
    items = []
    for i, (box, conf) in enumerate(zip(boxes, confs)):
        x1, y1, x2, y2 = box
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        w = x2 - x1
        h = y2 - y1
        items.append({"idx": i, "cx": cx, "cy": cy, "w": w, "h": h, "conf": conf})
    keep = []
    used = set()
    items.sort(key=lambda x: x["conf"], reverse=True)
    for i, a in enumerate(items):
        if i in used:
            continue
        keep.append(a["idx"])
        for j, b in enumerate(items):
            if j <= i or j in used:
                continue
            avg_h = (a["h"] + b["h"]) / 2
            avg_w = (a["w"] + b["w"]) / 2
            min_dist = min_dist_frac * (avg_h * 0.7 + avg_w * 0.3)
            dist = ((a["cx"] - b["cx"]) ** 2 + (a["cy"] - b["cy"]) ** 2) ** 0.5
            if dist < min_dist:
                used.add(j)
    filtered_boxes = [boxes[i] for i in keep]
    filtered_confs = [confs[i] for i in keep]
    return filtered_boxes, filtered_confs

class PeopleCountingService:
    PERSON_CLASS_ID = 0
    def count(self, snapshotJpeg, zones, cnf=0.02, confidence=0.1):
        imgArray = imageFromBytesToArr(snapshotJpeg)
        imgHeight, imgWidth = imgArray.shape[:2]
        model = getModel()
        results = model(
            source=imgArray,
            conf=cnf,
            imgsz=min(imgWidth, 1280),
            classes=[self.PERSON_CLASS_ID],
            device="cpu",
            verbose=False,
        )
        result = results[0]
        boxes = result.boxes.xyxy.cpu().numpy()
        confs = result.boxes.conf.cpu().numpy()
        boxes, confs = deduplicate_by_center(boxes, confs)
        peoplePoints = []
        for box, conf in zip(boxes, confs):
            if conf < confidence and not isValidBox(box, imgWidth, imgHeight):
                continue
            peoplePoints.append(getPersonPoint(box))
        total = len(peoplePoints)
        if not zones:
            return {"total": total, "zones": []}
        shapelyZones = [
            (z["name"], getShapelyPolygon(z["points"], imgWidth, imgHeight))
            for z in zones
        ]
        zoneCounts = {name: 0 for name, _ in shapelyZones}
        for px, py in peoplePoints:
            pt = Point(px, py)
            for name, poly in shapelyZones:
                if poly.contains(pt):
                    zoneCounts[name] += 1
        return {
            "total": total,
            "zones": [{"name": name, "count": count} for name, count in zoneCounts.items()]
        }