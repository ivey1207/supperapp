import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Fix for default marker icons in Leaflet + Webpack/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
    lat: number | string;
    lng: number | string;
    onChange: (lat: number, lng: number) => void;
}

function LocationMarker({ lat, lng, onChange }: MapPickerProps) {
    const map = useMap();
    const [position, setPosition] = useState<L.LatLng | null>(
        lat && lng ? L.latLng(Number(lat), Number(lng)) : null
    );

    useEffect(() => {
        if (lat && lng) {
            const newPos = L.latLng(Number(lat), Number(lng));
            setPosition(newPos);
            map.flyTo(newPos, map.getZoom());
        }
    }, [lat, lng, map]);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
    const center = lat && lng ? [Number(lat), Number(lng)] : [41.2995, 69.2401]; // Tashkent default

    return (
        <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner mt-2">
            <MapContainer
                center={center as L.LatLngExpression}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker lat={lat} lng={lng} onChange={onChange} />
            </MapContainer>
        </div>
    );
}
