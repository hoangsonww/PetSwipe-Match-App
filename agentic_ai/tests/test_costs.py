"""
Cost tracking tests.
"""

from agentic_ai.utils.costs import CostTracker


def test_cost_tracker_summary():
    config = {
        "costs": {
            "enabled": True,
            "models": {"gpt-4o-mini": {"input_per_1k": 1.0, "output_per_1k": 2.0}},
        }
    }
    tracker = CostTracker(config)
    tracker.record(
        model="gpt-4o-mini",
        prompt_tokens=1000,
        completion_tokens=500,
        total_tokens=1500,
    )

    summary = tracker.summary()
    assert summary["totals"]["cost_usd"] == 2.0
    assert summary["totals"]["total_tokens"] == 1500


def test_cost_tracker_cached_tokens():
    config = {
        "costs": {
            "enabled": True,
            "models": {
                "gpt-4o-mini": {
                    "input_per_1k": 1.0,
                    "cached_input_per_1k": 0.5,
                    "output_per_1k": 2.0,
                }
            },
        }
    }
    tracker = CostTracker(config)
    tracker.record(
        model="gpt-4o-mini",
        prompt_tokens=1000,
        completion_tokens=0,
        total_tokens=1000,
        metadata={"cached_tokens": 200},
    )
    summary = tracker.summary()
    assert summary["totals"]["cost_usd"] == 0.9


def test_cost_tracker_tier_selection():
    config = {
        "costs": {
            "enabled": True,
            "models": {
                "gemini-3-pro-preview": {
                    "tiers": [
                        {"max_prompt_tokens": 200000, "input_per_1k": 0.001, "output_per_1k": 0.002},
                        {"min_prompt_tokens": 200001, "input_per_1k": 0.003, "output_per_1k": 0.004},
                    ]
                }
            },
        }
    }
    tracker = CostTracker(config)
    entry = tracker.record(
        model="gemini-3-pro-preview",
        prompt_tokens=250000,
        completion_tokens=0,
        total_tokens=250000,
    )
    assert entry["cost_usd"] == 0.75


def test_cost_tracker_unit_cost():
    config = {
        "costs": {
            "enabled": True,
            "models": {
                "sora-2": {"unit_label": "second", "unit_cost": 0.1},
            },
        }
    }
    tracker = CostTracker(config)
    entry = tracker.record(
        model="sora-2",
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        metadata={"unit_count": 12},
    )
    assert entry["cost_usd"] == 1.2
