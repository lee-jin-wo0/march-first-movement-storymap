/* =======================================================
   섹션 5 (독립의 별들) 인물 카드 & 맵 상호작용 로직
======================================================= */

async function initSection5Map() {
    const mapContainer = document.getElementById('map-s5');
    if (!mapContainer) return;

    // 1. 지도 초기화 (초기에는 마커 없이 넓은 시야 제공)
    const mapS5 = L.map('map-s5', {
        zoomControl: false,
        scrollWheelZoom: false
    }).setView([37.5600, 126.9800], 12);

    // 라이트 테마 타일 적용
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapS5);

    let activeMarkerS5 = null; // 현재 띄워진 마커를 추적하는 변수

    try {
        // 2. GeoJSON 데이터 불러오기 (section5.geojson)
        const response = await fetch('./assets/data/data2_3·1운동 생활 속 현장.geojson');
        const geojsonData = await response.json();

        const trackContainer = document.getElementById('sc5-activist-list');

        // SUB_ID가 '5'인 데이터만 필터링
        const activists = geojsonData.features.filter(f => String(f.properties.SUB_ID) === '5');

        activists.forEach((feature) => {
            const props = feature.properties;

            // 좌표 및 정보 추출
            if (!props.COORD_Y || !props.COORD_X) return;
            const lat = parseFloat(props.COORD_Y);
            const lng = parseFloat(props.COORD_X);

            const name = props.CONTENTS_NAME || "무명 열사";
            const imgUrl = props.IMG_MAIN_URL;
            const shortAddr = props.ADDR_OLD || "활동 지역 불명";

            // 상세 설명 (VALUE_03이나 VALUE_01 등 설명이 들어있는 속성 사용)
            const detailDesc = props.VALUE_03 || props.VALUE_01 || "상세한 기록이 남아있지 않습니다.";

            // 3. HTML 카드 동적 생성
            const card = document.createElement('div');
            card.className = 'sc5-card';
            card.innerHTML = `
                <div class="sc5-card-img">
                    <img src="${imgUrl}" alt="${name} 사진">
                </div>
                <div class="sc5-card-info">
                    <h4>${name}</h4>
                    <p>${shortAddr.split(' ')[0]} ${shortAddr.split(' ')[1] || ''}</p>
                </div>
            `;

            // 4. 카드 클릭 이벤트 (지도 이동 및 상세 팝업 오픈)
            card.addEventListener('click', () => {
                // 기존 활성화된 카드 스타일 초기화 및 현재 카드 강조
                document.querySelectorAll('.sc5-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // 기존 마커가 있다면 삭제 (오직 1명에게만 집중)
                if (activeMarkerS5) {
                    mapS5.removeLayer(activeMarkerS5);
                }

                // 부드럽게 해당 위치로 날아가기 (FlyTo)
                mapS5.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });

                // 위치를 가리키는 커스텀 핀 생성
                const icon = L.divIcon({
                    className: 'sc5-marker-wrapper',
                    html: `<div class="sc5-custom-pin"></div>`,
                    iconSize: [16, 44],
                    iconAnchor: [8, 44] // 선 아래쪽 끝이 좌표에 맞도록 앵커 설정
                });

                activeMarkerS5 = L.marker([lat, lng], { icon: icon }).addTo(mapS5);

                // 상세 정보 팝업창 바인딩 및 열기
                const popupContent = `
                    <div class="sc5-popup-inner">
                        <h3>${name}</h3>
                        <span class="sc5-pop-addr">${props.ADDR_OLD || '주소 정보 없음'}</span>
                        <div class="sc5-pop-desc">${detailDesc}</div>
                    </div>
                `;

                activeMarkerS5.bindPopup(popupContent, {
                    offset: [0, -35], // 마커 위쪽으로 살짝 띄움
                    className: 'sc5-leaflet-popup',
                    autoPanPadding: [50, 50] // 팝업이 짤리지 않게 자동 패딩
                }).openPopup();
            });

            trackContainer.appendChild(card);
        });

        // 5. 좌우 스크롤 버튼 로직 구현
        const btnPrev = document.getElementById('sc5-btn-prev');
        const btnNext = document.getElementById('sc5-btn-next');

        btnPrev.addEventListener('click', () => {
            trackContainer.scrollBy({ left: -300, behavior: 'smooth' });
        });
        btnNext.addEventListener('click', () => {
            trackContainer.scrollBy({ left: 300, behavior: 'smooth' });
        });

    } catch (error) {
        console.error('Section 5 GeoJSON 로드 에러:', error);
    }

    // 나타남 애니메이션 (Reveal)
    const sc5RevealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

    document.querySelectorAll('.sc5-reveal').forEach(el => sc5RevealObserver.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
    initSection5Map();
});