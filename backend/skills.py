from fastapi import APIRouter, Depends, HTTPException
from auth import verify_token
# This connects this file to your cloud connection in database.py
from database import skills_collection 
from datetime import datetime

router = APIRouter()

@router.post("/skills/")
async def add_skill(skill: dict, username: str = Depends(verify_token)):
    try:
        # Prepare the data for the Cloud
        skill_entry = {
            "owner": username, 
            **skill, 
            "created_at": datetime.utcnow()
        }
        
        # Save directly to the 'skills' folder in your Cloud Cluster
        result = await skills_collection.insert_one(skill_entry)
        
        return {
            "message": "Skill added successfully to Atlas Cloud", 
            "skill_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save to Cloud: {str(e)}")

@router.get("/skills/")
async def get_skills():
    try:
        # Fetch all skills from the cloud cluster
        cursor = skills_collection.find({})
        skills = await cursor.to_list(length=100)
        
        # Convert the internal IDs so the website can read them
        for s in skills:
            s["_id"] = str(s["_id"])
            
        return {"skills": skills}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Cloud retrieval failed")