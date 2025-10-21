from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import os # ✅ Import the os module

# ✅ --- MODIFIED SECTION ---
# Use the same secure method for secrets as in main.py
# This ensures consistency across the application.
SECRET_KEY = os.getenv("SECRET_KEY", "change_this_to_a_long_random_secret")
ALGORITHM = "HS256"
# Let's increase the token lifetime to match main.py as well
ACCESS_TOKEN_EXPIRE_MINUTES = 60
# ✅ --- END MODIFIED SECTION ---


# Tells FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Router for auth endpoints
router = APIRouter()

# ✅ Function to create token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ✅ Function to verify token
def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")   # 👈 decode username from "sub"
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# -------------------------------
# 👇 NEW: Login endpoint
# -------------------------------
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # TODO: replace with real DB authentication
    if form_data.username != "testuser" or form_data.password != "testpass":
        raise HTTPException(status_code=400, detail="Invalid username or password")

    # 👇 Create token with username as `sub`
    access_token = create_access_token(
        data={"sub": form_data.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


# -------------------------------
# 👇 NEW: Current user endpoint
# -------------------------------
@router.get("/me")
def read_users_me(username: str = Depends(verify_token)):
    return {"username": username}