"""PromptTasks API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, cast

from app.db.session import get_seed_db
from app.models.prompt_task import PromptTask
from app.schemas.prompt_task import (
    PromptTaskCreate,
    PromptTaskUpdate,
    PromptTaskRead,
    PromptTaskListResponse,
    PromptTaskBulkUpdateItem,
    PromptTaskBulkReplaceRequest,
)

router = APIRouter()


@router.get("/prompt-tasks", response_model=PromptTaskListResponse)
def list_prompt_tasks(
    q: Optional[str] = Query(None, description="Search query for ID and prompt"),
    db: Session = Depends(get_seed_db),
):
    """List all prompt tasks with optional search."""
    query = db.query(PromptTask)
    
    if q:
        query = query.filter(
            (PromptTask.id.ilike(f"%{q}%")) | (PromptTask.prompt.ilike(f"%{q}%"))
        )
    
    prompt_tasks = query.all()
    
    return PromptTaskListResponse(prompt_tasks=cast(List[PromptTaskRead], prompt_tasks), total=len(prompt_tasks))


@router.get("/prompt-tasks/{prompt_task_id}", response_model=PromptTaskRead)
def get_prompt_task(prompt_task_id: str, db: Session = Depends(get_seed_db)):
    """Get a single prompt task by ID."""
    prompt_task = db.query(PromptTask).filter(PromptTask.id == prompt_task_id).first()
    if not prompt_task:
        raise HTTPException(status_code=404, detail="PromptTask not found")
    return prompt_task


@router.post("/prompt-tasks", response_model=PromptTaskRead, status_code=201)
def create_prompt_task(prompt_task_data: PromptTaskCreate, db: Session = Depends(get_seed_db)):
    """Create a new prompt task."""
    # Check if prompt task ID already exists
    existing = db.query(PromptTask).filter(PromptTask.id == prompt_task_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="PromptTask with this ID already exists")
    
    prompt_task = PromptTask(**prompt_task_data.model_dump())
    db.add(prompt_task)
    db.commit()
    db.refresh(prompt_task)
    return prompt_task


@router.patch("/prompt-tasks/{prompt_task_id}", response_model=PromptTaskRead)
def update_prompt_task(prompt_task_id: str, prompt_task_data: PromptTaskUpdate, db: Session = Depends(get_seed_db)):
    """Update a prompt task."""
    prompt_task = db.query(PromptTask).filter(PromptTask.id == prompt_task_id).first()
    if not prompt_task:
        raise HTTPException(status_code=404, detail="PromptTask not found")
    
    update_data = prompt_task_data.model_dump(exclude_unset=True)
    new_id = update_data.pop("new_id", None)
    
    # Handle ID change
    if new_id and new_id != prompt_task_id:
        # If new_id already exists, delete the existing record (replace behavior)
        existing = db.query(PromptTask).filter(PromptTask.id == new_id).first()
        if existing:
            db.delete(existing)
            db.flush()  # Ensure delete is processed before updating ID
        
        # Update the primary key
        prompt_task.id = new_id
    
    # Apply other updates
    for field, value in update_data.items():
        setattr(prompt_task, field, value)
    
    db.commit()
    db.refresh(prompt_task)
    return prompt_task


@router.patch("/prompt-tasks", response_model=PromptTaskListResponse)
def update_all_prompt_tasks(
    updates: List[PromptTaskBulkUpdateItem],
    db: Session = Depends(get_seed_db),
):
    """Update multiple prompt tasks at once."""
    updated_tasks = []
    not_found_ids = []
    
    for item in updates:
        prompt_task = db.query(PromptTask).filter(PromptTask.id == item.id).first()
        if not prompt_task:
            not_found_ids.append(item.id)
            continue
        
        update_data = item.model_dump(exclude_unset=True, exclude={"id"})
        for field, value in update_data.items():
            setattr(prompt_task, field, value)
        
        updated_tasks.append(prompt_task)
    
    if not_found_ids:
        raise HTTPException(status_code=404, detail=f"PromptTasks not found: {', '.join(not_found_ids)}")
    
    db.commit()
    for task in updated_tasks:
        db.refresh(task)
    
    return PromptTaskListResponse(prompt_tasks=cast(List[PromptTaskRead], updated_tasks), total=len(updated_tasks))



@router.delete("/prompt-tasks/{prompt_task_id}", status_code=204)
def delete_prompt_task(prompt_task_id: str, db: Session = Depends(get_seed_db)):
    """Delete a prompt task."""
    prompt_task = db.query(PromptTask).filter(PromptTask.id == prompt_task_id).first()
    if not prompt_task:
        raise HTTPException(status_code=404, detail="PromptTask not found")
    
    db.delete(prompt_task)
    db.commit()
    return None


@router.post("/prompt-tasks/bulk-replace", response_model=PromptTaskListResponse)
def bulk_replace_prompt_tasks(
    request: PromptTaskBulkReplaceRequest,
    db: Session = Depends(get_seed_db),
):
    """
    Replace all prompt tasks with the provided list.
    
    - Deletes all existing records from database
    - Writes new tasks to database
    """
    # Delete all existing prompt tasks
    db.query(PromptTask).delete()
    db.flush()
    
    # Insert new records from the request
    created_tasks = []
    for item in request.prompt_tasks:
        prompt_task = PromptTask(
            id=item.id,
            prompt=item.prompt,
            db_verification_config=item.db_verification_config,
        )
        db.add(prompt_task)
        created_tasks.append(prompt_task)
    
    db.commit()
    
    # Refresh all tasks to get updated timestamps
    for task in created_tasks:
        db.refresh(task)
    
    return PromptTaskListResponse(
        prompt_tasks=cast(List[PromptTaskRead], created_tasks),
        total=len(created_tasks),
    )
