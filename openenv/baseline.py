import ast
import os
from typing import Dict

from dotenv import load_dotenv
from openai import OpenAI

from openenv.environment import CrimeOpenEnv

load_dotenv()

SYSTEM_PROMPT = """You are a policy agent for crime report triage.
Respond with strict JSON having keys: classify_crime, assign_zone, escalate_case, ignore_case.
classify_crime must be one of Theft, Robbery, Assault, Cybercrime, Fraud.
assign_zone must be one of Low, Medium, High.
"""


def infer_action(client: OpenAI, observation: Dict) -> Dict:
    prompt = f"Observation: {observation}\nChoose the best action."
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    return ast.literal_eval(response.output_text)


def run_baseline():
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY missing")

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    env = CrimeOpenEnv()
    observation = env.reset()

    total_score = 0.0
    done = False
    step_count = 0

    while not done:
        action = infer_action(client, observation.model_dump())
        observation, reward, done, info = env.step(action)
        total_score += reward
        step_count += 1
        print(f"step={step_count} reward={reward:.2f} info={info}")

    print("=" * 50)
    print(f"Baseline total score: {total_score:.2f}")


if __name__ == "__main__":
    run_baseline()
