"""Example: generate a PPTX with Anthropic code execution skill.

Usage:
  export ANTHROPIC_API_KEY=...
  python scripts/anthropic_pptx_example.py
"""

from anthropic import Anthropic


def main() -> None:
    client = Anthropic()

    response = client.beta.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        betas=["code-execution-2025-08-25", "skills-2025-10-02"],
        container={
            "skills": [{"type": "anthropic", "skill_id": "pptx", "version": "latest"}],
        },
        messages=[
            {"role": "user", "content": "Create a presentation about renewable energy"},
        ],
        tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
    )

    print(response)


if __name__ == "__main__":
    main()
