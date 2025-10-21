from fastapi import FastAPI, HTTPException, Depends , File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import jwt
import os
from typing import Optional, List
from bson import ObjectId
from auth import verify_token
from database import users_collection, skills_collection, requests_collection
import skills 
import shutil
import uuid
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Register the skills router
app.include_router(skills.router)
# ---------- App ----------
app = FastAPI(title="SkillSwap API", version="0.1.0")

# Allow Vite (5173/5174) on localhost and 127.0.0.1
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ NEW: Mount the static directory to serve images
# This line tells FastAPI that any request to "/images" should serve a file from the "static/images" directory
app.mount("/images", StaticFiles(directory="static/images"), name="images")

# ---------- DB ----------
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["skillswap"]
users_collection = db["users"]

# ---------- Auth / Security ----------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "change_this_to_a_long_random_secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
security = HTTPBearer()

# NEW: BSON -> str helper
def to_str_id(doc: dict):
    doc["_id"] = str(doc["_id"])
    return doc


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---------- Schemas ----------
class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# Profile Schema
class ProfileUpdate(BaseModel):
    bio: str | None = None
    skills_offered: list[str] | None = None
    profile_pic: str | None = None

# ✅ NEW: Schema for user interests and goals
class UserInterestsUpdate(BaseModel):
    learningGoals: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    hobbies: Optional[List[str]] = None
    preferredTimings: Optional[List[str]] = None

    # ✅ NEW: Schema for changing password
class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    # ✅ NEW: Schema for privacy settings
class PrivacySettings(BaseModel):
    profileVisibility: Optional[str] = None # e.g., "public" or "peers"
    emailVisibility: Optional[str] = None   # e.g., "hidden" or "onRequest"
    
    # ✅ NEW: Schema for notification settings
class NotificationSettings(BaseModel):
    onNewRequest: Optional[bool] = True
    onRequestUpdate: Optional[bool] = True
    onNewSuggestion: Optional[bool] = False

# ---------- Startup: indexes ----------
@app.on_event("startup")
async def on_startup():
    await users_collection.create_index("username", unique=True)
    await users_collection.create_index("email", unique=True)

# ---------- Routes ----------
@app.get("/")
async def root():
    return {"message": "SkillSwap API is alive"}

@app.post("/signup")
async def signup(user: UserSignup):
    # Check duplicates by username or email
    exists = await users_collection.find_one(
        {"$or": [{"username": user.username}, {"email": user.email}]}
    )
    if exists:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    hashed = pwd_context.hash(user.password)
    doc = {"username": user.username, "email": user.email, "password": hashed}
    await users_collection.insert_one(doc)
    return {"message": "User created successfully"}

