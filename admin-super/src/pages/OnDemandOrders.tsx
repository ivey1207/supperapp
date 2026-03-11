import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';
import type { OnDemandOrder } from '../lib/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Navigation, User, Car, Clock, AlertCircle } from 'lucide-react';

// Fix for default markers
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#3b82f6',
    ACCEPTED: '#8b5cf6',
    EN_ROUTE: '#f59e0b',
    COMPLETED: '#22c55e',
    CANCELLED: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Ожидание',
    ACCEPTED: 'Принят',
    EN_ROUTE: 'В пути',
    COMPLETED: 'Завершен',
    CANCELLED: 'Отменен',
};

const CarIcon = (heading: number) => L.divIcon({
    className: 'custom-car-icon',
    html: `<div style="transform: rotate(${heading}deg); width: 30px; height: 30px; display: flex; items-center: center; justify-content: center; background: white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 2px solid #3b82f6;">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
             </svg>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

function MapFocus({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    }, [bounds, map]);
    return null;
}

export default function OnDemandOrders() {
    const [orders, setOrders] = useState<OnDemandOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [error, setError] = useState('');

    const loadOrders = useCallback(async () => {
        try {
            const { data } = await api.get('/api/v1/admin/on-demand');
            setOrders(data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Ошибка загрузки заказов');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, [loadOrders]);

    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    
    const getMapBounds = () => {
        if (!selectedOrder) return null;
        const points: L.LatLngExpression[] = [[selectedOrder.userLat, selectedOrder.userLon]];
        if (selectedOrder.providerLat && selectedOrder.providerLon) {
            points.push([selectedOrder.providerLat, selectedOrder.providerLon]);
        }
        return L.latLngBounds(points);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Navigation className="h-7 w-7 text-blue-500" />
                        Выездная мойка и услуги
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Мониторинг активных заказов и перемещения мойщиков
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Column */}
                <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-auto pr-2 custom-scrollbar">
                    {loading && <div className="text-center py-10 opacity-50 font-medium">Загрузка заказов...</div>}
                    {error && <div className="text-center py-4 text-red-500 text-sm">{error}</div>}
                    {!loading && orders.length === 0 && (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                             <AlertCircle className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                             <p className="text-slate-500 font-medium">Заказов пока нет</p>
                        </div>
                    )}
                    {orders.map(order => (
                        <button
                            key={order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                                selectedOrderId === order.id 
                                ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20' 
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider`}
                                    style={{ background: `${STATUS_COLORS[order.status]}20`, color: STATUS_COLORS[order.status] }}
                                >
                                    {STATUS_LABELS[order.status]}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">#{order.id.slice(-6)}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{order.userAddress}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                <Car className="h-3 w-3" />
                                <span>{order.carDetails}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(order.createdAt).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Map/Details Column */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedOrder ? (
                        <>
                            <div className="h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative z-0">
                                <MapContainer
                                    center={[selectedOrder.userLat, selectedOrder.userLon]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    
                                    {/* User Marker */}
                                    <Marker position={[selectedOrder.userLat, selectedOrder.userLon]} icon={DefaultIcon}>
                                        <Popup>Место мойки: {selectedOrder.userAddress}</Popup>
                                    </Marker>

                                    {/* Provider Marker */}
                                    {selectedOrder.providerLat != null && selectedOrder.providerLon != null && (
                                        <Marker 
                                            position={[selectedOrder.providerLat, selectedOrder.providerLon] as [number, number]} 
                                            icon={CarIcon(selectedOrder.providerHeading || 0)}
                                        >
                                            <Popup>Мойщик {selectedOrder.contractorId ? `(ID: ${selectedOrder.contractorId.slice(-6)})` : ''}</Popup>
                                        </Marker>
                                    )}

                                    <MapFocus bounds={getMapBounds()!} />
                                </MapContainer>
                            </div>

                            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex flex-wrap gap-8">
                                    <DetailItem icon={<User className="text-blue-500" />} label="Адрес" value={selectedOrder.userAddress} />
                                    <DetailItem icon={<Car className="text-purple-500" />} label="Автомобиль" value={selectedOrder.carDetails} />
                                    <DetailItem icon={<Navigation className="text-amber-500" />} label="Статус" value={STATUS_LABELS[selectedOrder.status]} />
                                    <DetailItem icon={<Clock className="text-emerald-500" />} label="Заказано в" value={new Date(selectedOrder.createdAt).toLocaleString('ru')} />
                                </div>
                                {selectedOrder.description && (
                                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs text-slate-500 font-bold uppercase mb-2">Комментарий:</p>
                                        <p className="text-slate-700 dark:text-slate-300 text-sm">{selectedOrder.description}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-40">
                            <div className="text-center">
                                <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-full w-fit mx-auto mb-4">
                                    <MapIcon className="h-10 w-10 text-slate-400" />
                                </div>
                                <h3 className="text-slate-900 dark:text-white font-bold">Выберите заказ для отслеживания</h3>
                                <p className="text-slate-500 text-sm mt-1">Здесь будет карта с местоположением мойщика</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex gap-3 items-start">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 shadow-sm">{icon}</div>
            <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</p>
            </div>
        </div>
    );
}
