from datetime import datetime, timedelta
import math
import random
from typing import List, Dict, Any

MOCK_CONTAINERS = [
    {"id": "CONT-SEA-001", "cargo": "冻虾", "customer": "OceanFresh Co.", "origin": "上海", "destination": "洛杉矶"},
    {"id": "CONT-SEA-002", "cargo": "三文鱼", "customer": "PacificSeafood Ltd.", "origin": "上海", "destination": "洛杉矶"},
    {"id": "CONT-SEA-003", "cargo": "牛肉", "customer": "MeatGlobal Inc.", "origin": "上海", "destination": "鹿特丹"},
    {"id": "CONT-SEA-004", "cargo": "冰淇淋", "customer": "SweetCargo Pte.", "origin": "上海", "destination": "新加坡"},
    {"id": "CONT-SEA-005", "cargo": "疫苗", "customer": "BioPharma Asia", "origin": "上海", "destination": "新加坡"},
]

ROUTES = {
    "洛杉矶": [(31.2304, 121.4737), (30.0, 125.0), (35.0, 140.0), (38.0, 160.0), (35.0, -170.0), (30.0, -140.0), (33.7405, -118.2696)],
    "鹿特丹": [(31.2304, 121.4737), (25.0, 118.0), (15.0, 110.0), (5.0, 105.0), (3.0, 100.0), (6.0, 80.0), (12.0, 60.0), (20.0, 45.0), (30.0, 32.0), (38.0, 15.0), (45.0, 8.0), (51.9244, 4.4777)],
    "新加坡": [(31.2304, 121.4737), (28.0, 120.0), (22.0, 115.0), (15.0, 110.0), (8.0, 105.0), (1.3521, 103.8198)],
}

SEA_AREAS_MAP = {
    (25, 35, 115, 130): "东海",
    (10, 25, 105, 120): "南海",
    (1, 8, 95, 105): "马六甲海峡",
    (0, 15, 55, 95): "印度洋北部",
    (28, 35, 28, 36): "苏伊士运河附近",
    (30, 45, -5, 30): "地中海",
    (35, 45, 0, 10): "大西洋东部",
    (30, 40, -130, -110): "太平洋东部",
}


def _get_sea_area(lat: float, lon: float) -> str:
    for (lat_min, lat_max, lon_min, lon_max), name in SEA_AREAS_MAP.items():
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return name
    return "公海"


def _interpolate_route(waypoints, num_points=300):
    points = []
    total_segments = len(waypoints) - 1
    points_per_segment = num_points // total_segments

    for i in range(total_segments):
        lat1, lon1 = waypoints[i]
        lat2, lon2 = waypoints[i + 1]
        for j in range(points_per_segment):
            ratio = j / points_per_segment
            lat = lat1 + (lat2 - lat1) * ratio
            lon = lon1 + (lon2 - lon1) * ratio
            if 0 < i < total_segments - 1:
                lat += math.sin(ratio * math.pi) * 2
            points.append((lat, lon))

    return points


def generate_mock_trajectory(container_id: str, hours: int = 168) -> List[Dict[str, Any]]:
    container_info = next((c for c in MOCK_CONTAINERS if c["id"] == container_id), None)
    if not container_info:
        return []

    waypoints = ROUTES.get(container_info["destination"], ROUTES["洛杉矶"])
    route_points = _interpolate_route(waypoints, hours * 2)

    start_time = datetime.now() - timedelta(hours=hours)
    trajectory = []
    base_temp = -18.0
    base_humidity = 65.0

    anomaly_start_hour = hours // 3
    anomaly_duration_hours = 48

    for i, (lat, lon) in enumerate(route_points):
        ts = start_time + timedelta(minutes=i * 30)
        hour_of_day = ts.hour

        solar_intensity = max(0, 800 * math.sin(math.pi * (hour_of_day - 6) / 12) if 6 <= hour_of_day <= 18 else 0)
        solar_intensity += random.uniform(-50, 50)

        temp = base_temp + random.uniform(-0.3, 0.3)
        humidity = base_humidity + random.uniform(-2, 2)
        compressor_status = True

        current_hour = i / 2
        if anomaly_start_hour <= current_hour < anomaly_start_hour + anomaly_duration_hours:
            progress = (current_hour - anomaly_start_hour) / anomaly_duration_hours
            if progress < 0.3:
                compressor_status = False
                temp += progress * 18 / 0.3
            elif progress < 0.7:
                compressor_status = random.random() > 0.7
                temp += 18 + random.uniform(-2, 3)
            else:
                compressor_status = True
                temp += 18 * (1 - (progress - 0.7) / 0.3)

            if solar_intensity > 500:
                temp += (solar_intensity - 500) / 150

        if temp > -10:
            humidity += (temp + 10) * 0.5

        trajectory.append({
            "timestamp": ts.isoformat(),
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "temperature": round(temp, 2),
            "humidity": round(humidity, 1),
            "compressor_status": compressor_status,
            "solar_intensity": round(max(0, solar_intensity), 1),
        })

    return trajectory


def get_mock_active_containers() -> List[str]:
    return [c["id"] for c in MOCK_CONTAINERS]


