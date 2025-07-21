import asyncio
import redis.asyncio as redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

REDIS_HOST = 'localhost'
REDIS_PORT = 6379
LIVE_DENSITY_CHANNEL = 'live_density_data'
PREDICTED_DENSITY_CHANNEL = 'predicted_density_data'

app = FastAPI()

async def redis_reader(ws: WebSocket, channel_name: str):
    """Subscribes to a Redis channel and forwards messages to the WebSocket."""
    async with redis.Redis(host=REDIS_HOST, port=REDIS_PORT) as r:
        async with r.pubsub() as pubsub:
            await pubsub.subscribe(channel_name)
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    await ws.send_text(message['data'].decode('utf-8'))
                await asyncio.sleep(0.01)

@app.websocket("/ws/density")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Create tasks to listen to both Redis channels concurrently
        live_task = asyncio.create_task(redis_reader(websocket, LIVE_DENSITY_CHANNEL))
        predicted_task = asyncio.create_task(redis_reader(websocket, PREDICTED_DENSITY_CHANNEL))
        # Keep the connection open
        done, pending = await asyncio.wait(
            [live_task, predicted_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
    finally:
        print("[WebSocket] Connection closed") 