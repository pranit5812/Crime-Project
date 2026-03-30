from __future__ import annotations

import random
from typing import Dict, List, Optional, Tuple

from .environment import CrimeOpenEnv
from .models import Action, Observation, Reward


CLASSIFY_CRIME = ["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"]
ASSIGN_ZONE = ["Low", "Medium", "High"]
ESCALATE_CASE = [False, True]
IGNORE_CASE = [False, True]


ALL_ACTIONS: List[Tuple[str, str, bool, bool]] = [
    (c, z, e, i) for c in CLASSIFY_CRIME for z in ASSIGN_ZONE for e in ESCALATE_CASE for i in IGNORE_CASE
]


def _state_key(obs: Observation) -> Tuple[str, str, str]:
    # Dominant crime type is used for discretization so the policy generalizes to similar patterns.
    dominant = ""
    if obs.crime_stats:
        dominant = max(obs.crime_stats.items(), key=lambda kv: kv[1])[0]
    return (obs.selected_region, obs.time_of_day, dominant)


def choose_best_action(q_table: Dict[Tuple[Tuple[str, str, str], Tuple[str, str, bool, bool]], float], state_key, epsilon: float = 0.0):
    if random.random() < epsilon:
        return random.choice(ALL_ACTIONS)

    best_a = None
    best_v = float("-inf")
    for a in ALL_ACTIONS:
        v = q_table.get((state_key, a), 0.0)
        if v > best_v:
            best_v = v
            best_a = a
    return best_a or ALL_ACTIONS[0]


def train_q_policy(
    env: CrimeOpenEnv,
    episodes: int = 120,
    alpha: float = 0.35,
    gamma: float = 0.9,
    epsilon: float = 0.25,
    epsilon_decay: float = 0.985,
    seed: Optional[int] = 42,
) -> Dict[Tuple[Tuple[str, str, str], Tuple[str, str, bool, bool]], float]:
    """
    Trains a tabular Q-policy using the OpenEnv environment reward signal.
    This does not update a neural model; it learns a decision policy mapping state->best action.
    """

    if seed is not None:
        random.seed(seed)

    q_table: Dict[Tuple[Tuple[str, str, str], Tuple[str, str, bool, bool]], float] = {}

    for _ep in range(episodes):
        obs = env.reset()
        done = False

        # Q-learning loop: sample actions, observe reward, update q-values.
        while not done:
            s_key = _state_key(obs)
            action_tuple = choose_best_action(q_table, s_key, epsilon=epsilon)
            action_dict = {
                "classify_crime": action_tuple[0],
                "assign_zone": action_tuple[1],
                "escalate_case": action_tuple[2],
                "ignore_case": action_tuple[3],
            }

            obs2, reward, done, _info = env.step(action_dict)
            r = float(reward)

            s2_key = _state_key(obs2) if not done else None

            max_next = 0.0
            if s2_key is not None:
                max_next = max(q_table.get((s2_key, a), 0.0) for a in ALL_ACTIONS)

            current = q_table.get((s_key, action_tuple), 0.0)
            q_table[(s_key, action_tuple)] = current + alpha * (r + gamma * max_next - current)

            obs = obs2

        epsilon *= epsilon_decay

    return q_table


def policy_predict_assign_zone(q_table: Dict[Tuple[Tuple[str, str, str], Tuple[str, str, bool, bool]], float], obs: Observation) -> str:
    s_key = _state_key(obs)
    best_a = choose_best_action(q_table, s_key, epsilon=0.0)
    # assign_zone is the 2nd element in action tuple.
    return best_a[1]

