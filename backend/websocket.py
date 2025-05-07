"""
De-Ransom WebSocket Server
------------------------
This module implements a WebSocket server for real-time notifications.
"""

import json
import asyncio
import threading
import websockets
from datetime import datetime

# Connected clients
clients = set()

# Event queue
event_queue = asyncio.Queue()

async def register(websocket):
    """Register a new client."""
    clients.add(websocket)
    print(f"Client connected. Total clients: {len(clients)}")

async def unregister(websocket):
    """Unregister a client."""
    clients.remove(websocket)
    print(f"Client disconnected. Total clients: {len(clients)}")

async def notify_clients(event):
    """Send an event to all connected clients."""
    if not clients:
        return
    
    # Prepare the message
    message = json.dumps({
        "type": "security_event",
        "event": event,
        "timestamp": datetime.now().isoformat()
    })
    
    # Send to all connected clients
    websockets_to_remove = set()
    for websocket in clients:
        try:
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            websockets_to_remove.add(websocket)
    
    # Clean up any closed connections
    for websocket in websockets_to_remove:
        await unregister(websocket)

async def consumer_handler(websocket):
    """Handle incoming messages from clients."""
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                # Handle client messages if needed
                print(f"Received message from client: {data}")
            except json.JSONDecodeError:
                print(f"Received invalid JSON: {message}")
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await unregister(websocket)

async def producer_handler(websocket):
    """Send periodic pings to keep the connection alive."""
    try:
        while True:
            # Send a ping every 30 seconds
            await asyncio.sleep(30)
            try:
                await websocket.send(json.dumps({"type": "ping"}))
            except websockets.exceptions.ConnectionClosed:
                break
    except asyncio.CancelledError:
        pass

async def event_processor():
    """Process events from the queue and notify clients."""
    while True:
        event = await event_queue.get()
        await notify_clients(event)
        event_queue.task_done()

async def handler(websocket):
    """Handle a connection."""
    await register(websocket)
    
    consumer_task = asyncio.create_task(consumer_handler(websocket))
    producer_task = asyncio.create_task(producer_handler(websocket))
    
    try:
        await asyncio.gather(consumer_task, producer_task)
    finally:
        producer_task.cancel()
        await unregister(websocket)

async def start_server(host='0.0.0.0', port=8765):
    """Start the WebSocket server."""
    # Start the event processor
    asyncio.create_task(event_processor())
    
    # Start the WebSocket server
    async with websockets.serve(handler, host, port):
        print(f"WebSocket server started on ws://{host}:{port}")
        await asyncio.Future()  # Run forever

def add_event(event):
    """Add an event to the queue for processing."""
    # This function can be called from other threads
    asyncio.run_coroutine_threadsafe(event_queue.put(event), asyncio.get_event_loop())

def run_server(host='0.0.0.0', port=8765):
    """Run the WebSocket server in a separate thread."""
    def _run():
        asyncio.run(start_server(host, port))
    
    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return thread

# For testing the module directly
if __name__ == "__main__":
    print("Starting WebSocket server...")
    asyncio.run(start_server())