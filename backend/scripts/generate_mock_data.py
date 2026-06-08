import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
import random
import math
from clickhouse_driver import Client
from app.config import settings
from app.db.init_clickhouse import init_clickhouse

SHANGHAI = (31.2304, 121.4737)
LOS_ANGELES = (33.7405, -118.2696)
SINGAPORE = (1.3521, 103.8198)
ROTTERDAM = (51.9244, 4.4777)

CONTAINERS = [
    {"id": "CONT-SEA-001", "cargo": "冻虾", "origin": SHANGHAI, "dest": LOS_ANGELES, "customer": "OceanFresh Co."},
    {"id": "CONT-SEA-002", "cargo": "三文鱼", "origin": SHANGHAI, "dest": LOS_ANGELES, "customer": "PacificSeafood Ltd."},
    {"id": "CONT-SEA-003", "cargo": "牛肉", "origin": SHANGHAI, "dest": ROTTERDAM, "customer": "MeatGlobal Inc."},
    {"id": "CONT-SEA-004", "cargo": "冰淇淋", "origin": SHANGHAI, "dest": SINGAPORE, "customer": "SweetCargo Pte."},
    {"id": "CONT-SEA-005", "cargo": "疫苗", "origin": SHANGHAI, "dest": SINGAPORE, "customer": "BioPharma Asia"},
]


def haversine_route(lat1, lon1, lat2, lon2, num_points=200):
    points = []
    for i in range(num_points + 1):
        ratio = i / num_points
        lat = lat1 + (lat2 - lat1) * ratio + math.sin(ratio * math.pi) * 5
        lon = lon1 + (lon2 - lon1) * ratio
        points.append((lat, lon))
    return points


def simulate_sensor_data(container_id, origin, dest, start_time, total_hours=240, interval_minutes=30):
    num_points = total_hours * 60 // interval_minutes
    route = haversine_route(origin[0], origin[1], dest[0], dest[1], num_points)

    data = []
    base_temp = -18.0
    base_humidity = 65.0

    has_anomaly = True
    anomaly_start_idx = num_points // 3
    anomaly_duration = num_points // 6

    for i in range(num_points):
        ts = start_time + timedelta(minutes=i * interval_minutes)
        lat, lon = route[i]

        hour_of_day = ts.hour
        solar_intensity = max(0, 800 * math.sin(math.pi * (hour_of_day - 6) / 12) if 6 <= hour_of_day <= 18 else 0)
        solar_intensity += random.uniform(-50, 50)

        temp_variation = random.uniform(-0.5, 0.5)
        temp = base_temp + temp_variation
        compressor_status = True

        if has_anomaly and anomaly_start_idx <= i < anomaly_start_idx + anomaly_duration:
            progress = (i - anomaly_start_idx) / anomaly_duration
            if progress < 0.3:
                compressor_status = False
                temp += progress * 15 / 0.3
            elif progress < 0.7:
                compressor_status = True if random.random() > 0.6 else False
                temp += 15 + random.uniform(-2, 2)
            else:
                compressor_status = True
                temp += 15 * (1 - (progress - 0.7) / 0.3)

            if solar_intensity > 400:
                temp += (solar_intensity - 400) / 200

        humidity = base_humidity + random.uniform(-3, 3)
        if temp > -10:
            humidity += (temp + 10) * 0.5

        data.append({
            "container_id": container_id,
            "timestamp": ts,
            "temperature": round(temp, 2),
            "humidity": round(humidity, 1),
            "latitude": round(lat, 4),
            "longitude": round(lon, 4),
            "compressor_status": 1 if compressor_status else 0,
            "solar_intensity": round(max(0, solar_intensity), 1),
        })

    return data


def generate_anomaly_events(container_data, container_id):
    events = []
    in_anomaly = False
    anomaly_start = None
    max_temp = -50
    event_id = 1

    for point in container_data:
        temp = point["temperature"]
        ts = point["timestamp"]

        if temp > -10 and not in_anomaly:
            in_anomaly = True
            anomaly_start = ts
            max_temp = temp
        elif temp <= -12 and in_anomaly:
            if max_temp > -5:
                severity = "critical" if max_temp > 0 else "high"
                events.append({
                    "id": event_id,
                    "container_id": container_id,
                    "start_time": anomaly_start,
                    "end_time": ts,
                    "max_temperature": round(max_temp, 2),
                    "severity": severity,
                    "status": "resolved",
                })
                event_id += 1
            in_anomaly = False
            max_temp = -50
        elif in_anomaly:
            max_temp = max(max_temp, temp)

    if in_anomaly and max_temp > -5:
        severity = "critical" if max_temp > 0 else "high"
        events.append({
            "id": event_id,
            "container_id": container_id,
            "start_time": anomaly_start,
            "end_time": container_data[-1]["timestamp"],
            "max_temperature": round(max_temp, 2),
            "severity": severity,
            "status": "ongoing",
        })

    return events


def insert_data_to_clickhouse():
    client = Client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        user=settings.clickhouse_user,
        password=settings.clickhouse_password,
    )

    init_clickhouse(client)

    start_time = datetime.now() - timedelta(days=7)

    all_sensor_data = []
    all_anomaly_events = []

    for container in CONTAINERS:
        print(f"Generating data for {container['id']}...")
        sensor_data = simulate_sensor_data(
            container["id"],
            container["origin"],
            container["dest"],
            start_time,
        )
        all_sensor_data.extend(sensor_data)

        anomaly_events = generate_anomaly_events(sensor_data, container["id"])
        all_anomaly_events.extend(anomaly_events)
        print(f"  Found {len(anomaly_events)} anomaly events")

    print(f"Inserting {len(all_sensor_data)} sensor data points...")
    client.execute(
        "INSERT INTO sensor_logs (container_id, timestamp, temperature, humidity, latitude, longitude, compressor_status, solar_intensity) VALUES",
        all_sensor_data,
    )

    if all_anomaly_events:
        print(f"Inserting {len(all_anomaly_events)} anomaly events...")
        client.execute(
            "INSERT INTO anomaly_events (id, container_id, start_time, end_time, max_temperature, severity, status) VALUES",
            all_anomaly_events,
        )

    print("Done!")


if __name__ == "__main__":
    insert_data_to_clickhouse()
