// 1. 섹션 3 전용: 카드 스크롤 진입/이탈 감지기
const sc3RevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        } else {
            entry.target.classList.remove('active');
        }
    });
}, { threshold: 0.4, rootMargin: "0px 0px -10% 0px" });

// 2. 섹션 3 GeoJSON 연동 및 스크롤 맵 로직
async function initSection3Map() {
    const mapContainer = document.getElementById('map-s3');
    if (!mapContainer) return;

    const mapS3 = L.map('map-s3', { zoomControl: false, scrollWheelZoom: false }).setView([37.5665, 126.9780 - 0.01], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapS3);

    let activeGeoJsonLayer = null;
    let activeMarkers = [];

    const sc3Groups = [
        { id: 'east-1', targetIds: ["52"] },
        { id: 'east-2', targetIds: ["50"] },
        { id: 'west-1', targetIds: ["51"] },
        { id: 'west-2', targetIds: ["53"] },
        { id: 'west-3', targetIds: ["49"] },
        { id: 'march5-1', targetIds: ["48"] },
        { id: 'march5-2', targetIds: ["47"] }
    ];

    try {
        const response = await fetch('./assets/data/data1_3·1운동시간여행.geojson');
        const sc3Data = await response.json();

        const timelineList = document.getElementById('sc3-timeline-list');
        timelineList.innerHTML = '';

        // HTML 카드 동적 생성
        sc3Groups.forEach(group => {
            const feature = sc3Data.features.find(f => String(f.id) === group.targetIds[0]);

            if (feature) {
                const props = feature.properties;
                const title = props.CONTENTS_NAME || "제목 없음";
                const name1 = props.NAME_01 || "";
                const val1 = props.VALUE_01 || "";
                const name2 = props.NAME_02 || "";
                const val2 = props.VALUE_02 ? props.VALUE_02.replace(/\n/g, '<br>') : "";

                const cardHTML = `
                    <div class="sc3-timeline-item sc3-scroll-reveal" data-feature-id="${group.targetIds[0]}">
                        <h3 class="sc3-item-title">${title}</h3>
                        
                        ${(name1 || val1) ? `
                        <div class="sc3-route-box">
                            ${name1 ? `<strong class="sc3-route-label">${name1}</strong>` : ''}
                            <p class="sc3-route-val">${val1}</p>
                        </div>
                        ` : ''}
                        
                        ${(name2 || val2) ? `
                        <div class="sc3-desc-box">
                            ${name2 ? `<strong class="sc3-route-label">${name2}</strong>` : ''}
                            <p class="sc3-item-desc">${val2}</p>
                        </div>
                        ` : ''}
                    </div>
                `;
                timelineList.insertAdjacentHTML('beforeend', cardHTML);
            }
        });

        document.querySelectorAll('.sc3-scroll-reveal').forEach(el => sc3RevealObserver.observe(el));

        // 스크롤 감지 로직 - 지도 선 제어 및 애니메이션
        const mapUpdateObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const featureId = entry.target.getAttribute('data-feature-id');
                    const targetFeature = sc3Data.features.find(f => String(f.id) === featureId);

                    // 기존에 그려진 선 및 마커 지우기
                    if (activeGeoJsonLayer) {
                        mapS3.removeLayer(activeGeoJsonLayer);
                    }
                    activeMarkers.forEach(m => mapS3.removeLayer(m));
                    activeMarkers = [];

                    // 새로운 선 지도에 그리기
                    if (targetFeature) {
                        // ⭐ 1. 진짜 선을 그리기 전에 '임시 레이어'를 만들어 지도가 이동할 목표 지점(Bounds)만 계산합니다.
                        const tempLayer = L.geoJSON(targetFeature);

                        mapS3.invalidateSize();

                        const isMobile = window.innerWidth <= 768;
                        let padTopLeft, padBottomRight;

                        if (isMobile) {
                            padTopLeft = [30, 30];
                            padBottomRight = [30, 150];
                        } else {
                            padTopLeft = [450, 50];
                            padBottomRight = [50, 50];
                        }

                        // ⭐ 2. 지도 카메라를 먼저 부드럽게 이동시킵니다. (선은 아직 그리지 않음!)
                        mapS3.fitBounds(tempLayer.getBounds(), {
                            paddingTopLeft: padTopLeft,
                            paddingBottomRight: padBottomRight,
                            maxZoom: 16,
                            animate: true,
                            duration: 0.5
                        });

                        // 3. 출발점, 도착점 마커는 지도가 움직일 때 바로 보이도록 먼저 찍어줍니다.
                        let lineCoords = [];
                        if (targetFeature.geometry.type === 'GeometryCollection') {
                            const lineStringGeo = targetFeature.geometry.geometries.find(g => g.type === 'LineString');
                            if (lineStringGeo) lineCoords = lineStringGeo.coordinates;
                        } else if (targetFeature.geometry.type === 'LineString') {
                            lineCoords = targetFeature.geometry.coordinates;
                        }

                        if (lineCoords.length > 0) {
                            const startCoord = [lineCoords[0][1], lineCoords[0][0]];
                            const endCoord = [lineCoords[lineCoords.length - 1][1], lineCoords[lineCoords.length - 1][0]];

                            const startIcon = L.divIcon({
                                className: 'sc3-point-marker start',
                                html: '<div class="sc3-point-label">출발</div><div class="sc3-point-dot"></div>',
                                iconSize: [40, 40], iconAnchor: [20, 40]
                            });

                            const endIcon = L.divIcon({
                                className: 'sc3-point-marker end',
                                html: '<div class="sc3-point-label">도착</div><div class="sc3-point-dot"></div>',
                                iconSize: [40, 40], iconAnchor: [20, 40]
                            });

                            activeMarkers.push(L.marker(startCoord, { icon: startIcon }).addTo(mapS3));
                            activeMarkers.push(L.marker(endCoord, { icon: endIcon }).addTo(mapS3));
                        }

                        // ⭐ 4. 지도가 이동을 완료한 후(0.6초 뒤)에 진짜 선을 맵에 추가하고 애니메이션을 실행합니다.
                        setTimeout(() => {
                            // 이제 진짜 선을 지도에 올립니다.
                            activeGeoJsonLayer = L.geoJSON(targetFeature, {
                                style: {
                                    color: '#000000',
                                    weight: 6,
                                    opacity: 0.9, // 정상적인 투명도로 설정
                                    lineJoin: 'round',
                                    className: 'sc3-draw-path'
                                }
                            }).addTo(mapS3);

                            // 선 스르륵 애니메이션 실행
                            const paths = document.querySelectorAll('.sc3-draw-path');
                            paths.forEach(path => {
                                const length = path.getTotalLength();
                                path.style.strokeDasharray = length;
                                path.style.strokeDashoffset = length;
                                path.getBoundingClientRect(); // 강제 리플로우 (브라우저 새로고침 효과)
                                path.style.transition = 'stroke-dashoffset 2.5s ease-in-out';
                                path.style.strokeDashoffset = '0';
                            });
                        }, 600); // 0.6초 대기
                    }
                }
            });
        }, { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" });

        document.querySelectorAll('.sc3-timeline-item').forEach(item => mapUpdateObserver.observe(item));

    } catch (error) {
        console.error('Section 3 GeoJSON 로드 에러:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initSection3Map();
});