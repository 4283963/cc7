from datetime import datetime
from typing import List, Tuple
import math
from ..db.clickhouse import get_clickhouse
from ..schemas.container import AttributionResult, AttributionSegment
from ..utils.sea_areas import get_sea_area


SOLAR_INTENSITY_HIGH_THRESHOLD = 600.0
COMPRESSOR_OFF_RATIO_THRESHOLD = 0.5
TEMP_RISE_THRESHOLD = 2.0


def get_anomaly_trace(container_id: str, anomaly_id: int) -> Tuple[datetime, datetime]:
    client = get_clickhouse()
    query = """
        SELECT start_time, end_time
        FROM anomaly_events
        WHERE container_id = %(container_id)s AND id = %(anomaly_id)s
        LIMIT 1
    """
    result = client.execute(query, {"container_id": container_id, "anomaly_id": anomaly_id})
    if result:
        return result[0][0], result[0][1]
    return None, None


def analyze_temperature_attribution(
    container_id: str,
    anomaly_id: int,
) -> AttributionResult:
    client = get_clickhouse()

    start_time, end_time = get_anomaly_trace(container_id, anomaly_id)
    if not start_time or not end_time:
        raise ValueError("Anomaly event not found")

    query = """
        SELECT
            timestamp,
            temperature,
            humidity,
            latitude,
            longitude,
            compressor_status,
            solar_intensity
        FROM sensor_logs
        WHERE container_id = %(container_id)s
          AND timestamp >= %(start_time)s
          AND timestamp <= %(end_time)s
        ORDER BY timestamp ASC
    """
    rows = client.execute(
        query,
        {
            "container_id": container_id,
            "start_time": start_time,
            "end_time": end_time,
        },
    )

    if not rows:
        return AttributionResult(
            anomaly_id=anomaly_id,
            container_id=container_id,
            total_segments=0,
            primary_cause="unknown",
            primary_sea_area="unknown",
            segments=[],
        )

    segments = _segment_and_analyze(rows)

    primary_cause = _determine_primary_cause(segments)
    primary_sea_area = _determine_primary_sea_area(segments)

    return AttributionResult(
        anomaly_id=anomaly_id,
        container_id=container_id,
        total_segments=len(segments),
        primary_cause=primary_cause,
        primary_sea_area=primary_sea_area,
        segments=segments,
    )


def _segment_and_analyze(rows: List) -> List[AttributionSegment]:
    segments = []
    window_size = 10
    step = 5

    for i in range(0, len(rows) - window_size + 1, step):
        window = rows[i : i + window_size]

        first = window[0]
        last = window[-1]

        temps = [r[1] for r in window]
        avg_temp = sum(temps) / len(temps)
        temp_rise = last[1] - first[1]

        compressor_statuses = [r[5] for r in window]
        compressor_off_count = sum(1 for s in compressor_statuses if s == 0)
        compressor_off_ratio = compressor_off_count / len(compressor_statuses)

        solar_values = [r[6] for r in window if r[6] is not None]
        avg_solar = sum(solar_values) / len(solar_values) if solar_values else 0.0

        lat_start, lon_start = first[3], first[4]
        lat_end, lon_end = last[3], last[4]
        sea_area = get_sea_area((lat_start + lat_end) / 2, (lon_start + lon_end) / 2)

        cause_type, confidence = _classify_cause(
            temp_rise, avg_solar, compressor_off_ratio
        )

        segment = AttributionSegment(
            time_start=first[0],
            time_end=last[0],
            lat_start=lat_start,
            lon_start=lon_start,
            lat_end=lat_end,
            lon_end=lon_end,
            avg_temperature=avg_temp,
            temp_rise=temp_rise,
            avg_solar_intensity=avg_solar,
            compressor_off_ratio=compressor_off_ratio,
            sea_area=sea_area,
            cause_type=cause_type,
            confidence=confidence,
        )
        segments.append(segment)

    return segments


def _classify_cause(
    temp_rise: float,
    avg_solar: float,
    compressor_off_ratio: float,
) -> Tuple[str, float]:
    if temp_rise <= 0:
        return "normal", 0.9

    compressor_score = 0.0
    if compressor_off_ratio >= COMPRESSOR_OFF_RATIO_THRESHOLD:
        compressor_score = min(1.0, compressor_off_ratio * 1.5)

    solar_score = 0.0
    if avg_solar >= SOLAR_INTENSITY_HIGH_THRESHOLD:
        solar_score = min(1.0, (avg_solar - SOLAR_INTENSITY_HIGH_THRESHOLD) / 400 + 0.3)

    temp_score = min(1.0, temp_rise / TEMP_RISE_THRESHOLD)

    if compressor_score > solar_score and compressor_score > 0.3:
        confidence = 0.5 + 0.3 * compressor_score + 0.2 * temp_score
        return "compressor_failure", min(confidence, 0.98)
    elif solar_score > compressor_score and solar_score > 0.3:
        confidence = 0.5 + 0.3 * solar_score + 0.2 * temp_score
        return "high_solar_radiation", min(confidence, 0.98)
    elif temp_rise > TEMP_RISE_THRESHOLD:
        return "combined", 0.6
    else:
        return "other", 0.4


def _determine_primary_cause(segments: List[AttributionSegment]) -> str:
    cause_count = {}
    for seg in segments:
        if seg.temp_rise > 0:
            cause = seg.cause_type
            cause_count[cause] = cause_count.get(cause, 0) + seg.confidence

    if not cause_count:
        return "unknown"

    return max(cause_count, key=cause_count.get)


def _determine_primary_sea_area(segments: List[AttributionSegment]) -> str:
    area_count = {}
    for seg in segments:
        if seg.temp_rise > 0:
            area = seg.sea_area
            area_count[area] = area_count.get(area, 0) + seg.temp_rise

    if not area_count:
        return "unknown"

    return max(area_count, key=area_count.get)
