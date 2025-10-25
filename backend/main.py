import os
import uuid
import json
import shutil
from datetime import datetime, timedelta
from typing import Optional, List

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import (FastAPI, HTTPException, Depends, File, UploadFile,
                     WebSocket, WebSocketDisconnect, Request)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

from auth import verify_token
import skills

# ---------- App Setup ----------
app = FastAPI(title="SkillSwap API", version="0.1.0")
app.include_router(skills.router)
ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# --- WebSocket Manager ---
class ConnectionManager:
    def __init__(self): self.active_connections: dict[str, WebSocket] = {}
    async def connect(self, websocket: WebSocket, client_id: str): await websocket.accept(); self.active_connections[client_id] = websocket; print(f"--- WS CONNECTED: {client_id} ---")
    def disconnect(self, client_id: str):
        if client_id in self.active_connections: del self.active_connections[client_id]; print(f"--- WS DISCONNECTED: {client_id} ---")
    async def broadcast(self, data: dict): message = json.dumps(data, default=str); [await conn.send_text(message) for conn in self.active_connections.values()]
    async def send_personal_message(self, data: dict, client_id: str):
        message = json.dumps(data, default=str) # Use default=str to handle ObjectId/datetime
        if client_id in self.active_connections: await self.active_connections[client_id].send_text(message); print(f"--- WS SENT to {client_id} ---")
        else: print(f"--- WS SEND FAILED: {client_id} not connected ---")
manager = ConnectionManager()

# ---------- DB & Auth Setup ----------
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["skillswap"]
users_collection = db["users"]; skills_collection = db["skills"]; requests_collection = db["requests"]; messages_collection = db["messages"]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "change_this_to_a_long_random_secret")
ALGORITHM = "HS256"

# ---------- Schemas ----------
class UserSignup(BaseModel): username: str; email: EmailStr; password: str
class UserLogin(BaseModel): username: str; password: str
class ProfileUpdate(BaseModel): bio: Optional[str] = None; skills_offered: Optional[List[str]] = None; profile_pic: Optional[str] = None
class UserInterestsUpdate(BaseModel): learningGoals: Optional[List[str]] = None; interests: Optional[List[str]] = None; hobbies: Optional[List[str]] = None; preferredTimings: Optional[List[str]] = None
class PasswordChange(BaseModel): current_password: str; new_password: str
class PrivacySettings(BaseModel): profileVisibility: Optional[str] = None; emailVisibility: Optional[str] = None
class NotificationSettings(BaseModel): onNewRequest: Optional[bool] = True; onRequestUpdate: Optional[bool] = True; onNewSuggestion: Optional[bool] = False
class SkillCreate(BaseModel): title: str = Field(..., min_length=2, max_length=80); description: str = Field(..., min_length=5, max_length=400); category: str; availability: str
class SkillOut(BaseModel): id: str; title: str; description: str; category: str; availability: str; owner: str; owner_email: str
class ExchangeRequest(BaseModel): skill_id: str; message: Optional[str] = ""
class RequestResponse(BaseModel): action: str
class Message(BaseModel): id: str = Field(alias="_id"); request_id: str; from_user: str; to_user: str; content: str; timestamp: datetime
# ✅ NEW: Schema for chat connection list
class ChatConnection(BaseModel):
    request_id: str
    other_user: str
    skill_title: str
    last_message: Optional[str] = None

# ---------- WebSocket Endpoint ----------
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            text_data = await websocket.receive_text()
            data = json.loads(text_data)
            if data.get("type") == "chat_message":
                message_doc = {"request_id": ObjectId(data["request_id"]), "from_user": client_id, "to_user": data["to"], "content": data["content"], "timestamp": datetime.utcnow()}
                await messages_collection.insert_one(message_doc)
                message_doc["_id"] = str(message_doc["_id"]) # Convert ObjectId before sending
                message_doc["request_id"] = str(message_doc["request_id"]) # Convert ObjectId before sending
                await manager.send_personal_message(message_doc, data["to"])
    except WebSocketDisconnect: manager.disconnect(client_id)
    except Exception as e: print(f"WS Error {client_id}: {e}"); manager.disconnect(client_id)

