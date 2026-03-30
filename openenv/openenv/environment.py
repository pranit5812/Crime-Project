from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

from .models import Action, Observation, Reward


@dataclass
class TaskSpec:
    name: str
    difficulty: str


class CrimeOpenEnv:
    def __init__(self, max_steps: int = 30, dataset: Optional[List[Dict]] = None):
        self.max_steps = max_steps
        self.tasks = [
            TaskSpec("Task 1", "easy"),
            TaskSpec("Task 2", "medium"),
            TaskSpec("Task 3", "hard"),
        ]
        self.dataset = dataset if dataset is not None else self._seed_data()
        self._provided_dataset = dataset
        self.current_index = 0
        self.steps = 0
        self.loop_penalty_window: List[Tuple[str, str, bool, bool]] = []

    def _seed_data(self) -> List[Dict]:
        return [
            {"region": "Mumbai", "crime_type": "Theft", "zone": "Medium", "time_of_day": "AM", "needs_escalation": False},
            {"region": "Pune", "crime_type": "Cybercrime", "zone": "High", "time_of_day": "PM", "needs_escalation": True},
            {"region": "Nagpur", "crime_type": "Assault", "zone": "High", "time_of_day": "PM", "needs_escalation": True},
            {"region": "Bangalore", "crime_type": "Fraud", "zone": "Medium", "time_of_day": "AM", "needs_escalation": False},
            {"region": "Mysore", "crime_type": "Robbery", "zone": "High", "time_of_day": "Night", "needs_escalation": True},
        ]

    def _observation(self) -> Observation:
        sample = self.dataset[self.current_index]
        crime_stats: Dict[str, int] = {}
        for row in self.dataset:
            crime_stats[row["crime_type"]] = crime_stats.get(row["crime_type"], 0) + 1
        return Observation(
            current_reports=[sample],
            selected_region=sample["region"],
            crime_stats=crime_stats,
            time_of_day=sample["time_of_day"],
        )

    def reset(self) -> Observation:
        # Reset to the dataset used for the current training/inference run.
        self.dataset = self._provided_dataset if self._provided_dataset is not None else self._seed_data()
        self.current_index = 0
        self.steps = 0
        self.loop_penalty_window.clear()
        return self._observation()

    def set_dataset(self, dataset: List[Dict]) -> None:
        # Allows callers to inject their own training data.
        self._provided_dataset = dataset
        self.dataset = dataset
        self.current_index = 0
        self.steps = 0
        self.loop_penalty_window.clear()

    def _reward_task(self, action: Action, sample: Dict, task: TaskSpec) -> Reward:
        accuracy = 0.0
        progress = 0.0
        penalty = 0.0

        if action.ignore_case:
            penalty -= 2.0

        signature = (action.classify_crime, action.assign_zone, action.escalate_case, action.ignore_case)
        self.loop_penalty_window.append(signature)
        if len(self.loop_penalty_window) > 4:
            self.loop_penalty_window.pop(0)
        if len(self.loop_penalty_window) == 4 and len(set(self.loop_penalty_window)) == 1:
            penalty -= 0.5

        if task.difficulty == "easy":
            if action.classify_crime == sample["crime_type"]:
                accuracy += 1.0
                progress += 1.0
            else:
                penalty -= 1.0
        elif task.difficulty == "medium":
            if action.assign_zone == sample["zone"]:
                accuracy += 1.0
                progress += 1.0
            elif action.assign_zone in ["Medium", "High"] and sample["zone"] in ["Medium", "High"]:
                accuracy += 0.5
                progress += 0.5
            else:
                penalty -= 1.0
        else:
            if action.classify_crime == sample["crime_type"]:
                accuracy += 1.0
            else:
                penalty -= 1.0

            if action.assign_zone == sample["zone"]:
                accuracy += 1.0
            elif action.assign_zone in ["Medium", "High"] and sample["zone"] in ["Medium", "High"]:
                accuracy += 0.5
            else:
                penalty -= 1.0

            if action.escalate_case == sample["needs_escalation"]:
                progress += 1.0
            else:
                penalty -= 1.0

        return Reward(accuracy_score=accuracy, penalty=penalty, progress_score=progress)

    def step(self, action_dict: Dict):
        self.steps += 1
        try:
            action = Action(**action_dict)
        except Exception as exc:
            observation = self._observation()
            return observation, -2.0, False, {"error": f"invalid action: {exc}"}

        sample = self.dataset[self.current_index]
        task = self.tasks[min(self.current_index % len(self.tasks), len(self.tasks) - 1)]
        reward_obj = self._reward_task(action, sample, task)
        reward = reward_obj.accuracy_score + reward_obj.progress_score + reward_obj.penalty

        self.current_index += 1
        done = self.current_index >= len(self.dataset) or self.steps >= self.max_steps
        if done:
            observation = Observation(current_reports=[], selected_region="N/A", crime_stats={}, time_of_day="N/A")
        else:
            observation = self._observation()

        return observation, reward, done, {"task": task.name, "reward_breakdown": reward_obj.model_dump()}

    def state(self) -> Dict:
        return {
            "current_index": self.current_index,
            "steps": self.steps,
            "remaining": max(len(self.dataset) - self.current_index, 0),
            "active_observation": self._observation().model_dump() if self.current_index < len(self.dataset) else None,
        }
