
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation } from 'framer-motion';
import '/src/styles/index.css';
const params = new URLSearchParams(location.search);
const base = '/src/features/lupg/recap/' + (params.has('before') ? 'presentation-before' : 'presentation');
import { buildSlides as buildBefore } from './features/lupg/recap/presentation-before/slides';
import { PresentationPlayer as PlayerBefore } from './features/lupg/recap/presentation-before/player';
import { AnimationProvider as AnimationBefore } from './features/lupg/recap/presentation-before/context/animation-context';
import { buildSlides as buildAfter } from './features/lupg/recap/presentation/slides';
import { PresentationPlayer as PlayerAfter } from './features/lupg/recap/presentation/player';
import { AnimationProvider as AnimationAfter } from './features/lupg/recap/presentation/context/animation-context';
const buildSlides = params.has('before') ? buildBefore : buildAfter;
const PresentationPlayer = params.has('before') ? PlayerBefore : PlayerAfter;
const AnimationProvider = params.has('before') ? AnimationBefore : AnimationAfter;
const group = {id:'g1',value:'Kel. Contoh'};
const data = {
 monthKey:'2026-09',kelompokList:[group,{id:'g2',value:'Kel. Kedua'}],
 kelompokFilter:params.has('kelompok')?'g1':undefined,
 reports:[{id:'r1',kelompok_id:'g1',month:'2026-09',status:'draft',locked:false}],
 programs:['TURBA','GOMA','GMKM','PHQ','SHOLAT_ACR','NIKAH_JM'].map(code=>({id:code,code,name:code,reporting_style:'monthly'})),
 metrics:['KEHADIRAN_ACR','KEHADIRAN_APR','KEHADIRAN_AR','KEHADIRAN_GPN_A','KEHADIRAN_GPN_B'].map(code=>({id:code,code,name:code,unit:'%',category_codes:[]})),
 sarprasItems:[{id:'s1',name:'Ruang kegiatan',code:'RUANG',sort_order:1}],
 sensusCells:['PAUD','ACR','APR','AR','GPN_A','GPN_B'].flatMap((category_code,i)=>['L','P'].map(gender=>({kelompok_id:'g1',category_code,gender,count:10+i}))),
 programReports:[],metricReports:[],sarprasReports:[],shodaqohRows:[],mustinTemplates:[],
 mustinRows:Array.from({length:8},(_,i)=>({id:'n'+i,monthly_report_id:'r1',pokok_masalah:'Pembinaan generus dan koordinasi kegiatan '+(i+1),solusi:'Melanjutkan pendampingan dan evaluasi rutin setiap bulan.',status:'in_progress',sort_order:i})),
 activityPhotos:[{id:'p1',caption:'Dokumentasi contoh — ilustrasi lokal',signedUrl:'/src/assets/undraw_data_25jw.svg'},{id:'p2',caption:'Diskusi dan evaluasi kegiatan',signedUrl:'/src/assets/undraw_sharing-ideas_toje%20copy.svg'}]
};
window.slides = buildSlides(data);
sessionStorage.setItem('lupg:presentation-intro-seen','true');
document.cookie='pres-trigger=exit; path=/';
const root=createRoot(document.getElementById('root'),{onUncaughtError:(e)=>{window.fixtureError=e.message;document.body.dataset.error=e.stack}});
window.showSlide=(i)=>root.render(React.createElement(LazyMotion,{features:domAnimation},React.createElement(AnimationProvider,null,React.createElement('div',{id:'canvas',style:{width:1280,height:720,containerType:'size'}},window.slides[i].render()))));
window.showPlayer=()=>root.render(React.createElement(PresentationPlayer,{monthKey:data.monthKey,slides:window.slides,isLoading:false}));
window.setTheme=(palette,dark)=>{document.documentElement.dataset.palette=palette;document.documentElement.classList.toggle('dark',dark)};
window.setTheme(params.get('palette')||'modern-natural',params.has('dark'));
if(params.has('player')) window.showPlayer();else window.showSlide(Number(params.get('slide')||0));
window.fixtureReady=true;
