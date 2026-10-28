import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, Bell, Box, Check, ChevronDown,
  CircleHelp, Cloud, Cpu, Database, ExternalLink, Gauge, HardDrive, Image as ImageIcon,
  LayoutDashboard, LoaderCircle, Menu, MoreHorizontal, Network as NetworkIcon, Pause,
  Play, Plus, RefreshCw, RotateCw, Search, Server, Settings, Shield, Trash2, UserRound,
  X, Zap,
} from 'lucide-react'
import { api } from './api'
import type { Catalog, Image, Instance, LaunchPayload, Network, Overview, Usage, Volume } from './types'

type Toast = { id: number; message: string; tone: 'success' | 'error' }

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const formatBytes = (value: number) => value ? `${(value / 1024 ** 3).toFixed(value < 1024 ** 3 ? 2 : 1)} GB` : '—'
const formatRam = (mb: number) => mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`
const initials = (value: string) => value.split(/[-_ ]/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('')

function Status({ value }: { value: string }) {
  const kind = ['ACTIVE', 'available', 'in-use'].includes(value) ? 'good' : value === 'ERROR' ? 'bad' : ['BUILD', 'creating', 'attaching'].includes(value) ? 'busy' : 'neutral'
  return <span className={`status status-${kind}`}><i />{value.replace('_', ' ').toLowerCase()}</span>
}

function Empty({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{copy}</p></div>
}

function Loading() {
  return <div className="loading"><LoaderCircle size={24} className="spin" /> Loading cloud resources…</div>
}

function ErrorPanel({ error, retry }: { error: string; retry: () => void }) {
  return <div className="error-panel"><AlertCircle /><div><strong>We couldn’t load this resource</strong><p>{error}</p></div><button className="btn secondary" onClick={retry}><RefreshCw size={15} /> Retry</button></div>
}

function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
      {children}
    </section>
  </div>
}

function Drawer({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <aside className="drawer"><header className="drawer-header"><div><span className="eyebrow">Resource details</span><h2>{title}</h2><p className="mono">{subtitle}</p></div><button className="icon-btn" onClick={onClose}><X size={19} /></button></header>{children}</aside>
  </div>
}

function PageHeader({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>
}

function UsageCard({ label, value, icon, tone }: { label: string; value: Usage; icon: ReactNode; tone: string }) {
  const percent = value.limit > 0 ? Math.min(100, Math.round(value.used / value.limit * 100)) : 0
  const display = label === 'Memory' ? `${formatRam(value.used)} / ${formatRam(value.limit)}` : `${value.used} / ${value.limit || '∞'}${value.unit === 'GB' ? ' GB' : ''}`
  return <article className="usage-card"><div className={`usage-icon ${tone}`}>{icon}</div><div className="usage-main"><div className="usage-top"><span>{label}</span><strong>{display}</strong></div><div className="progress"><i style={{ width: `${percent}%` }} /></div><small>{percent}% of project quota</small></div></article>
}

function OverviewPage({ onLaunch, onVolume }: { onLaunch: () => void; onVolume: () => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [error, setError] = useState('')
  const load = useCallback(() => { setError(''); Promise.all([api.overview(), api.instances()]).then(([o, i]) => { setData(o); setInstances(i) }).catch((e) => setError(e.message)) }, [])
  useEffect(load, [load])
  if (error) return <ErrorPanel error={error} retry={load} />
  if (!data) return <Loading />
  return <>
    <PageHeader eyebrow={`${data.project.domain} / ${data.project.name}`} title="Cloud overview" copy={`A live view of your ${data.project.region} project.`} actions={<><button className="btn secondary" onClick={onVolume}><Plus size={16} /> Create volume</button><button className="btn primary" onClick={onLaunch}><Zap size={16} /> Launch instance</button></>} />
    <section className="usage-grid">
      <UsageCard label="Instances" value={data.stats.instances} icon={<Server />} tone="blue" />
      <UsageCard label="vCPUs" value={data.stats.vcpus} icon={<Cpu />} tone="purple" />
      <UsageCard label="Memory" value={data.stats.ram} icon={<Gauge />} tone="green" />
      <UsageCard label="Volume storage" value={data.stats.storage} icon={<HardDrive />} tone="orange" />
    </section>
    <section className="dashboard-grid">
      <article className="panel span-2"><div className="panel-heading"><div><h2>Compute at a glance</h2><p>Your most recently updated instances</p></div><NavLink to="/instances" className="text-link">View all <ArrowRight size={14} /></NavLink></div>
        <div className="mini-instance-list">{instances.slice(0, 4).map((instance) => <NavLink to="/instances" key={instance.id} className="mini-instance"><div className="resource-avatar">{initials(instance.name)}</div><div className="grow"><strong>{instance.name}</strong><span>{instance.flavor.name} · {instance.addresses[0]?.address || 'No IP assigned'}</span></div><Status value={instance.status} /><span className="updated">{formatDate(instance.updated_at)}</span></NavLink>)}</div>
      </article>
      <article className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Project events</p></div><Activity size={18} /></div>
        <div className="timeline">{data.activity.length ? data.activity.map((event) => <div className="timeline-item" key={event.id}><i className={event.status} /><div><strong>{event.action}</strong><span>{event.resource}</span><small>{formatDate(event.at)}</small></div></div>) : <Empty icon={<Activity />} title="No recent activity" copy="Events will appear as resources change." />}</div>
      </article>
    </section>
  </>
}

function Toolbar({ search, setSearch, placeholder, children }: { search: string; setSearch: (value: string) => void; placeholder: string; children?: ReactNode }) {
  return <div className="toolbar"><label className="search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} /></label><div className="toolbar-actions">{children}</div></div>
}

function InstanceDetails({ instance, onClose, onAction, onDelete }: { instance: Instance; onClose: () => void; onAction: (action: string) => void; onDelete: () => void }) {
  return <Drawer title={instance.name} subtitle={instance.id} onClose={onClose}>
    <div className="drawer-actions">{instance.status === 'ACTIVE' ? <button className="btn secondary" onClick={() => onAction('stop')}><Pause size={15} /> Stop</button> : <button className="btn secondary" onClick={() => onAction('start')}><Play size={15} /> Start</button>}<button className="btn secondary" onClick={() => onAction('soft_reboot')}><RotateCw size={15} /> Reboot</button><button className="btn danger-text" onClick={onDelete}><Trash2 size={15} /> Delete</button></div>
    {instance.fault && <div className="fault"><AlertCircle /><div><strong>Instance fault ({instance.fault.code})</strong><p>{instance.fault.message}</p></div></div>}
    <div className="detail-section"><h3>Overview</h3><dl className="details"><div><dt>Status</dt><dd><Status value={instance.status} /></dd></div><div><dt>Power state</dt><dd>{instance.power_state}</dd></div><div><dt>Description</dt><dd>{instance.description || '—'}</dd></div><div><dt>Availability zone</dt><dd>{instance.availability_zone || '—'}</dd></div><div><dt>Compute host</dt><dd>{instance.host || 'Not scheduled'}</dd></div><div><dt>Created</dt><dd>{formatDate(instance.created_at)}</dd></div></dl></div>
    <div className="detail-section"><h3>Configuration</h3><dl className="details"><div><dt>Image</dt><dd>{instance.image.name}</dd></div><div><dt>Flavor</dt><dd>{instance.flavor.name}</dd></div><div><dt>vCPUs</dt><dd>{instance.flavor.vcpus}</dd></div><div><dt>Memory</dt><dd>{formatRam(instance.flavor.ram)}</dd></div><div><dt>Root disk</dt><dd>{instance.flavor.disk} GB</dd></div><div><dt>Key pair</dt><dd>{instance.key_name || 'None'}</dd></div></dl></div>
    <div className="detail-section"><h3>Connectivity</h3>{instance.addresses.length ? instance.addresses.map((address) => <div className="address-row" key={address.address}><NetworkIcon size={16} /><div><strong>{address.address}</strong><span>{address.network} · {address.type} IPv{address.version}</span></div></div>) : <p className="muted">No addresses assigned.</p>}<div className="tag-list">{instance.security_groups.map((group) => <span className="tag" key={group}><Shield size={12} />{group}</span>)}</div></div>
    {Object.keys(instance.metadata).length > 0 && <div className="detail-section"><h3>Metadata</h3><div className="code-box">{Object.entries(instance.metadata).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div></div>}
  </Drawer>
}

function InstancesPage({ onLaunch, notify }: { onLaunch: () => void; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [items, setItems] = useState<Instance[]>([]), [search, setSearch] = useState(''), [status, setStatus] = useState('all'), [selected, setSelected] = useState<Instance | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(() => { setLoading(true); setError(''); api.instances().then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  const filtered = useMemo(() => items.filter((item) => (status === 'all' || item.status === status) && `${item.name} ${item.id} ${item.addresses.map((a) => a.address).join(' ')}`.toLowerCase().includes(search.toLowerCase())), [items, search, status])
  const action = async (value: string) => { if (!selected) return; try { const updated = await api.instanceAction(selected.id, value); setSelected(updated); load(); notify(`${selected.name}: action requested`) } catch (e) { notify((e as Error).message, 'error') } }
  const remove = async () => { if (!selected || !confirm(`Delete ${selected.name}? This cannot be undone.`)) return; try { await api.deleteInstance(selected.id); setSelected(null); load(); notify('Instance deleted') } catch (e) { notify((e as Error).message, 'error') } }
  return <>
    <PageHeader eyebrow="Compute" title="Instances" copy="Launch, inspect, and manage virtual machines in this project." actions={<button className="btn primary" onClick={onLaunch}><Plus size={16} /> Launch instance</button>} />
    <section className="panel table-panel"><Toolbar search={search} setSearch={setSearch} placeholder="Search by name, ID, or IP address"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option>ACTIVE</option><option>SHUTOFF</option><option>ERROR</option></select><button className="icon-btn bordered" onClick={load} aria-label="Refresh"><RefreshCw size={17} /></button></Toolbar>
      {error ? <ErrorPanel error={error} retry={load} /> : loading ? <Loading /> : filtered.length === 0 ? <Empty icon={<Server />} title="No instances found" copy="Try another filter or launch your first instance." /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Status</th><th>IP address</th><th>Image</th><th>Flavor</th><th>Availability zone</th><th>Created</th><th /></tr></thead><tbody>{filtered.map((instance) => <tr key={instance.id} onClick={() => setSelected(instance)}><td><div className="name-cell"><div className="resource-avatar small">{initials(instance.name)}</div><div><strong>{instance.name}</strong><span>{instance.id}</span></div></div></td><td><Status value={instance.status} /></td><td><div className="stacked">{instance.addresses.slice(0, 2).map((address) => <span key={address.address}>{address.address}{address.type === 'floating' && <ExternalLink size={11} />}</span>)}{!instance.addresses.length && <span>—</span>}</div></td><td>{instance.image.name}</td><td><strong>{instance.flavor.name}</strong><span className="subtext">{instance.flavor.vcpus} vCPU · {formatRam(instance.flavor.ram)}</span></td><td>{instance.availability_zone || '—'}</td><td>{formatDate(instance.created_at)}</td><td><button className="icon-btn"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div>}
      <div className="table-footer"><span>{filtered.length} of {items.length} instances</span><span>Project scope</span></div>
    </section>
    {selected && <InstanceDetails instance={selected} onClose={() => setSelected(null)} onAction={action} onDelete={remove} />}
  </>
}

function VolumeDetails({ volume, instances, onClose, onChanged, notify }: { volume: Volume; instances: Instance[]; onClose: () => void; onChanged: () => void; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [instance, setInstance] = useState(instances.find((i) => i.status === 'ACTIVE')?.id || '')
  const attach = async () => { if (!instance) return; try { await api.attachVolume(volume.id, instance); notify('Volume attachment requested'); onClose(); onChanged() } catch (e) { notify((e as Error).message, 'error') } }
  const detach = async () => { try { await api.detachVolume(volume.id); notify('Volume detachment requested'); onClose(); onChanged() } catch (e) { notify((e as Error).message, 'error') } }
  const remove = async () => { if (!confirm(`Delete ${volume.name}?`)) return; try { await api.deleteVolume(volume.id); notify('Volume deleted'); onClose(); onChanged() } catch (e) { notify((e as Error).message, 'error') } }
  return <Drawer title={volume.name} subtitle={volume.id} onClose={onClose}>
    <div className="drawer-actions">{volume.attachments.length ? <button className="btn secondary" onClick={detach}><X size={15} /> Detach</button> : <><select value={instance} onChange={(e) => setInstance(e.target.value)}><option value="">Choose an instance</option>{instances.filter((i) => i.status === 'ACTIVE').map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select><button className="btn secondary" disabled={!instance} onClick={attach}><Plus size={15} /> Attach</button></>}<button className="btn danger-text" disabled={!!volume.attachments.length} onClick={remove}><Trash2 size={15} /> Delete</button></div>
    <div className="volume-hero"><div><HardDrive size={28} /><span>{volume.size}<small>GB</small></span></div><div><Status value={volume.status} /><p>{volume.description || 'No description'}</p></div></div>
    <div className="detail-section"><h3>Volume details</h3><dl className="details"><div><dt>Type</dt><dd>{volume.volume_type}</dd></div><div><dt>Availability zone</dt><dd>{volume.availability_zone}</dd></div><div><dt>Bootable</dt><dd>{volume.bootable ? 'Yes' : 'No'}</dd></div><div><dt>Encrypted</dt><dd>{volume.encrypted ? 'Yes' : 'No'}</dd></div><div><dt>Snapshot</dt><dd>{volume.snapshot_id || '—'}</dd></div><div><dt>Created</dt><dd>{formatDate(volume.created_at)}</dd></div></dl></div>
    <div className="detail-section"><h3>Attachments</h3>{volume.attachments.length ? volume.attachments.map((attachment) => <div className="attachment" key={attachment.server_id}><Server /><div><strong>{attachment.server_name}</strong><span>{attachment.device} · {attachment.server_id}</span></div></div>) : <p className="muted">This volume is not attached to an instance.</p>}</div>
  </Drawer>
}

function VolumesPage({ onCreate, notify }: { onCreate: () => void; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [items, setItems] = useState<Volume[]>([]), [instances, setInstances] = useState<Instance[]>([]), [search, setSearch] = useState(''), [selected, setSelected] = useState<Volume | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(() => { setLoading(true); Promise.all([api.volumes(), api.instances()]).then(([v, i]) => { setItems(v); setInstances(i) }).catch((e) => setError(e.message)).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  const filtered = items.filter((item) => `${item.name} ${item.id} ${item.description}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeader eyebrow="Storage" title="Volumes" copy="Persistent block storage for your instances and data." actions={<button className="btn primary" onClick={onCreate}><Plus size={16} /> Create volume</button>} />
    <section className="panel table-panel"><Toolbar search={search} setSearch={setSearch} placeholder="Search volumes"><button className="icon-btn bordered" onClick={load}><RefreshCw size={17} /></button></Toolbar>{error ? <ErrorPanel error={error} retry={load} /> : loading ? <Loading /> : filtered.length === 0 ? <Empty icon={<HardDrive />} title="No volumes found" copy="Create persistent storage for your workloads." /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Status</th><th>Size</th><th>Type</th><th>Attached to</th><th>Zone</th><th>Created</th><th /></tr></thead><tbody>{filtered.map((volume) => <tr key={volume.id} onClick={() => setSelected(volume)}><td><div className="name-cell"><div className="resource-avatar small storage"><HardDrive size={16} /></div><div><strong>{volume.name}</strong><span>{volume.id}</span></div></div></td><td><Status value={volume.status} /></td><td><strong>{volume.size} GB</strong></td><td>{volume.volume_type}</td><td>{volume.attachments[0] ? <div className="stacked"><strong>{volume.attachments[0].server_name}</strong><span>{volume.attachments[0].device}</span></div> : <span className="muted">Not attached</span>}</td><td>{volume.availability_zone}</td><td>{formatDate(volume.created_at)}</td><td><button className="icon-btn"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div>}<div className="table-footer"><span>{filtered.length} volumes · {filtered.reduce((sum, item) => sum + item.size, 0)} GB provisioned</span></div></section>
    {selected && <VolumeDetails volume={selected} instances={instances} onClose={() => setSelected(null)} onChanged={load} notify={notify} />}</>
}

function NetworksPage() {
  const [items, setItems] = useState<Network[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(() => { api.networks().then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  return <><PageHeader eyebrow="Network" title="Networks" copy="Project networks, subnets, and address ranges." /><section className="card-grid">{error ? <ErrorPanel error={error} retry={load} /> : loading ? <Loading /> : items.map((network) => <article className="network-card" key={network.id}><div className="network-top"><div className={`network-icon ${network.external ? 'external' : ''}`}><NetworkIcon /></div><Status value={network.status} /></div><h2>{network.name}</h2><p className="mono">{network.id}</p><div className="network-tags">{network.external && <span>External</span>}{network.shared && <span>Shared</span>}<span>{network.admin_state_up ? 'Admin up' : 'Admin down'}</span></div><div className="subnets">{network.subnets.map((subnet) => <div key={subnet.id}><div><strong>{subnet.name}</strong><span>IPv{subnet.ip_version}</span></div><p>{subnet.cidr || 'CIDR unavailable'}</p><small>Gateway {subnet.gateway_ip || '—'}</small></div>)}</div></article>)}</section></>
}

function ImagesPage() {
  const [items, setItems] = useState<Image[]>([]), [search, setSearch] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const load = useCallback(() => { api.images().then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false)) }, [])
  useEffect(load, [load])
  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeader eyebrow="Compute" title="Images" copy="Bootable operating system images available to this project." /><section className="panel table-panel"><Toolbar search={search} setSearch={setSearch} placeholder="Search images" />{error ? <ErrorPanel error={error} retry={load} /> : loading ? <Loading /> : <div className="table-scroll"><table><thead><tr><th>Name</th><th>Status</th><th>Visibility</th><th>Format</th><th>Size</th><th>Minimum disk</th><th>Created</th></tr></thead><tbody>{filtered.map((image) => <tr key={image.id}><td><div className="name-cell"><div className="resource-avatar small image"><ImageIcon size={16} /></div><div><strong>{image.name}</strong><span>{image.id}</span></div></div></td><td><Status value={image.status.toUpperCase()} /></td><td className="capitalize">{image.visibility}</td><td className="uppercase">{image.disk_format}</td><td>{formatBytes(image.size)}</td><td>{image.min_disk} GB</td><td>{formatDate(image.created_at)}</td></tr>)}</tbody></table></div>}</section></>
}

function ChoiceCard({ selected, onClick, title, subtitle, meta, icon }: { selected: boolean; onClick: () => void; title: string; subtitle?: string; meta: string; icon?: ReactNode }) {
  return <button type="button" className={`choice-card ${selected ? 'selected' : ''}`} onClick={onClick}>{icon && <div className="choice-icon">{icon}</div>}<div><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}<small>{meta}</small></div><i className="radio">{selected && <Check size={12} />}</i></button>
}

const initialLaunch: LaunchPayload = { name: '', description: '', count: 1, image_id: '', flavor_id: '', network_id: '', key_name: null, security_group_ids: [], availability_zone: null, boot_volume_size: null, delete_on_termination: true }

function LaunchWizard({ catalog, onClose, onCreated, notify }: { catalog: Catalog; onClose: () => void; onCreated: () => void; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [step, setStep] = useState(0), [data, setData] = useState<LaunchPayload>({ ...initialLaunch, image_id: catalog.images[0]?.id || '', flavor_id: catalog.flavors[1]?.id || catalog.flavors[0]?.id || '', network_id: catalog.networks.find((n) => !n.external)?.id || catalog.networks[0]?.id || '', security_group_ids: catalog.security_groups.filter((g) => g.name === 'default').map((g) => g.id), availability_zone: catalog.availability_zones[0] || null }), [busy, setBusy] = useState(false)
  const steps = ['Details', 'Source', 'Flavor', 'Network & access', 'Review']
  const valid = step !== 0 || data.name.trim().length > 0
  const launch = async () => { setBusy(true); try { await api.launch(data); notify(`${data.count} instance${data.count > 1 ? 's' : ''} launched`); onCreated(); onClose() } catch (e) { notify((e as Error).message, 'error') } finally { setBusy(false) } }
  const image = catalog.images.find((i) => i.id === data.image_id), flavor = catalog.flavors.find((f) => f.id === data.flavor_id), network = catalog.networks.find((n) => n.id === data.network_id)
  return <Modal title="Launch instance" subtitle="Configure a new virtual machine" onClose={onClose} wide><div className="wizard"><nav className="wizard-steps">{steps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => index < step && setStep(index)}><i>{index < step ? <Check size={14} /> : index + 1}</i><span>{label}</span></button>)}</nav><div className="wizard-content">
    {step === 0 && <div className="form-step"><div className="step-heading"><span>01</span><div><h3>Instance details</h3><p>Give this workload a clear identity.</p></div></div><label>Instance name <em>Required</em><input autoFocus value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="e.g. web-production-01" /></label><label>Description <em>Optional</em><textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="What will this instance be used for?" /></label><div className="form-row"><label>Number of instances<input type="number" min="1" max="10" value={data.count} onChange={(e) => setData({ ...data, count: Number(e.target.value) })} /></label><label>Availability zone<select value={data.availability_zone || ''} onChange={(e) => setData({ ...data, availability_zone: e.target.value })}>{catalog.availability_zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label></div></div>}
    {step === 1 && <div className="form-step"><div className="step-heading"><span>02</span><div><h3>Choose a source</h3><p>Select the operating system image and boot storage.</p></div></div><div className="choice-list">{catalog.images.map((item) => <ChoiceCard key={item.id} selected={data.image_id === item.id} onClick={() => setData({ ...data, image_id: item.id })} icon={<ImageIcon />} title={item.name} subtitle={`${item.disk_format.toUpperCase()} · ${formatBytes(item.size)}`} meta={`Minimum ${item.min_disk} GB disk · ${formatRam(item.min_ram)} RAM`} />)}</div><div className="toggle-row"><div><strong>Boot from a persistent volume</strong><span>Keeps the root disk independently from the instance.</span></div><button type="button" className={`switch ${data.boot_volume_size ? 'on' : ''}`} onClick={() => setData({ ...data, boot_volume_size: data.boot_volume_size ? null : Math.max(image?.min_disk || 10, 20) })}><i /></button></div>{data.boot_volume_size && <div className="form-row inset"><label>Volume size (GB)<input type="number" min={image?.min_disk || 1} value={data.boot_volume_size} onChange={(e) => setData({ ...data, boot_volume_size: Number(e.target.value) })} /></label><label className="check-label"><input type="checkbox" checked={data.delete_on_termination} onChange={(e) => setData({ ...data, delete_on_termination: e.target.checked })} /> Delete volume with instance</label></div>}</div>}
    {step === 2 && <div className="form-step"><div className="step-heading"><span>03</span><div><h3>Choose a flavor</h3><p>Define compute, memory, and ephemeral disk capacity.</p></div></div><div className="flavor-head"><span>Flavor</span><span>vCPU</span><span>Memory</span><span>Disk</span><span /></div><div className="choice-list compact">{catalog.flavors.map((item) => <button key={item.id} className={`flavor-row ${data.flavor_id === item.id ? 'selected' : ''}`} onClick={() => setData({ ...data, flavor_id: item.id })}><strong>{item.name}</strong><span>{item.vcpus}</span><span>{formatRam(item.ram)}</span><span>{item.disk} GB</span><i className="radio">{data.flavor_id === item.id && <Check size={12} />}</i></button>)}</div></div>}
    {step === 3 && <div className="form-step"><div className="step-heading"><span>04</span><div><h3>Network & access</h3><p>Connect the instance and configure secure access.</p></div></div><h4>Network</h4><div className="choice-list horizontal">{catalog.networks.map((item) => <ChoiceCard key={item.id} selected={data.network_id === item.id} onClick={() => setData({ ...data, network_id: item.id })} icon={<NetworkIcon />} title={item.name} subtitle={item.subnets[0]?.cidr || 'No subnet'} meta={item.external ? 'External network' : 'Project network'} />)}</div><div className="form-row"><label>SSH key pair<select value={data.key_name || ''} onChange={(e) => setData({ ...data, key_name: e.target.value || null })}><option value="">No key pair</option>{catalog.keypairs.map((item) => <option key={item.name}>{item.name}</option>)}</select></label></div><h4>Security groups</h4><div className="security-list">{catalog.security_groups.map((group) => { const checked = data.security_group_ids.includes(group.id); return <label key={group.id}><input type="checkbox" checked={checked} onChange={() => setData({ ...data, security_group_ids: checked ? data.security_group_ids.filter((id) => id !== group.id) : [...data.security_group_ids, group.id] })} /><span><strong>{group.name}</strong><small>{group.description} · {group.rules} rules</small></span></label> })}</div></div>}
    {step === 4 && <div className="form-step review-step"><div className="step-heading"><span>05</span><div><h3>Review & launch</h3><p>Confirm the configuration before creating your instance.</p></div></div><div className="review-name"><div className="resource-avatar">{initials(data.name)}</div><div><h3>{data.name || 'Unnamed instance'}</h3><p>{data.description || 'No description'}{data.count > 1 && ` · ${data.count} instances`}</p></div></div><div className="review-grid"><div><span>Source</span><strong>{image?.name}</strong><small>{data.boot_volume_size ? `${data.boot_volume_size} GB boot volume` : 'Ephemeral root disk'}</small></div><div><span>Flavor</span><strong>{flavor?.name}</strong><small>{flavor?.vcpus} vCPU · {formatRam(flavor?.ram || 0)} RAM</small></div><div><span>Network</span><strong>{network?.name}</strong><small>{network?.subnets[0]?.cidr}</small></div><div><span>Access</span><strong>{data.key_name || 'No key pair'}</strong><small>{data.security_group_ids.length} security groups</small></div></div><div className="review-note"><CircleHelp size={18} /><p>Instance creation is asynchronous. VinCloud will show its build status while Nova schedules it on an available compute host.</p></div></div>}
  </div></div><footer className="modal-footer"><button className="btn ghost" onClick={onClose}>Cancel</button><div>{step > 0 && <button className="btn secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</button>}{step < steps.length - 1 ? <button className="btn primary" disabled={!valid} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={15} /></button> : <button className="btn primary" disabled={busy} onClick={launch}>{busy ? <LoaderCircle className="spin" size={16} /> : <Zap size={16} />} Launch {data.count > 1 ? `${data.count} instances` : 'instance'}</button>}</div></footer></Modal>
}

function CreateVolumeModal({ catalog, onClose, onCreated, notify }: { catalog: Catalog; onClose: () => void; onCreated: () => void; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [data, setData] = useState({ name: '', description: '', size: 20, volume_type: catalog.volume_types[0] || '__DEFAULT__', availability_zone: catalog.availability_zones[0] || 'nova', source_type: 'empty', image_id: '' }), [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); try { await api.createVolume(data); notify('Volume created'); onCreated(); onClose() } catch (e) { notify((e as Error).message, 'error') } finally { setBusy(false) } }
  return <Modal title="Create volume" subtitle="Provision persistent block storage" onClose={onClose}><div className="modal-body form-step"><label>Volume name <em>Required</em><input autoFocus value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="e.g. database-data" /></label><label>Description <em>Optional</em><textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="What will this volume store?" /></label><div className="form-row"><label>Size (GB)<input type="number" min="1" value={data.size} onChange={(e) => setData({ ...data, size: Number(e.target.value) })} /></label><label>Volume type<select value={data.volume_type} onChange={(e) => setData({ ...data, volume_type: e.target.value })}>{catalog.volume_types.map((type) => <option key={type}>{type}</option>)}</select></label></div><label>Source<select value={data.source_type} onChange={(e) => setData({ ...data, source_type: e.target.value })}><option value="empty">Empty volume</option><option value="image">From image</option></select></label>{data.source_type === 'image' && <label>Image<select value={data.image_id} onChange={(e) => setData({ ...data, image_id: e.target.value })}><option value="">Choose an image</option>{catalog.images.map((image) => <option value={image.id} key={image.id}>{image.name}</option>)}</select></label>}<div className="info-callout"><Database size={18} /><p>Volumes persist independently of instances and can be attached after creation.</p></div></div><footer className="modal-footer"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!data.name || busy} onClick={submit}>{busy && <LoaderCircle className="spin" size={16} />} Create volume</button></footer></Modal>
}

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/instances', label: 'Instances', icon: Server },
  { to: '/volumes', label: 'Volumes', icon: HardDrive },
  { to: '/networks', label: 'Networks', icon: NetworkIcon },
  { to: '/images', label: 'Images', icon: ImageIcon },
]