# ---------- Helper & Startup ----------
def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=60); payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
@app.on_event("startup")
async def on_startup(): await users_collection.create_index("username", unique=True); await users_collection.create_index("email", unique=True)
async def get_body(request: Request): return await request.body() # Debug helper

# ---------- API Routes ----------
@app.get("/")
async def root(): return {"message": "SkillSwap API is alive"}

@app.post("/requests", status_code=201)
async def request_exchange(payload: ExchangeRequest, username: str = Depends(verify_token)):
    try: _id = ObjectId(payload.skill_id)
    except InvalidId: raise HTTPException(status_code=400, detail="Invalid skill id")
    skill = await skills_collection.find_one({"_id": _id});
    if not skill: raise HTTPException(status_code=404, detail="Skill not found")
    if skill["owner"] == username: raise HTTPException(status_code=400, detail="You cannot request your own skill")

    doc = { "skill_id": _id, "from_user": username, "to_user": skill["owner"], "message": payload.message, "status": "pending", "created_at": datetime.utcnow() }
    result = await requests_collection.insert_one(doc) # Get the result of the insert operation

    # --- Ensure the request_id is included here ---
    notification_data = {
        "type": "new_request",
        "request_id": str(result.inserted_id), # Use the ID from the insert result
        "from_user": username,
        "skill_title": skill["title"],
        "skill_id": str(skill["_id"]),
        "message": payload.message
    }
    # --- End correction ---

    skill_owner_username = skill["owner"];
    print(f"--- Attempting send NEW_REQUEST to {skill_owner_username} ---") # Debug print
    await manager.send_personal_message(notification_data, skill_owner_username)
    return {"message": "Request sent"}


@app.put("/requests/{request_id}/respond")
async def respond_to_request(request_id: str, response: RequestResponse, username: str = Depends(verify_token), body: bytes = Depends(get_body)):
    print(f"--- DEBUG RESPOND BODY: {body} ---") # Keep for debugging if needed
    try: object_id = ObjectId(request_id)
    except InvalidId: raise HTTPException(status_code=400, detail="Invalid request ID.")
    request = await requests_collection.find_one({"_id": object_id})
    if not request: raise HTTPException(status_code=404, detail="Request not found.")
    if request["to_user"] != username: raise HTTPException(status_code=403, detail="Not authorized.")
    new_status = response.action
    await requests_collection.update_one({"_id": object_id}, {"$set": {"status": new_status}})
    original_requester = request["from_user"]
    skill_doc = await skills_collection.find_one({"_id": request["skill_id"]})
    skill_title = skill_doc["title"] if skill_doc else "a deleted skill"
    response_notification = {
        "type": "request_response",
        "request_id": request_id, # Include request ID in response notification
        "skill_title": skill_title,
        "status": new_status,
        "from_user": username # Let requester know who responded
    }
    print(f"--- Attempting send RESPONSE to {original_requester} ---") # Debug print
    await manager.send_personal_message(response_notification, original_requester)
    return {"message": f"Request {new_status}"}


@app.get("/requests/sent") # Make sure this line is exactly correct
async def get_sent_requests(username: str = Depends(verify_token)):
    cursor = requests_collection.find({"from_user": username}).sort("created_at", -1)
    requests = []
    async for req in cursor:
        skill = await skills_collection.find_one({"_id": req["skill_id"]})
        if skill:
            req["skill_title"] = skill["title"]
        else:
            req["skill_title"] = "a deleted skill"
        
        # Convert ObjectId to string for JSON serialization
        req["_id"] = str(req["_id"])
        req["skill_id"] = str(req["skill_id"])
        
        requests.append(req)
    return requests
# ... (All other routes remain the same) ...
# Remaining routes below are unchanged and correct
@app.post("/signup")
async def signup(user: UserSignup):
    exists = await users_collection.find_one({"$or": [{"username": user.username}, {"email": user.email}]});
    if exists: raise HTTPException(status_code=400, detail="Username or email already exists")
    hashed = pwd_context.hash(user.password); doc = {"username": user.username, "email": user.email, "password": hashed}; await users_collection.insert_one(doc)
    return {"message": "User created successfully"}
