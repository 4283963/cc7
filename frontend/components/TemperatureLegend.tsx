import { tempToColor, formatTemperature } from '@/lib/utils'

const tempRange = [-20, -18, -15, -12, -8, -3, 0, 5]

export default function TemperatureLegend() {
  return (
    <div className="card-glass p-3">
      <div className="text-xs text-gray-400 mb-2">温度色阶</div>
      <div className="flex items-center gap-1">
        {tempRange.map((temp, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div
              className="w-6 h-4 rounded-sm"
              style={{ backgroundColor: tempToColor(temp) }}
            ></div>
            <span className="text-[10px] text-gray-500 mt-1">{temp}°</span>
          </div>
        ))}
      </div>
    </div>
  )
}
