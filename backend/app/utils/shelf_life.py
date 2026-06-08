from dataclasses import dataclass
from typing import List, Tuple
import math


@dataclass
class ProductShelfLifeParams:
    name: str
    base_shelf_life_hours: float
    reference_temp_c: float
    q10_factor: float
    min_safe_temp_c: float
    max_safe_temp_c: float


PRODUCT_PARAMS = {
    "冻虾": ProductShelfLifeParams(
        name="冻虾",
        base_shelf_life_hours=720,
        reference_temp_c=-18.0,
        q10_factor=3.5,
        min_safe_temp_c=-18.0,
        max_safe_temp_c=-12.0,
    ),
    "三文鱼": ProductShelfLifeParams(
        name="三文鱼",
        base_shelf_life_hours=480,
        reference_temp_c=-18.0,
        q10_factor=3.0,
        min_safe_temp_c=-18.0,
        max_safe_temp_c=-10.0,
    ),
    "牛肉": ProductShelfLifeParams(
        name="牛肉",
        base_shelf_life_hours=720,
        reference_temp_c=-18.0,
        q10_factor=2.8,
        min_safe_temp_c=-18.0,
        max_safe_temp_c=-10.0,
    ),
    "冰淇淋": ProductShelfLifeParams(
        name="冰淇淋",
        base_shelf_life_hours=1440,
        reference_temp_c=-18.0,
        q10_factor=4.0,
        min_safe_temp_c=-18.0,
        max_safe_temp_c=-15.0,
    ),
    "疫苗": ProductShelfLifeParams(
        name="疫苗",
        base_shelf_life_hours=2160,
        reference_temp_c=2.0,
        q10_factor=2.5,
        min_safe_temp_c=2.0,
        max_safe_temp_c=8.0,
    ),
    "默认": ProductShelfLifeParams(
        name="默认冷链货物",
        base_shelf_life_hours=720,
        reference_temp_c=-18.0,
        q10_factor=3.0,
        min_safe_temp_c=-18.0,
        max_safe_temp_c=-12.0,
    ),
}


def get_product_params(cargo_type: str) -> ProductShelfLifeParams:
    return PRODUCT_PARAMS.get(cargo_type, PRODUCT_PARAMS["默认"])


def arrhenius_rate(temp_c: float, reference_temp_c: float, q10_factor: float) -> float:
    return q10_factor ** ((temp_c - reference_temp_c) / 10.0)


def calculate_equivalent_aging(
    temperature_samples: List[Tuple[float, float]],
    cargo_type: str = "默认",
) -> dict:
    params = get_product_params(cargo_type)

    total_equivalent_hours = 0.0
    total_actual_hours = 0.0
    max_rate = 0.0
    max_temp = -100.0
    min_temp = 100.0
    avg_temp = 0.0
    weight_sum = 0.0

    rate_history = []

    for i, (temp_c, duration_hours) in enumerate(temperature_samples):
        rate = arrhenius_rate(temp_c, params.reference_temp_c, params.q10_factor)
        equivalent_hours = rate * duration_hours

        total_equivalent_hours += equivalent_hours
        total_actual_hours += duration_hours
        max_rate = max(max_rate, rate)
        max_temp = max(max_temp, temp_c)
        min_temp = min(min_temp, temp_c)
        avg_temp += temp_c * duration_hours
        weight_sum += duration_hours

        rate_history.append(
            {
                "segment_index": i,
                "temperature_c": round(temp_c, 2),
                "duration_hours": round(duration_hours, 2),
                "degradation_rate": round(rate, 3),
                "equivalent_hours": round(equivalent_hours, 2),
                "is_safe": temp_c <= params.max_safe_temp_c,
            }
        )

    avg_temp = avg_temp / weight_sum if weight_sum > 0 else 0

    remaining_hours = max(0, params.base_shelf_life_hours - total_equivalent_hours)
    remaining_ratio = remaining_hours / params.base_shelf_life_hours
    spoiled_ratio = 1.0 - remaining_ratio

    predicted_end_hours = None
    if total_equivalent_hours > 0 and total_actual_hours > 0:
        avg_rate = total_equivalent_hours / total_actual_hours
        if avg_rate > 0:
            predicted_end_hours = remaining_hours / avg_rate

    quality_level = "excellent"
    if remaining_ratio >= 0.9:
        quality_level = "excellent"
    elif remaining_ratio >= 0.7:
        quality_level = "good"
    elif remaining_ratio >= 0.5:
        quality_level = "fair"
    elif remaining_ratio >= 0.25:
        quality_level = "poor"
    else:
        quality_level = "critical"

    return {
        "product": params.name,
        "base_shelf_life_hours": params.base_shelf_life_hours,
        "reference_temp_c": params.reference_temp_c,
        "q10_factor": params.q10_factor,
        "total_actual_hours": round(total_actual_hours, 2),
        "total_equivalent_aging_hours": round(total_equivalent_hours, 2),
        "remaining_shelf_life_hours": round(remaining_hours, 2),
        "remaining_ratio": round(remaining_ratio, 4),
        "spoiled_ratio": round(spoiled_ratio, 4),
        "quality_level": quality_level,
        "average_temp_c": round(avg_temp, 2),
        "max_temp_c": round(max_temp, 2),
        "min_temp_c": round(min_temp, 2),
        "max_degradation_rate": round(max_rate, 3),
        "predicted_remaining_hours_at_current_rate": (
            round(predicted_end_hours, 1) if predicted_end_hours is not None else None
        ),
        "rate_history": rate_history,
    }


def predict_shelf_life_from_trajectory(
    trajectory_points: List[dict],
    cargo_type: str = "默认",
    lookback_hours: float = 48.0,
) -> dict:
    if len(trajectory_points) < 2:
        return calculate_equivalent_aging([(-18.0, lookback_hours)], cargo_type)

    sorted_points = sorted(trajectory_points, key=lambda p: p["timestamp"])

    if lookback_hours and lookback_hours > 0:
        from datetime import datetime

        latest_time = None
        for p in sorted_points:
            ts = p["timestamp"]
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if latest_time is None or ts > latest_time:
                latest_time = ts

        if latest_time:
            cutoff = latest_time.timestamp() - lookback_hours * 3600
            filtered = []
            for p in sorted_points:
                ts = p["timestamp"]
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if ts.timestamp() >= cutoff:
                    filtered.append(p)
            if len(filtered) >= 2:
                sorted_points = filtered

    temperature_samples = []
    for i in range(len(sorted_points) - 1):
        p1 = sorted_points[i]
        p2 = sorted_points[i + 1]

        t1 = p1["timestamp"]
        t2 = p2["timestamp"]
        if isinstance(t1, str):
            from datetime import datetime

            t1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))

        duration_hours = (t2 - t1).total_seconds() / 3600.0
        avg_temp = (p1["temperature"] + p2["temperature"]) / 2.0

        if duration_hours > 0:
            temperature_samples.append((avg_temp, duration_hours))

    if not temperature_samples:
        return calculate_equivalent_aging([(-18.0, lookback_hours)], cargo_type)

    return calculate_equivalent_aging(temperature_samples, cargo_type)