@app.post("/login")
async def login(body: UserLogin):
    user = await users_collection.find_one({"username": body.username})
    if not user or not pwd_context.verify(body.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_access_token(subject=user["username"])
    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "email": user["email"],
    }

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"username": user["username"], "email": user["email"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/protected")
async def protected(current_user: dict = Depends(get_current_user)):
    return {"message": f"Hello {current_user['username']}! This is protected."}

# ✅ NEW ENDPOINT: Securely change user password
@app.post("/account/change-password")
async def change_password(
    password_data: PasswordChange,
    username: str = Depends(verify_token)
):
    user = await users_collection.find_one({"username": username})
    
    # Verify the current password
    if not user or not pwd_context.verify(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    # Hash the new password
    hashed_password = pwd_context.hash(password_data.new_password)
    
    # Update the password in the database
    await users_collection.update_one(
        {"username": username},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Password updated successfully"}

# ✅ NEW ENDPOINT: Update user's privacy settings
@app.put("/profile/privacy")
async def update_privacy_settings(
    privacy_data: PrivacySettings,
    username: str = Depends(verify_token)
):
    update_data = privacy_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No privacy data provided.")

    await users_collection.update_one(
        {"username": username},
        {"$set": update_data}
    )
    
    return {"message": "Privacy settings updated successfully"}

# ✅ NEW ENDPOINT: Update user's notification settings
@app.put("/profile/notifications")
async def update_notification_settings(
    notification_data: NotificationSettings,
    username: str = Depends(verify_token)
):
    # We will store the settings in a nested object called 'notificationSettings'
    update_payload = {f"notificationSettings.{key}": value for key, value in notification_data.dict().items()}
    
    if not update_payload:
        raise HTTPException(status_code=400, detail="No notification data provided.")

    await users_collection.update_one(
        {"username": username},
        {"$set": update_payload}
    )
    
    return {"message": "Notification settings updated successfully"}

# ✅ NEW ENDPOINT: Handle profile picture uploads
@app.post("/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    username: str = Depends(verify_token)
):
    # Generate a unique filename to prevent conflicts
    unique_id = uuid.uuid4()
    # Get the file extension (e.g., .jpg, .png)
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{str(unique_id)}{file_extension}"
    
    file_path = os.path.join("static/images", unique_filename)

    # Save the uploaded file to the static/images directory
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # The URL path to be saved in the database
    url_path = f"/images/{unique_filename}"

    # Update the user's document in the database with the new URL path
    await users_collection.update_one(
        {"username": username},
        {"$set": {"profile_pic": url_path}}
    )
    
    return {"profile_pic_url": url_path}

# NEW: skill schemas
class SkillCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=80)
    description: str = Field(..., min_length=5, max_length=400)
    category: str
    availability: str  # e.g., "Weekends", "Evenings", "Flexible"

class SkillOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    availability: str
    owner: str          # username of owner
    owner_email: str

# NEW: create skill
@app.post("/skills", status_code=201)
async def create_skill(skill: SkillCreate, username: str = Depends(verify_token)):
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    doc = {
        "title": skill.title,
        "description": skill.description,
        "category": skill.category,
        "availability": skill.availability,
        "owner": username,
        "owner_email": user.get("email", ""),
        "status": "in_progress",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    res = await skills_collection.insert_one(doc)
    return {"message": "Skill added", "id": str(res.inserted_id)}

@app.get("/skills")
def get_skills():
    # Example mock response for now
    return {"skills": [
        {"id": 1, "title": "Cooking", "description": "Learn recipes", "category": "Food", "availability": "Evenings", "owner": "Alice"},
        {"id": 2, "title": "Python Basics", "description": "Beginner friendly Python course", "category": "Programming", "availability": "Weekends", "owner": "Bob"}
    ]}

# NEW: marketplace list
@app.get("/skills/market", response_model=List[SkillOut])
async def skills_market(username: str = Depends(verify_token)):
    cursor = skills_collection.find({"owner": {"$ne": username}}).sort("created_at", -1).limit(30)
    items = []
    async for s in cursor:
        items.append(SkillOut(
            id=str(s["_id"]),
            title=s["title"],
            description=s["description"],
            category=s["category"],
            availability=s["availability"],
            owner=s["owner"],
            owner_email=s.get("owner_email","")
        ))
    return items

# NEW: my skills
@app.get("/skills/mine", response_model=List[SkillOut])
async def my_skills(username: str = Depends(verify_token)):
    cursor = skills_collection.find({"owner": username}).sort("updated_at", -1)
    items = []
    async for s in cursor:
        items.append(SkillOut(
            id=str(s["_id"]),
            title=s["title"],
            description=s["description"],
            category=s["category"],
            availability=s["availability"],
            owner=s["owner"],
            owner_email=s.get("owner_email","")
        ))
    return items

# NEW: dashboard summary
@app.get("/dashboard/summary")
async def dashboard_summary(username: str = Depends(verify_token)):
    total = await skills_collection.count_documents({"owner": username})
    completed = await skills_collection.count_documents({"owner": username, "status": "completed"})
    in_progress = await skills_collection.count_documents({"owner": username, "status": "in_progress"})

    last = await skills_collection.find({"owner": username}).sort("updated_at", -1).to_list(1)
    last_title = last[0]["title"] if last else None

    suggest = "Try a new skill in 'Communication' to complement your current learning!" if in_progress else "Start with a beginner-friendly skill like 'Public Speaking Basics'."
    return {
        "username": username,
        "totals": {"all": total, "completed": completed, "in_progress": in_progress},
        "last_active_skill": last_title,
        "ai_suggestion": suggest
    }

# NEW: request an exchange
class ExchangeRequest(BaseModel):
    skill_id: str
    message: Optional[str] = ""

@app.post("/requests", status_code=201)
async def request_exchange(payload: ExchangeRequest, username: str = Depends(verify_token)):
    try:
        _id = ObjectId(payload.skill_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid skill id")

    skill = await skills_collection.find_one({"_id": _id})
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if skill["owner"] == username:
        raise HTTPException(status_code=400, detail="You cannot request your own skill")

    doc = {
        "skill_id": _id,
        "from_user": username,
        "to_user": skill["owner"],
        "message": payload.message,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    await requests_collection.insert_one(doc)
    return {"message": "Request sent"}

# Get current user's profile
@app.get("/profile")
async def get_profile(username: str = Depends(verify_token)):
    user = await users_collection.find_one({"username": username}, {"_id": 0, "password": 0})
    if not user:
        return {"detail": "User not found"}
    return user

# Update profile
@app.put("/profile")
async def update_profile(update: ProfileUpdate, username: str = Depends(verify_token)):
    await users_collection.update_one({"username": username}, {"$set": update.dict(exclude_none=True)})
    return {"message": "Profile updated successfully"}
    
# ✅ NEW ENDPOINT: Update user interests and goals
@app.put("/profile/interests")
async def update_user_interests(
    interests_data: UserInterestsUpdate,
    username: str = Depends(verify_token)
):
    update_data = interests_data.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update.")

    await users_collection.update_one(
        {"username": username},
        {"$set": update_data}
    )
    return {"message": "User interests and goals have been saved successfully"}