@app.post("/login")
async def login(body: UserLogin):
    user = await users_collection.find_one({"username": body.username});
    if not user or not pwd_context.verify(body.password, user["password"]): raise HTTPException(status_code=400, detail="Invalid username or password")
    token = create_access_token(subject=user["username"])
    return {"message": "Login successful", "access_token": token, "token_type": "bearer"}
@app.post("/skills", status_code=201)
async def create_skill(skill: SkillCreate, username: str = Depends(verify_token)):
    user = await users_collection.find_one({"username": username})
    if not user: raise HTTPException(status_code=404, detail="User not found")
    doc = {"title": skill.title, "description": skill.description, "category": skill.category, "availability": skill.availability, "owner": username, "owner_email": user.get("email", ""), "status": "in_progress", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
    res = await skills_collection.insert_one(doc)
    new_skill_data = SkillOut(id=str(res.inserted_id), title=skill.title, description=skill.description, category=skill.category, availability=skill.availability, owner=username, owner_email=user.get("email", ""))
    await manager.broadcast({"type": "new_skill", "data": new_skill_data.dict()})
    return {"message": "Skill added", "id": str(res.inserted_id)}
@app.get("/skills/market", response_model=List[SkillOut])
async def skills_market(username: str = Depends(verify_token)):
    cursor = skills_collection.find({"owner": {"$ne": username}}).sort("created_at", -1).limit(30)
    items = [SkillOut(id=str(s["_id"]), title=s["title"], description=s["description"], category=s["category"], availability=s["availability"], owner=s["owner"], owner_email=s.get("owner_email", "")) async for s in cursor]
    return items
@app.get("/skills/mine", response_model=List[SkillOut])
async def my_skills(username: str = Depends(verify_token)):
    cursor = skills_collection.find({"owner": username}).sort("updated_at", -1)
    items = [SkillOut(id=str(s["_id"]), title=s["title"], description=s["description"], category=s["category"], availability=s["availability"], owner=s["owner"], owner_email=s.get("owner_email", "")) async for s in cursor]
    return items
@app.delete("/skills/{skill_id}", status_code=200)
async def delete_skill(skill_id: str, username: str = Depends(verify_token)):
    try: object_id = ObjectId(skill_id)
    except InvalidId: raise HTTPException(status_code=400, detail="Invalid skill ID format.")
    skill = await skills_collection.find_one({"_id": object_id});
    if not skill: raise HTTPException(status_code=404, detail="Skill not found.")
    if skill["owner"] != username: raise HTTPException(status_code=403, detail="Not authorized.")
    await skills_collection.delete_one({"_id": object_id}); await requests_collection.delete_many({"skill_id": object_id})
    return {"message": "Skill deleted."}

# ✅ NEW: Endpoint to get accepted connections for chat list
@app.get("/chats/connections", response_model=List[ChatConnection])
async def get_chat_connections(username: str = Depends(verify_token)):
    connections = []
    # Find requests where the user is involved AND status is accepted
    query = {
        "$and": [
            {"status": "accepted"},
            {"$or": [{"from_user": username}, {"to_user": username}]}
        ]
    }
    cursor = requests_collection.find(query).sort("created_at", -1)

    async for req in cursor:
        other_user = req["to_user"] if req["from_user"] == username else req["from_user"]
        skill = await skills_collection.find_one({"_id": req["skill_id"]})
        skill_title = skill["title"] if skill else "Deleted Skill"

        # Optional: Find the last message for a preview (can be added later)
        # last_msg = await messages_collection.find_one({"request_id": req["_id"]}, sort=[("timestamp", -1)])
        
        connections.append(ChatConnection(
            request_id=str(req["_id"]),
            other_user=other_user,
            skill_title=skill_title
            # last_message=last_msg["content"] if last_msg else None
        ))
    return connections

@app.get("/chat/{request_id}", response_model=List[Message])
async def get_chat_history(request_id: str, username: str = Depends(verify_token)):
    try: req_obj_id = ObjectId(request_id)
    except InvalidId: raise HTTPException(status_code=400, detail="Invalid request ID.")
    request_doc = await requests_collection.find_one({"_id": req_obj_id})
    if not request_doc or username not in [request_doc["from_user"], request_doc["to_user"]]: raise HTTPException(status_code=403, detail="Not authorized.")
    cursor = messages_collection.find({"request_id": req_obj_id}).sort("timestamp", 1)
    # Correctly convert ObjectId to str for response model
    history = []
    async for msg in cursor:
        msg['_id'] = str(msg['_id'])
        msg['request_id'] = str(msg['request_id'])
        history.append(Message(**msg))
    return history
@app.get("/profile")
async def get_profile(username: str = Depends(verify_token)):
    user = await users_collection.find_one({"username": username}, {"_id": 0, "password": 0});
    if not user: raise HTTPException(status_code=404, detail="User not found")
    return user
@app.put("/profile")
async def update_profile(update: ProfileUpdate, username: str = Depends(verify_token)):
    await users_collection.update_one({"username": username}, {"$set": update.dict(exclude_none=True)})
    return {"message": "Profile updated successfully"}
@app.post("/profile/picture")
async def upload_profile_picture(file: UploadFile = File(...), username: str = Depends(verify_token)):
    unique_filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"; file_path = os.path.join("static/images", unique_filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    url_path = f"/images/{unique_filename}"; await users_collection.update_one({"username": username}, {"$set": {"profile_pic": url_path}})
    return {"profile_pic_url": url_path}
@app.put("/profile/interests")
async def update_user_interests(interests_data: UserInterestsUpdate, username: str = Depends(verify_token)):
    update_data = interests_data.dict(exclude_unset=True);
    if not update_data: raise HTTPException(status_code=400, detail="No data provided.")
    await users_collection.update_one({"username": username}, {"$set": update_data})
    return {"message": "User interests and goals updated."}
@app.put("/profile/privacy")
async def update_privacy_settings(privacy_data: PrivacySettings, username: str = Depends(verify_token)):
    update_data = privacy_data.dict(exclude_unset=True);
    if not update_data: raise HTTPException(status_code=400, detail="No privacy data.")
    await users_collection.update_one({"username": username}, {"$set": update_data})
    return {"message": "Privacy settings updated."}
@app.put("/profile/notifications")
async def update_notification_settings(notification_data: NotificationSettings, username: str = Depends(verify_token)):
    update_payload = {f"notificationSettings.{key}": value for key, value in notification_data.dict().items()};
    if not update_payload: raise HTTPException(status_code=400, detail="No notification data.")
    await users_collection.update_one({"username": username}, {"$set": update_payload})
    return {"message": "Notification settings updated."}
@app.post("/account/change-password")
async def change_password(password_data: PasswordChange, username: str = Depends(verify_token)):
    user = await users_collection.find_one({"username": username});
    if not user or not pwd_context.verify(password_data.current_password, user["password"]): raise HTTPException(status_code=400, detail="Incorrect current password")
    hashed_password = pwd_context.hash(password_data.new_password); await users_collection.update_one({"username": username}, {"$set": {"password": hashed_password}})
    return {"message": "Password updated successfully"}

    
@app.get("/dashboard/summary")
async def dashboard_summary(username: str = Depends(verify_token)):
    total = await skills_collection.count_documents({"owner": username}); completed = await skills_collection.count_documents({"owner": username, "status": "completed"}); in_progress = await skills_collection.count_documents({"owner": username, "status": "in_progress"})
    last = await skills_collection.find_one({"owner": username}, sort=[("updated_at", -1)]); last_title = last["title"] if last else None; suggest = "Try a new skill in 'Communication'!" if in_progress else "Start with a beginner-friendly skill."
    return {"username": username, "totals": {"all": total, "completed": completed, "in_progress": in_progress}, "last_active_skill": last_title, "ai_suggestion": suggest}
