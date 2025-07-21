import redis
import time
import random
import math
from datetime import datetime, timedelta

REDIS_CHANNEL = 'app_data_stream'
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
NUM_USERS = 100
SIM_DURATION_MINUTES = 20
SIM_STEP_SECONDS = 1

# Define the venue bounds (fictional coordinates)
VENUE_CENTER = (23.2599, 77.4126)  # Bhopal Exhibition Center (lat, lng)
ZONE_TARGET = (23.2605, 77.4135)   # The "danger zone" users will move toward

# Helper to interpolate between two points
def interpolate(start, end, fraction):
    return start + (end - start) * fraction

# Initialize user positions randomly around the venue
users = [
    {
        'user_id': f'user_{i+1}',
        'lat': VENUE_CENTER[0] + random.uniform(-0.002, 0.002),
        'lng': VENUE_CENTER[1] + random.uniform(-0.002, 0.002)
    }
    for i in range(NUM_USERS)
]

# Connect to Redis
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

start_time = datetime.now()
end_time = start_time + timedelta(minutes=SIM_DURATION_MINUTES)
current_time = start_time

print(f"[APP DATA] Simulating {NUM_USERS} users moving toward zone at {ZONE_TARGET} over {SIM_DURATION_MINUTES} minutes...")

while current_time < end_time:
    # Calculate progress (0.0 to 1.0) through the simulation
    progress = (current_time - start_time).total_seconds() / (SIM_DURATION_MINUTES * 60)
    data_batch = []
    for user in users:
        # Move each user a bit closer to the target zone
        user['lat'] = interpolate(user['lat'], ZONE_TARGET[0], 0.01 + 0.09 * progress)
        user['lng'] = interpolate(user['lng'], ZONE_TARGET[1], 0.01 + 0.09 * progress)
        data = {
            'user_id': user['user_id'],
            'lat': user['lat'],
            'lng': user['lng'],
            'timestamp': current_time.isoformat()
        }
        r.publish(REDIS_CHANNEL, str(data))
        data_batch.append(data)
    print(f"[APP DATA] Published {len(data_batch)} user locations at {current_time.strftime('%H:%M:%S')}")
    time.sleep(SIM_STEP_SECONDS)
    current_time += timedelta(seconds=SIM_STEP_SECONDS) 