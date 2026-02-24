import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import urllib.parse
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

# Prefer a full MONGO_URL if provided (recommended). Otherwise build from parts.
MONGO_URL = os.getenv("MONGO_URL")
if MONGO_URL and MONGO_URL.strip():
    mongo_uri = MONGO_URL.strip()
else:
    user = os.getenv("MONGO_USER")
    password_raw = os.getenv("MONGO_PASS") or ""
    password = urllib.parse.quote_plus(password_raw)
    cluster = os.getenv("MONGO_CLUSTER")
    if not (user and cluster):
        raise RuntimeError("Missing MongoDB configuration: set MONGO_URL or set MONGO_USER and MONGO_CLUSTER in your environment (.env).")
    mongo_uri = f"mongodb+srv://{user}:{password}@{cluster}/?retryWrites=true&w=majority"

# Safety: avoid accidental local fallback to mongodb://localhost
if "localhost" in mongo_uri or "127.0.0.1" in mongo_uri:
    raise RuntimeError("MongoDB URI appears to point to localhost. Expected an Atlas URI. Aborting to avoid accidental writes to local DB.")

client = AsyncIOMotorClient(mongo_uri)
db = client.get_database("skillswap")

users_collection = db.users
skills_collection = db.skills
requests_collection = db.requests
notifications_collection = db.notifications

async def test_connection():
    try:
        await client.admin.command('ping')
        print("✅ Success! Connected to MongoDB cluster.")
        try:
            # print a sample of server info
            info = await client.server_info()
            print("Server info product:", info.get('version'))
        except Exception:
            pass
    except Exception as e:
        print(f"❌ Connection failed. Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())