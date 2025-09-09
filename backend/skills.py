from fastapi import APIRouter, Depends, HTTPException
from auth import verify_token

router = APIRouter()

# Temporary in-memory storage for skills
skills_db = []

# Add a new skill (protected)
@router.post("/skills/")
def add_skill(skill: dict, username: str = Depends(verify_token)):
    skill_entry = {"username": username, **skill}
    skills_db.append(skill_entry)
    return {"message": "Skill added successfully", "skill": skill_entry}

# Get all skills (public for now, can protect later if needed)
@router.get("/skills/")
def get_skills():
    return {"skills": skills_db}
 