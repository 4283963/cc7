SEA_AREAS = [
    {
        "name": "东海",
        "lat_range": (23.0, 33.0),
        "lon_range": (117.0, 131.0),
    },
    {
        "name": "南海",
        "lat_range": (3.0, 23.0),
        "lon_range": (105.0, 120.0),
    },
    {
        "name": "黄海",
        "lat_range": (32.0, 39.0),
        "lon_range": (119.0, 126.0),
    },
    {
        "name": "日本海",
        "lat_range": (37.0, 48.0),
        "lon_range": (130.0, 140.0),
    },
    {
        "name": "马六甲海峡",
        "lat_range": (1.0, 6.0),
        "lon_range": (95.0, 105.0),
    },
    {
        "name": "印度洋北部",
        "lat_range": (-10.0, 25.0),
        "lon_range": (55.0, 95.0),
    },
    {
        "name": "太平洋中部",
        "lat_range": (-10.0, 30.0),
        "lon_range": (-170.0, -120.0),
    },
    {
        "name": "大西洋西部",
        "lat_range": (10.0, 45.0),
        "lon_range": (-80.0, -50.0),
    },
    {
        "name": "苏伊士运河附近",
        "lat_range": (27.0, 33.0),
        "lon_range": (30.0, 35.0),
    },
    {
        "name": "地中海",
        "lat_range": (30.0, 45.0),
        "lon_range": (-5.0, 36.0),
    },
]


def get_sea_area(lat: float, lon: float) -> str:
    for area in SEA_AREAS:
        lat_min, lat_max = area["lat_range"]
        lon_min, lon_max = area["lon_range"]
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return area["name"]
    return "公海"
