'use client';

import { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, Loader2, Trash2, X, CheckCircle, Download, ShieldCheck, AlertTriangle, ClipboardList } from 'lucide-react';
import { workshopAPI } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const VIEWS = [
  { id: 'front', label: 'Frontal', icon: '⬆' },
  { id: 'rear', label: 'Trasera', icon: '⬇' },
  { id: 'left', label: 'Lateral Izq.', icon: '⬅' },
  { id: 'right', label: 'Lateral Der.', icon: '➡' },
];

const ZONES: Record<string, { id: string; label: string; cx: number; cy: number; w: number; h: number }[]> = {
  front: [
    { id: 'front_bumper', label: 'Defensa delantera', cx: 200, cy: 340, w: 240, h: 40 },
    { id: 'left_headlight', label: 'Faros izquierdos', cx: 95, cy: 250, w: 70, h: 30 },
    { id: 'right_headlight', label: 'Faros derechos', cx: 305, cy: 250, w: 70, h: 30 },
    { id: 'hood', label: 'Capó', cx: 200, cy: 185, w: 220, h: 80 },
    { id: 'windshield', label: 'Parabrisas', cx: 200, cy: 85, w: 180, h: 60 },
    { id: 'left_fender', label: 'Guardabarros izq.', cx: 50, cy: 200, w: 40, h: 120 },
    { id: 'right_fender', label: 'Guardabarros der.', cx: 350, cy: 200, w: 40, h: 120 },
    { id: 'grille', label: 'Parrilla/Radiador', cx: 200, cy: 290, w: 120, h: 30 },
  ],
  rear: [
    { id: 'rear_bumper', label: 'Defensa trasera', cx: 200, cy: 340, w: 240, h: 40 },
    { id: 'left_taillight', label: 'Luz tras. izq.', cx: 90, cy: 240, w: 60, h: 35 },
    { id: 'right_taillight', label: 'Luz tras. der.', cx: 310, cy: 240, w: 60, h: 35 },
    { id: 'trunk', label: 'Maletero', cx: 200, cy: 170, w: 220, h: 80 },
    { id: 'rear_window', label: 'Vidrio trasero', cx: 200, cy: 80, w: 170, h: 55 },
    { id: 'left_rear_fender', label: 'Guarda tras. izq.', cx: 50, cy: 200, w: 40, h: 120 },
    { id: 'right_rear_fender', label: 'Guarda tras. der.', cx: 350, cy: 200, w: 40, h: 120 },
    { id: 'license_plate_rear', label: 'Placa trasera', cx: 200, cy: 305, w: 80, h: 25 },
  ],
  left: [
    { id: 'left_front_bumper_side', label: 'Defensa del. izq.', cx: 38, cy: 255, w: 36, h: 70 },
    { id: 'left_front_fender_side', label: 'Guardabarros del.', cx: 88, cy: 200, w: 50, h: 130 },
    { id: 'left_front_door', label: 'Puerta delantera', cx: 168, cy: 200, w: 80, h: 130 },
    { id: 'left_rear_door', label: 'Puerta trasera', cx: 252, cy: 200, w: 80, h: 130 },
    { id: 'left_rear_fender_side', label: 'Guardabarros tras.', cx: 318, cy: 200, w: 50, h: 130 },
    { id: 'left_rear_bumper_side', label: 'Defensa tras. izq.', cx: 362, cy: 255, w: 36, h: 70 },
    { id: 'left_front_tire', label: 'Llanta delantera', cx: 75, cy: 310, w: 44, h: 44 },
    { id: 'left_rear_tire', label: 'Llanta trasera', cx: 318, cy: 310, w: 44, h: 44 },
    { id: 'left_mirror', label: 'Espejo retrovisor', cx: 128, cy: 135, w: 28, h: 22 },
    { id: 'left_roof', label: 'Techo', cx: 200, cy: 100, w: 160, h: 30 },
  ],
  right: [
    { id: 'right_front_bumper_side', label: 'Defensa del. der.', cx: 362, cy: 255, w: 36, h: 70 },
    { id: 'right_front_fender_side', label: 'Guardabarros del.', cx: 312, cy: 200, w: 50, h: 130 },
    { id: 'right_front_door', label: 'Puerta delantera', cx: 232, cy: 200, w: 80, h: 130 },
    { id: 'right_rear_door', label: 'Puerta trasera', cx: 148, cy: 200, w: 80, h: 130 },
    { id: 'right_rear_fender_side', label: 'Guardabarros tras.', cx: 82, cy: 200, w: 50, h: 130 },
    { id: 'right_rear_bumper_side', label: 'Defensa tras. der.', cx: 38, cy: 255, w: 36, h: 70 },
    { id: 'right_front_tire', label: 'Llanta delantera', cx: 325, cy: 310, w: 44, h: 44 },
    { id: 'right_rear_tire', label: 'Llanta trasera', cx: 82, cy: 310, w: 44, h: 44 },
    { id: 'right_mirror', label: 'Espejo retrovisor', cx: 272, cy: 135, w: 28, h: 22 },
    { id: 'right_roof', label: 'Techo', cx: 200, cy: 100, w: 160, h: 30 },
  ],
};

