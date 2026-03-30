from pydantic import BaseModel, Field
from typing import Dict, List, Literal


class Observation(BaseModel):
    current_reports: List[dict] = Field(default_factory=list)
    selected_region: str
    crime_stats: Dict[str, int] = Field(default_factory=dict)
    time_of_day: str


class Action(BaseModel):
    classify_crime: Literal["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"]
    assign_zone: Literal["Low", "Medium", "High"]
    escalate_case: bool
    ignore_case: bool


class Reward(BaseModel):
    accuracy_score: float
    penalty: float
    progress_score: float
