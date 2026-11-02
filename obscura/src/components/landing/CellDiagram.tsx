/**
 * A lecture-slide style animal cell, drawn in fixed colors like a real slide
 * (it stays a light slide in dark mode, as an uploaded one would). Label boxes
 * are placed over it in % of this 520×300 frame.
 */
export const CELL_W = 520
export const CELL_H = 300

export const CELL_LABELS = [
  { label: 'Nucleus', x: 2, y: 13.5, width: 23, height: 11.5, point: [218, 150] },
  { label: 'Mitochondrion', x: 75, y: 11.5, width: 23, height: 11.5, point: [352, 100] },
  { label: 'Golgi apparatus', x: 75, y: 78, width: 23, height: 11.5, point: [352, 196] },
  { label: 'Cell membrane', x: 2, y: 78, width: 23, height: 11.5, point: [98, 214] },
] as const

const STROKE = '#8A8F8C' // check-colors-allow: part of the slide image
const FILL = '#FBFAF6' // check-colors-allow
const TINT = '#E8EEEA' // check-colors-allow
const LEAD = '#5C6670' // check-colors-allow

export default function CellDiagram({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${CELL_W} ${CELL_H}`} className={className} role="img" aria-label="Diagram of an animal cell" xmlns="http://www.w3.org/2000/svg">
      <rect width={CELL_W} height={CELL_H} fill={FILL} />
      <path d="M262 34c86 0 166 38 170 112 4 80-74 124-168 124-98 0-180-36-182-114C80 80 168 34 262 34z" fill={TINT} stroke={STROKE} strokeWidth="2.2" />
      <g fill="none" stroke={STROKE} strokeWidth="1.6">
        <path d="M172 92c10-14 30-16 40-4s30 12 40 0" />
        <path d="M164 104c12-14 34-16 46-4s34 12 46-2" />
        <path d="M170 200c12 12 30 12 42 0s30-12 42 0" />
        <path d="M318 186c18-16 50-16 68 0" />
        <path d="M314 198c20-18 56-18 76 0" />
        <path d="M318 210c18-16 50-16 68 0" />
      </g>
      <circle cx="218" cy="150" r="44" fill={FILL} stroke={STROKE} strokeWidth="1.8" />
      <circle cx="228" cy="142" r="12" fill={STROKE} opacity=".55" />
      <g transform="rotate(-18 340 104)">
        <ellipse cx="340" cy="104" rx="42" ry="20" fill={FILL} stroke={STROKE} strokeWidth="1.8" />
        <path d="M306 104l8-12 8 24 8-24 8 24 8-24 8 24 8-24 8 12" fill="none" stroke={STROKE} strokeWidth="1.6" />
      </g>
      <circle cx="398" cy="186" r="5" fill={FILL} stroke={STROKE} strokeWidth="1.8" />
      <circle cx="402" cy="204" r="4" fill={FILL} stroke={STROKE} strokeWidth="1.8" />
      {[[150, 130], [286, 70], [292, 236], [140, 176], [372, 150], [256, 232]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.4" fill={STROKE} />
      ))}
      {CELL_LABELS.map((l) => {
        // Leader line from the structure to the near edge of its label box.
        const bx = ((l.x + (l.x < 50 ? l.width : 0)) / 100) * CELL_W
        const by = ((l.y + l.height / 2) / 100) * CELL_H
        return (
          <g key={l.label}>
            <line x1={l.point[0]} y1={l.point[1]} x2={bx} y2={by} stroke={LEAD} strokeWidth="1.2" />
            <circle cx={l.point[0]} cy={l.point[1]} r="3" fill={LEAD} />
          </g>
        )
      })}
    </svg>
  )
}

/** The diagram as a PNG data URL, so a saved sample can be stored like an upload. */
export async function cellDiagramDataUrl(svg: SVGSVGElement): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg)
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = CELL_W * 2
  canvas.height = CELL_H * 2
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