const DAMAGE_TYPES = [
  { value: 'golpe', label: 'Golpe', color: '#ef4444' },
  { value: 'rayon', label: 'Rayón', color: '#f59e0b' },
  { value: 'abolladura', label: 'Abolladura', color: '#8b5cf6' },
  { value: 'luz_rota', label: 'Luz rota', color: '#ec4899' },
  { value: 'fisura', label: 'Fisura', color: '#06b6d4' },
  { value: 'desgaste', label: 'Desgaste', color: '#6b7280' },
  { value: 'otro', label: 'Otro', color: '#10b981' },
];

const SEVERITY_OPTIONS = [
  { value: 'leve', label: 'Leve', color: 'bg-warning/20 text-warningDark' },
  { value: 'moderado', label: 'Moderado', color: 'bg-orange-100 text-orange-700' },
  { value: 'severo', label: 'Severo', color: 'bg-danger/20 text-danger' },
];

function FrontView() {
  return (
    <svg viewBox="0 0 400 380" className="w-full" style={{ maxHeight: '500px' }}>
      <defs>
        <linearGradient id="fBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f3f4f6" />
          <stop offset="30%" stopColor="#e5e7eb" />
          <stop offset="70%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#b0b5bd" />
        </linearGradient>
        <linearGradient id="fDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="fGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="40%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="fChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f9fafb" />
          <stop offset="50%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
        <linearGradient id="fHeadlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="fBumper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
        <filter id="fShadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
        </filter>
        <radialGradient id="fTireShine" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#1f2937" />
        </radialGradient>
      </defs>

      <g filter="url(#fShadow)">
        {/* Ground shadow */}
        <ellipse cx="200" cy="365" rx="170" ry="12" fill="#e5e7eb" opacity="0.5" />

        {/* Tires visible from front */}
        <ellipse cx="72" cy="330" rx="22" ry="28" fill="url(#fTireShine)" stroke="#111827" strokeWidth="1" />
        <ellipse cx="72" cy="330" rx="14" ry="18" fill="#374151" />
        <ellipse cx="72" cy="330" rx="6" ry="8" fill="#6b7280" />
        <ellipse cx="328" cy="330" rx="22" ry="28" fill="url(#fTireShine)" stroke="#111827" strokeWidth="1" />
        <ellipse cx="328" cy="330" rx="14" ry="18" fill="#374151" />
        <ellipse cx="328" cy="330" rx="6" ry="8" fill="#6b7280" />

        {/* Lower bumper / air dam */}
        <path d="M60,330 Q60,310 80,305 L320,305 Q340,310 340,330 L340,350 Q340,360 325,365 L75,365 Q60,360 60,350 Z" fill="url(#fBumper)" stroke="#374151" strokeWidth="0.5" />

        {/* Grille */}
        <rect x="120" y="275" width="160" height="28" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
        {/* Grille horizontal bars */}
        {[0,1,2,3,4].map(i => (
          <rect key={i} x="125" y={278 + i * 5} width="150" height="2" rx="1" fill="#4b5563" />
        ))}
        {/* Chrome trim on grille */}
        <rect x="118" y="273" width="164" height="2" rx="1" fill="url(#fChrome)" />
        <rect x="118" y="303" width="164" height="2" rx="1" fill="url(#fChrome)" />

        {/* Toyota emblem */}
        <ellipse cx="200" cy="270" rx="16" ry="12" fill="url(#fChrome)" stroke="#9ca3af" strokeWidth="0.5" />
        <ellipse cx="200" cy="270" rx="12" ry="8" fill="none" stroke="#6b7280" strokeWidth="1.5" />
        <ellipse cx="200" cy="270" rx="5" ry="3.5" fill="none" stroke="#6b7280" strokeWidth="1" />

        {/* Upper body */}
        <path d="M65,305 Q65,260 85,245 L315,245 Q335,260 335,305 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.8" />

        {/* Hood */}
        <path d="M75,245 Q75,180 100,165 L300,165 Q325,180 325,245 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.8" />
        {/* Hood lines */}
        <path d="M200,168 L200,242" stroke="#c8ccd2" strokeWidth="0.5" />
        <path d="M130,175 Q130,200 135,242" stroke="#c8ccd2" strokeWidth="0.3" fill="none" />
        <path d="M270,175 Q270,200 265,242" stroke="#c8ccd2" strokeWidth="0.3" fill="none" />

        {/* Headlights */}
        <path d="M68,215 Q62,200 70,188 L118,188 Q128,200 125,215 L125,245 Q125,250 118,252 L70,252 Q62,250 62,245 Z" fill="url(#fHeadlight)" stroke="#d1d5db" strokeWidth="0.8" />
        <path d="M72,210 Q68,200 75,193 L113,193 Q120,200 118,210" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
        <ellipse cx="90" cy="215" rx="8" ry="6" fill="#fef9c3" opacity="0.4" />

        <path d="M275,215 Q272,200 280,188 L328,188 Q338,200 335,215 L335,245 Q335,250 328,252 L280,252 Q272,250 272,245 Z" fill="url(#fHeadlight)" stroke="#d1d5db" strokeWidth="0.8" />
        <path d="M282,210 Q278,200 285,193 L325,193 Q332,200 330,210" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6" />
        <ellipse cx="310" cy="215" rx="8" ry="6" fill="#fef9c3" opacity="0.4" />

        {/* Turn signals */}
        <rect x="65" y="232" width="8" height="12" rx="2" fill="#fbbf24" opacity="0.7" />
        <rect x="327" y="232" width="8" height="12" rx="2" fill="#fbbf24" opacity="0.7" />

        {/* Fenders */}
        <path d="M42,170 Q38,165 40,158 L68,158 L68,260 L40,260 Q38,255 42,248 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.6" />
        <path d="M332,158 L360,158 Q362,165 358,170 L358,248 Q362,255 360,260 L332,260 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.6" />

        {/* Windshield */}
        <path d="M95,155 Q95,100 115,90 L285,90 Q305,100 305,155 Z" fill="url(#fGlass)" stroke="#93c5fd" strokeWidth="0.8" />
        {/* Windshield reflection */}
        <path d="M120,100 Q150,95 200,93 L180,140 Q140,142 120,135 Z" fill="white" opacity="0.15" />
        {/* Wipers */}
        <line x1="160" y1="152" x2="200" y2="155" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="240" y1="155" x2="200" y2="152" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />

        {/* Roof visible */}
        <path d="M110,90 Q110,65 130,58 L270,58 Q290,65 290,90 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.5" />

        {/* Side mirrors */}
        <path d="M40,165 Q30,160 28,150 L28,138 Q30,130 40,135 L55,145 Q58,150 55,158 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="30" y="138" width="10" height="10" rx="1" fill="url(#fGlass)" stroke="#93c5fd" strokeWidth="0.3" />
        <path d="M360,135 Q370,130 372,138 L372,150 Q370,160 360,165 L345,158 Q342,150 345,145 Z" fill="url(#fBody)" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="360" y="138" width="10" height="10" rx="1" fill="url(#fGlass)" stroke="#93c5fd" strokeWidth="0.3" />

        {/* A-pillars */}
        <path d="M95,155 L110,90" stroke="#b0b5bd" strokeWidth="3" />
        <path d="M305,155 L290,90" stroke="#b0b5bd" strokeWidth="3" />

        {/* Plate */}
        <rect x="160" y="315" width="80" height="22" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
        <text x="200" y="330" textAnchor="middle" fontSize="8" fill="#374151" fontFamily="monospace">ABC 123</text>
      </g>
    </svg>
  );
}

function RearView() {
  return (
    <svg viewBox="0 0 400 380" className="w-full" style={{ maxHeight: '500px' }}>
      <defs>
        <linearGradient id="rBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f3f4f6" />
          <stop offset="30%" stopColor="#e5e7eb" />
          <stop offset="70%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#b0b5bd" />
        </linearGradient>
        <linearGradient id="rGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="rChrome" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f9fafb" />
          <stop offset="50%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#9ca3af" />
        </linearGradient>
        <linearGradient id="rTaillight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <filter id="rShadow" x="-10%" y="-5%" width="120%" height="115%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#rShadow)">
        <ellipse cx="200" cy="365" rx="170" ry="12" fill="#e5e7eb" opacity="0.5" />

        <ellipse cx="72" cy="330" rx="22" ry="28" fill="#1f2937" stroke="#111827" strokeWidth="1" />
        <ellipse cx="72" cy="330" rx="14" ry="18" fill="#374151" />
        <ellipse cx="72" cy="330" rx="6" ry="8" fill="#6b7280" />
        <ellipse cx="328" cy="330" rx="22" ry="28" fill="#1f2937" stroke="#111827" strokeWidth="1" />
        <ellipse cx="328" cy="330" rx="14" ry="18" fill="#374151" />
        <ellipse cx="328" cy="330" rx="6" ry="8" fill="#6b7280" />

        {/* Lower bumper */}
        <path d="M60,330 Q60,315 78,310 L322,310 Q340,315 340,330 L340,350 Q340,360 325,365 L75,365 Q60,360 60,350 Z" fill="#4b5563" stroke="#374151" strokeWidth="0.5" />
        {/* Exhaust tips */}
        <ellipse cx="120" cy="350" rx="10" ry="5" fill="#374151" stroke="#6b7280" strokeWidth="0.5" />
        <ellipse cx="120" cy="350" rx="7" ry="3" fill="#1f2937" />
        <ellipse cx="280" cy="350" rx="10" ry="5" fill="#374151" stroke="#6b7280" strokeWidth="0.5" />
        <ellipse cx="280" cy="350" rx="7" ry="3" fill="#1f2937" />

        {/* Reflectors */}
        <rect x="68" y="318" width="20" height="6" rx="2" fill="#ef4444" opacity="0.6" />
        <rect x="312" y="318" width="20" height="6" rx="2" fill="#ef4444" opacity="0.6" />

        {/* Upper bumper */}
        <path d="M65,310 Q65,265 85,250 L315,250 Q335,265 335,310 Z" fill="url(#rBody)" stroke="#9ca3af" strokeWidth="0.8" />

        {/* Trunk */}
        <path d="M75,250 Q75,175 100,160 L300,160 Q325,175 325,250 Z" fill="url(#rBody)" stroke="#9ca3af" strokeWidth="0.8" />
        {/* Trunk lines */}
        <path d="M200,163 L200,247" stroke="#c8ccd2" strokeWidth="0.5" />

        {/* Taillights */}
        <path d="M68,215 Q62,200 70,190 L115,190 Q125,200 122,215 L122,245 Q122,250 115,252 L70,252 Q62,250 62,245 Z" fill="url(#rTaillight)" stroke="#991b1b" strokeWidth="0.8" />
        <path d="M72,210 Q68,200 75,195 L110,195 Q117,200 115,210" fill="none" stroke="#fca5a5" strokeWidth="1" />
        <rect x="73" y="220" width="38" height="15" rx="3" fill="#fef2f2" opacity="0.5" />

        <path d="M278,215 Q275,200 283,190 L328,190 Q338,200 335,215 L335,245 Q335,250 328,252 L283,252 Q275,250 275,245 Z" fill="url(#rTaillight)" stroke="#991b1b" strokeWidth="0.8" />
        <path d="M285,210 Q280,200 288,195 L325,195 Q332,200 330,210" fill="none" stroke="#fca5a5" strokeWidth="1" />
        <rect x="288" y="220" width="38" height="15" rx="3" fill="#fef2f2" opacity="0.5" />

        {/* Chrome trunk trim */}
        <rect x="140" y="248" width="120" height="3" rx="1" fill="url(#rChrome)" />

        {/* Toyota emblem rear */}
        <ellipse cx="200" cy="240" rx="14" ry="10" fill="url(#rChrome)" stroke="#9ca3af" strokeWidth="0.5" />
        <ellipse cx="200" cy="240" rx="10" ry="7" fill="none" stroke="#6b7280" strokeWidth="1.2" />

        {/* Rear window */}
        <path d="M100,155 Q100,100 120,90 L280,90 Q300,100 300,155 Z" fill="url(#rGlass)" stroke="#93c5fd" strokeWidth="0.8" />
        <path d="M130,100 Q160,95 200,93 L180,140 Q140,142 120,135 Z" fill="white" opacity="0.12" />
        {/* Rear defroster lines */}
        {[0,1,2,3,4,5].map(i => (
          <line key={i} x1={120 + i * 25} y1="100" x2={120 + i * 25} y2="148" stroke="#93c5fd" strokeWidth="0.3" opacity="0.5" />
        ))}

        {/* Roof */}
        <path d="M115,90 Q115,65 135,58 L265,58 Q285,65 285,90 Z" fill="url(#rBody)" stroke="#9ca3af" strokeWidth="0.5" />

        {/* Fenders */}
        <path d="M42,165 Q38,160 40,155 L68,155 L68,260 L40,260 Q38,255 42,248 Z" fill="url(#rBody)" stroke="#9ca3af" strokeWidth="0.6" />
        <path d="M332,155 L360,155 Q362,160 358,165 L358,248 Q362,255 360,260 L332,260 Z" fill="url(#rBody)" stroke="#9ca3af" strokeWidth="0.6" />

        {/* Plate */}
        <rect x="155" y="270" width="90" height="28" rx="2" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
        <text x="200" y="288" textAnchor="middle" fontSize="9" fill="#374151" fontFamily="monospace">ABC 123</text>

        {/* A-pillars */}
        <path d="M100,155 L115,90" stroke="#b0b5bd" strokeWidth="3" />
        <path d="M300,155 L285,90" stroke="#b0b5bd" strokeWidth="3" />
      </g>
    </svg>
  );
}

function SideView({ flip }: { flip: boolean }) {
  const tx = flip ? 'scale(-1,1) translate(-400,0)' : '';
  return (
    <svg viewBox="0 0 400 380" className="w-full" style={{ maxHeight: '500px' }}>
      <defs>
        <linearGradient id="sBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f3f4f6" />
          <stop offset="40%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#c8ccd2" />
        </linearGradient>
        <linearGradient id="sGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="sTire" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <linearGradient id="sRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
        <filter id="sShadow" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.2" />
        </filter>
      </defs>

      <g transform={tx} filter="url(#sShadow)">
        <ellipse cx="200" cy="365" rx="180" ry="10" fill="#e5e7eb" opacity="0.4" />

        {/* Tires */}
        <circle cx="85" cy="318" r="28" fill="#1f2937" stroke="#111827" strokeWidth="1" />
        <circle cx="85" cy="318" r="18" fill="#374151" />
        <circle cx="85" cy="318" r="12" fill="url(#sRim)" stroke="#9ca3af" strokeWidth="0.5" />
        <circle cx="85" cy="318" r="5" fill="#6b7280" />
        {[0,1,2,3,4].map(i => (
          <line key={i} x1="85" y1="318" x2={85 + 12 * Math.cos(i * Math.PI * 2 / 5)} y2={318 + 12 * Math.sin(i * Math.PI * 2 / 5)} stroke="#9ca3af" strokeWidth="1" />
        ))}

        <circle cx="315" cy="318" r="28" fill="#1f2937" stroke="#111827" strokeWidth="1" />
        <circle cx="315" cy="318" r="18" fill="#374151" />
        <circle cx="315" cy="318" r="12" fill="url(#sRim)" stroke="#9ca3af" strokeWidth="0.5" />
        <circle cx="315" cy="318" r="5" fill="#6b7280" />
        {[0,1,2,3,4].map(i => (
          <line key={i} x1="315" y1="318" x2={315 + 12 * Math.cos(i * Math.PI * 2 / 5)} y2={318 + 12 * Math.sin(i * Math.PI * 2 / 5)} stroke="#9ca3af" strokeWidth="1" />
        ))}

        {/* Main body */}
        <path d="M30,265 Q28,255 35,248 L35,210 Q38,195 50,190 L60,190 L60,170 Q62,162 72,158 L328,158 Q338,162 340,170 L340,190 L350,190 Q362,195 365,210 L365,248 Q372,255 370,265 L370,305 Q370,312 360,315 L40,315 Q30,312 30,305 Z" fill="url(#sBody)" stroke="#9ca3af" strokeWidth="0.8" />

        {/* Belt line / character line */}
        <path d="M38,205 L362,205" stroke="#b8bcc4" strokeWidth="0.8" />

        {/* Door gaps */}
        <line x1="148" y1="160" x2="148" y2="308" stroke="#b8bcc4" strokeWidth="0.8" />
        <line x1="248" y1="160" x2="248" y2="308" stroke="#b8bcc4" strokeWidth="0.8" />

        {/* Door handles */}
        <rect x="162" y="215" width="22" height="6" rx="3" fill="url(#sBody)" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="262" y="215" width="22" height="6" rx="3" fill="url(#sBody)" stroke="#9ca3af" strokeWidth="0.5" />

        {/* Windows */}
        <path d="M72,158 L145,158 L145,195 L65,195 Q62,190 65,182 Z" fill="url(#sGlass)" stroke="#93c5fd" strokeWidth="0.5" rx="3" />
        <path d="M151,158 L245,158 L245,195 L151,195 Z" fill="url(#sGlass)" stroke="#93c5fd" strokeWidth="0.5" />
        <path d="M251,158 L325,158 Q335,162 335,170 L335,195 L251,195 Z" fill="url(#sGlass)" stroke="#93c5fd" strokeWidth="0.5" rx="3" />
        {/* Window reflections */}
        <path d="M80,162 L120,162 L110,188 L72,188 Z" fill="white" opacity="0.1" />
        <path d="M160,162 L200,162 L195,188 L155,188 Z" fill="white" opacity="0.08" />

        {/* B-pillars */}
        <rect x="146" y="158" width="4" height="37" fill="#374151" />
        <rect x="246" y="158" width="4" height="37" fill="#374151" />

        {/* Roof */}
        <path d="M72,158 Q72,130 95,122 L305,122 Q328,130 328,158 Z" fill="url(#sBody)" stroke="#9ca3af" strokeWidth="0.5" />

        {/* A-pillar */}
        <path d="M65,195 L72,158" stroke="#b0b5bd" strokeWidth="4" />
        {/* C-pillar */}
        <path d="M335,195 L328,158" stroke="#b0b5bd" strokeWidth="4" />

        {/* Front headlight from side */}
        <path d="M35,195 Q32,188 38,182 L58,178 Q62,180 60,188 L60,205 Q58,210 52,212 L38,210 Q34,208 35,202 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.5" />

        {/* Rear taillight from side */}
        <path d="M365,195 Q368,188 362,182 L342,178 Q338,180 340,188 L340,205 Q342,210 348,212 L362,210 Q366,208 365,202 Z" fill="#ef4444" stroke="#dc2626" strokeWidth="0.5" />

        {/* Fender flares */}
        <path d="M50,268 Q45,260 48,252 L70,252 Q72,260 68,268" fill="none" stroke="#b8bcc4" strokeWidth="0.5" />
        <path d="M332,268 Q338,260 335,252 L315,252 Q312,260 318,268" fill="none" stroke="#b8bcc4" strokeWidth="0.5" />

        {/* Side skirt */}
        <path d="M80,308 L310,308" stroke="#b8bcc4" strokeWidth="0.5" />

        {/* Mirror */}
        <path d="M58,175 Q52,172 50,165 L50,158 Q52,152 58,155 L68,162 Q70,168 68,175 Z" fill="url(#sBody)" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="52" y="158" width="8" height="8" rx="1" fill="url(#sGlass)" stroke="#93c5fd" strokeWidth="0.3" />

        {/* Front bumper from side */}
        <path d="M30,265 Q25,258 28,248 L35,248 L35,265 Z" fill="#4b5563" stroke="#374151" strokeWidth="0.3" />

        {/* Rear bumper from side */}
        <path d="M370,265 Q375,258 372,248 L365,248 L365,265 Z" fill="#4b5563" stroke="#374151" strokeWidth="0.3" />

        {/* Wheel arches */}
        <path d="M50,295 Q50,280 65,275 L105,275 Q120,280 120,295" fill="none" stroke="#b8bcc4" strokeWidth="0.5" />
        <path d="M280,295 Q280,280 295,275 L335,275 Q350,280 350,295" fill="none" stroke="#b8bcc4" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

const VIEW_COMPONENTS: Record<string, () => JSX.Element> = {
  front: FrontView,
  rear: RearView,
  left: () => <SideView flip={false} />,
  right: () => <SideView flip={true} />,
};

function InspectionContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const [order, setOrder] = useState<any>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState('front');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ damage_type: 'golpe', severity: 'leve', notes: '', inspected_by: '' });
  const [okZones, setOkZones] = useState<Set<string>>(new Set());
  const [inspectionData, setInspectionData] = useState({ entry_km: '', tire_pressure_fl: '', tire_pressure_fr: '', tire_pressure_rl: '', tire_pressure_rr: '', oil_level: 'bueno', coolant_level: 'bueno', brake_fluid: 'bueno', transmission_fluid: 'bueno', battery_status: 'bueno', belt_condition: 'bueno', general_notes: '' });

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [orderRes, inspRes] = await Promise.all([
        workshopAPI.getOrder(parseInt(id)),
        workshopAPI.getInspections(parseInt(id)),
      ]);
      setOrder(orderRes.data);
      setInspections(inspRes.data);
      const okSet = new Set<string>();
      inspRes.data.forEach((i: any) => { if (i.notes === '__OK__') okSet.add(i.zone); });
      setOkZones(okSet);
    } catch { toast.error('Error al cargar'); }
    finally { setLoading(false); }
  };

  const getZoneLabel = (zoneId: string) => {
    for (const view of Object.values(ZONES)) {
      const z = view.find(v => v.id === zoneId);
      if (z) return z.label;
    }
    return zoneId;
  };

  const getDamageColor = (type: string) => DAMAGE_TYPES.find(d => d.value === type)?.color || '#6b7280';
  const getZoneStatus = (zoneId: string) => {
    const insp = inspections.find(i => i.zone === zoneId);
    if (!insp) return 'none';
    if (insp.notes === '__OK__') return 'ok';
    return 'damage';
  };

  const handleZoneClick = (zoneId: string) => {
    const status = getZoneStatus(zoneId);
    const existing = inspections.find(i => i.zone === zoneId);
    setSelectedZone(zoneId);
    if (status === 'damage' && existing) {
      setFormData({ damage_type: existing.damage_type, severity: existing.severity, notes: existing.notes || '', inspected_by: existing.inspected_by || '' });
    } else {
      setFormData({ damage_type: 'golpe', severity: 'leve', notes: '', inspected_by: '' });
    }
    setShowForm(true);
  };

  const handleMarkOK = async (zoneId: string) => {
    try {
      const existing = inspections.find(i => i.zone === zoneId);
      if (existing) await workshopAPI.deleteInspection(existing.id);
      await workshopAPI.createInspection({
        order_id: parseInt(id), vehicle_id: order.vehicle_id, zone: zoneId,
        damage_type: 'ok', severity: 'leve', notes: '__OK__', inspected_by: 'Sistema',
      });
      setOkZones(prev => new Set(prev).add(zoneId));
      toast.success('Zona marcada como OK');
      loadData();
    } catch { toast.error('Error'); }
  };

  const handleSave = async () => {
    if (!selectedZone) return;
    setSaving(true);
    try {
      const existing = inspections.find(i => i.zone === selectedZone && i.notes !== '__OK__');
      if (existing) await workshopAPI.deleteInspection(existing.id);
      await workshopAPI.createInspection({
        order_id: parseInt(id), vehicle_id: order.vehicle_id, zone: selectedZone, ...formData,
      });
      okZones.delete(selectedZone);
      toast.success('Daño registrado');
      setShowForm(false);
      setSelectedZone(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (inspectionId: number) => {
    if (!confirm('¿Eliminar esta inspección?')) return;
    try { await workshopAPI.deleteInspection(inspectionId); toast.success('Eliminada'); loadData(); }
    catch { toast.error('Error al eliminar'); }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(workshopAPI.getInspectionPDF(parseInt(id)), {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspeccion_orden_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Error al descargar PDF'); }
  };

  const totalZones = Object.values(ZONES).flat().length;
  const damagedCount = inspections.filter(i => i.notes !== '__OK__').length;
  const okCount = inspections.filter(i => i.notes === '__OK__').length;
  const unmarkedCount = totalZones - damagedCount - okCount;

  const currentZones = ZONES[activeView] || [];
  const viewInspections = inspections.filter(i => currentZones.some(z => z.id === i.zone) && i.notes !== '__OK__');
  const ViewComponent = VIEW_COMPONENTS[activeView];

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!order) return <div className="text-center py-12"><p className="text-gray-500">Orden no encontrada</p></div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/workshop/${id}`} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Inspección Visual</h1>
            <p className="text-gray-500">Orden #{order.id} - {order.vehicle?.plate_number} {order.vehicle?.brand} {order.vehicle?.model}</p>
          </div>
        </div>
        <button onClick={handleDownloadPDF} className="btn-outline flex items-center gap-2 text-sm">
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center bg-success/5 border border-success/20">
          <p className="text-xl font-bold text-success">{okCount}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><ShieldCheck size={12} /> OK</p>
        </div>
        <div className="card p-3 text-center bg-danger/5 border border-danger/20">
          <p className="text-xl font-bold text-danger">{damagedCount}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><AlertTriangle size={12} /> Daños</p>
        </div>
        <div className="card p-3 text-center bg-gray-50 border border-gray-200">
          <p className="text-xl font-bold text-gray-400">{unmarkedCount}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><ClipboardList size={12} /> Pendientes</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => { setActiveView(v.id); setShowForm(false); setSelectedZone(null); }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeView === v.id ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/50'}`}>
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            <div className="relative bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg p-6 flex justify-center" style={{ minHeight: '400px' }}>
              <div className="relative" style={{ width: '100%', maxWidth: '400px' }}>
                <ViewComponent />
                {currentZones.map(zone => {
                  const status = getZoneStatus(zone.id);
                  const left = `${(zone.cx / 400) * 100}%`;
                  const top = `${(zone.cy / 380) * 100}%`;
                  return (
                    <div key={zone.id} className="absolute" style={{ left, top, transform: 'translate(-50%, -50%)' }}>
                      {status === 'ok' ? (
                        <button onClick={() => handleZoneClick(zone.id)} className="relative group cursor-pointer" title={`${zone.label} - OK`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white bg-success transition-transform hover:scale-110">
                            <CheckCircle size={14} className="text-white" />
                          </div>
                        </button>
                      ) : status === 'damage' ? (
                        <button onClick={() => handleZoneClick(zone.id)} className="relative group cursor-pointer" title={zone.label}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110"
                            style={{ backgroundColor: getDamageColor(inspections.find(i => i.zone === zone.id)?.damage_type || '') }}>
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                        </button>
                      ) : (
                        <button onClick={() => handleZoneClick(zone.id)} className="relative group cursor-pointer" title={zone.label}>
                          <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/10 transition-all" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {DAMAGE_TYPES.map(d => (
                <div key={d.value} className="flex items-center gap-1.5 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600">{d.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-full bg-success" />
                <span className="text-gray-600">OK</span>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-primary" />
              <h3 className="font-bold text-gray-800">Datos de Inspección</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Kilometraje de entrada</label>
                <input type="number" value={inspectionData.entry_km} onChange={e => setInspectionData({...inspectionData, entry_km: e.target.value})} className="input-field text-sm" placeholder="km" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado de batería</label>
                <select value={inspectionData.battery_status} onChange={e => setInspectionData({...inspectionData, battery_status: e.target.value})} className="input-field text-sm">
                  <option value="bueno">Bueno</option><option value="regular">Regular</option><option value="malo">Malo</option><option value="cargar">Necesita carga</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Aceite del motor</label>
                <select value={inspectionData.oil_level} onChange={e => setInspectionData({...inspectionData, oil_level: e.target.value})} className="input-field text-sm">
                  <option value="bueno">Bueno</option><option value="regular">Regular</option><option value="bajo">Bajo</option><option value="muy_bajo">Muy bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Refrigerante</label>
                <select value={inspectionData.coolant_level} onChange={e => setInspectionData({...inspectionData, coolant_level: e.target.value})} className="input-field text-sm">
                  <option value="bueno">Bueno</option><option value="regular">Regular</option><option value="bajo">Bajo</option><option value="vacio">Vacío</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Líquido de frenos</label>
                <select value={inspectionData.brake_fluid} onChange={e => setInspectionData({...inspectionData, brake_fluid: e.target.value})} className="input-field text-sm">
                  <option value="bueno">Bueno</option><option value="regular">Regular</option><option value="bajo">Bajo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Correas</label>
                <select value={inspectionData.belt_condition} onChange={e => setInspectionData({...inspectionData, belt_condition: e.target.value})} className="input-field text-sm">
                  <option value="bueno">Buenas</option><option value="regular">Regulares</option><option value="malo">Desgastadas</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Presión de llantas (DD/ID/DDI/IDI)</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="text" value={inspectionData.tire_pressure_fl} onChange={e => setInspectionData({...inspectionData, tire_pressure_fl: e.target.value})} className="input-field text-sm text-center" placeholder="DD" />
                  <input type="text" value={inspectionData.tire_pressure_fr} onChange={e => setInspectionData({...inspectionData, tire_pressure_fr: e.target.value})} className="input-field text-sm text-center" placeholder="ID" />
                  <input type="text" value={inspectionData.tire_pressure_rl} onChange={e => setInspectionData({...inspectionData, tire_pressure_rl: e.target.value})} className="input-field text-sm text-center" placeholder="DDI" />
                  <input type="text" value={inspectionData.tire_pressure_rr} onChange={e => setInspectionData({...inspectionData, tire_pressure_rr: e.target.value})} className="input-field text-sm text-center" placeholder="IDI" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones generales</label>
                <textarea value={inspectionData.general_notes} onChange={e => setInspectionData({...inspectionData, general_notes: e.target.value})} className="input-field text-sm" rows={2} placeholder="Notas adicionales..." />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {showForm && (
            <div className="card p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">{getZoneLabel(selectedZone || '')}</h3>
                <button onClick={() => { setShowForm(false); setSelectedZone(null); }}><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <button onClick={() => selectedZone && handleMarkOK(selectedZone)} className="w-full py-3 bg-success/10 text-success rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-success/20 transition border border-success/30">
                  <ShieldCheck size={18} /> Todo está bien
                </button>
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">o reportar daño</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de daño</label>
                  <select value={formData.damage_type} onChange={e => setFormData({...formData, damage_type: e.target.value})} className="input-field">
                    {DAMAGE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severidad</label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map(s => (
                      <button key={s.value} type="button" onClick={() => setFormData({...formData, severity: s.value})}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${formData.severity === s.value ? s.color + ' border-current' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input-field" rows={2} placeholder="Detalle del daño..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inspeccionado por</label>
                  <input type="text" value={formData.inspected_by} onChange={e => setFormData({...formData, inspected_by: e.target.value})} className="input-field" placeholder="Nombre" />
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} Registrar Daño
                </button>
              </div>
            </div>
          )}

          <div className="card p-4 sm:p-6">
            <h3 className="font-bold text-gray-800 mb-3">Vista: {VIEWS.find(v => v.id === activeView)?.label}</h3>
            {viewInspections.length === 0 ? (
              <p className="text-sm text-gray-500">Sin daños en esta vista.</p>
            ) : (
              <div className="space-y-2">
                {viewInspections.map((insp: any) => (
                  <div key={insp.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getDamageColor(insp.damage_type) }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getZoneLabel(insp.zone)}</p>
                      <p className="text-xs text-gray-500 capitalize">{insp.damage_type.replace('_', ' ')} · {insp.severity}</p>
                      {insp.notes && <p className="text-xs text-gray-400">{insp.notes}</p>}
                    </div>
                    <button onClick={() => handleDelete(insp.id)} className="text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href={`/workshop/${id}`} className="btn-primary w-full text-center">Volver a la Orden</Link>
        </div>
      </div>
    </div>
  );
}

export default function InspectionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>}>
      <InspectionContent />
    </Suspense>
  );
}
