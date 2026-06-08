import * as echarts from 'echarts'

let worldMapRegistered = false

export async function registerWorldMap(): Promise<boolean> {
  if (worldMapRegistered) return true

  try {
    const response = await fetch(
      'https://geo.datav.aliyun.com/areas_v3/bound/world.json'
    )
    if (response.ok) {
      const geoJson = await response.json()
      echarts.registerMap('world', geoJson as any)
      worldMapRegistered = true
      return true
    }
  } catch (e) {
    console.warn('Failed to load world map from CDN, using fallback')
  }

  const fallbackGeoJson = generateFallbackWorldMap()
  echarts.registerMap('world', fallbackGeoJson as any)
  worldMapRegistered = true
  return true
}

function generateFallbackWorldMap() {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature',
        properties: { name: 'China', adcode: 100000 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [73.5, 18.0],
              [135.0, 18.0],
              [135.0, 53.5],
              [73.5, 53.5],
              [73.5, 18.0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'USA', adcode: 840 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-125.0, 24.5],
              [-66.9, 24.5],
              [-66.9, 49.4],
              [-125.0, 49.4],
              [-125.0, 24.5],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Europe', adcode: 150 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-10.0, 35.0],
              [40.0, 35.0],
              [40.0, 71.0],
              [-10.0, 71.0],
              [-10.0, 35.0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Southeast Asia', adcode: 35 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [90.0, -10.0],
              [140.0, -10.0],
              [140.0, 28.0],
              [90.0, 28.0],
              [90.0, -10.0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Indian Ocean', adcode: 356 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [45.0, -15.0],
              [100.0, -15.0],
              [100.0, 30.0],
              [45.0, 30.0],
              [45.0, -15.0],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { name: 'Pacific Ocean', adcode: 999 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-180.0, -50.0],
              [-70.0, -50.0],
              [-70.0, 60.0],
              [-180.0, 60.0],
              [-180.0, -50.0],
            ],
          ],
        },
      },
    ],
  }
}