def get_mock_anomaly_list() -> List[Dict[str, Any]]:
    return [
        {
            "id": 1,
            "container_id": "CONT-SEA-001",
            "start_time": (datetime.now() - timedelta(days=4)).isoformat(),
            "end_time": (datetime.now() - timedelta(days=3)).isoformat(),
            "max_temperature": 2.5,
            "severity": "critical",
            "status": "resolved",
            "cargo": "冻虾",
            "customer": "OceanFresh Co.",
        },
        {
            "id": 2,
            "container_id": "CONT-SEA-002",
            "start_time": (datetime.now() - timedelta(days=2)).isoformat(),
            "end_time": (datetime.now() - timedelta(days=1, hours=12)).isoformat(),
            "max_temperature": -3.2,
            "severity": "high",
            "status": "resolved",
            "cargo": "三文鱼",
            "customer": "PacificSeafood Ltd.",
        },
        {
            "id": 3,
            "container_id": "CONT-SEA-003",
            "start_time": (datetime.now() - timedelta(hours=12)).isoformat(),
            "end_time": None,
            "max_temperature": -5.8,
            "severity": "high",
            "status": "ongoing",
            "cargo": "牛肉",
            "customer": "MeatGlobal Inc.",
        },
    ]


def get_mock_attribution(container_id: str, anomaly_id: int) -> Dict[str, Any]:
    trajectory = generate_mock_trajectory(container_id, hours=120)

    anomaly_idx_start = len(trajectory) // 3
    anomaly_idx_end = anomaly_idx_start + len(trajectory) // 4

    anomaly_segment = trajectory[anomaly_idx_start:anomaly_idx_end]

    segments = []
    segment_size = len(anomaly_segment) // 5

    for i in range(5):
        seg_start = i * segment_size
        seg_end = min((i + 1) * segment_size, len(anomaly_segment))
        seg = anomaly_segment[seg_start:seg_end]

        if not seg:
            continue

        temps = [p["temperature"] for p in seg]
        solars = [p["solar_intensity"] for p in seg]
        compressor_off_count = sum(1 for p in seg if not p["compressor_status"])

        avg_temp = sum(temps) / len(temps)
        temp_rise = temps[-1] - temps[0]
        avg_solar = sum(solars) / len(solars)
        compressor_off_ratio = compressor_off_count / len(seg)

        mid_lat = (seg[0]["latitude"] + seg[-1]["latitude"]) / 2
        mid_lon = (seg[0]["longitude"] + seg[-1]["longitude"]) / 2
        sea_area = _get_sea_area(mid_lat, mid_lon)

        if compressor_off_ratio > 0.5:
            cause_type = "compressor_failure"
            confidence = 0.85
        elif avg_solar > 600:
            cause_type = "high_solar_radiation"
            confidence = 0.78
        else:
            cause_type = "combined"
            confidence = 0.65

        segments.append({
            "time_start": seg[0]["timestamp"],
            "time_end": seg[-1]["timestamp"],
            "lat_start": seg[0]["latitude"],
            "lon_start": seg[0]["longitude"],
            "lat_end": seg[-1]["latitude"],
            "lon_end": seg[-1]["longitude"],
            "avg_temperature": round(avg_temp, 2),
            "temp_rise": round(temp_rise, 2),
            "avg_solar_intensity": round(avg_solar, 1),
            "compressor_off_ratio": round(compressor_off_ratio, 2),
            "sea_area": sea_area,
            "cause_type": cause_type,
            "confidence": round(confidence, 2),
        })

    return {
        "anomaly_id": anomaly_id,
        "container_id": container_id,
        "total_segments": len(segments),
        "primary_cause": "compressor_failure",
        "primary_sea_area": "东海",
        "segments": segments,
    }


def get_mock_compensation_orders() -> List[Dict[str, Any]]:
    return [
        {
            "id": 1,
            "order_no": "COMP-20240615-A001",
            "container_id": "CONT-SEA-001",
            "anomaly_id": 1,
            "customer": "OceanFresh Co.",
            "cargo_type": "冻虾",
            "status": "pending",
            "amount": None,
            "remark": None,
            "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=3)).isoformat(),
        },
        {
            "id": 2,
            "order_no": "COMP-20240616-A002",
            "container_id": "CONT-SEA-002",
            "anomaly_id": 2,
            "customer": "PacificSeafood Ltd.",
            "cargo_type": "三文鱼",
            "status": "processing",
            "amount": 25000.0,
            "remark": "制冷机故障导致部分货物变质",
            "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=1)).isoformat(),
        },
        {
            "id": 3,
            "order_no": "COMP-20240617-A003",
            "container_id": "CONT-SEA-003",
            "anomaly_id": 3,
            "customer": "MeatGlobal Inc.",
            "cargo_type": "牛肉",
            "status": "approved",
            "amount": 58000.0,
            "remark": "高温导致约30%货物损坏，已核实",
            "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
            "updated_at": (datetime.now() - timedelta(hours=6)).isoformat(),
        },
    ]


def get_container_info(container_id: str) -> Dict[str, Any]:
    container = next((c for c in MOCK_CONTAINERS if c["id"] == container_id), None)
    if not container:
        return None

    trajectory = generate_mock_trajectory(container_id, hours=168)
    current = trajectory[-1]

    return {
        **container,
        "current_position": {
            "latitude": current["latitude"],
            "longitude": current["longitude"],
            "temperature": current["temperature"],
            "humidity": current["humidity"],
            "timestamp": current["timestamp"],
        },
        "status": "in_transit",
    }