export default function App() {
  const location = useLocation(), [sidebar, setSidebar] = useState(false), [launch, setLaunch] = useState(false), [createVolume, setCreateVolume] = useState(false), [catalog, setCatalog] = useState<Catalog | null>(null), [toasts, setToasts] = useState<Toast[]>([]), [refreshKey, setRefreshKey] = useState(0)
  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => { const id = Date.now(); setToasts((items) => [...items, { id, message, tone }]); setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500) }, [])
  useEffect(() => { if (launch || createVolume) api.catalog().then(setCatalog).catch((e) => notify(e.message, 'error')) }, [launch, createVolume, notify])
  useEffect(() => setSidebar(false), [location.pathname])
  const changed = () => setRefreshKey((value) => value + 1)
  return <div className="app-shell"><aside className={`sidebar ${sidebar ? 'open' : ''}`}><NavLink to="/" className="brand"><span><Cloud /></span><strong>VinCloud</strong></NavLink><div className="project-switcher"><span>Current project</span><button><div className="project-mark">V</div><div><strong>demo</strong><small>RegionOne</small></div><ChevronDown size={15} /></button></div><nav><span className="nav-heading">Project</span>{nav.map((item) => <NavLink to={item.to} end={item.to === '/'} key={item.to}><item.icon size={18} /><span>{item.label}</span></NavLink>)}<span className="nav-heading lower">Manage</span><a href="/api/docs" target="_blank"><Settings size={18} /><span>API explorer</span><ExternalLink size={12} className="nav-end" /></a></nav><footer><div className="cloud-health"><i /><div><strong>Cloud connected</strong><span>All services operational</span></div></div><div className="sidebar-user"><div>VA</div><span><strong>VinCloud Admin</strong><small>Project member</small></span><MoreHorizontal size={17} /></div></footer></aside>
    {sidebar && <div className="mobile-overlay" onClick={() => setSidebar(false)} />}
    <div className="workspace"><header className="topbar"><button className="icon-btn menu-btn" onClick={() => setSidebar(!sidebar)}><Menu /></button><div className="breadcrumbs"><span>VinCloud</span><b>/</b><strong>{nav.find((item) => item.to === location.pathname)?.label || 'Overview'}</strong></div><div className="top-actions"><button className="icon-btn"><CircleHelp size={19} /></button><button className="icon-btn notice"><Bell size={19} /><i /></button><div className="top-separator" /><div className="top-user"><div>VA</div><span><strong>VinCloud Admin</strong><small>demo</small></span><ChevronDown size={14} /></div></div></header><main key={refreshKey}><Routes><Route path="/" element={<OverviewPage onLaunch={() => setLaunch(true)} onVolume={() => setCreateVolume(true)} />} /><Route path="/instances" element={<InstancesPage onLaunch={() => setLaunch(true)} notify={notify} />} /><Route path="/volumes" element={<VolumesPage onCreate={() => setCreateVolume(true)} notify={notify} />} /><Route path="/networks" element={<NetworksPage />} /><Route path="/images" element={<ImagesPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main></div>
    {launch && catalog && <LaunchWizard catalog={catalog} onClose={() => setLaunch(false)} onCreated={changed} notify={notify} />}{createVolume && catalog && <CreateVolumeModal catalog={catalog} onClose={() => setCreateVolume(false)} onCreated={changed} notify={notify} />}
    <div className="toast-stack">{toasts.map((toast) => <div className={`toast ${toast.tone}`} key={toast.id}>{toast.tone === 'success' ? <Check /> : <AlertCircle />}<span>{toast.message}</span><button onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}><X /></button></div>)}</div>
  </div>
}
