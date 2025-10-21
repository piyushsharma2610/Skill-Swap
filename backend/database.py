from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client.skillswap   # database name
users_collection = db.users
# NEW collections
skills_collection = db["skills"]
requests_collection = db["requests"]