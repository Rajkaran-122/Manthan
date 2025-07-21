import redis
import numpy as np
import cv2
import json
from ultralytics import YOLO
import time

REDIS_HOST = 'localhost'
REDIS_PORT = 6379
INPUT_CHANNEL = 'cctv_stream'
OUTPUT_CHANNEL = 'live_density_data'

# Load the YOLOv8 model
model = YOLO('yolov8n.pt')  # Use a small, fast model for real-time processing

# Connect to Redis
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
p = r.pubsub()
p.subscribe(INPUT_CHANNEL)

print("[Perception Service] Listening for CCTV frames...")

def process_frame(frame_data):
    """Decodes frame, runs object detection, and calculates crowd density."""
    # Decode the image
    nparr = np.frombuffer(frame_data, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Perform inference
    results = model(frame, verbose=False)
    
    # Assume a single zone for the demo
    zone_id = "Zone-1"
    
    # Count persons detected
    person_count = 0
    for r in results:
        for c in r.boxes.cls:
            if model.names[int(c)] == 'person':
                person_count += 1
    
    # Simple density calculation (persons per frame area)
    # A real-world scenario would use square meters.
    height, width, _ = frame.shape
    density = person_count / (height * width)
    
    return zone_id, person_count, density

while True:
    message = p.get_message()
    if message and message['type'] == 'message':
        zone_id, count, density = process_frame(message['data'])
        
        # Prepare data for publishing
        output_data = {
            'type': 'live',
            'zone_id': zone_id,
            'person_count': count,
            'density': density,
            'timestamp': time.time()
        }
        
        # Publish to the output channel
        r.publish(OUTPUT_CHANNEL, json.dumps(output_data))
        print(f"[Perception Service] Zone: {zone_id}, Count: {count}, Density: {density:.4f}")
    time.sleep(0.01)  # Avoid pegging the CPU 