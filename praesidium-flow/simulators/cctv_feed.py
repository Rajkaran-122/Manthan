import cv2
import redis
import time
import os

VIDEO_PATH = os.path.join(os.path.dirname(__file__), '../assets/crowd_simulation.mp4')
REDIS_CHANNEL = 'cctv_stream'
REDIS_HOST = 'localhost'
REDIS_PORT = 6379

# Connect to Redis
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

# Open video file
cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print(f"Error: Cannot open video file {VIDEO_PATH}")
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS) or 25
frame_interval = 1.0 / fps

print(f"[CCTV FEED] Streaming video at {fps:.2f} FPS to Redis channel '{REDIS_CHANNEL}'...")

while True:
    ret, frame = cap.read()
    if not ret:
        print("[CCTV FEED] End of video. Restarting...")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue
    # Encode frame as JPEG
    _, buffer = cv2.imencode('.jpg', frame)
    # Publish to Redis
    r.publish(REDIS_CHANNEL, buffer.tobytes())
    time.sleep(frame_interval) 