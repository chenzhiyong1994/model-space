import { Armchair, Check, ChevronRight, Flower2, Gift, Plus, Sparkles, Store } from 'lucide-react'
import { DECOR_BUILTINS, DECOR_KITS, DECOR_MODELS, CAPSULE_COLLECTION } from './decorCatalog'
import { getCapsuleCollection } from './decor'
import AssetPreview from './AssetPreview'
import type { AssetDefinition, Project, Room } from './types'

const KIT_ICONS = { welcoming: Store, reading: Flower2, cozy: Armchair, playful: Gift }

export default function DecorWorkshop({ project, room, onApplyKit, onAdd }: {
  project: Project; room: Room; onApplyKit: (id: string) => void; onAdd: (asset: AssetDefinition) => void
}) {
  const collection = getCapsuleCollection(project)
  return <div className="decor-workshop">
    <div className="decor-intro"><span className="eyebrow">THE COLLECTOR'S ATELIER</span><h2>把收藏，经营成日常。</h2><p>一把好椅子，一角绿意。让每次回来，都想再多待一会儿。</p></div>
    <section className="decor-kit-section"><div className="catalog-heading"><span>为「{room.name}」添一角</span><small>一次放置 · 可撤销</small></div><div className="decor-kit-list">
      {DECOR_KITS.map(kit => {
        const Icon = KIT_ICONS[kit.id as keyof typeof KIT_ICONS] ?? Sparkles
        const applied = room.objects.some(object => object.decorKitTag === kit.id)
        return <button key={kit.id} className={`decor-kit kit-${kit.id} ${applied ? 'is-placed' : ''}`} onClick={() => onApplyKit(kit.id)} aria-label={`布置${kit.name}`}><span className="decor-kit-icon"><Icon size={21}/></span><span><strong>{kit.name}</strong><small>{kit.subtitle}</small></span>{applied ? <Check size={15}/> : <ChevronRight size={15}/>}</button>
      })}
    </div></section>
    <section className="capsule-album"><div className="catalog-heading"><span><Gift size={14}/> 小小惊喜图鉴</span><small>{collection.length} / {CAPSULE_COLLECTION.length}</small></div><div className="capsule-stamps">{CAPSULE_COLLECTION.map(item => <div key={item.id} className={collection.includes(item.id) ? 'collected' : ''} title={`${item.name}${collection.includes(item.id) ? ' · 已收藏' : ' · 等待邂逅'}`}><AssetPreview kind={item.kind} color={item.color}/><span>{collection.includes(item.id) ? <Check size={10}/> : '·'}</span></div>)}</div><p>选中扭蛋机，免费转一份惊喜。新伙伴可以放上展架，也能随备份收藏。</p></section>
    <section className="decor-catalog-section"><div className="catalog-heading"><span>精挑细选 · 真实材质</span><small>{DECOR_MODELS.length} 件</small></div><div className="asset-grid">
      {DECOR_MODELS.map(model => <button key={model.id} className="asset-card" onClick={() => onAdd({id:`decor-${model.id}`,name:model.name,subtitle:model.subtitle,kind:'decor-model',decorId:model.id,category:'equipment',color:model.color,size:model.size})} aria-label={`添加${model.name}`}><div className="asset-image kind-decor-model"><AssetPreview kind="decor-model" decorId={model.id}/><span className="asset-add"><Plus size={14}/></span><span className="asset-format">CC0</span></div><strong>{model.name}</strong><small>{model.subtitle}</small></button>)}
    </div></section>
    <section className="decor-catalog-section"><div className="catalog-heading"><span>店主的布置小物</span><small>{DECOR_BUILTINS.length} 件</small></div><div className="asset-grid">{DECOR_BUILTINS.map(asset => <button key={asset.id} className="asset-card" onClick={() => onAdd(asset)} aria-label={`添加${asset.name}`}><div className={`asset-image kind-${asset.kind}`}><AssetPreview kind={asset.kind} color={asset.color}/><span className="asset-add"><Plus size={14}/></span></div><strong>{asset.name}</strong><small>{asset.subtitle}</small></button>)}</div></section>
    <p className="decor-footnote">素材与贴图随应用本地保存。家具、装潢和展品都可继续自由布置。</p>
  </div>
}
