import { ArrowLeft, ArrowRight, Compass, Footprints, MapPin, X } from 'lucide-react'
import type { Room, TourTarget } from './types'

interface Props {
  room: Room
  rooms: Room[]
  target: TourTarget
  onStop: (id: string | null) => void
  onRoom: (id: string) => void
  onExit: () => void
}

export default function TourHud({ room, rooms, target, onStop, onRoom, onExit }: Props) {
  const stops = room.tour ?? []
  const index = stops.findIndex(stop => stop.id === target.stopId)
  const current = stops[index]
  const previous = index > 0 ? stops[index - 1] : null
  const next = index < 0 ? stops[0] : stops[index + 1]
  const roomIndex = rooms.findIndex(item => item.id === room.id)
  return <div className="tour-hud" aria-label="展馆漫游导览">
    <div className="tour-heading">
      <span className="tour-gallery-number">{String(roomIndex + 1).padStart(2, '0')}</span>
      <div><span className="eyebrow">A WALK THROUGH YOUR COLLECTION</span><h1>{room.name}</h1><p>{room.subtitle}</p></div>
    </div>
    <div className="tour-top-actions">
      <label className="tour-room-picker"><Compass size={15}/><select aria-label="切换游览展馆" value={room.id} onChange={event => onRoom(event.target.value)}>{rooms.map((item, i) => <option key={item.id} value={item.id}>{String(i + 1).padStart(2, '0')} · {item.name}</option>)}</select></label>
      <button className="tour-exit" aria-label="退出漫游" onClick={onExit}><X size={16}/><span>返回布置</span><kbd>Esc</kbd></button>
    </div>
    <section className="tour-story" aria-label="当前导览介绍">
      <div className="tour-story-heading"><span><MapPin size={13}/>{current ? `导览 ${String(index + 1).padStart(2, '0')} / ${String(stops.length).padStart(2, '0')}` : '自由行走'}</span></div>
      <h2>{current?.title ?? '慢一点，发现下一件喜欢的藏品。'}</h2>
      <p>{current?.description ?? '沿着展架与收藏岛自由探索。点选导览位置，可以跳转到新的观察角度。'}</p>
      {stops.length > 0 && <div className="tour-stops" aria-label="游览观察点">{stops.map((stop, i) => <button key={stop.id} className={stop.id === target.stopId ? 'active' : ''} aria-label={`前往${stop.title}`} aria-pressed={stop.id === target.stopId} onClick={() => onStop(stop.id)}><span>{String(i + 1).padStart(2, '0')}</span>{stop.title}</button>)}</div>}
      <div className="tour-story-controls"><button aria-label="前一个导览点" disabled={!previous} onClick={() => previous && onStop(previous.id)}><ArrowLeft size={16}/></button><button className={index < 0 ? 'active' : ''} aria-label="自由行走" aria-pressed={index < 0} onClick={() => onStop(null)}><Footprints size={14}/>自由行走</button><button aria-label="下一个导览点" disabled={!next} onClick={() => next && onStop(next.id)}><span>下一处</span><ArrowRight size={15}/></button></div>
    </section>
    <div className="tour-controls-help"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span><span><kbd>Shift</kbd> 加速</span><span>按住画面拖动环顾</span><small>点击画面可锁定鼠标 · Esc 返回布置</small></div>
    <span className="tour-reticle" aria-hidden="true"/>
  </div>
}
