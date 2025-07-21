import redis
import json
import time
import random

REDIS_HOST = 'localhost'
REDIS_PORT = 6379
INPUT_CHANNEL = 'live_density_data'
OUTPUT_CHANNEL = 'predicted_density_data'

# Connect to Redis
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
p = r.pubsub()
p.subscribe(INPUT_CHANNEL)

print("[Prediction Engine] Listening for live density data...")

def generate_prediction(live_data):
    """
    Placeholder for a real GNN model.
    This function simulates a 30-minute forecast based on live data.
    It adds a multiplier to the current density to show a potential increase.
    """
    # Simulate a prediction: higher density in the near future
    predicted_density = live_data['density'] * (1.5 + random.uniform(-0.2, 0.2))
    
    # In a real GNN, the timestamp would be a future time
    predicted_timestamp = live_data['timestamp'] + (30 * 60) # 30 minutes ahead
    
    return {
        'type': 'predicted',
        'zone_id': live_data['zone_id'],
        'predicted_density': predicted_density,
        'timestamp': predicted_timestamp
    }

while True:
    message = p.get_message()
    if message and message['type'] == 'message':
        live_data = json.loads(message['data'])
        
        # Only predict on live data
        if live_data.get('type') == 'live':
            prediction = generate_prediction(live_data)
            
            # Publish prediction
            r.publish(OUTPUT_CHANNEL, json.dumps(prediction))
            print(f"[Prediction Engine] Zone: {prediction['zone_id']}, Predicted Density: {prediction['predicted_density']:.4f}")
            
    time.sleep(1) # Predict at a slower rate than perception 